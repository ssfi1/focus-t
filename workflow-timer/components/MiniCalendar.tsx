
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDateStr } from '../utils';

interface MiniCalendarProps {
  initialDate?: Date;
  onDateSelect: (dateStr: string) => void;
  selectedStart?: string;
  selectedEnd?: string;
  onClose?: () => void;
  showFooter?: boolean;
  onClear?: () => void;
  onApply?: () => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ 
  initialDate, 
  onDateSelect, 
  selectedStart, 
  selectedEnd,
  onClose,
  showFooter = false,
  onClear,
  onApply
}) => {
  const [pickerDate, setPickerDate] = useState(initialDate || new Date());

  const getCalendarDays = () => {
      const year = pickerDate.getFullYear();
      const month = pickerDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();
      
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= lastDate; i++) days.push(getDateStr(new Date(year, month, i)));
      return days;
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
            <button 
                onClick={(e) => { e.stopPropagation(); setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1)); }} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {pickerDate.getFullYear()}년 {pickerDate.getMonth() + 1}월
            </span>
            <button 
                onClick={(e) => { e.stopPropagation(); setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1)); }} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            >
                <ChevronRight size={16} />
            </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} className="text-[10px] text-slate-400 font-bold py-1">{d}</div>
            ))}
            {getCalendarDays().map((dayStr, i) => {
                if (!dayStr) return <div key={`empty-${i}`} />;
                
                const isStart = dayStr === selectedStart;
                const isEnd = dayStr === selectedEnd;
                const isInRange = selectedStart && selectedEnd && dayStr > selectedStart && dayStr < selectedEnd;
                
                // For single select mode (navigation), check if it matches target
                const isSelected = !selectedEnd && dayStr === selectedStart;

                return (
                    <button 
                        key={i}
                        onClick={(e) => { e.stopPropagation(); onDateSelect(dayStr); }}
                        className={`
                            h-8 w-8 text-xs rounded-full flex items-center justify-center transition-colors relative
                            ${(isStart || isEnd || isSelected) ? 'bg-indigo-600 text-white font-bold z-10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                            ${isInRange ? 'bg-indigo-50 dark:bg-indigo-900/30 !rounded-none w-full mx-[-2px]' : ''}
                        `}
                    >
                        {parseInt(dayStr.split('-')[2])}
                    </button>
                );
            })}
        </div>

        {showFooter && (
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); if(onClear) onClear(); }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1"
                >
                    초기화
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); if(onApply) onApply(); }}
                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md font-bold hover:bg-indigo-700"
                >
                    적용
                </button>
            </div>
        )}
    </div>
  );
};
