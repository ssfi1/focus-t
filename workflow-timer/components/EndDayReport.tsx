
import React, { useMemo } from 'react';
import { Session, WorkDay } from '../types';
import { calculateDailyTotal, formatDurationHM, calculateBreakTime, calculateFocusIndex, getFocusLevelConfig } from '../utils';
import { Trophy, Clock, Coffee, CheckCircle2, LogOut, X, BarChart3, Zap } from 'lucide-react';
import { Button } from './Button';

interface EndDayReportProps {
  sessions: Session[];
  currentSession: Session | null;
  workDay: WorkDay;
  onConfirm: () => void;
  onClose: () => void;
  breakTrackingMode?: 'pause-only' | 'attendance-based';
  averages?: { work: number, break: number } | null;
}

export const EndDayReport: React.FC<EndDayReportProps> = ({ 
  sessions,
  currentSession,
  workDay, 
  onConfirm, 
  onClose,
  breakTrackingMode = 'pause-only',
  averages
}) => {
  const stats = useMemo(() => {
    // Determine Work boundaries
    const startTime = workDay.startTime;
    
    // Combine history + current session for accurate calculation
    const allSessions = currentSession ? [...sessions, currentSession] : sessions;

    const workTime = calculateDailyTotal(allSessions, startTime); 
    const count = allSessions.length;

    // Use unified break calculation logic
    // calculateBreakTime(sessions, thresholdMs, dayStartHour)
    const breakTime = calculateBreakTime(
        allSessions, 
        60000, 
        new Date(workDay.startTime).getHours()
    );

    const breakCount = allSessions.reduce((acc, s) => acc + Math.max(0, s.segments.length - 1), 0);
    const focusScore = calculateFocusIndex(workTime, breakTime, breakCount);
    const focusConfig = getFocusLevelConfig(focusScore);

    return { workTime, count, breakTime, focusScore, focusConfig };
  }, [sessions, currentSession, workDay, breakTrackingMode]);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 relative border border-white/20 dark:border-white/10">
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
            <X size={20} />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
            
            {/* HERO: Focus Index Ring */}
            <div className="relative mb-6 flex justify-center items-center w-full animate-in zoom-in duration-500">
                <div className={`relative w-32 h-32 flex items-center justify-center`}>
                    {/* Background Circle */}
                    <div className={`absolute inset-0 rounded-full border-[6px] border-slate-100 dark:border-slate-800 ${stats.focusConfig.bgClass}`}></div>
                    
                    {/* Content */}
                    <div className="flex flex-col items-center z-10 relative">
                        <span className={`text-4xl font-black ${stats.focusConfig.textClass} tracking-tighter`}>{stats.focusScore}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${stats.focusConfig.textClass}`}>{stats.focusConfig.label}</span>
                    </div>

                    {/* Decorative Ring (SVG) */}
                    <svg className="absolute inset-0 w-full h-full rotate-[-90deg] pointer-events-none" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="6" fill="none" className={`${stats.focusConfig.textClass} opacity-20`} />
                        <circle 
                            cx="64" cy="64" r="60" 
                            stroke="currentColor" strokeWidth="6" fill="none" 
                            strokeDasharray={377} strokeDashoffset={377 - (377 * stats.focusScore / 100)}
                            strokeLinecap="round"
                            className={`${stats.focusConfig.textClass} transition-all duration-1000 ease-out`} 
                        />
                    </svg>
                    
                    {/* Badge */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1 whitespace-nowrap z-20">
                        <Zap size={12} className={stats.focusConfig.textClass} fill="currentColor" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">집중 점수</span>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">오늘 하루도 수고하셨습니다!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                오늘의 업무 흐름은 <strong>{stats.focusConfig.label}</strong> 상태였네요.<br/>편안한 저녁 시간 보내세요.
            </p>

            <div className="w-full grid grid-cols-2 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                <div className="bg-slate-50/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-100/50 dark:border-slate-700/50 relative backdrop-blur-sm">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1">
                        <Clock size={12} /> 총 작업 시간
                    </div>
                    <div className="text-xl font-black text-slate-800 dark:text-white">
                        {formatDurationHM(stats.workTime)}
                    </div>
                </div>
                <div className="bg-slate-50/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-100/50 dark:border-slate-700/50 backdrop-blur-sm">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} /> 완료한 작업
                    </div>
                    <div className="text-xl font-black text-slate-800 dark:text-white">
                        {stats.count}개
                    </div>
                </div>
                 <div className="bg-slate-50/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-100/50 dark:border-slate-700/50 col-span-2 relative backdrop-blur-sm">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1">
                        <Coffee size={12} /> 총 휴식 시간
                    </div>
                    <div className="text-xl font-black text-slate-600 dark:text-slate-300">
                        {formatDurationHM(stats.breakTime)}
                    </div>
                </div>
            </div>

            <Button 
                onClick={onConfirm} 
                className="w-full h-14 text-lg shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 animate-in zoom-in duration-300 delay-500"
                icon={<LogOut size={20} />}
            >
                퇴근 완료하기
            </Button>
        </div>
      </div>
    </div>
  );
};
