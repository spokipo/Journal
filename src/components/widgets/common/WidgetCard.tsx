import React from 'react';
import { cn } from '../../../lib/utils';
import type { WidgetSize } from '../types';

export function WidgetCard({ 
  children, 
  className, 
  title, 
  size,
  action
}: { 
  children: React.ReactNode; 
  className?: string; 
  title?: string; 
  size: WidgetSize;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "bg-card rounded-[26px] shadow-sm p-4 flex flex-col h-full w-full select-none",
      size !== 'large' ? "overflow-hidden" : "overflow-visible",
      size === 'small' && "justify-between",
      className
    )}>
      {(title || action) && size !== 'small' && (
        <div className="flex items-center justify-between mb-2 shrink-0">
          {title ? (
            <h3 className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold truncate">
              {title}
            </h3>
          ) : <span />}
          {action}
        </div>
      )}
      <div className="flex-1 flex flex-col w-full h-full min-h-0">
        {children}
      </div>
    </div>
  );
}

