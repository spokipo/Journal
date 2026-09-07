import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Lightbulb, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  Percent, 
  Scale, 
  AlertTriangle, 
  BookMarked, 
  Image as ImageIcon, 
  Loader2,
  Filter,
  Plus,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { lockBodyScroll } from '../../lib/scrollLock';
import { Select } from '../ui/Select';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { TradeModal } from '../trade/TradeModal';
import { IdeaModal, type IdeaPayload } from '../trade/IdeaModal';

export interface TradeRecord {
  id: string;
  user_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  session: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_SESSION';
  risk_percent: number;
  rr: number;
  outcome: 'TP' | 'SL' | 'BE';
  pnl_r: number | null;
  pnl_percent: number | null;
  setup_id: string | null;
  mistake_ids: string[];
  notes: string | null;
  screenshots: string[];
  trade_date: string;
  playbook_title?: string;
}

export interface IdeaRecord extends IdeaPayload {
  id: string;
  created_at: string;
}

export function JournalView() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'ideas'>('trades');
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [playbooks, setPlaybooks] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Фильтры и вид
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Модалки
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<IdeaPayload | null>(null);
  const [editingIdea, setEditingIdea] = useState<IdeaPayload | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);

  // Держит активный scroll-lock на время перехода между модалками
  // (Idea закрывается -> пауза -> Trade открывается, и наоборот).
  // Без этого моста каждая модалка снимает лок по своему isOpen сразу же,
  // а в паузе между закрытием одной и открытием другой скролл на секунду
  // разлочивается — из-за этого страница дёргается/скачет ровно в момент
  // появления второй модалки.
  const transitionLockRelease = useRef<(() => void) | null>(null);

  // Загрузка данных
  const fetchData = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const [pbRes, mistRes, trRes, idRes] = await Promise.all([
        supabase.from('playbooks').select('id, title').eq('user_id', userId),
        supabase.from('user_mistakes').select('id, name').eq('user_id', userId),
        supabase.from('trades').select('*').eq('user_id', userId).order('trade_date', { ascending: false }),
        supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      const pbMap: Record<string, string> = {};
      pbRes.data?.forEach((pb) => { pbMap[pb.id] = pb.title; });
      setPlaybooks(pbMap);

      const mistMap: Record<string, string> = {};
      mistRes.data?.forEach((m) => { mistMap[m.id] = m.name; });
      setMistakes(mistMap);

      setTrades(trRes.data || []);
      setIdeas(idRes.data || []);
    } catch (err) {
      console.error('Error fetching journal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setTrades([]);
        setIdeas([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDeleteTrade = async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error && user) {
      fetchData(user.id);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (!error && user) {
      fetchData(user.id);
    }
  };

  // Локальная функция расчета PnL для надежности (если в базе GENERATED столбец сбоит)
  const getPnlR = useCallback((t: TradeRecord) => {
    if (t.outcome === 'TP') return t.rr || 0;
    if (t.outcome === 'SL') return -1;
    return 0; // BE
  }, []);

  // Фильтрация и сортировка трейдов
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesOutcome = outcomeFilter === 'ALL' || t.outcome === outcomeFilter;
        const matchesSession = sessionFilter === 'ALL' || t.session === sessionFilter;
        return matchesSearch && matchesOutcome && matchesSession;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (sortBy === 'date_asc') return new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime();
        if (sortBy === 'pnl_desc') return getPnlR(b) - getPnlR(a);
        if (sortBy === 'pnl_asc') return getPnlR(a) - getPnlR(b);
        return 0;
      });
  }, [trades, searchQuery, outcomeFilter, sessionFilter, sortBy]);

  // Фильтрация и сортировка идей
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((i) => {
        const matchesSearch = i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (i.notes && i.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [ideas, searchQuery]);

  // Расчет сводной статистики по текущему списку сделок
  const stats = useMemo(() => {
    const total = filteredTrades.length;
    if (total === 0) return { total: 0, winRate: 0, netR: 0, profitFactor: 0 };
    const wins = filteredTrades.filter((t) => t.outcome === 'TP').length;
    const netR = filteredTrades.reduce((acc, t) => acc + getPnlR(t), 0);
    const grossWin = filteredTrades.filter((t) => getPnlR(t) > 0).reduce((acc, t) => acc + getPnlR(t), 0);
    const grossLoss = Math.abs(filteredTrades.filter((t) => getPnlR(t) < 0).reduce((acc, t) => acc + getPnlR(t), 0));
    const profitFactor = grossLoss === 0 ? grossWin : Number((grossWin / grossLoss).toFixed(2));

    return {
      total,
      winRate: Math.round((wins / total) * 100),
      netR: Number(netR.toFixed(2)),
      profitFactor,
    };
  }, [filteredTrades]);

  // Расчет сводной статистики по текущему списку идей
  const ideaStats = useMemo(() => {
    const total = filteredIdeas.length;
    const active = filteredIdeas.filter((i) => i.status === 'active').length;
    const triggered = filteredIdeas.filter((i) => i.status === 'triggered').length;
    const cancelled = filteredIdeas.filter((i) => i.status === 'cancelled').length;
    return { total, active, triggered, cancelled };
  }, [filteredIdeas]);

  return (
    <div className="flex flex-col space-y-5 pb-12 w-full">
      {/* Верхний бар: заголовок, статистика и экшены */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Trading Journal</h1>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
              activeTab === 'trades' 
                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            )}>
              {activeTab === 'trades' ? trades.length : ideas.length}
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Execution history, setup analysis and watchlist ideas
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setEditingIdea(null); setIsIdeaModalOpen(true); }}
            className="h-10 px-4 rounded-[16px] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lightbulb size={15} />
            <span>New Idea</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedIdeaForTrade(null); setIsTradeModalOpen(true); }}
            className="h-10 px-4 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[16px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={17} />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* Быстрые метрики */}
      <div className="relative h-[96px] md:h-[104px]">
        <AnimatePresence mode="wait">
          {activeTab === 'trades' ? (
            <motion.div
              key="trades-metrics"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
            >
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Trades</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-text-main md:mt-1">{stats.total}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Win Rate</span>
                <div className={cn("text-sm md:text-2xl font-bold font-mono md:mt-1", stats.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
                  {stats.winRate}%
                </div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Net PnL</span>
                <div className={cn("text-sm md:text-2xl font-bold font-mono md:mt-1", stats.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {stats.netR > 0 ? `+${stats.netR} R` : `${stats.netR} R`}
                </div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Pr. Factor</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-blue-500 md:mt-1">{stats.profitFactor}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ideas-metrics"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
            >
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Total Ideas</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-text-main md:mt-1">{ideaStats.total}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Active</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-blue-500 md:mt-1">{ideaStats.active}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Triggered</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-emerald-500 md:mt-1">{ideaStats.triggered}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Cancelled</span>
                <div className="text-sm md:text-2xl font-bold font-mono text-text-muted md:mt-1">{ideaStats.cancelled}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 bg-card border border-border-card rounded-[20px] p-2">
        {/* Вкладки с анимированной пилюлей */}
        <div className="relative flex p-1 bg-canvas border border-border-card rounded-[16px] w-full sm:w-fit overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('trades')}
            className={cn(
              "relative z-10 h-8 px-5 rounded-[12px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
              activeTab === 'trades' ? "text-white" : "text-text-muted hover:text-text-main"
            )}
          >
            {activeTab === 'trades' && (
              <motion.div
                layoutId="journal-tab-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-blue-500 rounded-[12px] shadow-sm -z-10"
              />
            )}
            <Zap size={14} />
            <span className="whitespace-nowrap">Trades ({trades.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ideas')}
            className={cn(
              "relative z-10 h-8 px-5 rounded-[12px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
              activeTab === 'ideas' ? "text-white" : "text-text-muted hover:text-text-main"
            )}
          >
            {activeTab === 'ideas' && (
              <motion.div
                layoutId="journal-tab-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-yellow-500 rounded-[12px] shadow-sm -z-10"
              />
            )}
            <Lightbulb size={14} />
            <span className="whitespace-nowrap">Watchlist Ideas ({ideas.length})</span>
          </button>
        </div>

        {/* Тулбар фильтрации */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Поиск */}
          <div className="relative flex-1 min-w-[140px] sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, note..."
              className="w-full sm:w-44 h-9 pl-8 pr-3 bg-canvas border border-border-card rounded-[14px] text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {activeTab === 'trades' && (
            <>
              {/* Фильтр исхода */}
              <Select
                size="sm"
                value={outcomeFilter}
                onChange={setOutcomeFilter}
                options={[
                  { value: 'ALL', label: 'All Outcomes' },
                  { value: 'TP', label: 'Take Profit (TP)' },
                  { value: 'SL', label: 'Stop Loss (SL)' },
                  { value: 'BE', label: 'Breakeven (BE)' },
                ]}
                className="w-full sm:w-36 flex-1 sm:flex-none"
              />

              {/* Фильтр сессии */}
              <Select
                size="sm"
                value={sessionFilter}
                onChange={setSessionFilter}
                options={[
                  { value: 'ALL', label: 'All Sessions' },
                  { value: 'LONDON', label: 'London' },
                  { value: 'NEW_YORK', label: 'New York' },
                  { value: 'ASIA', label: 'Asia' },
                  { value: 'OFF_SESSION', label: 'Off-Session' },
                ]}
                className="w-full sm:w-36 flex-1 sm:flex-none"
              />

              {/* Сортировка */}
              <Select
                size="sm"
                icon={ArrowUpDown}
                value={sortBy}
                onChange={(v) => setSortBy(v as any)}
                options={[
                  { value: 'date_desc', label: 'Newest First' },
                  { value: 'date_asc', label: 'Oldest First' },
                  { value: 'pnl_desc', label: 'Highest PnL' },
                  { value: 'pnl_asc', label: 'Lowest PnL' },
                ]}
                className="w-full sm:w-36 flex-1 sm:flex-none"
              />
            </>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center bg-canvas border border-border-card rounded-[14px] p-1 relative h-9">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "relative w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer z-10",
                viewMode === 'grid' ? "text-blue-500" : "text-text-muted hover:text-text-main"
              )}
              title="Card View"
            >
              <LayoutGrid size={15} className="relative z-10" />
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="viewModeIndicatorJournal"
                  className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-border-card/80"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "relative w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer z-10",
                viewMode === 'list' ? "text-blue-500" : "text-text-muted hover:text-text-main"
              )}
              title="List View"
            >
              <List size={15} className="relative z-10" />
              {viewMode === 'list' && (
                <motion.div
                  layoutId="viewModeIndicatorJournal"
                  className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-border-card/80"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Основной список / контент */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-text-muted">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span className="text-xs">Loading records...</span>
        </div>
      ) : activeTab === 'trades' ? (
        filteredTrades.length === 0 ? (
          <div className="py-16 text-center bg-card border border-border-card rounded-[26px] p-8">
            <Zap size={32} className="mx-auto text-text-muted/40 mb-2" />
            <h3 className="text-sm font-semibold text-text-main">No trades found</h3>
            <p className="text-xs text-text-muted mt-1">Log your first closed execution or change current filters</p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5" 
              : "flex flex-col space-y-3"
          )}>
            {filteredTrades.map((t) => (
              <div
                key={t.id}
                onClick={() => { setEditingTrade(t); setIsTradeModalOpen(true); }}
                className={cn(
                  "p-4 bg-card border border-border-card hover:border-blue-500/40 rounded-[22px] transition-all shadow-sm flex gap-4 cursor-pointer",
                  viewMode === 'list' 
                    ? "flex-col md:flex-row md:items-center justify-between" 
                    : "flex-col justify-between"
                )}
              >
                <div className="flex items-start md:items-center gap-3 min-w-0">
                  {/* Бейдж направления */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0",
                      t.direction === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}
                  >
                    {t.direction === 'LONG' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-main text-sm">{t.symbol}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider",
                          t.outcome === 'TP' && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                          t.outcome === 'SL' && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                          t.outcome === 'BE' && "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        )}
                      >
                        {t.outcome}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">{t.session}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar size={12} />
                        {new Date(t.trade_date).toLocaleDateString()}
                      </span>

                      {t.setup_id && playbooks[t.setup_id] && (
                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                          <BookMarked size={12} />
                          {playbooks[t.setup_id]}
                        </span>
                      )}

                      {t.mistake_ids && t.mistake_ids.length > 0 && mistakes[t.mistake_ids[0]] && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <AlertTriangle size={12} />
                          {mistakes[t.mistake_ids[0]]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Правая часть: метрики и превью чарта */}
                <div className="flex items-center justify-between md:justify-end gap-5">
                  {t.screenshots && t.screenshots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(t.screenshots[0])}
                      className="relative w-12 h-12 rounded-[12px] overflow-hidden border border-border-card bg-canvas shrink-0 group cursor-pointer"
                    >
                      <img src={t.screenshots[0]} alt="Trade chart" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ImageIcon size={12} />
                      </div>
                    </button>
                  )}

                  <div className="text-right">
                    <div className={cn("font-mono font-bold text-base", getPnlR(t) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {getPnlR(t) > 0 ? `+${getPnlR(t)} R` : `${getPnlR(t)} R`}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      Risk {t.risk_percent}% • RR {t.rr}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Список идей */
        filteredIdeas.length === 0 ? (
          <div className="py-16 text-center bg-card border border-border-card rounded-[26px] p-8">
            <Lightbulb size={32} className="mx-auto text-text-muted/40 mb-2" />
            <h3 className="text-sm font-semibold text-text-main">No watchlist ideas</h3>
            <p className="text-xs text-text-muted mt-1">Record setups you are tracking before entering</p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" 
              : "flex flex-col space-y-3"
          )}>
            {filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => { setEditingIdea(idea); setIsIdeaModalOpen(true); }}
                className="p-4 bg-card border border-border-card hover:border-yellow-500/40 rounded-[22px] transition-all shadow-sm flex flex-col justify-between gap-3 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-main text-base">{idea.symbol}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono",
                          idea.direction === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}
                      >
                        {idea.direction}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {idea.status}
                    </span>
                  </div>

                  {idea.notes && (
                    <p className="text-xs text-text-muted line-clamp-2 mt-2 leading-relaxed">
                      {idea.notes}
                    </p>
                  )}
                </div>

                {idea.screenshots && idea.screenshots.length > 0 && (
                  <div
                    onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(idea.screenshots![0]); }}
                    className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group/img cursor-pointer mt-1"
                  >
                    <img src={idea.screenshots[0]} alt="Idea chart" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border-card/60 text-[11px] text-text-muted">
                  <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Модалка логирования/редактирования трейда */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => { setIsTradeModalOpen(false); setSelectedIdeaForTrade(null); setEditingTrade(null); }}
        user={user}
        sourceIdea={selectedIdeaForTrade}
        editingTrade={editingTrade}
        onOpenIdea={(idea) => {
          setIsTradeModalOpen(false);
          transitionLockRelease.current = lockBodyScroll();
          setTimeout(() => {
            setEditingIdea(idea);
            setIsIdeaModalOpen(true);
            transitionLockRelease.current?.();
            transitionLockRelease.current = null;
          }, 200);
        }}
        onSuccess={() => { if (user) fetchData(user.id); }}
        onDelete={handleDeleteTrade}
      />

      {/* Модалка создания/редактирования идеи */}
      <IdeaModal
        isOpen={isIdeaModalOpen}
        onClose={() => { setIsIdeaModalOpen(false); setEditingIdea(null); }}
        user={user}
        editingIdea={editingIdea}
        onSuccess={() => { if (user) fetchData(user.id); }}
        onDelete={handleDeleteIdea}
        onConvertToTrade={(idea) => {
          setSelectedIdeaForTrade(idea);
          transitionLockRelease.current = lockBodyScroll();
          setTimeout(() => {
            setIsTradeModalOpen(true);
            transitionLockRelease.current?.();
            transitionLockRelease.current = null;
          }, 200);
        }}
      />

      {/* Лайтбокс скриншотов */}
      <ImageViewerModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title="Chart Layout"
        onClose={() => setPreviewImageUrl(null)}
      />
    </div>
  );
}