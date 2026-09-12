import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../../lib/supabase';
import { 
  computeAdvisorMetrics, 
  buildFullAdvisorContext,
  getTodayMacroEvents, 
  type AdvisorAggregates,
  type FullAdvisorContext
} from '../../lib/advisorMetrics';

export const prerender = false;

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || (import.meta as any).env?.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Creates a user-scoped Supabase client with JWT Authorization header
 * so that Row Level Security (RLS) permits querying trades and accounts.
 */
function getScopedSupabase(token?: string | null) {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * Converts any accidental Markdown pipe tables into clean, readable bullet points.
 */
function stripMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let headers: string[] = [];
  let isTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Divider row (|---|---|)
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        isTable = true;
        continue;
      }

      if (!isTable) {
        headers = cells;
        isTable = true;
        continue;
      }

      // Format data row into bullet list
      const formatted = cells
        .map((c, i) => (headers[i] ? `**${headers[i]}**: ${c}` : c))
        .filter(Boolean)
        .join(' — ');

      result.push(`• ${formatted}`);
    } else {
      isTable = false;
      headers = [];
      result.push(line);
    }
  }

  return result.join('\n');
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userMessage: string = (body?.message || '').trim();
    const history: ChatHistoryItem[] = Array.isArray(body?.history) ? body.history : [];

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Auth: Extract userId from validated session (JWT or cookie)
    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      const cookieNames = ['sb-access-token', 'supabase-auth-token', 'sb:token'];
      for (const name of cookieNames) {
        const val = cookies.get(name)?.value;
        if (val) {
          token = val;
          break;
        }
      }
    }

    const serverSupabase = getScopedSupabase(token);

    if (token && isSupabaseConfigured) {
      try {
        const { data: { user }, error } = await serverSupabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.warn('Auth token verification warning:', authErr);
      }
    }

    // Fallback if userId was directly passed from authenticated client context
    if (!userId && body?.userId && typeof body.userId === 'string') {
      userId = body.userId;
    }

    // 2. Data Aggregates & Full Trade Context:
    // Gather all user data from DB: Trades (with notes & mistakes), Accounts, Mistakes, Setups/Playbooks
    let fullContext: FullAdvisorContext | null = null;

    if (userId && isSupabaseConfigured) {
      try {
        const [tradesRes, accountsRes, mistakesRes, playbooksRes] = await Promise.all([
          serverSupabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('trade_date', { ascending: false }),
          serverSupabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', userId)
            .or('is_archived.is.null,is_archived.eq.false'),
          serverSupabase
            .from('user_mistakes')
            .select('id, name')
            .eq('user_id', userId),
          serverSupabase
            .from('playbooks')
            .select('id, title, description, is_active')
            .eq('user_id', userId),
        ]);

        const trades = tradesRes.data || [];
        const accounts = accountsRes.data || [];
        const mistakes = mistakesRes.data || [];
        const playbooks = playbooksRes.data || [];

        if (trades.length > 0 || playbooks.length > 0 || accounts.length > 0) {
          fullContext = buildFullAdvisorContext(trades, accounts, playbooks, mistakes);
        }
      } catch (dbErr) {
        console.error('Error fetching full data from database:', dbErr);
      }
    }

    // Fallback: If server DB yielded no trades or RLS restricted access, check clientContext snapshot
    if (!fullContext || fullContext.tradesLog.length === 0) {
      if (body?.clientContext && (body.clientContext.tradesLog?.length > 0 || body.clientContext.aggregates?.totalTrades > 0)) {
        fullContext = body.clientContext;
      } else if (body?.clientStats && body.clientStats.totalTrades > 0) {
        fullContext = {
          aggregates: body.clientStats,
          bySetup: [],
          byDirection: [],
          accounts: [],
          playbooks: [],
          mistakes: [],
          tradesLog: [],
        };
      } else if (!fullContext) {
        fullContext = buildFullAdvisorContext([], [], [], []);
      }
    }

    // Today's economic calendar events
    const macro = getTodayMacroEvents();

    // 3. Groq Execution
    const apiKey = process.env.GROQ_API_KEY || (import.meta as any).env?.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          reply: '⚠️ **Ошибка конфигурации**: Переменная окружения `GROQ_API_KEY` не установлена на сервере. Пожалуйста, добавьте `GROQ_API_KEY` в переменные окружения сервера.' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const groq = new Groq({ apiKey });

    // Strictly defined System Message with complete trade context and explicit prohibition of Markdown tables
    const systemMessage = `Ты — Senior Risk Manager и Lead Quantitative Analyst в проприетарной трейдинговой фирме. Твоя единственная цель — защищать торговый капитал трейдера, находить статистические утечки (leaks) в журнале сделок и оценивать риски волатильности по экономическому календарю.

ЯЗЫК ОТВЕТА (КРИТИЧЕСКИ ВАЖНО):
ВСЕГДА отвечай строго на том языке, на котором написан последний запрос пользователя (если вопрос задан на русском — отвечай на русском; if the user query is in English — respond in English; etc.).

ПРАВИЛА КОММУНИКАЦИИ:
1. Твой стиль: сдержанный, профессиональный, институциональный. Никакой воды, лести или пустых мотивационных фраз.
2. Не хвали трейдера за случайные прибыльные сделки, если они нарушают базовый риск-менеджмент или совершены на новостной лотерее.
3. Опирайся ИСКЛЮЧИТЕЛЬНО на предоставленный JSON со статистикой, журналом сделок, сетапами, ошибками и новостями. Если данных для вывода недостаточно — прямо скажи об этом, не додумывая факты.
4. Выделяй критические цифры, метрики, названия инструментов/сетапов и алерты жирным шрифтом (**значение**).
5. КАТЕГОРИЧЕСКИ запрещено поддерживать бытовые разговоры, темы развлечений или общие рассуждения. Если пользователь уходит от темы трейдинга, верни его к дисциплине одной короткой фразой.
6. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ТАБЛИЦЫ MARKDOWN (не используй символ '|' и табличную разметку). Форматируй ответ только списками, короткими абзацами и жирным шрифтом.

МЕТОДОЛОГИЯ АНАЛИЗА:
- Оценка сессий: выявляй, где трейдер сливает заработанное (например, дисциплинированный London Killzone против эмоционального тильта в NY PM).
- Анализ R:R: сопоставляй плановое соотношение риска к прибыли с фактическим результатом.
- Анализ сетапов и ошибок: сопоставляй результативность плейбуков, выявляй повторяющиеся ошибки (mistakes) и анализируй заметки трейдера (notes) к сделкам.
- Контроль переторговки: если количество сделок в день превышает рабочую норму, сигнализируй о высоком риске эмоционального истощения.
- Макро-календарь: предупреждай о расширении спредов, риске проскальзывания и необходимости фиксации позиций до публикации данных High Impact (CPI, NFP, решения по процентным ставкам).

СТРУКТУРА ОТВЕТА:
Вердикт (1–2 предложения: текущее состояние риска).
Ключевые наблюдения (маркированный список с точными цифрами из метрик, сетапов, журнала сделок).
Риск-предписание (что конкретно сделать или чего не делать сегодня).

АКТУАЛЬНЫЕ ДАННЫЕ ТРЕЙДЕРА:

--- ОБЩИЕ МЕТРИКИ ---
${JSON.stringify(fullContext.aggregates)}

--- ЭФФЕКТИВНОСТЬ ПО СЕТАПАМ ---
${JSON.stringify(fullContext.bySetup)}

--- СРАВНЕНИЕ НАПРАВЛЕНИЙ (LONG vs SHORT) ---
${JSON.stringify(fullContext.byDirection)}

--- КАТАЛОГ СЕТАПОВ И ПРАВИЛ ---
${JSON.stringify(fullContext.playbooks)}

--- СИСТЕМНЫЕ ОШИБКИ И СЛИВЫ В R ---
${JSON.stringify(fullContext.mistakes)}

--- ТОРГОВЫЕ СЧЕТА ---
${JSON.stringify(fullContext.accounts)}

--- ЖУРНАЛ СДЕЛОК ТРЕЙДЕРА (С ЗАМЕТКАМИ И ОШИБКАМИ) ---
${JSON.stringify(fullContext.tradesLog)}

--- КАЛЕНДАРЬ НОВОСТЕЙ НА СЕГОДНЯ ---
${JSON.stringify(macro)}`;

    // Build chat message payload
    const sanitizedHistory = history
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .slice(-6)
      .map((h) => ({
        role: h.role,
        content: String(h.content),
      }));

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemMessage },
      ...sanitizedHistory,
      { role: 'user', content: userMessage },
    ];

    const primaryModel = process.env.GROQ_MODEL || (import.meta as any).env?.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const fallbackModels = [primaryModel, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    const candidateModels = Array.from(new Set(fallbackModels));

    let completion: any;
    let lastError: any = null;
    let usedModel: string = primaryModel;

    for (const model of candidateModels) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages,
          temperature: 0.15,
          max_tokens: 900,
        });
        if (completion?.choices?.[0]?.message?.content) {
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isNotFound = err?.status === 404 || err?.code === 'model_not_found' || msg.includes('does not exist or you do not have access');
        if (isNotFound) {
          console.warn(`Model ${model} not available on this Groq account, trying next fallback...`);
          continue;
        }
        throw err;
      }
    }

    if (!completion && lastError) {
      throw lastError;
    }

    const rawReply = completion.choices[0]?.message?.content || 'Нет ответа от модели.';
    // Post-process to ensure zero tables exist in the output
    const cleanReply = stripMarkdownTables(rawReply);

    return new Response(JSON.stringify({ reply: cleanReply, model: usedModel }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Advisor API error:', error);
    return new Response(
      JSON.stringify({
        reply: `⚠️ Ошибка выполнения консультанта: ${error?.message || 'Неизвестная ошибка'}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
