import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart2, 
  Settings, 
  Plus, 
  Moon, 
  Sun, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Lightbulb, 
  LogOut, 
  Loader2,
  BookMarked
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
  { icon: BarChart2, label: 'Stats', id: 'stats', href: '/stats' },
  { icon: Settings, label: 'Settings', id: 'settings', href: '/settings' },
];

export function Sidebar({ activeTab }: { activeTab: string }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

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

  // Auth & User state
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Modals state
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIdeaModalOpen] = useState(false);
  const [selectedIdeaForTrade, setSelectedIdeaForTrade] = useState<IdeaPayload | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Subscribe to Supabase auth state
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

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
        className="hidden md:flex flex-col bg-card border border-border-card rounded-[26px] h-[calc(100vh-2rem)] my-4 ml-4 shrink-0 shadow-sm relative overflow-visible z-20 select-none"
      >
        {/* Collapse Toggle */}
        <button 
          type="button"
          onClick={toggleCollapse}
          className="absolute -right-3.5 top-7 bg-card border border-border-card rounded-full p-1.5 text-text-muted hover:text-text-main shadow-sm z-30 cursor-pointer hover:scale-110 active:scale-95 transition-all"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        {/* Profile / Header */}
        <div className="px-3.5 py-3.5 border-b border-border-card flex items-center h-[76px] shrink-0">
          <div 
            onClick={() => {
              if (!user) {
                setAuthModalOpen(true);
              } else {
                window.location.href = '/settings';
              }
            }}
            className="w-full h-11 px-1.5 flex items-center rounded-[18px] hover:bg-canvas transition-colors cursor-pointer group relative"
            title={isCollapsed ? `${displayName} (${displayEmail})` : undefined}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 shrink-0 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20 relative">
              {avatarInitial}
              <span className={cn(
                "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-card",
                user ? "bg-emerald-500" : "bg-amber-500"
              )} />
            </div>

            <motion.div 
              initial={false}
              animate={{ 
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto',
                marginLeft: isCollapsed ? 0 : 10,
              }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden whitespace-nowrap min-w-0 flex-1"
            >
              <div className="font-semibold text-text-main text-sm truncate">
                {displayName}
              </div>
              <div className="text-xs text-text-muted truncate flex items-center gap-1 mt-0.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  user ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <span className="truncate">{user ? (user.email || 'Online') : 'Sign In / Guest'}</span>
              </div>
            </motion.div>

            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {displayName} {user?.email ? `(${user.email})` : '(Click to sign in)'}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden px-3.5 py-4 space-y-1.5 flex flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                data-astro-prefetch="load"
                className={cn(
                  "w-full h-11 flex items-center rounded-[18px] transition-colors relative group",
                  isCollapsed ? "justify-center px-0" : "px-1.5",
                  isActive 
                    ? "bg-canvas text-blue-500 font-semibold" 
                    : "text-text-muted hover:bg-canvas hover:text-text-main"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl">
                  <item.icon 
                    size={21} 
                    className={cn(
                      "transition-transform group-hover:scale-105",
                      isActive ? "text-blue-500" : "text-text-muted group-hover:text-text-main"
                    )} 
                  />
                </div>

                <motion.div
                  initial={false}
                  animate={{
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : 'auto',
                    marginLeft: isCollapsed ? 0 : 10,
                  }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden whitespace-nowrap min-w-0"
                >
                  <span className="text-sm font-medium block truncate">{item.label}</span>
                </motion.div>

                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </a>
            );
          })}
        </div>

        {/* Action Button, Theme Toggle & Logout */}
        <div className="px-3.5 py-3.5 border-t border-border-card space-y-1.5 shrink-0">
          <div className="relative">
            <AnimatePresence>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowAddMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute bottom-full mb-2 bg-card border border-border-card rounded-[20px] p-2 shadow-xl flex flex-col gap-1 z-30",
                      isCollapsed ? "left-full ml-4 min-w-[170px]" : "left-0 w-full"
                    )}
                  >
                    <button 
                      type="button"
                      onClick={() => { 
                        setSelectedIdeaForTrade(null);
                        setTradeModalOpen(true); 
                        setShowAddMenu(false); 
                      }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-[14px] text-text-main hover:bg-canvas transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Zap size={18} className="text-blue-500" />
                      </div>
                      <span className="font-medium text-sm whitespace-nowrap">Log Trade</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setIdeaModalOpen(true); setShowAddMenu(false); }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-[14px] text-text-main hover:bg-canvas transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <Lightbulb size={18} className="text-yellow-500" />
                      </div>
                      <span className="font-medium text-sm whitespace-nowrap">New Idea</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            {/* New Entry Trigger */}
            <button 
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full h-11 px-1.5 flex items-center bg-blue-500 text-white rounded-[18px] hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 relative z-30 group cursor-pointer"
              title={isCollapsed ? "New Entry" : undefined}
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl">
                <Plus size={22} className={cn("transition-transform duration-200", showAddMenu ? "rotate-45" : "group-hover:rotate-90")} />
              </div>
              <motion.div
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto',
                  marginLeft: isCollapsed ? 0 : 10,
                }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden whitespace-nowrap min-w-0"
              >
                <span className="text-sm font-semibold block truncate">New Entry</span>
              </motion.div>
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  New Entry
                </div>
              )}
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button 
            type="button"
            onClick={toggleTheme}
            className="w-full h-11 px-1.5 flex items-center text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] transition-colors group cursor-pointer relative"
            title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl">
              {theme === 'dark' ? (
                <Sun size={20} className="shrink-0 transition-transform group-hover:rotate-45" />
              ) : (
                <Moon size={20} className="shrink-0 transition-transform group-hover:-rotate-12" />
              )}
            </div>
            <motion.div
              initial={false}
              animate={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto',
                marginLeft: isCollapsed ? 0 : 10,
              }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden whitespace-nowrap min-w-0"
            >
              <span className="text-sm font-medium block truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </motion.div>
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </div>
            )}
          </button>

          {/* Logout / Sign In Button */}
          <button 
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full h-11 px-1.5 flex items-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/15 rounded-[18px] transition-colors group cursor-pointer relative disabled:opacity-50"
            title={isCollapsed ? (user ? "Log Out" : "Sign In") : undefined}
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl">
              {isLoggingOut ? (
                <Loader2 size={20} className="animate-spin text-red-500" />
              ) : (
                <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
              )}
            </div>
            <motion.div
              initial={false}
              animate={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto',
                marginLeft: isCollapsed ? 0 : 10,
              }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden whitespace-nowrap min-w-0"
            >
              <span className="text-sm font-medium block truncate">
                {isLoggingOut ? 'Signing out...' : user ? 'Log Out' : 'Sign In'}
              </span>
            </motion.div>
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-card border border-border-card text-text-main text-xs font-semibold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {user ? 'Log Out' : 'Sign In'}
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Connected Modals */}
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
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
}