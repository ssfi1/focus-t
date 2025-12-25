
import React from 'react';
import { TimeSegment } from '../types';
import { formatTime, formatDuration } from '../utils';
import { Play, Pause, Coffee, Square } from 'lucide-react';

interface TimelineProps {
  segments: TimeSegment[];
}

export const Timeline: React.FC<TimelineProps> = ({ segments }) => {
  return (
    <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">상세 기록</h4>
      <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-0 pb-2">
        {segments.map((segment, index) => {
          const isOngoing = segment.end === null;
          const duration = (segment.end || Date.now()) - segment.start;
          
          // Calculate break time (gap) to the next segment
          const nextSegment = segments[index + 1];
          let breakDuration = 0;
          if (nextSegment && segment.end) {
            breakDuration = nextSegment.start - segment.end;
          }
          
          const isHardStop = segment.stopReason === 'hard-stop';
          
          // Show break if it is a Hard Stop OR if it lasts more than 1 minute
          const shouldShowBreak = isHardStop || breakDuration >= 60000;

          return (
            <React.Fragment key={index}>
              {/* Work Segment */}
              <div className="relative pl-6 pb-6 last:pb-0">
                {/* Dot */}
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${isOngoing ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`}></div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-sm">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      <Play size={14} className="text-green-600 dark:text-green-400" />
                      시작: {formatTime(segment.start)}
                    </div>
                    {segment.end && (
                      <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <Pause size={14} className="text-amber-500 dark:text-amber-400" />
                        중지: {formatTime(segment.end)}
                      </div>
                    )}
                    {isOngoing && (
                      <div className="mt-1 text-indigo-600 dark:text-indigo-400 font-medium italic">
                        진행 중...
                      </div>
                    )}
                  </div>
                  <div className="mt-1 sm:mt-0 font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                    {formatDuration(duration)}
                  </div>
                </div>
              </div>

              {/* Break/Pause Indicator - Updated to Green/Emerald */}
              {shouldShowBreak && (
                 <div className="relative pl-6 pb-6">
                    <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full border-2 border-white dark:border-slate-800 ${isHardStop ? 'bg-slate-400' : 'bg-emerald-300 dark:bg-emerald-600'}`}></div>
                    <div className={`flex items-center gap-2 text-xs italic p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 whitespace-nowrap ${isHardStop ? 'text-slate-500 bg-slate-100 dark:bg-slate-800' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                        {isHardStop ? <Square size={10} fill="currentColor" /> : <Coffee size={12} />}
                        <span>{isHardStop ? '일시정지' : '휴식'}: {formatDuration(breakDuration)}</span>
                    </div>
                 </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
