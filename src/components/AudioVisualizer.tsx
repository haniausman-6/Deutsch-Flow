import React from 'react';

interface AudioVisualizerProps {
  state: 'idle' | 'listening' | 'speaking' | 'processing';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state }) => {
  return (
    <div
      id="audio-visualizer-container"
      className="flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 bg-stone-100/90 dark:bg-stone-800/80 rounded-full border border-stone-200/80 dark:border-stone-700/60 shrink-0"
    >
      {/* 5 animated frequency bars */}
      {[0, 1, 2, 3, 4].map((i) => {
        let barClass = 'w-1 rounded-full transition-all duration-300 ';
        let height = 'h-2';

        if (state === 'listening') {
          barClass += 'bg-emerald-600 animate-pulse ';
          const heights = ['h-2.5', 'h-5', 'h-6', 'h-4', 'h-2.5'];
          height = heights[i % heights.length];
        } else if (state === 'speaking') {
          barClass += 'bg-amber-600 animate-bounce ';
          const heights = ['h-3', 'h-6', 'h-4', 'h-6', 'h-3'];
          height = heights[i % heights.length];
        } else if (state === 'processing') {
          barClass += 'bg-stone-500 animate-pulse ';
          height = 'h-2.5';
        } else {
          barClass += 'bg-stone-300 dark:bg-stone-600 ';
          height = 'h-2';
        }

        return (
          <span
            key={i}
            id={`audio-wave-bar-${i}`}
            className={`${barClass} ${height}`}
            style={{
              animationDelay: `${i * 120}ms`,
              animationDuration: state === 'listening' ? '700ms' : '900ms',
            }}
          />
        );
      })}

      <span
        id="visualizer-status-text"
        className="ml-1.5 text-[11px] font-semibold tracking-wide uppercase text-stone-600 dark:text-stone-300 select-none hidden sm:inline"
      >
        {state === 'listening' && 'Listening (de-DE)'}
        {state === 'speaking' && 'Speaking...'}
        {state === 'processing' && 'Thinking...'}
        {state === 'idle' && 'Voice Ready'}
      </span>
      {/* Shorter text for mobile screens */}
      <span className="ml-1 text-[10px] font-bold tracking-tight uppercase text-stone-600 dark:text-stone-300 select-none sm:hidden">
        {state === 'listening' && 'Listening'}
        {state === 'speaking' && 'Speaking'}
        {state === 'processing' && 'Thinking'}
        {state === 'idle' && 'Ready'}
      </span>
    </div>
  );
};
