
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getGroupStyle } from '../utils';

interface Option {
  value: string;
  label: string;
  color?: string; // For group colors
}

interface DropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  className = '',
  align = 'left',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const style = selectedOption?.color ? getGroupStyle(selectedOption.color) : { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 transition-all duration-200 outline-none
          ${size === 'sm' ? 'px-2 py-1 text-xs rounded-lg' : 'px-3 py-1.5 text-sm rounded-xl'}
          ${selectedOption?.color 
            ? `${style.bg} ${style.text} border ${style.border}` 
            : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm'}
        `}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.color && (
            <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
          )}
          <span className="font-bold truncate max-w-[100px]">{selectedOption?.label || 'Select'}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`
            absolute z-[60] mt-2 min-w-[140px] max-h-[240px] overflow-y-auto scrollbar-hide
            bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10
            rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          <div className="p-1">
            {options.map((option) => {
              const optStyle = option.color ? getGroupStyle(option.color) : null;
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                    ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {optStyle && (
                      <div className={`w-2 h-2 rounded-full ${optStyle.dot}`}></div>
                    )}
                    <span className={isSelected ? 'font-bold' : 'font-medium'}>{option.label}</span>
                  </div>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
