import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, 
  X, 
  Plus, 
  Activity, 
  Clock, 
  TrendingUp, 
  Zap, 
  Award, 
  GripHorizontal, 
  Wallet, 
  RotateCcw, 
  Layers,
  Lightbulb,
  Target,
  Globe,
  DollarSign,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { WIDGET_REGISTRY, type WidgetSize, type WidgetProps } from './widgets';
import { cn } from '../lib/utils';
import { BaseModal } from './Modals';
import { TradeModal } from './trade/TradeModal';
import { Select, type SelectOption } from './ui/Select';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  enrichTradesWithHistoricalData, 
  calculateStatistics, 
  type TradingAccount, 
  type RawTrade, 
  type StatsSummary 
} from '../lib/statsEngine';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WidgetInstance {
  id: string;
  type: keyof typeof WIDGET_REGISTRY;
  size: WidgetSize;
}

const INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'w1', type: 'equitySparkline', size: 'medium' },
  { id: 'w2', type: 'pnlCombined', size: 'small' },
  { id: 'w3', type: 'dailyRisk', size: 'small' },
  { id: 'w4', type: 'sessionTracker', size: 'small' },
  { id: 'w5', type: 'economicNews', size: 'small' },
  { id: 'w6', type: 'winRate', size: 'small' },
  { id: 'w7', type: 'profitFactor', size: 'small' },
  { id: 'w8', type: 'bestSession', size: 'small' },
  { id: 'w9', type: 'worstSession', size: 'small' },
  { id: 'w10', type: 'bestSetup', size: 'small' },
  { id: 'w11', type: 'worstSetup', size: 'small' },
  { id: 'w12', type: 'activeIdeas', size: 'medium' },
  { id: 'w13', type: 'equitySparkline', size: 'large' },
];

function getInitialLayout(): WidgetInstance[] {
  if (typeof window === 'undefined') return INITIAL_LAYOUT;
  const savedLayout = localStorage.getItem('widgetLayout_v5');
  if (savedLayout) {
    try {
      const parsed = JSON.parse(savedLayout);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed
          .filter(w => Boolean(WIDGET_REGISTRY[w.type as keyof typeof WIDGET_REGISTRY]))
          .map(w => {
            const entry = WIDGET_REGISTRY[w.type as keyof typeof WIDGET_REGISTRY];
            if (!entry.supportedSizes.includes(w.size)) {
              return { ...w, size: entry.supportedSizes[0] };
            }
            return w;
          });
        if (valid.length > 0) return valid;
      }
    } catch (e) {
      console.error('Failed to parse saved dashboard layout v5', e);
    }
  }

  const legacyLayout = localStorage.getItem('widgetLayout_v4');
  if (legacyLayout) {
    try {
      const parsed = JSON.parse(legacyLayout);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated: WidgetInstance[] = [];
        for (const item of parsed) {
          if (item.type === 'bestWorstSessions') {
            migrated.push({ id: `${item.id}_best`, type: 'bestSession', size: 'small' });
            migrated.push({ id: `${item.id}_worst`, type: 'worstSession', size: 'small' });
          } else if (item.type === 'bestWorstSetups') {
            migrated.push({ id: `${item.id}_best`, type: 'bestSetup', size: 'small' });
            migrated.push({ id: `${item.id}_worst`, type: 'worstSetup', size: 'small' });
          } else if (WIDGET_REGISTRY[item.type as keyof typeof WIDGET_REGISTRY]) {
            const entry = WIDGET_REGISTRY[item.type as keyof typeof WIDGET_REGISTRY];
            const validSize = entry.supportedSizes.includes(item.size) ? item.size : entry.supportedSizes[0];
            migrated.push({ ...item, size: validSize });
          }
        }
        if (migrated.length > 0) return migrated;
      }
    } catch (e) {
      console.error('Failed to migrate legacy layout', e);
    }
  }

  return INITIAL_LAYOUT;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 pb-32 md:pb-8 animate-pulse">
      <div className="col-span-2 aspect-[2/1] rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-1 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-2 aspect-[2/1] rounded-[26px] bg-card p-4 shadow-sm" />
      <div className="col-span-2 row-span-2 aspect-square rounded-[26px] bg-card p-4 shadow-sm" />
    </div>
  );
}

// Sortable Item Component с плавной анимацией перемещения без конфликтов с Framer Motion
function SortableWidget({ 
  widget, 
  index,
  isEditMode, 
  widgetData,
  onRemove, 
  onChangeSize 
}: { 
  widget: WidgetInstance; 
  index: number;
  isEditMode: boolean;
  widgetData: Omit<WidgetProps, 'size'>;
  onRemove: (id: string) => void;
  onChangeSize: (id: string, size: WidgetSize) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 0 : 1,
    opacity: isDragging ? 0.25 : 1,
  };

  const RegistryEntry = WIDGET_REGISTRY[widget.type];
  if (!RegistryEntry) return null;
  const WidgetComponent = RegistryEntry.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-full h-full rounded-[26px]",
        widget.size === 'small' && "col-span-1 row-span-1 aspect-square",
        widget.size === 'medium' && "col-span-2 row-span-1 aspect-[2/1]", 
        widget.size === 'large' && "col-span-2 row-span-2 aspect-square"
      )}
    >
      <div className={cn(
        "h-full w-full transition-all duration-200", 
        isEditMode && "ring-2 ring-blue-500/50 rounded-[26px] opacity-95"
      )}>
        <div className={cn("h-full w-full", isEditMode && "pointer-events-none select-none")}>
          <WidgetComponent 
            size={widget.size} 
            {...widgetData} 
          />
        </div>
      </div>

      {/* Edit Controls Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-3 z-20 pointer-events-none">
          <div className="w-full flex justify-between items-start pointer-events-auto">
            <div 
              {...attributes}
              {...listeners}
              style={{ touchAction: 'none' }}
              aria-label="Drag widget to reorder"
              className="w-10 h-10 md:w-8 md:h-8 bg-card/95 backdrop-blur-md rounded-full shadow-md border border-border-card text-text-muted cursor-grab active:cursor-grabbing hover:text-text-main flex items-center justify-center transition-colors shrink-0 select-none"
            >
              <GripHorizontal size={18} />
            </div>
            <button 
              type="button"
              onClick={() => onRemove(widget.id)}
              aria-label="Remove widget"
              className="w-10 h-10 md:w-8 md:h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="h-8 md:h-7 bg-card/95 backdrop-blur-md rounded-full shadow-md border border-border-card flex items-center p-0.5 gap-0.5 pointer-events-auto mt-auto mb-1">
            {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => {
              const isSupported = RegistryEntry.supportedSizes.includes(size);
              if (!isSupported) return null;
              
              const isSelected = widget.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation(); 
                    onChangeSize(widget.id, size);
                  }}
                  className={cn(
                    "px-2.5 md:px-2 h-full text-xs font-semibold rounded-full transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center",
                    isSelected 
                      ? "bg-blue-500 text-white shadow-xs" 
                      : "text-text-muted hover:text-text-main hover:bg-canvas"
                  )}
                >
                  {size.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [layout, setLayout] = useState<WidgetInstance[]>(getInitialLayout);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Accounts & Trades state
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<RawTrade[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dailyRiskLimit, setDailyRiskLimit] = useState<number>(2.0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Trade modal state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeWidget = useMemo(
    () => layout.find(w => w.id === activeId) || null,
    [layout, activeId]
  );

  useEffect(() => {
    setIsMounted(true);
    const savedAccountId = localStorage.getItem('dashboard_selected_account_id');
    if (savedAccountId) {
      setSelectedAccountId(savedAccountId);
    }
  }, []);

  useEffect(() => {
    const key = `dashboard_daily_risk_limit_${selectedAccountId}`;
    const savedLimit = localStorage.getItem(key);
    if (savedLimit) {
      const parsed = parseFloat(savedLimit);
      if (!isNaN(parsed) && parsed > 0) {
        setDailyRiskLimit(parsed);
        return;
      }
    }
    setDailyRiskLimit(2.0);
  }, [selectedAccountId]);

  const handleUpdateDailyRiskLimit = (newLimit: number) => {
    setDailyRiskLimit(newLimit);
    localStorage.setItem(`dashboard_daily_risk_limit_${selectedAccountId}`, String(newLimit));
  };

  const handleOpenTradeModal = (idea?: any) => {
    setSelectedIdeaForTrade(idea || null);
    setIsTradeModalOpen(true);
  };

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('widgetLayout_v5', JSON.stringify(layout));
    }
  }, [layout, isMounted]);

  const fetchData = useCallback(async (userId?: string) => {
    setIsLoadingData(true);
    try {
      let loadedAccounts: TradingAccount[] = [];
      let loadedTrades: RawTrade[] = [];
      let loadedIdeas: any[] = [];

      if (isSupabaseConfigured && userId) {
        const [accRes, trRes, idRes] = await Promise.all([
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
          supabase
            .from('ideas')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ]);

        if (accRes.data) loadedAccounts = accRes.data;
        if (trRes.data) loadedTrades = trRes.data;
        if (idRes.data) loadedIdeas = idRes.data;
      }

      if (loadedAccounts.length === 0) {
        const cached = localStorage.getItem('trading_accounts_offline');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              loadedAccounts = parsed.filter((a: any) => !a.is_archived);
            }
          } catch (e) {
            console.error('Error parsing offline accounts', e);
          }
        }
      }

      if (loadedTrades.length === 0) {
        const cachedTrades = localStorage.getItem('trades_offline');
        if (cachedTrades) {
          try {
            const parsed = JSON.parse(cachedTrades);
            if (Array.isArray(parsed)) {
              loadedTrades = parsed;
            }
          } catch (e) {
            console.error('Error parsing offline trades', e);
          }
        }
      }

      setAccounts(loadedAccounts);
      setTrades(loadedTrades);
      setIdeas(loadedIdeas);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const cached = localStorage.getItem('trading_accounts_offline');
      let fallbackAccs: TradingAccount[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) fallbackAccs = parsed.filter((a: any) => !a.is_archived);
        } catch (e) {}
      }
      setAccounts(fallbackAccs);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      fetchData();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchData(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchData(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleAccountChange = (newAccId: string) => {
    setSelectedAccountId(newAccId);
    localStorage.setItem('dashboard_selected_account_id', newAccId);
  };

  useEffect(() => {
    if (selectedAccountId !== 'all' && accounts.length > 0) {
      const exists = accounts.some(a => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId('all');
      }
    }
  }, [accounts, selectedAccountId]);

  const activeAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find(a => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const enrichedTrades = useMemo(() => {
    return enrichTradesWithHistoricalData(trades, accounts);
  }, [trades, accounts]);

  const filteredTrades = useMemo(() => {
    if (selectedAccountId === 'all') return enrichedTrades;
    return enrichedTrades.filter(t => t.account_id && String(t.account_id) === String(selectedAccountId));
  }, [enrichedTrades, selectedAccountId]);

  const todayTrades = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocalStr = `${year}-${month}-${day}`;

    return filteredTrades.filter(t => {
      if (!t.trade_date) return false;
      const d = t.trade_date.split('T')[0];
      return d === todayLocalStr;
    });
  }, [filteredTrades]);

  const totalStartingBalance = useMemo(() => {
    if (activeAccount) {
      return Number(activeAccount.initial_balance ?? activeAccount.balance ?? 0);
    }
    return accounts.reduce((sum, a) => {
      const init = Number(a.initial_balance ?? a.balance ?? 0);
      return sum + (isNaN(init) || init < 0 ? 0 : init);
    }, 0);
  }, [accounts, activeAccount]);

  const computedStats = useMemo<StatsSummary | null>(() => {
    try {
      return calculateStatistics(filteredTrades, {}, {}, totalStartingBalance);
    } catch (e) {
      console.error('Error calculating statistics:', e);
      return null;
    }
  }, [filteredTrades, totalStartingBalance]);

  const accountOptions: SelectOption[] = useMemo(() => {
    if (accounts.length === 0) {
      return [
        {
          value: 'all',
          label: 'No Accounts',
          icon: Wallet,
        },
      ];
    }

    const list: SelectOption[] = [
      {
        value: 'all',
        label: 'All Accounts',
        icon: Wallet,
      },
    ];

    accounts.forEach((acc) => {
      const balStr = (Number(acc.balance || 0) / 1000).toFixed(0);
      list.push({
        value: acc.id,
        label: `${acc.name} (${acc.currency || '$'}${balStr}k)`,
        icon: Wallet,
      });
    });

    return list;
  }, [accounts]);

  const removeWidget = (id: string) => {
    setLayout(prev => {
      const next = prev.filter(w => w.id !== id);
      try {
        localStorage.setItem('widgetLayout_v5', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const addWidget = (type: keyof typeof WIDGET_REGISTRY) => {
    const supportedSizes = WIDGET_REGISTRY[type].supportedSizes as WidgetSize[];
    const newWidget: WidgetInstance = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      size: supportedSizes[0]
    };
    setLayout(prev => {
      const next = [...prev, newWidget];
      try {
        localStorage.setItem('widgetLayout_v5', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setIsAddMenuOpen(false);
  };

  const changeSize = (id: string, newSize: WidgetSize) => {
    setLayout(prev => {
      const next = prev.map(w => w.id === id ? { ...w, size: newSize } : w);
      try {
        localStorage.setItem('widgetLayout_v5', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const restoreDefaultLayout = () => {
    setLayout(INITIAL_LAYOUT);
    try {
      localStorage.setItem('widgetLayout_v5', JSON.stringify(INITIAL_LAYOUT));
    } catch (e) {}
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        try {
          localStorage.setItem('widgetLayout_v5', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const iconMap: Record<string, React.ReactNode> = {
    equitySparkline: <TrendingUp size={24} className="text-emerald-500" />,
    pnlCombined: <DollarSign size={24} className="text-emerald-500" />,
    dailyRisk: <Activity size={24} className="text-rose-500" />,
    bestSession: <Trophy size={24} className="text-emerald-500" />,
    worstSession: <AlertTriangle size={24} className="text-rose-500" />,
    bestSetup: <Target size={24} className="text-emerald-500" />,
    worstSetup: <Target size={24} className="text-rose-500" />,
    activeIdeas: <Lightbulb size={24} className="text-amber-500" />,
    sessionTracker: <Clock size={24} className="text-blue-500" />,
    economicNews: <Globe size={24} className="text-rose-500" />,
    winRate: <Zap size={24} className="text-emerald-500" />,
    profitFactor: <Award size={24} className="text-blue-500" />,
    bestWorstSetups: <Target size={24} className="text-blue-500" />,
    bestWorstSessions: <Clock size={24} className="text-purple-500" />,
  };

  const sharedWidgetData = {
    account: activeAccount,
    accounts,
    totalStartingBalance,
    stats: computedStats,
    todayTrades,
    allTrades: filteredTrades,
    trades: filteredTrades,
    currencySymbol: activeAccount?.currency === 'EUR' ? '€' : activeAccount?.currency === 'GBP' ? '£' : '$',
    ideas,
    dailyRiskLimit,
    onUpdateDailyRiskLimit: handleUpdateDailyRiskLimit,
    onOpenTradeModal: handleOpenTradeModal,
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Overview & performance insights
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="w-48 sm:w-56">
            <Select
              value={selectedAccountId}
              onChange={handleAccountChange}
              options={accountOptions}
              icon={Wallet}
              placeholder="Select account"
              size="md"
            />
          </div>

          {accounts.length === 0 && !isLoadingData && (
            <a
              href="/settings"
              className="h-10 px-3.5 rounded-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-500 text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              title="Add a trading account in Settings"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Account</span>
            </a>
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={restoreDefaultLayout}
              aria-label="Restore default layout"
              title="Reset widgets to default layout"
              className="h-11 px-3.5 md:h-10 rounded-full flex items-center gap-2 bg-canvas border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-card active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Reset Layout</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            aria-label="Customize dashboard widgets"
            aria-pressed={isEditMode}
            title={isEditMode ? "Finish customization" : "Customize widgets"}
            className={cn(
              "min-h-11 min-w-11 h-11 w-11 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs",
              isEditMode 
                ? "bg-blue-500 text-white border border-blue-500 shadow-sm shadow-blue-500/20" 
                : "bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card"
            )}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* 2. Content Area — AnimatePresence с переходом скелетон -> каскадный грид */}
      <AnimatePresence mode="wait">
        {!isMounted || isLoadingData ? (
          <motion.div
            key="dashboard-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <DashboardSkeleton />
          </motion.div>
        ) : layout.length === 0 ? (
          <motion.div
            key="dashboard-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="bg-card border border-border-card rounded-[26px] p-8 max-w-sm w-full text-center flex flex-col items-center shadow-sm">
              <div className="h-14 w-14 rounded-full bg-canvas flex items-center justify-center text-text-muted mb-4">
                <Layers size={26} />
              </div>
              <h3 className="text-base font-semibold text-text-main">
                No Active Widgets
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Your dashboard grid is currently empty. Add widgets from the catalog or restore standard defaults.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(true)}
                  className="h-10 px-4 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all active:scale-[0.98] shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  Add Widget
                </button>
                <button
                  type="button"
                  onClick={restoreDefaultLayout}
                  className="h-10 px-4 rounded-full bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                >
                  <RotateCcw size={14} />
                  Defaults
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 pb-32 md:pb-8 items-start relative z-10">
                <SortableContext 
                  items={layout.map(w => w.id)} 
                  strategy={rectSortingStrategy}
                >
                  {layout.map((widget, idx) => (
                    <SortableWidget 
                      key={widget.id}
                      index={idx}
                      widget={widget}
                      isEditMode={isEditMode}
                      widgetData={sharedWidgetData}
                      onRemove={removeWidget}
                      onChangeSize={changeSize}
                    />
                  ))}
                </SortableContext>

                {/* Слот добавления виджета в режиме редактирования */}
                <AnimatePresence>
                  {isEditMode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setIsAddMenuOpen(true)}
                      className="col-span-1 row-span-1 aspect-square w-full h-full relative cursor-pointer group"
                    >
                      <div className="absolute inset-0 rounded-[26px] border-2 border-dashed border-border-card bg-canvas/40 group-hover:bg-canvas group-hover:border-blue-500/50 transition-all flex flex-col items-center justify-center text-text-muted group-hover:text-blue-500 group-active:scale-95 p-3 text-center">
                        <div className="p-2 rounded-full bg-card border border-border-card group-hover:border-blue-500/40 transition-colors mb-2">
                          <Plus size={22} />
                        </div>
                        <span className="font-semibold text-xs text-text-main group-hover:text-blue-500">
                          Add Widget
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* DragOverlay для плавной 60fps анимации перетаскивания (§3 A, design.md: scale 1.04, shadow-2xl) */}
              <DragOverlay
                dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {activeWidget ? (
                  <div
                    className={cn(
                      "w-full h-full rounded-[26px] shadow-2xl ring-2 ring-blue-500/80 bg-card overflow-hidden cursor-grabbing select-none transition-shadow",
                      activeWidget.size === 'small' && "aspect-square",
                      activeWidget.size === 'medium' && "aspect-[2/1]",
                      activeWidget.size === 'large' && "aspect-square"
                    )}
                    style={{
                      transform: 'scale(1.04)',
                    }}
                  >
                    <div className="h-full w-full pointer-events-none select-none">
                      {(() => {
                        const Entry = WIDGET_REGISTRY[activeWidget.type];
                        if (!Entry) return null;
                        const Comp = Entry.component;
                        return <Comp size={activeWidget.size} {...sharedWidgetData} />;
                      })()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Каталог виджетов */}
      <BaseModal 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        title="Add Widget to Dashboard"
        size="md"
        hideFooter
      >
        <div className="flex flex-col gap-3 py-1">
          {(Object.keys(WIDGET_REGISTRY) as Array<keyof typeof WIDGET_REGISTRY>)
            .filter(type => type !== 'bestWorstSetups' && type !== 'bestWorstSessions')
            .map(type => {
            const entry = WIDGET_REGISTRY[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addWidget(type)}
                className="w-full flex items-center justify-between p-3.5 bg-canvas/60 hover:bg-canvas border border-border-card hover:border-blue-500/50 rounded-[18px] text-left transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0 group-hover:border-blue-500/40 transition-colors">
                    {iconMap[type]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-text-main text-sm group-hover:text-blue-500 transition-colors truncate">
                      {entry.name}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {entry.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  {entry.supportedSizes.map(s => (
                    <span 
                      key={s} 
                      className="px-2 py-0.5 text-[0.6875rem] font-bold uppercase rounded-full bg-card border border-border-card text-text-muted"
                    >
                      {s.charAt(0)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </BaseModal>

      {/* Trade Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setSelectedIdeaForTrade(null);
        }}
        user={user}
        ideas={ideas}
        sourceIdea={selectedIdeaForTrade}
        onSuccess={() => {
          setIsTradeModalOpen(false);
          setSelectedIdeaForTrade(null);
          fetchData(user?.id);
        }}
      />
    </div>
  );
}