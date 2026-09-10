import React from 'react';
import {
  BookOpen,
  Shield,
  Target,
  Zap,
  TrendingUp,
  ListChecks,
  Scale,
  Flame,
  Activity,
  FileText,
  Brain,
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cpu,
  Layers,
  Lock,
  PieChart,
  Bookmark,
  Sparkles,
  Lightbulb,
  Sliders,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

export interface SystemSection {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const SYSTEM_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Shield,
  Target,
  Zap,
  TrendingUp,
  ListChecks,
  Scale,
  Flame,
  Activity,
  FileText,
  Brain,
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cpu,
  Layers,
  Lock,
  PieChart,
  Bookmark,
  Sparkles,
  Lightbulb,
  Sliders,
  BarChart3,
};

export function getSectionIcon(name: string): LucideIcon {
  return SYSTEM_ICONS[name] || SYSTEM_ICONS.BookOpen;
}

export const DEFAULT_SYSTEM_SECTIONS: Array<{
  title: string;
  icon: string;
  content: string;
}> = [
  {
    title: 'Trading Rules',
    icon: 'Shield',
    content: `<h2>Core Trading Rules</h2><p>Establish strict, non-negotiable principles before opening any position:</p><ul><li><strong>Never trade without an invalidation level:</strong> Know exactly where your setup is disproven before clicking enter.</li><li><strong>Capital Preservation First:</strong> Never risk more than 1% to 2% of total equity on any single execution.</li><li><strong>Wait for the session open:</strong> No impulse trades during low-liquidity transition hours.</li><li><strong>No revenge trading:</strong> After 2 consecutive losses in a session, close terminal for 2 hours minimum.</li></ul><blockquote><p>“The goal of a successful trader is to make the best trades. Money is secondary.” — Alexander Elder</p></blockquote>`,
  },
  {
    title: 'Risk Management',
    icon: 'Scale',
    content: `<h2>Risk & Capital Allocation</h2><p>Risk parameters applied systematically across personal and prop accounts:</p><ul><li><strong>Max Daily Drawdown:</strong> -3% of starting daily balance. Trading stops immediately upon reaching limit.</li><li><strong>Minimum R:R Ratio:</strong> 1:2.0 for standard intraday setups, 1:3.0+ for swing runners.</li><li><strong>Position Sizing Formula:</strong> <code>Risk Amount ($) / (Entry - StopLoss) = Contract / Lot Size</code></li><li><strong>Trailing Rules:</strong> Move stop loss to breakeven once price achieves 1R and breaks key structure.</li></ul>`,
  },
  {
    title: 'Daily Routine',
    icon: 'Clock',
    content: `<h2>Pre-Market & Post-Market Routine</h2><h3>1. Pre-Market (30 mins before London / NY Open)</h3><ul><li>Review high-impact macroeconomic news releases (CPI, FOMC, NFP).</li><li>Mark previous day high (PDH), low (PDL), and Asian session ranges.</li><li>Identify institutional liquidity pools and order blocks on higher timeframes (4H/1H).</li><li>Formulate 1-2 conditional trade hypotheses in the Ideas tab.</li></ul><h3>2. Post-Market Review</h3><ul><li>Log all executed trades with execution screenshots into the Journal.</li><li>Check adherence to checklist and tag psychological mistakes if applicable.</li></ul>`,
  },
  {
    title: 'Strategy Checklist',
    icon: 'ListChecks',
    content: `<h2>High-Probability Setup Checklist</h2><p>Confirm every condition before submitting any order:</p><ul><li>[ ] Higher timeframe trend or liquidity raid confirmed (4H / 1H).</li><li>[ ] Market structure shift (MSS) with displacement on 5m / 15m.</li><li>[ ] Entry into fair value gap (FVG) or optimal trade entry (OTE 0.62-0.79).</li><li>[ ] Clear target with logical liquidity (Equal highs/lows, opposing session extremes).</li><li>[ ] Risk-to-reward ratio meets or exceeds 1:2.0.</li><li>[ ] Account limits checked — no pending news embargo within 15 minutes.</li></ul>`,
  },
];

