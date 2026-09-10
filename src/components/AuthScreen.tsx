import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Sun, Moon, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/useTheme';
import { useLocation } from 'wouter';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  onToggleTheme?: () => void;
  onSuccess?: () => void;
  isModal?: boolean;
}

export function AuthScreen({ onToggleTheme, onSuccess, isModal = false }: AuthScreenProps) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated and not modal, redirect to home
  useEffect(() => {
    if (!isSupabaseConfigured || isModal) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLocation('/');
      }
    });
  }, [isModal, setLocation]);

  // Hook for current theme state and fallback toggle
  const { theme, toggleTheme: localToggleTheme } = useTheme();

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      localToggleTheme();
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase is not configured. Please check your environment variables.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (onSuccess) {
          onSuccess();
        } else {
          setLocation('/');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nickname: nickname.trim(),
            },
          },
        });

        if (error) throw error;

        setSuccessMsg('Account created successfully! Check your email to confirm your account.');
        if (onSuccess) {
          onSuccess();
        } else {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setLocation('/');
            }
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: isModal ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={isModal ? "w-full" : "w-full max-w-md bg-card border border-border/60 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/[0.04] dark:shadow-black/30"}
    >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {mode === 'login'
              ? 'Welcome back! Enter your details to access your journal.'
              : 'Start your professional trading journey with a clear edge.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-muted/60 p-1 rounded-xl border border-border/40 grid grid-cols-2 relative mb-6">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`relative py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer z-10 ${
              mode === 'login' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'login' && (
              <motion.div
                layoutId="auth-tab-pill-screen"
                transition={{ type: 'spring', bounce: 0.16, duration: 0.4 }}
                className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
              />
            )}
            <span className="relative z-10">Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('signup')}
            className={`relative py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer z-10 ${
              mode === 'signup' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'signup' && (
              <motion.div
                layoutId="auth-tab-pill-screen"
                transition={{ type: 'spring', bounce: 0.16, duration: 0.4 }}
                className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
              />
            )}
            <span className="relative z-10">Create Account</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trader Nickname (Only visible in signup mode) */}
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                key="trader-nickname-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Trader Nickname
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      required={mode === 'signup'}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Maverick"
                      className="w-full bg-background border border-border/70 hover:border-foreground/20 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all duration-150 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-background border border-border/70 hover:border-foreground/20 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all duration-150 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border/70 hover:border-foreground/20 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all duration-150 outline-none"
              />
            </div>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium px-3.5 py-2.5 rounded-xl">
                  {errorMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message Alert */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium px-3.5 py-2.5 rounded-xl">
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password || (mode === 'signup' && !nickname.trim())}
            className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
            className="text-foreground hover:underline font-semibold cursor-pointer ml-1"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </motion.div>
  );

  if (isModal) {
    return content;
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Top-Right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2.5 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border transition-colors shadow-sm cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-5 h-5 transition-transform hover:-rotate-12" />
          )}
        </button>
      </div>
      {content}
    </div>
  );
}

