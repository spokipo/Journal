import type { ComponentType } from 'react';
import type { TradingAccount, EnrichedTrade, StatsSummary } from '../../lib/statsEngine';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetProps {
  size: WidgetSize;
  account?: TradingAccount | null;
  accounts?: TradingAccount[];
  totalStartingBalance?: number;
  stats?: StatsSummary | null;
  todayTrades?: EnrichedTrade[];
  allTrades?: EnrichedTrade[];
  currencySymbol?: string;
  ideas?: any[];
  dailyRiskLimit?: number;
  onUpdateDailyRiskLimit?: (newLimit: number) => void;
  onOpenTradeModal?: (idea?: any) => void;
}

export interface WidgetDefinition {
  component: ComponentType<WidgetProps>;
  name: string;
  description: string;
  supportedSizes: WidgetSize[];
}

