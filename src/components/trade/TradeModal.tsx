import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Loader2, 
  Sparkles, 
  BookMarked, 
  AlertTriangle, 
  Clock, 
  Timer,
  Percent, 
  Scale, 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Edit3,
  Trash2,
  Wallet,
  Lightbulb,
  Pencil,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { TickerSelect } from '../ui/TickerSelect';
import { Select } from '../ui/Select';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { TradeModalShell } from './TradeModalShell';
import { DirectionToggle } from './DirectionToggle';
import { ScreenshotsSection } from './ScreenshotsSection';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { useTradeImageUpload } from './useTradeImageUpload';
import type { IdeaPayload } from './IdeaModal';

export type TradeOutcome = 'TP' | 'SL' | 'BE';
export type TradeSession = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_SESSION';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  sourceIdea?: IdeaPayload | null;
  editingTrade?: any | null;
  ideas?: IdeaPayload[];
  onOpenIdea?: (idea: IdeaPayload) => void;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
}

const SESSION_OPTIONS = [
  { value: 'LONDON', label: 'London Session' },
  { value: 'NEW_YORK', label: 'New York Session' },
  { value: 'ASIA', label: 'Asian Session' },
  { value: 'OFF_SESSION', label: 'Off-Session / Weekend' },
];

const SESSION_LABELS: Record<string, string> = {
  LONDON: 'London',
  NEW_YORK: 'New York',
  ASIA: 'Asian',
  OFF_SESSION: 'Off-Session',
};

export function TradeModal({ 
  isOpen, 
  onClose, 
  user, 
  sourceIdea,
  editingTrade,
  ideas,
  onOpenIdea, 
  onSuccess,
  onDelete
}: TradeModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeIdea, setActiveIdea] = useState<IdeaPayload | null>(null);

  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [outcome, setOutcome] = useState<TradeOutcome>('TP');
  const [session, setSession] = useState<TradeSession>('LONDON');
  const [timeframe, setTimeframe] = useState<string>('');
  const [riskPercent, setRiskPercent] = useState<string>('1.0');
  const [rr, setRr] = useState<string>('2.5');
  const [setupId, setSetupId] = useState('');
  const [selectedMistakeId, setSelectedMistakeId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Inline Mistake Creator
  const [isCreatingMistake, setIsCreatingMistake] = useState(false);
  const [newMistakeName, setNewMistakeName] = useState('');
  const [isSavingMistake, setIsSavingMistake] = useState(false);

  // Inline Timeframe Creator
  const [isCreatingTimeframe, setIsCreatingTimeframe] = useState(false);
  const [newTimeframeName, setNewTimeframeName] = useState('');
  const [isSavingTimeframe, setIsSavingTimeframe] = useState(false);

  // Справочники
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string }[]>([]);
  const [mistakes, setMistakes] = useState<{ id: string; name: string }[]>([]);
  const [customTimeframes, setCustomTimeframes] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; is_default: boolean }[]>([]);

  // Состояния загрузки
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reusable Image Upload Hook
  const {
    screenshots,
    isUploading,
    uploadError,
    isDragging,
    viewerIndex,
    setViewerIndex,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveScreenshot,
  } = useTradeImageUpload({
    user,
    folder: 'trades',
    isOpen,
    isEditing,
    initialScreenshots: editingTrade?.screenshots || (sourceIdea?.screenshots ? (Array.isArray(sourceIdea.screenshots) ? sourceIdea.screenshots : []) : []),
  });

  // Блокировка RR
  const isRrDisabled = outcome === 'SL' || outcome === 'BE';

  useEffect(() => {
    if (outcome === 'SL') {
      setRr('-1.0');
    } else if (outcome === 'BE') {
      setRr('0.0');
    } else if (outcome === 'TP' && (rr === '-1.0' || rr === '0.0' || !rr)) {
      setRr('2.5');
    }
  }, [outcome]);

  useEffect(() => {
    if (!isOpen || !user || !isSupabaseConfigured) return;
    async function loadData() {
      const [pbRes, mistRes, accRes, tfRes] = await Promise.all([
        supabase.from('playbooks').select('id, title').eq('user_id', user.id).eq('is_active', true).order('title', { ascending: true }),
        supabase.from('user_mistakes').select('id, name').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('trading_accounts').select('id, name, is_default').eq('user_id', user.id).eq('is_archived', false).order('name', { ascending: true }),
        supabase.from('user_timeframes').select('id, name').eq('user_id', user.id).order('created_at', { ascending: true })
      ]);
      if (pbRes.data) setPlaybooks(pbRes.data);
      if (mistRes.data) setMistakes(mistRes.data);
      if (accRes.data) {
        setAccounts(accRes.data);
        if (!editingTrade && !accountId) {
          const def = accRes.data.find((a: any) => a.is_default);
          if (def) setAccountId(def.id);
          else if (accRes.data.length > 0) setAccountId(accRes.data[0].id);
        }
      }
      if (tfRes.data) {
        setCustomTimeframes(tfRes.data);
      } else {
        const cachedTf = localStorage.getItem('user_timeframes_offline');
        if (cachedTf) {
          try {
            const parsed = JSON.parse(cachedTf);
            if (Array.isArray(parsed)) setCustomTimeframes(parsed);
          } catch (e) {}
        }
      }
    }
    loadData();
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      if (editingTrade) {
        setIsEditing(false);
        setSymbol(editingTrade.symbol || '');
        const rawDir = String(editingTrade.direction || '').toLowerCase();
        setDirection(rawDir === 'short' ? 'short' : 'long');
        setOutcome((editingTrade.outcome as TradeOutcome) || 'TP');
        setSession((editingTrade.session as TradeSession) || 'LONDON');
        setTimeframe(editingTrade.timeframe || '');
        setRiskPercent(editingTrade.risk_percent?.toString() || '1.0');
        setRr(editingTrade.rr?.toString() || '2.5');
        setSetupId(editingTrade.setup_id || '');
        setSelectedMistakeId(editingTrade.mistake_ids?.[0] || '');
        setAccountId(editingTrade.account_id || '');
        setNotes(editingTrade.notes || '');

        if (editingTrade.idea_id) {
          const found = ideas?.find((i) => i.id === editingTrade.idea_id);
          if (found) {
            setActiveIdea(found);
          } else if (isSupabaseConfigured) {
            supabase
              .from('ideas')
              .select('*')
              .eq('id', editingTrade.idea_id)
              .single()
              .then(({ data }) => { if (data) setActiveIdea(data); });
          }
        } else {
          setActiveIdea(null);
        }
      } else {
        setIsEditing(true);
        setActiveIdea(sourceIdea || null);

        if (sourceIdea) {
          setSymbol(sourceIdea.symbol || '');
          const rawDir = String(sourceIdea.direction || '').toLowerCase();
          setDirection(rawDir === 'short' ? 'short' : 'long');
          const rawSession = String(sourceIdea.session || 'LONDON').toUpperCase();
          setSession((rawSession as TradeSession) || 'LONDON');
          setTimeframe((sourceIdea as any).timeframe || '');
          setNotes(sourceIdea.notes || '');
        } else {
          setSymbol('');
          setDirection('long');
          setSession('LONDON');
          setTimeframe('');
          setNotes('');
        }
        setOutcome('TP');
        setRiskPercent('1.0');
        setRr('2.5');
        setSetupId('');
        setSelectedMistakeId('');
      }
      setIsCreatingMistake(false);
      setNewMistakeName('');
      setIsCreatingTimeframe(false);
      setNewTimeframeName('');
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, sourceIdea, editingTrade, ideas]);

  const handleCancelEditing = () => {
    if (editingTrade) {
      // Revert uncommitted changes to trade values
      setSymbol(editingTrade.symbol || '');
      const rawDir = String(editingTrade.direction || '').toLowerCase();
      setDirection(rawDir === 'short' ? 'short' : 'long');
      setOutcome((editingTrade.outcome as TradeOutcome) || 'TP');
      setSession((editingTrade.session as TradeSession) || 'LONDON');
      setTimeframe(editingTrade.timeframe || '');
      setRiskPercent(editingTrade.risk_percent?.toString() || '1.0');
      setRr(editingTrade.rr?.toString() || '2.5');
      setSetupId(editingTrade.setup_id || '');
      setSelectedMistakeId(editingTrade.mistake_ids?.[0] || '');
      setAccountId(editingTrade.account_id || '');
      setNotes(editingTrade.notes || '');
      setIsEditing(false);
      setError(null);
    } else {
      onClose();
    }
  };

  const handleCreateMistake = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMistakeName.trim();
    if (!trimmed) {
      setIsCreatingMistake(false);
      return;
    }
    setIsSavingMistake(true);
    try {
      if (isSupabaseConfigured && user) {
        const { data, error: insertErr } = await supabase
          .from('user_mistakes')
          .insert([{ name: trimmed, user_id: user.id }])
          .select('id, name')
          .single();
        if (insertErr) throw insertErr;
        if (data) {
          setMistakes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
          setSelectedMistakeId(data.id);
        }
      }
      setNewMistakeName('');
      setIsCreatingMistake(false);
    } catch (err: any) {
      console.error('Error creating mistake:', err);
    } finally {
      setIsSavingMistake(false);
    }
  };

  const handleCreateTimeframe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTimeframeName.trim();
    if (!trimmed) {
      setIsCreatingTimeframe(false);
      return;
    }
    setIsSavingTimeframe(true);
    try {
      let createdItem = { id: `local-${Date.now()}`, name: trimmed };
      if (isSupabaseConfigured && user) {
        const { data, error: insertErr } = await supabase
          .from('user_timeframes')
          .insert([{ name: trimmed, user_id: user.id }])
          .select('id, name')
          .single();
        if (!insertErr && data) {
          createdItem = data;
        }
      }
      setCustomTimeframes((prev) => {
        const next = [...prev.filter((t) => t.name.toLowerCase() !== trimmed.toLowerCase()), createdItem];
        try {
          localStorage.setItem('user_timeframes_offline', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setTimeframe(trimmed);
      setNewTimeframeName('');
      setIsCreatingTimeframe(false);
    } catch (err: any) {
      console.error('Error creating timeframe:', err);
    } finally {
      setIsSavingTimeframe(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol) {
      setError('Please select an asset ticker');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedRisk = riskPercent ? parseFloat(riskPercent) : 1.0;
      const parsedRr = rr ? parseFloat(rr) : 0.0;
      const mistakeIdsArray = selectedMistakeId && !selectedMistakeId.startsWith('local-') ? [selectedMistakeId] : [];
      let calcPnlR = 0;
      if (outcome === 'TP') calcPnlR = parsedRr;
      else if (outcome === 'SL') calcPnlR = -1;

      const calcPnlPercent = Number((calcPnlR * parsedRisk).toFixed(4));
      const payload = {
        symbol, direction: direction.toUpperCase(), outcome, session, timeframe: timeframe || null,
        risk_percent: parsedRisk, rr: parsedRr, pnl_r: calcPnlR, pnl_percent: calcPnlPercent,
        setup_id: setupId || null, mistake_ids: mistakeIdsArray, account_id: accountId || null,
        idea_id: activeIdea?.id || null, screenshots, notes: notes.trim() || null,
      };

      if (isSupabaseConfigured && user) {
        if (editingTrade?.id) {
          const { error: updateErr } = await supabase.from('trades').update(payload).eq('id', editingTrade.id).eq('user_id', user.id);
          if (updateErr) throw updateErr;
        } else {
          const insertPayload = { ...payload, user_id: user.id, trade_date: new Date().toISOString() };
          const { error: insertErr } = await supabase.from('trades').insert([insertPayload]);
          if (insertErr) throw insertErr;

          if (activeIdea?.id) {
            await supabase.from('ideas').update({ status: 'executed' }).eq('id', activeIdea.id).eq('user_id', user.id);
          }
        }
      }

      onSuccess?.();
      if (editingTrade) {
        // Return to view mode if editing existing trade
        setIsEditing(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Save trade error:', err);
      setError(err?.message || 'Failed to save trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingTrade?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingTrade.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const allTimeframeNames = Array.from(
    new Set([
      ...customTimeframes.map((ct) => ct.name).filter(Boolean),
      ...(editingTrade?.timeframe ? [editingTrade.timeframe] : []),
      ...(timeframe ? [timeframe] : []),
    ])
  );

  const timeframeOptions = [
    { value: '', label: allTimeframeNames.length === 0 ? 'No timeframes (click + New)' : 'None / Not specified' },
    ...allTimeframeNames.map((tf) => ({ value: tf, label: tf })),
  ];

  const playbookOptions = [{ value: '', label: 'Discretionary (No Setup)' }, ...playbooks.map((p) => ({ value: p.id, label: p.title }))];
  const mistakeOptions = [{ value: '', label: 'None (Clean Execution)' }, ...mistakes.map((m) => ({ value: m.id, label: m.name }))];
  const accountOptions = [{ value: '', label: 'No Account (Unassigned)' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))];

  const currentPlaybookTitle = playbooks.find((p) => p.id === setupId)?.title;
  const currentMistakeName = mistakes.find((m) => m.id === selectedMistakeId)?.name;
  const currentAccountName = accounts.find((a) => a.id === accountId)?.name;

  // Header Titles
  const modalTitle = isEditing 
    ? (editingTrade ? 'Edit Trade' : (activeIdea ? 'Execute Idea → Log Trade' : 'Log Trade'))
    : `${symbol || 'Trade'} Trade Details`;

  const mobileTitle = isEditing
    ? (editingTrade ? 'Edit Trade' : 'Log Trade')
    : `${symbol || 'Trade'} Details`;

  return (
    <>
      <TradeModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        mobileTitle={mobileTitle}
        desktopIcon={<Zap size={20} />}
        desktopIconClass="bg-blue-500/10 text-blue-500"
        onSubmit={isEditing ? handleSubmit : undefined}
        // Mobile Header 3-Slot Actions (per design.md §5)
        mobileLeftAction={{
          icon: <X size={18} />,
          onClick: isEditing ? handleCancelEditing : onClose,
          ariaLabel: isEditing ? 'Cancel editing' : 'Close modal',
        }}
        mobileRightAction={
          isEditing ? (
            {
              icon: isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />,
              onClick: handleSubmit,
              ariaLabel: 'Save trade',
              isPrimary: true,
              disabled: isSubmitting || !symbol,
            }
          ) : (
            {
              icon: <Pencil size={18} />,
              onClick: () => setIsEditing(true),
              ariaLabel: 'Edit trade',
              isPrimary: false,
            }
          )
        }
        // Desktop Header Actions
        desktopHeaderActions={
          !isEditing && editingTrade && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="h-10 px-4 rounded-full bg-card border border-border-card hover:bg-canvas text-sm font-medium text-text-main flex items-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-xs"
            >
              <Edit3 size={16} />
              <span>Edit</span>
            </button>
          )
        }
        // Desktop Footer Actions
        desktopFooterLeft={
          editingTrade && onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Trade"
              className="h-10 px-4 rounded-full flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer active:scale-95 disabled:opacity-50 text-sm font-medium"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Delete</span>
            </button>
          )
        }
        desktopFooterRight={
          isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
              >
                {editingTrade ? 'Cancel' : 'Close'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading || !symbol}
                className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin shrink-0" />}
                <span>{editingTrade ? 'Save Changes' : activeIdea ? 'Execute Trade' : 'Save Trade'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
            >
              Close
            </button>
          )
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isEditing && editingTrade ? (
            <motion.div
              key="trade-view-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Outcome / Direction / Risk / Session Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Outcome</span>
                  <div className="mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[0.6875rem] uppercase font-bold",
                      outcome === 'TP' ? "bg-emerald-500/10 text-emerald-500" :
                      outcome === 'SL' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {outcome}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Direction</span>
                  <div className="mt-1 font-bold text-sm">
                    {direction === 'long' ? (
                      <span className="text-emerald-500 flex items-center gap-1"><TrendingUp size={14} /> Long</span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1"><TrendingDown size={14} /> Short</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Risk / RR</span>
                  <div className="mt-1 font-mono font-bold text-sm text-text-main tabular-nums">
                    {riskPercent}% • 1:{rr}
                  </div>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Session</span>
                  <div className="mt-1 text-sm font-semibold text-text-main">
                    {SESSION_LABELS[session] || session}
                  </div>
                </div>
              </div>

              {/* Account / Setup / Timeframe / Mistakes Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <Wallet size={12} className="text-blue-500" /> Account
                  </span>
                  <p className="text-xs font-semibold text-text-main truncate">
                    {currentAccountName || 'Unassigned'}
                  </p>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <BookMarked size={12} className="text-blue-500" /> Setup
                  </span>
                  <p className="text-xs font-semibold text-text-main truncate">
                    {currentPlaybookTitle || 'Discretionary'}
                  </p>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <Timer size={12} className="text-blue-500" /> Entry TF
                  </span>
                  <p className="text-xs font-semibold text-text-main font-mono truncate">
                    {timeframe || editingTrade?.timeframe || 'Not specified'}
                  </p>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-500" /> Mistakes
                  </span>
                  <p className="text-xs font-semibold text-text-main truncate">
                    {currentMistakeName ? (
                      <span className="text-rose-500">{currentMistakeName}</span>
                    ) : (
                      <span className="text-emerald-500">Clean Execution</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Linked Watchlist Idea banner */}
              {activeIdea && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-[18px] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Lightbulb size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-amber-500">
                          Origin: Watchlist Idea
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-amber-500/10 text-amber-500">
                          {activeIdea.direction || 'LONG'}
                        </span>
                      </div>
                      <div className="text-xs text-text-main font-medium truncate mt-1">
                        {activeIdea.symbol} {activeIdea.notes ? `— ${activeIdea.notes}` : ''}
                      </div>
                    </div>
                  </div>

                  {onOpenIdea && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenIdea(activeIdea);
                      }}
                      className="h-10 px-4 rounded-full bg-card border border-border-card hover:bg-canvas text-sm font-medium text-text-main flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
                    >
                      <span>View Idea</span>
                      <ExternalLink size={14} className="text-amber-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Execution Notes */}
              {notes && (
                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-2">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
                    Execution Notes
                  </span>
                  <p className="text-xs text-text-main whitespace-pre-wrap leading-relaxed">
                    {notes}
                  </p>
                </div>
              )}

              {/* Chart Screenshots */}
              <ScreenshotsSection
                screenshots={screenshots}
                isEditing={false}
                onViewScreenshot={(idx) => setViewerIndex(idx)}
              />

              {/* Mobile-only Destructive Action per design.md §5:
                  "одиночное destructive действие допустимо внизу скроллируемого body отдельной L1-кнопкой" */}
              {editingTrade && onDelete && (
                <div className="pt-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                    <span>Delete Trade</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="trade-form-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Linked Idea Notice */}
              {activeIdea && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[18px] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-text-main">{activeIdea.symbol}</span>
                      <span className="text-text-muted ml-2">Linked to Watchlist Idea</span>
                    </div>
                  </div>
                  {onOpenIdea && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenIdea(activeIdea); }}
                      className="h-8 px-3 rounded-full bg-card border border-border-card text-xs font-semibold text-text-main flex items-center gap-1 hover:bg-canvas cursor-pointer active:scale-95 shadow-xs"
                    >
                      <span>View</span>
                      <ExternalLink size={12} className="text-amber-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Form Two-Column Grid (§5: grid md:grid-cols-2 gap-x-6 gap-y-5) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Row 1: Asset / Instrument (Left) + Direction (Right) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Asset / Instrument <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Direction
                    </label>
                  </div>
                  <DirectionToggle
                    value={direction}
                    onChange={(val) => setDirection(val as 'long' | 'short')}
                    namespace="trade-modal"
                    variant="trade"
                  />
                </div>

                {/* Row 2: Trade Outcome (Left) + Risk / RR (Right) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Trade Outcome
                    </label>
                  </div>
                  <div className="relative grid grid-cols-3 gap-1 p-1 bg-card md:bg-canvas border border-border-card rounded-full min-h-11 md:h-10 items-stretch">
                    {(['TP', 'SL', 'BE'] as TradeOutcome[]).map((oc) => (
                      <button
                        key={oc}
                        type="button"
                        onClick={() => setOutcome(oc)}
                        className={cn(
                          "relative z-10 h-full rounded-full text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center",
                          outcome === oc ? "text-white" : "text-text-muted hover:text-text-main"
                        )}
                      >
                        {outcome === oc && (
                          <motion.div
                            layoutId="trade-modal-outcome-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            className={cn(
                              "absolute inset-0 rounded-full shadow-sm -z-10",
                              oc === 'TP' ? "bg-emerald-500" : oc === 'SL' ? "bg-rose-500" : "bg-amber-500"
                            )}
                          />
                        )}
                        {oc}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between h-5">
                      <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                        <Percent size={12} className="text-blue-500" />
                        <span>Risk (%)</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      placeholder="1.0"
                      className="w-full min-h-11 md:h-10 bg-card md:bg-canvas border border-border-card rounded-[18px] px-4 text-xs font-mono text-text-main tabular-nums outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between h-5">
                      <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                        <Scale size={12} className="text-blue-500" />
                        <span>R:R</span>
                      </label>
                      {isRrDisabled && (
                        <span className="text-[0.6875rem] text-text-muted lowercase">
                          ({outcome} locked)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      disabled={isRrDisabled}
                      value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      placeholder={outcome === 'SL' ? '-1.0' : outcome === 'BE' ? '0.0' : '2.5'}
                      className={cn(
                        "w-full min-h-11 md:h-10 border rounded-[18px] px-4 text-xs font-mono tabular-nums transition-colors outline-none",
                        isRrDisabled
                          ? "bg-canvas/50 border-border-card/40 text-text-muted cursor-not-allowed"
                          : "bg-card md:bg-canvas border-border-card text-text-main focus:border-blue-500"
                      )}
                    />
                  </div>
                </div>

                {/* Row 3: Trading Session (Left) + Trading Account (Right) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Clock size={12} className="text-blue-500" />
                      <span>Trading Session</span>
                    </label>
                  </div>
                  <Select
                    value={session}
                    onChange={(val) => setSession(val as TradeSession)}
                    options={SESSION_OPTIONS}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Wallet size={12} className="text-blue-500" />
                      <span>Trading Account</span>
                    </label>
                  </div>
                  <Select
                    value={accountId}
                    onChange={(val) => setAccountId(val)}
                    options={accountOptions}
                    placeholder="Select Account..."
                  />
                </div>

                {/* Row 4: Playbook Setup (Left) + Entry Timeframe (Right) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <BookMarked size={12} className="text-blue-500" />
                      <span>Playbook Setup</span>
                    </label>
                  </div>
                  <Select
                    value={setupId}
                    onChange={setSetupId}
                    options={playbookOptions}
                    placeholder="Discretionary (No Setup)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Timer size={12} className="text-blue-500" />
                      <span>Entry Timeframe</span>
                    </label>
                    {!isCreatingTimeframe && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingTimeframe(true)}
                        className="text-[0.6875rem] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer min-h-[24px]"
                      >
                        <Plus size={12} /> New
                      </button>
                    )}
                  </div>

                  {isCreatingTimeframe ? (
                    <div className="flex items-center gap-2 p-1 bg-card md:bg-canvas border border-blue-500 rounded-[18px] min-h-11 md:h-10">
                      <input
                        type="text"
                        autoFocus
                        value={newTimeframeName}
                        onChange={(e) => setNewTimeframeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleCreateTimeframe(); }
                          if (e.key === 'Escape') { setIsCreatingTimeframe(false); setNewTimeframeName(''); }
                        }}
                        placeholder="e.g. 1m, 5m, 1h..."
                        className="w-full h-full bg-transparent px-3 text-xs text-text-main outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCreateTimeframe}
                        disabled={isSavingTimeframe || !newTimeframeName.trim()}
                        className="h-full px-3 rounded-[14px] bg-blue-500 border border-blue-500 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 disabled:opacity-50 shrink-0"
                      >
                        {isSavingTimeframe ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsCreatingTimeframe(false); setNewTimeframeName(''); }}
                        className="h-full px-2.5 rounded-[14px] bg-canvas border border-border-card text-text-muted hover:text-text-main cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <Select
                      value={timeframe}
                      onChange={setTimeframe}
                      options={timeframeOptions}
                      placeholder={allTimeframeNames.length === 0 ? "Add timeframe via + New..." : "Select Timeframe..."}
                    />
                  )}
                </div>

                {/* Row 5: Execution Mistake (Full width / span-2) */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span>Execution Mistake</span>
                    </label>
                    {!isCreatingMistake && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingMistake(true)}
                        className="text-[0.6875rem] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer min-h-[24px]"
                      >
                        <Plus size={12} /> New
                      </button>
                    )}
                  </div>

                  {isCreatingMistake ? (
                    <div className="flex items-center gap-2 p-1 bg-card md:bg-canvas border border-blue-500 rounded-[18px] min-h-11 md:h-10">
                      <input
                        type="text"
                        autoFocus
                        value={newMistakeName}
                        onChange={(e) => setNewMistakeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleCreateMistake(); }
                          if (e.key === 'Escape') { setIsCreatingMistake(false); setNewMistakeName(''); }
                        }}
                        placeholder="Mistake title..."
                        className="w-full h-full bg-transparent px-3 text-xs text-text-main outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCreateMistake}
                        disabled={isSavingMistake || !newMistakeName.trim()}
                        className="h-full px-3 rounded-[14px] bg-blue-500 border border-blue-500 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 disabled:opacity-50 shrink-0"
                      >
                        {isSavingMistake ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsCreatingMistake(false); setNewMistakeName(''); }}
                        className="h-full px-2.5 rounded-[14px] bg-canvas border border-border-card text-text-muted hover:text-text-main cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <Select
                      value={selectedMistakeId}
                      onChange={setSelectedMistakeId}
                      options={mistakeOptions}
                      placeholder="None (Clean Execution)"
                    />
                  )}
                </div>

                {/* 2 Columns: Notes */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Execution Notes & Context
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Market context, psychological state, key triggers..."
                    className="w-full bg-card md:bg-canvas border border-border-card rounded-[18px] p-4 text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {/* 2 Columns: Screenshots */}
                <div className="md:col-span-2">
                  <ScreenshotsSection
                    screenshots={screenshots}
                    isEditing={true}
                    isUploading={isUploading}
                    uploadError={uploadError}
                    isDragging={isDragging}
                    fileInputRef={fileInputRef}
                    onFileInputChange={handleFileInputChange}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onRemoveScreenshot={handleRemoveScreenshot}
                    onViewScreenshot={(idx) => setViewerIndex(idx)}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}

              {/* Mobile-only Destructive Action in Edit Mode */}
              {editingTrade && onDelete && (
                <div className="pt-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                    <span>Delete Trade</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TradeModalShell>

      {/* Reusable Image Viewer */}
      <ImageViewerModal
        isOpen={viewerIndex !== null}
        images={screenshots}
        initialIndex={viewerIndex || 0}
        title={symbol ? `${symbol} - Trade Chart` : 'Trade Chart'}
        onClose={() => setViewerIndex(null)}
      />

      {/* Confirmation Dialog for Deletion per design.md §5 */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        title="Delete Trade"
        description="Are you sure you want to delete this trade? All trade records and associated metrics will be permanently removed."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}