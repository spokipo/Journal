import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Plus, Activity, Clock, TrendingUp, GripHorizontal } from 'lucide-react';
import { WIDGET_REGISTRY, type WidgetSize } from './Widgets';
import { cn } from '../lib/utils';
import { BaseModal } from './Modals';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement } from '@dnd-kit/modifiers';

interface WidgetInstance {
  id: string;
  type: keyof typeof WIDGET_REGISTRY;
  size: WidgetSize;
}

const INITIAL_LAYOUT: WidgetInstance[] = [
  { id: 'w1', type: 'dailyRisk', size: 'small' },
  { id: 'w2', type: 'sessionTracker', size: 'small' },
  { id: 'w3', type: 'equitySparkline', size: 'medium' },
  { id: 'w4', type: 'equitySparkline', size: 'large' }, 
];

// Sortable Item Component
function SortableWidget({ 
  widget, 
  isEditMode, 
  onRemove, 
  onChangeSize 
}: { 
  widget: WidgetInstance, 
  isEditMode: boolean,
  onRemove: (id: string) => void,
  onChangeSize: (id: string, size: WidgetSize) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  // Apply scale during drag. CSS.Transform.toString handles translate.
  const style = {
    transform: transform ? CSS.Transform.toString({
      ...transform,
      scaleX: isDragging ? 1.04 : 1,
      scaleY: isDragging ? 1.04 : 1,
    }) : undefined,
    transition,
    zIndex: isDragging ? 30 : 1,
    touchAction: isEditMode ? 'none' : 'auto',
  };

  const RegistryEntry = WIDGET_REGISTRY[widget.type];
  if (!RegistryEntry) return null;
  const WidgetComponent = RegistryEntry.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-full h-full rounded-[26px]",
        widget.size === 'small' && "col-span-1 row-span-1 aspect-square",
        widget.size === 'medium' && "col-span-2 row-span-1 aspect-[2/1] md:aspect-[2.05/1]", 
        widget.size === 'large' && "col-span-2 row-span-2 aspect-square",
        isDragging && "shadow-2xl" // Elevate shadow when dragging
      )}
    >
      <div className={cn("h-full w-full transition-all duration-300", isEditMode && "ring-2 ring-blue-500/50 rounded-[26px] opacity-90")}>
        <div className={cn("h-full w-full", isEditMode && "pointer-events-none")}>
          <WidgetComponent size={widget.size} />
        </div>
      </div>

      {/* Edit Controls Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-3 z-10 pointer-events-none">
          {/* Top Row: Delete & Drag Handle */}
          <div className="w-full flex justify-between items-start pointer-events-auto">
            {/* Drag Handle bound to dnd-kit listeners */}
            <div 
              {...attributes}
              {...listeners}
              className="p-1.5 bg-card/90 backdrop-blur-md rounded-full shadow-md border border-border-card text-text-muted cursor-grab active:cursor-grabbing hover:text-text-main transition-colors"
            >
              <GripHorizontal size={16} />
            </div>
            <button 
              onClick={() => onRemove(widget.id)}
              className="p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Bottom Row: Size Selectors */}
          <div className="bg-card/95 rounded-full shadow-md border border-border-card flex overflow-hidden p-0.5 pointer-events-auto mt-auto mb-1">
            {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => {
              const isSupported = RegistryEntry.supportedSizes.includes(size);
              if (!isSupported) return null;
              
              return (
                <button
                  key={size}
                  onPointerDown={(e) => {
                    e.stopPropagation(); 
                    onChangeSize(widget.id, size);
                  }}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full transition-colors uppercase tracking-wider",
                    widget.size === size 
                      ? "bg-blue-500 text-white" 
                      : "text-text-muted hover:text-text-main hover:bg-canvas"
                  )}
                >
                  {size.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export function Dashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [layout, setLayout] = useState<WidgetInstance[]>(INITIAL_LAYOUT);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('widgetLayout_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLayout(parsed);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('widgetLayout_v3', JSON.stringify(layout));
    }
  }, [layout, isMounted]);

  const removeWidget = (id: string) => {
    setLayout(layout.filter(w => w.id !== id));
  };

  const addWidget = (type: keyof typeof WIDGET_REGISTRY) => {
    const supportedSizes = WIDGET_REGISTRY[type].supportedSizes as WidgetSize[];
    const newWidget: WidgetInstance = {
      id: `w_${Date.now()}`,
      type,
      size: supportedSizes[0]
    };
    setLayout([...layout, newWidget]);
    setIsAddMenuOpen(false);
  };

  const changeSize = (id: string, newSize: WidgetSize) => {
    setLayout(layout.map(w => w.id === id ? { ...w, size: newSize } : w));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const iconMap: Record<string, React.ReactNode> = {
    dailyRisk: <Activity size={24} className="text-red-500" />,
    sessionTracker: <Clock size={24} className="text-blue-500" />,
    equitySparkline: <TrendingUp size={24} className="text-green-500" />
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-40">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Welcome back, Trader</p>
        </div>
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            "p-2 rounded-full transition-colors active:scale-95",
            isEditMode ? "bg-blue-500 text-white shadow-md" : "bg-card border border-border-card text-text-muted hover:text-text-main"
          )}
        >
          <Settings2 size={20} />
        </button>
      </div>

      {/* 2D Grid with dnd-kit */}
      {isMounted && (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]} // Prevents flying off screen
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 pb-32 md:pb-6 items-start relative z-10">
            <SortableContext 
              items={layout.map(w => w.id)} 
              strategy={rectSortingStrategy} // Perfect for 2D CSS Grids
            >
              {layout.map((widget) => (
                <SortableWidget 
                  key={widget.id}
                  widget={widget}
                  isEditMode={isEditMode}
                  onRemove={removeWidget}
                  onChangeSize={changeSize}
                />
              ))}
            </SortableContext>

            {/* Add Widget Placeholder Slot (Not Sortable) */}
            <AnimatePresence>
              {isEditMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setIsAddMenuOpen(true)}
                  className="col-span-1 row-span-1 aspect-square w-full h-full relative cursor-pointer group"
                >
                  <div className="absolute inset-0 rounded-[26px] border-2 border-dashed border-border-card bg-canvas/50 group-hover:bg-canvas transition-all flex flex-col items-center justify-center text-text-muted group-hover:text-blue-500 group-hover:border-blue-500/50 group-active:scale-95">
                    <Plus size={28} className="mb-2" />
                    <span className="font-semibold text-sm">Add Widget</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DndContext>
      )}

      {/* Add Widget Modal Catalog */}
      <BaseModal 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        title="Add Widget"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(WIDGET_REGISTRY) as Array<keyof typeof WIDGET_REGISTRY>).map(type => {
            const entry = WIDGET_REGISTRY[type];
            return (
              <button
                key={type}
                onClick={() => addWidget(type)}
                className="flex items-center gap-4 p-4 bg-canvas border border-border-card rounded-[18px] text-left hover:border-blue-500 hover:shadow-sm transition-all active:scale-95"
              >
                <div className="h-12 w-12 rounded-full bg-card border border-border-card flex items-center justify-center shrink-0">
                  {iconMap[type]}
                </div>
                <div>
                  <h4 className="font-semibold text-text-main text-sm">{entry.name}</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Supports: {entry.supportedSizes.map(s => s.charAt(0).toUpperCase()).join(', ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </BaseModal>
    </div>
  );
}
