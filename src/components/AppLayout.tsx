import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppLayoutProps {
  activeTab?: string;
  children?: React.ReactNode;
}

export function AppLayout({ activeTab = 'dashboard', children }: AppLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (!isSupabaseConfigured) return true;
    if (typeof window !== 'undefined') {
      try {
        const hasAuth = Object.keys(localStorage).some(
          (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (hasAuth) return true;
      } catch (e) {}
    }
    return null;
  });

  const mainRef = useRef<HTMLElement>(null);

  // Smoothly reset scroll on page / tab change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthenticated(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.href = '/login';
      } else {
        setIsAuthenticated(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        window.location.href = '/login';
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isSupabaseConfigured && isAuthenticated === null) {
    return (
      <div className="min-h-dvh bg-canvas text-text-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh h-dvh bg-canvas text-text-main flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar (Floating on the left) */}
      <Sidebar activeTab={activeTab} />

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 pb-24 md:p-6 md:pb-6 lg:p-8 lg:pb-8"
      >
        <div className="max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar (Bottom) */}
      <MobileTabBar activeTab={activeTab} />
    </div>
  );
}
