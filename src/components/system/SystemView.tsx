import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  Save,
  X,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  type SystemSection,
  getSectionIcon,
  DEFAULT_SYSTEM_SECTIONS,
} from './types';
import { SectionNav, MobileSectionList } from './SectionNav';
import { RichTextEditor } from './RichTextEditor';
import { SectionModal } from './SectionModal';
import { DeleteSectionConfirmModal } from './DeleteSectionConfirmModal';
import { SectionContextMenu } from './SectionContextMenu';

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
      // When resizing from mobile to desktop, ensure a section is selected if available
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

  // Fetch sections from Supabase
  const fetchSections = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      let loadedSections: SystemSection[] = [];

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('system_sections')
          .select('*')
          .eq('user_id', userId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          loadedSections = data;
        } else {
          // Check local cache
          const cached = localStorage.getItem(`system_sections_${userId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.length > 0) loadedSections = parsed;
            } catch (e) {}
          }
        }
      } else {
        // Fallback for offline / dev mock
        const cached = localStorage.getItem(`system_sections_offline`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.length > 0) loadedSections = parsed;
          } catch (e) {}
        }
      }

      setSections(loadedSections);

      // Deep link / URL synchronization
      const urlSection = getUrlSectionId();
      if (urlSection && loadedSections.some((s) => s.id === urlSection)) {
        setActiveSectionId(urlSection);
      } else if (window.innerWidth >= 1024 && loadedSections.length > 0) {
        // On desktop, default to the first section
        setActiveSectionId(loadedSections[0].id);
      } else {
        // On mobile (< lg), default to null so the section list is displayed first per Type D
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
      if (u) {
        fetchSections(u.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchSections(u.id);
      } else {
        setSections([]);
        setActiveSectionId(null);
        setIsLoading(false);
      }
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
        // If on mobile and no query param, return to section list
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

  // Sync draft when active section changes
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

  // Select section and synchronize query param (?section=id)
  const handleSelectSection = (id: string) => {
    setIsEditMode(false);
    setActiveSectionId(id);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', id);
      window.history.pushState({ section: id }, '', url.toString());
    }
  };

  // Back button on mobile (< lg) - returns to the sections list
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

  // Enter Edit Mode
  const handleEnterEditMode = () => {
    if (!activeSection) return;
    setDraftContent(activeSection.content || '');
    setDraftTitle(activeSection.title || '');
    setIsEditMode(true);
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    if (activeSection) {
      setDraftContent(activeSection.content || '');
      setDraftTitle(activeSection.title || '');
    }
    setIsEditMode(false);
  };

  // Save changes
  const handleSave = async () => {
    if (!activeSection || !user) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const updatedSection: SystemSection = {
        ...activeSection,
        title: draftTitle.trim() || activeSection.title,
        content: draftContent,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
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

      // Update local state
      const nextSections = sections.map((s) =>
        s.id === activeSection.id ? updatedSection : s
      );
      setSections(nextSections);

      // Cache locally
      localStorage.setItem(
        `system_sections_${user.id}`,
        JSON.stringify(nextSections)
      );

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

  // Reorder sections
  const handleReorder = async (newSections: SystemSection[]) => {
    setSections(newSections);

    if (user) {
      localStorage.setItem(
        `system_sections_${user.id}`,
        JSON.stringify(newSections)
      );
    }

    if (isSupabaseConfigured && user) {
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

  // Initialize Default Sections
  const handleInitializeDefaults = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const toInsert = DEFAULT_SYSTEM_SECTIONS.map((sec, idx) => ({
        user_id: user.id,
        title: sec.title,
        icon: sec.icon,
        content: sec.content,
        order_index: idx,
      }));

      if (isSupabaseConfigured) {
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
          localStorage.setItem(
            `system_sections_${user.id}`,
            JSON.stringify(data)
          );
        }
      } else {
        const mockData: SystemSection[] = toInsert.map((item, idx) => ({
          ...item,
          id: `mock-${idx}-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setSections(mockData);
        if (isDesktop && mockData.length > 0) {
          setActiveSectionId(mockData[0].id);
        } else {
          setActiveSectionId(null);
        }
        localStorage.setItem(
          `system_sections_${user.id}`,
          JSON.stringify(mockData)
        );
      }
    } catch (err: any) {
      console.error('Error initializing system sections:', err);
      setErrorMessage(err?.message || 'Failed to initialize default sections.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create or Update Section from Modal
  const handleSaveSectionModal = async (title: string, icon: string) => {
    if (!user) return;

    if (editingSectionForModal) {
      // Update existing title & icon
      const updated: SystemSection = {
        ...editingSectionForModal,
        title,
        icon,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
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

      const next = sections.map((s) => (s.id === updated.id ? updated : s));
      setSections(next);
      localStorage.setItem(
        `system_sections_${user.id}`,
        JSON.stringify(next)
      );

      if (activeSectionId === updated.id) {
        setDraftTitle(updated.title);
      }
    } else {
      // Add new section
      const newOrder = sections.length;
      const newPayload = {
        user_id: user.id,
        title,
        icon,
        content: `<h2>${title}</h2><p>Document your processes, rules, and guidelines here...</p>`,
        order_index: newOrder,
      };

      let createdSection: SystemSection;

      if (isSupabaseConfigured) {
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
      localStorage.setItem(
        `system_sections_${user.id}`,
        JSON.stringify(next)
      );
    }
  };

  // Delete Section
  const handleConfirmDeleteSection = async () => {
    if (!deletingSection || !user) return;

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('system_sections')
          .delete()
          .eq('id', deletingSection.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      const next = sections.filter((s) => s.id !== deletingSection.id);
      setSections(next);
      localStorage.setItem(
        `system_sections_${user.id}`,
        JSON.stringify(next)
      );

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

  // Section Icon component for active section
  const ActiveIcon = activeSection ? getSectionIcon(activeSection.icon) : BookOpen;

  // Animation transition tokens per §2 and §3 (0.15–0.28s)
  const transitionConfig = {
    duration: prefersReducedMotion ? 0 : 0.22,
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

      {/* LOADING STATE (§7) */}
      {isLoading ? (
        <div className="p-12 bg-card border border-border-card rounded-[26px] flex flex-col items-center justify-center text-text-muted space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-xs font-medium">Loading your trading system...</p>
        </div>
      ) : sections.length === 0 ? (
        /* EMPTY STATE (§7) */
        <div className="p-8 sm:p-12 bg-card border border-border-card rounded-[26px] flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-canvas flex items-center justify-center text-text-muted">
            <Layers size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-main">
              No System Sections Yet
            </h3>
            <p className="text-xs text-text-muted max-w-md">
              Create a personalized trading knowledge base to record your risk rules, daily routines, entry criteria, and psychology reminders.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleInitializeDefaults}
              className="w-full sm:w-auto min-h-11 h-11 px-5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Initialize Starter System</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingSectionForModal(null);
                setIsSectionModalOpen(true);
              }}
              className="w-full sm:w-auto min-h-11 h-11 px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Custom Section</span>
            </button>
          </div>
        </div>
      ) : (
        /* TYPE D SECTIONED CONTENT */
        <div className="w-full">
          {/* ========================================================== */}
          {/* DESKTOP LAYOUT (>= lg): Two-column Nav + Content            */}
          {/* ========================================================== */}
          <div className="hidden lg:flex flex-col space-y-5 w-full">
            {/* Desktop Page Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">
                    Trading System
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Knowledge Base
                  </span>
                </div>
                <p className="text-text-muted text-xs sm:text-sm mt-0.5">
                  Your personal rulebook, strategy guidelines, and operating checklists
                </p>
              </div>

              {activeSection && (
                <div className="flex items-center gap-2.5">
                  {isEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-10 px-4 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-10 px-5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEnterEditMode}
                        className="h-10 px-4 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas hover:border-blue-500/40 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                      >
                        <Edit3 size={14} className="text-blue-500" />
                        <span>Edit</span>
                      </button>

                      <SectionContextMenu
                        section={activeSection}
                        onEdit={() => {
                          setEditingSectionForModal(activeSection);
                          setIsSectionModalOpen(true);
                        }}
                        onDelete={() => {
                          setDeletingSection(activeSection);
                        }}
                        isCompact={true}
                        iconSize={15}
                        triggerClassName="h-10 w-10 rounded-[18px] bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Two-Column Layout */}
            <div className="flex items-start gap-6 w-full">
              {/* Left column navigation */}
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

              {/* Right column content card (L2 Container) */}
              <div className="flex-1 min-w-0 bg-card border border-border-card rounded-[26px] p-7 md:p-8 flex flex-col shadow-xs overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {activeSection ? (
                    <motion.div
                      key={activeSection.id}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                      transition={transitionConfig}
                      className="w-full space-y-6"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-border-card gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <ActiveIcon size={20} />
                          </div>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              placeholder="Section Title"
                              className="text-xl font-bold text-text-main bg-canvas border border-border-card rounded-[14px] px-3 py-1 outline-none focus:border-blue-500 w-full"
                            />
                          ) : (
                            <div className="min-w-0 flex-1">
                              <h2 className="text-xl sm:text-2xl font-bold text-text-main tracking-tight truncate">
                                {activeSection.title}
                              </h2>
                              <span className="text-[0.6875rem] text-text-muted">
                                Last updated:{' '}
                                {new Date(
                                  activeSection.updated_at || activeSection.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {isEditMode && (
                          <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider shrink-0">
                            Edit Mode
                          </span>
                        )}
                      </div>

                      <RichTextEditor
                        content={isEditMode ? draftContent : activeSection.content}
                        isEditable={isEditMode}
                        onChange={(html) => setDraftContent(html)}
                        userId={user?.id}
                      />

                      {isEditMode && (
                        <div className="pt-6 border-t border-border-card flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-10 px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-10 px-6 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-system-selection"
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                      className="py-16 text-center text-text-muted text-xs"
                    >
                      Select a section from the left navigation to view or edit its contents.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* MOBILE / TABLET LAYOUT (< lg)                              */}
          {/* Rule (§3 Type D):                                          */}
          {/* На < lg сначала показывается список разделов (L1-строки с  */}
          {/* disclosure); по выбору раздела список заменяется его        */}
          {/* контентом на полный доступный экран.                        */}
          {/* Mobile drill-down header: заголовок по центру, БЕЗ иконки, */}
          {/* кнопка «Назад» слева, action справа для симметрии.          */}
          {/* Push-навигация: slide-in справа налево, не fade.           */}
          {/* ========================================================== */}
          <div className="lg:hidden w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {!activeSectionId || !activeSection ? (
                /* SCREEN 1: MOBILE SECTION LIST */
                <motion.div
                  key="mobile-section-list"
                  initial={prefersReducedMotion ? { opacity: 1 } : { x: -32 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { x: -32 }}
                  transition={transitionConfig}
                  className="w-full space-y-5"
                >
                  {/* Mobile Header with Title and Add Action */}
                  <div className="flex items-center justify-between gap-3">
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

                    {/* Primary action (min 44px hit area per §3 & §9) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionForModal(null);
                        setIsSectionModalOpen(true);
                      }}
                      className="min-h-11 min-w-11 h-11 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">New Section</span>
                    </button>
                  </div>

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
                /* SCREEN 2: MOBILE SECTION DETAIL (Replaces list on full screen) */
                <motion.div
                  key={`mobile-detail-${activeSection.id}`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
                  transition={transitionConfig}
                  className="w-full space-y-4"
                >
                  {/* TOP BAR: Back button (>=44x44px) + Centered Section Title (NO icon) + Action */}
                  <div className="flex items-center justify-between gap-2.5 w-full">
                    {/* Back Button (interactive area >= 44x44px per §3 & §9) */}
                    <button
                      type="button"
                      onClick={handleBackToList}
                      aria-label="Back to sections list"
                      className="w-11 h-11 min-w-11 min-h-11 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    {/* Centered Section Title (NO icon, text-base font-semibold) */}
                    <div className="flex-1 min-w-0 text-center px-1">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          placeholder="Section Title"
                          className="text-base font-semibold text-text-main text-center bg-canvas border border-border-card rounded-[14px] px-3 py-1.5 outline-none focus:border-blue-500 w-full min-h-11"
                        />
                      ) : (
                        <h2 className="text-base font-semibold text-text-main truncate text-center">
                          {activeSection.title}
                        </h2>
                      )}
                    </div>

                    {/* Right Header Action (Edit / Save & Cancel) - min-w-11 min-h-11 for symmetry */}
                    <div className="min-w-11 min-h-11 flex items-center justify-end shrink-0">
                      {isEditMode ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="min-h-11 min-w-11 h-11 px-3 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="min-h-11 min-w-11 h-11 px-3.5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                            <span>Save</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleEnterEditMode}
                            className="min-h-11 min-w-11 h-11 px-3.5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas hover:border-blue-500/40 active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Edit3 size={15} className="text-blue-500" />
                            <span>Edit</span>
                          </button>

                          <SectionContextMenu
                            section={activeSection}
                            onEdit={() => {
                              setEditingSectionForModal(activeSection);
                              setIsSectionModalOpen(true);
                            }}
                            onDelete={() => {
                              setDeletingSection(activeSection);
                            }}
                            isCompact={false}
                            iconSize={18}
                            triggerClassName="w-11 h-11 min-w-11 min-h-11 rounded-[14px] bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main active:bg-canvas shadow-2xs cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Content (Full available screen L2 Container Card) */}
                  <div className="w-full bg-card border border-border-card rounded-[26px] p-5 sm:p-6 shadow-xs flex flex-col space-y-5">
                    <RichTextEditor
                      content={isEditMode ? draftContent : activeSection.content}
                      isEditable={isEditMode}
                      onChange={(html) => setDraftContent(html)}
                      userId={user?.id}
                    />

                    {/* Bottom Action Bar in Edit Mode for comfortable thumb reach */}
                    {isEditMode && (
                      <div className="pt-4 border-t border-border-card flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="flex-1 min-h-11 h-11 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex-1 min-h-11 h-11 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

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
