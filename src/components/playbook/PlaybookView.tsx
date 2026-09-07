import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  BookMarked, 
  CheckCircle2, 
  XCircle, 
  X, 
  Loader2, 
  Image as ImageIcon,
  ZoomIn,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PlaybookModal } from './PlaybookModal';
import { ImageViewerModal } from '../ui/ImageViewerModal';

export interface PlaybookSetup {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  winrate: number;
  total_trades: number;
  is_active: boolean;
  screenshots?: string[];
  created_at?: string;
}

type SortOption = 'winrate_desc' | 'trades_desc' | 'title_asc';
type ViewMode = 'grid' | 'list';

const SORT_LABELS: Record<SortOption, string> = {
  winrate_desc: 'Win Rate (High-Low)',
  trades_desc: 'Trades (High-Low)',
  title_asc: 'Name (A-Z)',
};

export function PlaybookView() {
  const [setups, setSetups] = useState<PlaybookSetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('winrate_desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<PlaybookSetup | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSetups(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSetups(session.user.id);
      } else {
        setSetups([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSetups = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSetups(data as PlaybookSetup[]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSetup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (setup: PlaybookSetup) => {
    setActiveMenuId(null);
    setEditingSetup(setup);
    setIsModalOpen(true);
  };

  const handleSaveSetup = async (payload: {
    title: string;
    description: string | null;
    winrate: number;
    total_trades: number;
    is_active: boolean;
    screenshots: string[];
  }) => {
    const fullPayload = { ...payload, user_id: user?.id };

    if (editingSetup) {
      if (isSupabaseConfigured && user) {
        await supabase
          .from('playbooks')
          .update(fullPayload)
          .eq('id', editingSetup.id)
          .eq('user_id', user.id);
      }
      setSetups((prev) =>
        prev.map((s) => (s.id === editingSetup.id ? { ...s, ...fullPayload } : s))
      );
    } else {
      let createdId = crypto.randomUUID();
      if (isSupabaseConfigured && user) {
        const { data } = await supabase
          .from('playbooks')
          .insert([fullPayload])
          .select();
        if (data?.[0]) createdId = data[0].id;
      }
      setSetups((prev) => [{ id: createdId, ...fullPayload, created_at: new Date().toISOString() }, ...prev]);
    }
  };

  const handleDeleteSetup = async (id: string) => {
    setActiveMenuId(null);
    if (!confirm('Delete this setup?')) return;

    if (isSupabaseConfigured && user) {
      await supabase.from('playbooks').delete().eq('id', id).eq('user_id', user.id);
    }
    setSetups((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleActive = async (setup: PlaybookSetup) => {
    setActiveMenuId(null);
    const updatedStatus = !setup.is_active;
    setSetups((prev) =>
      prev.map((s) => (s.id === setup.id ? { ...s, is_active: updatedStatus } : s))
    );

    if (isSupabaseConfigured && user) {
      await supabase
        .from('playbooks')
        .update({ is_active: updatedStatus })
        .eq('id', setup.id)
        .eq('user_id', user.id);
    }
  };

  const filteredAndSortedSetups = useMemo(() => {
    let result = [...setups];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => s.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'winrate_desc') return b.winrate - a.winrate;
      if (sortBy === 'trades_desc') return b.total_trades - a.total_trades;
      return 0;
    });
    return result;
  }, [setups, searchQuery, sortBy]);

  const getWinrateColor = (wr: number) => {
    if (wr >= 55) return 'text-emerald-500';
    if (wr >= 45) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="flex flex-col space-y-5 pb-12 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Playbook</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {setups.length}
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Strategy playbooks & setups performance
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="h-10 px-4 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[16px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={17} />
          <span>New Setup</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card border border-border-card rounded-[20px] p-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search setups..."
            className="w-full h-9 bg-canvas border border-border-card rounded-[14px] pl-9 pr-8 text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sort Selector */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-9 px-3 bg-canvas border border-border-card rounded-[14px] flex items-center gap-2 text-xs font-medium text-text-main hover:border-border-card/80 transition-all cursor-pointer"
            >
              <ArrowUpDown size={13} className="text-text-muted" />
              <span>{SORT_LABELS[sortBy]}</span>
              <ChevronDown size={13} className="text-text-muted opacity-60" />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border-card rounded-[16px] p-1 shadow-xl z-30"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSortBy(key);
                        setIsSortOpen(false);
                      }}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-xs rounded-[10px] text-left transition-colors cursor-pointer",
                        sortBy === key 
                          ? "bg-blue-500/10 text-blue-500 font-semibold" 
                          : "text-text-muted hover:text-text-main hover:bg-canvas"
                      )}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-canvas border border-border-card rounded-[14px] p-1 relative h-9">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "relative w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer z-10",
                viewMode === 'grid' ? "text-blue-500" : "text-text-muted hover:text-text-main"
              )}
              title="Card View"
            >
              <LayoutGrid size={15} className="relative z-10" />
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="viewModeIndicator"
                  className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-border-card/80"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "relative w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer z-10",
                viewMode === 'list' ? "text-blue-500" : "text-text-muted hover:text-text-main"
              )}
              title="List View"
            >
              <List size={15} className="relative z-10" />
              {viewMode === 'list' && (
                <motion.div
                  layoutId="viewModeIndicator"
                  className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-border-card/80"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-card border border-border-card rounded-[22px] p-4 h-[280px] flex flex-col justify-between animate-pulse box-border"
            >
              <div className="h-4 bg-canvas rounded w-1/2" />
              <div className="h-24 bg-canvas rounded-[14px] w-full" />
              <div className="h-9 bg-canvas rounded w-full" />
              <div className="h-6 bg-canvas rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedSetups.length === 0 ? (
        <div className="bg-card border border-border-card rounded-[24px] p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="w-12 h-12 rounded-[18px] bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            <BookMarked size={24} />
          </div>
          <h3 className="text-base font-semibold text-text-main">
            {searchQuery ? 'No setups found' : 'No setups created yet'}
          </h3>
          <p className="text-text-muted text-xs max-w-xs mt-1 mb-5">
            {searchQuery
              ? 'Try changing your search keywords.'
              : 'Add your strategies to start tracking execution accuracy and win rates.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-9 px-4 flex items-center gap-1.5 bg-blue-500 text-white rounded-[14px] text-xs font-semibold hover:bg-blue-600 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Setup</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedSetups.map((setup) => {
              const hasScreenshots = Boolean(setup.screenshots && setup.screenshots.length > 0);
              const firstScreenshot = hasScreenshots ? setup.screenshots![0] : null;

              return (
                <motion.div
                  key={setup.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleOpenEditModal(setup)}
                  className="relative bg-card border border-border-card rounded-[22px] p-4 flex flex-col justify-between h-[280px] w-full shadow-sm transition-colors hover:border-blue-500/40 group overflow-hidden box-border cursor-pointer"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 h-7 shrink-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          setup.is_active ? "bg-emerald-500" : "bg-text-muted/40"
                        )}
                        title={setup.is_active ? 'Active Strategy' : 'Inactive'}
                      />
                      <h3 className="font-semibold text-text-main text-sm truncate group-hover:text-blue-500 transition-colors">
                        {setup.title}
                      </h3>
                    </div>
                  </div>

                  {/* Screenshot Container */}
                  <div className="h-24 w-full my-2 shrink-0 overflow-hidden">
                    {hasScreenshots && firstScreenshot ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); setLightboxImage({ url: firstScreenshot, title: setup.title }); }}
                        className="h-full w-full rounded-[14px] overflow-hidden border border-border-card bg-canvas cursor-pointer relative group/img"
                      >
                        <img
                          src={firstScreenshot}
                          alt={setup.title}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-[11px] text-white font-medium">
                          <ZoomIn size={13} />
                          <span>View ({setup.screenshots!.length})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full rounded-[14px] border border-dashed border-border-card/60 bg-canvas/30 flex flex-col items-center justify-center text-text-muted/40 text-xs gap-1 select-none">
                        <ImageIcon size={16} />
                        <span className="text-[10px]">No charts</span>
                      </div>
                    )}
                  </div>

                  {/* Rules description */}
                  <div className="h-9 shrink-0 overflow-hidden">
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {setup.description || 'No strategy rules configured.'}
                    </p>
                  </div>

                  {/* Metrics Footer */}
                  <div className="pt-2 border-t border-border-card/70 flex items-baseline justify-between shrink-0 h-10">
                    <div>
                      <div className={cn("text-xl font-bold tracking-tight leading-none", getWinrateColor(setup.winrate))}>
                        {setup.winrate}%
                      </div>
                      <div className="text-[9px] text-text-muted uppercase font-semibold mt-0.5">Win Rate</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text-main leading-none">{setup.total_trades}</div>
                      <div className="text-[9px] text-text-muted uppercase font-semibold mt-0.5">Trades</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* List View */
        <div className="bg-card border border-border-card rounded-[22px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-card bg-canvas/50 text-[10px] font-semibold uppercase text-text-muted">
                  <th className="py-3 px-4">Setup</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Rules</th>
                  <th className="py-3 px-3 text-center">Charts</th>
                  <th className="py-3 px-3 text-center">Trades</th>
                  <th className="py-3 px-4 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card/50">
                {filteredAndSortedSetups.map((setup) => (
                  <tr 
                    key={setup.id} 
                    onClick={() => handleOpenEditModal(setup)}
                    className="hover:bg-canvas transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-text-main">{setup.title}</td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        setup.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-canvas text-text-muted border-border-card"
                      )}>
                        {setup.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs text-text-muted truncate">{setup.description || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      {setup.screenshots && setup.screenshots.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLightboxImage({ url: setup.screenshots![0], title: setup.title }); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-semibold cursor-pointer"
                        >
                          <ImageIcon size={11} />
                          <span>{setup.screenshots.length}</span>
                        </button>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-text-main">{setup.total_trades}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("font-bold", getWinrateColor(setup.winrate))}>
                        {setup.winrate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <PlaybookModal
        isOpen={isModalOpen}
        editingSetup={editingSetup}
        user={user}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSetup}
        onDelete={handleDeleteSetup}
      />

      <ImageViewerModal
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage?.url || null}
        title={lightboxImage?.title}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}