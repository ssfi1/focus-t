
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Session, Group } from '../types';
import { calculateDailyTotal, formatDurationHM, getDateStr, isSameDay, calculateBreakTime, calculateFocusIndex, getFocusLevelConfig } from '../utils';
import { Calendar, Trophy, Coffee, X, ArrowRight, Layers, BarChart3, Clock, Activity, Zap, BarChart, ChevronLeft, ChevronRight, MousePointer2, Crown, Medal, TrendingUp, BatteryMedium, BatteryLow, Hash, LayoutGrid, Timer, CheckCircle2 } from 'lucide-react';
import { Dropdown } from './Dropdown';
import { MiniCalendar } from './MiniCalendar';

interface StatsDashboardProps {
  sessions: Session[];
  groups: Group[];
  onClose: () => void;
}

type ChartType = 'balance' | 'workTime' | 'breakTime' | 'workCount' | 'breakCount' | 'focusIndex';

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  sessions, 
  groups, 
  onClose,
}) => {
  // Default range set to 'all'
  const [range, setRange] = useState<'all' | 'week' | 'month' | 'custom' | 'yesterday'>('all');
  const [chartType, setChartType] = useState<ChartType>('balance');
  
  // Custom Range State
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  // Drag Scroll State
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const rangeScrollRef = useRef<HTMLDivElement>(null);
  const chartTypeScrollRef = useRef<HTMLDivElement>(null);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartContainerRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - chartContainerRef.current.offsetLeft;
    scrollLeft.current = chartContainerRef.current.scrollLeft;
    chartContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseLeave = () => { 
      isDragging.current = false; 
      if(chartContainerRef.current) chartContainerRef.current.style.cursor = 'grab';
      setHoveredIdx(null);
  };
  
  const handleMouseUp = () => { 
      isDragging.current = false; 
      if(chartContainerRef.current) chartContainerRef.current.style.cursor = 'grab';
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !chartContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // Scroll speed multiplier
    chartContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const filteredSessions = useMemo(() => {
    if (selectedGroupId === 'all') return sessions;
    return sessions.filter(s => s.groupId === selectedGroupId);
  }, [sessions, selectedGroupId]);

  const today = Date.now();
  const todayTotal = calculateDailyTotal(filteredSessions, today);
  
  const todayMetrics = useMemo(() => {
    const todayStr = getDateStr();
    const workTime = todayTotal;
    const todaySessions = filteredSessions.filter(s => {
        const d = new Date(s.createdAt);
        return d.toLocaleDateString('en-CA') === todayStr;
    });
    const count = todaySessions.length;
    const breakTime = calculateBreakTime(todaySessions);
    const breakCount = todaySessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
    const focusIndex = calculateFocusIndex(workTime, breakTime, breakCount);

    return { workTime, count, breakTime, breakCount, focusIndex };
  }, [filteredSessions, todayTotal]);

  const { summary, chartData, averages } = useMemo(() => {
    let startTime = 0;
    let endTime = Date.now();

    if (range === 'yesterday') {
        const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0);
        startTime = d.getTime(); d.setHours(23,59,59,999); endTime = d.getTime();
    } else if (range === 'week') {
        const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0);
        startTime = d.getTime();
    } else if (range === 'month') {
        const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0,0,0,0);
        startTime = d.getTime();
    } else if (range === 'all') {
        const firstSessionTime = sessions.length > 0 ? sessions[sessions.length - 1].createdAt : Date.now();
        startTime = firstSessionTime;
    } else if (range === 'custom') {
        startTime = customRange.start ? new Date(customRange.start).getTime() : Date.now();
        endTime = customRange.end ? new Date(customRange.end).setHours(23, 59, 59, 999) : Date.now();
    }

    const dailyData: any[] = [];
    let currentDate = new Date(startTime);
    const lastDate = new Date(endTime);
    currentDate.setHours(0,0,0,0);

    let totalWorkTime = 0, totalBreakTime = 0, totalFocusSum = 0, activeWorkDays = 0, totalTasks = 0, totalBreakCount = 0;

    let safety = 0;
    while (currentDate <= lastDate && safety < 365) {
        const dTimestamp = currentDate.getTime();
        const dStr = getDateStr(currentDate);
        
        const dayWork = filteredSessions
            .filter(s => isSameDay(s.createdAt, dTimestamp))
            .reduce((acc, s) => acc + calculateDailyTotal([s], s.createdAt), 0);
        
        const daySessions = filteredSessions.filter(s => isSameDay(s.createdAt, dTimestamp));
        const dayBreak = calculateBreakTime(daySessions);
        const dayTaskCount = daySessions.length;
        const dayBreakCount = daySessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
        const dayFocusIndex = calculateFocusIndex(dayWork, dayBreak, dayBreakCount);

        if (dayWork > 0) {
            activeWorkDays++;
            totalWorkTime += dayWork;
            totalFocusSum += dayFocusIndex;
            totalTasks += dayTaskCount;
            totalBreakCount += dayBreakCount;
        }
        totalBreakTime += dayBreak; // Accumulate break time even on non-active days if present? Usually tied to sessions.

        dailyData.push({
            label: currentDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            dateStr: dStr,
            work: dayWork,
            break: dayBreak,
            total: dayWork + dayBreak,
            taskCount: dayTaskCount,
            breakCount: dayBreakCount,
            focusIndex: dayFocusIndex
        });

        currentDate.setDate(currentDate.getDate() + 1);
        safety++;
    }

    const divisor = activeWorkDays || 1;
    return { 
        summary: { total: totalWorkTime, count: totalTasks, breakTime: totalBreakTime, breakCount: totalBreakCount, avgFocus: Math.round(totalFocusSum / divisor) },
        chartData: dailyData,
        averages: { 
            work: totalWorkTime / divisor, 
            break: totalBreakTime / divisor, 
            count: totalTasks / divisor, 
            breakCount: totalBreakCount / divisor,
            focus: totalFocusSum / divisor 
        }
    };
  }, [filteredSessions, range, customRange, sessions]);

  const maxChartValue = useMemo(() => {
      if (chartData.length === 0) return 1;
      let values: number[] = [];
      if (chartType === 'balance') values = chartData.map(d => d.total);
      else if (chartType === 'workTime') values = chartData.map(d => d.work);
      else if (chartType === 'breakTime') values = chartData.map(d => d.break);
      else if (chartType === 'workCount') values = chartData.map(d => d.taskCount);
      else if (chartType === 'breakCount') values = chartData.map(d => d.breakCount);
      else if (chartType === 'focusIndex') return 100;
      return Math.max(...values, 1);
  }, [chartData, chartType]);

  const formatCompactValue = (val: number, type: ChartType) => {
      if (val === 0) return '';
      if (type.includes('Time') || type === 'balance') {
          const hours = val / (1000 * 60 * 60);
          if (hours >= 1) return `${hours.toFixed(1)}h`;
          const mins = Math.floor(val / (1000 * 60));
          return `${mins}m`;
      }
      return `${val}`;
  };

  const handleRangeSelect = (dateStr: string) => {
      setCustomRange(prev => {
          if (!prev.start || (prev.start && prev.end)) {
              return { start: dateStr, end: '' };
          }
          if (dateStr < prev.start) {
              return { start: dateStr, end: prev.start };
          }
          return { ...prev, end: dateStr };
      });
  };

  const getChartTitle = () => {
      switch (chartType) {
          case 'balance': return '작업/휴식 밸런스';
          case 'workTime': return '일별 작업 시간';
          case 'breakTime': return '일별 휴식 시간';
          case 'workCount': return '일별 작업 수';
          case 'breakCount': return '일별 휴식 횟수';
          case 'focusIndex': return '일별 집중 점수';
      }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
      if (ref.current) {
          const scrollAmount = direction === 'left' ? -150 : 150;
          ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
  };

  const focusConfig = getFocusLevelConfig(todayMetrics.focusIndex);
  const avgFocusConfig = getFocusLevelConfig(summary.avgFocus);

  // Helper for Grade Icon
  const getGradeIcon = (level: string) => {
      switch(level) {
          case 'S': return <Crown size={24} className="text-emerald-500 animate-pulse" />;
          case 'A': return <Medal size={24} className="text-cyan-500" />;
          case 'B': return <TrendingUp size={24} className="text-blue-500" />;
          case 'C': return <BatteryMedium size={24} className="text-amber-500" />;
          default: return <BatteryLow size={24} className="text-rose-500" />;
      }
  };

  const hasRecordToday = todayMetrics.workTime > 0;

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center sticky top-0 z-10 shrink-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart className="text-indigo-500" size={20} />
                나의 작업 통계
            </h2>
            <div className="flex items-center gap-2">
                 <Dropdown 
                    value={selectedGroupId}
                    options={[{value: 'all', label: '전체 그룹'}, ...groups.map(g => ({ value: g.id, label: g.name, color: g.color }))]}
                    onChange={setSelectedGroupId}
                    size="sm"
                    align="right"
                />
                <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide">
            
            {/* 1. New Top Section: Today's Stats with 5-stage Icon */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm ${hasRecordToday ? focusConfig.bgClass : 'bg-slate-100/50 dark:bg-slate-800/30'} border-slate-200/50 dark:border-slate-700/50`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                        {hasRecordToday ? getGradeIcon(focusConfig.level) : <Coffee size={24} className="text-slate-400" />}
                    </div>
                    <div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${hasRecordToday ? focusConfig.textClass : 'text-slate-500'}`}>Today Status</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
                            {hasRecordToday ? focusConfig.label : '기록 없음'} 
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 sm:gap-4 text-right">
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">작업 시간</div>
                        <div className="font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDurationHM(todayMetrics.workTime)}</div>
                    </div>
                    <div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">작업 수</div>
                         <div className="font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">{todayMetrics.count}개</div>
                    </div>
                    <div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">집중 점수</div>
                         <div className={`font-black whitespace-nowrap ${hasRecordToday ? focusConfig.textClass : 'text-slate-400'}`}>{hasRecordToday ? Math.round(todayMetrics.focusIndex) + '점' : '-'}</div>
                    </div>
                </div>
            </div>

            {/* 2. Analysis Section */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2 text-sm">
                            <Calendar size={16} />
                            기간별 분석
                        </h4>
                    </div>

                    {/* Range Selector */}
                    <div className="relative group/scroll">
                        <div className="flex items-center gap-1">
                            <button onClick={() => scrollContainer(rangeScrollRef, 'left')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0"><ChevronLeft size={16} /></button>
                            <div ref={rangeScrollRef} className="flex overflow-x-auto scrollbar-hide pb-1 gap-2 w-full px-1">
                                {(['all', 'yesterday', 'week', 'month', 'custom'] as const).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRange(r)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${range === r ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        {{all:'전체', yesterday:'어제', week:'최근 7일', month:'최근 30일', custom:'직접 지정'}[r]}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => scrollContainer(rangeScrollRef, 'right')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Custom Range Picker */}
                    {range === 'custom' && (
                        <div className="relative z-50 animate-in fade-in slide-in-from-top-2">
                            <button 
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between hover:border-indigo-500 transition-colors shadow-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    {customRange.start ? `${customRange.start} ~ ${customRange.end || '종료일 선택'}` : '기간 선택하기'}
                                </span>
                                {isDatePickerOpen ? <X size={14} /> : <ArrowRight size={14} className="text-slate-400" />}
                            </button>
                            {isDatePickerOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in zoom-in-95 duration-200">
                                    <MiniCalendar 
                                        selectedStart={customRange.start}
                                        selectedEnd={customRange.end}
                                        onDateSelect={handleRangeSelect}
                                        onClose={() => setIsDatePickerOpen(false)}
                                        showFooter={true}
                                        onClear={() => setCustomRange({start:'', end:''})}
                                        onApply={() => setIsDatePickerOpen(false)}
                                    />
                                    <div className="mt-3 text-[10px] text-center text-slate-400">
                                        시작일과 종료일을 차례로 선택하세요.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Summary Boxes (Improved Design with Decoration Icons) */}
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
                    {/* Row 1: 2 Boxes */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-between h-24 relative group overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-[10px] font-black uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-1">총 작업</div>
                                 <div className="text-xl font-black text-slate-800 dark:text-slate-100">{formatDurationHM(summary.total)}</div>
                             </div>
                             <div className="text-[9px] text-slate-400 mt-0.5 relative z-10">Avg: {formatDurationHM(averages.work)}</div>
                             <Clock className="absolute -bottom-2 -right-2 text-indigo-200 dark:text-indigo-800/50 w-16 h-16 opacity-30 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex flex-col justify-between h-24 relative group overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-[10px] font-black uppercase tracking-wide text-emerald-500 dark:text-emerald-400 mb-1">총 휴식</div>
                                 <div className="text-xl font-black text-slate-800 dark:text-slate-100">{formatDurationHM(summary.breakTime)}</div>
                             </div>
                             <div className="text-[9px] text-slate-400 mt-0.5 relative z-10">Avg: {formatDurationHM(averages.break)}</div>
                             <Coffee className="absolute -bottom-2 -right-2 text-emerald-200 dark:text-emerald-800/50 w-16 h-16 opacity-30 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Row 2: 3 Boxes */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex flex-col justify-between h-24 relative group overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-[10px] font-black uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-1">작업 수</div>
                                 <div className="text-lg font-black text-slate-800 dark:text-slate-100">{summary.count}회</div>
                             </div>
                             <div className="text-[9px] text-slate-400 mt-0.5 relative z-10">Avg: {Math.round(averages.count * 10) / 10}</div>
                             <CheckCircle2 className="absolute -bottom-3 -right-3 text-blue-200 dark:text-blue-800/50 w-14 h-14 opacity-50 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>

                        {/* Break Count: Cyan (Blue-Green) */}
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-2xl border border-cyan-100 dark:border-cyan-800/50 flex flex-col justify-between h-24 relative group overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-[10px] font-black uppercase tracking-wide text-cyan-500 dark:text-cyan-400 mb-1">휴식 수</div>
                                 <div className="text-lg font-black text-slate-800 dark:text-slate-100">{summary.breakCount}회</div>
                             </div>
                             <div className="text-[9px] text-slate-400 mt-0.5 relative z-10">Avg: {Math.round(averages.breakCount * 10) / 10}</div>
                             <Timer className="absolute -bottom-3 -right-3 text-cyan-200 dark:text-cyan-800/50 w-14 h-14 opacity-50 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>

                        {/* Avg Focus Score: Orange */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/50 flex flex-col justify-between h-24 relative group overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-[10px] font-black uppercase tracking-wide text-orange-500 dark:text-orange-400 mb-1">평균 집중 점수</div>
                                 <div className="text-lg font-black text-slate-700 dark:text-slate-200">{summary.avgFocus}점</div>
                             </div>
                             <div className="text-[9px] font-bold text-slate-400 mt-0.5 relative z-10 truncate">{avgFocusConfig.label}</div>
                             <Zap className="absolute -bottom-3 -right-3 text-orange-200 dark:text-orange-800/50 w-14 h-14 opacity-50 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* Graph Area */}
                <div className="mt-6 animate-in fade-in duration-700 relative">
                    
                    {/* Chart Type Selector */}
                    <div className="relative group/scroll mb-4">
                        <div className="flex items-center gap-1">
                            <button onClick={() => scrollContainer(chartTypeScrollRef, 'left')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0"><ChevronLeft size={16} /></button>
                            <div ref={chartTypeScrollRef} className="flex overflow-x-auto scrollbar-hide pb-2 w-full gap-2 px-1">
                                {[
                                    { id: 'balance', label: '밸런스' },
                                    { id: 'workTime', label: '작업 시간' },
                                    { id: 'breakTime', label: '휴식 시간' },
                                    { id: 'focusIndex', label: '집중 점수' },
                                    { id: 'workCount', label: '작업 수' },
                                    { id: 'breakCount', label: '휴식 횟수' }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setChartType(type.id as ChartType)}
                                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full whitespace-nowrap transition-all border shrink-0 ${chartType === type.id ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-transparent shadow-md' : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => scrollContainer(chartTypeScrollRef, 'right')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {chartType === 'focusIndex' ? <Zap size={16} /> : <BarChart3 size={16} />}
                        {getChartTitle()}
                      </div>
                      {chartType === 'balance' && (
                          <div className="flex gap-2 text-[10px] font-bold uppercase">
                            <span className="flex items-center gap-1 text-slate-500"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>작업</span>
                            <span className="flex items-center gap-1 text-slate-500"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>휴식</span>
                          </div>
                      )}
                    </div>

                    {/* Chart Container */}
                    <div className="relative h-56 w-full">
                        {/* Interactive Scrollable Area */}
                        <div 
                            ref={chartContainerRef}
                            className="relative w-full h-full overflow-x-auto scrollbar-hide z-10 cursor-grab active:cursor-grabbing touch-pan-x"
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                        >
                            <div className="flex items-end gap-2 pb-8 pt-10 h-full min-w-full w-max px-2">
                                {chartData.length > 0 ? chartData.map((d, i) => {
                                    const isHovered = hoveredIdx === i;
                                    let barContent = null;
                                    let displayValue = "";
                                    
                                    if (chartType === 'balance') {
                                        const workHeight = maxChartValue > 0 ? (d.work / maxChartValue) * 100 : 0;
                                        const breakHeight = maxChartValue > 0 ? (d.break / maxChartValue) * 100 : 0;
                                        const workPercent = d.total > 0 ? Math.round((d.work / d.total) * 100) : 0;
                                        const breakPercent = d.total > 0 ? Math.round((d.break / d.total) * 100) : 0;
                                        
                                        displayValue = formatCompactValue(d.total, 'balance');
                                        barContent = (
                                            <div className="w-full h-full flex flex-col-reverse justify-end rounded-t-sm overflow-hidden transition-all hover:opacity-90 relative">
                                                <div style={{ height: `${workHeight}%` }} className="bg-indigo-500 w-full min-h-[1px] transition-all duration-500 relative">
                                                    {workPercent > 10 && (
                                                        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/90">{workPercent}%</span>
                                                    )}
                                                </div>
                                                <div style={{ height: `${breakHeight}%` }} className="bg-slate-300 dark:bg-slate-600 w-full min-h-[1px] transition-all duration-500 relative">
                                                    {breakPercent > 10 && (
                                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-600 dark:text-slate-300">{breakPercent}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        let value = 0, color = "";
                                        if (chartType === 'workTime') { value = d.work; color = "bg-indigo-500"; }
                                        else if (chartType === 'breakTime') { value = d.break; color = "bg-slate-400"; }
                                        else if (chartType === 'workCount') { value = d.taskCount; color = "bg-blue-500"; }
                                        else if (chartType === 'breakCount') { value = d.breakCount; color = "bg-cyan-400"; } // Updated to Cyan
                                        else if (chartType === 'focusIndex') { 
                                            value = d.focusIndex; 
                                            color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-indigo-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
                                        }
                                        
                                        displayValue = formatCompactValue(value, chartType);
                                        const height = maxChartValue > 0 ? (value / maxChartValue) * 100 : 0;
                                        barContent = (
                                            <div className="w-full h-full flex items-end rounded-t-sm overflow-hidden transition-all hover:opacity-90">
                                                <div style={{ height: `${height}%` }} className={`${color} w-full min-h-[1px] transition-all duration-500`}></div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div 
                                            key={i} 
                                            className="flex-1 min-w-[32px] max-w-[3.5rem] h-full flex flex-col justify-end group relative"
                                            // onMouseEnter removed (tooltip disabled)
                                            onTouchStart={() => setHoveredIdx(i)}
                                        >
                                            {/* Value Label Above Bar */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap opacity-70 group-hover:opacity-100 transition-opacity">
                                                {displayValue}
                                            </div>

                                            {barContent}
                                            
                                            {/* Date Label Below Bar */}
                                            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[9px] sm:text-[10px] font-medium whitespace-nowrap transition-colors ${isHovered ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                                {d.label}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">데이터가 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
