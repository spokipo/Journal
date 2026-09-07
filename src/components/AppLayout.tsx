import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppLayoutProps {
  activeTab?: string;
  children?: React.ReactNode;
}

export function AppLayout({ activeTab = 'dashboard', children }: AppLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
      <div className="min-h-screen bg-canvas text-text-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text-main flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar (Floating on the left) */}
      <Sidebar activeTab={activeTab} />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-scroll overflow-x-hidden p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar (Bottom) */}
      <MobileTabBar activeTab={activeTab} />
    </div>
  );
}
