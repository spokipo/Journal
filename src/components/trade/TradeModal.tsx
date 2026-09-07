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
  ExternalLink 
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

export function TradeModal({ 
  isOpen, 
  onClose, 
  user, 
  sourceIdea,
  editingTrade,
  onOpenIdea, 
  onSuccess,
  onDelete
}: TradeModalProps) {
  const [activeIdea, setActiveIdea] = useState<IdeaPayload | null>(null);

  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [outcome, setOutcome] = useState<TradeOutcome>('TP');
  const [session, setSession] = useState<TradeSession>('LONDON');
  const [riskPercent, setRiskPercent] = useState<string>('1.0');
  const [rr, setRr] = useState<string>('2.5');
  const [setupId, setSetupId] = useState('');
  const [selectedMistakeId, setSelectedMistakeId] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);

  // Inline Mistake Creator
  const [isCreatingMistake, setIsCreatingMistake] = useState(false);
  const [newMistakeName, setNewMistakeName] = useState('');
  const [isSavingMistake, setIsSavingMistake] = useState(false);

  // Dictionaries
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string }[]>([]);
  const [mistakes, setMistakes] = useState<{ id: string; name: string }[]>([]);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skipPillTransition = useRef(true);

  // Load Playbooks & User Mistakes
  useEffect(() => {
    if (!isOpen || !user || !isSupabaseConfigured) return;

    async function loadData() {
      const [pbRes, mistRes] = await Promise.all([
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
          .order('name', { ascending: true })
      ]);

      if (pbRes.data) setPlaybooks(pbRes.data);
      if (mistRes.data) setMistakes(mistRes.data);
    }

    loadData();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      skipPillTransition.current = true;
      if (editingTrade) {
        setActiveIdea(null);
        setSymbol(editingTrade.symbol || '');
        const rawDir = String(editingTrade.direction || '').toLowerCase();
        setDirection(rawDir === 'short' ? 'short' : 'long');
        setOutcome((editingTrade.outcome as TradeOutcome) || 'TP');
        setSession((editingTrade.session as TradeSession) || 'LONDON');
        setRiskPercent(editingTrade.risk_percent?.toString() || '1.0');
        setRr(editingTrade.rr?.toString() || '2.5');
        setSetupId(editingTrade.setup_id || '');
        setSelectedMistakeId(editingTrade.mistake_ids?.[0] || '');
        setNotes(editingTrade.notes || '');
        setScreenshots(editingTrade.screenshots || []);
      } else {
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
  }, [isOpen, sourceIdea, editingTrade]);

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
      } else {
        const localId = `local-${Date.now()}`;
        setMistakes((prev) => [...prev, { id: localId, name: trimmed }]);
        setSelectedMistakeId(localId);
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
    if (!isOpen) return;

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
  }, [isOpen, user]);

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
        direction,
        outcome,
        session,
        risk_percent: parsedRisk,
        rr: parsedRr,
        setup_id: setupId || null,
        mistake_ids: mistakeIdsArray,
        idea_id: activeIdea?.id || null,
        screenshots,
        notes: notes.trim() || null,
      };

      if (isSupabaseConfigured && user) {
        if (editingTrade?.id) {
          const { error: updateErr } = await supabase
            .from('trades')
            .update(payload)
            .eq('id', editingTrade.id);
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
              .update({ status: 'triggered' })
              .eq('id', activeIdea.id);
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
            {/* Backdrop */}
            <div
              onClick={onClose}
              className="absolute inset-0 bg-black/60 hidden md:block"
            />

            {/* Модальное окно */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-md:h-[100dvh] md:w-[500px] md:max-h-[85vh] bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 md:py-4 border-b-0 md:border-b border-border-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 items-center justify-center font-bold text-sm">
                    <Zap size={18} />
                  </div>
                  <h2 className="text-xl md:text-base font-bold md:font-semibold text-text-main tracking-tight md:tracking-normal">
                    {activeIdea ? 'Execute Idea → Log Trade' : 'Log Trade'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-90 md:active:scale-100 transition-all shadow-sm md:shadow-none cursor-pointer"
                >
                  <X size={20} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              {/* Form Body */}
              <form 
                onSubmit={handleSubmit} 
                className="px-6 pt-2 pb-6 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar [scrollbar-gutter:stable]"
              >
                {/* Интерактивная плашка связанной идеи */}
                {activeIdea && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-[18px] flex items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 font-semibold text-text-main">
                          <span className="font-mono">{activeIdea.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas/80 text-text-muted font-mono uppercase">
                            {activeIdea.direction}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted">Linked to Watchlist Idea</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onOpenIdea && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenIdea(activeIdea);
                          }}
                          className="h-8 px-2.5 rounded-xl bg-card hover:bg-canvas border border-border-card text-text-main font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                          title="Open full idea details"
                        >
                          <span>View Idea</span>
                          <ExternalLink size={12} className="text-yellow-500" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveIdea(null)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
                        title="Unlink idea"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Ticker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Asset / Instrument <span className="text-red-500">*</span>
                  </label>
                  <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                </div>

                {/* 2. Direction Switcher */}
                <div className="relative grid grid-cols-2 gap-1 p-1 bg-canvas border border-border-card rounded-[18px]">
                  <button
                    type="button"
                    onClick={() => {
                      skipPillTransition.current = false;
                      setDirection('long');
                    }}
                    className={cn(
                      "relative z-10 h-10 rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                      direction === 'long' ? "text-white" : "text-text-muted hover:text-text-main"
                    )}
                  >
                    {direction === 'long' && (
                      <motion.div
                        layoutId="trade-direction-pill"
                        layout="position"
                        transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                        className="absolute inset-0 bg-emerald-500 rounded-[14px] shadow-sm -z-10"
                      />
                    )}
                    <TrendingUp size={14} />
                    <span>Long / Buy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      skipPillTransition.current = false;
                      setDirection('short');
                    }}
                    className={cn(
                      "relative z-10 h-10 rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                      direction === 'short' ? "text-white" : "text-text-muted hover:text-text-main"
                    )}
                  >
                    {direction === 'short' && (
                      <motion.div
                        layoutId="trade-direction-pill"
                        layout="position"
                        transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                        className="absolute inset-0 bg-rose-500 rounded-[14px] shadow-sm -z-10"
                      />
                    )}
                    <TrendingDown size={14} />
                    <span>Short / Sell</span>
                  </button>
                </div>

                {/* 3. Outcome Switcher (TP / SL / BE) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Trade Outcome
                  </label>
                  <div className="relative grid grid-cols-3 gap-1 p-1 bg-canvas border border-border-card rounded-[18px]">
                    <button
                      type="button"
                      onClick={() => {
                        skipPillTransition.current = false;
                        setOutcome('TP');
                      }}
                      className={cn(
                        "relative z-10 h-9 rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none",
                        outcome === 'TP' ? "text-white" : "text-text-muted hover:text-text-main"
                      )}
                    >
                      {outcome === 'TP' && (
                        <motion.div
                          layoutId="trade-outcome-pill"
                          layout="position"
                          transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-emerald-500 rounded-[14px] shadow-sm -z-10"
                        />
                      )}
                      Take Profit (TP)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        skipPillTransition.current = false;
                        setOutcome('SL');
                      }}
                      className={cn(
                        "relative z-10 h-9 rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none",
                        outcome === 'SL' ? "text-white" : "text-text-muted hover:text-text-main"
                      )}
                    >
                      {outcome === 'SL' && (
                        <motion.div
                          layoutId="trade-outcome-pill"
                          layout="position"
                          transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-rose-500 rounded-[14px] shadow-sm -z-10"
                        />
                      )}
                      Stop Loss (SL)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        skipPillTransition.current = false;
                        setOutcome('BE');
                      }}
                      className={cn(
                        "relative z-10 h-9 rounded-[14px] text-xs font-semibold transition-colors cursor-pointer select-none",
                        outcome === 'BE' ? "text-white" : "text-text-muted hover:text-text-main"
                      )}
                    >
                      {outcome === 'BE' && (
                        <motion.div
                          layoutId="trade-outcome-pill"
                          layout="position"
                          transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-amber-500 rounded-[14px] shadow-sm -z-10"
                        />
                      )}
                      Breakeven (BE)
                    </button>
                  </div>
                </div>

                {/* 4. Session */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-500" />
                    <span>Trading Session</span>
                  </label>
                  <Select
                    value={session}
                    onChange={(val) => setSession(val as TradeSession)}
                    options={SESSION_OPTIONS}
                  />
                </div>

                {/* 5. Risk & 6. RR */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                      <Percent size={12} className="text-blue-500" />
                      <span>Risk (%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      placeholder="1.0"
                      className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 font-mono transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                      <Scale size={12} className="text-blue-500" />
                      <span>R:R Achieved</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      placeholder="2.5"
                      className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 font-mono transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* 7. Setup (Playbook) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <BookMarked size={13} className="text-blue-500" />
                    <span>Playbook Setup</span>
                  </label>
                  <Select
                    value={setupId}
                    onChange={setSetupId}
                    options={playbookOptions}
                    placeholder="Discretionary (No Setup)"
                  />
                </div>

                {/* 8. Mistake */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-500" />
                      <span>Execution Mistake</span>
                    </label>
                    {!isCreatingMistake && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingMistake(true)}
                        className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add New Mistake</span>
                      </button>
                    )}
                  </div>

                  {isCreatingMistake ? (
                    <div className="flex items-center gap-2 p-1 bg-canvas border border-blue-500 rounded-[18px]">
                      <input
                        type="text"
                        autoFocus
                        value={newMistakeName}
                        onChange={(e) => setNewMistakeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateMistake();
                          }
                          if (e.key === 'Escape') {
                            setIsCreatingMistake(false);
                            setNewMistakeName('');
                          }
                        }}
                        placeholder="e.g. Moved SL too early, FOMO entry..."
                        className="w-full h-9 bg-transparent px-3 text-xs text-text-main outline-none placeholder:text-text-muted/60"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateMistake()}
                        disabled={isSavingMistake || !newMistakeName.trim()}
                        className="h-8 px-3 rounded-[14px] bg-blue-500 text-white flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-all disabled:opacity-50 shrink-0"
                      >
                        {isSavingMistake ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingMistake(false);
                          setNewMistakeName('');
                        }}
                        className="h-8 px-2 rounded-[14px] text-text-muted hover:text-text-main transition-colors cursor-pointer"
                      >
                        <X size={13} />
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

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Execution Notes & Context
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Emotional state, execution slippage, confirmations observed..."
                    className="w-full bg-canvas border border-border-card rounded-[18px] p-4 text-sm text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                {/* 9. Screenshots */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>Chart Snapshots</span>
                      {screenshots.length > 0 && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold ml-1">
                          {screenshots.length}
                        </span>
                      )}
                    </label>
                    <span className="text-[11px] text-text-muted">
                      Paste: <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-border-card font-mono text-[10px]">Ctrl+V</kbd>
                    </span>
                  </div>

                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5">
                      {screenshots.map((url, idx) => (
                        <div
                          key={url + idx}
                          onClick={() => setPreviewImageUrl(url)}
                          className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-sm cursor-pointer"
                        >
                          <img
                            src={url}
                            alt={`Trade Chart ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[11px] font-medium flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md">
                              <ZoomIn size={12} /> View
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreenshot(idx);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10"
                            title="Remove image"
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
                      "border border-dashed rounded-[20px] p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1",
                      isDragging 
                        ? "border-blue-500 bg-blue-500/5" 
                        : "border-border-card hover:border-blue-500/60 bg-canvas/40"
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex items-center gap-2 text-blue-500 py-1">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs font-semibold">Compressing chart (WebP)...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={20} className="text-blue-500 mb-0.5" />
                        <div className="text-xs font-medium text-text-main">
                          <span className="text-blue-500 font-semibold">Choose image</span> or drop trade chart
                        </div>
                      </>
                    )}
                  </div>

                  {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-border-card flex items-center justify-between gap-2.5 shrink-0">
                  <div className="shrink-0">
                    {editingTrade && onDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="h-11 px-3.5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[16px] transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Trade"
                      >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto flex-1 sm:flex-initial justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial h-11 px-5 flex items-center justify-center bg-card border border-border-card text-text-muted hover:text-text-main rounded-[16px] text-sm font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploading || !symbol}
                      className="flex-1 sm:flex-initial h-11 px-6 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[16px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                      <span>{editingTrade ? 'Save Changes' : activeIdea ? 'Execute Trade' : 'Save Trade'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageViewerModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title={symbol ? `${symbol} - Trade Chart` : 'Trade Chart'}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
}