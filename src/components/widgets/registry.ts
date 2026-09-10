import type { WidgetDefinition, WidgetSize } from './types';
import { DailyRiskWidget } from './DailyRiskWidget';
import { SessionTrackerWidget } from './SessionTrackerWidget';
import { EquitySparklineWidget } from './EquitySparklineWidget';
import { WinRateWidget } from './WinRateWidget';
import { ProfitFactorWidget } from './ProfitFactorWidget';
import { PnlCombinedWidget } from './PnlCombinedWidget';
import { ActiveIdeasWidget } from './ActiveIdeasWidget';
import { BestWorstSetupsWidget } from './BestWorstSetupsWidget';
import { BestWorstSessionsWidget } from './BestWorstSessionsWidget';
import { EconomicNewsWidget } from './EconomicNewsWidget';

export const WIDGET_REGISTRY = {
  equitySparkline: { 
    component: EquitySparklineWidget, 
    name: 'Equity Curve', 
    description: 'Current balance, net PnL and equity sparkline',
    supportedSizes: ['small', 'medium', 'large'] as WidgetSize[] 
  },
  pnlCombined: {
    component: PnlCombinedWidget,
    name: 'Net PnL ($ & %)',
    description: 'Real-time profit & loss in both percentage and currency',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  dailyRisk: { 
    component: DailyRiskWidget, 
    name: 'Daily Risk Limit', 
    description: 'Today risk allocation and flip card to set risk limit',
    supportedSizes: ['small', 'medium'] as WidgetSize[] 
  },
  activeIdeas: {
    component: ActiveIdeasWidget,
    name: 'Active Ideas',
    description: 'Active trade ideas with quick 1-click trade creation',
    supportedSizes: ['small', 'medium', 'large'] as WidgetSize[]
  },
  bestWorstSetups: {
    component: BestWorstSetupsWidget,
    name: 'Best & Worst Setups',
    description: 'Top-performing and lowest-performing trading setups',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  bestWorstSessions: {
    component: BestWorstSessionsWidget,
    name: 'Best & Worst Sessions',
    description: 'Session profitability breakdown (LDN, NY, ASIA)',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  sessionTracker: { 
    component: SessionTrackerWidget, 
    name: 'Session Clock', 
    description: 'Active market session (London, NY, Asia, Overlap)',
    supportedSizes: ['small', 'medium'] as WidgetSize[] 
  },
  economicNews: {
    component: EconomicNewsWidget,
    name: 'Economic Calendar',
    description: 'High-impact market events and countdown timer',
    supportedSizes: ['small', 'large'] as WidgetSize[]
  },
  winRate: { 
    component: WinRateWidget, 
    name: 'Win Rate', 
    description: 'Win percentage, win/loss breakdown',
    supportedSizes: ['small', 'medium'] as WidgetSize[] 
  },
  profitFactor: { 
    component: ProfitFactorWidget, 
    name: 'Profit Factor', 
    description: 'Profit factor and average trade expectancy',
    supportedSizes: ['small', 'medium'] as WidgetSize[] 
  },
} satisfies Record<string, WidgetDefinition>;

export type WidgetType = keyof typeof WIDGET_REGISTRY;

