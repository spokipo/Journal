import React from 'react';
import type { ViewMode } from './types';

export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 sm:h-16 bg-card border border-border-card rounded-[26px] p-3.5 sm:p-4 flex items-center justify-between">
          <div className="w-16 h-3.5 bg-canvas rounded-[14px]" />
          <div className="w-12 h-5 bg-canvas rounded-[14px]" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-card border border-border-card rounded-[26px] p-3.5 sm:p-4 flex flex-col justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-border-card/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[14px] bg-canvas" />
                <div className="w-16 h-4 rounded-[10px] bg-canvas" />
                <div className="w-10 h-4 rounded-full bg-canvas" />
              </div>
              <div className="w-12 h-4 rounded-[10px] bg-canvas" />
            </div>
            <div className="space-y-2 py-2">
              <div className="w-3/4 h-3 rounded-full bg-canvas" />
              <div className="w-1/2 h-3 rounded-full bg-canvas" />
            </div>
            <div className="pt-2 border-t border-border-card/60 flex items-center justify-between">
              <div className="w-16 h-3 rounded-full bg-canvas" />
              <div className="w-14 h-3 rounded-full bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border-card rounded-[18px] h-16 px-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[14px] bg-canvas" />
            <div className="space-y-2">
              <div className="w-24 h-3.5 rounded-[14px] bg-canvas" />
              <div className="w-16 h-2.5 rounded-[14px] bg-canvas" />
            </div>
          </div>
          <div className="w-20 h-3.5 rounded-[14px] bg-canvas hidden sm:block" />
          <div className="w-16 h-4 rounded-[14px] bg-canvas" />
        </div>
      ))}
    </div>
  );
}
