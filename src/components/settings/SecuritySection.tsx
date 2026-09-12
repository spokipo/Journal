import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, LogOut, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function SecuritySection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMessage({
        type: 'error',
        text: 'Password must be at least 6 characters.',
      });
      return;
    }

    setIsPasswordUpdating(true);
    setSecurityMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecurityMessage({
        type: 'success',
        text: 'Password updated successfully!',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({
        type: 'error',
        text: err.message || 'Failed to update password.',
      });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4 bg-canvas border border-border-card rounded-[18px] p-5 sm:p-6"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text-main">
            Change Password
          </h3>
          <p className="text-xs text-text-muted">
            Update your authentication credentials
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-new-pass"
              className="text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              New Password
            </label>
            <input
              id="settings-new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 bg-card border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-confirm-pass"
              className="text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Confirm Password
            </label>
            <input
              id="settings-confirm-pass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 bg-card border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Repeat new password"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPasswordUpdating}
              className="h-10 px-5 flex items-center justify-center gap-2 bg-blue-500 border border-blue-500 text-white rounded-full font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isPasswordUpdating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Key size={15} />
              )}
              <span>Update Password</span>
            </button>

            {securityMessage && (
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-medium",
                  securityMessage.type === 'success'
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                )}
              >
                {securityMessage.type === 'success' ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : (
                  <AlertCircle size={16} className="shrink-0" />
                )}
                <span>{securityMessage.text}</span>
              </div>
            )}
          </div>
        </form>
      </motion.div>

      {/* Session Sign Out Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 bg-canvas border border-border-card rounded-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <div className="text-sm font-semibold text-text-main">
            Sign Out of Account
          </div>
          <div className="text-xs text-text-muted">
            Terminate your active session on this device
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="h-10 px-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 active:scale-[0.98] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </motion.div>
    </div>
  );
}
