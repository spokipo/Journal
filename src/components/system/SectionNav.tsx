import React from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  GripVertical,
} from 'lucide-react';
import { type SystemSection, getSectionIcon } from './types';
import { SectionContextMenu } from './SectionContextMenu';
import { cn } from '../../lib/utils';

interface SectionNavProps {
  sections: SystemSection[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onAddSection: () => void;
  onEditSection: (section: SystemSection) => void;
  onDeleteSection: (section: SystemSection) => void;
  onReorder: (newSections: SystemSection[]) => void;
  isEditMode: boolean;
}

// ==========================================
// DESKTOP SORTABLE ITEM (>= lg)
// ==========================================
interface DesktopSortableItemProps {
  section: SystemSection;
  index: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function DesktopSortableItem({
  section,
  index,
  total,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: DesktopSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = getSectionIcon(section.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center justify-between rounded-[18px] transition-all select-none',
        isDragging && 'z-30 opacity-70 scale-[1.02] shadow-lg',
        isActive
          ? 'bg-blue-500/10 text-blue-500 font-medium'
          : 'hover:bg-canvas text-text-main'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="w-7 h-8 flex items-center justify-center pl-2 text-text-muted/40 hover:text-text-main cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical size={14} />
      </button>

      {/* Select button */}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 py-3 pl-1 pr-2 text-left min-w-0 cursor-pointer"
      >
        <div
          className={cn(
            'w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-colors',
            isActive
              ? 'bg-blue-500/15 text-blue-500'
              : 'bg-canvas text-text-muted group-hover:text-text-main'
          )}
        >
          <IconComponent size={16} />
        </div>
        <span className="truncate text-xs sm:text-sm">{section.title}</span>
      </button>

      {/* Submenu ("...") Anchored Context Menu Trigger */}
      <div className="relative pr-2 shrink-0">
        <SectionContextMenu
          section={section}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onEdit={onEdit}
          onDelete={onDelete}
          isCompact={true}
          iconSize={14}
          triggerClassName="w-8 h-8 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer opacity-70 group-hover:opacity-100"
        />
      </div>
    </div>
  );
}

// ==========================================
// DESKTOP SECTION NAV (>= lg)
// ==========================================
export function SectionNav({
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onReorder,
  isEditMode: _isEditMode,
}: SectionNavProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((item) => item.id === active.id);
    const newIndex = sections.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sections, oldIndex, newIndex).map(
        (sec, idx) => ({ ...sec, order_index: idx })
      );
      onReorder(reordered);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = arrayMove(sections, index, targetIndex).map(
      (sec, idx) => ({
        ...sec,
        order_index: idx,
      })
    );
    onReorder(reordered);
  };

  return (
    <div className="hidden lg:flex flex-col space-y-2 w-[240px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Sections ({sections.length})
        </span>
        <span className="text-[0.6875rem] text-text-muted/70">
          Drag to reorder
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {sections.map((section, idx) => (
              <DesktopSortableItem
                key={section.id}
                section={section}
                index={idx}
                total={sections.length}
                isActive={section.id === activeSectionId}
                onSelect={() => onSelectSection(section.id)}
                onEdit={() => onEditSection(section)}
                onDelete={() => onDeleteSection(section)}
                onMoveUp={() => handleMove(idx, 'up')}
                onMoveDown={() => handleMove(idx, 'down')}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Section Button on Desktop */}
      <button
        type="button"
        onClick={onAddSection}
        className="w-full h-10 rounded-full border border-dashed border-border-card flex items-center justify-center gap-2 text-xs font-semibold text-text-muted hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer mt-2"
      >
        <Plus size={14} />
        <span>Add Section</span>
      </button>
    </div>
  );
}

// ==========================================
// MOBILE ROW (< lg)
// Full tap area (min-h 64px), SectionContextMenu (>= 44x44px), Disclosure Chevron
// ==========================================
interface MobileRowProps {
  section: SystemSection;
  index: number;
  total: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function MobileRow({
  section,
  index,
  total,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MobileRowProps) {
  const IconComponent = getSectionIcon(section.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        delay: Math.min(index * 0.03, 0.24),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative flex items-center justify-between rounded-[18px] bg-card border border-border-card transition-all select-none shadow-2xs hover:border-blue-500/30"
    >
      {/* Clickable section area (opens section detail screen) */}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-h-[64px] py-3.5 pl-4 pr-1 flex items-center gap-3 text-left min-w-0 cursor-pointer active:opacity-75 transition-opacity"
      >
        <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <IconComponent size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-main truncate leading-snug">
            {section.title}
          </p>
          <p className="text-[0.6875rem] text-text-muted truncate mt-0.5">
            Updated{' '}
            {new Date(
              section.updated_at || section.created_at
            ).toLocaleDateString()}
          </p>
        </div>
      </button>

      {/* Submenu ("...") Anchored Context Menu */}
      <div className="flex items-center pr-3 shrink-0">
        <SectionContextMenu
          section={section}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onEdit={onEdit}
          onDelete={onDelete}
          isCompact={false}
          iconSize={16}
          triggerClassName="w-11 h-11 min-w-11 min-h-11 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
    </motion.div>
  );
}

// ==========================================
// MOBILE SECTION LIST (< lg)
// Shows L1 rows with disclosure chevrons & Portal-based Anchored Context Menus
// ==========================================
export function MobileSectionList({
  sections,
  onSelectSection,
  onEditSection,
  onDeleteSection,
  onReorder,
}: Omit<SectionNavProps, 'activeSectionId' | 'isEditMode' | 'onAddSection'>) {
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = arrayMove(sections, index, targetIndex).map(
      (sec, idx) => ({
        ...sec,
        order_index: idx,
      })
    );
    onReorder(reordered);
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {sections.map((section, idx) => (
        <MobileRow
          key={section.id}
          section={section}
          index={idx}
          total={sections.length}
          onSelect={() => onSelectSection(section.id)}
          onEdit={() => onEditSection(section)}
          onDelete={() => onDeleteSection(section)}
          onMoveUp={() => handleMove(idx, 'up')}
          onMoveDown={() => handleMove(idx, 'down')}
        />
      ))}
    </div>
  );
}
