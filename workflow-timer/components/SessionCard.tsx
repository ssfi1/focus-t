
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Session, Group } from '../types';
import { formatDuration, formatTime, calculateTotalDuration, getGroupStyle, formatDurationHM } from '../utils';
import { Timeline } from './Timeline';
import { ChevronDown, ChevronUp, Clock, Edit2, Check, Play, CirclePause, Trash2, StickyNote, Activity, Coffee, Maximize2, Hash, X, AlertTriangle } from 'lucide-react';
import { Dropdown } from './Dropdown';

interface SessionCardProps {
  session: Session;
  groups: Group[];
  onRename: (id: string, newName: string) => void;
  onGroupChange: (id: string, newGroupId: string) => void;
  onMemoChange: (id: string, newMemo: string) => void;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
  onRemoveHold?: (id: string) => void;
  isHighlighted?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  groups, 
  onRename, 
  onGroupChange, 
  onMemoChange,
  onContinue,
  onDelete,
  onRemoveHold,
  isHighlighted = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [memo, setMemo] = useState(session.memo || '');
  
  // Unified Popup State: Stores Type and Position and Direction
  const [popup, setPopup] = useState<{type: 'delete' | 'hold', x: number, y: number, position: 'top' | 'bottom'} | null>(null);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isHighlighted) {
      setIsExpanded(true);
    }
  }, [isHighlighted]);

  const totalDuration = calculateTotalDuration(session.segments);
  const startTime = session.segments.length > 0 ? session.segments[0].start : session.createdAt;
  const lastSegment = session.segments[session.segments.length - 1];
  const endTime = lastSegment?.end;
  
  const isOnHold = session.completionStatus === 'on-hold';
  const isRunning = session.isActive;

  // Calculate detailed stats for expanded view
  const stats = useMemo(() => {
      let maxDuration = 0;
      let breakTime = 0;
      let breakCount = 0;
      
      const segments = session.segments;
      if (segments.length > 0) {
          // Max Focus Time (Exclude deleted segments)
          segments.forEach(seg => {
              if (seg.deletedAt) return; 
              const dur = (seg.end || Date.now()) - seg.start;
              if (dur > maxDuration) maxDuration = dur;
          });

          // Break Stats (Simple gap calculation)
          // We include deleted gap segments here because they bridge the gap (reducing break time)
          for (let i = 0; i < segments.length - 1; i++) {
              const current = segments[i];
              const next = segments[i+1];
              if (current.end && next.start > current.end) {
                  const gap = next.start - current.end;
                  if (gap > 0 && current.stopReason !== 'hard-stop') {
                      breakTime += gap;
                      breakCount++;
                  }
              }
          }
      }
      return { maxDuration, breakTime, breakCount };
  }, [session.segments]);
  
  const handleSaveName = () => {
    onRename(session.id, editName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
  };

  const handleMemoBlur = () => {
    if (memo !== session.memo) {
      onMemoChange(session.id, memo);
    }
  };

  const toggleExpand = () => {
    if (!isEditing && !popup) {
        setIsExpanded(!isExpanded);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const popoverHeight = 120; // Estimated height
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const position = spaceBelow < popoverHeight ? 'top' : 'bottom';

      // Anchor top-right of popup to bottom-right of button (if bottom)
      setPopup({ 
          type: 'delete', 
          x: rect.right, 
          y: position === 'bottom' ? rect.bottom + 8 : rect.top - 8,
          position
      });
  };

  const confirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(session.id);
      setPopup(null);
  };

  const confirmRemoveHold = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveHold?.(session.id);
      setPopup(null);
  };

  const cancelPopup = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setPopup(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isOnHold) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Check space for context menu
    const popoverHeight = 120;
    const spaceBelow = window.innerHeight - e.clientY;
    const position = spaceBelow < popoverHeight ? 'top' : 'bottom';

    // Use mouse position for context menu trigger
    setPopup({ 
        type: 'hold', 
        x: e.clientX, 
        y: e.clientY,
        position
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOnHold) return;
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    longPressTimer.current = window.setTimeout(() => {
        // Simple heuristic for touch as well
        const popoverHeight = 120;
        const spaceBelow = window.innerHeight - clientY;
        const position = spaceBelow < popoverHeight ? 'top' : 'bottom';

        setPopup({ 
            type: 'hold', 
            x: clientX, 
            y: clientY,
            position
        });
    }, 600); // 600ms long press
  };

  const handleTouchMove = () => {
      // If user scrolls, cancel the long press
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  return (
    <div 
      id={`session-${session.id}`}
      onClick={toggleExpand}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`relative glass-card rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.01] hover:-translate-y-0.5 overflow-visible select-none cursor-pointer group ${
        isRunning 
          ? 'ring-2 ring-indigo-500 shadow-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10' 
          : isHighlighted 
            ? 'ring-2 ring-indigo-500/50 shadow-indigo-500/20' 
            : isOnHold 
              ? 'border-amber-200/50 dark:border-amber-900/30 ring-1 ring-amber-100 dark:ring-amber-900/20' 
              : ''
      } ${popup && popup.type === 'delete' ? 'ring-2 ring-red-200 dark:ring-red-900/50' : ''}`}
    >
        {/* Render Popup via Portal to escape containing block constraints */}
        {popup && createPortal(
            <div 
                className="fixed inset-0 z-[9999] flex items-start justify-start cursor-default" 
                onClick={(e) => { e.stopPropagation(); cancelPopup(); }}
            >
                {/* Invisible backdrop to capture clicks everywhere */}
                <div 
                    className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200"
                    style={{ 
                        top: popup.y, 
                        left: popup.x,
                        // If it's delete button (right side), anchor right edge. If context menu (mouse), anchor left.
                        // Simple heuristic: if x is > window width / 2, translate -100%
                        // Also apply Y transform if positioned 'top'
                        transform: `${popup.x > window.innerWidth / 2 ? 'translateX(-100%)' : 'translateX(0)'} ${popup.position === 'top' ? 'translateY(-100%)' : 'translateY(0)'}`,
                        borderColor: popup.type === 'delete' ? 'rgba(239,68,68,0.3)' : 'rgba(229,231,235,0.5)'
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
                >
                    {popup.type === 'delete' ? (
                        <>
                            <div className="flex items-start gap-2 mb-3">
                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full shrink-0">
                                    <AlertTriangle size={14} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">삭제하시겠습니까?</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">휴지통으로 이동합니다.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={cancelPopup}
                                    className="flex-1 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm shadow-red-500/30"
                                >
                                    삭제
                                </button>
                            </div>
                            {/* Arrow Pointer (Visual only) */}
                            <div className={`absolute right-3 w-3 h-3 bg-white dark:bg-slate-800 border-l border-red-100 dark:border-red-900/30 rotate-45 pointer-events-none ${popup.position === 'bottom' ? '-top-1.5 border-t' : '-bottom-1.5 border-b'}`}></div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 mb-3">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full shrink-0">
                                    <Check size={14} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">보류 상태 해제</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">작업 목록으로 복귀합니다.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={cancelPopup}
                                    className="flex-1 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={confirmRemoveHold}
                                    className="flex-1 py-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-sm shadow-green-500/30"
                                >
                                    해제
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>,
            document.body
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1 z-[60] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
           {!isRunning && (
             <button 
               type="button"
               onClick={(e) => {
                   e.stopPropagation();
                   onContinue(session.id);
               }}
               className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-full transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
               title="이어하기"
             >
               <Play size={16} fill="currentColor" className="pointer-events-none" />
             </button>
           )}
           
           <div className="relative">
               <button 
                 type="button"
                 onClick={handleDeleteClick}
                 className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer backdrop-blur-sm ${popup?.type === 'delete' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'text-slate-400 hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-900/20'}`}
                 title="삭제"
               >
                 <Trash2 size={16} className="pointer-events-none" />
               </button>
           </div>
        </div>
        
        {/* Adjusted top position from 14 to 16 to avoid overlap */}
        <div className="md:hidden absolute top-16 right-4 z-40 flex items-center gap-1 text-indigo-900 dark:text-indigo-100 bg-indigo-50/80 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full font-mono font-bold text-sm shadow-sm border border-indigo-100/50 dark:border-indigo-800/50 backdrop-blur-md">
             <Clock size={14} className="text-indigo-500 dark:text-indigo-400" />
             {formatDuration(totalDuration)}
        </div>

      <div className="pt-5 px-5 pb-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          
          <div className="flex-1 pr-14 md:pr-20">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="relative group" onClick={(e) => e.stopPropagation()}>
                <Dropdown 
                    value={session.groupId}
                    options={groups.map(g => ({ value: g.id, label: g.name, color: g.color }))}
                    onChange={(val) => onGroupChange(session.id, val)}
                    size="sm"
                />
              </div>

              {isRunning && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-600 text-white shadow-sm">
                  진행 중
                </span>
              )}

              {isOnHold && !isRunning && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100/80 text-amber-700 border border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 backdrop-blur-sm">
                  <CirclePause size={10} />
                  보류됨
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-1 px-2 py-1 text-lg font-bold text-slate-800 dark:text-slate-100 border-b-2 border-indigo-500 focus:outline-none bg-white/20 dark:bg-black/20 rounded-t select-text"
                  />
                  <button onClick={handleSaveName} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="group/edit flex items-center gap-2">
                  <h3 className={`text-lg font-bold truncate tracking-tight ${isRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>{session.name}</h3>
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                    }} 
                    className="opacity-0 group-hover/edit:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100/50"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-1 whitespace-nowrap">
                  <Clock size={14} className="opacity-70" />
                  <span>{formatTime(startTime)} - {endTime ? formatTime(endTime) : (isRunning ? '진행 중' : '...')}</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-2 md:mt-0">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold border shadow-sm backdrop-blur-sm ${isRunning ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-200' : 'bg-white/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 border-white/50 dark:border-indigo-500/20'}`}>
              <Clock size={16} className={isRunning ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'} />
              {formatDuration(totalDuration)}
            </div>
          </div>
        </div>

        <div 
            className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="overflow-hidden">
                <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-5 mt-2">
                     {/* Simplified Single Line Stats */}
                     <div className="bg-slate-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-700/50 mb-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">최대 집중</span>
                            <span className="font-bold text-slate-800 dark:text-white">{formatDurationHM(stats.maxDuration)}</span>
                        </span>
                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                        <span className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">휴식 시간</span>
                            <span className="font-bold text-slate-800 dark:text-white">{formatDurationHM(stats.breakTime)}</span>
                        </span>
                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                        <span className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">휴식</span>
                            <span className="font-bold text-slate-800 dark:text-white">{stats.breakCount}회</span>
                        </span>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                           <Timeline segments={session.segments} />
                        </div>
                        <div className="bg-white/40 dark:bg-black/20 rounded-2xl p-4 border border-white/20 dark:border-white/5 shadow-inner h-full">
                          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <StickyNote size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">메모</span>
                          </div>
                          <textarea
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            onBlur={handleMemoBlur}
                            placeholder="작업에 대한 간단한 메모를 남겨보세요..."
                            className="w-full h-24 bg-transparent border-none p-2 text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-0 placeholder:text-slate-400/70 select-text cursor-text"
                          />
                        </div>
                     </div>
                </div>
            </div>
        </div>
        
        <button 
            onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
            }}
            className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 dark:text-slate-500 dark:hover:text-indigo-400 transition-all rounded-full"
        >
            <ChevronDown size={20} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
        </button>
      </div>
    </div>
  );
};
