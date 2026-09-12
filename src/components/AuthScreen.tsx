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
      className={isModal ? "w-full" : "w-full max-w-md bg-card border border-border-card rounded-[26px] p-6 sm:p-8 shadow-xl shadow-black/[0.04] dark:shadow-black/30"}
    >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            {mode === 'login'
              ? 'Welcome back! Enter your details to access your journal.'
              : 'Start your professional trading journey with a clear edge.'}
          </p>
        </div>

        {/* Tab Switcher (§2, §4) */}
        <div className="bg-canvas p-1 rounded-full border border-border-card grid grid-cols-2 relative mb-6 h-11 items-center">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`relative h-9 text-xs font-semibold rounded-full transition-colors cursor-pointer z-10 flex items-center justify-center ${
              mode === 'login' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {mode === 'login' && (
              <motion.div
                layoutId="auth-tab-pill-screen"
                transition={{ type: 'spring', bounce: 0.16, duration: 0.4 }}
                className="absolute inset-0 bg-card rounded-full shadow-xs border border-border-card"
              />
            )}
            <span className="relative z-10">Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('signup')}
            className={`relative h-9 text-xs font-semibold rounded-full transition-colors cursor-pointer z-10 flex items-center justify-center ${
              mode === 'signup' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {mode === 'signup' && (
              <motion.div
                layoutId="auth-tab-pill-screen"
                transition={{ type: 'spring', bounce: 0.16, duration: 0.4 }}
                className="absolute inset-0 bg-card rounded-full shadow-xs border border-border-card"
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
                <div className="space-y-2 pb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Trader Nickname
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      required={mode === 'signup'}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Maverick"
                      className="w-full bg-canvas border border-border-card hover:border-blue-500/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[18px] pl-10 pr-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted transition-all duration-150 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Address */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-canvas border border-border-card hover:border-blue-500/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[18px] pl-10 pr-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted transition-all duration-150 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-canvas border border-border-card hover:border-blue-500/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[18px] pl-10 pr-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted transition-all duration-150 outline-none"
              />
            </div>
          </div>

          {/* Error Message Alert (§2 Status rose-500) */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium px-3.5 py-2.5 rounded-[14px]">
                  {errorMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message Alert (§2 Status emerald-500) */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium px-3.5 py-2.5 rounded-[14px]">
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button (§4 Button: rounded-full, h-11 mobile / h-10 desktop, bg-blue-500 border border-blue-500) */}
          <button
            type="submit"
            disabled={loading || !email || !password || (mode === 'signup' && !nickname.trim())}
            className="w-full h-11 md:h-10 bg-blue-500 border border-blue-500 text-white font-semibold rounded-full shadow-sm shadow-blue-500/20 hover:bg-blue-600 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        <div className="mt-6 text-center text-xs text-text-muted flex items-center justify-center flex-wrap gap-1">
          <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
          <button
            type="button"
            onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
            className="px-3 py-1 rounded-full bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 font-semibold cursor-pointer ml-1 inline-flex items-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
    <div className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Top-Right Theme Toggle (§4 Button: rounded-full w-11 h-11 mobile / w-10 h-10 desktop) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="w-11 h-11 md:w-10 md:h-10 rounded-full border border-border-card bg-card text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 transition-transform hover:rotate-45 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 transition-transform hover:-rotate-12 text-blue-500" />
          )}
        </button>
      </div>
      {content}
    </div>
  );
}

