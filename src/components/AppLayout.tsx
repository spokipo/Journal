import React, { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppLayoutProps {
  activeTab?: string;
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <>{children}</>;
}