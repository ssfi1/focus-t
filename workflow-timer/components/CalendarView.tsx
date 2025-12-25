
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Session, Group } from '../types';
import { calculateDailyTotal, formatDurationHM, isSameDay, getGroupStyle, getDateStr, calculateBreakTime, calculateFocusIndex, getFocusLevelConfig, formatTime, formatTimeHM, generateTaskColor, formatDuration } from '../utils';
import { ChevronLeft, ChevronRight, X, Clock, Layers, Calendar, ArrowRight, StickyNote, ChevronDown, ChevronUp, Coffee, PieChart, ArrowLeft, Zap, LayoutList, Sunrise, Sunset, Flame, Target, Activity, BarChart2, Hourglass, Trophy, ArrowUpRight } from 'lucide-react';
import { SessionCard } from './SessionCard';
import { Dropdown } from './Dropdown';
import { TimetableList } from './TimetableList';

interface CalendarViewProps {
  sessions: Session[];
  groups: Group[];
  onClose: () => void;
  onNavigateToSession: (id: string) => void;
  onOpenTimeTable: (dateStr: string, dateObj: Date, sessions: Session[]) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onGroupChange: (id: string, newGroupId: string) => void;
  onMemoChange: (id: string, newMemo: string) => void;
  onContinue: (id: string) => void;
  onRestore?: (sessionId: string, segmentIndex: number) => void;
  onDeleteSegment?: (sessionId: string, segmentIndex: number) => void;
  onDeleteBreak?: (start: number, end: number, sessionId: string) => void;
  breakTrackingMode?: 'pause-only' | 'attendance-based';
  initialDate?: Date | null;
  onDateSelect?: (date: Date) => void;
}

// --- NEW COMPONENT: Daily Overview (Expanded Metrics) ---
const DailyOverview = ({ sessions, groups }: { sessions: Session[], groups: Group[] }) => {
    const stats = useMemo(() => {
        if (sessions.length === 0) return null;

        let totalDuration = 0;
        let maxDuration = 0;
        let longestSessionName = '-';
        let firstStartTime = Number.MAX_SAFE_INTEGER;
        let lastEndTime = 0;

        // 2. Prime Time Calculation (Hourly Buckets)
        const hourlyActivity = new Array(24).fill(0);

        sessions.forEach(s => {
            // Calculate duration for this session
            let sessionDuration = 0;
            s.segments.forEach(seg => {
                if (seg.deletedAt) return;
                const end = seg.end || Date.now();
                const duration = end - seg.start;
                sessionDuration += duration;

                // Prime Time Logic: Add duration to the hour bucket of the midpoint
                const midPoint = new Date(seg.start + duration / 2);
                const hour = midPoint.getHours();
                hourlyActivity[hour] += duration;

                // Start/End Time Logic
                if (seg.start < firstStartTime) firstStartTime = seg.start;
                if (end > lastEndTime) lastEndTime = end;
            });

            if (sessionDuration > 0) {
                totalDuration += sessionDuration;
                if (sessionDuration > maxDuration) {
                    maxDuration = sessionDuration;
                    longestSessionName = s.name;
                }
            }
        });

        // Find Prime Time
        let maxHourIndex = 0;
        let maxActivity = 0;
        hourlyActivity.forEach((activity, idx) => {
            if (activity > maxActivity) {
                maxActivity = activity;
                maxHourIndex = idx;
            }
        });

        const primeTimeLabel = `${maxHourIndex}:00 - ${maxHourIndex + 1}:00`;
        const avgSessionDuration = totalDuration / sessions.length;
        
        // Time Range Label (HM)
        const timeRangeLabel = firstStartTime !== Number.MAX_SAFE_INTEGER 
            ? `${formatTimeHM(firstStartTime)} - ${formatTimeHM(lastEndTime)}`
            : '-';

        return { 
            totalDuration, 
            primeTimeLabel, 
            avgSessionDuration,
            longestSessionName,
            maxDuration,
            timeRangeLabel
        };
    }, [sessions, groups]);

    if (!stats) return null;

    return (
        <div className="w-full mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Activity size={14} /> 오늘의 인사이트
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* 1. Prime Time (RED) */}
                    <div className="bg-rose-50/50 dark:bg-rose-900/20 rounded-xl p-3 border border-rose-100/50 dark:border-rose-800/30 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase mb-0.5">Prime Time</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100">{stats.primeTimeLabel}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">가장 몰입도가 높았던 시간</div>
                        </div>
                        <Flame className="absolute -bottom-2 -right-2 text-rose-200 dark:text-rose-800/50 w-12 h-12 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* 2. Avg Session */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-800/30 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-0.5">Avg Session</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100">{formatDurationHM(stats.avgSessionDuration)}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">평균 작업 지속 시간</div>
                        </div>
                        <Hourglass className="absolute -bottom-2 -right-2 text-emerald-200 dark:text-emerald-800/50 w-12 h-12 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* 3. Longest Focus */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100/50 dark:border-blue-800/30 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-0.5">Longest Focus</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 truncate w-full" title={stats.longestSessionName}>
                                {stats.longestSessionName}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {formatDurationHM(stats.maxDuration)} 동안 집중
                            </div>
                        </div>
                        <Trophy className="absolute -bottom-2 -right-2 text-blue-200 dark:text-blue-800/50 w-12 h-12 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* 4. Active Time Range (VIOLET, No Seconds, Wrapped) */}
                    <div className="bg-violet-50/50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-100/50 dark:border-violet-800/30 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase mb-0.5">Active Range</div>
                            <div className="text-[10px] sm:text-sm font-black text-slate-800 dark:text-slate-100 mt-1 whitespace-nowrap tracking-tighter">{stats.timeRangeLabel}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">활동 시간 범위</div>
                        </div>
                        <ArrowUpRight className="absolute -bottom-2 -right-2 text-violet-200 dark:text-violet-800/50 w-12 h-12 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Internal Component for Grid Rendering to avoid duplication
const MonthGrid = ({ 
    year, 
    month, 
    sessions, 
    groups, 
    onSelectDate
}: {
    year: number, 
    month: number, 
    sessions: Session[], 
    groups: Group[], 
    onSelectDate: (date: Date) => void
}) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Data Aggregation per day
    const dailyStats = useMemo(() => {
        const stats: Record<number, { total: number; count: number; breakTime: number; focusScore: number; focusConfig: any }> = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dateTimestamp = new Date(year, month, d).getTime();
            const dateStr = getDateStr(new Date(dateTimestamp));
            const daySessions = sessions.filter(s => isSameDay(s.createdAt, dateTimestamp));
            
            let total = 0;
            daySessions.forEach(s => {
                total += calculateDailyTotal([s], s.createdAt);
            });
            
            const breakTime = calculateBreakTime(daySessions);
            const breakCount = daySessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
            const focusScore = calculateFocusIndex(total, breakTime, breakCount);
            const focusConfig = getFocusLevelConfig(focusScore);

            stats[d] = { total, count: daySessions.length, breakTime, focusScore, focusConfig };
        }
        return stats;
    }, [sessions, year, month, daysInMonth]);

    return (
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto scrollbar-hide h-full w-full">
            <div className="grid grid-cols-7 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={day} className={`text-center text-xs sm:text-sm font-bold uppercase pb-2 border-b border-slate-200/50 dark:border-slate-700/50 ${idx === 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2 sm:gap-3 auto-rows-fr">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[5rem] sm:min-h-[7rem] bg-transparent"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const stat = dailyStats[day];
                    const isToday = isSameDay(Date.now(), new Date(year, month, day).getTime());
                    
                    return (
                        <button 
                            key={day} 
                            onClick={() => onSelectDate(new Date(year, month, day))}
                            className={`min-h-[5rem] sm:min-h-[7rem] rounded-2xl p-1.5 sm:p-2 flex flex-col items-center sm:items-start justify-between relative transition-all duration-300 group hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg border 
                            ${stat.total > 0 ? 'bg-white/60 dark:bg-slate-800/40 border-white/40 dark:border-white/5 shadow-sm backdrop-blur-sm' : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                        >
                            <div className="flex justify-between w-full relative z-10">
                                <span className={`text-xs sm:text-base font-bold flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {day}
                                </span>
                            </div>
                            
                            {stat.total > 0 ? (
                                <div className="w-full mt-auto flex flex-col gap-1.5 relative z-10">
                                    <div className="flex items-end justify-between w-full px-0.5">
                                        <div className="text-[10px] sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none whitespace-nowrap">
                                            {formatDurationHM(stat.total)}
                                        </div>
                                        <div className={`text-[9px] font-bold ${stat.focusConfig?.textClass} opacity-0 group-hover:opacity-100 transition-opacity mb-px`}>
                                            {stat.focusScore}
                                        </div>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full opacity-80 ${stat.focusConfig?.barClass || 'bg-slate-300'}`}></div>
                                </div>
                            ) : (
                                <div className="hidden sm:flex w-full h-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">+</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Internal Component for Date Detail List
const DetailList = ({
    date,
    sessions,
    groups,
    breakTrackingMode,
    onDelete, onRename, onGroupChange, onMemoChange, onContinue, onRestore,
    onDeleteSegment, onDeleteBreak,
    viewMode
}: any) => {
    const sessionsForDate = useMemo(() => {
        if (!date) return [];
        return sessions.filter((s: Session) => isSameDay(s.createdAt, date.getTime()));
    }, [sessions, date]);

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 scrollbar-hide">
            {sessionsForDate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4">
                    <div className="bg-slate-100/50 dark:bg-slate-800/50 p-6 rounded-full backdrop-blur-sm">
                        <Clock size={48} strokeWidth={1.5} className="opacity-50" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-400">기록된 작업이 없습니다</p>
                        <p className="text-sm mt-1">이 날짜에는 작업 기록이 존재하지 않습니다.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Replaced DayInsights with DailyOverview */}
                    <DailyOverview sessions={sessionsForDate} groups={groups} />

                    {viewMode === 'task' ? (
                        <div className="max-w-3xl mx-auto space-y-4 pb-20 px-1">
                            {sessionsForDate.map((session: Session) => (
                                <SessionCard 
                                    key={session.id} 
                                    session={session} 
                                    groups={groups}
                                    onDelete={onDelete}
                                    onRename={onRename}
                                    onGroupChange={onGroupChange}
                                    onMemoChange={onMemoChange}
                                    onContinue={onContinue}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full pb-20">
                            <TimetableList 
                                sessions={sessionsForDate}
                                targetDate={date}
                                breakTrackingMode={breakTrackingMode}
                                onDeleteSegment={onDeleteSegment}
                                onDeleteBreak={onDeleteBreak}
                                onRestore={onRestore}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  sessions, 
  groups, 
  onClose, 
  onNavigateToSession, 
  onOpenTimeTable,
  onDelete,
  onRename,
  onGroupChange,
  onMemoChange,
  onContinue,
  onRestore,
  onDeleteSegment,
  onDeleteBreak,
  breakTrackingMode = 'pause-only',
  initialDate,
  onDateSelect
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'task' | 'time'>('task');

  // Slider State for Month Navigation
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  
  // Slider State for Detail Navigation
  const [isDetailSliding, setIsDetailSliding] = useState(false);
  const [detailSlideDirection, setDetailSlideDirection] = useState<'left' | 'right' | null>(null);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Filter sessions based on selected group
  const filteredSessions = useMemo(() => {
    if (selectedGroupId === 'all') return sessions;
    return sessions.filter(s => s.groupId === selectedGroupId);
  }, [sessions, selectedGroupId]);

  // Calendar Date Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
      if (isSliding) return;
      setSlideDirection('right');
      setIsSliding(true);
  };

  const handleNextMonth = () => {
      if (isSliding) return;
      setSlideDirection('left');
      setIsSliding(true);
  };

  const handleMonthTransitionEnd = () => {
      if (!isSliding) return;
      const newDate = new Date(currentDate);
      if (slideDirection === 'left') {
          newDate.setMonth(newDate.getMonth() + 1);
      } else if (slideDirection === 'right') {
          newDate.setMonth(newDate.getMonth() - 1);
      }
      setCurrentDate(newDate);
      setIsSliding(false);
      setSlideDirection(null);
  };

  // Detail Navigation Logic
  const handlePrevDay = () => {
      if (isDetailSliding || !selectedDate) return;
      setDetailSlideDirection('right');
      setIsDetailSliding(true);
  };

  const handleNextDay = () => {
      if (isDetailSliding || !selectedDate) return;
      setDetailSlideDirection('left');
      setIsDetailSliding(true);
  };

  const handleDetailTransitionEnd = () => {
      if (!isDetailSliding || !selectedDate) return;
      const newDate = new Date(selectedDate);
      if (detailSlideDirection === 'left') {
          newDate.setDate(newDate.getDate() + 1);
      } else if (detailSlideDirection === 'right') {
          newDate.setDate(newDate.getDate() - 1);
      }
      setSelectedDate(newDate);
      
      // Also update the background month calendar to match if month changed
      if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
          setCurrentDate(new Date(newDate));
      }

      setIsDetailSliding(false);
      setDetailSlideDirection(null);
  };

  // Touch Handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndCalendar = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isSwipeLeft = distance > minSwipeDistance;
      const isSwipeRight = distance < -minSwipeDistance;

      if (isSwipeLeft) handleNextMonth();
      else if (isSwipeRight) handlePrevMonth();
  };

  const onTouchEndDetail = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isSwipeLeft = distance > minSwipeDistance;
      const isSwipeRight = distance < -minSwipeDistance;

      if (isSwipeLeft) handleNextDay();
      else if (isSwipeRight) handlePrevDay();
  };

  const handleDateClick = (date: Date) => {
      if (onDateSelect) {
          onDateSelect(date);
      } else {
          setSelectedDate(date);
      }
  };

  // Monthly Stats Summary (Current Month)
  const { monthlyTotal, monthlyCount, monthlyFocusAvg, monthlyBreak } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalTime = 0;
    let totalCount = 0;
    let totalFocusSum = 0;
    let totalBreak = 0;
    let daysWithWork = 0;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateTimestamp = new Date(year, month, d).getTime();
        const dateStr = getDateStr(new Date(dateTimestamp));
        const daySessions = filteredSessions.filter(s => isSameDay(s.createdAt, dateTimestamp));
        
        let dayTotal = 0;
        daySessions.forEach(s => dayTotal += calculateDailyTotal([s], s.createdAt));
        
        if (dayTotal > 0) {
            daysWithWork++;
            const breakTime = calculateBreakTime(daySessions);
            const breakCount = daySessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
            totalFocusSum += calculateFocusIndex(dayTotal, breakTime, breakCount);
            totalBreak += breakTime;
        } else {
             const breakTime = calculateBreakTime(daySessions);
             totalBreak += breakTime;
        }
        
        totalTime += dayTotal;
        totalCount += daySessions.length;
    }
    
    const monthlyFocusAvg = daysWithWork > 0 ? Math.round(totalFocusSum / daysWithWork) : 0;

    return {
        monthlyTotal: totalTime,
        monthlyCount: totalCount,
        monthlyFocusAvg,
        monthlyBreak: totalBreak
    };
  }, [filteredSessions, year, month, breakTrackingMode]);

  const monthlyFocusConfig = getFocusLevelConfig(monthlyFocusAvg);

  // Selected Date Stats
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    return filteredSessions.filter(s => isSameDay(s.createdAt, selectedDate.getTime()));
  }, [filteredSessions, selectedDate]);

  const selectedDateStats = useMemo(() => {
    if (!selectedDate) return { breakTime: 0, focusScore: 0, focusConfig: null, workTime: 0 };
    const dateStr = getDateStr(selectedDate);
    const workTime = calculateDailyTotal(filteredSessions, selectedDate.getTime());
    const breakTime = calculateBreakTime(selectedDateSessions);
    const breakCount = selectedDateSessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
    const focusScore = calculateFocusIndex(workTime, breakTime, breakCount);
    const focusConfig = getFocusLevelConfig(focusScore);
    
    return { breakTime, focusScore, focusConfig, workTime };
  }, [selectedDate, filteredSessions, breakTrackingMode, selectedDateSessions]);

  const handleOpenTimeTableForDate = () => {
    if (!selectedDate) return;
    const dateStr = getDateStr(selectedDate);
    onOpenTimeTable(dateStr, selectedDate, selectedDateSessions);
  };

  const hasRecordSelected = selectedDateStats.workTime > 0;

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-300 relative border border-white/20 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Full Overlay Detail View (Slide In from Right) */}
        {selectedDate && !onDateSelect ? (
            <div 
                className="absolute inset-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300 ease-out"
            >
                {/* Detail View Header */}
                <div className="px-3 sm:px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3 shrink-0 z-30 relative">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="p-2 -ml-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors text-slate-600 dark:text-slate-300"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div className="flex items-center gap-1 sm:gap-4">
                                <button onClick={handlePrevDay} className="p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                                <div>
                                    <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 whitespace-nowrap">
                                        {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                                    </h3>
                                </div>
                                <button onClick={handleNextDay} className="p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                             <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-white/10 shadow-sm shrink-0">
                                 <button 
                                    onClick={() => setViewMode('task')}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === 'task' 
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-black/5 dark:ring-white/10' 
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                    title="작업 목록 보기"
                                 >
                                     <LayoutList size={14} />
                                     <span className="hidden sm:inline">작업 목록</span>
                                 </button>
                                 <button 
                                    onClick={() => setViewMode('time')}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === 'time' 
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-black/5 dark:ring-white/10' 
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                    title="타임라인 보기"
                                 >
                                     <Clock size={14} />
                                     <span className="hidden sm:inline">타임라인</span>
                                 </button>
                             </div>

                            <button 
                                onClick={handleOpenTimeTableForDate}
                                className="p-2 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-colors backdrop-blur-sm shrink-0"
                                title="원형 타임라인"
                            >
                                <PieChart size={20} />
                            </button>
                            <button onClick={() => setSelectedDate(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 w-full bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-xl">
                        <div className="flex items-center justify-around w-full text-xs sm:text-sm">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">
                                    집중 점수
                                </span>
                                <span className={`font-bold whitespace-nowrap ${hasRecordSelected ? (selectedDateStats.focusConfig?.textClass || 'text-slate-500') : 'text-slate-400'}`}>
                                    {hasRecordSelected ? `${selectedDateStats.focusScore}점` : '기록 없음'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">작업 시간</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                    {formatDurationHM(calculateDailyTotal(filteredSessions, selectedDate.getTime()))}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold whitespace-nowrap">휴식</span>
                                <span className="font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {formatDurationHM(selectedDateStats.breakTime)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail View Content Slider */}
                <div 
                    className="flex-1 w-full overflow-hidden relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEndDetail}
                >
                    <div 
                        className={`flex h-full w-[300%] absolute top-0 left-0 ${isDetailSliding ? 'transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`}
                        style={{ 
                            transform: `translateX(${
                                !detailSlideDirection ? '-33.3333%' : 
                                detailSlideDirection === 'left' ? '-66.6666%' : '0%'
                            })` 
                        }}
                        onTransitionEnd={handleDetailTransitionEnd}
                    >
                        {/* Prev Day */}
                        <div className="w-1/3 h-full">
                            <DetailList 
                                date={(() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d; })()}
                                sessions={filteredSessions} groups={groups}
                                onDelete={onDelete} onRename={onRename} onGroupChange={onGroupChange} onMemoChange={onMemoChange} onContinue={onContinue} onRestore={onRestore}
                                onDeleteSegment={onDeleteSegment} onDeleteBreak={onDeleteBreak}
                                breakTrackingMode={breakTrackingMode}
                                viewMode={viewMode}
                            />
                        </div>
                        {/* Current Day */}
                        <div className="w-1/3 h-full">
                            <DetailList 
                                date={selectedDate}
                                sessions={filteredSessions} groups={groups}
                                onDelete={onDelete} onRename={onRename} onGroupChange={onGroupChange} onMemoChange={onMemoChange} onContinue={onContinue} onRestore={onRestore}
                                onDeleteSegment={onDeleteSegment} onDeleteBreak={onDeleteBreak}
                                breakTrackingMode={breakTrackingMode}
                                viewMode={viewMode}
                            />
                        </div>
                        {/* Next Day */}
                        <div className="w-1/3 h-full">
                            <DetailList 
                                date={(() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d; })()}
                                sessions={filteredSessions} groups={groups}
                                onDelete={onDelete} onRename={onRename} onGroupChange={onGroupChange} onMemoChange={onMemoChange} onContinue={onContinue} onRestore={onRestore}
                                onDeleteSegment={onDeleteSegment} onDeleteBreak={onDeleteBreak}
                                breakTrackingMode={breakTrackingMode}
                                viewMode={viewMode}
                            />
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            // Calendar Grid View (Slider)
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* ... Calendar Grid Header (Same as before) ... */}
                <div className="px-4 py-4 sm:px-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center sticky top-0 z-30 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                     <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-1 sm:gap-2 bg-white/50 dark:bg-slate-800/50 rounded-2xl p-1 shrink-0 backdrop-blur-sm shadow-sm border border-white/20 dark:border-white/5">
                            <button onClick={handlePrevMonth} className="p-1 sm:p-2 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all">
                                <ChevronLeft size={18} className="text-slate-600 dark:text-slate-300" />
                            </button>
                            <span className="px-2 sm:px-4 text-xs sm:text-lg font-bold text-slate-700 dark:text-slate-200 text-center whitespace-nowrap">
                                {year}년 {month + 1}월
                            </span>
                            <button onClick={handleNextMonth} className="p-1 sm:p-2 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all">
                                <ChevronRight size={18} className="text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>
                        
                        <div className="relative z-50">
                            <Dropdown 
                                value={selectedGroupId}
                                options={[{value: 'all', label: '전체'}, ...groups.map(g => ({ value: g.id, label: g.name, color: g.color }))]}
                                onChange={setSelectedGroupId}
                                size="sm"
                                align="right"
                            />
                        </div>
                     </div>
                    
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-0 sm:border-l sm:border-slate-200/50 dark:sm:border-slate-700/50 sm:pl-4 overflow-x-auto scrollbar-hide w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                         <div className="flex gap-4 items-center">
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase whitespace-nowrap">평균 집중 점수</span>
                                <span className={`text-sm sm:text-lg font-bold whitespace-nowrap ${monthlyFocusConfig.textClass}`}>
                                    {monthlyFocusAvg}점
                                </span>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase whitespace-nowrap">작업 시간</span>
                                <span className="text-sm sm:text-lg font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDurationHM(monthlyTotal)}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase whitespace-nowrap">휴식 시간</span>
                                <span className="text-sm sm:text-lg font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDurationHM(monthlyBreak)}</span>
                            </div>
                         </div>
                    </div>
                  </div>
                 
                  <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors shrink-0 ml-2">
                        <X size={28} />
                    </button>
                  </div>
                </div>

                {/* Slider Container */}
                <div 
                    className="flex-1 w-full overflow-hidden relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEndCalendar}
                >
                    <div 
                        className={`flex h-full w-[300%] absolute top-0 left-0 ${isSliding ? 'transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`}
                        style={{ 
                            transform: `translateX(${
                                !slideDirection ? '-33.3333%' : 
                                slideDirection === 'left' ? '-66.6666%' : '0%'
                            })` 
                        }}
                        onTransitionEnd={handleMonthTransitionEnd}
                    >
                        {/* Previous Month */}
                        <div className="w-1/3 h-full">
                            <MonthGrid 
                                year={month === 0 ? year - 1 : year}
                                month={month === 0 ? 11 : month - 1}
                                sessions={filteredSessions}
                                groups={groups}
                                onSelectDate={handleDateClick}
                            />
                        </div>

                        {/* Current Month */}
                        <div className="w-1/3 h-full">
                            <MonthGrid 
                                year={year}
                                month={month}
                                sessions={filteredSessions}
                                groups={groups}
                                onSelectDate={handleDateClick}
                            />
                        </div>

                        {/* Next Month */}
                        <div className="w-1/3 h-full">
                            <MonthGrid 
                                year={month === 11 ? year + 1 : year}
                                month={month === 11 ? 0 : month + 1}
                                sessions={filteredSessions}
                                groups={groups}
                                onSelectDate={handleDateClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
