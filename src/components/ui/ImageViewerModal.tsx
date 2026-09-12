import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  images?: string[];
  imageUrl?: string | null;
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export function ImageViewerModal({
  isOpen,
  images = [],
  imageUrl = null,
  initialIndex = 0,
  title,
  onClose,
}: ImageViewerModalProps) {
  const allImages = useMemo(() => {
    if (images && images.length > 0) return images;
    if (imageUrl) return [imageUrl];
    return [];
  }, [images, imageUrl]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(allImages.length - 1, 0)));
    }
  }, [isOpen, initialIndex, allImages.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  // Управление с клавиатуры
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currentImageSrc = allImages[currentIndex] || null;

  return (
    <AnimatePresence>
      {isOpen && currentImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
          />

          {/* Top Controls Bar */}
          <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              {title && (
                <span className="text-white/80 text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full border border-white/10 hidden sm:inline-block">
                  {title}
                </span>
              )}
              {allImages.length > 1 && (
                <span className="text-white/90 text-xs font-mono font-medium bg-black/50 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                  <ImageIcon size={12} />
                  <span>
                    {currentIndex + 1} / {allImages.length}
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-lg active:scale-95 pointer-events-auto"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Стрелка влево */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-2xl active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Контейнер текущего изображения */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center justify-center max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImageSrc}
              alt={title || `Screenshot ${currentIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-[18px] shadow-2xl border border-white/10"
            />
          </motion.div>

          {/* Стрелка вправо */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-2xl active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}