import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Loader2,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { uploadSystemImage } from '../../lib/systemStorage';

interface RichTextEditorProps {
  content: string;
  isEditable: boolean;
  onChange: (html: string) => void;
  userId?: string;
}

export function RichTextEditor({
  content,
  isEditable,
  onChange,
  userId,
}: RichTextEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-[18px] border border-border-card max-w-full my-4 shadow-sm object-contain',
        },
      }),
      Placeholder.configure({
        placeholder: 'Document your trading rules, strategies, formulas, or routines here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: content || '',
    editable: isEditable,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Keep editable state synced
  useEffect(() => {
    if (editor && editor.isEditable !== isEditable) {
      editor.setEditable(isEditable);
    }
  }, [editor, isEditable]);

  // Sync content when external content changes (e.g. switching sections or canceling)
  useEffect(() => {
    if (editor) {
      const currentHTML = editor.getHTML();
      if (content !== currentHTML && !editor.isFocused) {
        editor.commands.setContent(content || '', { emitUpdate: false });
      }
    }
  }, [content, editor]);

  const handleImageUpload = async (file: File) => {
    if (!editor || !file) return;
    try {
      setIsUploadingImage(true);
      const imageUrl = await uploadSystemImage(file, userId);
      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
      }
    } catch (err) {
      console.error('Failed to upload image into editor:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  if (!editor) {
    return (
      <div className="py-12 flex items-center justify-center text-text-muted">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading editor...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Hidden file input for manual image insertion */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept="image/*"
        className="hidden"
      />

      {/* EDIT MODE TOOLBAR */}
      {isEditable && (
        <div className="sticky top-0 z-20 mb-4 p-1.5 bg-canvas border border-border-card rounded-[18px] flex flex-wrap items-center gap-1 shadow-xs select-none">
          {/* Text Style Group */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('bold')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('italic')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('strike')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Strikethrough size={14} />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-card mx-1" />

          {/* Headings Group */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('heading', { level: 1 })
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Heading1 size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('heading', { level: 2 })
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Heading2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('heading', { level: 3 })
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Heading3 size={14} />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-card mx-1" />

          {/* Lists Group */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('bulletList')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('orderedList')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <ListOrdered size={14} />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-card mx-1" />

          {/* Block / Code / Quote */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('blockquote')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Quote size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              title="Code Block"
              className={cn(
                "h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs transition-colors cursor-pointer",
                editor.isActive('codeBlock')
                  ? "bg-blue-500/15 text-blue-500 font-semibold"
                  : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <Code size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Divider"
              className="h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs text-text-muted hover:text-text-main hover:bg-card transition-colors cursor-pointer"
            >
              <Minus size={14} />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-card mx-1" />

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            title="Insert Image (or paste/drag directly)"
            className="h-8 px-2.5 rounded-[10px] flex items-center gap-2 text-xs font-semibold bg-card border border-border-card text-text-main hover:border-blue-500/50 hover:bg-canvas transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploadingImage ? (
              <>
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-[0.6875rem]">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon size={14} className="text-blue-500" />
                <span className="text-[0.6875rem]">Image</span>
              </>
            )}
          </button>

          {/* History */}
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
              className="h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs text-text-muted hover:text-text-main hover:bg-card disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
              className="h-8 min-w-8 px-2 rounded-[10px] flex items-center justify-center text-xs text-text-muted hover:text-text-main hover:bg-card disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Redo size={14} />
            </button>
          </div>
        </div>
      )}

      {/* EDITOR CONTENT CANVAS */}
      <div
        className={cn(
          "w-full transition-all text-text-main",
          isEditable
            ? "min-h-[360px] p-4 bg-canvas/30 rounded-[18px] border border-border-card/80 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20"
            : "min-h-[200px] p-0 bg-transparent border-0 ring-0"
        )}
      >
        <EditorContent
          editor={editor}
          className="prose-system outline-none focus:outline-none"
        />
      </div>
    </div>
  );
}

