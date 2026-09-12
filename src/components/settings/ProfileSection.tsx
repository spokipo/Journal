import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { optimizeImage } from '../../lib/imageOptimizer';

interface ProfileSectionProps {
  user: any;
  onUserUpdate?: (user: any) => void;
}

export function ProfileSection({ user, onUserUpdate }: ProfileSectionProps) {
  const [profileNickname, setProfileNickname] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileNickname(
        user.user_metadata?.nickname || user.user_metadata?.full_name || ''
      );
      setProfileEmail(user.email || '');
      setProfileAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsProfileUpdating(true);
    setProfileMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: profileNickname.trim() || user.user_metadata?.full_name || '',
        },
      });
      if (error) throw error;
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1000);
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.message || 'Failed to update profile',
      });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setIsProfileUpdating(true);
      setProfileMessage(null);

      let uploadPayload: Blob | File = file;
      let fileExt = file.name.split('.').pop() || 'png';
      let contentType = file.type || 'image/jpeg';
      try {
        uploadPayload = await optimizeImage(file, 512, 0.85);
        fileExt = 'webp';
        contentType = 'image/webp';
      } catch (optErr) {
        console.warn('Avatar optimization fallback to original:', optErr);
      }

      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadPayload, {
          contentType,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      if (updateData?.user) {
        onUserUpdate?.(updateData.user);
      }
      setProfileAvatarUrl(publicUrl);
      setProfileMessage({ type: 'success', text: 'Avatar updated!' });
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      let errorMsg = err.message || 'Failed to upload avatar';
      if (
        errorMsg.includes('row-level security') ||
        errorMsg.includes('policy') ||
        errorMsg.includes('violates')
      ) {
        errorMsg =
          'Storage permission error (RLS). Please apply the "avatars" bucket migration in your Supabase SQL Editor.';
      }
      setProfileMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsProfileUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-canvas border border-border-card rounded-[18px] p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar circle (Pill) */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-canvas border-2 border-border-card overflow-hidden group shadow-xs">
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-text-muted bg-blue-500/10">
                  {profileNickname?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    'U'}
                </div>
              )}
              {isProfileUpdating && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 rounded-full">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
              <label
                aria-label="Upload avatar image"
                className={cn(
                  "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full",
                  isProfileUpdating && "pointer-events-none opacity-0"
                )}
              >
                <Camera size={24} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  disabled={isProfileUpdating}
                />
              </label>
            </div>
            <span className="text-[0.6875rem] text-text-muted font-medium">
              {isProfileUpdating ? 'Uploading...' : 'Click to change'}
            </span>
          </div>

          {/* Form Fields */}
          <div className="flex-1 w-full space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-nickname-input"
                className="text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                Nickname
              </label>
              <input
                id="settings-nickname-input"
                type="text"
                value={profileNickname}
                onChange={(e) => setProfileNickname(e.target.value)}
                className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter nickname"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="settings-email-input"
                className="text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                Email
              </label>
              <input
                id="settings-email-input"
                type="email"
                value={profileEmail}
                disabled
                className="w-full h-11 bg-canvas/50 border border-border-card rounded-[18px] px-4 text-sm text-text-muted cursor-not-allowed"
              />
              <p className="text-xs text-text-muted">
                Email cannot be changed directly. Managed via auth provider.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isProfileUpdating}
                className="h-10 px-5 flex items-center justify-center gap-2 bg-blue-500 border border-blue-500 text-white rounded-full font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {isProfileUpdating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                <span>Save Changes</span>
              </button>

              {profileMessage && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs font-medium",
                    profileMessage.type === 'success'
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  )}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
