import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  type SystemSection,
  DEFAULT_SYSTEM_SECTIONS,
} from './types';
import { SectionNav, MobileSectionList } from './SectionNav';
import { SectionModal } from './SectionModal';
import { DeleteSectionConfirmModal } from './DeleteSectionConfirmModal';
import { SystemHeader } from './SystemHeader';
import { DesktopSystemContent } from './DesktopSystemContent';
import { MobileSystemDetail } from './MobileSystemDetail';
import { EmptySystemState } from './EmptySystemState';

export function SystemView() {
  const [user, setUser] = useState<any>(null);
  const [sections, setSections] = useState<SystemSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Responsive state (lg breakpoint = 1024px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // Track window resize
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleResize = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches && !activeSectionId && sections.length > 0) {
        setActiveSectionId(sections[0].id);
      }
    };
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, [activeSectionId, sections]);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Mode: Read vs Edit
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  // Modals
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSectionForModal, setEditingSectionForModal] = useState<SystemSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<SystemSection | null>(null);

  // Helper to extract section ID from URL query param (?section=...)
  const getUrlSectionId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || null;
  }, []);

  // Fetch sections
  const fetchSections = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      let loadedSections: SystemSection[] = [];

      if (isSupabaseConfigured && userId && userId !== 'local-user') {
        const { data, error } = await supabase
          .from('system_sections')
          .select('*')
          .eq('user_id', userId)
          .order('order_index', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          loadedSections = data;
        }
      }

      if (loadedSections.length === 0) {
        const cacheKey = userId && userId !== 'local-user'
          ? `system_sections_${userId}`
          : 'system_sections_offline';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) loadedSections = parsed;
          } catch (e) {}
        }
      }

      setSections(loadedSections);

      const urlSection = getUrlSectionId();
      if (urlSection && loadedSections.some((s) => s.id === urlSection)) {
        setActiveSectionId(urlSection);
      } else if (window.innerWidth >= 1024 && loadedSections.length > 0) {
        setActiveSectionId(loadedSections[0].id);
      } else {
        setActiveSectionId(null);
      }
    } catch (err: any) {
      console.error('Error fetching system sections:', err);
      setErrorMessage(err?.message || 'Failed to load system sections.');
    } finally {
      setIsLoading(false);
    }
  }, [getUrlSectionId]);

  // Auth session init
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser({ id: 'local-user', email: 'local@example.com' });
      fetchSections('local-user');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      fetchSections(u?.id || 'local-user');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      fetchSections(u?.id || 'local-user');
    });

    return () => subscription.unsubscribe();
  }, [fetchSections]);

  // Handle browser back / forward buttons (popstate synchronization)
  useEffect(() => {
    const handlePopState = () => {
      const sectionFromUrl = getUrlSectionId();
      if (sectionFromUrl && sections.some((s) => s.id === sectionFromUrl)) {
        setActiveSectionId(sectionFromUrl);
      } else {
        if (window.innerWidth < 1024) {
          setActiveSectionId(null);
        } else if (sections.length > 0) {
          setActiveSectionId(sections[0].id);
        }
      }
      setIsEditMode(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getUrlSectionId, sections]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;

  useEffect(() => {
    if (activeSection) {
      setDraftContent(activeSection.content || '');
      setDraftTitle(activeSection.title || '');
    } else {
      setDraftContent('');
      setDraftTitle('');
    }
  }, [activeSectionId, activeSection]);

  const handleSelectSection = (id: string) => {
    setIsEditMode(false);
    setActiveSectionId(id);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', id);
      window.history.pushState({ section: id }, '', url.toString());
    }
  };

  const handleBackToList = () => {
    if (isEditMode) {
      setIsEditMode(false);
    }
    setActiveSectionId(null);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('section');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleEnterEditMode = () => {
    if (!activeSection) return;
    setDraftContent(activeSection.content || '');
    setDraftTitle(activeSection.title || '');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (activeSection) {
      setDraftContent(activeSection.content || '');
      setDraftTitle(activeSection.title || '');
    }
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!activeSection) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const updatedSection: SystemSection = {
        ...activeSection,
        title: draftTitle.trim() || activeSection.title,
        content: draftContent,
        updated_at: new Date().toISOString(),
      };

      const nextSections = sections.map((s) =>
        s.id === activeSection.id ? updatedSection : s
      );
      setSections(nextSections);

      const cacheKey = user && user.id !== 'local-user'
        ? `system_sections_${user.id}`
        : 'system_sections_offline';
      localStorage.setItem(cacheKey, JSON.stringify(nextSections));

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { error } = await supabase
          .from('system_sections')
          .update({
            title: updatedSection.title,
            content: updatedSection.content,
            updated_at: updatedSection.updated_at,
          })
          .eq('id', activeSection.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      setIsEditMode(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
    } catch (err: any) {
      console.error('Error saving section:', err);
      setErrorMessage(err?.message || 'Failed to save section changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (newSections: SystemSection[]) => {
    setSections(newSections);

    const cacheKey = user && user.id !== 'local-user'
      ? `system_sections_${user.id}`
      : 'system_sections_offline';
    localStorage.setItem(cacheKey, JSON.stringify(newSections));

    if (isSupabaseConfigured && user && user.id !== 'local-user') {
      try {
        const updates = newSections.map((sec, idx) => ({
          id: sec.id,
          user_id: user.id,
          title: sec.title,
          icon: sec.icon,
          content: sec.content,
          order_index: idx,
          updated_at: new Date().toISOString(),
        }));

        await supabase.from('system_sections').upsert(updates);
      } catch (err) {
        console.error('Error persisting reordered sections:', err);
      }
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const userId = user?.id || 'local-user';
      const toInsert = DEFAULT_SYSTEM_SECTIONS.map((sec, idx) => ({
        user_id: userId,
        title: sec.title,
        icon: sec.icon,
        content: sec.content,
        order_index: idx,
      }));

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { data, error } = await supabase
          .from('system_sections')
          .insert(toInsert)
          .select();

        if (error) throw error;
        if (data) {
          setSections(data);
          if (isDesktop && data.length > 0) {
            setActiveSectionId(data[0].id);
          } else {
            setActiveSectionId(null);
          }
          localStorage.setItem(`system_sections_${userId}`, JSON.stringify(data));
        }
      } else {
        const mockData: SystemSection[] = toInsert.map((item, idx) => ({
          ...item,
          id: `sec-default-${idx}-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setSections(mockData);
        if (isDesktop && mockData.length > 0) {
          setActiveSectionId(mockData[0].id);
        } else {
          setActiveSectionId(null);
        }
        localStorage.setItem('system_sections_offline', JSON.stringify(mockData));
      }
    } catch (err: any) {
      console.error('Error initializing system sections:', err);
      setErrorMessage(err?.message || 'Failed to initialize default sections.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSectionModal = async (title: string, icon: string) => {
    const userId = user?.id || 'local-user';

    if (editingSectionForModal) {
      const updated: SystemSection = {
        ...editingSectionForModal,
        title,
        icon,
        updated_at: new Date().toISOString(),
      };

      const next = sections.map((s) => (s.id === updated.id ? updated : s));
      setSections(next);

      const cacheKey = user && user.id !== 'local-user'
        ? `system_sections_${user.id}`
        : 'system_sections_offline';
      localStorage.setItem(cacheKey, JSON.stringify(next));

      if (activeSectionId === updated.id) {
        setDraftTitle(updated.title);
      }

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { error } = await supabase
          .from('system_sections')
          .update({
            title: updated.title,
            icon: updated.icon,
            updated_at: updated.updated_at,
          })
          .eq('id', updated.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    } else {
      const newOrder = sections.length;
      const newPayload = {
        user_id: userId,
        title,
        icon,
        content: `<h2>${title}</h2><p>Document your processes, rules, and guidelines here...</p>`,
        order_index: newOrder,
      };

      let createdSection: SystemSection;

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { data, error } = await supabase
          .from('system_sections')
          .insert(newPayload)
          .select()
          .single();

        if (error) throw error;
        createdSection = data;
      } else {
        createdSection = {
          ...newPayload,
          id: `sec-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      const next = [...sections, createdSection];
      setSections(next);
      handleSelectSection(createdSection.id);

      const cacheKey = user && user.id !== 'local-user'
        ? `system_sections_${user.id}`
        : 'system_sections_offline';
      localStorage.setItem(cacheKey, JSON.stringify(next));
    }
  };

  const handleConfirmDeleteSection = async () => {
    if (!deletingSection) return;

    try {
      const next = sections.filter((s) => s.id !== deletingSection.id);
      setSections(next);

      const cacheKey = user && user.id !== 'local-user'
        ? `system_sections_${user.id}`
        : 'system_sections_offline';
      localStorage.setItem(cacheKey, JSON.stringify(next));

      if (isSupabaseConfigured && user && user.id !== 'local-user') {
        const { error } = await supabase
          .from('system_sections')
          .delete()
          .eq('id', deletingSection.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      if (activeSectionId === deletingSection.id) {
        if (isDesktop) {
          setActiveSectionId(next[0]?.id || null);
        } else {
          handleBackToList();
        }
        setIsEditMode(false);
      }
    } catch (err: any) {
      console.error('Error deleting section:', err);
      setErrorMessage(err?.message || 'Failed to delete section.');
    } finally {
      setDeletingSection(null);
    }
  };

  const transitionConfig = {
    duration: prefersReducedMotion ? 0 : 0.2,
    ease: [0.16, 1, 0.3, 1],
  };

  return (
    <div className="flex flex-col space-y-5 pb-16 w-full">
      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-[18px] flex items-center justify-between text-xs text-rose-500">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* SAVE SUCCESS TOAST NOTIFICATION */}
      <AnimatePresence>
        {saveSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transitionConfig}
            className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-[18px] flex items-center gap-2 text-xs font-semibold text-emerald-500 shadow-2xs"
          >
            <CheckCircle2 size={16} />
            <span>Changes saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOADING STATE, EMPTY STATE, OR CONTENT WITH ANIMATEPRESENCE (§3.1, §7) */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="system-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-12 bg-card border border-border-card rounded-[26px] flex flex-col items-center justify-center text-text-muted space-y-3"
          >
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-xs font-medium">Loading your trading system...</p>
          </motion.div>
        ) : sections.length === 0 ? (
          /* EMPTY STATE (§7) with Band reveal */
          <motion.div
            key="system-empty"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <EmptySystemState
              onInitializeDefaults={handleInitializeDefaults}
              onOpenCreateModal={() => {
                setEditingSectionForModal(null);
                setIsSectionModalOpen(true);
              }}
            />
          </motion.div>
        ) : (
          /* TYPE D SECTIONED CONTENT with Band reveal */
          <motion.div
            key="system-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full"
          >
            {/* ========================================================== */}
            {/* DESKTOP LAYOUT (>= lg): Two-column Nav + Content            */}
            {/* ========================================================== */}
            <div className="hidden lg:flex flex-col space-y-5 w-full">
              {/* Desktop Page Header with Band reveal (§3.1) */}
              <motion.div
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <SystemHeader
                  activeSection={activeSection}
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  onEnterEditMode={handleEnterEditMode}
                  onCancelEdit={handleCancelEdit}
                  onSave={handleSave}
                  onEditSection={(section) => {
                    setEditingSectionForModal(section);
                    setIsSectionModalOpen(true);
                  }}
                  onDeleteSection={(section) => {
                    setDeletingSection(section);
                  }}
                />
              </motion.div>

              {/* Desktop Two-Column Layout */}
              <div className="flex items-start gap-6 w-full">
                {/* Left column navigation with Band reveal (delay 0.04s) */}
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0"
                >
                  <SectionNav
                    sections={sections}
                    activeSectionId={activeSectionId}
                    onSelectSection={handleSelectSection}
                    onAddSection={() => {
                      setEditingSectionForModal(null);
                      setIsSectionModalOpen(true);
                    }}
                    onEditSection={(section) => {
                      setEditingSectionForModal(section);
                      setIsSectionModalOpen(true);
                    }}
                    onDeleteSection={(section) => {
                      setDeletingSection(section);
                    }}
                    onReorder={handleReorder}
                    isEditMode={isEditMode}
                  />
                </motion.div>

                {/* Right column content card (delay 0.08s) */}
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 min-w-0"
                >
                  <DesktopSystemContent
                    activeSection={activeSection}
                    isEditMode={isEditMode}
                    isSaving={isSaving}
                    draftTitle={draftTitle}
                    setDraftTitle={setDraftTitle}
                    draftContent={draftContent}
                    setDraftContent={setDraftContent}
                    userId={user?.id}
                    onCancelEdit={handleCancelEdit}
                    onSave={handleSave}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </motion.div>
              </div>
            </div>

            {/* ========================================================== */}
            {/* MOBILE / TABLET LAYOUT (< lg) (§3 Type D)                  */}
            {/* ========================================================== */}
            <div className="lg:hidden w-full overflow-hidden">
              <AnimatePresence mode="wait">
                {!activeSectionId || !activeSection ? (
                  /* SCREEN 1: MOBILE SECTION LIST */
                  <motion.div
                    key="mobile-section-list"
                    initial={prefersReducedMotion ? { opacity: 1 } : { x: -32, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 1 } : { x: -32, opacity: 0 }}
                    transition={transitionConfig}
                    className="w-full space-y-5"
                  >
                    {/* Mobile Header with Title and Add Action (Band reveal §3.1) */}
                    <motion.div
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold text-text-main tracking-tight">
                            Trading System
                          </h1>
                          <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            System
                          </span>
                        </div>
                        <p className="text-text-muted text-xs mt-0.5">
                          Your trading rulebook & knowledge base
                        </p>
                      </div>

                      {/* Primary action (min 44px hit area per §3, §4, §9: icon-only on mobile) */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionForModal(null);
                          setIsSectionModalOpen(true);
                        }}
                        aria-label="New Section"
                        className="w-11 h-11 rounded-full bg-blue-500 border border-blue-500 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm shadow-blue-500/20 cursor-pointer shrink-0 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <Plus size={18} />
                      </button>
                    </motion.div>

                    {/* L1 Disclosure Rows List */}
                    <MobileSectionList
                      sections={sections}
                      onSelectSection={handleSelectSection}
                      onEditSection={(section) => {
                        setEditingSectionForModal(section);
                        setIsSectionModalOpen(true);
                      }}
                      onDeleteSection={(section) => {
                        setDeletingSection(section);
                      }}
                      onReorder={handleReorder}
                    />
                  </motion.div>
                ) : (
                  /* SCREEN 2: MOBILE SECTION DETAIL (§3 Mobile drill-down header) */
                  <motion.div
                    key={`mobile-detail-${activeSection.id}`}
                    initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%', opacity: 1 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 1 } : { x: '100%', opacity: 1 }}
                    transition={transitionConfig}
                  >
                    <MobileSystemDetail
                      activeSection={activeSection}
                      isEditMode={isEditMode}
                      isSaving={isSaving}
                      draftTitle={draftTitle}
                      setDraftTitle={setDraftTitle}
                      draftContent={draftContent}
                      setDraftContent={setDraftContent}
                      userId={user?.id}
                      onBackToList={handleBackToList}
                      onEnterEditMode={handleEnterEditMode}
                      onCancelEdit={handleCancelEdit}
                      onSave={handleSave}
                      onEditSection={(section) => {
                        setEditingSectionForModal(section);
                        setIsSectionModalOpen(true);
                      }}
                      onDeleteSection={(section) => {
                        setDeletingSection(section);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD / RENAME SECTION MODAL */}
      <SectionModal
        isOpen={isSectionModalOpen}
        onClose={() => {
          setIsSectionModalOpen(false);
          setEditingSectionForModal(null);
        }}
        onSave={handleSaveSectionModal}
        initialTitle={editingSectionForModal?.title || ''}
        initialIcon={editingSectionForModal?.icon || 'BookOpen'}
        isEditing={Boolean(editingSectionForModal)}
      />

      {/* DELETE SECTION CONFIRM MODAL */}
      <DeleteSectionConfirmModal
        isOpen={Boolean(deletingSection)}
        onClose={() => setDeletingSection(null)}
        onConfirm={handleConfirmDeleteSection}
        sectionTitle={deletingSection?.title || ''}
      />
    </div>
  );
}