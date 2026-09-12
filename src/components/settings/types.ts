import type React from 'react';
import { User, Wallet, Globe, Shield } from 'lucide-react';

export type SettingsSectionId = 'profile' | 'accounts' | 'preferences' | 'security';

export interface SectionDefinition {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const SETTINGS_SECTIONS: SectionDefinition[] = [
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

export interface Account {
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

export interface AccountFormState {
  name: string;
  scope: 'personal' | 'prop';
  prop_mode: 'live' | 'challenge' | null;
  currency: string;
  balance: number | string;
  is_default: boolean;
}

export const INITIAL_ACCOUNT_FORM: AccountFormState = {
  name: '',
  scope: 'personal',
  prop_mode: 'challenge',
  currency: 'USD',
  balance: 10000,
  is_default: false,
};

export interface AccountPerformance {
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

export interface AccountStatsTotal {
  currentBalance: number;
  initialBalance: number;
  netPnL: number;
  netPnLPct: number;
  netR: number;
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  beCount: number;
  winRate: number;
  profitFactor: number;
}

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (US)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文 (Simplified)' },
];
