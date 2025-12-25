
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Session, Group } from '../types';
import { formatDurationHM, formatDuration, generateTaskColor, calculateDailyTotal, calculateBreakTime, formatTimeHM } from '../utils';
import { X, Clock, ChevronLeft, ChevronRight, Coffee, Square } from 'lucide-react';
import { Dropdown } from './Dropdown';

interface DailyTimeTableProps {
  dateStr: string;
  targetDate: Date;
  sessions: Session[];
  groups: Group[]; 
  onClose: () => void;
  breakTrackingMode?: 'pause-only' | 'attendance-based';
  onPrevDate?: () => void;
  onNextDate?: () => void;
  averages?: { work: number, break: number } | null;
}

interface ConfirmState {
  sessionId: string;
  segmentIndex: number;
}

export const DailyTimeTable: React.FC<DailyTimeTableProps> = ({ 
  dateStr, 
  targetDate, 
  sessions, 
  groups, 
  onClose,
  breakTrackingMode = 'pause-only',
  onPrevDate,
  onNextDate,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Highlighting State by Task Name (aggregates identical tasks)
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);
  
  // Filter sessions first
  const filteredSessions = useMemo(() => {
    if (selectedGroupId === 'all') return sessions;
    return sessions.filter(s => s.groupId === selectedGroupId);
  }, [sessions, selectedGroupId]);

  // SVG Constants
  const SIZE = 300;
  const CENTER = SIZE / 2;
  const RADIUS = 110;
  const INNER_RADIUS = 60; 

  // Helper to get coordinates from angle
  const getCoordinatesForAngle = (angle: number, radius: number) => {
    // Subtract 90 degrees to start at 12 o'clock (top)
    const rad = (angle - 90) * (Math.PI / 180); 
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad)
    };
  };

  // Generate SVG Path for an arc slice
  const getSlicePath = (startPercent: number, endPercent: number, radius: number) => {
    const startAngle = startPercent * 360;
    const endAngle = endPercent * 360;
    
    // Handle full circle case or very close to full
    if (endAngle - startAngle >= 360) {
        return [
            `M ${CENTER} ${CENTER - radius}`,
            `A ${radius} ${radius} 0 1 1 ${CENTER} ${CENTER + radius}`,
            `A ${radius} ${radius} 0 1 1 ${CENTER} ${CENTER - radius}`,
            `Z`
        ].join(' ');
    }

    const start = getCoordinatesForAngle(startAngle, radius);
    const end = getCoordinatesForAngle(endAngle, radius);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      `M ${CENTER} ${CENTER}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `Z`
    ].join(' ');
  };
  
  const handleInteraction = (name: string) => {
      if (activeTaskName === name) {
          setActiveTaskName(null);
      } else {
          setActiveTaskName(name);
      }
  };

  // Daily Stats Calculation (Fixed Footer - Default)
  const dailyStats = useMemo(() => {
      const workTime = calculateDailyTotal(filteredSessions, targetDate.getTime());
      const breakTime = calculateBreakTime(filteredSessions);
      const breakCount = filteredSessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
      
      let maxDuration = 0;
      filteredSessions.forEach(s => {
          s.segments.forEach(seg => {
              if (seg.deletedAt) return; // Exclude deleted
              const dur = (seg.end || Date.now()) - seg.start;
              if (dur > maxDuration) maxDuration = dur;
          });
      });

      return { workTime, breakTime, breakCount, maxDuration };
  }, [filteredSessions, targetDate, breakTrackingMode]);

  // Selected Task Stats
  const selectedTaskStats = useMemo(() => {
      if (!activeTaskName) return null;

      const specificSessions = filteredSessions.filter(s => s.name === activeTaskName);
      
      // Work Time for specific task (Exclude deleted)
      const workTime = specificSessions.reduce((acc, s) => {
          return acc + s.segments.reduce((t, seg) => {
              if (seg.deletedAt) return t;
              return t + ((seg.end || Date.now()) - seg.start);
          }, 0);
      }, 0);

      // Break Time for specific task (approximated by gaps between its segments using 'pause-only' logic on this subset)
      const breakTime = calculateBreakTime(specificSessions); 
      
      const breakCount = specificSessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);

      let maxDuration = 0;
      specificSessions.forEach(s => {
          s.segments.forEach(seg => {
              if (seg.deletedAt) return;
              const dur = (seg.end || Date.now()) - seg.start;
              if (dur > maxDuration) maxDuration = dur;
          });
      });

      return { workTime, breakTime, breakCount, maxDuration };
  }, [activeTaskName, filteredSessions]);

  const displayStats = activeTaskName && selectedTaskStats ? selectedTaskStats : dailyStats;

  // Chart Logic (Ratio based: Work vs Break only)
  const chartData = useMemo(() => {
    // 1. Determine Timeline Boundaries
    const activeSegments = sessions.flatMap(s => s.segments.filter(seg => !seg.deletedAt));
    const allStartTimes = activeSegments.map(s => s.start);
    const allEndTimes = activeSegments.map(s => s.end || Date.now());
    
    let startTime: number;
    let endTime: number;

    // "Pause Only": Start at first task, End at last task.
    startTime = allStartTimes.length > 0 ? Math.min(...allStartTimes) : new Date(targetDate).setHours(9,0,0,0);
    endTime = allEndTimes.length > 0 ? Math.max(...allEndTimes) : Date.now();

    if (filteredSessions.length === 0) return { slices: [], totalDuration: 0, startTime, endTime };

    // 2. Build Timeline Items (Include deleted to manage time gaps, but exclude from rendering)
    const timelineItems: { start: number; end: number; session: Session; stopReason?: string; deletedAt?: number }[] = [];
    filteredSessions.forEach(session => {
        session.segments.forEach(seg => {
            // Clip segments to the timeline window
            const s = Math.max(seg.start, startTime);
            const e = seg.end ? Math.min(seg.end, endTime) : Math.min(Date.now(), endTime);
            if (e > s) {
                timelineItems.push({ 
                    start: s, 
                    end: e, 
                    session, 
                    stopReason: seg.stopReason,
                    deletedAt: seg.deletedAt 
                });
            }
        });
    });

    timelineItems.sort((a, b) => a.start - b.start);

    // 3. Process Slices (Valid Work & Valid Breaks ONLY)
    // We do NOT use absolute timeline mapping. We map relative to the "Total Valid Duration".
    const validSlices: { 
        label: string; 
        duration: number; 
        color: string; 
        isBreak: boolean; 
        isHardStop: boolean;
        start: number;
        end: number;
    }[] = [];

    let currentTime = startTime;
    let lastStopReason: string | undefined = undefined;

    timelineItems.forEach((item) => {
        // Gap Handling
        if (item.start > currentTime) {
            const gap = item.start - currentTime;
            const isHardStop = lastStopReason === 'hard-stop';
            
            // Only add gap as a slice if it's NOT a Hard Stop
            // Hard Stop gaps are completely ignored in the ratio calculation
            if (gap > 0 && !isHardStop) {
                const label = (selectedGroupId !== 'all' ? '기타/휴식' : '휴식');
                validSlices.push({
                    label,
                    duration: gap,
                    color: '#a7f3d0', // Emerald 200
                    isBreak: true,
                    isHardStop: false,
                    start: currentTime,
                    end: item.start
                });
            }
        }

        // Segment Handling
        const duration = item.end - item.start;
        
        // Only add work segment if NOT deleted
        // Deleted segments consume timeline space (via currentTime update below) but are excluded from slices
        if (!item.deletedAt) {
            const taskColor = generateTaskColor(item.session.id + item.session.name + 'chart');
            validSlices.push({
                label: item.session.name,
                duration: duration,
                color: taskColor,
                isBreak: false,
                isHardStop: false,
                start: item.start,
                end: item.end
            });
        }
        
        // Advance time - if deleted, this effectively skips the time
        currentTime = Math.max(currentTime, item.end);
        lastStopReason = item.stopReason;
    });

    // Final Gap (Tail)
    if (currentTime < endTime) {
        const gap = endTime - currentTime;
        const isHardStop = lastStopReason === 'hard-stop';
        if (gap > 0 && !isHardStop) {
             const label = (selectedGroupId !== 'all' ? '기타/휴식' : '휴식');
             validSlices.push({
                label,
                duration: gap,
                color: '#a7f3d0',
                isBreak: true,
                isHardStop: false,
                start: currentTime,
                end: endTime
            });
        }
    }

    // 4. Calculate Total Duration based ONLY on valid slices
    const totalValidDuration = validSlices.reduce((acc, slice) => acc + slice.duration, 0);
    const safeTotalDuration = Math.max(1, totalValidDuration);

    // 5. Map to Chart Slices
    let currentAccumulator = 0;
    const finalSlices = validSlices.map(slice => {
        const startPercent = currentAccumulator / safeTotalDuration;
        const endPercent = (currentAccumulator + slice.duration) / safeTotalDuration;
        currentAccumulator += slice.duration;

        return {
            ...slice,
            percent: slice.duration / safeTotalDuration,
            startPercent,
            endPercent
        };
    });

    return { slices: finalSlices, totalDuration: totalValidDuration, startTime, endTime };
  }, [sessions, filteredSessions, targetDate, breakTrackingMode, selectedGroupId]);

  // Aggregate Data for List View (by Task Name)
  const aggregatedList = useMemo(() => {
      const map = new Map<string, { label: string, duration: number, color: string, isBreak: boolean, isHardStop: boolean, count: number }>();
      
      chartData.slices.forEach(slice => {
          if (map.has(slice.label)) {
              const existing = map.get(slice.label)!;
              existing.duration += slice.duration;
              existing.count += 1;
          } else {
              map.set(slice.label, { 
                  label: slice.label, 
                  duration: slice.duration, 
                  color: slice.color,
                  isBreak: !!slice.isBreak,
                  isHardStop: !!slice.isHardStop,
                  count: 1
              });
          }
      });

      return Array.from(map.values()).sort((a, b) => b.duration - a.duration);
  }, [chartData.slices]);

  // Calculate Active Slice Info (Aggregated)
  const activeTaskInfo = useMemo(() => {
      if (!activeTaskName) return null;
      return aggregatedList.find(item => item.label === activeTaskName);
  }, [activeTaskName, aggregatedList]);

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-300 relative border border-white/20 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center shrink-0 z-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
                {onPrevDate && <button onClick={onPrevDate} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft size={20} /></button>}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {dateStr}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">일일 리포트</p>
                </div>
                {onNextDate && <button onClick={onNextDate} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={20} /></button>}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {/* Filter */}
            <div className="px-6 pt-4 pb-2 shrink-0 z-10 flex justify-end">
                 <Dropdown 
                    value={selectedGroupId}
                    options={[{value: 'all', label: '전체 그룹'}, ...groups.map(g => ({ value: g.id, label: g.name, color: g.color }))]}
                    onChange={setSelectedGroupId}
                    size="sm"
                    align="right"
                />
            </div>

            {/* CHART VIEW (Aggregated Interaction) */}
            <div 
                className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6 flex flex-col items-center"
                onClick={() => setActiveTaskName(null)} // Background Deselect
            >
                {/* SVG Chart */}
                <div className="relative w-[300px] h-[300px] mb-6 shrink-0 mt-4 select-none" onClick={(e) => e.stopPropagation()}>
                    {chartData.slices.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-full">
                            <Clock size={48} className="mb-2 opacity-50" />
                            <span className="text-xs">데이터 없음</span>
                        </div>
                    ) : (
                        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="transform rotate-0">
                            {/* Base Circle */}
                            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="transparent" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-800" />
                            
                            {/* Start Time Indicator REMOVED as per request */}
                            
                            {/* Slices */}
                            {chartData.slices.map((slice, i) => {
                                const isActive = activeTaskName === slice.label;
                                
                                // Scale effect for active slice(s)
                                const scale = isActive ? 1.08 : 1;
                                const transformOrigin = `${CENTER}px ${CENTER}px`;
                                const opacity = activeTaskName && !isActive ? 0.3 : 1;
                                
                                return (
                                    <g key={i} 
                                        onClick={(e) => { e.stopPropagation(); handleInteraction(slice.label); }}
                                        className="cursor-pointer transition-all duration-300"
                                        style={{ transformOrigin, transform: `scale(${scale})`, opacity }}
                                    >
                                        <path 
                                            d={getSlicePath(slice.startPercent, slice.endPercent, RADIUS)} 
                                            fill={slice.color}
                                            stroke="white" 
                                            strokeWidth="2"
                                            className="dark:stroke-slate-900 transition-opacity hover:opacity-90"
                                        />
                                    </g>
                                );
                            })}

                            {/* Center Circle (Donut Hole) */}
                            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="var(--bg-color)" className="fill-white dark:fill-slate-900 drop-shadow-sm" />
                            
                            {/* Center Text */}
                            <foreignObject x={CENTER - INNER_RADIUS} y={CENTER - INNER_RADIUS} width={INNER_RADIUS * 2} height={INNER_RADIUS * 2} style={{pointerEvents: 'none'}}>
                                <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 rounded-full overflow-hidden">
                                    {activeTaskInfo ? (
                                        <div className="animate-in fade-in zoom-in duration-200">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase truncate w-full px-1">{activeTaskInfo.isBreak ? '휴식' : (activeTaskInfo.isHardStop ? '일시정지' : '작업')}</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white truncate w-full px-1">{formatDuration(activeTaskInfo.duration)}</div>
                                            <div className="text-[9px] text-slate-400 font-medium">{activeTaskInfo.count} segments</div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center animate-in fade-in">
                                            <Clock size={20} className="mb-1 opacity-50" />
                                            <span className="text-[10px] font-bold">Total</span>
                                            <span className="text-xs font-bold">{formatDurationHM(chartData.totalDuration)}</span>
                                        </div>
                                    )}
                                </div>
                            </foreignObject>
                        </svg>
                    )}
                </div>

                {/* Aggregated Legend / Details List */}
                <div className="w-full space-y-2 pb-24" onClick={(e) => e.stopPropagation()}>
                    {aggregatedList.map((item, i) => (
                        <div 
                            key={i}
                            onClick={() => handleInteraction(item.label)}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${activeTaskName === item.label ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 scale-[1.02] shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        {item.isHardStop && <Square size={10} className="text-slate-400" fill="currentColor" />}
                                        {item.isBreak && <Coffee size={10} className="text-emerald-500" />}
                                        <span className={`text-sm font-bold truncate ${activeTaskName === item.label ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs font-bold font-mono ${activeTaskName === item.label ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {formatDuration(item.duration)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Fixed Footer with Daily Stats */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 z-30 transition-colors duration-300">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-500 animate-in fade-in duration-300">
                        {activeTaskName ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTaskInfo?.color }}></span>
                                {activeTaskName}
                            </span>
                        ) : '일일 전체 통계'}
                    </span>
                </div>
                
                <div 
                    className={`grid grid-cols-4 gap-2 rounded-xl p-3 border transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        activeTaskInfo 
                        ? 'shadow-lg' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                    }`}
                    style={activeTaskInfo ? {
                        backgroundColor: `${activeTaskInfo.color}15`, // Transparent background using hex alpha
                        borderColor: `${activeTaskInfo.color}40`,
                        transform: 'scale(1.05)',
                        boxShadow: `0 10px 30px -10px ${activeTaskInfo.color}30`
                    } : {}}
                >
                    <div className="text-center">
                        <div className={`text-[9px] uppercase font-bold mb-0.5 ${activeTaskInfo ? '' : 'text-slate-400'}`} style={activeTaskInfo ? { color: activeTaskInfo.color } : {}}>작업</div>
                        <div key={displayStats.workTime} className="text-lg font-black text-slate-800 dark:text-white animate-in zoom-in duration-300">{formatDurationHM(displayStats.workTime)}</div>
                    </div>
                    <div className={`text-center border-l ${activeTaskInfo ? '' : 'border-slate-200 dark:border-slate-700'}`} style={activeTaskInfo ? { borderColor: `${activeTaskInfo.color}30` } : {}}>
                        <div className={`text-[9px] uppercase font-bold mb-0.5 ${activeTaskInfo ? '' : 'text-slate-400'}`} style={activeTaskInfo ? { color: activeTaskInfo.color } : {}}>휴식</div>
                        <div key={displayStats.breakTime} className="text-lg font-black text-slate-800 dark:text-white animate-in zoom-in duration-300">{formatDurationHM(displayStats.breakTime)}</div>
                    </div>
                    <div className={`text-center border-l ${activeTaskInfo ? '' : 'border-slate-200 dark:border-slate-700'}`} style={activeTaskInfo ? { borderColor: `${activeTaskInfo.color}30` } : {}}>
                        <div className={`text-[9px] uppercase font-bold mb-0.5 ${activeTaskInfo ? '' : 'text-slate-400'}`} style={activeTaskInfo ? { color: activeTaskInfo.color } : {}}>휴식 횟수</div>
                        <div key={displayStats.breakCount} className="text-lg font-black text-slate-800 dark:text-white animate-in zoom-in duration-300">{displayStats.breakCount}회</div>
                    </div>
                    <div className={`text-center border-l ${activeTaskInfo ? '' : 'border-slate-200 dark:border-slate-700'}`} style={activeTaskInfo ? { borderColor: `${activeTaskInfo.color}30` } : {}}>
                        <div className={`text-[9px] uppercase font-bold mb-0.5 ${activeTaskInfo ? '' : 'text-slate-400'}`} style={activeTaskInfo ? { color: activeTaskInfo.color } : {}}>최대 집중</div>
                        <div key={displayStats.maxDuration} className="text-lg font-black text-slate-800 dark:text-white animate-in zoom-in duration-300">{formatDurationHM(displayStats.maxDuration)}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
