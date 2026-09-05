import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, BarChart2, Settings, Plus, Moon, Sun, ChevronRight, ChevronLeft, Zap, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/useTheme';
import { TradeModal, IdeaModal } from './Modals';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', href: '/' },
  { icon: BookOpen, label: 'Journal', id: 'journal', href: '/journal' },
  { icon: BarChart2, label: 'Stats', id: 'stats', href: '/stats' },
  { icon: Settings, label: 'Settings', id: 'settings', href: '/settings' },
];

export function Sidebar({ activeTab }: { activeTab: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Modals state
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIdeaModalOpen] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="hidden md:flex flex-col bg-card border border-border-card rounded-[26px] h-[calc(100vh-2rem)] my-4 ml-4 shrink-0 shadow-sm relative overflow-visible z-20"
      >
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-card border border-border-card rounded-full p-1 text-text-muted hover:text-text-main shadow-sm z-30"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Profile / Header */}
        <div className="p-6 border-b border-border-card flex items-center overflow-hidden h-[88px] shrink-0">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 shrink-0 flex items-center justify-center text-blue-500 font-bold">
            T
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="ml-3 whitespace-nowrap"
            >
              <div className="font-semibold text-text-main">Trader Pro</div>
              <div className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Market Open
              </div>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 flex flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center rounded-[18px] transition-colors overflow-hidden",
                  isCollapsed ? "justify-center p-3" : "px-4 py-3",
                  isActive 
                    ? "bg-canvas text-blue-500" 
                    : "text-text-muted hover:bg-canvas hover:text-text-main"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={22} className="shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>
                )}
              </a>
            );
          })}
        </div>

        {/* Action Button & Theme Toggle */}
        <div className="p-4 border-t border-border-card space-y-4">
          <div className="relative">
            {/* Popover Menu for Add */}
            <AnimatePresence>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowAddMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute bottom-full mb-2 bg-canvas border border-border-card rounded-[18px] p-2 shadow-lg flex flex-col gap-1 z-30",
                      isCollapsed ? "left-full ml-4 min-w-[160px]" : "left-0 w-full"
                    )}
                  >
                    <button 
                      onClick={() => { setTradeModalOpen(true); setShowAddMenu(false); }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-[12px] text-text-main hover:bg-card transition-colors"
                    >
                      <Zap size={18} className="text-blue-500 shrink-0" /> 
                      <span className="font-medium text-sm whitespace-nowrap">Log Trade</span>
                    </button>
                    <button 
                      onClick={() => { setIdeaModalOpen(true); setShowAddMenu(false); }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-[12px] text-text-main hover:bg-card transition-colors"
                    >
                      <Lightbulb size={18} className="text-yellow-500 shrink-0" /> 
                      <span className="font-medium text-sm whitespace-nowrap">New Idea</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={cn(
                "w-full flex items-center justify-center bg-blue-500 text-white rounded-[18px] hover:bg-blue-600 active:scale-95 transition-all shadow-sm relative z-30",
                isCollapsed ? "p-3" : "py-3 px-4"
              )}
            >
              <Plus size={22} className="shrink-0" />
              {!isCollapsed && <span className="ml-2 font-semibold">New Entry</span>}
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center text-text-muted hover:text-text-main transition-colors",
              isCollapsed ? "justify-center p-3" : "px-4 py-2"
            )}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={22} className="shrink-0" /> : <Moon size={22} className="shrink-0" />}
            {!isCollapsed && <span className="ml-3 font-medium text-sm whitespace-nowrap">Toggle Theme</span>}
          </button>
        </div>
      </motion.aside>

      <TradeModal isOpen={isTradeModalOpen} onClose={() => setTradeModalOpen(false)} />
      <IdeaModal isOpen={isIdeaModalOpen} onClose={() => setIdeaModalOpen(false)} />
    </>
  );
}
