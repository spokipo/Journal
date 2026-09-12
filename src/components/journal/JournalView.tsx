import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { lockBodyScroll } from '../../lib/scrollLock';
import type { SelectOption } from '../ui/Select';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { TradeModal } from '../trade/TradeModal';
import { IdeaModal, type IdeaPayload } from '../trade/IdeaModal';

import {
  type TradeRecord,
  type IdeaRecord,
  type ActiveTab,
  type ViewMode,
  type SortOptionKey,
  getPnlR,
  getEffectiveIdeaStatus,
} from './types';
import { ListSkeleton } from './JournalSkeletons';
import { JournalHeader } from './JournalHeader';
import { JournalMetrics } from './JournalMetrics';
import { JournalToolbar } from './JournalToolbar';
import { JournalItemCard } from './JournalItemCard';
import { JournalEmptyState } from './JournalEmptyState';
import { JournalErrorState } from './JournalErrorState';

export type { TradeRecord, IdeaRecord } from './types';

export function JournalView() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('trades');
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
  const [sortBy, setSortBy] = useState<SortOptionKey>('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Очистка лока скролла при размонтировании компонента
  useEffect(() => {
    return () => {
      transitionLockRelease.current?.();
      transitionLockRelease.current = null;
    };
  }, []);

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
  }, [trades, searchQuery, selectedAccounts, selectedOutcomes, selectedSessions, selectedSetups, selectedMistakes, sortBy, playbooks]);

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
  }, [ideas, searchQuery, selectedIdeaStatus, now]);

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
  }, [filteredTrades]);

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
  }, [ideas, now]);

  const openImageViewer = (images: string[], index: number, title?: string) => {
    setViewerState({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-16 w-full max-w-[960px] mx-auto">
      {/* 1. Page Header (Band reveal §3.1) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <JournalHeader
          activeTab={activeTab}
          totalCount={activeTab === 'trades' ? trades.length : ideas.length}
          isLoading={isLoading}
          onNewIdea={() => {
            setEditingIdea(null);
            setIsIdeaModalOpen(true);
          }}
          onLogTrade={() => {
            setSelectedIdeaForTrade(null);
            setIsTradeModalOpen(true);
          }}
        />
      </motion.div>

      {/* 2. Metrics (Band reveal со сдвигом §3.1) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
      >
        <JournalMetrics
          isLoading={isLoading}
          activeTab={activeTab}
          stats={stats}
          outcomeCounts={outcomeCounts}
          ideaStats={ideaStats}
          showOutcomeBreakdown={showOutcomeBreakdown}
          onToggleOutcomeBreakdown={() => setShowOutcomeBreakdown((prev) => !prev)}
        />
      </motion.div>

      {/* 3. Toolbar (Band reveal chrome §3.1) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <JournalToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedIdeaStatus={selectedIdeaStatus}
          onIdeaStatusChange={setSelectedIdeaStatus}
          filterSelectOptions={filterSelectOptions}
          selectedFilterValues={selectedFilterValues}
          onFilterChange={handleFilterChange}
          activeFilterCount={activeFilterCount}
          resetFilters={resetFilters}
          removeFilter={removeFilter}
          selectedAccounts={selectedAccounts}
          selectedOutcomes={selectedOutcomes}
          selectedSessions={selectedSessions}
          selectedSetups={selectedSetups}
          selectedMistakes={selectedMistakes}
          accountsMap={accountsMap}
          playbooks={playbooks}
          mistakes={mistakes}
        />
      </motion.div>

      {/* 4. Content Area (Item-stagger внутри карточек, AnimatePresence для смены состояний) */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="journal-list-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <ListSkeleton viewMode={viewMode} />
          </motion.div>
        ) : hasError ? (
          <JournalErrorState
            activeTab={activeTab}
            onRetry={() => {
              if (user) fetchData(user.id);
            }}
          />
        ) : activeTab === 'trades' ? (
          filteredTrades.length === 0 ? (
            <JournalEmptyState
              activeTab="trades"
              activeFilterCount={activeFilterCount}
              onResetFilters={resetFilters}
              onAction={() => {
                setSelectedIdeaForTrade(null);
                setIsTradeModalOpen(true);
              }}
            />
          ) : (
            <motion.div
              key="journal-trades-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                  : "flex flex-col gap-3"
              )}
            >
              {filteredTrades.map((t, idx) => (
                <JournalItemCard
                  key={t.id}
                  item={t}
                  type="trade"
                  index={idx}
                  viewMode={viewMode}
                  now={now}
                  playbooks={playbooks}
                  mistakes={mistakes}
                  onClick={() => {
                    setEditingTrade(t);
                    setIsTradeModalOpen(true);
                  }}
                  onImageClick={openImageViewer}
                />
              ))}
            </motion.div>
          )
        ) : (
          filteredIdeas.length === 0 ? (
            <JournalEmptyState
              activeTab="ideas"
              activeFilterCount={activeFilterCount}
              onResetFilters={resetFilters}
              onAction={() => {
                setEditingIdea(null);
                setIsIdeaModalOpen(true);
              }}
            />
          ) : (
            <motion.div
              key="journal-ideas-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                  : "flex flex-col gap-3"
              )}
            >
              {filteredIdeas.map((i, idx) => (
                <JournalItemCard
                  key={i.id}
                  item={i}
                  type="idea"
                  index={idx}
                  viewMode={viewMode}
                  now={now}
                  playbooks={playbooks}
                  mistakes={mistakes}
                  onClick={() => {
                    setEditingIdea(i);
                    setIsIdeaModalOpen(true);
                  }}
                  onImageClick={openImageViewer}
                />
              ))}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* 5. Overlays Layer (§1 App Shell) */}
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
        onSuccess={() => {
          if (user) fetchData(user.id);
        }}
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
        onSuccess={() => {
          if (user) fetchData(user.id);
        }}
        onDelete={handleDeleteIdea}
        onConvertToTrade={(idea) => {
          setIsIdeaModalOpen(false);
          setSelectedIdeaForTrade(idea);
          transitionLockRelease.current = lockBodyScroll();
          setTimeout(() => {
            setIsTradeModalOpen(true);
            transitionLockRelease.current?.();
            transitionLockRelease.current = null;
          }, 200);
        }}
      />

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