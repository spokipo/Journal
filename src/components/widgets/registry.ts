import type { WidgetDefinition, WidgetSize } from './types';
import { DailyRiskWidget } from './DailyRiskWidget';
import { SessionTrackerWidget } from './SessionTrackerWidget';
import { EquitySparklineWidget } from './EquitySparklineWidget';
import { WinRateWidget } from './WinRateWidget';
import { ProfitFactorWidget } from './ProfitFactorWidget';
import { PnlCombinedWidget } from './PnlCombinedWidget';
import { ActiveIdeasWidget } from './ActiveIdeasWidget';
import { BestSessionWidget } from './BestSessionWidget';
import { WorstSessionWidget } from './WorstSessionWidget';
import { BestSetupWidget } from './BestSetupWidget';
import { WorstSetupWidget } from './WorstSetupWidget';
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
    description: 'Today risk allocation with quick popover limit setting',
    supportedSizes: ['small', 'medium'] as WidgetSize[] 
  },
  bestSession: {
    component: BestSessionWidget,
    name: 'Best Session',
    description: 'Top-performing trading session breakdown and win rate',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  worstSession: {
    component: WorstSessionWidget,
    name: 'Worst Session',
    description: 'Lowest-performing session to monitor risk and leaks',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  bestSetup: {
    component: BestSetupWidget,
    name: 'Best Setup',
    description: 'Highest-performing trading setup and edge metrics',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  worstSetup: {
    component: WorstSetupWidget,
    name: 'Worst Setup',
    description: 'Lowest-performing trading setup needing review',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  activeIdeas: {
    component: ActiveIdeasWidget,
    name: 'Active Ideas',
    description: 'Active trade ideas with quick 1-click trade creation',
    supportedSizes: ['small', 'medium', 'large'] as WidgetSize[]
  },
  sessionTracker: { 
    component: SessionTrackerWidget, 
    name: 'Session Clock', 
    description: 'Active market session (London, NY, Asia, Overlap)',
    supportedSizes: ['small', 'medium', 'large'] as WidgetSize[] 
  },
  economicNews: {
    component: EconomicNewsWidget,
    name: 'Economic Calendar',
    description: 'High-impact market events and countdown timer',
    supportedSizes: ['small', 'medium', 'large'] as WidgetSize[]
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
  // Compatibility entries
  bestWorstSetups: {
    component: BestWorstSetupsWidget,
    name: 'Combined Setups (Legacy)',
    description: 'Top and lowest performing setups combined',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
  bestWorstSessions: {
    component: BestWorstSessionsWidget,
    name: 'Combined Sessions (Legacy)',
    description: 'Session profitability breakdown combined',
    supportedSizes: ['small', 'medium'] as WidgetSize[]
  },
} satisfies Record<string, WidgetDefinition>;

export type WidgetType = keyof typeof WIDGET_REGISTRY;
