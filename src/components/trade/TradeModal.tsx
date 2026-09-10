import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  Loader2, 
  Sparkles, 
  BookMarked, 
  AlertTriangle, 
  Clock, 
  Percent, 
  Scale, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn, 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Edit3,
  Wallet,
  Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
import { lockBodyScroll } from '../../lib/scrollLock';
import { TickerSelect } from '../ui/TickerSelect';
import { Select } from '../ui/Select';
import { ImageViewerModal } from '../ui/ImageViewerModal';
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
  const [riskPercent, setRiskPercent] = useState<string>('1.0');
  const [rr, setRr] = useState<string>('2.5');
  const [setupId, setSetupId] = useState('');
  const [selectedMistakeId, setSelectedMistakeId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);

  // Inline Mistake Creator
  const [isCreatingMistake, setIsCreatingMistake] = useState(false);
  const [newMistakeName, setNewMistakeName] = useState('');
  const [isSavingMistake, setIsSavingMistake] = useState(false);

  // Справочники
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string }[]>([]);
  const [mistakes, setMistakes] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; is_default: boolean }[]>([]);

  // Состояния загрузки
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Галерея
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipPillTransition = useRef(true);

  // Блокировка RR
  const isRrDisabled = outcome === 'SL' || outcome === 'BE';

  // Автоматический пересчёт RR при изменении исхода
  useEffect(() => {
    if (outcome === 'SL') {
      setRr('-1.0');
    } else if (outcome === 'BE') {
      setRr('0.0');
    } else if (outcome === 'TP' && (rr === '-1.0' || rr === '0.0' || !rr)) {
      setRr('2.5');
    }
  }, [outcome]);

  // Загрузка справочников: Playbooks, Mistakes, Trading Accounts
  useEffect(() => {
    if (!isOpen || !user || !isSupabaseConfigured) return;

    async function loadData() {
      const [pbRes, mistRes, accRes] = await Promise.all([
        supabase
          .from('playbooks')
          .select('id, title')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('title', { ascending: true }),
        supabase
          .from('user_mistakes')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('trading_accounts')
          .select('id, name, is_default')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('name', { ascending: true })
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
    }

    loadData();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      skipPillTransition.current = true;
      if (editingTrade) {
        setIsEditing(false);
        setSymbol(editingTrade.symbol || '');
        const rawDir = String(editingTrade.direction || '').toLowerCase();
        setDirection(rawDir === 'short' ? 'short' : 'long');
        setOutcome((editingTrade.outcome as TradeOutcome) || 'TP');
        setSession((editingTrade.session as TradeSession) || 'LONDON');
        setRiskPercent(editingTrade.risk_percent?.toString() || '1.0');
        setRr(editingTrade.rr?.toString() || '2.5');
        setSetupId(editingTrade.setup_id || '');
        setSelectedMistakeId(editingTrade.mistake_ids?.[0] || '');
        setAccountId(editingTrade.account_id || '');
        setNotes(editingTrade.notes || '');
        setScreenshots(editingTrade.screenshots || []);

        // Resolve linked idea if trade was created from idea
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
              .then(({ data }) => {
                if (data) setActiveIdea(data);
              });
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
          setNotes(sourceIdea.notes || '');
          setScreenshots(Array.isArray(sourceIdea.screenshots) ? sourceIdea.screenshots : []);
        } else {
          setSymbol('');
          setDirection('long');
          setSession('LONDON');
          setNotes('');
          setScreenshots([]);
        }
        setOutcome('TP');
        setRiskPercent('1.0');
        setRr('2.5');
        setSetupId('');
        setSelectedMistakeId('');
      }
      setIsCreatingMistake(false);
      setNewMistakeName('');
      setError(null);
      setUploadError(null);
    }
  }, [isOpen, sourceIdea, editingTrade, ideas]);

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

  useEffect(() => {
    if (!isOpen || !isEditing) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await processAndUploadFile(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isEditing, user]);

  const processAndUploadFile = async (file: File | Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const compressedBlob = await optimizeImage(file, 1920, 0.82);
      const userId = user?.id || 'anonymous';
      const randomKey = Math.random().toString(36).substring(2, 8);
      const filePath = `trades/${userId}/${Date.now()}-${randomKey}.webp`;

      let finalUrl = '';

      if (isSupabaseConfigured && user) {
        const { error: uploadErr } = await supabase.storage
          .from('playbook-screens')
          .upload(filePath, compressedBlob, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadErr) {
          finalUrl = URL.createObjectURL(compressedBlob);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('playbook-screens')
            .getPublicUrl(filePath);
          finalUrl = publicUrl;
        }
      } else {
        finalUrl = URL.createObjectURL(compressedBlob);
      }

      setScreenshots((prev) => [...prev, finalUrl]);
    } catch (err: any) {
      console.error('Screenshot processing failed:', err);
      setUploadError(err?.message || 'Failed to process screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processAndUploadFile(files[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          await processAndUploadFile(files[i]);
        }
      }
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) {
      setError('Please select an asset ticker');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedRisk = riskPercent ? parseFloat(riskPercent) : 1.0;
      const parsedRr = rr ? parseFloat(rr) : 0.0;
      const mistakeIdsArray = selectedMistakeId && !selectedMistakeId.startsWith('local-')
        ? [selectedMistakeId]
        : [];

      const payload = {
        symbol,
        direction: direction.toUpperCase(),
        outcome,
        session,
        risk_percent: parsedRisk,
        rr: parsedRr,
        setup_id: setupId || null,
        mistake_ids: mistakeIdsArray,
        account_id: accountId || null,
        idea_id: activeIdea?.id || null,
        screenshots,
        notes: notes.trim() || null,
      };

      if (isSupabaseConfigured && user) {
        if (editingTrade?.id) {
          const { error: updateErr } = await supabase
            .from('trades')
            .update(payload)
            .eq('id', editingTrade.id)
            .eq('user_id', user.id);
          if (updateErr) throw updateErr;
        } else {
          const insertPayload = {
            ...payload,
            user_id: user.id,
            trade_date: new Date().toISOString(),
          };
          const { error: insertErr } = await supabase.from('trades').insert([insertPayload]);
          if (insertErr) throw insertErr;

          if (activeIdea?.id) {
            await supabase
              .from('ideas')
              .update({ status: 'executed' })
              .eq('id', activeIdea.id)
              .eq('user_id', user.id);
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Save trade error:', err);
      setError(err?.message || 'Failed to save trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTrade?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingTrade.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const playbookOptions = [
    { value: '', label: 'Discretionary (No Setup)' },
    ...playbooks.map((p) => ({ value: p.id, label: p.title })),
  ];

  const mistakeOptions = [
    { value: '', label: 'None (Clean Execution)' },
    ...mistakes.map((m) => ({ value: m.id, label: m.name })),
  ];

  const accountOptions = [
    { value: '', label: 'No Account (Unassigned)' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const currentPlaybookTitle = playbooks.find((p) => p.id === setupId)?.title;
  const currentMistakeName = mistakes.find((m) => m.id === selectedMistakeId)?.name;
  const currentAccountName = accounts.find((a) => a.id === accountId)?.name;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="trade-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
          >
            <div onClick={onClose} className="absolute inset-0 bg-black/60 hidden md:block" />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-md:h-[100dvh] md:w-[760px] lg:w-[860px] md:max-h-[85vh] bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 border-b border-border-card shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex w-8 h-8 rounded-[14px] bg-blue-500/10 text-blue-500 items-center justify-center font-bold text-sm shrink-0">
                    <Zap size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text-main truncate">
                      {editingTrade ? (isEditing ? 'Edit Trade' : `${symbol} Trade Details`) : (activeIdea ? 'Execute Idea → Log Trade' : 'Log Trade')}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editingTrade && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="h-9 px-3 rounded-[14px] bg-card border border-border-card hover:bg-canvas text-xs font-semibold text-text-main flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* READ-ONLY VIEW */}
              {!isEditing && editingTrade ? (
                <div className="px-6 py-5 md:px-8 md:py-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Outcome</span>
                      <div className="mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs uppercase font-bold",
                          outcome === 'TP' ? "bg-emerald-500/10 text-emerald-500" :
                          outcome === 'SL' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {outcome}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Direction</span>
                      <div className="mt-1 font-bold text-sm">
                        {direction === 'long' ? (
                          <span className="text-emerald-500 flex items-center gap-1"><TrendingUp size={14} /> Long</span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1"><TrendingDown size={14} /> Short</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Risk / RR</span>
                      <div className="mt-1 font-mono font-bold text-sm text-text-main tabular-nums">
                        {riskPercent}% • 1:{rr}
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Session</span>
                      <div className="mt-1 text-sm font-semibold text-text-main">
                        {SESSION_LABELS[session] || session}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px] space-y-1">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                        <Wallet size={12} className="text-blue-500" /> Account
                      </span>
                      <p className="text-xs font-semibold text-text-main truncate">
                        {currentAccountName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px] space-y-1">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                        <BookMarked size={12} className="text-blue-500" /> Setup
                      </span>
                      <p className="text-xs font-semibold text-text-main truncate">
                        {currentPlaybookTitle || 'Discretionary'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border-card rounded-[18px] space-y-1">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5">
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

                  {activeIdea && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-[18px] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-[14px] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Lightbulb size={16} />
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
                          <div className="text-xs text-text-main font-medium truncate mt-0.5">
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
                          className="h-9 px-3 rounded-[14px] bg-card border border-border-card hover:bg-canvas text-xs font-semibold text-text-main flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
                        >
                          <span>View Idea</span>
                          <ExternalLink size={13} className="text-amber-500" />
                        </button>
                      )}
                    </div>
                  )}

                  {notes && (
                    <div className="p-4 bg-canvas border border-border-card rounded-[18px] space-y-1">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
                        Execution Notes
                      </span>
                      <p className="text-xs text-text-main whitespace-pre-wrap leading-relaxed">
                        {notes}
                      </p>
                    </div>
                  )}

                  {screenshots.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                        <ImageIcon size={14} /> Chart Snapshots ({screenshots.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {screenshots.map((url, idx) => (
                          <div
                            key={url + idx}
                            onClick={() => setViewerIndex(idx)}
                            className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-xs cursor-pointer"
                          >
                            <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="text-xs font-semibold flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full">
                                <ZoomIn size={12} /> View
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* EDIT/CREATE FORM */
                <form 
                  onSubmit={handleSubmit} 
                  className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between"
                >
                  <div className="px-6 py-5 md:px-8 md:py-6 space-y-5 flex-1">
                    {activeIdea && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[18px] flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Sparkles size={14} className="text-amber-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-text-main">{activeIdea.symbol}</span>
                            <span className="text-text-muted ml-2">Linked to Watchlist Idea</span>
                          </div>
                        </div>
                        {onOpenIdea && (
                          <button
                            type="button"
                            onClick={() => { onClose(); onOpenIdea(activeIdea); }}
                            className="h-7 px-2.5 rounded-[12px] bg-card border border-border-card text-[0.6875rem] font-semibold text-text-main flex items-center gap-1 hover:bg-canvas cursor-pointer"
                          >
                            <span>View</span>
                            <ExternalLink size={11} className="text-amber-500" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      {/* РЯД 1: Asset (слева) + Direction (справа) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                            Asset / Instrument <span className="text-rose-500">*</span>
                          </label>
                        </div>
                        <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                            Direction
                          </label>
                        </div>
                        <div className="relative grid grid-cols-2 gap-1 p-1 bg-canvas border border-border-card rounded-[18px] h-11 md:h-10 items-stretch">
                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setDirection('long'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                              direction === 'long' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {direction === 'long' && (
                              <motion.div
                                layoutId="trade-direction-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-emerald-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            <TrendingUp size={14} />
                            <span>Long / Buy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setDirection('short'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                              direction === 'short' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {direction === 'short' && (
                              <motion.div
                                layoutId="trade-direction-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-rose-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            <TrendingDown size={14} />
                            <span>Short / Sell</span>
                          </button>
                        </div>
                      </div>

                      {/* РЯД 2: Trade Outcome (слева) + Risk / RR (справа) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                            Trade Outcome
                          </label>
                        </div>
                        <div className="relative grid grid-cols-3 gap-1 p-1 bg-canvas border border-border-card rounded-[18px] h-11 md:h-10 items-stretch">
                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setOutcome('TP'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center",
                              outcome === 'TP' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {outcome === 'TP' && (
                              <motion.div
                                layoutId="trade-outcome-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-emerald-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            TP
                          </button>

                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setOutcome('SL'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center",
                              outcome === 'SL' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {outcome === 'SL' && (
                              <motion.div
                                layoutId="trade-outcome-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-rose-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            SL
                          </button>

                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setOutcome('BE'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none flex items-center justify-center",
                              outcome === 'BE' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {outcome === 'BE' && (
                              <motion.div
                                layoutId="trade-outcome-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-amber-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            BE
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
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
                            className="w-full h-11 md:h-10 bg-canvas border border-border-card rounded-[18px] px-3.5 text-xs font-mono text-text-main tabular-nums outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between h-5">
                            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                              <Scale size={12} className="text-blue-500" />
                              <span>R:R</span>
                            </label>
                            {isRrDisabled && (
                              <span className="text-[0.625rem] text-text-muted lowercase">
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
                              "w-full h-11 md:h-10 border rounded-[18px] px-3.5 text-xs font-mono tabular-nums transition-colors outline-none",
                              isRrDisabled
                                ? "bg-canvas/50 border-border-card/40 text-text-muted cursor-not-allowed"
                                : "bg-canvas border-border-card text-text-main focus:border-blue-500"
                            )}
                          />
                        </div>
                      </div>

                      {/* РЯД 3: Trading Session (слева) + Trading Account (справа) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
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

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
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

                      {/* РЯД 4: Playbook Setup (слева) + Execution Mistake (справа) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
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

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <AlertTriangle size={12} className="text-amber-500" />
                            <span>Execution Mistake</span>
                          </label>
                          {!isCreatingMistake && (
                            <button
                              type="button"
                              onClick={() => setIsCreatingMistake(true)}
                              className="text-[0.6875rem] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus size={11} /> New
                            </button>
                          )}
                        </div>

                        {isCreatingMistake ? (
                          <div className="flex items-center gap-1.5 p-1 bg-canvas border border-blue-500 rounded-[18px] h-11 md:h-10">
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
                              onClick={() => handleCreateMistake()}
                              disabled={isSavingMistake || !newMistakeName.trim()}
                              className="h-full px-2.5 rounded-[14px] bg-blue-500 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 disabled:opacity-50 shrink-0"
                            >
                              {isSavingMistake ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setIsCreatingMistake(false); setNewMistakeName(''); }}
                              className="h-full px-1.5 rounded-[14px] text-text-muted hover:text-text-main cursor-pointer flex items-center justify-center shrink-0"
                            >
                              <X size={12} />
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

                      {/* 2 колонки: Заметки */}
                      <div className="md:col-span-2 space-y-1.5">
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
                          className="w-full bg-canvas border border-border-card rounded-[18px] p-3 text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>

                      {/* 2 колонки: Скриншоты */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <ImageIcon size={12} /> Chart Snapshots ({screenshots.length})
                          </label>
                          <span className="text-[0.6875rem] text-text-muted">Paste: Ctrl+V</span>
                        </div>

                        {screenshots.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {screenshots.map((url, idx) => (
                              <div
                                key={url + idx}
                                onClick={() => setViewerIndex(idx)}
                                className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-xs cursor-pointer"
                              >
                                <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveScreenshot(idx); }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border border-dashed rounded-[18px] p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1",
                            isDragging ? "border-blue-500 bg-blue-500/5" : "border-border-card hover:border-blue-500/60 bg-canvas/40"
                          )}
                        >
                          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" multiple className="hidden" />
                          {isUploading ? (
                            <div className="flex items-center gap-2 text-blue-500 py-1">
                              <Loader2 size={16} className="animate-spin" />
                              <span className="text-xs font-medium">Optimizing image (WebP)...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <UploadCloud size={16} className="text-blue-500" />
                              <span>Drop trade screenshot here or click to browse</span>
                            </div>
                          )}
                        </div>

                        {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}
                        {error && <p className="text-xs text-rose-500">{error}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Кнопки футера */}
                  <div className="px-4 py-3 md:px-8 md:py-5 border-t border-border-card flex items-center justify-between gap-2 md:gap-3 shrink-0 w-full max-w-full overflow-hidden">
                    <div>
                      {editingTrade && onDelete && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDelete}
                          title="Delete Trade"
                          aria-label="Delete Trade"
                          className="w-11 h-11 md:h-10 md:w-auto md:px-4 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[18px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={16} />}
                          <span className="hidden md:inline ml-1.5 text-xs font-semibold">Delete</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <button
                        type="button"
                        onClick={() => editingTrade ? setIsEditing(false) : onClose()}
                        className="h-11 md:h-10 px-4 md:px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || isUploading || !symbol}
                        className="h-11 md:h-10 px-4 md:px-5 flex-1 md:flex-initial rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 truncate"
                      >
                        {isSubmitting && <Loader2 size={14} className="animate-spin shrink-0" />}
                        <span className="truncate">{editingTrade ? 'Save Changes' : activeIdea ? 'Execute Trade' : 'Save Trade'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageViewerModal
        isOpen={viewerIndex !== null}
        images={screenshots}
        initialIndex={viewerIndex || 0}
        title={symbol ? `${symbol} - Trade Chart` : 'Trade Chart'}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}