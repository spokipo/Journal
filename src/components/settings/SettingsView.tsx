import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Wallet,
  Globe,
  Shield,
  Camera,
  Check,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Building2,
  DollarSign,
  Moon,
  Sun,
  Bell,
  BellOff,
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useTheme } from '../../lib/useTheme';
import { cn } from '../../lib/utils';
import { optimizeImage } from '../../lib/imageOptimizer';
import {
  enrichTradesWithHistoricalData,
  type RawTrade,
  type EnrichedTrade,
} from '../../lib/statsEngine';
import { BaseModal } from '../Modals';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';

// Section IDs and Definitions
export type SettingsSectionId = 'profile' | 'accounts' | 'preferences' | 'security';

interface SectionDefinition {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SETTINGS_SECTIONS: SectionDefinition[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Personal details, avatar, and contact info',
    icon: User,
  },
  {
    id: 'accounts',
    title: 'Trading Accounts',
    description: 'Personal brokers and prop firm accounts',
    icon: Wallet,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Theme appearance, notifications, and language',
    icon: Globe,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password credentials and session access',
    icon: Shield,
  },
];

// Account Interface
interface Account {
  id: string;
  name: string;
  scope: 'personal' | 'prop';
  prop_mode?: 'live' | 'challenge' | null;
  currency: string;
  balance: number;
  initial_balance?: number;
  current_balance?: number;
  is_default?: boolean;
  is_archived?: boolean;
  created_at: string;
}

const INITIAL_ACCOUNT_FORM = {
  name: '',
  scope: 'personal' as 'personal' | 'prop',
  prop_mode: 'challenge' as 'live' | 'challenge' | null,
  currency: 'USD',
  balance: 10000,
  is_default: false,
};

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (US)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文 (Simplified)' },
];

export function SettingsView() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // Responsive state (lg breakpoint = 1024px per design.md §3 Type D)
  const [isDesktop, setIsDesktop] = useState(() => {
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

  const transitionConfig = useMemo(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    [prefersReducedMotion]
  );

  // Animation variants for desktop card transitions per design.md §2 Motion & §5
  const desktopContainerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: prefersReducedMotion
          ? { duration: 0 }
          : {
              staggerChildren: 0.05,
              delayChildren: 0.02,
            },
      },
      exit: {
        opacity: 0,
        transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.12 },
      },
    }),
    [prefersReducedMotion]
  );

  const desktopCardVariants = useMemo(
    () => ({
      hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 },
      show: {
        opacity: 1,
        y: 0,
        transition: prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
      },
      exit: prefersReducedMotion
        ? { opacity: 1 }
        : { opacity: 0, y: -8, transition: { duration: 0.12 } },
    }),
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

  // Handle browser back/forward buttons and Astro transitions (URL synchronization)
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

  // Select section & synchronize query param
  const handleSelectSection = (id: SettingsSectionId) => {
    setActiveSectionId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', id);
      window.history.pushState({ section: id }, '', url.toString());
    }
  };

  // Back to list on mobile (< lg)
  const handleBackToList = () => {
    setActiveSectionId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('section');
      window.history.pushState({}, '', url.toString());
    }
  };

  // ==========================================
  // PROFILE STATE & ACTIONS
  // ==========================================
  const [profileNickname, setProfileNickname] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileNickname(
        user.user_metadata?.nickname || user.user_metadata?.full_name || ''
      );
      setProfileEmail(user.email || '');
      setProfileAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsProfileUpdating(true);
    setProfileMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: profileNickname.trim() || user.user_metadata?.full_name || '',
        },
      });
      if (error) throw error;
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1000);
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.message || 'Failed to update profile',
      });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setIsProfileUpdating(true);
      setProfileMessage(null);

      // 1. Optimize image to WebP (max 512px, high quality)
      let uploadPayload: Blob | File = file;
      let fileExt = file.name.split('.').pop() || 'png';
      let contentType = file.type || 'image/jpeg';
      try {
        uploadPayload = await optimizeImage(file, 512, 0.85);
        fileExt = 'webp';
        contentType = 'image/webp';
      } catch (optErr) {
        console.warn('Avatar optimization fallback to original:', optErr);
      }

      // 2. Upload to user folder in avatars bucket: <user_id>/<timestamp>.<ext>
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadPayload, {
          contentType,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      if (updateData?.user) {
        setUser(updateData.user);
      }
      setProfileAvatarUrl(publicUrl);
      setProfileMessage({ type: 'success', text: 'Avatar updated!' });
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      let errorMsg = err.message || 'Failed to upload avatar';
      if (
        errorMsg.includes('row-level security') ||
        errorMsg.includes('policy') ||
        errorMsg.includes('violates')
      ) {
        errorMsg =
          'Storage permission error (RLS). Please apply the "avatars" bucket migration in your Supabase SQL Editor.';
      }
      setProfileMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsProfileUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==========================================
  // ACCOUNTS STATE & ACTIONS
  // ==========================================
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<RawTrade[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(INITIAL_ACCOUNT_FORM);
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);

  const fetchAccounts = useCallback(async (userId: string) => {
    try {
      setIsAccountsLoading(true);
      if (isSupabaseConfigured) {
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

        if (accRes.error) throw accRes.error;
        setAccounts(accRes.data || []);
        setTrades(trRes.data || []);
      } else {
        const cached = localStorage.getItem('trading_accounts_offline');
        if (cached) {
          try {
            const parsed: Account[] = JSON.parse(cached);
            setAccounts(parsed.filter((a) => !a.is_archived));
          } catch (e) {}
        }
        const cachedTrades = localStorage.getItem('trades_offline');
        if (cachedTrades) {
          try {
            setTrades(JSON.parse(cachedTrades));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error fetching accounts and trades:', err);
    } finally {
      setIsAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAccounts(user.id);
    }
  }, [user, fetchAccounts]);

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
      balance: Number(acc.initial_balance ?? acc.balance) || 0,
      is_default: Boolean(acc.is_default),
    });
    setIsAccountModalOpen(true);
  };

  const handleSetDefaultAccount = async (accId: string) => {
    if (!user) return;
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('trading_accounts')
          .update({ is_default: false })
          .eq('user_id', user.id);
        const { error } = await supabase
          .from('trading_accounts')
          .update({ is_default: true })
          .eq('id', accId)
          .eq('user_id', user.id);
        if (error) throw error;
        await fetchAccounts(user.id);
      } else {
        const next = accounts.map((a) => ({
          ...a,
          is_default: a.id === accId,
        }));
        setAccounts(next);
        localStorage.setItem('trading_accounts_offline', JSON.stringify(next));
      }
    } catch (err: any) {
      console.error('Failed to set default account:', err);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAccountSubmitting(true);
    try {
      const balanceVal = Number(accountForm.balance) || 0;
      const isDefault = Boolean(accountForm.is_default);

      const payload = {
        user_id: user.id,
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

      if (isSupabaseConfigured) {
        // If this account is marked as default, unset existing defaults first
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
      } else {
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
      }

      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save account');
    } finally {
      setIsAccountSubmitting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete || !user) return;
    try {
      setIsDeletingAccount(true);
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('trading_accounts')
          .delete()
          .eq('id', accountToDelete.id)
          .eq('user_id', user.id);
        if (error) {
          // Fallback to soft delete if trades or other tables reference this account
          console.warn('Hard delete failed, falling back to soft delete:', error);
          const { error: archiveError } = await supabase
            .from('trading_accounts')
            .update({ is_archived: true })
            .eq('id', accountToDelete.id)
            .eq('user_id', user.id);
          if (archiveError) throw archiveError;
        }
        await fetchAccounts(user.id);
      } else {
        const next = accounts.filter((a) => a.id !== accountToDelete.id);
        setAccounts(next);
        localStorage.setItem('trading_accounts_offline', JSON.stringify(next));
      }
      setAccountToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // ==========================================
  // PREFERENCES STATE
  // ==========================================
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');

  // ==========================================
  // SECURITY STATE
  // ==========================================
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMessage({
        type: 'error',
        text: 'Password must be at least 6 characters.',
      });
      return;
    }

    setIsPasswordUpdating(true);
    setSecurityMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecurityMessage({
        type: 'success',
        text: 'Password updated successfully!',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({
        type: 'error',
        text: err.message || 'Failed to update password.',
      });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  interface AccountPerformance {
    account: Account;
    initialBalance: number;
    currentBalance: number;
    netPnL: number;
    netPnLPct: number;
    tradesCount: number;
    winsCount: number;
    lossesCount: number;
    beCount: number;
    winRate: number;
    netR: number;
  }

  const { accountStatsMap, totalStats } = useMemo(() => {
    const enriched = enrichTradesWithHistoricalData(trades, accounts);
    const statsMap = new Map<string, AccountPerformance>();

    // Group enriched trades strictly by account id (only for trades assigned to this account)
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
      },
    };
  }, [trades, accounts]);

  const totalBalance = totalStats.currentBalance;
  const personalCount = accounts.filter((a) => a.scope === 'personal').length;
  const propCount = accounts.filter((a) => a.scope === 'prop').length;

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

  // ==========================================
  // RENDER ACTIVE SECTION CONTENT
  // ==========================================
  const renderActiveContent = () => {
    switch (activeSection.id) {
      case 'profile':
        return (
          <motion.div
            variants={desktopContainerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            <motion.div
              variants={desktopCardVariants}
              className="bg-canvas border border-border-card rounded-[18px] p-5 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar circle (Pill) */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-canvas border-2 border-border-card overflow-hidden group">
                    {profileAvatarUrl ? (
                      <img
                        src={profileAvatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-text-muted bg-blue-500/10">
                        {profileNickname?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase() ||
                          'U'}
                      </div>
                    )}
                    {isProfileUpdating && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 rounded-full">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                    <label
                      aria-label="Upload avatar image"
                      className={cn(
                        "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full",
                        isProfileUpdating && "pointer-events-none opacity-0"
                      )}
                    >
                      <Camera size={24} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        disabled={isProfileUpdating}
                      />
                    </label>
                  </div>
                  <span className="text-xs text-text-muted">
                    {isProfileUpdating ? 'Uploading...' : 'Click to change'}
                  </span>
                </div>

                {/* Form Fields */}
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="settings-nickname-input"
                      className="text-xs font-semibold uppercase tracking-wider text-text-muted"
                    >
                      Nickname
                    </label>
                    <input
                      id="settings-nickname-input"
                      type="text"
                      value={profileNickname}
                      onChange={(e) => setProfileNickname(e.target.value)}
                      className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Enter nickname"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="settings-email-input"
                      className="text-xs font-semibold uppercase tracking-wider text-text-muted"
                    >
                      Email
                    </label>
                    <input
                      id="settings-email-input"
                      type="email"
                      value={profileEmail}
                      disabled
                      className="w-full h-11 bg-canvas/50 border border-border-card rounded-[18px] px-4 text-sm text-text-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-text-muted">
                      Email cannot be changed directly. Managed via auth provider.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleUpdateProfile}
                      disabled={isProfileUpdating}
                      className="h-10 px-5 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isProfileUpdating ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      <span>Save Changes</span>
                    </button>

                    {profileMessage && (
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs font-medium",
                          profileMessage.type === 'success'
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        )}
                      >
                        {profileMessage.type === 'success' ? (
                          <CheckCircle2 size={16} className="shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="shrink-0" />
                        )}
                        <span>{profileMessage.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );

      case 'accounts':
        return (
          <motion.div
            variants={desktopContainerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            {/* Metric Cards (L2 Compact) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              <motion.div
                variants={desktopCardVariants}
                className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
              >
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
                  Total
                </span>
                <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-text-main mt-1">
                  {accounts.length}
                </div>
              </motion.div>

              <motion.div
                variants={desktopCardVariants}
                className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
              >
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
                  Balance
                </span>
                <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                  ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </motion.div>

              <motion.div
                variants={desktopCardVariants}
                className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
              >
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
                  Personal
                </span>
                <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-blue-500 mt-1">
                  {personalCount}
                </div>
              </motion.div>

              <motion.div
                variants={desktopCardVariants}
                className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
              >
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
                  Prop Firm
                </span>
                <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1">
                  {propCount}
                </div>
              </motion.div>
            </div>

            {/* Account List */}
            {isAccountsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-[20px] bg-canvas border border-border-card animate-pulse p-4"
                  />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <motion.div
                variants={desktopCardVariants}
                className="py-12 px-4 text-center rounded-[20px] bg-canvas/40 border border-border-card/60 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted mb-3">
                  <Wallet size={24} />
                </div>
                <p className="text-sm font-semibold text-text-main">
                  No trading accounts yet
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                  Add your personal broker accounts or prop firm challenges to track performance.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAccount}
                  className="mt-4 h-10 px-4 flex items-center gap-1.5 bg-blue-500 text-white rounded-[18px] font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add first account</span>
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((acc) => {
                  const stats = accountStatsMap.get(acc.id);
                  const currentBal = stats ? stats.currentBalance : (acc.current_balance ?? acc.balance);
                  const initialBal = stats ? stats.initialBalance : (acc.initial_balance ?? acc.balance);
                  const netPnL = stats ? stats.netPnL : 0;
                  const netPnLPct = stats ? stats.netPnLPct : 0;
                  const tradesCount = stats ? stats.tradesCount : 0;
                  const winRate = stats ? stats.winRate : 0;
                  const netR = stats ? stats.netR : 0;
                  const wins = stats ? stats.winsCount : 0;
                  const losses = stats ? stats.lossesCount : 0;

                  return (
                    <motion.div
                      key={acc.id}
                      variants={desktopCardVariants}
                      className="bg-card border border-border-card rounded-[26px] p-4 flex flex-col justify-between min-h-[170px] h-full transition-all hover:border-blue-500/40 shadow-xs group"
                    >
                      {/* Tier 1: Header (Icon, Name, Badges & Actions) */}
                      <div className="flex items-center justify-between gap-3 w-full pb-3 border-b border-border-card/60">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                              acc.scope === 'personal'
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-amber-500/10 text-amber-500"
                            )}
                          >
                            {acc.scope === 'personal' ? (
                              <Wallet size={16} />
                            ) : (
                              <Building2 size={16} />
                            )}
                          </div>

                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-sm font-bold tracking-tight text-text-main truncate max-w-[130px] sm:max-w-[170px]">
                              {acc.name}
                            </span>
                            {acc.is_default && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                                <Star size={10} className="fill-emerald-500" />
                                <span>Default</span>
                              </span>
                            )}
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0",
                                acc.scope === 'personal'
                                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              )}
                            >
                              {acc.scope}
                            </span>
                            {acc.scope === 'prop' && acc.prop_mode && (
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0",
                                  acc.prop_mode === 'live'
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}
                              >
                                {acc.prop_mode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!acc.is_default && (
                            <button
                              type="button"
                              title="Set as default account"
                              aria-label={`Set ${acc.name} as default account`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefaultAccount(acc.id);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-amber-400 hover:bg-canvas transition-colors cursor-pointer"
                            >
                              <Star size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Edit ${acc.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditAccount(acc);
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${acc.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToDelete(acc);
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Tier 2: Body (Symmetrical Live Balance & Net PnL) */}
                      <div className="flex items-center justify-between gap-3 my-auto py-3 w-full">
                        <div className="flex flex-col justify-center">
                          <span className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold">
                            Current Balance
                          </span>
                          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-text-main mt-0.5 flex items-baseline gap-1.5">
                            <span>${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-xs font-normal text-text-muted font-sans uppercase">{acc.currency}</span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col justify-center items-end">
                          {tradesCount > 0 ? (
                            <>
                              <div className={cn(
                                "text-sm sm:text-base font-bold font-mono tabular-nums leading-tight",
                                netPnL > 0 ? "text-emerald-500" : netPnL < 0 ? "text-rose-500" : "text-text-muted"
                              )}>
                                {netPnL >= 0 ? `+$${netPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(netPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </div>
                              <div className="flex items-center justify-end gap-1 text-[0.6875rem] font-mono tabular-nums mt-0.5">
                                <span className={cn(
                                  netPnLPct > 0 ? "text-emerald-500/90" : netPnLPct < 0 ? "text-rose-500/90" : "text-text-muted"
                                )}>
                                  {netPnLPct >= 0 ? '+' : ''}{netPnLPct.toFixed(1)}%
                                </span>
                                <span className="text-border-card">•</span>
                                <span className={cn(
                                  netR >= 0 ? "text-emerald-500/90" : "text-rose-500/90"
                                )}>
                                  {netR >= 0 ? '+' : ''}{netR.toFixed(1)}R
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-text-muted/50 font-mono italic">
                              No trades yet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tier 3: Footer (Initial Capital & Trade Summary) */}
                      <div className="pt-2.5 border-t border-border-card/60 w-full flex items-center justify-between text-[0.6875rem] text-text-muted">
                        <div className="flex items-center gap-1 text-text-muted">
                          <span>Initial:</span>
                          <span className="font-mono tabular-nums font-semibold text-text-main">
                            ${initialBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          {tradesCount > 0 ? (
                            <>
                              <span className="font-semibold text-text-main">{tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}</span>
                              <span className="text-border-card">•</span>
                              <span className="text-blue-500 font-semibold">{winRate.toFixed(1)}% WR</span>
                              <span className="text-border-card">•</span>
                              <span>
                                <span className="text-emerald-500 font-medium">{wins}W</span>
                                {' / '}
                                <span className="text-rose-500 font-medium">{losses}L</span>
                              </span>
                            </>
                          ) : (
                            <span>0 trades</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );

      case 'preferences':
        return (
          <motion.div
            variants={desktopContainerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-4"
          >
            {/* Theme Row Card */}
            <motion.div
              variants={desktopCardVariants}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
                  {theme === 'dark' ? (
                    <Moon size={18} className="text-blue-500" />
                  ) : (
                    <Sun size={18} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-main">
                    Theme Appearance
                  </div>
                  <div className="text-xs text-text-muted">
                    Switch between dark and light interface mode
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="h-10 px-4 flex items-center justify-center gap-2 bg-card border border-border-card text-text-main rounded-[18px] font-semibold text-xs hover:bg-canvas active:scale-[0.98] transition-all cursor-pointer shrink-0"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={15} className="text-amber-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon size={15} className="text-blue-500" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Notifications Row Card with Switch */}
            <motion.div
              variants={desktopCardVariants}
              className="flex items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
                  {notifications ? (
                    <Bell size={18} className="text-blue-500" />
                  ) : (
                    <BellOff size={18} className="text-text-muted" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-main">
                    Notifications
                  </div>
                  <div className="text-xs text-text-muted">
                    Receive alert notifications and milestone reminders
                  </div>
                </div>
              </div>

              <Switch
                checked={notifications}
                onChange={setNotifications}
                aria-label="Toggle notifications"
              />
            </motion.div>

            {/* Language Row Card with custom Select */}
            <motion.div
              variants={desktopCardVariants}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
                  <Globe size={18} className="text-text-muted" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-main">
                    Interface Language
                  </div>
                  <div className="text-xs text-text-muted">
                    Select your preferred interface display language
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-[190px] shrink-0">
                <Select
                  size="sm"
                  value={language}
                  onChange={(val) => setLanguage(val)}
                  options={LANGUAGE_OPTIONS}
                  className="w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div
            variants={desktopContainerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            {/* Password Form Card */}
            <motion.div
              variants={desktopCardVariants}
              className="space-y-4 bg-canvas border border-border-card rounded-[18px] p-5 sm:p-6"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-main">
                  Change Password
                </h3>
                <p className="text-xs text-text-muted">
                  Update your authentication credentials
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-new-pass"
                    className="text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    New Password
                  </label>
                  <input
                    id="settings-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 bg-card border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-confirm-pass"
                    className="text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="settings-confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 bg-card border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isPasswordUpdating}
                    className="h-10 px-5 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isPasswordUpdating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Key size={15} />
                    )}
                    <span>Update Password</span>
                  </button>

                  {securityMessage && (
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        securityMessage.type === 'success'
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      )}
                    >
                      {securityMessage.type === 'success' ? (
                        <CheckCircle2 size={16} className="shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0" />
                      )}
                      <span>{securityMessage.text}</span>
                    </div>
                  )}
                </div>
              </form>
            </motion.div>

            {/* Session Sign Out Card */}
            <motion.div
              variants={desktopCardVariants}
              className="p-4 bg-canvas border border-border-card rounded-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm font-semibold text-text-main">
                  Sign Out of Account
                </div>
                <div className="text-xs text-text-muted">
                  Terminate your active session on this device
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="h-10 px-4 rounded-[18px] bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:scale-[0.98] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-5 pb-12 w-full">
      {/* ========================================================== */}
      {/* DESKTOP LAYOUT (>= lg): Two-column Nav + Unified L2 Card    */}
      {/* Matches SystemView.tsx exact structure                      */}
      {/* ========================================================== */}
      <div className="hidden lg:flex flex-col space-y-5 w-full">
        {/* Desktop Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
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
          {/* Left column navigation (matches SystemView SectionNav w-[240px]) */}
          <div className="flex flex-col space-y-2 w-[240px] shrink-0">
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Sections ({SETTINGS_SECTIONS.length})
              </span>
            </div>

            <div className="space-y-1">
              {SETTINGS_SECTIONS.map((sec) => {
                const isActive = activeSection.id === sec.id;
                const SecIcon = sec.icon;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec.id)}
                    className={cn(
                      "group relative w-full flex items-center gap-2.5 px-3.5 py-3 rounded-[18px] transition-colors select-none text-left cursor-pointer",
                      isActive
                        ? "text-blue-500 font-medium"
                        : "hover:bg-canvas text-text-main"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-nav-pill"
                        className="absolute inset-0 bg-blue-500/10 rounded-[18px]"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors",
                        isActive
                          ? "bg-blue-500/15 text-blue-500"
                          : "bg-canvas text-text-muted group-hover:text-text-main"
                      )}
                    >
                      <SecIcon size={16} />
                    </div>
                    <span className="relative z-10 truncate text-xs sm:text-sm">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right column: ONE unified L2 content card (matches SystemView) */}
          <div className="flex-1 min-w-0 bg-card border border-border-card rounded-[26px] p-7 md:p-8 flex flex-col shadow-xs overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSection.id}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                transition={transitionConfig}
                className="w-full flex-1 flex flex-col"
              >
                {/* Card Header inside L2 card */}
                <div className="flex items-center justify-between pb-4 border-b border-border-card gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
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
                      className="h-10 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={15} />
                      <span>Add Account</span>
                    </button>
                  )}
                </div>

                {/* Section Content inside card */}
                <div className="pt-6">
                  {renderActiveContent()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* MOBILE / TABLET LAYOUT (< lg)                              */}
      {/* Rule (§3 Type D):                                          */}
      {/* На < lg сначала показывается список разделов (L1-строки с  */}
      {/* disclosure); по выбору раздела список заменяется его        */}
      {/* контентом на полный доступный экран.                        */}
      {/* Mobile drill-down header: заголовок по центру, БЕЗ иконки, */}
      {/* кнопка «Назад» слева, action справа для симметрии.          */}
      {/* Push-навигация: slide-in справа налево, не fade.           */}
      {/* ========================================================== */}
      <div className="lg:hidden w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {!activeSectionId ? (
            /* SCREEN 1: MOBILE SECTION LIST */
            <motion.div
              key="mobile-settings-list"
              initial={prefersReducedMotion ? { opacity: 1 } : { x: -32 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { x: -32 }}
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

              {/* L1 Disclosure Rows List (matches SystemView MobileSectionList) */}
              <div className="space-y-2">
                {SETTINGS_SECTIONS.map((sec) => {
                  const SecIcon = sec.icon;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className="w-full min-h-11 flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] bg-card border border-border-card hover:bg-canvas transition-all text-left group select-none cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-canvas flex items-center justify-center text-text-muted group-hover:text-text-main shrink-0">
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
            /* SCREEN 2: MOBILE SECTION DETAIL (Replaces list on full screen) */
            <motion.div
              key={`mobile-settings-detail-${activeSection.id}`}
              initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
              transition={transitionConfig}
              className="w-full space-y-4"
            >
              {/* TOP BAR: Circular Back Button (>=44x44px) + Centered Section Title (NO icon) + Action */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Back to settings list"
                  className="w-11 h-11 min-w-11 min-h-11 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Centered Section Title (NO icon, text-base font-semibold) */}
                <div className="flex-1 min-w-0 text-center px-1">
                  <h2 className="text-base font-semibold text-text-main truncate text-center">
                    {activeSection.title}
                  </h2>
                </div>

                {/* Right Action slot (symmetrical with back button) */}
                <div className="min-w-11 min-h-11 flex items-center justify-end shrink-0">
                  {activeSection.id === 'accounts' ? (
                    <button
                      type="button"
                      onClick={handleOpenAddAccount}
                      aria-label="Add account"
                      className="min-h-11 min-w-11 h-11 px-3.5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  ) : (
                    <div className="w-11 h-11" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Section Content: Full available screen L2 Container Card */}
              <div className="w-full bg-card border border-border-card rounded-[26px] p-5 sm:p-6 shadow-xs flex flex-col space-y-5">
                {renderActiveContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit Account Modal */}
      <BaseModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        size="md"
        hideFooter
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="modal-account-name"
              className="text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Account Name
            </label>
            <input
              id="modal-account-name"
              type="text"
              value={accountForm.name}
              onChange={(e) =>
                setAccountForm({ ...accountForm, name: e.target.value })
              }
              className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="e.g. FTMO 100k Live"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Account Scope
              </label>
              <Select
                size="sm"
                value={accountForm.scope}
                onChange={(v) =>
                  setAccountForm({
                    ...accountForm,
                    scope: v as 'personal' | 'prop',
                  })
                }
                options={[
                  { value: 'personal', label: 'Personal Broker' },
                  { value: 'prop', label: 'Prop Firm' },
                ]}
                className="w-full"
              />
            </div>

            {accountForm.scope === 'prop' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Prop Mode
                </label>
                <Select
                  size="sm"
                  value={accountForm.prop_mode || 'challenge'}
                  onChange={(v) =>
                    setAccountForm({
                      ...accountForm,
                      prop_mode: v as 'live' | 'challenge',
                    })
                  }
                  options={[
                    { value: 'challenge', label: 'Challenge / Evaluation' },
                    { value: 'live', label: 'Funded / Live' },
                  ]}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Currency
                </label>
                <Select
                  size="sm"
                  value={accountForm.currency}
                  onChange={(v) => setAccountForm({ ...accountForm, currency: v })}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'JPY', label: 'JPY (¥)' },
                  ]}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accountForm.scope === 'prop' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Currency
                </label>
                <Select
                  size="sm"
                  value={accountForm.currency}
                  onChange={(v) => setAccountForm({ ...accountForm, currency: v })}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'JPY', label: 'JPY (¥)' },
                  ]}
                  className="w-full"
                />
              </div>
            )}

            <div className={cn("space-y-1.5", accountForm.scope !== 'prop' && "sm:col-span-2")}>
              <label
                htmlFor="modal-account-balance"
                className="text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                Initial / Starting Capital
              </label>
              <input
                id="modal-account-balance"
                type="number"
                step="0.01"
                min="0"
                value={accountForm.balance}
                onChange={(e) =>
                  setAccountForm({
                    ...accountForm,
                    balance: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm font-mono tabular-nums text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Default Account Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-[18px] bg-canvas border border-border-card">
            <div>
              <div className="text-xs font-semibold text-text-main">
                Default Account
              </div>
              <div className="text-[0.6875rem] text-text-muted">
                Automatically selected when creating new trades in the journal
              </div>
            </div>
            <Switch
              checked={accountForm.is_default}
              onCheckedChange={(checked) =>
                setAccountForm({ ...accountForm, is_default: checked })
              }
              aria-label="Set as default account"
            />
          </div>

          <div className="pt-4 border-t border-border-card flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(false)}
              className="w-full sm:w-auto h-11 md:h-10 px-5 flex items-center justify-center bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAccountSubmitting}
              className="w-full sm:w-auto h-11 md:h-10 px-6 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isAccountSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              <span>{editingAccount ? 'Save Changes' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Account Confirmation Dialog (§5 Confirm Dialog) */}
      {accountToDelete && (
        <BaseModal
          isOpen={Boolean(accountToDelete)}
          onClose={() => setAccountToDelete(null)}
          title="Delete Account"
          size="sm"
          hideFooter
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-main">
                  Delete &ldquo;{accountToDelete.name}&rdquo;?
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  This will remove this trading account and its linked balance. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                disabled={isDeletingAccount}
                className="h-11 md:h-10 px-4 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="h-11 md:h-10 px-4 rounded-[18px] bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
