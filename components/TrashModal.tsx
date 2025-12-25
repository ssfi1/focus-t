
import React, { useState, useRef, useEffect } from 'react';
import { Session, Group } from '../types';
import { formatDurationHM, getGroupStyle, formatTime } from '../utils';
import { X, RefreshCcw, Trash2, Archive, Layers, Clock, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';

interface TrashModalProps {
  deletedSessions: Session[];
  groups: Group[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  
  // New props for segment trash
  activeSessions: Session[]; // Need active sessions to find deleted segments within them
  onRestoreSegment: (sessionId: string, segmentIndex: number) => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ 
  deletedSessions, 
  groups, 
  onClose, 
  onRestore, 
  onPermanentDelete,
  onEmptyTrash,
  activeSessions,
  onRestoreSegment
}) => {
  const [activeTab, setActiveTab] = useState<'session' | 'segment'>('session');
  
  // Confirmation States
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [deletePopover, setDeletePopover] = useState<{ id: string, x: number, y: number, position: 'top' | 'bottom' } | null>(null);

  // Collect deleted segments from active sessions
  const deletedSegments = activeSessions.flatMap(session => 
      session.segments
          .map((seg, idx) => ({ ...seg, originalSessionId: session.id, originalIndex: idx, sessionName: session.name }))
          .filter(seg => seg.deletedAt)
  ).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

  const handleEmptyTrashClick = () => {
      setIsEmptyTrashConfirmOpen(true);
  };

  const confirmEmptyTrash = () => {
      onEmptyTrash();
      setIsEmptyTrashConfirmOpen(false);
  };

  const handleDeleteItemClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const popoverHeight = 100; // Approx height
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const position = spaceBelow < popoverHeight ? 'top' : 'bottom';
      
      setDeletePopover({
          id,
          x: rect.right,
          y: position === 'bottom' ? rect.bottom + 8 : rect.top - 8,
          position
      });
  };

  const confirmDeleteItem = () => {
      if (deletePopover) {
          onPermanentDelete(deletePopover.id);
          setDeletePopover(null);
      }
  };

  // Close popover on click outside
  useEffect(() => {
      const handleClick = () => setDeletePopover(null);
      if (deletePopover) window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, [deletePopover]);

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in zoom-in-95 duration-200"
        onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh] animate-in slide-in-from-bottom-4 duration-300 border border-white/20 dark:border-white/10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 shrink-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 size={20} className="text-red-500" />
                휴지통
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
                onClick={() => setActiveTab('session')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'session' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
            >
                <Layers size={16} /> 작업 휴지통 ({deletedSessions.length})
            </button>
            <button 
                onClick={() => setActiveTab('segment')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'segment' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
            >
                <Clock size={16} /> 시간 휴지통 ({deletedSegments.length})
            </button>
        </div>

        {/* List - Added min-h to keep layout tall */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30 flex-1 scrollbar-hide min-h-[400px]">
            
            {/* SESSION TRASH */}
            {activeTab === 'session' && (
                <>
                    {deletedSessions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3 py-10">
                            <Trash2 size={48} className="opacity-20" />
                            <p>삭제된 작업이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end mb-4">
                                <Button variant="danger" onClick={handleEmptyTrashClick} className="h-8 text-xs px-3">
                                    휴지통 비우기
                                </Button>
                            </div>
                            {deletedSessions.sort((a,b) => (b.deletedAt || 0) - (a.deletedAt || 0)).map((session, idx) => {
                                const group = groups.find(g => g.id === session.groupId) || { name: '미지정', color: 'slate' };
                                const style = getGroupStyle(group.color);
                                
                                return (
                                    <div key={session.id} className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${style.bg} ${style.text}`}>
                                                    {group.name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    삭제일: {new Date(session.deletedAt || 0).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{session.name}</h4>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                작업 시간: {formatDurationHM(session.segments.reduce((acc, s) => acc + ((s.end||Date.now()) - s.start), 0))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button 
                                                onClick={() => onRestore(session.id)}
                                                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                                            >
                                                <RefreshCcw size={16} />
                                                복구
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteItemClick(e, session.id)}
                                                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${deletePopover?.id === session.id ? 'bg-red-100 text-red-600' : 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'}`}
                                            >
                                                <X size={16} />
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {/* SEGMENT TRASH */}
            {activeTab === 'segment' && (
                <>
                    {deletedSegments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3 py-10">
                            <Clock size={48} className="opacity-20" />
                            <p>삭제된 시간 조각이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deletedSegments.map((seg, idx) => (
                                <div key={`${seg.originalSessionId}-${seg.originalIndex}`} className="bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${seg.isDeletedGap ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                                {seg.isDeletedGap ? '제거된 휴식' : '제거된 작업'}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                삭제일: {new Date(seg.deletedAt || 0).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            {seg.sessionName}
                                            <span className="text-xs font-normal text-slate-500 font-mono">
                                                ({formatTime(seg.start)} ~ {formatTime(seg.end || Date.now())})
                                            </span>
                                        </h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button 
                                            onClick={() => onRestoreSegment(seg.originalSessionId, seg.originalIndex)}
                                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                                        >
                                            <RefreshCcw size={16} />
                                            복구
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

        </div>

        {/* 1. Empty Trash Confirmation Modal (Centered) */}
        {isEmptyTrashConfirmOpen && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 p-6 animate-in fade-in duration-200 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">휴지통을 비우시겠습니까?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                    삭제된 모든 항목이 영구적으로 제거되며, <br/> 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-3 w-full max-w-xs">
                    <button 
                        onClick={() => setIsEmptyTrashConfirmOpen(false)}
                        className="flex-1 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        취소
                    </button>
                    <button 
                        onClick={confirmEmptyTrash}
                        className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-colors"
                    >
                        모두 비우기
                    </button>
                </div>
            </div>
        )}

        {/* 2. Individual Delete Confirmation (Floating Popover) */}
        {deletePopover && createPortal(
            <div 
                className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200"
                style={{ 
                    top: deletePopover.y, 
                    left: deletePopover.x,
                    transform: deletePopover.position === 'bottom' ? 'translateX(-100%)' : 'translateX(-100%) translateY(-100%)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-red-100 dark:border-red-900/30 p-3 min-w-[200px] relative ${deletePopover.position === 'bottom' ? 'mt-2' : 'mb-2'}`}>
                    {/* Arrow pointing to button */}
                    <div className={`absolute right-6 w-3 h-3 bg-white dark:bg-slate-800 border-l border-red-100 dark:border-red-900/30 rotate-45 ${deletePopover.position === 'bottom' ? '-top-1.5 border-t' : '-bottom-1.5 border-b'}`}></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-start gap-2 mb-3">
                            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full shrink-0">
                                <AlertTriangle size={14} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">영구 삭제</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">복구할 수 없습니다.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setDeletePopover(null)}
                                className="flex-1 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={confirmDeleteItem}
                                className="flex-1 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm shadow-red-500/30"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}

      </div>
    </div>
  );
};
