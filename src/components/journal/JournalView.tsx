import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Lightbulb, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  BookMarked, 
  Image as ImageIcon, 
  Loader2,
  Plus,
  LayoutGrid,
  List,
  RotateCcw,
  SlidersHorizontal,
  X,
  Clock,
  AlertTriangle,
  ChevronsUpDown,
  Wallet
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { lockBodyScroll } from '../../lib/scrollLock';
import { Select, type SelectOption } from '../ui/Select';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { TradeModal } from '../trade/TradeModal';
import { IdeaModal, type IdeaPayload, type IdeaStatus } from '../trade/IdeaModal';

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
  account_id?: string | null;
  idea_id?: string | null;
  notes: string | null;
  screenshots: string[];
  trade_date: string;
  playbook_title?: string;
}

export interface IdeaRecord extends IdeaPayload {
  id: string;
  created_at: string;
}

const SORT_OPTIONS: SelectOption[] = [
  { value: 'date_desc', label: 'Date: Newest first' },
  { value: 'date_asc', label: 'Date: Oldest first' },
  { value: 'pnl_desc', label: 'PnL: Highest first' },
  { value: 'pnl_asc', label: 'PnL: Lowest first' },
];

const IDEA_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active (Monitoring)' },
  { value: 'executed', label: 'Executed (In Trade)' },
  { value: 'invalidated', label: 'Invalidated / Expired' },
];

const SESSION_LABELS: Record<string, string> = {
  LONDON: 'LDN',
  NEW_YORK: 'NY',
  ASIA: 'ASIA',
  OFF_SESSION: 'OFF',
};

export function JournalView() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'ideas'>('trades');
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [playbooks, setPlaybooks] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Фильтры и сортировка
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [selectedSetups, setSelectedSetups] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accountsMap, setAccountsMap] = useState<Record<string, string>>({});
  const [selectedIdeaStatus, setSelectedIdeaStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Мобильный anchored popover для фильтра
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  // Живой таймер для идей
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) {
        setIsMobileFilterOpen(false);
      }
    };
    if (isMobileFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileFilterOpen]);

  // Модалка просмотра скриншотов с галереей
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
    title?: string;
  }>({
    isOpen: false,
    images: [],
    index: 0,
  });

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<IdeaPayload | null>(null);
  const [editingIdea, setEditingIdea] = useState<IdeaPayload | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [showOutcomeBreakdown, setShowOutcomeBreakdown] = useState(false);

  const transitionLockRelease = useRef<(() => void) | null>(null);

  const fetchData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const [pbRes, mistRes, trRes, idRes, accRes] = await Promise.all([
        supabase.from('playbooks').select('id, title').eq('user_id', userId),
        supabase.from('user_mistakes').select('id, name').eq('user_id', userId),
        supabase.from('trades').select('*').eq('user_id', userId).order('trade_date', { ascending: false }),
        supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('trading_accounts').select('id, name').eq('user_id', userId).eq('is_archived', false).order('name', { ascending: true }),
      ]);

      const pbMap: Record<string, string> = {};
      pbRes.data?.forEach((pb) => { pbMap[pb.id] = pb.title; });
      setPlaybooks(pbMap);

      const mistMap: Record<string, string> = {};
      mistRes.data?.forEach((m) => { mistMap[m.id] = m.name; });
      setMistakes(mistMap);

      const accList = accRes.data || [];
      setAccounts(accList);
      const aMap: Record<string, string> = {};
      accList.forEach((a: any) => { aMap[a.id] = a.name; });
      setAccountsMap(aMap);

      setTrades(trRes.data || []);
      setIdeas(idRes.data || []);
    } catch (err) {
      console.error('Error fetching journal:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [fetchData]);

  const handleDeleteTrade = async (id: string) => {
    if (!isSupabaseConfigured || !user) return;
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id);
    if (!error) fetchData(user.id);
  };

  const handleDeleteIdea = async (id: string) => {
    if (!isSupabaseConfigured || !user) return;
    const { error } = await supabase.from('ideas').delete().eq('id', id).eq('user_id', user.id);
    if (!error) fetchData(user.id);
  };

  const getPnlR = useCallback((t: TradeRecord) => {
    if (t.pnl_r !== null && t.pnl_r !== undefined) return t.pnl_r;
    if (t.outcome === 'TP') return t.rr || 0;
    if (t.outcome === 'SL') return -1;
    return 0;
  }, []);

  const getEffectiveIdeaStatus = useCallback((idea: IdeaRecord, currentTime: number): IdeaStatus => {
    const s = String(idea.status || '').toLowerCase();
    if (s === 'executed' || s === 'triggered') return 'executed';
    if (s === 'invalidated' || s === 'cancelled') return 'invalidated';
    if (idea.expires_at && new Date(idea.expires_at).getTime() <= currentTime) return 'expired';
    return 'active';
  }, []);

  const formatIdeaRemainingTime = useCallback((expiresAt: string | null | undefined, currentTime: number): string | null => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - currentTime;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m ${secs}s left`;
  }, []);

  const filterSelectOptions = useMemo<SelectOption[]>(() => [
    ...(accounts.length > 0 ? [{
      value: 'cat_account',
      label: 'Account',
      children: accounts.map((acc) => ({
        value: `account:${acc.id}`,
        label: acc.name,
      })),
    }] : []),
    {
      value: 'cat_outcome',
      label: 'Outcome',
      children: [
        { value: 'outcome:TP', label: 'Take Profit (TP)' },
        { value: 'outcome:SL', label: 'Stop Loss (SL)' },
        { value: 'outcome:BE', label: 'Breakeven (BE)' },
      ],
    },
    {
      value: 'cat_session',
      label: 'Session',
      children: [
        { value: 'session:LONDON', label: 'London' },
        { value: 'session:NEW_YORK', label: 'New York' },
        { value: 'session:ASIA', label: 'Asia' },
        { value: 'session:OFF_SESSION', label: 'Off-Session' },
      ],
    },
    {
      value: 'cat_setup',
      label: 'Setup',
      children: Object.entries(playbooks).map(([id, title]) => ({
        value: `setup:${id}`,
        label: title,
      })),
    },
    {
      value: 'cat_mistake',
      label: 'Mistake',
      children: Object.entries(mistakes).map(([id, name]) => ({
        value: `mistake:${id}`,
        label: name,
      })),
    },
  ], [accounts, playbooks, mistakes]);

  const selectedFilterValues = useMemo(() => [
    ...selectedAccounts.map((a) => `account:${a}`),
    ...selectedOutcomes.map((v) => `outcome:${v}`),
    ...selectedSessions.map((s) => `session:${s}`),
    ...selectedSetups.map((id) => `setup:${id}`),
    ...selectedMistakes.map((id) => `mistake:${id}`),
  ], [selectedAccounts, selectedOutcomes, selectedSessions, selectedSetups, selectedMistakes]);

  const handleFilterChange = (vals: string[]) => {
    const newAccounts: string[] = [];
    const newOutcomes: string[] = [];
    const newSessions: string[] = [];
    const newSetups: string[] = [];
    const newMistakes: string[] = [];

    vals.forEach((v) => {
      if (v.startsWith('account:')) newAccounts.push(v.replace('account:', ''));
      if (v.startsWith('outcome:')) newOutcomes.push(v.replace('outcome:', ''));
      if (v.startsWith('session:')) newSessions.push(v.replace('session:', ''));
      if (v.startsWith('setup:')) newSetups.push(v.replace('setup:', ''));
      if (v.startsWith('mistake:')) newMistakes.push(v.replace('mistake:', ''));
    });

    setSelectedAccounts(newAccounts);
    setSelectedOutcomes(newOutcomes);
    setSelectedSessions(newSessions);
    setSelectedSetups(newSetups);
    setSelectedMistakes(newMistakes);
  };

  const removeFilter = (type: 'account' | 'outcome' | 'session' | 'setup' | 'mistake', id: string) => {
    if (type === 'account') setSelectedAccounts((prev) => prev.filter((v) => v !== id));
    if (type === 'outcome') setSelectedOutcomes((prev) => prev.filter((v) => v !== id));
    if (type === 'session') setSelectedSessions((prev) => prev.filter((v) => v !== id));
    if (type === 'setup') setSelectedSetups((prev) => prev.filter((v) => v !== id));
    if (type === 'mistake') setSelectedMistakes((prev) => prev.filter((v) => v !== id));
  };

  const activeFilterCount = activeTab === 'trades'
    ? selectedAccounts.length + selectedOutcomes.length + selectedSessions.length + selectedSetups.length + selectedMistakes.length
    : (selectedIdeaStatus !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSelectedAccounts([]);
    setSelectedOutcomes([]);
    setSelectedSessions([]);
    setSelectedSetups([]);
    setSelectedMistakes([]);
    setSelectedIdeaStatus('all');
    setSearchQuery('');
  };

  const filteredTrades = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return trades
      .filter((t) => {
        const matchesSearch = !q || t.symbol.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.setup_id && playbooks[t.setup_id]?.toLowerCase().includes(q));
        
        const matchesAccount = selectedAccounts.length === 0 || (t.account_id && selectedAccounts.includes(t.account_id));
        const matchesOutcome = selectedOutcomes.length === 0 || selectedOutcomes.includes(t.outcome);
        const matchesSession = selectedSessions.length === 0 || selectedSessions.includes(t.session);
        const matchesSetup = selectedSetups.length === 0 || (t.setup_id && selectedSetups.includes(t.setup_id));
        const matchesMistake = selectedMistakes.length === 0 || (t.mistake_ids && t.mistake_ids.some((m) => selectedMistakes.includes(m)));

        return matchesSearch && matchesAccount && matchesOutcome && matchesSession && matchesSetup && matchesMistake;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (sortBy === 'date_asc') return new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime();
        if (sortBy === 'pnl_desc') return getPnlR(b) - getPnlR(a);
        if (sortBy === 'pnl_asc') return getPnlR(a) - getPnlR(b);
        return 0;
      });
  }, [trades, searchQuery, selectedAccounts, selectedOutcomes, selectedSessions, selectedSetups, selectedMistakes, sortBy, playbooks, getPnlR]);

  const filteredIdeas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ideas
      .filter((i) => {
        const matchesSearch = !q || i.symbol.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q));
        const status = getEffectiveIdeaStatus(i, now);
        const matchesStatus = selectedIdeaStatus === 'all' ||
          (selectedIdeaStatus === 'active' && status === 'active') ||
          (selectedIdeaStatus === 'executed' && status === 'executed') ||
          (selectedIdeaStatus === 'invalidated' && (status === 'invalidated' || status === 'expired'));

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [ideas, searchQuery, selectedIdeaStatus, now, getEffectiveIdeaStatus]);

  const stats = useMemo(() => {
    const total = filteredTrades.length;
    if (total === 0) return { total: 0, winRate: 0, netR: 0, netPercent: 0, profitFactor: 0 };
    const wins = filteredTrades.filter((t) => t.outcome === 'TP').length;
    const netR = filteredTrades.reduce((acc, t) => acc + getPnlR(t), 0);
    const grossWin = filteredTrades.filter((t) => getPnlR(t) > 0).reduce((acc, t) => acc + getPnlR(t), 0);
    const grossLoss = Math.abs(filteredTrades.filter((t) => getPnlR(t) < 0).reduce((acc, t) => acc + getPnlR(t), 0));
    const profitFactor = grossLoss === 0 ? grossWin : Number((grossWin / grossLoss).toFixed(2));
    const netPercent = filteredTrades.reduce((acc, t) => {
      const pnlR = getPnlR(t);
      const pct = t.pnl_percent !== null && t.pnl_percent !== undefined
        ? t.pnl_percent
        : t.risk_percent !== null && t.risk_percent !== undefined
          ? pnlR * t.risk_percent
          : 0;
      return acc + pct;
    }, 0);

    return {
      total,
      winRate: Math.round((wins / total) * 100),
      netR: Number(netR.toFixed(2)),
      netPercent: Number(netPercent.toFixed(2)),
      profitFactor,
    };
  }, [filteredTrades, getPnlR]);

  const outcomeCounts = useMemo(() => {
    let tp = 0;
    let be = 0;
    let sl = 0;
    filteredTrades.forEach((t) => {
      if (t.outcome === 'TP') tp++;
      else if (t.outcome === 'BE') be++;
      else if (t.outcome === 'SL') sl++;
    });
    const total = filteredTrades.length;
    const tpPct = total > 0 ? Math.round((tp / total) * 100) : 0;
    const bePct = total > 0 ? Math.round((be / total) * 100) : 0;
    const slPct = total > 0 ? Math.round((sl / total) * 100) : 0;
    return { tp, be, sl, tpPct, bePct, slPct };
  }, [filteredTrades]);

  const ideaStats = useMemo(() => {
    const total = ideas.length;
    let active = 0;
    let executed = 0;
    let invalidated = 0;
    ideas.forEach((i) => {
      const status = getEffectiveIdeaStatus(i, now);
      if (status === 'active') active++;
      else if (status === 'executed') executed++;
      else invalidated++;
    });
    return { total, active, executed, invalidated };
  }, [ideas, now, getEffectiveIdeaStatus]);

  const openImageViewer = (images: string[], index: number, title?: string) => {
    setViewerState({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  const renderItemCard = (item: TradeRecord | IdeaRecord, type: 'trade' | 'idea') => {
    const isTrade = type === 'trade';
    const trade = item as TradeRecord;
    const idea = item as IdeaRecord;

    const rawDirection = (isTrade ? trade.direction : idea.direction) || (item as any).side || (item as any).type || '';
    const dirUpper = String(rawDirection).trim().toUpperCase();
    const isLong = ['LONG', 'BUY', 'B', 'UP'].includes(dirUpper);

    const symbol = isTrade ? trade.symbol : idea.symbol;
    const date = isTrade ? trade.trade_date : idea.created_at;
    const notes = isTrade ? trade.notes : idea.notes;
    const screenshots = (isTrade ? trade.screenshots : idea.screenshots) || [];

    const ideaEffectiveStatus = !isTrade ? getEffectiveIdeaStatus(idea, now) : 'active';
    const ideaRemaining = !isTrade ? formatIdeaRemainingTime(idea.expires_at, now) : null;

    let badgeText = '';
    let badgeClasses = '';
    
    if (isTrade) {
      badgeText = trade.outcome;
      badgeClasses = trade.outcome === 'TP' ? 'bg-emerald-500/10 text-emerald-500' :
                     trade.outcome === 'SL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500';
    } else {
      if (ideaEffectiveStatus === 'executed') {
        badgeText = 'Executed';
        badgeClasses = 'bg-emerald-500/10 text-emerald-500';
      } else if (ideaEffectiveStatus === 'invalidated') {
        badgeText = 'Invalidated';
        badgeClasses = 'bg-rose-500/10 text-rose-500';
      } else if (ideaEffectiveStatus === 'expired') {
        badgeText = 'Expired';
        badgeClasses = 'bg-canvas text-text-muted border border-border-card';
      } else {
        badgeText = 'Active';
        badgeClasses = 'bg-amber-500/10 text-amber-500';
      }
    }

    const pnlR = isTrade ? getPnlR(trade) : 0;
    const pnlPct = isTrade
      ? trade.pnl_percent !== null && trade.pnl_percent !== undefined
        ? trade.pnl_percent
        : trade.risk_percent ? Number((pnlR * trade.risk_percent).toFixed(2)) : null
      : null;

    // =========================================================================
    // 1. СТРОЧНЫЙ РЕЖИМ (LIST VIEW — КОЛОНОЧНАЯ СТРУКТУРА)
    // =========================================================================
    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          onClick={() => {
            if (isTrade) {
              setEditingTrade(trade);
              setIsTradeModalOpen(true);
            } else {
              setEditingIdea(idea);
              setIsIdeaModalOpen(true);
            }
          }}
          className={cn(
            "bg-card border border-border-card transition-colors cursor-pointer rounded-[18px]",
            isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50"
          )}
        >
          {/* Desktop List Row (Строго h-16, четкие колонки) */}
          <div className="hidden md:flex items-center justify-between gap-4 h-16 px-4 w-full">
            {/* Колонка 1: Направление (L0 w-9 h-9 rounded-[14px]), Тикер, Исход, Сессия / Индикатор идеи */}
            <div className="flex items-center gap-2.5 w-64 shrink-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                  isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}
              >
                {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>

              <span className="text-sm font-bold text-text-main tracking-tight truncate w-18 shrink-0">{symbol}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0 min-w-[2.25rem] text-center", badgeClasses)}>
                {badgeText}
              </span>
              {isTrade && trade.session && (
                <span className="px-1.5 py-0.5 rounded-[14px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-medium uppercase shrink-0">
                  {SESSION_LABELS[trade.session] || trade.session}
                </span>
              )}
              {isTrade && trade.idea_id && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[14px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0" title="Created from Watchlist Idea">
                  <Lightbulb size={11} />
                  <span>Idea</span>
                </span>
              )}
            </div>

            {/* Колонка 2: Дата, Сетап, Ошибки (динамический центр flex-1) */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="font-mono tabular-nums text-[0.6875rem] text-text-muted shrink-0 w-20">
                {new Date(date).toLocaleDateString()}
              </span>

              {isTrade && trade.setup_id && playbooks[trade.setup_id] && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[14px] bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-[140px]">
                  <BookMarked size={11} className="shrink-0" />
                  <span className="truncate">{playbooks[trade.setup_id]}</span>
                </span>
              )}

              {isTrade && trade.mistake_ids && trade.mistake_ids.map((id) => mistakes[id] ? (
                <span key={id} className="px-2 py-0.5 rounded-[14px] bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium truncate max-w-[110px]">
                  {mistakes[id]}
                </span>
              ) : null)}

              {!isTrade && notes && (
                <span className="text-xs text-text-muted truncate max-w-[280px]">
                  {notes}
                </span>
              )}
            </div>

            {/* Колонка 3: Параметры риска / Таймер идеи (w-28) */}
            {isTrade ? (
              <div className="w-28 shrink-0 flex flex-col justify-center gap-0.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[0.6875rem] text-text-muted font-normal">Risk</span>
                  <span className="font-mono tabular-nums font-semibold text-text-main">
                    {trade.risk_percent !== null && trade.risk_percent !== undefined ? `${trade.risk_percent}%` : '—'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[0.6875rem] text-text-muted font-normal">RR</span>
                  <span className="font-mono tabular-nums font-medium text-text-muted">
                    {trade.rr ? `1:${trade.rr}` : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-28 shrink-0 flex flex-col justify-center gap-0.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[0.6875rem] text-text-muted font-normal">
                    {ideaEffectiveStatus === 'active' ? 'Time Left' : 'Status'}
                  </span>
                  <span className={cn(
                    "font-mono tabular-nums text-xs font-semibold",
                    ideaEffectiveStatus === 'active' ? "text-amber-500" :
                    ideaEffectiveStatus === 'executed' ? "text-emerald-500" : "text-text-muted"
                  )}>
                    {ideaEffectiveStatus === 'active' ? (ideaRemaining || 'Active') : ideaEffectiveStatus === 'executed' ? 'Executed' : ideaEffectiveStatus === 'expired' ? 'Expired' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[0.6875rem] text-text-muted font-normal">State</span>
                  <span className="text-[0.6875rem] text-text-muted font-medium capitalize">
                    {ideaEffectiveStatus === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>
            )}

            {/* Колонка 4: Итоговый PnL / Статус (w-24 text-right) */}
            {isTrade ? (
              <div className="w-24 shrink-0 flex flex-col justify-center items-end text-right">
                <div className={cn(
                  "text-sm font-bold font-mono tabular-nums leading-tight",
                  pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                )}>
                  {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                </div>
                <div className={cn(
                  "text-[0.6875rem] font-mono tabular-nums leading-tight mt-0.5",
                  pnlPct !== null && pnlPct !== undefined
                    ? (pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted")
                    : "text-text-muted/30"
                )}>
                  {pnlPct !== null && pnlPct !== undefined
                    ? (pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`)
                    : '—'}
                </div>
              </div>
            ) : (
              <div className="w-24 shrink-0 flex flex-col justify-center items-end text-right">
                <span className="text-xs text-text-muted/30 font-mono">—</span>
              </div>
            )}

            {/* Колонка 5: Миниатюра скриншота (w-10) */}
            <div className="w-10 shrink-0 flex justify-end">
              {screenshots.length > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageViewer(screenshots, 0, `${symbol} Screenshots`);
                  }}
                  className="relative w-10 h-10 rounded-[12px] overflow-hidden border border-border-card bg-canvas group cursor-pointer"
                >
                  <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  {screenshots.length > 1 && (
                    <span className="absolute bottom-0 right-0 px-1 rounded-tl-[4px] bg-black/75 text-white text-[0.6875rem] font-mono tabular-nums">
                      +{screenshots.length - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="w-10 h-10 rounded-[12px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/30">
                  <ImageIcon size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Mobile List Row (Строгая высота 4.5rem, одинаковые слоты колонок) */}
          <div className="flex md:hidden items-center justify-between gap-2.5 w-full px-3 h-[4.5rem] min-h-[4.5rem] max-h-[4.5rem]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                  isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}
              >
                {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                {/* 1-я строка: тикер, бейдж, сессия (без wrap, чтобы высота не скакала) */}
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <span className="text-sm font-bold text-text-main shrink-0">{symbol}</span>
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
                    {badgeText}
                  </span>
                  {isTrade && trade.session && (
                    <span className="px-1.5 py-0.5 rounded-[10px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono uppercase shrink-0">
                      {SESSION_LABELS[trade.session] || trade.session}
                    </span>
                  )}
                  {isTrade && trade.idea_id && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0">
                      <Lightbulb size={10} />
                      <span>Idea</span>
                    </span>
                  )}
                </div>

                {/* 2-я строка: дата + сетап/заметки (без дублирования таймера) */}
                <div className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted truncate">
                  <span className="font-mono tabular-nums shrink-0">{new Date(date).toLocaleDateString()}</span>
                  {isTrade && trade.setup_id && playbooks[trade.setup_id] && (
                    <>
                      <span className="text-border-card shrink-0">•</span>
                      <span className="text-blue-500 truncate">{playbooks[trade.setup_id]}</span>
                    </>
                  )}
                  {!isTrade && notes && (
                    <>
                      <span className="text-border-card shrink-0">•</span>
                      <span className="text-text-muted truncate">{notes}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Правая колонка: PnL / Risk / Таймер + фиксированный слот миниатюры */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right flex flex-col justify-center">
                {isTrade ? (
                  <>
                    <div className={cn(
                      "text-sm font-bold font-mono tabular-nums leading-tight",
                      pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                    )}>
                      {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[0.6875rem] text-text-muted mt-0.5">
                      <span>Risk <strong className="font-mono tabular-nums font-medium text-text-main">{trade.risk_percent !== null && trade.risk_percent !== undefined ? `${trade.risk_percent}%` : '—'}</strong></span>
                      <span className="text-border-card">•</span>
                      <span>RR <strong className="font-mono tabular-nums font-medium text-text-main">{trade.rr ? `1:${trade.rr}` : '—'}</strong></span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-amber-500 font-mono tabular-nums flex items-center justify-end gap-1 font-semibold leading-tight">
                      {ideaEffectiveStatus === 'active' && ideaRemaining ? (
                        <>
                          <Clock size={11} />
                          <span>{ideaRemaining}</span>
                        </>
                      ) : (
                        <span className="capitalize text-text-muted">{ideaEffectiveStatus}</span>
                      )}
                    </div>
                    <div className="text-[0.6875rem] text-text-muted/60 font-mono mt-0.5">
                      {ideaEffectiveStatus === 'active' ? 'Active' : 'Ended'}
                    </div>
                  </>
                )}
              </div>

              {/* Одинаковый слот миниатюры на всех строках для ровной сетки */}
              <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                {screenshots.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageViewer(screenshots, 0, `${symbol} Screenshots`);
                    }}
                    className="relative w-9 h-9 rounded-[10px] overflow-hidden border border-border-card bg-canvas cursor-pointer shrink-0"
                  >
                    <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                    {screenshots.length > 1 && (
                      <span className="absolute bottom-0 right-0 px-0.5 rounded-tl-[3px] bg-black/80 text-white text-[0.6875rem] font-mono">
                        +{screenshots.length - 1}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-9 h-9 rounded-[10px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/20 shrink-0">
                    <ImageIcon size={12} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // 2. КАРТОЧНЫЙ РЕЖИМ (GRID VIEW — РЕСТРУКТУРИРОВАННЫЙ ТИКЕТ)
    // =========================================================================
    return (
      <div
        key={item.id}
        onClick={() => {
          if (isTrade) {
            setEditingTrade(trade);
            setIsTradeModalOpen(true);
          } else {
            setEditingIdea(idea);
            setIsIdeaModalOpen(true);
          }
        }}
        className={cn(
          "bg-card border border-border-card transition-colors cursor-pointer flex p-4 rounded-[26px] flex-col justify-between min-h-[180px] h-full",
          isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50"
        )}
      >
        {/* ЯРУС 1: ШАПКА ТИКЕТА */}
        <div className="flex items-center justify-between gap-3 w-full pb-3 border-b border-border-card/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={cn(
                "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-sm font-bold tracking-tight text-text-main truncate">{symbol}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
                {badgeText}
              </span>
              {isTrade && trade.session && (
                <span className="px-1.5 py-0.5 rounded-[14px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-semibold uppercase shrink-0">
                  {SESSION_LABELS[trade.session] || trade.session}
                </span>
              )}
              {isTrade && trade.idea_id && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[14px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0">
                  <Lightbulb size={11} />
                  <span>Idea</span>
                </span>
              )}
            </div>
          </div>

          {/* Главный результат (PnL) / Статус */}
          <div className="text-right shrink-0">
            {isTrade ? (
              <div className="flex flex-col items-end leading-tight">
                <span className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                )}>
                  {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                </span>
                <span className={cn(
                  "text-[0.6875rem] font-mono tabular-nums mt-0.5",
                  pnlPct !== null && pnlPct !== undefined
                    ? (pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted")
                    : "text-text-muted/30"
                )}>
                  {pnlPct !== null && pnlPct !== undefined
                    ? (pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`)
                    : '—'}
                </span>
              </div>
            ) : (
              ideaEffectiveStatus === 'active' && ideaRemaining ? (
                <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-semibold text-amber-500">
                  <Clock size={12} />
                  <span>{ideaRemaining}</span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* ЯРУС 2: ТЕЛО ТИКЕТА (Сетапы, ошибки, заметки + превью) */}
        <div className="flex items-start justify-between gap-3 my-auto py-2.5 w-full">
          <div className="flex-1 min-w-0 space-y-2">
            {isTrade && (trade.setup_id || (trade.mistake_ids && trade.mistake_ids.length > 0)) ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {trade.setup_id && playbooks[trade.setup_id] && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[14px] bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-[130px]">
                    <BookMarked size={11} />
                    <span className="truncate">{playbooks[trade.setup_id]}</span>
                  </span>
                )}
                {trade.mistake_ids && trade.mistake_ids.map((id) => mistakes[id] ? (
                  <span key={id} className="px-2 py-0.5 rounded-[14px] bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium truncate max-w-[100px]">
                    {mistakes[id]}
                  </span>
                ) : null)}
              </div>
            ) : null}

            {notes ? (
              <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-normal">
                {notes}
              </p>
            ) : (
              <p className="text-xs text-text-muted/40 italic font-normal">
                No notes
              </p>
            )}
          </div>

          {screenshots.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                openImageViewer(screenshots, 0, `${symbol} Screenshots`);
              }}
              className="relative w-16 h-14 rounded-[12px] overflow-hidden border border-border-card bg-canvas shrink-0 group/img cursor-pointer shadow-xs"
            >
              <img
                src={screenshots[0]}
                alt="Preview"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
              />
              {screenshots.length > 1 && (
                <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 text-white text-[0.6875rem] font-mono tabular-nums flex items-center gap-0.5">
                  <ImageIcon size={9} />
                  {screenshots.length}
                </span>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ImageIcon size={14} />
              </div>
            </div>
          )}
        </div>

        {/* ЯРУС 3: ФУТЕР ТИКЕТА */}
        <div className="pt-2 border-t border-border-card/60 w-full flex items-center justify-between text-[0.6875rem]">
          {isTrade ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 text-text-muted">
                <span>Risk</span>
                <span className="font-mono tabular-nums font-semibold text-text-main">{trade.risk_percent}%</span>
              </div>
              <span className="text-border-card/80">•</span>
              <div className="flex items-center gap-1 text-text-muted">
                <span>RR</span>
                <span className="font-mono tabular-nums font-semibold text-text-main">1:{trade.rr}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
              <Lightbulb size={12} className="text-amber-500" />
              <span>Watchlist Idea</span>
            </div>
          )}
          <div className="font-mono tabular-nums text-text-muted">
            {new Date(date).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-16 w-full max-w-[960px] mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">Trading Journal</h1>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono tabular-nums",
              activeTab === 'trades' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {activeTab === 'trades' ? trades.length : ideas.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Execution history, setup analysis and watchlist ideas
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setEditingIdea(null); setIsIdeaModalOpen(true); }}
            className="h-11 md:h-10 px-4 rounded-[18px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Lightbulb size={16} />
            <span>New Idea</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedIdeaForTrade(null); setIsTradeModalOpen(true); }}
            className="h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeTab === 'trades' ? (
            <motion.div
              key="trades-metrics"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
            >
              {/* Карточка 1: Всего трейдов (Интерактивная кнопка-переключатель) */}
              <button
                type="button"
                onClick={() => setShowOutcomeBreakdown((prev) => !prev)}
                className={cn(
                  "flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border rounded-[26px] text-left transition-all cursor-pointer select-none group active:scale-[0.98]",
                  showOutcomeBreakdown
                    ? "border-blue-500/60 bg-blue-500/[0.04] shadow-xs"
                    : "border-border-card hover:border-blue-500/30 hover:bg-canvas/40"
                )}
                title="Нажмите для переключения: общая статистика / подсчет TP, BE, SL"
              >
                <div className="flex items-center gap-1.5 min-w-0 mr-2">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-main truncate transition-colors">
                    Trades
                  </span>
                  <ChevronsUpDown
                    size={12}
                    className={cn(
                      "transition-transform duration-200 shrink-0",
                      showOutcomeBreakdown ? "text-blue-500 rotate-180" : "text-text-muted/40 group-hover:text-text-muted"
                    )}
                  />
                </div>
                <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main shrink-0">
                  {stats.total}
                </div>
              </button>

              {/* Карточки 2, 3, 4: Плавная анимация смены метрик на TP, BE, SL */}
              <AnimatePresence mode="wait" initial={false}>
                {!showOutcomeBreakdown ? (
                  <React.Fragment key="standard-metrics">
                    <motion.div
                      key="metric-winrate"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Win Rate</span>
                      <div className={cn("text-base sm:text-xl font-bold font-mono tabular-nums", stats.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
                        {stats.winRate}%
                      </div>
                    </motion.div>

                    <motion.div
                      key="metric-netpnl"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Net PnL</span>
                      <div className={cn("text-base sm:text-xl font-bold font-mono tabular-nums", stats.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {stats.netR > 0 ? `+${stats.netR} R` : `${stats.netR} R`}
                      </div>
                    </motion.div>

                    <motion.div
                      key="metric-netpercent"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">PnL %</span>
                      <div className={cn(
                        "text-base sm:text-xl font-bold font-mono tabular-nums",
                        stats.netPercent >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {stats.netPercent > 0 ? `+${stats.netPercent}%` : `${stats.netPercent}%`}
                      </div>
                    </motion.div>
                  </React.Fragment>
                ) : (
                  <React.Fragment key="outcome-metrics">
                    <motion.div
                      key="metric-tp"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Take Profit</span>
                      <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-500">
                        {outcomeCounts.tp}
                      </div>
                    </motion.div>

                    <motion.div
                      key="metric-be"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Breakeven</span>
                      <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-500">
                        {outcomeCounts.be}
                      </div>
                    </motion.div>

                    <motion.div
                      key="metric-sl"
                      initial={{ opacity: 0, scale: 0.96, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Stop Loss</span>
                      <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-rose-500">
                        {outcomeCounts.sl}
                      </div>
                    </motion.div>
                  </React.Fragment>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="ideas-metrics"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
            >
              <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Total</span>
                <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main">{ideaStats.total}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Active</span>
                <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-500">{ideaStats.active}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Executed</span>
                <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-500">{ideaStats.executed}</div>
              </div>
              <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Invalidated</span>
                <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-rose-500">{ideaStats.invalidated}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Toolbar */}
      <div className="flex flex-col gap-2 relative z-30 w-full">
        {/* Row 1: Табы + ViewMode на мобилке */}
        <div className="flex items-center justify-between gap-2 md:gap-3 w-full">
          <div className="flex p-1 bg-card border border-border-card rounded-[18px] h-11 md:h-9 items-center flex-1 md:flex-initial shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('trades')}
              className={cn(
                "relative z-10 flex-1 md:flex-none h-9 md:h-7 px-4 rounded-[14px] text-xs font-medium transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5",
                activeTab === 'trades' ? "text-white" : "text-text-muted hover:text-text-main"
              )}
            >
              {activeTab === 'trades' && (
                <motion.div
                  layoutId="journal-tab-pill-main"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 bg-blue-500 rounded-[14px] -z-10"
                />
              )}
              <Zap size={14} />
              <span>Trades</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ideas')}
              className={cn(
                "relative z-10 flex-1 md:flex-none h-9 md:h-7 px-4 rounded-[14px] text-xs font-medium transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5",
                activeTab === 'ideas' ? "text-white" : "text-text-muted hover:text-text-main"
              )}
            >
              {activeTab === 'ideas' && (
                <motion.div
                  layoutId="journal-tab-pill-main"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 bg-amber-500 rounded-[14px] -z-10"
                />
              )}
              <Lightbulb size={14} />
              <span>Watchlist</span>
            </button>
          </div>

          {/* Десктопная панель */}
          <div className="hidden md:flex items-center gap-2 md:ml-auto">
            <div className="relative w-44 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-8 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {activeTab === 'trades' ? (
              <>
                <div className="shrink-0 w-36">
                  <Select
                    size="sm"
                    icon={SlidersHorizontal}
                    placeholder="Filter"
                    multiple
                    value={selectedFilterValues}
                    onChange={handleFilterChange}
                    options={filterSelectOptions}
                  />
                </div>

                <div className="shrink-0 w-36">
                  <Select
                    size="sm"
                    icon={ArrowUpDown}
                    value={sortBy}
                    onChange={(v) => setSortBy(v as any)}
                    options={SORT_OPTIONS}
                  />
                </div>
              </>
            ) : (
              <div className="shrink-0 w-44">
                <Select
                  size="sm"
                  icon={SlidersHorizontal}
                  placeholder="Status"
                  value={selectedIdeaStatus}
                  onChange={(v) => setSelectedIdeaStatus(v as string)}
                  options={IDEA_STATUS_OPTIONS}
                />
              </div>
            )}

            <div className="flex p-1 bg-card border border-border-card rounded-[18px] h-9 items-center shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "relative w-8 h-7 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                  viewMode === 'grid' ? "text-text-main" : "text-text-muted hover:text-text-main"
                )}
                aria-label="Grid layout"
              >
                <LayoutGrid size={14} className="relative z-10" />
                {viewMode === 'grid' && (
                  <motion.div
                    layoutId="journal-view-toggle-mode"
                    className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                    transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "relative w-8 h-7 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                  viewMode === 'list' ? "text-text-main" : "text-text-muted hover:text-text-main"
                )}
                aria-label="List layout"
              >
                <List size={14} className="relative z-10" />
                {viewMode === 'list' && (
                  <motion.div
                    layoutId="journal-view-toggle-mode"
                    className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                    transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Мобильный ViewMode */}
          <div className="flex md:hidden p-1 bg-card border border-border-card rounded-[18px] h-11 items-center shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "relative w-10 h-9 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                viewMode === 'grid' ? "text-text-main" : "text-text-muted hover:text-text-main"
              )}
              aria-label="Grid layout"
            >
              <LayoutGrid size={16} className="relative z-10" />
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="journal-view-toggle-mode-mobile"
                  className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                  transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "relative w-10 h-9 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                viewMode === 'list' ? "text-text-main" : "text-text-muted hover:text-text-main"
              )}
              aria-label="List layout"
            >
              <List size={16} className="relative z-10" />
              {viewMode === 'list' && (
                <motion.div
                  layoutId="journal-view-toggle-mode-mobile"
                  className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                  transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Row 2 на мобилке: Search input + Filter icon-button with anchored popover */}
        <div className="flex md:hidden items-center gap-2 w-full relative">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'trades' ? "Search trades, setups..." : "Search ideas, setups..."}
              className="w-full h-11 pl-10 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter button + Anchored Popover */}
          <div className="relative shrink-0" ref={mobileFilterRef}>
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              aria-label="Filter & display options"
              className={cn(
                "relative w-11 h-11 rounded-[18px] border flex items-center justify-center transition-colors cursor-pointer",
                isMobileFilterOpen || activeFilterCount > 0
                  ? "bg-card border-blue-500 text-blue-500 shadow-sm"
                  : "bg-card border-border-card text-text-muted hover:text-text-main"
              )}
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[0.625rem] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Anchored Popover */}
            <AnimatePresence>
              {isMobileFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-card border border-border-card rounded-[18px] p-3 shadow-xl z-50 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-card">
                    <span className="text-xs font-semibold text-text-main uppercase tracking-wider">
                      {activeTab === 'trades' ? "Trade Filters" : "Idea Filters"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {activeTab === 'trades' ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Filter</label>
                        <Select
                          size="md"
                          icon={SlidersHorizontal}
                          placeholder="Select filters"
                          multiple
                          value={selectedFilterValues}
                          onChange={handleFilterChange}
                          options={filterSelectOptions}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Sort By</label>
                        <Select
                          size="md"
                          icon={ArrowUpDown}
                          value={sortBy}
                          onChange={(v) => setSortBy(v as any)}
                          options={SORT_OPTIONS}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Status</label>
                      <Select
                        size="md"
                        icon={SlidersHorizontal}
                        value={selectedIdeaStatus}
                        onChange={(v) => setSelectedIdeaStatus(v as string)}
                        options={IDEA_STATUS_OPTIONS}
                      />
                    </div>
                  )}

                  {activeFilterCount > 0 && (
                    <div className="pt-2 border-t border-border-card flex items-center justify-between">
                      <span className="text-[0.6875rem] text-text-muted font-mono">{activeFilterCount} active</span>
                      <button
                        type="button"
                        onClick={() => {
                          resetFilters();
                          setIsMobileFilterOpen(false);
                        }}
                        className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCcw size={11} />
                        <span>Reset all</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Активные чипсы фильтрации */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {selectedAccounts.map((id) => (
              <div
                key={id}
                className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
              >
                <Wallet size={10} className="shrink-0" />
                <span>Account: {accountsMap[id] || id}</span>
                <button
                  type="button"
                  onClick={() => removeFilter('account', id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {selectedOutcomes.map((val) => (
              <div
                key={val}
                className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
              >
                <span>Outcome: {val}</span>
                <button
                  type="button"
                  onClick={() => removeFilter('outcome', val)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {selectedSessions.map((val) => (
              <div
                key={val}
                className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
              >
                <span>Session: {SESSION_LABELS[val] || val}</span>
                <button
                  type="button"
                  onClick={() => removeFilter('session', val)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {selectedSetups.map((id) => (
              <div
                key={id}
                className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
              >
                <span>Setup: {playbooks[id] || id}</span>
                <button
                  type="button"
                  onClick={() => removeFilter('setup', id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {selectedMistakes.map((id) => (
              <div
                key={id}
                className="h-6 pl-2.5 pr-1 rounded-full bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium flex items-center gap-1"
              >
                <span>Mistake: {mistakes[id] || id}</span>
                <button
                  type="button"
                  onClick={() => removeFilter('mistake', id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-rose-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {activeTab === 'ideas' && selectedIdeaStatus !== 'all' && (
              <div className="h-6 pl-2.5 pr-1 rounded-full bg-amber-500/10 text-amber-500 text-[0.6875rem] font-medium flex items-center gap-1">
                <span>Status: {IDEA_STATUS_OPTIONS.find((o) => o.value === selectedIdeaStatus)?.label || selectedIdeaStatus}</span>
                <button
                  type="button"
                  onClick={() => setSelectedIdeaStatus('all')}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-amber-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="text-[0.6875rem] text-text-muted hover:text-text-main flex items-center gap-1 ml-1 cursor-pointer"
            >
              <RotateCcw size={10} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Content Area */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-card border border-border-card rounded-[26px] p-4 min-h-[180px] animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border-card/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[14px] bg-canvas" />
                    <div className="w-20 h-4 rounded-[14px] bg-canvas" />
                  </div>
                  <div className="w-12 h-4 rounded-full bg-canvas" />
                </div>
                <div className="space-y-2 my-auto py-2.5">
                  <div className="w-3/4 h-3 rounded-[14px] bg-canvas" />
                  <div className="w-1/2 h-3 rounded-[14px] bg-canvas" />
                </div>
                <div className="pt-2 border-t border-border-card/60 flex items-center justify-between">
                  <div className="w-16 h-3 rounded-[14px] bg-canvas" />
                  <div className="w-14 h-3 rounded-[14px] bg-canvas" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-card border border-border-card rounded-[18px] h-16 px-4 flex items-center justify-between animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[14px] bg-canvas" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-4 rounded-[14px] bg-canvas" />
                    <div className="w-16 h-3 rounded-[14px] bg-canvas" />
                  </div>
                </div>
                <div className="w-20 h-4 rounded-[14px] bg-canvas" />
                <div className="w-16 h-4 rounded-[14px] bg-canvas" />
              </div>
            ))}
          </div>
        )
      ) : hasError ? (
        <div className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-main">
              {activeTab === 'trades' ? "Couldn't load trades" : "Couldn't load ideas"}
            </h3>
            <p className="text-xs font-normal text-text-muted mt-1">
              There was a problem communicating with the database. Check your network or try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { if (user) fetchData(user.id); }}
            className="mt-2 h-10 px-4 rounded-[18px] bg-card border border-border-card text-text-main text-xs font-medium hover:bg-canvas transition-colors cursor-pointer flex items-center gap-2"
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : activeTab === 'trades' ? (
        filteredTrades.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]">
            <div className="w-12 h-12 rounded-full bg-canvas text-text-muted flex items-center justify-center">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">No trades found</h3>
              <p className="text-xs font-normal text-text-muted mt-1">Log your first closed execution or change current filters</p>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset all filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setSelectedIdeaForTrade(null); setIsTradeModalOpen(true); }}
                className="mt-2 h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Log first trade
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "flex flex-col space-y-3"
          )}>
            {filteredTrades.map((t) => renderItemCard(t, 'trade'))}
          </div>
        )
      ) : (
        filteredIdeas.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]">
            <div className="w-12 h-12 rounded-full bg-canvas text-text-muted flex items-center justify-center">
              <Lightbulb size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">No watchlist ideas</h3>
              <p className="text-xs font-normal text-text-muted mt-1">Record setups you are tracking before entering</p>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset all filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setEditingIdea(null); setIsIdeaModalOpen(true); }}
                className="mt-2 h-11 md:h-10 px-4 rounded-[18px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
              >
                Create first idea
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "flex flex-col space-y-3"
          )}>
            {filteredIdeas.map((i) => renderItemCard(i, 'idea'))}
          </div>
        )
      )}

      {/* 5. Overlays Layer */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => { 
          setIsTradeModalOpen(false); 
          setSelectedIdeaForTrade(null); 
          setEditingTrade(null); 
        }}
        user={user}
        ideas={ideas}
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

      <IdeaModal
        isOpen={isIdeaModalOpen}
        onClose={() => { 
          setIsIdeaModalOpen(false); 
          setEditingIdea(null); 
        }}
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

      {/* Галерея скриншотов */}
      <ImageViewerModal
        isOpen={viewerState.isOpen}
        images={viewerState.images}
        initialIndex={viewerState.index}
        title={viewerState.title}
        onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}