import React from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, ZoomIn, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ScreenshotsSectionProps {
  screenshots: string[];
  isEditing: boolean;
  isUploading?: boolean;
  uploadError?: string | null;
  isDragging?: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onRemoveScreenshot?: (idx: number) => void;
  onViewScreenshot: (idx: number) => void;
  title?: string;
}

export function ScreenshotsSection({
  screenshots,
  isEditing,
  isUploading = false,
  uploadError = null,
  isDragging = false,
  fileInputRef,
  onFileInputChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveScreenshot,
  onViewScreenshot,
  title = 'Chart Snapshots',
}: ScreenshotsSectionProps) {
  // If view mode and no screenshots, nothing to render
  if (!isEditing && screenshots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between h-5">
        <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <ImageIcon size={14} className="text-text-muted" />
          <span>{title} ({screenshots.length})</span>
        </label>
        {isEditing && (
          <span className="text-[0.6875rem] text-text-muted">
            Paste: Ctrl+V
          </span>
        )}
      </div>

      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {screenshots.map((url, idx) => (
            <div
              key={url + idx}
              onClick={() => onViewScreenshot(idx)}
              className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-card md:bg-canvas group shadow-xs cursor-pointer"
            >
              <img
                src={url}
                alt={`Screenshot ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <span className="text-xs font-semibold flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full">
                  <ZoomIn size={13} /> View
                </span>
              </div>

              {isEditing && onRemoveScreenshot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveScreenshot(idx);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10 active:scale-95"
                  aria-label="Remove screenshot"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef?.current?.click()}
            className={cn(
              "border border-dashed rounded-[18px] p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2",
              isDragging
                ? "border-blue-500 bg-blue-500/5"
                : "border-border-card hover:border-blue-500/60 bg-card md:bg-canvas/40"
            )}
          >
            <input
              type="file"
              ref={fileInputRef as any}
              onChange={onFileInputChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            {isUploading ? (
              <div className="flex items-center gap-2 text-blue-500 py-1">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">Optimizing image (WebP)...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-text-muted py-1">
                <UploadCloud size={16} className="text-blue-500" />
                <span>Drop screenshot here or click to browse</span>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-rose-500">{uploadError}</p>
          )}
        </>
      )}
    </div>
  );
}
