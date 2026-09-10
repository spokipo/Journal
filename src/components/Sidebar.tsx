import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart2, 
  Settings, 
  Plus, 
  Moon, 
  Sun, 
  ChevronLeft, 
  Zap, 
  Lightbulb, 
  LogOut, 
  Loader2,
  BookMarked,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/useTheme';
import { TradeModal } from './trade/TradeModal';
import { IdeaModal, type IdeaPayload } from './trade/IdeaModal';
import { AuthModal } from './Modals';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', href: '/' },
  { icon: BookOpen, label: 'Journal', id: 'journal', href: '/journal' },
  { icon: BookMarked, label: 'Playbook', id: 'playbook', href: '/playbook' },
  { icon: Cpu, label: 'System', id: 'system', href: '/system' },
  { icon: BarChart2, label: 'Stats', id: 'stats', href: '/stats' },
  { icon: Settings, label: 'Settings', id: 'settings', href: '/settings' },
];

const getTabFromPath = (path: string, fallback: string) => {
  if (path === '/') return 'dashboard';
  if (path.startsWith('/journal')) return 'journal';
  if (path.startsWith('/playbook')) return 'playbook';
  if (path.startsWith('/system')) return 'system';
  if (path.startsWith('/stats')) return 'stats';
  if (path.startsWith('/settings')) return 'settings';
  return fallback;
};

export function Sidebar({ activeTab }: { activeTab: string }) {
  // Стартуем одинаково на сервере и клиенте во избежание Hydration mismatch
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed') === 'true';
      if (saved) setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const { theme, toggleTheme } = useTheme();
  const [selectedTab, setSelectedTab] = useState(activeTab);

  // Синхронизация с переходами Astro через ClientRouter
  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== 'undefined') {
        setSelectedTab(getTabFromPath(window.location.pathname, activeTab));
      }
    };

    syncTab();
    document.addEventListener('astro:after-swap', syncTab);
    document.addEventListener('astro:page-load', syncTab);
    window.addEventListener('popstate', syncTab);

    return () => {
      document.removeEventListener('astro:after-swap', syncTab);
      document.removeEventListener('astro:page-load', syncTab);
      window.removeEventListener('popstate', syncTab);
    };
  }, [activeTab]);

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Modals state
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIdeaModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<IdeaPayload | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showAddMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddMenu]);

  const handleLogout = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      setIsLoggingOut(true);
      if (isSupabaseConfigured) await supabase.auth.signOut();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setAuthModalOpen(true);
      return;
    }
    if (typeof window !== 'undefined' && window.location.pathname === '/settings') {
      e.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.set('section', 'profile');
      window.history.pushState({ section: 'profile' }, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const displayName = user
    ? (user.user_metadata?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader')
    : 'Trader Pro';
  const displayEmail = user?.email || 'Guest Mode';
  const avatarInitial = (displayName[0] || 'T').toUpperCase();

  return (
    <>
      <LayoutGroup id="desktop-sidebar-root">
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 80 : 280 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className="hidden md:flex flex-col bg-card border border-border-card rounded-[26px] h-[calc(100dvh-2rem)] my-4 ml-4 shrink-0 shadow-sm relative overflow-visible z-20 select-none"
        >
          {/* Collapse Toggle Button */}
          <button 
            type="button"
            onClick={toggleCollapse}
            className="absolute -right-3.5 top-7 w-7 h-7 bg-card border border-border-card rounded-full flex items-center justify-center text-text-muted hover:text-text-main shadow-sm z-30 cursor-pointer active:scale-90 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center"
            >
              <ChevronLeft size={14} />
            </motion.div>
          </button>

          {/* Profile Header */}
          <div className="p-3 border-b border-border-card flex items-center h-[72px] shrink-0">
            <a 
              href={user ? "/settings?section=profile" : "#"}
              onClick={handleProfileClick}
              data-astro-prefetch="hover"
              className={cn(
                "w-full h-11 flex items-center rounded-[18px] hover:bg-canvas transition-colors cursor-pointer group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
                isCollapsed ? "justify-center px-0" : "px-2"
              )}
              title={isCollapsed ? `${displayName} (${displayEmail})` : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 shrink-0 flex items-center justify-center text-blue-500 font-bold text-sm border border-blue-500/20 relative overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  avatarInitial
                )}
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden whitespace-nowrap min-w-0 flex-1 ml-3"
                  >
                    <div className="font-semibold text-text-main text-sm truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-text-muted truncate flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        user ? "bg-emerald-500" : "bg-amber-500"
                      )} />
                      <span className="truncate">{user ? (user.email || 'Online') : 'Sign In / Guest'}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-[14px] shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                  {displayName} {user?.email ? `(${user.email})` : '(Click to sign in)'}
                </div>
              )}
            </a>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-hidden p-3 space-y-1 flex flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive = selectedTab === item.id;
              const Icon = item.icon;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  data-astro-prefetch="hover"
                  onClick={() => setSelectedTab(item.id)}
                  className={cn(
                    "relative w-full h-11 flex items-center rounded-[18px] transition-colors outline-none group select-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500/20",
                    isCollapsed ? "justify-center px-0" : "px-2.5",
                    isActive ? "text-blue-500" : "text-text-muted hover:text-text-main"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-sidebar-active-indicator"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      className="absolute inset-0 rounded-[18px] bg-canvas border border-border-card/80 shadow-sm"
                    />
                  )}

                  <div className="w-9 h-9 shrink-0 flex items-center justify-center relative z-10">
                    <Icon 
                      size={20} 
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-105",
                        isActive ? "text-blue-500" : "text-text-muted group-hover:text-text-main"
                      )} 
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          "overflow-hidden whitespace-nowrap min-w-0 ml-2.5 text-sm relative z-10 truncate",
                          isActive ? "font-semibold text-blue-500" : "font-medium text-text-muted"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-[14px] shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </a>
              );
            })}
          </div>

          {/* Controls Footer */}
          <div className="p-3 border-t border-border-card space-y-1 shrink-0">
            <div className="relative">
              <AnimatePresence>
                {showAddMenu && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-30 cursor-default" 
                      onClick={() => setShowAddMenu(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "absolute bottom-full mb-3 bg-card border border-border-card rounded-[26px] p-2 shadow-2xl flex flex-col gap-1 z-40",
                        isCollapsed ? "left-full ml-3 w-[200px]" : "left-0 w-full"
                      )}
                      role="menu"
                    >
                      <button 
                        type="button"
                        onClick={() => { 
                          setSelectedIdeaForTrade(null);
                          setTradeModalOpen(true); 
                          setShowAddMenu(false); 
                        }}
                        className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-[18px] text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      >
                        <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500">
                          <Zap size={18} />
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap">Log Trade</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => { 
                          setIdeaModalOpen(true); 
                          setShowAddMenu(false); 
                        }}
                        className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-[18px] text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      >
                        <div className="w-9 h-9 rounded-[14px] bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                          <Lightbulb size={18} />
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap">New Idea</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              
              <button 
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={cn(
                  "w-full h-11 flex items-center bg-blue-500 text-white rounded-[18px] hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 relative z-30 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                  isCollapsed ? "justify-center px-0" : "px-2.5"
                )}
                title={isCollapsed ? "New Entry" : undefined}
                aria-expanded={showAddMenu}
              >
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                  <Plus size={20} className={cn("transition-transform duration-200", showAddMenu && "rotate-45")} />
                </div>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap min-w-0 ml-2.5 text-sm font-semibold truncate"
                    >
                      New Entry
                    </motion.span>
                  )}
                </AnimatePresence>
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-[14px] shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                    New Entry
                  </div>
                )}
              </button>
            </div>

            <button 
              type="button"
              onClick={toggleTheme}
              className={cn(
                "w-full h-11 flex items-center text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] transition-colors group cursor-pointer relative active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
                isCollapsed ? "justify-center px-0" : "px-2.5"
              )}
              title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
            >
              <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Sun size={20} className="shrink-0 transition-transform group-hover:rotate-45 text-amber-500" />
                ) : (
                  <Moon size={20} className="shrink-0 transition-transform group-hover:-rotate-12 text-blue-500" />
                )}
              </div>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden whitespace-nowrap min-w-0 ml-2.5 text-sm font-medium truncate"
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-[14px] shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </div>
              )}
            </button>

            <button 
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "w-full h-11 flex items-center text-rose-500 hover:bg-rose-500/10 rounded-[18px] transition-colors group cursor-pointer relative disabled:opacity-50 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20",
                isCollapsed ? "justify-center px-0" : "px-2.5"
              )}
              title={isCollapsed ? (user ? "Log Out" : "Sign In") : undefined}
            >
              <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                {isLoggingOut ? (
                  <Loader2 size={20} className="animate-spin text-rose-500" />
                ) : (
                  <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                )}
              </div>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden whitespace-nowrap min-w-0 ml-2.5 text-sm font-medium truncate"
                  >
                    {isLoggingOut ? 'Signing out...' : user ? 'Log Out' : 'Sign In'}
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-[14px] shadow-lg opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                  {user ? 'Log Out' : 'Sign In'}
                </div>
              )}
            </button>
          </div>
        </motion.aside>
      </LayoutGroup>

      <TradeModal 
        isOpen={isTradeModalOpen} 
        user={user}
        sourceIdea={selectedIdeaForTrade}
        onClose={() => {
          setTradeModalOpen(false);
          setSelectedIdeaForTrade(null);
        }} 
      />

      <IdeaModal 
        isOpen={isIdeaModalOpen} 
        user={user}
        onClose={() => setIdeaModalOpen(false)} 
        onConvertToTrade={(idea) => {
          setSelectedIdeaForTrade(idea);
          setIdeaModalOpen(false);
          setTradeModalOpen(true);
        }}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
}