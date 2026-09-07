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
  BookMarked
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/useTheme';
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
  const displayEmail = user?.email || 'Guest Mode';
  const avatarInitial = (displayName[0] || 'T').toUpperCase();

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

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ y: isVisible && !isMobileMenuOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Popover Action Sheet (New Entry) */}
        <AnimatePresence>
          {showAddMenu && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowAddMenu(false)}
              />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[220px] bg-card border border-border-card rounded-[22px] p-2.5 shadow-2xl z-50 flex flex-col gap-1.5"
              >
                <button 
                  onClick={() => { setTradeModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-[16px] text-text-main hover:bg-canvas transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-blue-500" /> 
                  </div>
                  <span className="font-semibold text-sm">Log Trade</span>
                </button>
                <button 
                  onClick={() => { setIdeaModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-[16px] text-text-main hover:bg-canvas transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Lightbulb size={20} className="text-yellow-500" /> 
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
                      setShowAddMenu(!showAddMenu);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "h-11 w-11 rounded-[18px] flex items-center justify-center transition-all active:scale-95 shadow-sm",
                      showAddMenu 
                        ? "bg-red-500 text-white rotate-45 shadow-red-500/20" 
                        : "bg-blue-500 text-white shadow-blue-500/20"
                    )}
                    aria-label="Add entry"
                  >
                    <Plus size={22} className="transition-transform duration-200" />
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
                    "flex flex-col items-center justify-center w-16 h-full transition-colors cursor-pointer active:scale-95",
                    isMobileMenuOpen ? "text-blue-500" : "text-text-muted hover:text-text-main"
                  )}
                  aria-label="Open mobile menu"
                >
                  <Icon size={24} />
                  <span className="text-[10px] font-medium mt-0.5">Menu</span>
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
                  "flex flex-col items-center justify-center w-16 h-full transition-colors active:scale-95",
                  isActive ? "text-blue-500" : "text-text-muted hover:text-text-main"
                )}
                aria-label={tab.label}
              >
                <Icon size={24} />
                <span className={cn(
                  "text-[10px] mt-0.5",
                  isActive ? "font-semibold text-blue-500" : "font-medium text-text-muted"
                )}>
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </motion.div>

      {/* Mobile Full-Screen Burger Menu (Единый бесшовный полноэкранный стиль) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)'
            }}
          >
            {/* Top Bar: Title & Close Button */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
              <span className="text-xl font-bold text-text-main tracking-tight">Menu</span>
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main active:scale-90 transition-all shadow-sm cursor-pointer"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Single Canvas */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-2 flex flex-col space-y-5"
              style={{ 
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' 
              }}
            >
              {/* Profile Card Section */}
              <div 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    window.location.href = '/settings';
                  }
                }}
                className="w-full p-4 flex items-center bg-card border border-border-card rounded-[24px] shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/10 shrink-0 flex items-center justify-center text-blue-500 font-bold text-lg border border-blue-500/20 relative">
                  {avatarInitial}
                  <span className={cn(
                    "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-card",
                    user ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                </div>
                <div className="ml-4 overflow-hidden flex-1 min-w-0">
                  <div className="font-semibold text-text-main text-base truncate">
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
              </div>

              {/* Navigation Group */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted px-2">
                  Navigation
                </div>
                <div className="bg-card border border-border-card rounded-[24px] p-2 space-y-1 shadow-sm">
                  {MENU_ITEMS.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        data-astro-prefetch="load"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "w-full h-13 px-3.5 flex items-center rounded-[18px] transition-all active:scale-[0.98]",
                          isActive 
                            ? "bg-blue-500/10 text-blue-500 font-semibold" 
                            : "text-text-muted hover:bg-canvas hover:text-text-main"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-colors",
                          isActive ? "text-blue-500" : "text-text-muted"
                        )}>
                          <item.icon size={20} />
                        </div>
                        <span className="ml-3 text-[15px] font-medium">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Preferences & Account Section (Цельный стиль без раздельной нижней плашки) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted px-2">
                  Preferences & Account
                </div>
                <div className="bg-card border border-border-card rounded-[24px] p-2 space-y-1 shadow-sm">
                  {/* Theme Appearance Switcher */}
                  <button 
                    type="button"
                    onClick={toggleTheme}
                    className="w-full h-13 px-3.5 flex items-center justify-between rounded-[18px] text-text-muted hover:bg-canvas hover:text-text-main transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-canvas text-text-muted">
                        {theme === 'dark' ? (
                          <Sun size={20} className="text-amber-500" />
                        ) : (
                          <Moon size={20} className="text-blue-500" />
                        )}
                      </div>
                      <span className="ml-3 text-[15px] font-medium text-text-main">Appearance</span>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-canvas border border-border-card text-text-muted">
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-border-card/60 mx-2" />

                  {/* Logout / Sign In Action */}
                  <button 
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full h-13 px-3.5 flex items-center justify-between rounded-[18px] text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        {isLoggingOut ? (
                          <Loader2 size={18} className="animate-spin text-red-500" />
                        ) : (
                          <LogOut size={18} className="text-red-500" />
                        )}
                      </div>
                      <span className="ml-3 text-[15px] font-semibold text-red-500">
                        {isLoggingOut ? 'Signing out...' : user ? 'Log Out' : 'Sign In'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-red-500/60" />
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
