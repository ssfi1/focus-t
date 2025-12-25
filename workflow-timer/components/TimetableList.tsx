
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Session, WorkDay, Group } from '../types';
import { formatDuration, formatTime, generateTaskColor, getAdjustedDateStr } from '../utils';
import { ArrowDown, Square, Clock, ArrowRight, Trash2, XCircle, Coffee, CirclePause, RefreshCcw, AlertCircle, Activity, Layers } from 'lucide-react';

interface TimetableListProps {
  sessions: Session[];
  workDay?: WorkDay;
  targetDate: Date;
  breakTrackingMode?: 'pause-only' | 'attendance-based';
  selectedGroupId?: string;
  onDeleteSegment?: (sessionId: string, segmentIndex: number) => void;
  onDeleteBreak?: (start: number, end: number, sessionId: string) => void;
  onRestore?: (sessionId: string, segmentIndex: number) => void;
  dayStartHour?: number;
}

interface ConfirmState {
  sessionId: string;
  segmentIndex: number;
}

export const TimetableList: React.FC<TimetableListProps> = ({
  sessions,
  workDay,
  targetDate,
  breakTrackingMode = 'pause-only',
  selectedGroupId = 'all',
  onDeleteSegment,
  onDeleteBreak,
  onRestore,
  dayStartHour = 0
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter sessions based on group
  const filteredSessions = useMemo(() => {
    if (selectedGroupId === 'all' || !selectedGroupId) return sessions;
    return sessions.filter(s => s.groupId === selectedGroupId);
  }, [sessions, selectedGroupId]);

  const timelineData = useMemo(() => {
    const allStartTimes = sessions.map(s => s.segments[0].start);
    const allEndTimes = sessions.map(s => Math.max(...s.segments.map(sg => sg.end || Date.now())));
    
    let startTime: number;
    let endTime: number;

    const isPauseOnly = breakTrackingMode === 'pause-only';

    if (isPauseOnly) {
        startTime = allStartTimes.length > 0 ? Math.min(...allStartTimes) : (workDay?.startTime || new Date(targetDate).setHours(9,0,0,0));
        endTime = allEndTimes.length > 0 ? Math.max(...allEndTimes) : (workDay?.endTime || Date.now());
    } else {
        startTime = workDay?.startTime || (allStartTimes.length > 0 ? Math.min(...allStartTimes) : new Date(targetDate).setHours(9,0,0,0));
        endTime = workDay?.endTime || (sessions.some(s => s.isActive) ? Date.now() : (allEndTimes.length > 0 ? Math.max(...allEndTimes) : Date.now()));
    }

    if (filteredSessions.length === 0 && !workDay) return [];

    const segments: { 
      label: string; 
      duration: string;
      fillColor: string;
      isBreak?: boolean;
      isHardStop?: boolean;
      isDeleted?: boolean;
      isOnHold?: boolean;
      isOngoing?: boolean;
      isOtherGroup?: boolean; // New Flag
      start: number;
      end: number;
      sessionId?: string;
      segmentIndex?: number;
    }[] = [];

    const timelineItems: { start: number; end: number; session: Session; stopReason?: string; segmentIndex: number; deletedAt?: number; isDeletedGap?: boolean; originalEndNull?: boolean }[] = [];
    
    filteredSessions.forEach(session => {
        session.segments.forEach((seg, idx) => {
            const s = Math.max(seg.start, startTime);
            const e = seg.end ? Math.min(seg.end, endTime) : Math.min(Date.now(), endTime);
            if (e > s) {
                timelineItems.push({ 
                    start: s, 
                    end: e, 
                    session, 
                    stopReason: seg.stopReason, 
                    segmentIndex: idx, 
                    deletedAt: seg.deletedAt,
                    isDeletedGap: seg.isDeletedGap,
                    originalEndNull: seg.end === null
                });
            }
        });
    });

    // Sort chronologically first to calculate gaps correctly
    timelineItems.sort((a, b) => a.start - b.start);

    let currentTime = startTime;
    let lastStopReason: string | undefined = undefined;
    let lastEnd: number = startTime;
    let lastSessionId: string | undefined = undefined;

    // Helper to add break segment
    const addBreakSegment = (start: number, end: number, isHardStop: boolean) => {
        const gap = end - start;
        const prevDay = getAdjustedDateStr(lastEnd, dayStartHour);
        const currDay = getAdjustedDateStr(start, dayStartHour);
        // Only show break if it's significant (>1min) OR it's a Hard Stop, AND same day
        if (gap > 0 && prevDay === currDay && (gap >= 60000 || isHardStop)) {
             segments.push({
                label: isHardStop ? '일시정지' : '휴식',
                duration: formatDuration(gap),
                fillColor: isHardStop ? '#cbd5e1' : '#a7f3d0',
                isBreak: !isHardStop,
                isHardStop: isHardStop,
                isDeleted: false,
                isOnHold: false,
                isOtherGroup: false,
                start: start,
                end: end,
                sessionId: lastSessionId
            });
        }
    };

    timelineItems.forEach((item) => {
        // GAP Handling
        if (item.start > currentTime) {
            const gapStart = currentTime;
            const gapEnd = item.start;
            const isHardStop = lastStopReason === 'hard-stop';

            // If we are filtering by a group, check if "Other Groups" worked during this gap
            if (selectedGroupId !== 'all' && selectedGroupId) {
                // Find overlapping segments from OTHER groups
                const otherWork = sessions
                    .filter(s => s.groupId !== selectedGroupId && !s.deletedAt)
                    .flatMap(s => s.segments.map(seg => ({...seg, sessionName: s.name, groupId: s.groupId})))
                    .filter(seg => {
                        const s = Math.max(seg.start, gapStart);
                        const e = seg.end ? Math.min(seg.end, gapEnd) : Math.min(Date.now(), gapEnd);
                        return e > s && !seg.deletedAt;
                    })
                    .sort((a, b) => a.start - b.start);

                if (otherWork.length > 0) {
                    // Fill gap with Other Work + Real Breaks
                    let gapCursor = gapStart;
                    
                    otherWork.forEach(other => {
                        const s = Math.max(other.start, gapCursor);
                        const e = other.end ? Math.min(other.end, gapEnd) : Math.min(Date.now(), gapEnd);

                        // Gap before this other work (Real Break)
                        if (s > gapCursor) {
                            addBreakSegment(gapCursor, s, isHardStop);
                        }

                        // Add "Other Work" Segment
                        if (e > s) {
                            segments.push({
                                label: other.sessionName,
                                duration: formatDuration(e - s),
                                fillColor: '#e2e8f0', // Slate 200
                                isBreak: false,
                                isHardStop: false,
                                isDeleted: false,
                                isOnHold: false,
                                isOtherGroup: true,
                                start: s,
                                end: e
                            });
                        }
                        gapCursor = Math.max(gapCursor, e);
                    });

                    // Tail Gap (Real Break)
                    if (gapCursor < gapEnd) {
                        addBreakSegment(gapCursor, gapEnd, isHardStop);
                    }
                } else {
                    // No other work found in gap -> Pure Break
                    addBreakSegment(gapStart, gapEnd, isHardStop);
                }
            } else {
                // 'All' view or no group filter -> Pure Break logic
                addBreakSegment(gapStart, gapEnd, isHardStop);
            }
        }

        const duration = item.end - item.start;
        const taskColor = generateTaskColor('list-' + item.session.id + item.session.name);
        const isOnHold = item.session.completionStatus === 'on-hold';
        
        if (item.deletedAt) {
            segments.push({
                label: item.isDeletedGap ? '제거된 시간' : `${item.session.name} (삭제됨)`,
                duration: formatDuration(duration),
                fillColor: '#f1f5f9',
                isBreak: false,
                isDeleted: true,
                isOnHold: false,
                isOtherGroup: false,
                start: item.start,
                end: item.end,
                sessionId: item.session.id,
                segmentIndex: item.segmentIndex
            });
        } else {
            segments.push({
                label: item.session.name,
                duration: formatDuration(duration),
                fillColor: taskColor,
                isBreak: false,
                isDeleted: false,
                isOnHold: isOnHold,
                isOngoing: item.originalEndNull && item.session.isActive,
                isOtherGroup: false,
                start: item.start,
                end: item.end,
                sessionId: item.session.id,
                segmentIndex: item.segmentIndex
            });
        }

        currentTime = Math.max(currentTime, item.end);
        lastEnd = item.end;
        lastStopReason = item.stopReason;
        lastSessionId = item.session.id;
    });

    // Final Gap Check (Tail)
    if (currentTime < endTime) {
        const gapStart = currentTime;
        const gapEnd = endTime;
        const isHardStop = lastStopReason === 'hard-stop';

        // Same logic for "Other Groups" in the tail gap
        if (selectedGroupId !== 'all' && selectedGroupId) {
             const otherWork = sessions
                .filter(s => s.groupId !== selectedGroupId && !s.deletedAt)
                .flatMap(s => s.segments.map(seg => ({...seg, sessionName: s.name, groupId: s.groupId})))
                .filter(seg => {
                    const s = Math.max(seg.start, gapStart);
                    const e = seg.end ? Math.min(seg.end, gapEnd) : Math.min(Date.now(), gapEnd);
                    return e > s && !seg.deletedAt;
                })
                .sort((a, b) => a.start - b.start);
            
            if (otherWork.length > 0) {
                let gapCursor = gapStart;
                otherWork.forEach(other => {
                    const s = Math.max(other.start, gapCursor);
                    const e = other.end ? Math.min(other.end, gapEnd) : Math.min(Date.now(), gapEnd);
                    if (s > gapCursor) addBreakSegment(gapCursor, s, isHardStop);
                    if (e > s) {
                        segments.push({
                            label: other.sessionName,
                            duration: formatDuration(e - s),
                            fillColor: '#e2e8f0',
                            isBreak: false,
                            isHardStop: false,
                            isDeleted: false,
                            isOnHold: false,
                            isOtherGroup: true,
                            start: s,
                            end: e
                        });
                    }
                    gapCursor = Math.max(gapCursor, e);
                });
                if (gapCursor < gapEnd) addBreakSegment(gapCursor, gapEnd, isHardStop);
            } else {
                addBreakSegment(gapStart, gapEnd, isHardStop);
            }
        } else {
            addBreakSegment(gapStart, gapEnd, isHardStop);
        }
    }

    // Reverse the array to show Newest -> Oldest
    return segments.reverse();
  }, [sessions, filteredSessions, targetDate, workDay, breakTrackingMode, selectedGroupId, dayStartHour]);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string, segmentIndex: number) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Check if this is the last active work segment
    const activeWorkSegments = session.segments.filter(seg => !seg.deletedAt && !seg.isDeletedGap);
    
    if (activeWorkSegments.length === 1) {
      setConfirmState({
        sessionId,
        segmentIndex
      });
    } else {
      // Immediate delete
      onDeleteSegment?.(sessionId, segmentIndex);
    }
  };

  const handleConfirmDelete = () => {
    if (confirmState && onDeleteSegment) {
      onDeleteSegment(confirmState.sessionId, confirmState.segmentIndex);
    }
    setConfirmState(null);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (confirmState && !(e.target as HTMLElement).closest('.delete-confirm-popup')) {
        setConfirmState(null);
      }
    };
    if (confirmState) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [confirmState]);

  if (timelineData.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-10">
            <Clock size={48} className="mb-2 opacity-20" />
            <p className="text-sm">표시할 내역이 없습니다.</p>
        </div>
      );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto pr-2 scrollbar-hide flex flex-col relative">
        <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full z-0"></div>
        
        <div className="space-y-3 pb-4 relative z-10 px-1">
            {timelineData.map((seg, i) => (
                <div 
                    key={i} 
                    className={`
                        glass-card rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-transform duration-300 border group
                        ${seg.isDeleted 
                            ? 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70' 
                            : seg.isOtherGroup
                                ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                : seg.isBreak || seg.isHardStop
                                    ? 'bg-slate-50/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30' 
                                    : 'bg-white/90 dark:bg-slate-800/60 border-slate-300 dark:border-white/5 shadow-sm hover:scale-[1.01] hover:shadow-md'}
                    `}
                >
                    <div className="flex items-center gap-3 sm:w-32 shrink-0">
                        <div className="flex flex-col items-end min-w-[60px]">
                            <span className={`text-xs font-bold font-mono ${seg.isDeleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{formatTime(seg.start)}</span>
                            <span className={`text-[10px] font-mono ${seg.isDeleted ? 'text-slate-300 line-through' : 'text-slate-400 dark:text-slate-500'}`}>{seg.isOngoing ? '진행 중' : formatTime(seg.end)}</span>
                        </div>
                        <div 
                            className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shrink-0 shadow-sm ${seg.isDeleted ? 'bg-slate-300 grayscale' : ''}`} 
                            style={{ backgroundColor: seg.isDeleted ? undefined : seg.fillColor }}
                        ></div>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {seg.isDeleted && <XCircle size={12} className="text-slate-400 shrink-0" />}
                            {seg.isOnHold && !seg.isDeleted && <CirclePause size={12} className="text-amber-500 shrink-0" />}
                            {seg.isHardStop && !seg.isDeleted && <Square size={12} className="text-slate-400 shrink-0" fill="currentColor" />}
                            {seg.isBreak && !seg.isDeleted && <Coffee size={12} className="text-emerald-500 shrink-0" />}
                            {seg.isOtherGroup && !seg.isDeleted && <Layers size={12} className="text-slate-500 shrink-0" />}
                            
                            <span className={`text-sm font-bold truncate ${
                                seg.isDeleted 
                                ? 'text-slate-400 line-through decoration-slate-400' 
                                : (seg.isBreak 
                                    ? 'text-emerald-700 dark:text-emerald-400' 
                                    : (seg.isHardStop 
                                        ? 'text-slate-500 dark:text-slate-400 italic'
                                        : (seg.isOtherGroup
                                            ? 'text-slate-500 dark:text-slate-400 italic'
                                            : (seg.isOnHold 
                                                ? 'text-amber-700 dark:text-amber-400' 
                                                : 'text-slate-800 dark:text-white'))))
                            }`}>
                                {seg.label}
                            </span>
                            {seg.isOngoing && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight bg-indigo-600 text-white shadow-sm shrink-0">
                                  진행 중
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap 
                                ${seg.isDeleted 
                                    ? 'bg-slate-200 text-slate-400' 
                                    : (seg.isBreak 
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : (seg.isHardStop 
                                            ? 'bg-slate-200/50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                                            : (seg.isOtherGroup
                                                ? 'bg-slate-200/50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400' 
                                                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300')))}
                            `}>
                                {seg.duration}
                            </div>
                            
                            {!seg.isDeleted && !seg.isOtherGroup && (
                                <>
                                    {!seg.isBreak && !seg.isHardStop && onDeleteSegment && seg.sessionId && seg.segmentIndex !== undefined && (
                                        <button
                                            onClick={(e) => handleDeleteClick(e, seg.sessionId!, seg.segmentIndex!)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all active:scale-95"
                                            title="이 구간 삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    {(seg.isBreak || seg.isHardStop) && onDeleteBreak && seg.sessionId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteBreak(seg.start, seg.end, seg.sessionId);
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all active:scale-95"
                                            title="이 시간 제거"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </>
                            )}
                            {seg.isDeleted && onRestore && seg.sessionId && seg.segmentIndex !== undefined && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRestore(seg.sessionId!, seg.segmentIndex!); }}
                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-all active:scale-95 z-20"
                                    title="복구"
                                >
                                    <RefreshCcw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {seg.isDeleted && (
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuNSIvPgo8cGF0aCBkPSJNLTEgMUw1IDciIHN0cm9rZT0iI2UzZTNlMyIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50 pointer-events-none rounded-xl"></div>
                    )}
                </div>
            ))}
        </div>

        {/* Floating Delete Confirmation Popup - CENTERED */}
        {confirmState && (
            <div 
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] delete-confirm-popup animate-in zoom-in-95 duration-200"
            >
                <div className="glass-panel p-4 rounded-2xl shadow-2xl border border-red-200/50 dark:border-red-900/30 w-[280px]">
                    <div className="flex items-start gap-3 mb-4">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">기록 삭제 확인</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                마지막 기록입니다. 삭제 시 <strong>작업 전체</strong>가 휴지통으로 이동합니다.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setConfirmState(null)}
                            className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            취소
                        </button>
                        <button 
                            onClick={handleConfirmDelete}
                            className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 transition-colors"
                        >
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
