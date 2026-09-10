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
      "bg-card border border-border-card rounded-[26px] p-5 flex flex-col shadow-sm h-full w-full overflow-hidden select-none",
      size === 'small' && "p-4 justify-between",
      className
    )}>
      {(title || action) && size !== 'small' && (
        <div className="flex items-center justify-between mb-3 shrink-0">
          {title ? <h3 className="text-text-muted font-medium text-sm">{title}</h3> : <span />}
          {action}
        </div>
      )}
      <div className="flex-1 flex flex-col w-full h-full min-h-0">
        {children}
      </div>
    </div>
  );
}

