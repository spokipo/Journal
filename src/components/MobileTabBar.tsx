import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, BarChart2, Settings, Plus, Lightbulb, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { TradeModal, IdeaModal } from './Modals';

const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'journal', icon: BookOpen, href: '/journal' },
  { id: 'add', isAdd: true },
  { id: 'stats', icon: BarChart2, href: '/stats' },
  { id: 'settings', icon: Settings, href: '/settings' },
];

export function MobileTabBar({ activeTab }: { activeTab: string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isIdeaModalOpen, setIdeaModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false);
        setShowAddMenu(false); // close menu if scrolling down
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ y: isVisible ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Popover Action Sheet */}
        <AnimatePresence>
          {showAddMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[200px] bg-canvas border border-border-card rounded-[18px] p-2 shadow-xl z-50 flex flex-col gap-1"
              >
                <button 
                  onClick={() => { setTradeModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-[12px] text-text-main hover:bg-card transition-colors"
                >
                  <Zap size={20} className="text-blue-500 shrink-0" /> 
                  <span className="font-medium">Log Trade</span>
                </button>
                <button 
                  onClick={() => { setIdeaModalOpen(true); setShowAddMenu(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-[12px] text-text-main hover:bg-card transition-colors"
                >
                  <Lightbulb size={20} className="text-yellow-500 shrink-0" /> 
                  <span className="font-medium">New Idea</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-around h-16 px-2">
          {TABS.map((tab) => {
            if (tab.isAdd) {
              return (
                <div key="add" className="flex items-center justify-center h-full px-2">
                  <button 
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className={cn(
                      "h-11 w-11 rounded-[18px] flex items-center justify-center transition-all active:scale-95",
                      showAddMenu 
                        ? "bg-red-500 text-white shadow-md rotate-45" 
                        : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                    )}
                  >
                    <Plus size={24} />
                  </button>
                </div>
              );
            }

            const Icon = tab.icon!;
            const isActive = activeTab === tab.id;

            return (
              <a
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full transition-colors",
                  isActive ? "text-blue-500" : "text-text-muted hover:text-text-main"
                )}
              >
                <Icon size={24} className={isActive ? "fill-blue-500/10" : ""} />
              </a>
            );
          })}
        </div>
      </motion.div>

      <TradeModal isOpen={isTradeModalOpen} onClose={() => setTradeModalOpen(false)} />
      <IdeaModal isOpen={isIdeaModalOpen} onClose={() => setIdeaModalOpen(false)} />
    </>
  );
}
