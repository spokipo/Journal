import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart2, 
  Menu, 
  X, 
  Plus, 
  Lightbulb, 
  Zap, 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  Loader2,
  ChevronRight,
  BookMarked,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/useTheme';
import { lockBodyScroll } from '../lib/scrollLock';
import { AuthModal } from './Modals';
import { TradeModal } from './trade/TradeModal';
import { IdeaModal } from './trade/IdeaModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, href: '/', label: 'Dashboard' },
  { id: 'journal', icon: BookOpen, href: '/journal', label: 'Journal' },
  { id: 'add', isAdd: true },
  { id: 'stats', icon: BarChart2, href: '/stats', label: 'Stats' },
  { id: 'menu', icon: Menu, isMenu: true, label: 'Menu' },
];

const MENU_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { id: 'journal', icon: BookOpen, label: 'Journal', href: '/journal' },
  { id: 'playbook', icon: BookMarked, label: 'Playbook', href: '/playbook' },
  { id: 'system', icon: Cpu, label: 'System', href: '/system' },
  { id: 'stats', icon: BarChart2, label: 'Stats', href: '/stats' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
];

export function MobileTabBar({ activeTab }: { activeTab: string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { theme, toggleTheme } = useTheme();

  // Modals and Drawer state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIdeaModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Auth & User state
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      setIsLoggingOut(true);
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user
    ? (user.user_metadata?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader')
    : 'Trader Pro';
  const avatarInitial = (displayName[0] || 'T').toUpperCase();

  // Scroll detection to hide/show tab bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false);
        setShowAddMenu(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Lock body scroll via shared design system util
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    return lockBodyScroll();
  }, [isMobileMenuOpen]);

  // Keyboard accessibility: Escape closes open overlays
  useEffect(() => {
    if (!showAddMenu && !isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddMenu) setShowAddMenu(false);
        else if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddMenu, isMobileMenuOpen]);

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ y: isVisible && !isMobileMenuOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Action Sheet */}
        <AnimatePresence>
          {showAddMenu && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => setShowAddMenu(false)}
                aria-hidden="true"
              />
              <motion.div 
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[220px] bg-card border border-border-card rounded-[26px] p-2 shadow-2xl z-50 flex flex-col gap-1"
                role="menu"
                aria-label="Add options"
              >
                <button 
                  type="button"
                  onClick={() => { setTradeModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-[18px] text-text-main hover:bg-canvas transition-colors active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                >
                  <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500">
                    <Zap size={18} /> 
                  </div>
                  <span className="font-semibold text-sm">Log Trade</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setIdeaModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-[18px] text-text-main hover:bg-canvas transition-colors active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                >
                  <div className="w-9 h-9 rounded-[14px] bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                    <Lightbulb size={18} /> 
                  </div>
                  <span className="font-semibold text-sm">New Idea</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Tab Bar */}
        <div className="flex items-center justify-around h-16 px-2">
          {TABS.map((tab) => {
            if (tab.isAdd) {
              return (
                <div key="add" className="flex items-center justify-center h-full px-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddMenu((prev) => !prev);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "min-w-11 min-h-11 w-11 h-11 rounded-[18px] flex items-center justify-center transition-all active:scale-95 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 cursor-pointer",
                      showAddMenu 
                        ? "bg-rose-500 text-white rotate-45 shadow-rose-500/20" 
                        : "bg-blue-500 text-white shadow-blue-500/20"
                    )}
                    aria-label="Add entry"
                    aria-expanded={showAddMenu}
                  >
                    <Plus size={20} className="transition-transform duration-200" />
                  </button>
                </div>
              );
            }

            if (tab.isMenu) {
              const Icon = tab.icon!;
              return (
                <button
                  key="menu"
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(true);
                    setShowAddMenu(false);
                  }}
                  className={cn(
                    "min-w-11 min-h-11 w-16 h-full flex flex-col items-center justify-center transition-colors cursor-pointer active:scale-95 outline-none focus-visible:text-blue-500",
                    isMobileMenuOpen ? "text-blue-500" : "text-text-muted hover:text-text-main"
                  )}
                  aria-label="Open mobile menu"
                >
                  <Icon size={20} />
                  <span className="text-[0.6875rem] font-medium mt-1">Menu</span>
                </button>
              );
            }

            const Icon = tab.icon!;
            const isActive = activeTab === tab.id;

            return (
              <a
                key={tab.id}
                href={tab.href}
                data-astro-prefetch="load"
                className={cn(
                  "min-w-11 min-h-11 w-16 h-full flex flex-col items-center justify-center transition-colors active:scale-95 outline-none focus-visible:text-blue-500",
                  isActive ? "text-blue-500" : "text-text-muted hover:text-text-main"
                )}
                aria-label={tab.label}
              >
                <Icon size={20} />
                <span className={cn(
                  "text-[0.6875rem] mt-1",
                  isActive ? "font-semibold text-blue-500" : "font-medium text-text-muted"
                )}>
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </motion.div>

      {/* Mobile Full-Screen Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="md:hidden fixed inset-0 z-50 bg-canvas flex flex-col overflow-hidden text-text-main"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)'
            }}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
              <span className="text-xl font-bold text-text-main tracking-tight">Menu</span>
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-w-11 min-h-11 w-11 h-11 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main active:scale-95 transition-all shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Canvas */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-2 flex flex-col space-y-4 custom-scrollbar"
              style={{ 
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' 
              }}
            >
              {/* Profile Card Section */}
              <a 
                href={user ? "/settings?section=profile" : "#"}
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
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
                }}
                data-astro-prefetch="load"
                className="w-full p-4 flex items-center bg-card border border-border-card rounded-[26px] shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
              >
                <div className="w-11 h-11 rounded-full bg-blue-500/10 shrink-0 flex items-center justify-center text-blue-500 font-bold text-base border border-blue-500/20 relative overflow-hidden">
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
                <div className="ml-3.5 overflow-hidden flex-1 min-w-0">
                  <div className="font-semibold text-text-main text-sm truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-text-muted truncate flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      user ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                    <span className="truncate">{user ? (user.email || 'Online') : 'Sign In / Guest Trader'}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-text-muted group-hover:text-text-main transition-colors shrink-0 ml-2" />
              </a>

              {/* Navigation Group */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted px-2">
                  Navigation
                </div>
                <div className="bg-card border border-border-card rounded-[26px] p-2 space-y-1 shadow-sm">
                  {MENU_ITEMS.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        data-astro-prefetch="load"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "w-full min-h-11 px-3.5 flex items-center rounded-[18px] transition-all active:scale-[0.98] outline-none",
                          isActive 
                            ? "bg-blue-500/10 text-blue-500 font-semibold" 
                            : "text-text-muted hover:bg-canvas hover:text-text-main"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 shrink-0 flex items-center justify-center rounded-[14px] transition-colors",
                          isActive ? "text-blue-500" : "text-text-muted"
                        )}>
                          <item.icon size={18} />
                        </div>
                        <span className="ml-3 text-sm font-medium">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Preferences & Account */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted px-2">
                  Preferences & Account
                </div>
                <div className="bg-card border border-border-card rounded-[26px] p-2 space-y-1 shadow-sm">
                  {/* Theme Switcher */}
                  <button 
                    type="button"
                    onClick={toggleTheme}
                    className="w-full min-h-11 px-3.5 flex items-center justify-between rounded-[18px] text-text-muted hover:bg-canvas hover:text-text-main transition-colors cursor-pointer active:scale-[0.98] outline-none"
                  >
                    <div className="flex items-center">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[14px] bg-canvas text-text-muted">
                        {theme === 'dark' ? (
                          <Sun size={18} className="text-amber-500" />
                        ) : (
                          <Moon size={18} className="text-blue-500" />
                        )}
                      </div>
                      <span className="ml-3 text-sm font-medium text-text-main">Appearance</span>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-canvas border border-border-card text-text-muted">
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  <div className="h-px bg-border-card/60 mx-2" />

                  {/* Sign In / Sign Out */}
                  <button 
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full min-h-11 px-3.5 flex items-center justify-between rounded-[18px] text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50 outline-none"
                  >
                    <div className="flex items-center">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[14px] bg-rose-500/10 text-rose-500">
                        {isLoggingOut ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <LogOut size={18} />
                        )}
                      </div>
                      <span className="ml-3 text-sm font-semibold">
                        {isLoggingOut ? 'Signing out...' : user ? 'Log Out' : 'Sign In'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-rose-500/60" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <TradeModal isOpen={isTradeModalOpen} onClose={() => setTradeModalOpen(false)} user={user} />
      <IdeaModal isOpen={isIdeaModalOpen} onClose={() => setIdeaModalOpen(false)} user={user} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}