import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';

interface AppLayoutProps {
  activeTab?: string;
  children?: React.ReactNode;
}

export function AppLayout({ activeTab = 'dashboard', children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas text-text-main flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar (Floating on the left) */}
      <Sidebar activeTab={activeTab} />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar (Bottom) */}
      <MobileTabBar activeTab={activeTab} />
    </div>
  );
}
