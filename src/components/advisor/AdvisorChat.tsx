import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  RotateCcw,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { lockBodyScroll } from '../../lib/scrollLock';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  buildFullAdvisorContext,
  type FullAdvisorContext,
  type RawTrade, 
  type TradingAccount 
} from '../../lib/advisorMetrics';

export function openAdvisorChat() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-advisor-chat'));
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


function FormattedMessageContent({ text }: { text: string }) {
  const elements = useMemo(() => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let isInsideList = false;

    const parseInline = (lineText: string, keyPrefix: string): React.ReactNode[] => {
      const tokens: React.ReactNode[] = [];
      const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(lineText)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(lineText.substring(lastIndex, match.index));
        }
        const matchStr = match[0];
        if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
          tokens.push(
            <strong 
              key={`${keyPrefix}-b-${match.index}`} 
              className="font-bold text-text-main tabular-nums"
            >
              {matchStr.slice(2, -2)}
            </strong>
          );
        } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
          tokens.push(
            <code 
              key={`${keyPrefix}-c-${match.index}`} 
              className="font-mono text-xs bg-canvas/80 px-2 py-0.5 rounded-[14px] border border-border-card text-blue-500"
            >
              {matchStr.slice(1, -1)}
            </code>
          );
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < lineText.length) {
        tokens.push(lineText.substring(lastIndex));
      }

      return tokens;
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.slice(2);
        isInsideList = true;
        currentList.push(
          <li key={`li-${lineIdx}`} className="ml-4 list-disc text-sm text-text-main leading-relaxed">
            {parseInline(itemText, `li-${lineIdx}`)}
          </li>
        );
        return;
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        isInsideList = true;
        currentList.push(
          <li key={`nli-${lineIdx}`} className="ml-4 list-decimal text-sm text-text-main leading-relaxed">
            {parseInline(numMatch[2], `nli-${lineIdx}`)}
          </li>
        );
        return;
      }

      if (isInsideList && currentList.length > 0) {
        nodes.push(
          <ul key={`ul-${lineIdx}`} className="space-y-1 my-2">
            {currentList}
          </ul>
        );
        currentList = [];
        isInsideList = false;
      }

      if (!trimmed) {
        nodes.push(<div key={`empty-${lineIdx}`} className="h-2" />);
        return;
      }

      nodes.push(
        <p key={`p-${lineIdx}`} className="text-sm leading-relaxed text-text-main">
          {parseInline(line, `p-${lineIdx}`)}
        </p>
      );
    });

    if (isInsideList && currentList.length > 0) {
      nodes.push(
        <ul key="ul-end" className="space-y-1 my-2">
          {currentList}
        </ul>
      );
    }

    return nodes;
  }, [text]);

  return <div className="space-y-1">{elements}</div>;
}

export function AdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your **Head of Risk (CRO) & Quantitative Performance Analyst**.\n\nMy focus is **Edge Optimization**, statistical expectancy, risk and leak control, and macroeconomic context.\n\nAsk a specific question about your trades, setups, mistakes, risk parameters, or macroeconomics.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mobile virtual keyboard handling: elevate ONLY the input bar
  useEffect(() => {
    if (!isOpen) {
      setKeyboardHeight(0);
      return;
    }

    if (typeof window === 'undefined') return;

    const updateKeyboardHeight = () => {
      if (window.innerWidth >= 768) {
        setKeyboardHeight(0);
        return;
      }

      const vv = window.visualViewport;
      if (vv) {
        const layoutHeight = window.innerHeight;
        const currentVisualHeight = vv.height;
        const diff = layoutHeight - currentVisualHeight;
        if (diff > 80) {
          setKeyboardHeight(diff);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
          return;
        }
      }
      setKeyboardHeight(0);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateKeyboardHeight);
      vv.addEventListener('scroll', updateKeyboardHeight);
    }
    window.addEventListener('resize', updateKeyboardHeight);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateKeyboardHeight);
        vv.removeEventListener('scroll', updateKeyboardHeight);
      }
      window.removeEventListener('resize', updateKeyboardHeight);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-advisor-chat', handleOpen);
    return () => window.removeEventListener('open-advisor-chat', handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return lockBodyScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getClientAdvisorData = async (currentUserId?: string): Promise<FullAdvisorContext | null> => {
    try {
      if (isSupabaseConfigured && currentUserId) {
        const [tradesRes, accountsRes, mistakesRes, playbooksRes] = await Promise.all([
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', currentUserId)
            .order('trade_date', { ascending: false }),
          supabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', currentUserId)
            .or('is_archived.is.null,is_archived.eq.false'),
          supabase
            .from('user_mistakes')
            .select('id, name')
            .eq('user_id', currentUserId),
          supabase
            .from('playbooks')
            .select('id, title, description, is_active')
            .eq('user_id', currentUserId),
        ]);

        const trades = (tradesRes.data as RawTrade[]) || [];
        const accounts = (accountsRes.data as TradingAccount[]) || [];
        const mistakes = (mistakesRes.data as Array<{ id: string; name: string }>) || [];
        const playbooks = (playbooksRes.data as Array<{ id: string; title: string; description?: string | null; is_active?: boolean }>) || [];

        if (trades.length > 0 || playbooks.length > 0 || accounts.length > 0) {
          return buildFullAdvisorContext(trades, accounts, playbooks, mistakes);
        }
      }
    } catch (e) {
      console.warn('Failed to load full advisor data via browser Supabase client:', e);
    }

    try {
      const cachedTrades = localStorage.getItem('trades_offline');
      const cachedAccs = localStorage.getItem('trading_accounts_offline');
      const cachedPlaybooks = localStorage.getItem('playbooks_offline');
      const cachedMistakes = localStorage.getItem('user_mistakes_offline');
      if (cachedTrades) {
        const trades: RawTrade[] = JSON.parse(cachedTrades);
        const accounts: TradingAccount[] = cachedAccs ? JSON.parse(cachedAccs) : [];
        const playbooks = cachedPlaybooks ? JSON.parse(cachedPlaybooks) : [];
        const mistakes = cachedMistakes ? JSON.parse(cachedMistakes) : [];
        if (trades.length > 0 || playbooks.length > 0) {
          return buildFullAdvisorContext(trades, accounts, playbooks, mistakes);
        }
      }
    } catch (e) {
      console.warn('Failed to compute offline advisor data', e);
    }
    return null;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let token: string | null = null;
      let currentUserId = user?.id;
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        if (session?.user?.id) {
          currentUserId = session.user.id;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const clientContext = await getClientAdvisorData(currentUserId);

      const payload: any = {
        message: query,
        history,
        userId: currentUserId,
      };

      if (clientContext) {
        payload.clientContext = clientContext;
        payload.clientStats = clientContext.aggregates;
      }

      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const replyContent = data?.reply || 'Failed to receive analysis from advisor.';

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to connect to server: ${err?.message || 'Network error'}. Please check your connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Chat history cleared. Ready to evaluate your edge, risk metrics, and macro context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button (FAB) Trigger - desktop only (§1 & §6) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open AI Advisor"
        title="Head of Risk & Quantitative Advisor"
        whileTap={{ scale: 0.95 }}
        className={cn(
          "hidden md:flex fixed bottom-8 right-8 z-40 rounded-full shadow-2xl items-center justify-center transition-all cursor-pointer",
          "w-14 h-14",
          isOpen
            ? "bg-card text-text-main border border-border-card shadow-lg"
            : "bg-blue-500 border border-blue-500 text-white hover:bg-blue-600 shadow-blue-500/25"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles-icon"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <Sparkles size={22} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-blue-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop only (Desktop is a floating co-pilot widget without screen dimming or scroll blocking) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* 
              UNIFIED COMPONENT ANATOMY (§10.5):
              Mobile = Full-screen Canvas sheet (§5)
              Desktop = Floating L2 Card (§2, §5)
            */}
            <motion.div
              layout
              role="dialog"
              aria-modal="true"
              aria-label="Head of Risk & Quantitative Advisor"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ 
                duration: 0.18, 
                ease: [0.16, 1, 0.3, 1],
                layout: { type: "spring", stiffness: 450, damping: 35 }
              }}
              className={cn(
                "fixed z-50 flex flex-col overflow-hidden text-text-main shadow-2xl",
                // Mobile: Full-screen canvas sheet (§5)
                "inset-0 h-[100dvh] w-full rounded-none bg-canvas border-0",
                // Desktop: Floating card (§2, §5)
                "md:inset-auto md:bottom-26 md:right-8 md:w-[440px] md:h-[620px] md:max-h-[calc(100dvh-130px)] md:rounded-[26px] md:border md:border-border-card md:bg-card"
              )}
            >
              {/* --- DESKTOP HEADER (§5: px-8 py-6, border-b, осязаемые L1 icon-buttons) --- */}
              <div className="hidden md:flex px-8 py-6 border-b border-border-card shrink-0 items-center justify-between bg-card z-20">
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  <div className="flex w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text-main truncate leading-tight">
                      Head of Risk & Quant
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Reset chat"
                    aria-label="Reset chat history"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    aria-label="Close modal"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* --- CHAT BODY & SCROLL CONTAINER (§5) --- */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-canvas md:bg-card relative">
                {/* --- MOBILE HEADER (§5: h-16 sticky top-0 px-4 bg-canvas/80 backdrop-blur-xl без border-b) --- */}
                <div 
                  className="md:hidden relative flex items-center justify-between px-4 sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl shrink-0 border-none"
                  style={{ 
                    paddingTop: 'env(safe-area-inset-top, 0px)', 
                    height: 'calc(4rem + env(safe-area-inset-top, 0px))'
                  }}
                >
                  {/* Слот 1 (Слева): L1 icon-button w-11 h-11 bg-canvas border border-border-card */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close modal"
                    className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <X size={18} />
                  </button>

                  {/* Слот 2 (Центр): Title — центрирование строго по математическому центру по §5 и §3 D */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none px-24"
                    style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                  >
                    <h2 className="text-base font-semibold text-text-main truncate pointer-events-auto">
                      Head of Risk & Quant
                    </h2>
                  </div>

                  {/* Слот 3 (Справа): L1 icon-button w-11 h-11 bg-canvas border border-border-card (Reset chat) */}
                  <button
                    type="button"
                    onClick={handleResetChat}
                    aria-label="Reset chat history"
                    className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <div className="px-6 py-5 md:px-8 md:py-6 space-y-4 md:space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col",
                      m.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-3 md:px-3.5 md:py-2.5 text-sm shadow-xs max-w-[88%] md:max-w-[86%] leading-relaxed md:leading-normal",
                        m.role === 'user'
                          ? "bg-blue-500 border border-blue-500 text-white rounded-[18px] rounded-br-[4px]"
                          : "bg-card border border-border-card text-text-main rounded-[18px] rounded-tl-[4px]"
                      )}
                    >
                      {m.role === 'user' ? (
                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                          {m.content}
                        </p>
                      ) : (
                        <FormattedMessageContent text={m.content} />
                      )}
                    </div>
                    <span className="text-[0.6875rem] text-text-muted mt-1 px-1 font-mono tabular-nums">
                      {m.timestamp}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="px-4 py-3 md:px-3.5 md:py-2.5 bg-card border border-border-card rounded-[18px] rounded-tl-[4px] text-sm text-text-muted flex items-center gap-2 shadow-xs">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Analyzing edge, risk metrics & macro context...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* --- ACTIONS & INPUT AREA (Mobile: no footer, single integrated row elevated with keyboard) --- */}
              <div 
                className={cn(
                  "p-4 md:p-6 bg-card border-t border-border-card shrink-0 z-20 transition-[padding-bottom] duration-150 ease-out",
                  "md:!pb-6"
                )}
                style={{
                  paddingBottom: keyboardHeight > 0 
                    ? `${keyboardHeight + 12}px` 
                    : 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
                }}
              >
                {/* Input form (§4 Button, §9 Accessibility) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onBlur={() => {
                      setTimeout(() => {
                        if (window.visualViewport) {
                          const diff = window.innerHeight - window.visualViewport.height;
                          if (diff <= 80) setKeyboardHeight(0);
                        }
                      }, 100);
                    }}
                    placeholder="Ask about metrics, risk, setups, or macro..."
                    disabled={isLoading}
                    className={cn(
                      "flex-1 rounded-full bg-canvas border border-border-card text-text-main placeholder:text-text-muted focus:outline-none focus:border-blue-500 transition-all",
                      // Mobile: h-11 (§9) | Desktop: h-10 (§2, §4)
                      "h-11 px-4 text-sm md:h-10 md:text-xs md:focus:ring-1 md:focus:ring-blue-500/30"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className={cn(
                      "rounded-full bg-blue-500 border border-blue-500 text-white flex items-center justify-center hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                      // Mobile: w-11 h-11 (§9) | Desktop: w-10 h-10 (§4)
                      "w-11 h-11 md:w-10 md:h-10"
                    )}
                  >
                    <Send className="w-[18px] h-[18px] md:w-[15px] md:h-[15px]" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}