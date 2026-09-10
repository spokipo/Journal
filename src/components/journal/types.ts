import type { SelectOption } from '../ui/Select';
import type { IdeaPayload, IdeaStatus } from '../trade/IdeaModal';

export type { IdeaStatus };

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

export type SortOptionKey = 'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc';
export type ViewMode = 'list' | 'grid';
export type ActiveTab = 'trades' | 'ideas';

export interface TradeStats {
  total: number;
  winRate: number;
  netR: number;
  netPercent: number;
  profitFactor: number;
}

export interface OutcomeCounts {
  tp: number;
  be: number;
  sl: number;
  tpPct: number;
  bePct: number;
  slPct: number;
}

export interface IdeaStats {
  total: number;
  active: number;
  executed: number;
  invalidated: number;
}

export const SORT_OPTIONS: SelectOption[] = [
  { value: 'date_desc', label: 'Date: Newest first' },
  { value: 'date_asc', label: 'Date: Oldest first' },
  { value: 'pnl_desc', label: 'PnL: Highest first' },
  { value: 'pnl_asc', label: 'PnL: Lowest first' },
];

export const IDEA_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active (Monitoring)' },
  { value: 'executed', label: 'Executed (In Trade)' },
  { value: 'invalidated', label: 'Invalidated / Expired' },
];

export const SESSION_LABELS: Record<string, string> = {
  LONDON: 'LDN',
  NEW_YORK: 'NY',
  ASIA: 'ASIA',
  OFF_SESSION: 'OFF',
};

export function getPnlR(t: TradeRecord): number {
  if (t.pnl_r !== null && t.pnl_r !== undefined) return t.pnl_r;
  if (t.outcome === 'TP') return t.rr || 0;
  if (t.outcome === 'SL') return -1;
  return 0;
}

export function getEffectiveIdeaStatus(idea: IdeaRecord, currentTime: number): IdeaStatus {
  const s = String(idea.status || '').toLowerCase();
  if (s === 'executed' || s === 'triggered') return 'executed';
  if (s === 'invalidated' || s === 'cancelled') return 'invalidated';
  if (idea.expires_at && new Date(idea.expires_at).getTime() <= currentTime) return 'expired';
  return 'active';
}

export function formatIdeaRemainingTime(expiresAt: string | null | undefined, currentTime: number): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - currentTime;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m ${secs}s left`;
}

