import type { APIRoute } from 'astro';
// @ts-ignore
import { env as cfEnv } from 'cloudflare:workers';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../../lib/supabase';
import { 
  computeAdvisorMetrics, 
  buildFullAdvisorContext,
  type AdvisorAggregates,
  type FullAdvisorContext
} from '../../lib/advisorMetrics';
import { getMacroCalendarContext } from '../../lib/economicCalendar';

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
function getScopedSupabase(token?: string | null, customUrl?: string, customKey?: string) {
  return createClient(
    customUrl || supabaseUrl || 'https://placeholder.supabase.co',
    customKey || supabaseAnonKey || 'placeholder',
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
    const runtimeEnv = ((typeof cfEnv !== 'undefined' && cfEnv) || {}) as Record<string, string | undefined>;
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

    const effectiveSupabaseUrl = runtimeEnv.PUBLIC_SUPABASE_URL || supabaseUrl;
    const effectiveSupabaseAnonKey = runtimeEnv.PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
    const serverSupabase = getScopedSupabase(token, effectiveSupabaseUrl, effectiveSupabaseAnonKey);

    const isConfigured = Boolean(
      isSupabaseConfigured || 
      (effectiveSupabaseUrl && effectiveSupabaseAnonKey && effectiveSupabaseUrl !== 'https://placeholder.supabase.co')
    );
    if (token && isConfigured) {
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
        const [tradesRes, accountsRes, mistakesRes, playbooksRes, systemRes] = await Promise.all([
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
          serverSupabase
            .from('system_sections')
            .select('id, title, content, order_index')
            .eq('user_id', userId)
            .order('order_index', { ascending: true }),
        ]);

        const trades = tradesRes.data || [];
        const accounts = accountsRes.data || [];
        const mistakes = mistakesRes.data || [];
        const playbooks = playbooksRes.data || [];
        const systemSections = systemRes.data || [];

        if (trades.length > 0 || playbooks.length > 0 || accounts.length > 0 || systemSections.length > 0) {
          fullContext = buildFullAdvisorContext(trades, accounts, playbooks, mistakes, systemSections);
        }
      } catch (dbErr) {
        console.error('Error fetching full data from database:', dbErr);
      }
    }

    // Fallback: If server DB yielded no trades or RLS restricted access, check clientContext snapshot
    if (!fullContext || fullContext.tradesLog.length === 0) {
      if (body?.clientContext && (body.clientContext.tradesLog?.length > 0 || body.clientContext.aggregates?.totalTrades > 0 || body.clientContext.systemSections?.length > 0)) {
        fullContext = body.clientContext;
      } else if (body?.clientStats && body.clientStats.totalTrades > 0) {
        fullContext = {
          aggregates: body.clientStats,
          bySetup: [],
          byDirection: [],
          accounts: [],
          playbooks: [],
          systemSections: [],
          mistakes: [],
          tradesLog: [],
        };
      } else if (!fullContext) {
        fullContext = buildFullAdvisorContext([], [], [], [], []);
      }
    }

    // Verified live economic calendar context & date anchor
    const macroContext = await getMacroCalendarContext();

    // 3. Groq Execution
    const apiKey = runtimeEnv.GROQ_API_KEY || process.env.GROQ_API_KEY || (import.meta as any).env?.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          reply: '⚠️ **Configuration Error**: `GROQ_API_KEY` environment variable is not configured on the server. Please add `GROQ_API_KEY` to your server environment.' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const groq = new Groq({ apiKey });

    // Strictly defined System Message: Head of Risk (CRO) & Quantitative Performance Analyst
    const systemMessage = `ROLE AND MANDATE:
You are the Head of Risk (Chief Risk Officer / CRO) & Lead Quantitative Performance Analyst at an institutional proprietary trading firm.
Your core mandates:
1. Performance Review & Edge Optimization — audit trader edge, mathematical expectancy (EV), balance of Payoff Ratio vs Win Rate, and systematic elimination of statistical leaks.
2. Risk Management & Capital Preservation — capital protection, drawdown control, risk of ruin, position sizing consistency, and tilt/overtrading prevention.
3. Global Macroeconomics & Event Risk — deep macroeconomic context: major central banks (Fed, ECB, BoE, BoJ), interest rate paths, inflation metrics (CPI, Core CPI, PPI, PCE), labor data (NFP, Jobless Claims), US Treasury Yield curve dynamics (2Y/10Y), Dollar Index (DXY), VIX, and news volatility "no-trade windows".
4. Trading System Compliance & Rule Auditing — cross-reference trader's real execution, setups, mistakes, timing, and risk per trade against their own documented Trading System, strategy rules, risk limits, and pre-trade checklists in the "ТОРГОВАЯ СИСТЕМА" section. Relentlessly call out any violations and deviations from their written rules.

LANGUAGE DIRECTIVE (CRITICAL / ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ):
- ALWAYS respond in the EXACT SAME LANGUAGE as the user's latest message!
- If the user asks in Russian — answer completely in Russian. (Если вопрос задан по-русски — отвечай полностью на русском языке).
- If the user asks in English — answer in English.
- If the user asks in another language — mirror that exact language.
- The UI interface of the app is in English, but YOUR REPLIES MUST STRICTLY MATCH THE LANGUAGE OF THE USER'S QUESTION.

CORE OPERATIONAL PRINCIPLE: ANSWER SPECIFIC QUESTIONS DIRECTLY AND TO THE POINT:
- Answer ONLY what the user asked about.
- STRICTLY FORBIDDEN to inject rigid boilerplate templates or unrequested sections into every answer. If the user asks a specific question (e.g. about today's macro news, a specific setup, a mistake, a metric formula, or Long vs Short performance) — focus EXCLUSIVELY on that topic without unnecessary filler or canned structures.
- ONLY when the user explicitly requests a comprehensive audit/review of their trading (e.g. "review my trading", "audit my performance", "сделай ревью торговли", "где мои главные утечки?"), provide a structured institutional review:
  1. Quantitative Assessment of Expectancy & Edge (EV per trade, Payoff Ratio vs Win Rate, sample validity);
  2. Leak Attribution & Execution Anomalies (setups, mistake tags, sessions, cutting winners vs running losers);
  3. Risk Directives & Actionable Limits.

ПРАВИЛА И СТИЛЬ ОБЩЕНИЯ:
1. Институциональный, математически строгий, хладнокровный тон профессионала CRO/Quant. Никакой лести, дежурных приветствий, "воды" и пустой психологической мотивации.
2. Не пересказывай сухие цифры ради цифр. Трейдер видит их в приложении. Твоя ценность — в глубоком синтезе, причинно-следственных связях и институциональной логике.
3. Оценка статистической значимости: если выборка сделок мала (N < 20–30), прямо указывай на высокую дисперсию и предварительный характер выводов; не делай безапелляционных выводов на случайном шуме.
4. Выделяй ключевые числовые значения, выводы, риск-параметры и названия сетапов/ошибок **жирным шрифтом**.
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ТАБЛИЦЫ MARKDOWN (не используй символ '|' и табличный синтаксис). Используй четкие маркированные списки и компактные абзацы.
6. ОБЯЗАТЕЛЬНО завершай все предложения и мысли до конца. Никаких оборванных фраз.
7. АУДИТ ТОРГОВОЙ СИСТЕМЫ: Если пользователь спрашивает о своей системе, дисциплине, правилах входа или соблюдении регламента — опирайся на раздел "ТОРГОВАЯ СИСТЕМА ТРЕЙДЕРА" ниже. Проверяй, действительно ли его сделки, риск-менеджмент и сетапы соответствуют тому, что он сам зафиксировал в правилах. Если есть расхождения (например, вошел вне разрешенных сессий, превысил лимит риска, совершил сделку без сетапа из системы или повторил запрещенную ошибку) — четко и строго укажи на нарушение дисциплины.

БАЗА ЗНАНИЙ И МАКРОЭКОНОМИЧЕСКИЙ РЕАЛИЗМ:
- Quantitative Metrics: EV = (WinRate * AvgWin) - (LossRate * AvgLoss), Profit Factor, Payoff Ratio, Max Drawdown, распределение исходов, Day of Week anomalies, Revenge Trading detection (< 20 min after SL).
- Edge & Execution: удержание победителей vs пересиживание проигравших, тайминг входов, соотношение Long/Short, сессионный дисбаланс (London, NY AM, NY PM, Asia).
- Macroeconomic Analysis: процентные ставки, ожидания денежно-кредитной политики, влияние сюрпризов в данных (Actual vs Forecast) на волатильность и спреды, межрыночные корреляции.

СТРОЖАЙШИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ДАТ И НОВОСТЕЙ:
1. ТЕКУЩАЯ СИСТЕМНАЯ ДАТА: Сегодня ${macroContext.currentDate} (${macroContext.currentDayOfWeek}), время: ${macroContext.currentTimeUtc}.
   - Всегда опирайся на этот день недели и дату. Никогда не путай дни недели!
2. Вся информация об экономических событиях берется ИСКЛЮЧИТЕЛЬНО из блока "АКТУАЛЬНЫЙ ЭКОНОМИЧЕСКИЙ КАЛЕНДАРЬ" ниже.
3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать события из памяти! (Никогда не утверждай, что NFP или CPI выходят в субботу/воскресенье, и не сочиняй фейковые даты).
4. Если пользователь спрашивает о датах или неделе, выходящей за пределы текущей выгрузки календаря (${macroContext.coverageRange}):
   - ПРЯМО скажи: "Календарная сетка на следующую неделю еще не загружена поставщиком (ForexFactory публикует расписание на новую неделю в воскресенье). Точные даты релизов на следующую неделю станут доступны после обновления."

АКТУАЛЬНЫЕ ДАННЫЕ ТРЕЙДЕРА:

--- ОБЩИЕ МЕТРИКИ (ВКЛЮЧАЯ ДНИ НЕДЕЛИ И ПОВЕДЕНЧЕСКИЙ РИСК / ТИЛЬТ) ---
${JSON.stringify(fullContext.aggregates)}

--- ТОРГОВАЯ СИСТЕМА, ПРАВИЛА И РЕГЛАМЕНТ ТРЕЙДЕРА (ИЗ РАЗДЕЛА SYSTEM) ---
${fullContext.systemSections && fullContext.systemSections.length > 0 
  ? fullContext.systemSections.map((s) => `### [${s.title}]\n${s.content || '(Раздел пуст)'}`).join('\n\n')
  : 'Пользователь еще не заполнил разделы торговой системы в приложении.'}

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

--- АКТУАЛЬНЫЙ ЭКОНОМИЧЕСКИЙ КАЛЕНДАРЬ (FOREXFACTORY/FAIRECONOMY) ---
Период выгрузки: с ${macroContext.coverageRange}.
Сегодня (${macroContext.currentDate}, ${macroContext.currentDayOfWeek}): ${JSON.stringify(macroContext.todayEvents)}
Оставшиеся релизы с текущего момента: ${JSON.stringify(macroContext.upcomingEvents)}
Все ключевые релизы недели (High & Med Impact): ${JSON.stringify(macroContext.weeklyHighMedEvents)}`;

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

    const primaryModel = runtimeEnv.GROQ_MODEL || process.env.GROQ_MODEL || (import.meta as any).env?.GROQ_MODEL || 'llama-3.3-70b-versatile';
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
          temperature: 0.2,
          max_tokens: 2048,
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

    const rawReply = completion.choices[0]?.message?.content || 'No response received from model.';
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
        reply: `⚠️ Advisor execution error: ${error?.message || 'Unknown error'}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
