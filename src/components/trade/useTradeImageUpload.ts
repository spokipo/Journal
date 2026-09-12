import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';

interface UseTradeImageUploadOptions {
  user: any;
  folder: 'trades' | 'ideas';
  isOpen: boolean;
  isEditing: boolean;
  initialScreenshots?: string[];
}

export function useTradeImageUpload({
  user,
  folder,
  isOpen,
  isEditing,
  initialScreenshots = [],
}: UseTradeImageUploadOptions) {
  const [screenshots, setScreenshots] = useState<string[]>(initialScreenshots);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with initial screenshots when modal opens or initial data changes
  useEffect(() => {
    if (isOpen) {
      setScreenshots(initialScreenshots);
      setUploadError(null);
      setIsDragging(false);
      setViewerIndex(null);
    }
  }, [isOpen, initialScreenshots]);

  const processAndUploadFile = useCallback(
    async (file: File | Blob) => {
      setIsUploading(true);
      setUploadError(null);
      try {
        const compressedBlob = await optimizeImage(file, 1920, 0.82);
        const userId = user?.id || 'anonymous';
        const randomKey = Math.random().toString(36).substring(2, 8);
        const filePath = `${folder}/${userId}/${Date.now()}-${randomKey}.webp`;
        let finalUrl = '';

        if (isSupabaseConfigured && user) {
          const { error: uploadErr } = await supabase.storage
            .from('playbook-screens')
            .upload(filePath, compressedBlob, {
              contentType: 'image/webp',
              upsert: false,
            });

          if (uploadErr) {
            finalUrl = URL.createObjectURL(compressedBlob);
          } else {
            const {
              data: { publicUrl },
            } = supabase.storage.from('playbook-screens').getPublicUrl(filePath);
            finalUrl = publicUrl;
          }
        } else {
          finalUrl = URL.createObjectURL(compressedBlob);
        }

        setScreenshots((prev) => [...prev, finalUrl]);
      } catch (err: any) {
        console.error('Screenshot processing failed:', err);
        setUploadError(err?.message || 'Failed to process screenshot');
      } finally {
        setIsUploading(false);
      }
    },
    [user, folder]
  );

  // Clipboard Paste listener
  useEffect(() => {
    if (!isOpen || !isEditing) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await processAndUploadFile(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isEditing, processAndUploadFile]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processAndUploadFile(files[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          await processAndUploadFile(files[i]);
        }
      }
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return {
    screenshots,
    setScreenshots,
    isUploading,
    uploadError,
    isDragging,
    viewerIndex,
    setViewerIndex,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveScreenshot,
  };
}
