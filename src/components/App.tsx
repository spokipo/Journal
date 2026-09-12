import React, { useEffect, useState } from 'react';
import { Switch, Route, useLocation, Redirect } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { Dashboard } from './Dashboard';
import { JournalView } from './journal/JournalView';
import { PlaybookView } from './playbook/PlaybookView';
import { SystemView } from './system/SystemView';
import { StatsView } from './stats/StatsView';
import { SettingsView } from './settings/SettingsView';
import { AuthScreen } from './AuthScreen';
import { AdvisorChat } from './advisor/AdvisorChat';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const checkInitialAuth = (): boolean => {
  if (!isSupabaseConfigured) return true;
  if (typeof window === 'undefined') return false;
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
  } catch {
    return false;
  }
};

export function App() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(checkInitialAuth);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(isSupabaseConfigured);

  // Sync Supabase authentication state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthenticated(true);
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session?.user));
      setIsAuthLoading(false);
    }).catch(() => {
      setIsAuthenticated(false);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = Boolean(session?.user);
      setIsAuthenticated(authed);
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Reset scroll on #main-scroll-container on route change
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [location]);

  const isLoginPage = location === '/login' || location.startsWith('/login');

  // Auth guarding
  if (!isAuthLoading) {
    if (!isAuthenticated && !isLoginPage) {
      return <Redirect to="/login" />;
    }
    if (isAuthenticated && isLoginPage) {
      return <Redirect to="/" />;
    }
  }

  const showShell = !isLoginPage && isAuthenticated;

  return (
    <div
      className={
        showShell
          ? "min-h-dvh h-dvh bg-canvas text-text-main flex flex-col md:flex-row overflow-hidden"
          : "min-h-dvh h-dvh bg-canvas text-text-main flex flex-col overflow-hidden"
      }
    >
      {showShell && <Sidebar />}

      <main
        id="main-scroll-container"
        className={
          showShell
            ? "flex-1 h-full overflow-y-auto overflow-x-hidden p-4 pb-28 md:p-6 md:pb-6 lg:p-8 lg:pb-8"
            : "flex-1 h-full overflow-y-auto overflow-x-hidden"
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={showShell ? "max-w-6xl mx-auto min-h-full" : "w-full min-h-full"}
          >
            <Switch location={location}>
              <Route path="/" component={Dashboard} />
              <Route path="/journal" component={JournalView} />
              <Route path="/playbook" component={PlaybookView} />
              <Route path="/system" component={SystemView} />
              <Route path="/stats" component={StatsView} />
              <Route path="/settings" component={SettingsView} />
              <Route path="/login" component={AuthScreen} />
              <Route>
                <Redirect to="/" />
              </Route>
            </Switch>
          </motion.div>
        </AnimatePresence>
      </main>

      {showShell && <MobileTabBar />}
      {showShell && <AdvisorChat />}
    </div>
  );
}

