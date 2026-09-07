// src/components/SettingsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Camera,
  X,
  Plus,
  Trash2,
  Edit,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  Wallet,
  TrendingUp,
  DollarSign,
  Moon,
  Sun,
  Bell,
  BellOff,
  Shield,
  Key,
  Globe,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/useTheme';
import { BaseModal } from './Modals';
import { Select } from './ui/Select'; // импортируем кастомный Select

// Types
interface Account {
  id: string;
  name: string;
  type: 'real' | 'demo' | 'paper';
  scope: 'personal' | 'prop';
  prop_mode?: 'live' | 'challenge' | null;
  currency: string;
  balance: number;
  created_at: string;
}

type SettingsTab = 'profile' | 'accounts' | 'preferences' | 'security';

export function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 size={32} className="animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5 pb-12 w-full">
      {/* Верхний хедер */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {activeTab}
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Manage your profile, accounts, preferences and security
          </p>
        </div>
      </div>

      {/* Тулбар с вкладками (пилюлями) */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 bg-card border border-border-card rounded-[20px] p-2">
        <div className="relative flex p-1 bg-canvas border border-border-card rounded-[16px] w-full sm:w-fit overflow-x-auto custom-scrollbar shrink-0">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'accounts', label: 'Accounts', icon: Wallet },
            { id: 'preferences', label: 'Preferences', icon: Globe },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "relative z-10 h-8 px-5 rounded-[12px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
                  isActive ? "text-white" : "text-text-muted hover:text-text-main"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-blue-500 rounded-[12px] shadow-sm -z-10"
                  />
                )}
                <tab.icon size={14} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент текущей вкладки */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'accounts' && <AccountsTab user={user} />}
          {activeTab === 'preferences' && <PreferencesTab theme={theme} toggleTheme={toggleTheme} />}
          {activeTab === 'security' && <SecurityTab user={user} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---- Profile Tab (без изменений) ----
function ProfileTab({ user }: { user: any }) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setNickname(user.user_metadata?.nickname || user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: nickname.trim() || user.user_metadata?.full_name || '' },
      });
      if (error) throw error;
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setIsUpdating(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      setUpdateMessage({ type: 'success', text: 'Avatar updated!' });
    } catch (err: any) {
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
    } finally {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-6 shadow-sm">
      <h2 className="text-xl font-bold text-text-main mb-6">Profile Settings</h2>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-28 h-28 rounded-full bg-canvas border-2 border-border-card overflow-hidden group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-text-muted bg-blue-500/10">
                {nickname?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full">
              <Camera size={28} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                disabled={isUpdating}
              />
            </label>
          </div>
          <span className="text-xs text-text-muted">Click to change avatar</span>
        </div>
        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Enter nickname"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-11 bg-canvas/50 border border-border-card rounded-[18px] px-4 text-sm text-text-muted cursor-not-allowed"
            />
            <p className="text-xs text-text-muted">Email cannot be changed here. Contact support.</p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="h-11 px-6 flex items-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Save Changes
            </button>
            {updateMessage && (
              <div className={cn(
                "flex items-center gap-2 text-sm font-medium",
                updateMessage.type === 'success' ? 'text-green-500' : 'text-red-500'
              )}>
                {updateMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {updateMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Accounts Tab (с кастомными Select) ----
function AccountsTab({ user }: { user: any }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'real' as 'real' | 'demo' | 'paper',
    scope: 'personal' as 'personal' | 'prop',
    prop_mode: 'challenge' as 'live' | 'challenge' | null,
    currency: 'USD',
    balance: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && isSupabaseConfigured) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        name: form.name,
        type: form.type,
        scope: form.scope,
        prop_mode: form.scope === 'prop' ? form.prop_mode : null,
        currency: form.currency,
        balance: form.balance,
      };
      let error;
      if (editingAccount) {
        const { error: err } = await supabase
          .from('trading_accounts')
          .update(payload)
          .eq('id', editingAccount.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('trading_accounts').insert([payload]);
        error = err;
      }
      if (error) throw error;
      await fetchAccounts();
      setIsModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    try {
      const { error } = await supabase.from('trading_accounts').delete().eq('id', id);
      if (error) throw error;
      await fetchAccounts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'real': return <TrendingUp size={18} className="text-green-500" />;
      case 'demo': return <Building2 size={18} className="text-blue-500" />;
      case 'paper': return <Wallet size={18} className="text-yellow-500" />;
      default: return <Wallet size={18} />;
    }
  };

  const getTypeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const personalCount = accounts.filter(a => a.scope === 'personal').length;
  const propCount = accounts.filter(a => a.scope === 'prop').length;

  return (
    <div className="space-y-5">
      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
          <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Total</span>
          <div className="text-sm md:text-2xl font-bold font-mono text-text-main md:mt-1">{accounts.length}</div>
        </div>
        <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
          <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Balance</span>
          <div className="text-sm md:text-2xl font-bold font-mono text-emerald-500 md:mt-1">
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
          <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Personal</span>
          <div className="text-sm md:text-2xl font-bold font-mono text-blue-500 md:mt-1">{personalCount}</div>
        </div>
        <div className="flex flex-row items-baseline justify-between md:flex-col md:justify-center px-4 py-2.5 md:p-5 bg-card border border-border-card rounded-[16px] md:rounded-[26px] shadow-sm">
          <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate mr-2">Prop</span>
          <div className="text-sm md:text-2xl font-bold font-mono text-purple-500 md:mt-1">{propCount}</div>
        </div>
      </div>

      {/* Список счетов */}
      <div className="bg-card border border-border-card rounded-[26px] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main">Trading Accounts</h2>
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setForm({ name: '', type: 'real', scope: 'personal', prop_mode: 'challenge', currency: 'USD', balance: 0 });
              setIsModalOpen(true);
            }}
            className="h-10 px-4 flex items-center gap-2 bg-blue-500 text-white rounded-[18px] font-medium text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20"
          >
            <Plus size={18} />
            Add Account
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={32} className="animate-spin text-text-muted" /></div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Wallet size={48} className="mx-auto text-text-muted/40 mb-3" />
            <p className="text-sm">No trading accounts yet</p>
            <p className="text-xs">Add your first account to start tracking</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-canvas border border-border-card rounded-[20px] p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-text-main text-sm flex items-center gap-2 flex-wrap">
                      {acc.name}
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                        acc.scope === 'personal' 
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      )}>
                        {acc.scope}
                      </span>
                      {acc.scope === 'prop' && acc.prop_mode && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                          acc.prop_mode === 'live' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {acc.prop_mode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{getTypeLabel(acc.type)}</span>
                      <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                      <span className="flex items-center gap-0.5">
                        <DollarSign size={11} />
                        {acc.balance.toFixed(2)} {acc.currency}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(acc);
                      setForm({ 
                        name: acc.name, 
                        type: acc.type, 
                        scope: acc.scope, 
                        prop_mode: acc.prop_mode || 'challenge',
                        currency: acc.currency, 
                        balance: acc.balance 
                      });
                      setIsModalOpen(true);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(acc.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалка с кастомными Select */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        hideFooter={true}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="e.g. Main Real"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Type</label>
              <Select
                size="sm"
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v as any })}
                options={[
                  { value: 'real', label: 'Real' },
                  { value: 'demo', label: 'Demo' },
                  { value: 'paper', label: 'Paper' },
                ]}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Scope</label>
              <Select
                size="sm"
                value={form.scope}
                onChange={(v) => setForm({ ...form, scope: v as 'personal' | 'prop' })}
                options={[
                  { value: 'personal', label: 'Personal' },
                  { value: 'prop', label: 'Prop' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          {form.scope === 'prop' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Prop Mode</label>
              <Select
                size="sm"
                value={form.prop_mode || 'challenge'}
                onChange={(v) => setForm({ ...form, prop_mode: v as 'live' | 'challenge' })}
                options={[
                  { value: 'challenge', label: 'Challenge' },
                  { value: 'live', label: 'Live' },
                ]}
                className="w-full"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Currency</label>
              <Select
                size="sm"
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'JPY', label: 'JPY' },
                ]}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Balance</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border-card flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto h-11 px-6 flex items-center justify-center bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] font-medium text-sm active:scale-[0.98] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 px-6 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {editingAccount ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}

// ---- Preferences Tab (без изменений) ----
function PreferencesTab({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-text-main">Preferences</h2>

      <div className="flex items-center justify-between p-4 bg-canvas border border-border-card rounded-[20px]">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? <Moon size={20} className="text-blue-500" /> : <Sun size={20} className="text-yellow-500" />}
          <div>
            <div className="font-medium text-text-main text-sm">Theme</div>
            <div className="text-xs text-text-muted">Switch between light and dark mode</div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="h-10 px-4 flex items-center gap-2 bg-card border border-border-card text-text-main rounded-[18px] font-medium text-sm hover:bg-canvas active:scale-[0.98] transition-all"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} />
              Light
            </>
          ) : (
            <>
              <Moon size={16} />
              Dark
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-canvas border border-border-card rounded-[20px]">
        <div className="flex items-center gap-3">
          {notifications ? <Bell size={20} className="text-blue-500" /> : <BellOff size={20} className="text-text-muted" />}
          <div>
            <div className="font-medium text-text-main text-sm">Notifications</div>
            <div className="text-xs text-text-muted">Receive alerts and updates</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNotifications(!notifications)}
          className={cn(
            "w-12 h-7 rounded-full transition-colors relative",
            notifications ? "bg-blue-500" : "bg-border-card"
          )}
        >
          <div className={cn(
            "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
            notifications ? "right-1" : "left-1"
          )} />
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-canvas border border-border-card rounded-[20px]">
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-text-muted" />
          <div>
            <div className="font-medium text-text-main text-sm">Language</div>
            <div className="text-xs text-text-muted">Interface language</div>
          </div>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-10 px-3 bg-card border border-border-card rounded-[18px] text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="zh">中文</option>
        </select>
      </div>
    </div>
  );
}

// ---- Security Tab (без изменений) ----
function SecurityTab({ user }: { user: any }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setIsUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-text-main">Security</h2>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Enter new password"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Confirm new password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isUpdating}
          className="h-11 px-6 flex items-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
        >
          {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
          Update Password
        </button>
        {message && (
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium",
            message.type === 'success' ? 'text-green-500' : 'text-red-500'
          )}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}
      </form>
      <div className="pt-4 border-t border-border-card">
        <button
          type="button"
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium text-sm hover:bg-red-500/10 px-4 py-2 rounded-[18px] transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}