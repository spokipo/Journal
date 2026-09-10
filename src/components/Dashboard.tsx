import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, 
  X, 
  Plus, 
  Activity, 
  Clock, 
  TrendingUp, 
  TrendingDown,
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
  Calendar
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
  type EnrichedTrade, 
  type StatsSummary 
} from '../lib/statsEngine';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
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
  { id: 'w2', type: 'dailyRisk', size: 'small' },
  { id: 'w3', type: 'activeIdeas', size: 'small' },
  { id: 'w4', type: 'pnlCombined', size: 'small' },
  { id: 'w5', type: 'bestWorstSetups', size: 'small' },
  { id: 'w6', type: 'bestWorstSessions', size: 'small' },
  { id: 'w7', type: 'economicNews', size: 'small' },
  { id: 'w8', type: 'sessionTracker', size: 'small' },
  { id: 'w9', type: 'equitySparkline', size: 'large' },
];



// Sortable Item Component conforming strictly to design.md §3 Layout Types (Grid)
function SortableWidget({ 
  widget, 
  isEditMode, 
  widgetData,
  onRemove, 
  onChangeSize 
}: { 
  widget: WidgetInstance; 
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

  const style = {
    transform: transform ? CSS.Transform.toString({
      ...transform,
      scaleX: isDragging ? 1.04 : 1,
      scaleY: isDragging ? 1.04 : 1,
    }) : undefined,
    transition,
    zIndex: isDragging ? 40 : 1,
    touchAction: isEditMode ? 'none' : 'auto',
  };

  const RegistryEntry = WIDGET_REGISTRY[widget.type];
  if (!RegistryEntry) return null;
  const WidgetComponent = RegistryEntry.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-full h-full rounded-[26px] transition-shadow",
        widget.size === 'small' && "col-span-1 row-span-1 aspect-square",
        widget.size === 'medium' && "col-span-2 row-span-1 aspect-[2/1] md:aspect-[2.05/1]", 
        widget.size === 'large' && "col-span-2 row-span-2 aspect-square",
        isDragging && "shadow-2xl cursor-grabbing"
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

      {/* Edit Controls Overlay conforming to design.md §3 */}
      {isEditMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-3 z-20 pointer-events-none">
          {/* Top Row: Delete & Drag Handle */}
          <div className="w-full flex justify-between items-start pointer-events-auto">
            {/* Drag Handle bound to dnd-kit listeners */}
            <div 
              {...attributes}
              {...listeners}
              aria-label="Drag widget to reorder"
              className="p-1.5 bg-card/95 backdrop-blur-md rounded-full shadow-md border border-border-card text-text-muted cursor-grab active:cursor-grabbing hover:text-text-main transition-colors"
            >
              <GripHorizontal size={16} />
            </div>
            {/* Delete button: w-6 h-6 bg-rose-500 text-white rounded-full per §3 Edit mode */}
            <button 
              type="button"
              onClick={() => onRemove(widget.id)}
              aria-label="Remove widget"
              className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Bottom Row: Size Switcher (L4 / nested control h-7 per §2 & §3) */}
          <div className="h-7 bg-card/95 backdrop-blur-md rounded-full shadow-md border border-border-card flex items-center p-0.5 gap-0.5 pointer-events-auto mt-auto mb-1">
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
                    "px-2 h-full text-xs font-semibold rounded-full transition-all uppercase tracking-wider cursor-pointer",
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
  const [layout, setLayout] = useState<WidgetInstance[]>(INITIAL_LAYOUT);
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

  // Trade modal state for quick execution from ideas
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<any | null>(null);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load layout and saved account from localStorage
  useEffect(() => {
    setIsMounted(true);
    const savedLayout = localStorage.getItem('widgetLayout_v4');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify each widget type exists in registry and size is supported
          const valid = parsed
            .filter(w => Boolean(WIDGET_REGISTRY[w.type as keyof typeof WIDGET_REGISTRY]))
            .map(w => {
              const entry = WIDGET_REGISTRY[w.type as keyof typeof WIDGET_REGISTRY];
              if (!entry.supportedSizes.includes(w.size)) {
                return { ...w, size: entry.supportedSizes[0] };
              }
              return w;
            });
          if (valid.length > 0) setLayout(valid);
        }
      } catch (e) {
        console.error('Failed to parse saved dashboard layout', e);
      }
    }

    const savedAccountId = localStorage.getItem('dashboard_selected_account_id');
    if (savedAccountId) {
      setSelectedAccountId(savedAccountId);
    }
  }, []);

  // Sync daily risk limit per account from localStorage
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

  // Persist layout changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('widgetLayout_v4', JSON.stringify(layout));
    }
  }, [layout, isMounted]);

  // Fetch Accounts, Trades, and Ideas
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

      // Check offline localStorage fallback if no accounts found in Supabase (or offline mode)
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
      // Fallback to offline storage on error, NEVER to fake mock accounts
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

  // Handle account change
  const handleAccountChange = (newAccId: string) => {
    setSelectedAccountId(newAccId);
    localStorage.setItem('dashboard_selected_account_id', newAccId);
  };

  // Ensure selectedAccountId is reset to 'all' if selected account was deleted/missing
  useEffect(() => {
    if (selectedAccountId !== 'all' && accounts.length > 0) {
      const exists = accounts.some(a => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId('all');
      }
    }
  }, [accounts, selectedAccountId]);

  // Find active account object (or null for 'all')
  const activeAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find(a => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Enrich trades with historical balance calculation
  const enrichedTrades = useMemo(() => {
    return enrichTradesWithHistoricalData(trades, accounts);
  }, [trades, accounts]);

  // Filter trades for the selected account
  const filteredTrades = useMemo(() => {
    if (selectedAccountId === 'all') return enrichedTrades;
    return enrichedTrades.filter(t => t.account_id === selectedAccountId);
  }, [enrichedTrades, selectedAccountId]);

  // Trades executed today (using user device's local date)
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

  // Compute stats for current account slice
  const computedStats = useMemo<StatsSummary | null>(() => {
    try {
      return calculateStatistics(filteredTrades, accounts, selectedAccountId);
    } catch (e) {
      console.error('Error calculating statistics:', e);
      return null;
    }
  }, [filteredTrades, accounts, selectedAccountId]);

  // Account options for Select component
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

    const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    const allLabel = `All Accounts ($${(totalBalance / 1000).toFixed(0)}k)`;

    const list: SelectOption[] = [
      {
        value: 'all',
        label: allLabel,
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

  // Widget management
  const removeWidget = (id: string) => {
    setLayout(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (type: keyof typeof WIDGET_REGISTRY) => {
    const supportedSizes = WIDGET_REGISTRY[type].supportedSizes as WidgetSize[];
    const newWidget: WidgetInstance = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      size: supportedSizes[0]
    };
    setLayout(prev => [...prev, newWidget]);
    setIsAddMenuOpen(false);
  };

  const changeSize = (id: string, newSize: WidgetSize) => {
    setLayout(prev => prev.map(w => w.id === id ? { ...w, size: newSize } : w));
  };

  const restoreDefaultLayout = () => {
    setLayout(INITIAL_LAYOUT);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Icon mapping for catalog
  const iconMap: Record<string, React.ReactNode> = {
    equitySparkline: <TrendingUp size={24} className="text-emerald-500" />,
    pnlCombined: <DollarSign size={24} className="text-emerald-500" />,
    dailyRisk: <Activity size={24} className="text-rose-500" />,
    activeIdeas: <Lightbulb size={24} className="text-amber-500" />,
    bestWorstSetups: <Target size={24} className="text-blue-500" />,
    bestWorstSessions: <Clock size={24} className="text-purple-500" />,
    sessionTracker: <Clock size={24} className="text-blue-500" />,
    economicNews: <Globe size={24} className="text-rose-500" />,
    winRate: <Zap size={24} className="text-emerald-500" />,
    profitFactor: <Award size={24} className="text-blue-500" />,
  };

  // Data bundle passed down to each widget
  const sharedWidgetData = {
    account: activeAccount,
    stats: computedStats,
    todayTrades,
    allTrades: filteredTrades,
    currencySymbol: activeAccount?.currency === 'EUR' ? '€' : '$',
    ideas,
    dailyRiskLimit,
    onUpdateDailyRiskLimit: handleUpdateDailyRiskLimit,
    onOpenTradeModal: handleOpenTradeModal,
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Page Header conforming strictly to design.md §3 Page Header & Toolbar rules */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Overview & performance insights
          </p>
        </div>

        {/* Flat row of L1 toolbar controls on bg-canvas (§3 Toolbar: no L2 wrapper) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Account Selector (L1 Element, rounded-[18px]) */}
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

          {/* Quick link to create account if none found */}
          {accounts.length === 0 && !isLoadingData && (
            <a
              href="/settings"
              className="h-10 px-3 rounded-[18px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="Add a trading account in Settings"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Account</span>
            </a>
          )}

          {/* Edit Mode Toggle Button (§3 Edit mode & §4 Button: ghost icon-button, toggled bg-blue-500 text-white) */}
          <button 
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            aria-label="Customize dashboard widgets"
            aria-pressed={isEditMode}
            title={isEditMode ? "Finish customization" : "Customize widgets"}
            className={cn(
              "min-h-11 min-w-11 h-11 w-11 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95",
              isEditMode 
                ? "bg-blue-500 text-white shadow-sm shadow-blue-500/20" 
                : "bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas"
            )}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Grid State Handling */}
      {!isMounted || isLoadingData ? (
        // Loading skeleton strictly following §7 Loading State
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 pb-32 md:pb-8">
          <div className="col-span-2 aspect-[2/1] rounded-[26px] bg-card border border-border-card animate-pulse p-5" />
          <div className="col-span-1 aspect-square rounded-[26px] bg-card border border-border-card animate-pulse p-4" />
          <div className="col-span-1 aspect-square rounded-[26px] bg-card border border-border-card animate-pulse p-4" />
          <div className="col-span-1 aspect-square rounded-[26px] bg-card border border-border-card animate-pulse p-4" />
          <div className="col-span-1 aspect-square rounded-[26px] bg-card border border-border-card animate-pulse p-4" />
          <div className="col-span-2 row-span-2 aspect-square rounded-[26px] bg-card border border-border-card animate-pulse p-5" />
        </div>
      ) : layout.length === 0 ? (
        // Empty State conforming strictly to §7 Empty State
        <div className="w-full flex flex-col items-center justify-center py-16 px-4">
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
                className="h-10 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all active:scale-[0.98] shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                Add Widget
              </button>
              <button
                type="button"
                onClick={restoreDefaultLayout}
                className="h-10 px-4 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                Defaults
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 2D Grid with dnd-kit (Layout Type A - Grid per §3)
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 pb-32 md:pb-8 items-start relative z-10">
            <SortableContext 
              items={layout.map(w => w.id)} 
              strategy={rectSortingStrategy}
            >
              {layout.map((widget) => (
                <SortableWidget 
                  key={widget.id}
                  widget={widget}
                  isEditMode={isEditMode}
                  widgetData={sharedWidgetData}
                  onRemove={removeWidget}
                  onChangeSize={changeSize}
                />
              ))}
            </SortableContext>

            {/* Add Widget Placeholder Slot (§3 Edit mode: dashed border-2 border-dashed border-border-card rounded-[26px]) */}
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
        </DndContext>
      )}

      {/* Add Widget Modal Catalog (Modal §5: short form md:w-[480px]) */}
      <BaseModal 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        title="Add Widget to Dashboard"
        size="md"
        hideFooter
      >
        <div className="flex flex-col gap-3 py-1">
          {(Object.keys(WIDGET_REGISTRY) as Array<keyof typeof WIDGET_REGISTRY>).map(type => {
            const entry = WIDGET_REGISTRY[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addWidget(type)}
                className="w-full flex items-center justify-between p-3.5 bg-canvas/60 hover:bg-canvas border border-border-card hover:border-blue-500/50 rounded-[18px] text-left transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
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

      {/* Trade Modal for quick trade creation from ideas */}
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

