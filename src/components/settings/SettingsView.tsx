import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Plus,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  enrichTradesWithHistoricalData,
  type RawTrade,
  type EnrichedTrade,
} from '../../lib/statsEngine';
import {
  SETTINGS_SECTIONS,
  INITIAL_ACCOUNT_FORM,
  type SettingsSectionId,
  type Account,
  type AccountFormState,
  type AccountPerformance,
  type AccountStatsTotal,
} from './types';
import { ProfileSection } from './ProfileSection';
import { AccountsSection } from './AccountsSection';
import { PreferencesSection } from './PreferencesSection';
import { SecuritySection } from './SecuritySection';
import { AccountModal } from './AccountModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { SettingsNav } from './SettingsNav';

export type { SettingsSectionId };

export function SettingsView() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Responsive state (lg breakpoint = 1024px)
  const [, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Prefers reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // Fast, smooth transitions without layout shifts
  const transitionConfig = useMemo(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    [prefersReducedMotion]
  );

  // Helper to extract section from query param (?section=...)
  const getUrlSection = useCallback((): SettingsSectionId | null => {
    if (typeof window === 'undefined') return null;
    const param = new URLSearchParams(window.location.search).get('section');
    if (
      param === 'profile' ||
      param === 'accounts' ||
      param === 'preferences' ||
      param === 'security'
    ) {
      return param;
    }
    return null;
  }, []);

  // Active section state
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId | null>(() => {
    const fromUrl = getUrlSection();
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return null;
    }
    return 'profile';
  });

  // Track window resize across 1024px breakpoint
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleResize = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches && !activeSectionId) {
        setActiveSectionId('profile');
      }
    };
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, [activeSectionId]);

  // Auth session initialization
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser({
        id: 'local-user',
        email: 'demo@journal.local',
        user_metadata: { nickname: 'Trader' },
      });
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // URL synchronization
  useEffect(() => {
    const handlePopState = () => {
      const sectionFromUrl = getUrlSection();
      if (sectionFromUrl) {
        setActiveSectionId(sectionFromUrl);
      } else {
        if (window.innerWidth < 1024) {
          setActiveSectionId(null);
        } else {
          setActiveSectionId('profile');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('astro:page-load', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('astro:page-load', handlePopState);
    };
  }, [getUrlSection]);

  const handleSelectSection = (id: SettingsSectionId) => {
    setActiveSectionId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', id);
      window.history.pushState({ section: id }, '', url.toString());
    }
  };

  const handleBackToList = () => {
    setActiveSectionId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('section');
      window.history.pushState({}, '', url.toString());
    }
  };

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<RawTrade[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountFormState>(INITIAL_ACCOUNT_FORM);
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);

  const fetchAccounts = useCallback(async (userId?: string) => {
    try {
      setIsAccountsLoading(true);
      let loadedAccounts: Account[] = [];
      let loadedTrades: RawTrade[] = [];

      if (isSupabaseConfigured && userId && userId !== 'local-user') {
        const [accRes, trRes] = await Promise.all([
          supabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', userId)
            .or('is_archived.is.null,is_archived.eq.false')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('trade_date', { ascending: true }),
        ]);

        if (accRes.data && accRes.data.length > 0) loadedAccounts = accRes.data;
        if (trRes.data && trRes.data.length > 0) loadedTrades = trRes.data;
      }

      if (loadedAccounts.length === 0) {
        const cached = localStorage.getItem('trading_accounts_offline');
        if (cached) {
          try {
            const parsed: Account[] = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              loadedAccounts = parsed.filter((a) => !a.is_archived);
            }
          } catch (e) {}
        }
      }

      if (loadedTrades.length === 0) {
        const cachedTrades = localStorage.getItem('trades_offline');
        if (cachedTrades) {
          try {
            const parsed: RawTrade[] = JSON.parse(cachedTrades);
            if (Array.isArray(parsed)) {
              loadedTrades = parsed;
            }
          } catch (e) {}
        }
      }

      setAccounts(loadedAccounts);
      setTrades(loadedTrades);
    } catch (err) {
      console.error('Error fetching accounts and trades:', err);
    } finally {
      setIsAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      fetchAccounts('local-user');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAccounts(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchAccounts(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchAccounts]);

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      ...INITIAL_ACCOUNT_FORM,
      is_default: accounts.length === 0,
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      scope: acc.scope,
      prop_mode: acc.prop_mode || 'challenge',
      currency: acc.currency,
      balance:
        acc.initial_balance !== undefined && acc.initial_balance !== null
          ? acc.initial_balance
          : (acc.balance ?? ''),
      is_default: Boolean(acc.is_default),
    });
    setIsAccountModalOpen(true);
  };

  const handleSetDefaultAccount = async (accId: string) => {
    const target = accounts.find((a) => a.id === accId);
    if (!target) return;
    const willBeDefault = !target.is_default;

    // Optimistic UI update
    const next = accounts.map((a) => ({
      ...a,
      is_default: a.id === accId ? willBeDefault : false,
    }));
    setAccounts(next);
    localStorage.setItem('trading_accounts_offline', JSON.stringify(next));

    // Sync to Supabase if configured and user is logged in
    if (isSupabaseConfigured && user && user.id !== 'local-user') {
      try {
        await supabase
          .from('trading_accounts')
          .update({ is_default: false })
          .eq('user_id', user.id);
        if (willBeDefault) {
          const { error } = await supabase
            .from('trading_accounts')
            .update({ is_default: true })
            .eq('id', accId)
            .eq('user_id', user.id);
          if (error) throw error;
        }
      } catch (err: any) {
        console.error('Failed to sync default account to Supabase:', err);
      }
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccountSubmitting(true);
    try {
      const balanceVal =
        accountForm.balance === '' ? 0 : Number(accountForm.balance) || 0;
      const isDefault = Boolean(accountForm.is_default);
      const userId = user?.id || 'local-user';

      const payload = {
        user_id: userId,
        name: accountForm.name.trim(),
        scope: accountForm.scope,
        prop_mode: accountForm.scope === 'prop' ? accountForm.prop_mode : null,
        currency: accountForm.currency,
        balance: balanceVal,
        current_balance: balanceVal,
        initial_balance: editingAccount
          ? (editingAccount.initial_balance ?? balanceVal)
          : balanceVal,
        is_default: isDefault,
        is_archived: false,
      };

      // Optimistic state & offline sync
      let next: Account[];
      if (editingAccount) {
        next = accounts.map((a) => {
          if (a.id === editingAccount.id) {
            return { ...a, ...payload };
          }
          return isDefault ? { ...a, is_default: false } : a;
        });
      } else {
        const newAcc: Account = {
          id: `acc-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        };
        const existing = isDefault
          ? accounts.map((a) => ({ ...a, is_default: false }))
          : accounts;
        next = [newAcc, ...existing];
      }
      setAccounts(next);
      localStorage.setItem('trading_accounts_offline', JSON.stringify(next));

      // Sync with Supabase if configured and logged in
      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        if (isDefault) {
          await supabase
            .from('trading_accounts')
            .update({ is_default: false })
            .eq('user_id', user.id);
        }

        if (editingAccount) {
          const { error } = await supabase
            .from('trading_accounts')
            .update(payload)
            .eq('id', editingAccount.id)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('trading_accounts').insert([payload]);
          if (error) throw error;
        }
        await fetchAccounts(user.id);
      }

      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      console.error('Failed to save account:', err);
      alert(err.message || 'Failed to save account');
    } finally {
      setIsAccountSubmitting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      setIsDeletingAccount(true);
      const next = accounts.filter((a) => a.id !== accountToDelete.id);
      setAccounts(next);
      localStorage.setItem('trading_accounts_offline', JSON.stringify(next));

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { error } = await supabase
          .from('trading_accounts')
          .update({ is_archived: true })
          .eq('id', accountToDelete.id)
          .eq('user_id', user.id);
        if (error) throw error;
        await fetchAccounts(user.id);
      }
      setAccountToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Performance calculations
  const { accountStatsMap, totalStats } = useMemo(() => {
    const enriched = enrichTradesWithHistoricalData(trades, accounts);
    const statsMap = new Map<string, AccountPerformance>();

    const tradesByAcc = new Map<string, EnrichedTrade[]>();
    enriched.forEach((t) => {
      if (!t.account_id) return;
      const list = tradesByAcc.get(t.account_id) || [];
      list.push(t);
      tradesByAcc.set(t.account_id, list);
    });

    let sumCurrentBalance = 0;
    let sumInitialBalance = 0;
    let sumNetPnL = 0;
    let sumNetR = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalBE = 0;
    let totalTradesCount = 0;
    let grossWinAmt = 0;
    let grossLossAmt = 0;

    accounts.forEach((acc) => {
      const accTrades = tradesByAcc.get(acc.id) || [];
      const initBal = Number(
        acc.initial_balance !== undefined && acc.initial_balance !== null && Number(acc.initial_balance) > 0
          ? acc.initial_balance
          : acc.balance !== undefined && acc.balance !== null && Number(acc.balance) > 0
          ? acc.balance
          : 0
      );

      const tradesCount = accTrades.length;
      let netPnL = 0;
      let netR = 0;
      let wins = 0;
      let losses = 0;
      let be = 0;

      accTrades.forEach((t) => {
        const amt = t.pnl_amount ?? 0;
        netPnL += amt;
        netR += t.pnl_r;
        if (t.outcome === 'TP' || amt > 0) {
          wins++;
          grossWinAmt += amt;
        } else if (t.outcome === 'SL' || amt < 0) {
          losses++;
          grossLossAmt += Math.abs(amt);
        } else {
          be++;
        }
      });

      const currBal = Number((initBal + netPnL).toFixed(2));
      const pnlPct = initBal > 0 ? Number(((netPnL / initBal) * 100).toFixed(2)) : 0;
      const winRate = tradesCount > 0 ? Number(((wins / tradesCount) * 100).toFixed(1)) : 0;

      statsMap.set(acc.id, {
        account: acc,
        initialBalance: initBal,
        currentBalance: currBal,
        netPnL: Number(netPnL.toFixed(2)),
        netPnLPct: pnlPct,
        tradesCount,
        winsCount: wins,
        lossesCount: losses,
        beCount: be,
        winRate,
        netR: Number(netR.toFixed(2)),
      });

      sumCurrentBalance += currBal;
      sumInitialBalance += initBal;
      sumNetPnL += netPnL;
      sumNetR += netR;
      totalWins += wins;
      totalLosses += losses;
      totalBE += be;
      totalTradesCount += tradesCount;
    });

    const totalWinRate = totalTradesCount > 0 ? (totalWins / totalTradesCount) * 100 : 0;
    const totalPnLPct = sumInitialBalance > 0 ? (sumNetPnL / sumInitialBalance) * 100 : 0;
    const profitFactor = grossLossAmt > 0 ? grossWinAmt / grossLossAmt : grossWinAmt > 0 ? 99.9 : 0;

    return {
      accountStatsMap: statsMap,
      totalStats: {
        currentBalance: Number(sumCurrentBalance.toFixed(2)),
        initialBalance: Number(sumInitialBalance.toFixed(2)),
        netPnL: Number(sumNetPnL.toFixed(2)),
        netPnLPct: Number(totalPnLPct.toFixed(2)),
        netR: Number(sumNetR.toFixed(2)),
        tradesCount: totalTradesCount,
        winsCount: totalWins,
        lossesCount: totalLosses,
        beCount: totalBE,
        winRate: Number(totalWinRate.toFixed(1)),
        profitFactor: Number(profitFactor.toFixed(2)),
      } as AccountStatsTotal,
    };
  }, [trades, accounts]);

  const activeSection =
    SETTINGS_SECTIONS.find((s) => s.id === activeSectionId) || SETTINGS_SECTIONS[0];
  const ActiveIcon = activeSection.icon;

  if (isAuthLoading) {
    return (
      <div className="p-12 bg-card border border-border-card rounded-[26px] flex flex-col items-center justify-center text-text-muted space-y-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-xs font-medium">Loading settings...</p>
      </div>
    );
  }

  const renderActiveContent = () => {
    switch (activeSection.id) {
      case 'profile':
        return <ProfileSection user={user} onUserUpdate={setUser} />;
      case 'accounts':
        return (
          <AccountsSection
            accounts={accounts}
            accountStatsMap={accountStatsMap}
            totalStats={totalStats}
            isAccountsLoading={isAccountsLoading}
            onOpenAddAccount={handleOpenAddAccount}
            onOpenEditAccount={handleOpenEditAccount}
            onDeleteAccount={(acc) => setAccountToDelete(acc)}
            onSetDefaultAccount={handleSetDefaultAccount}
          />
        );
      case 'preferences':
        return <PreferencesSection />;
      case 'security':
        return <SecuritySection />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-5 pb-12 w-full max-w-6xl mx-auto">
      {/* ========================================================== */}
      {/* DESKTOP LAYOUT (>= lg): Two-column Nav + Unified L2 Card   */}
      {/* ========================================================== */}
      <div className="hidden lg:flex flex-col space-y-5 w-full">
        {/* Desktop Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">
                Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Preferences
              </span>
            </div>
            <p className="text-text-muted text-xs sm:text-sm mt-0.5">
              Manage your profile, trading accounts, interface preferences, and security
            </p>
          </div>
        </div>

        {/* Desktop Two-Column Layout */}
        <div className="flex items-start gap-6 w-full">
          <SettingsNav
            activeSectionId={activeSection.id}
            onSelectSection={handleSelectSection}
          />

          {/* Right column: Stable L2 content card with fixed min-height */}
          <div className="flex-1 min-w-0 bg-card border border-border-card rounded-[26px] p-7 md:p-8 flex flex-col shadow-xs overflow-hidden min-h-[560px]">
            {/* Card Header inside L2 card */}
            <div className="flex items-center justify-between pb-4 border-b border-border-card gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <ActiveIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-text-main tracking-tight truncate">
                    {activeSection.title}
                  </h2>
                  <span className="text-[0.6875rem] text-text-muted">
                    {activeSection.description}
                  </span>
                </div>
              </div>

              {activeSection.id === 'accounts' && (
                <button
                  type="button"
                  onClick={handleOpenAddAccount}
                  className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Plus size={15} />
                  <span>Add Account</span>
                </button>
              )}
            </div>

            {/* Smooth transition content area without layout collapse */}
            <div className="pt-6 flex-1 flex flex-col">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection.id}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={transitionConfig}
                  className="w-full flex-1 flex flex-col"
                >
                  {renderActiveContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* MOBILE / TABLET LAYOUT (< lg)                              */}
      {/* ========================================================== */}
      <div className="lg:hidden w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {!activeSectionId ? (
            /* SCREEN 1: MOBILE SECTION LIST */
            <motion.div
              key="mobile-settings-list"
              initial={prefersReducedMotion ? { opacity: 1 } : { x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { x: -32, opacity: 0 }}
              transition={transitionConfig}
              className="w-full space-y-5"
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-text-main tracking-tight">
                      Settings
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      Preferences
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">
                    Manage your profile, trading accounts, preferences, and security
                  </p>
                </div>
              </div>

              {/* L1 Disclosure Rows List */}
              <div className="space-y-2">
                {SETTINGS_SECTIONS.map((sec) => {
                  const SecIcon = sec.icon;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className="w-full min-h-11 flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] bg-card border border-border-card hover:bg-canvas active:scale-[0.99] transition-all text-left group select-none cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-canvas border border-border-card flex items-center justify-center text-text-muted group-hover:text-text-main shrink-0">
                          <SecIcon size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-text-main text-sm block truncate">
                            {sec.title}
                          </span>
                          <span className="text-xs text-text-muted block truncate">
                            {sec.description}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-text-muted group-hover:text-text-main shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* SCREEN 2: MOBILE SECTION DETAIL */
            <motion.div
              key={`mobile-settings-detail-${activeSection.id}`}
              initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%', opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { x: '100%', opacity: 1 }}
              transition={transitionConfig}
              className="w-full space-y-4"
            >
              {/* TOP BAR: Back Button (44x44px) + Centered Title + Action (§3 D frosted glass standard) */}
              <div className="sticky -top-4 z-20 -mx-4 px-4 bg-canvas/80 backdrop-blur-xl shrink-0 pt-[env(safe-area-inset-top)]">
                <div className="h-16 flex items-center justify-between relative">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    aria-label="Back to settings list"
                    className="w-11 h-11 min-w-11 min-h-11 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-20">
                    <h2 className="text-base font-semibold text-text-main truncate text-center pointer-events-auto">
                      {activeSection.title}
                    </h2>
                  </div>

                  <div className="min-w-11 min-h-11 flex items-center justify-end shrink-0 z-10">
                    {activeSection.id === 'accounts' ? (
                      <button
                        type="button"
                        onClick={handleOpenAddAccount}
                        aria-label="Add account"
                        className="w-11 h-11 rounded-full bg-blue-500 border border-blue-500 text-white flex items-center justify-center active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <Plus size={18} />
                      </button>
                    ) : (
                      <div className="w-11 h-11" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>

              {/* Section Content Card */}
              <div className="w-full bg-card border border-border-card rounded-[26px] p-5 sm:p-6 shadow-xs flex flex-col space-y-5">
                {renderActiveContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        editingAccount={editingAccount}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        onSave={handleSaveAccount}
        isSubmitting={isAccountSubmitting}
      />

      {/* Delete Account Confirmation Dialog */}
      <DeleteAccountModal
        isOpen={Boolean(accountToDelete)}
        account={accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleConfirmDeleteAccount}
        isDeleting={isDeletingAccount}
      />
    </div>
  );
}