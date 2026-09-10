import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  BookMarked, 
  X, 
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Select, type SelectOption } from '../ui/Select';
import { PlaybookModal } from './PlaybookModal';
import { ImageViewerModal } from '../ui/ImageViewerModal';

export interface PlaybookSetup {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  winrate: number;
  total_trades: number;
  is_active: boolean;
  screenshots?: string[];
  created_at?: string;
}

type SortOption = 'winrate_desc' | 'winrate_asc' | 'trades_desc' | 'title_asc';
type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';

const SORT_SELECT_OPTIONS: SelectOption[] = [
  { value: 'winrate_desc', label: 'Win Rate: High-Low' },
  { value: 'winrate_asc', label: 'Win Rate: Low-High' },
  { value: 'trades_desc', label: 'Trades: Most first' },
  { value: 'title_asc', label: 'Name: A-Z' },
];

const STATUS_SELECT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];

// =========================================================================
// SKELETON COMPONENT (§7 Loading State)
// =========================================================================
function PlaybookSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-card border border-border-card rounded-[26px] p-4 min-h-[180px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-card/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-canvas" />
                <div className="w-24 h-4 rounded-[14px] bg-canvas" />
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
    );
  }

  return (
    <div className="flex flex-col space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border-card rounded-[18px] h-16 px-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[14px] bg-canvas" />
            <div className="space-y-1.5">
              <div className="w-28 h-4 rounded-[14px] bg-canvas" />
              <div className="w-16 h-3 rounded-[14px] bg-canvas" />
            </div>
          </div>
          <div className="w-20 h-4 rounded-[14px] bg-canvas" />
          <div className="w-16 h-4 rounded-[14px] bg-canvas" />
        </div>
      ))}
    </div>
  );
}

export function PlaybookView() {
  const [setups, setSetups] = useState<PlaybookSetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Фильтры, сортировка и отображение
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('winrate_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Мобильный anchored popover
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  // Модальные окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<PlaybookSetup | null>(null);

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

  const fetchSetups = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const [playbooksRes, tradesRes] = await Promise.all([
        supabase
          .from('playbooks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('trades')
          .select('id, setup_id, outcome, pnl_r')
          .eq('user_id', userId),
      ]);

      if (playbooksRes.error) throw playbooksRes.error;

      const rawSetups = (playbooksRes.data as PlaybookSetup[]) || [];
      const trades = tradesRes.data || [];

      const tradesBySetup = new Map<string, { total: number; wins: number }>();
      trades.forEach((t) => {
        if (t.setup_id) {
          const entry = tradesBySetup.get(t.setup_id) || { total: 0, wins: 0 };
          entry.total += 1;
          const isWin = t.outcome === 'TP' || (!t.outcome && Number(t.pnl_r) > 0);
          if (isWin) {
            entry.wins += 1;
          }
          tradesBySetup.set(t.setup_id, entry);
        }
      });

      const computedSetups: PlaybookSetup[] = rawSetups.map((setup) => {
        const setupStats = tradesBySetup.get(setup.id) || { total: 0, wins: 0 };
        const total = setupStats.total;
        const winrate = total > 0 ? Math.round((setupStats.wins / total) * 100) : 0;

        return {
          ...setup,
          total_trades: total,
          winrate: winrate,
        };
      });

      setSetups(computedSetups);

      computedSetups.forEach(async (s) => {
        const original = rawSetups.find((r) => r.id === s.id);
        if (original && (Number(original.winrate) !== s.winrate || Number(original.total_trades) !== s.total_trades)) {
          await supabase
            .from('playbooks')
            .update({ winrate: s.winrate, total_trades: s.total_trades })
            .eq('id', s.id)
            .eq('user_id', userId);
        }
      });
    } catch (err) {
      console.error('Fetch error:', err);
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
        fetchSetups(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSetups(session.user.id);
      } else {
        setSetups([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchSetups]);

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

  const handleOpenCreateModal = () => {
    setEditingSetup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (setup: PlaybookSetup) => {
    setEditingSetup(setup);
    setIsModalOpen(true);
  };

  const handleSaveSetup = async (payload: {
    title: string;
    description: string | null;
    winrate: number;
    total_trades: number;
    is_active: boolean;
    screenshots: string[];
  }) => {
    const fullPayload = { ...payload, user_id: user?.id };

    if (editingSetup) {
      if (isSupabaseConfigured && user) {
        await supabase
          .from('playbooks')
          .update(fullPayload)
          .eq('id', editingSetup.id)
          .eq('user_id', user.id);
      }
      setSetups((prev) =>
        prev.map((s) => (s.id === editingSetup.id ? { ...s, ...fullPayload } : s))
      );
    } else {
      let createdId = crypto.randomUUID();
      if (isSupabaseConfigured && user) {
        const { data } = await supabase
          .from('playbooks')
          .insert([fullPayload])
          .select();
        if (data?.[0]) createdId = data[0].id;
      }
      setSetups((prev) => [{ id: createdId, ...fullPayload, created_at: new Date().toISOString() }, ...prev]);
    }
    if (user?.id) {
      fetchSetups(user.id);
    }
  };

  const handleDeleteSetup = async (id: string) => {
    if (isSupabaseConfigured && user) {
      await supabase
        .from('trades')
        .update({ setup_id: null })
        .eq('setup_id', id)
        .eq('user_id', user.id);

      await supabase.from('playbooks').delete().eq('id', id).eq('user_id', user.id);
    }
    setSetups((prev) => prev.filter((s) => s.id !== id));
  };

  const openImageViewer = (images: string[], index = 0, title?: string) => {
    setViewerState({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('winrate_desc');
  };

  const stats = useMemo(() => {
    const total = setups.length;
    if (total === 0) return { total: 0, active: 0, avgWinRate: 0, totalTrades: 0 };

    const active = setups.filter((s) => s.is_active).length;
    const totalTrades = setups.reduce((acc, s) => acc + (s.total_trades || 0), 0);

    let avgWinRate = 0;
    if (totalTrades > 0) {
      const weightedSum = setups.reduce((acc, s) => acc + s.winrate * (s.total_trades || 1), 0);
      const totalWeight = setups.reduce((acc, s) => acc + (s.total_trades || 1), 0);
      avgWinRate = Math.round(weightedSum / totalWeight);
    } else {
      avgWinRate = Math.round(setups.reduce((acc, s) => acc + s.winrate, 0) / total);
    }

    return { total, active, avgWinRate, totalTrades };
  }, [setups]);

  const filteredSetups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return setups
      .filter((s) => {
        const matchesSearch = !q || s.title.toLowerCase().includes(q) || 
          (s.description && s.description.toLowerCase().includes(q));
        const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'active' && s.is_active) || 
          (statusFilter === 'inactive' && !s.is_active);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
        if (sortBy === 'winrate_desc') return b.winrate - a.winrate;
        if (sortBy === 'winrate_asc') return a.winrate - b.winrate;
        if (sortBy === 'trades_desc') return b.total_trades - a.total_trades;
        return 0;
      });
  }, [setups, searchQuery, statusFilter, sortBy]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  const getWinrateColor = (wr: number) => {
    if (wr >= 55) return 'text-emerald-500';
    if (wr >= 45) return 'text-amber-500';
    if (wr > 0) return 'text-rose-500';
    return 'text-text-muted';
  };

  const renderSetupItem = (setup: PlaybookSetup, index: number) => {
    const hasScreenshots = Boolean(setup.screenshots && setup.screenshots.length > 0);
    const screenshots = setup.screenshots || [];
    const staggerDelay = Math.min(index * 0.025, 0.2);

    if (viewMode === 'list') {
      return (
        <motion.div
          key={setup.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => handleOpenEditModal(setup)}
          className="bg-card border border-border-card transition-colors cursor-pointer rounded-[18px] hover:border-blue-500/50"
        >
          {/* Desktop List Row */}
          <div className="hidden md:flex items-center justify-between gap-4 h-16 px-4 w-full">
            <div className="flex items-center gap-2.5 w-64 shrink-0">
              <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <BookMarked size={16} />
              </div>
              <span className="text-sm font-bold text-text-main tracking-tight truncate w-36 shrink-0">
                {setup.title}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0 min-w-[2.25rem] text-center",
                  setup.is_active
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-canvas text-text-muted border border-border-card"
                )}
              >
                {setup.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs text-text-muted truncate max-w-[320px]">
                {setup.description || 'No strategy rules configured'}
              </span>
            </div>

            <div className="w-28 shrink-0 flex flex-col justify-center gap-0.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">Trades</span>
                <span className="font-mono tabular-nums font-semibold text-text-main">
                  {setup.total_trades}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">Created</span>
                <span className="font-mono tabular-nums text-[0.6875rem] text-text-muted">
                  {setup.created_at ? new Date(setup.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>

            <div className="w-24 shrink-0 flex flex-col justify-center items-end text-right">
              <div className={cn("text-sm font-bold font-mono tabular-nums leading-tight", getWinrateColor(setup.winrate))}>
                {setup.winrate}%
              </div>
              <div className="text-[0.6875rem] font-mono tabular-nums text-text-muted leading-tight mt-0.5">
                Win Rate
              </div>
            </div>

            <div className="w-10 shrink-0 flex justify-end">
              {hasScreenshots ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageViewer(screenshots, 0, `${setup.title} Charts`);
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

          {/* Mobile List Row */}
          <div className="flex md:hidden items-center justify-between gap-2.5 w-full px-3 h-[4.5rem] min-h-[4.5rem] max-h-[4.5rem]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <BookMarked size={16} />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <span className="text-sm font-bold text-text-main shrink-0 truncate max-w-[140px]">{setup.title}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0",
                      setup.is_active
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-canvas text-text-muted border border-border-card"
                    )}
                  >
                    {setup.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted truncate">
                  <span className="truncate">{setup.description || 'No strategy rules'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right flex flex-col justify-center">
                <div className={cn("text-sm font-bold font-mono tabular-nums leading-tight", getWinrateColor(setup.winrate))}>
                  {setup.winrate}%
                </div>
                <div className="text-[0.6875rem] text-text-muted font-mono tabular-nums mt-0.5">
                  {setup.total_trades} trades
                </div>
              </div>

              <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                {hasScreenshots ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageViewer(screenshots, 0, `${setup.title} Charts`);
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
        </motion.div>
      );
    }

    // 2. Grid View
    return (
      <motion.div
        key={setup.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => handleOpenEditModal(setup)}
        className="bg-card border border-border-card transition-colors cursor-pointer flex p-4 rounded-[26px] flex-col justify-between min-h-[180px] h-full hover:border-blue-500/50"
      >
        {/* ЯРУС 1: ШАПКА ТИКЕТА */}
        <div className="flex items-center justify-between gap-3 w-full pb-3 border-b border-border-card/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <BookMarked size={16} />
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-sm font-bold tracking-tight text-text-main truncate">{setup.title}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0",
                  setup.is_active
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-canvas text-text-muted border border-border-card"
                )}
              >
                {setup.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex flex-col items-end leading-tight">
              <span className={cn("text-sm font-bold font-mono tabular-nums", getWinrateColor(setup.winrate))}>
                {setup.winrate}%
              </span>
              <span className="text-[0.6875rem] font-mono tabular-nums text-text-muted mt-0.5">
                Win Rate
              </span>
            </div>
          </div>
        </div>

        {/* ЯРУС 2: ТЕЛО ТИКЕТА */}
        <div className="flex items-start justify-between gap-3 my-auto py-2.5 w-full">
          <div className="flex-1 min-w-0 space-y-2">
            {setup.description ? (
              <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-normal">
                {setup.description}
              </p>
            ) : (
              <p className="text-xs text-text-muted/40 italic font-normal">
                No strategy rules configured
              </p>
            )}
          </div>

          {hasScreenshots ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                openImageViewer(screenshots, 0, `${setup.title} Charts`);
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
          ) : (
            <div className="w-16 h-14 rounded-[12px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/20 shrink-0">
              <ImageIcon size={14} />
            </div>
          )}
        </div>

        {/* ЯРУС 3: ФУТЕР ТИКЕТА */}
        <div className="pt-2 border-t border-border-card/60 w-full flex items-center justify-between text-[0.6875rem]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-text-muted">
              <span>Trades</span>
              <span className="font-mono tabular-nums font-semibold text-text-main">{setup.total_trades}</span>
            </div>
            <span className="text-border-card/80">•</span>
            <div className="flex items-center gap-1 text-text-muted">
              <span>Status</span>
              <span className="font-semibold text-text-main">{setup.is_active ? 'Live' : 'Archived'}</span>
            </div>
          </div>
          <div className="font-mono tabular-nums text-text-muted">
            {setup.created_at ? new Date(setup.created_at).toLocaleDateString() : '—'}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-16 w-full max-w-[960px] mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">Playbook</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono tabular-nums bg-blue-500/10 text-blue-500">
              {isLoading ? '—' : setups.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Strategy playbooks, entry rules & setups execution accuracy
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>New Setup</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Setups</span>
          <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main">
            {isLoading ? '—' : stats.total}
          </div>
        </div>

        <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Active</span>
          <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-500">
            {isLoading ? '—' : stats.active}
          </div>
        </div>

        <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Avg Win Rate</span>
          <div className={cn("text-base sm:text-xl font-bold font-mono tabular-nums", getWinrateColor(stats.avgWinRate))}>
            {isLoading ? '—' : `${stats.avgWinRate}%`}
          </div>
        </div>

        <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Total Trades</span>
          <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main">
            {isLoading ? '—' : stats.totalTrades}
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="flex flex-col gap-2 relative z-30 w-full">
        <div className="hidden md:flex items-center justify-between gap-3 w-full">
          <div className="relative w-48 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setups..."
              className="w-full h-9 pl-8 pr-8 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="w-36 shrink-0">
              <Select
                size="sm"
                icon={SlidersHorizontal}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={STATUS_SELECT_OPTIONS}
              />
            </div>

            <div className="w-44 shrink-0">
              <Select
                size="sm"
                icon={ArrowUpDown}
                value={sortBy}
                onChange={(v) => setSortBy(v as SortOption)}
                options={SORT_SELECT_OPTIONS}
              />
            </div>

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
                    layoutId="playbook-view-toggle-mode"
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
                    layoutId="playbook-view-toggle-mode"
                    className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                    transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Toolbar */}
        <div className="flex md:hidden items-center gap-2 w-full relative">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setups..."
              className="w-full h-11 pl-10 pr-8 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative shrink-0" ref={mobileFilterRef}>
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              aria-label="Filter & sort setups"
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
                      Setup Filters
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Status</label>
                    <Select
                      size="md"
                      icon={SlidersHorizontal}
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as StatusFilter)}
                      options={STATUS_SELECT_OPTIONS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Sort By</label>
                    <Select
                      size="md"
                      icon={ArrowUpDown}
                      value={sortBy}
                      onChange={(v) => setSortBy(v as SortOption)}
                      options={SORT_SELECT_OPTIONS}
                    />
                  </div>

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

          <div className="flex p-1 bg-card border border-border-card rounded-[18px] h-11 items-center shrink-0">
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
                  layoutId="playbook-view-toggle-mode-mobile"
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
                  layoutId="playbook-view-toggle-mode-mobile"
                  className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                  transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Активные чипсы фильтрации */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {statusFilter !== 'all' && (
              <div className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1">
                <span>Status: {STATUS_SELECT_OPTIONS.find((o) => o.value === statusFilter)?.label}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {searchQuery && (
              <div className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1">
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
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

      {/* 4. Content Area: Skeleton -> Error -> Empty -> Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="playbook-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <PlaybookSkeleton viewMode={viewMode} />
          </motion.div>
        ) : hasError ? (
          <motion.div
            key="playbook-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">Couldn&apos;t load setups</h3>
              <p className="text-xs font-normal text-text-muted mt-1">
                There was a problem communicating with the database. Check your network or try again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { if (user) fetchSetups(user.id); }}
              className="mt-2 h-10 px-4 rounded-[18px] bg-card border border-border-card text-text-main text-xs font-medium hover:bg-canvas transition-colors cursor-pointer flex items-center gap-2 active:scale-[0.98]"
            >
              <RotateCcw size={14} />
              <span>Retry</span>
            </button>
          </motion.div>
        ) : filteredSetups.length === 0 ? (
          <motion.div
            key="playbook-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]"
          >
            <div className="w-12 h-12 rounded-full bg-canvas text-text-muted flex items-center justify-center">
              <BookMarked size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">
                {searchQuery || statusFilter !== 'all' ? 'No setups found' : 'No setups created yet'}
              </h3>
              <p className="text-xs font-normal text-text-muted mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try changing your search keywords or active filters'
                  : 'Add your strategies to start tracking execution accuracy and win rates'}
              </p>
            </div>
            {searchQuery || statusFilter !== 'all' ? (
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
                onClick={handleOpenCreateModal}
                className="mt-2 h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors cursor-pointer active:scale-[0.98]"
              >
                Create first setup
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`playbook-content-${viewMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col space-y-3"
            )}
          >
            {filteredSetups.map((s, idx) => renderSetupItem(s, idx))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Overlays Layer */}
      <PlaybookModal
        isOpen={isModalOpen}
        editingSetup={editingSetup}
        user={user}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSetup}
        onDelete={handleDeleteSetup}
      />

      <ImageViewerModal
        isOpen={viewerState.isOpen}
        images={viewerState.images}
        imageUrl={viewerState.images[viewerState.index] || null}
        initialIndex={viewerState.index}
        title={viewerState.title}
        onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}