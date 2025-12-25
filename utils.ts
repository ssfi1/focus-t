
import { Session, TimeSegment, Group } from './types';

// --- Formatter Helpers ---
export const formatTime = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return '';
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatTimeHM = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return '';
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (ms: number): string => {
  if (isNaN(ms)) return '00:00:00';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const formatDurationHM = (ms: number): string => {
  if (isNaN(ms)) return '0m';
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

// --- Calculation Helpers ---
export const calculateTotalDuration = (segments: TimeSegment[]): number => {
  const now = Date.now();
  // Filter out deleted segments from calculation
  return segments
    .filter(s => !s.deletedAt)
    .reduce((total, segment) => {
      const end = segment.end ?? now;
      return total + (end - segment.start);
    }, 0);
};

export const getAdjustedDateStr = (timestamp: number, startHour: number = 0): string => {
    const d = new Date(timestamp);
    d.setHours(d.getHours() - startHour);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const calculateBreakTime = (
    sessions: Session[], 
    thresholdMs: number = 60000, 
    dayStartHour: number = 0
): number => {
    // Collect all segments (including deleted ones to fill gaps properly)
    const allSegments: {start: number, end: number, stopReason?: string, deletedAt?: number}[] = [];
    sessions.forEach(s => {
        s.segments.forEach(seg => {
            allSegments.push({ 
                start: seg.start, 
                end: seg.end || Date.now(),
                stopReason: seg.stopReason,
                deletedAt: seg.deletedAt
            });
        });
    });
    
    if (allSegments.length === 0) return 0;

    // Sort by start time
    allSegments.sort((a, b) => a.start - b.start);

    let totalBreak = 0;
    
    // Iterate and sum gaps
    for (let i = 0; i < allSegments.length - 1; i++) {
        const current = allSegments[i];
        const next = allSegments[i+1];
        
        // If current or next is "Deleted Gap Filler" (implied by checking if we handle it outside), 
        // logic holds: A deleted segment occupies time, so gap between (A -> Deleted -> B) is 0.
        
        if (next.start > current.end) {
            const gap = next.start - current.end;
            
            // Check day boundary
            const currentDay = getAdjustedDateStr(current.end, dayStartHour);
            const nextDay = getAdjustedDateStr(next.start, dayStartHour);

            if (currentDay !== nextDay) continue; 

            if (gap >= thresholdMs) {
                if (current.stopReason !== 'hard-stop') {
                    totalBreak += gap;
                }
            }
        }
    }
    
    return totalBreak;
};

// --- Focus Index Logic (Centralized) ---
export const calculateFocusIndex = (workMs: number, breakMs: number, breakCount: number) => {
    const totalMs = workMs + breakMs;
    if (totalMs === 0) return 0;
    
    // 1. Ratio Score based on Golden Ratio (52m work : 17m break)
    const idealRatio = 52 / (52 + 17); // ~0.7536
    const currentRatio = workMs / totalMs;
    
    let ratioScore = (currentRatio / idealRatio) * 80;
    ratioScore = Math.min(100, ratioScore); 

    // 2. Frequency Penalty
    const workMinutes = workMs / (1000 * 60);
    const allowedBreaks = 1 + Math.floor(workMinutes / 55);
    
    const excessBreaks = Math.max(0, breakCount - allowedBreaks);
    const penalty = excessBreaks * 5; 

    return Math.max(0, Math.round(ratioScore - penalty));
};

export const getFocusLevelConfig = (score: number) => {
    let subtleGradient = '';
    if (score >= 90) subtleGradient = 'from-emerald-300 via-teal-200 to-cyan-300';
    else if (score >= 80) subtleGradient = 'from-teal-300 via-cyan-200 to-sky-300';
    else if (score >= 70) subtleGradient = 'from-cyan-300 via-sky-200 to-blue-300';
    else if (score >= 60) subtleGradient = 'from-sky-300 via-blue-200 to-indigo-300';
    else if (score >= 50) subtleGradient = 'from-blue-300 via-indigo-200 to-violet-300';
    else if (score >= 40) subtleGradient = 'from-indigo-300 via-violet-200 to-purple-300';
    else if (score >= 30) subtleGradient = 'from-violet-300 via-purple-200 to-fuchsia-300';
    else if (score >= 20) subtleGradient = 'from-purple-300 via-fuchsia-200 to-pink-300';
    else if (score >= 10) subtleGradient = 'from-fuchsia-300 via-pink-200 to-rose-300';
    else subtleGradient = 'from-pink-300 via-rose-200 to-red-300';

    let baseConfig = {
        level: 'D',
        label: '휴식 필요',
        color: 'rose',
        textClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-900/20',
        barClass: 'bg-rose-400',
        gradientFrom: 'from-rose-50',
        gradientTo: 'to-rose-100/50',
        darkGradientFrom: 'dark:from-rose-950/30',
        darkGradientTo: 'dark:to-rose-900/10'
    };

    if (score >= 90) {
        baseConfig = {
            level: 'S',
            label: '최고의 몰입',
            color: 'emerald',
            textClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
            barClass: 'bg-emerald-500',
            gradientFrom: 'from-emerald-50', 
            gradientTo: 'to-emerald-100/50',
            darkGradientFrom: 'dark:from-emerald-950/30',
            darkGradientTo: 'dark:to-emerald-900/10'
        };
    } else if (score >= 80) {
        baseConfig = {
            level: 'A',
            label: '훌륭한 집중',
            color: 'cyan',
            textClass: 'text-cyan-600 dark:text-cyan-400',
            bgClass: 'bg-cyan-50 dark:bg-cyan-900/20',
            barClass: 'bg-cyan-500',
            gradientFrom: 'from-cyan-50',
            gradientTo: 'to-cyan-100/50',
            darkGradientFrom: 'dark:from-cyan-950/30',
            darkGradientTo: 'dark:to-cyan-900/10'
        };
    } else if (score >= 60) {
        baseConfig = {
            level: 'B',
            label: '양호한 흐름',
            color: 'blue',
            textClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-900/20',
            barClass: 'bg-blue-500',
            gradientFrom: 'from-blue-50',
            gradientTo: 'to-blue-100/50',
            darkGradientFrom: 'dark:from-blue-950/30',
            darkGradientTo: 'dark:to-blue-900/10'
        };
    } else if (score >= 40) {
        baseConfig = {
            level: 'C',
            label: '주의 분산',
            color: 'violet',
            textClass: 'text-violet-600 dark:text-violet-400',
            bgClass: 'bg-violet-50 dark:bg-violet-900/20',
            barClass: 'bg-violet-400',
            gradientFrom: 'from-violet-50',
            gradientTo: 'to-violet-100/50',
            darkGradientFrom: 'dark:from-violet-950/30',
            darkGradientTo: 'dark:to-violet-900/10'
        };
    }
    
    return { ...baseConfig, subtleGradient };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// --- Date Helpers ---
export const getDateStr = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export const isSameDay = (d1: number, d2: number): boolean => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const calculateDailyTotal = (sessions: Session[], targetDate: number): number => {
  return sessions
    .filter(s => isSameDay(s.createdAt, targetDate))
    .reduce((acc, s) => acc + calculateTotalDuration(s.segments), 0);
};

// --- Groups & Styles ---
export const GROUP_COLORS = {
  blue: { 
    bg: 'bg-blue-50 dark:bg-blue-900/30', 
    text: 'text-blue-600 dark:text-blue-300', 
    border: 'border-blue-200 dark:border-blue-800', 
    dot: 'bg-blue-500' 
  },
  emerald: { 
    bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
    text: 'text-emerald-600 dark:text-emerald-300', 
    border: 'border-emerald-200 dark:border-emerald-800', 
    dot: 'bg-emerald-500' 
  },
  violet: { 
    bg: 'bg-violet-50 dark:bg-violet-900/30', 
    text: 'text-violet-600 dark:text-violet-300', 
    border: 'border-violet-200 dark:border-violet-800', 
    dot: 'bg-violet-500' 
  },
  amber: { 
    bg: 'bg-amber-50 dark:bg-amber-900/30', 
    text: 'text-amber-600 dark:text-amber-300', 
    border: 'border-amber-200 dark:border-amber-800', 
    dot: 'bg-amber-500' 
  },
  rose: { 
    bg: 'bg-rose-50 dark:bg-rose-900/30', 
    text: 'text-rose-600 dark:text-rose-300', 
    border: 'border-rose-200 dark:border-rose-800', 
    dot: 'bg-rose-500' 
  },
  cyan: { 
    bg: 'bg-cyan-50 dark:bg-cyan-900/30', 
    text: 'text-cyan-600 dark:text-cyan-300', 
    border: 'border-cyan-200 dark:border-cyan-800', 
    dot: 'bg-cyan-500' 
  },
  slate: { 
    bg: 'bg-slate-100 dark:bg-slate-800', 
    text: 'text-slate-600 dark:text-slate-400', 
    border: 'border-slate-200 dark:border-slate-700', 
    dot: 'bg-slate-500' 
  },
};

export type ColorKey = keyof typeof GROUP_COLORS;

export const getGroupStyle = (color: string) => {
  return GROUP_COLORS[color as ColorKey] || GROUP_COLORS.slate;
};

// Task Color Palette
// Excluded Green/Teal (Break) and Gray/Slate (Hard Stop/Other Group) shades
const TASK_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e'  // Rose
];

export const generateTaskColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TASK_PALETTE.length;
  return TASK_PALETTE[index];
};

// --- CSV Logic (Rebuilt) ---
export const downloadCSV = (sessions: Session[], groups: Group[]) => {
  const headers = [
    'ID', '작업명', '그룹명', '날짜', '시작시간', '종료시간', '소요시간(초)', '상태', '메모', 'RawTimestamp', 'SegmentsJSON'
  ];
  const csvRows = [headers.join(',')];
  sessions.forEach(session => {
    const group = groups.find(g => g.id === session.groupId)?.name || '미지정';
    const dateObj = new Date(session.createdAt);
    const dateStr = dateObj.toLocaleDateString('ko-KR');
    const firstSeg = session.segments[0];
    const lastSeg = session.segments[session.segments.length - 1];
    const startStr = firstSeg ? new Date(firstSeg.start).toLocaleTimeString('ko-KR') : '';
    const endStr = lastSeg?.end ? new Date(lastSeg.end).toLocaleTimeString('ko-KR') : '';
    const duration = Math.round(calculateTotalDuration(session.segments) / 1000);
    const status = session.completionStatus === 'on-hold' ? '보류' : '완료';
    const escape = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const row = [
      escape(session.id), escape(session.name), escape(group), escape(dateStr), escape(startStr), escape(endStr),
      duration, escape(status), escape(session.memo || ''), session.createdAt, escape(JSON.stringify(session.segments))
    ].join(',');
    csvRows.push(row);
  });
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const today = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `workflow_backup_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
