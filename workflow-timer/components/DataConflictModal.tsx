
import React from 'react';
import { Button } from './Button';
import { Cloud, Smartphone, Merge, AlertTriangle } from 'lucide-react';

interface DataConflictModalProps {
  onKeepCloud: () => void;
  onKeepLocal: () => void;
  onMerge: () => void;
}

export const DataConflictModal: React.FC<DataConflictModalProps> = ({ 
  onKeepCloud, 
  onKeepLocal, 
  onMerge 
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-300 border border-white/20 dark:border-white/10 text-center relative">
        
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                <AlertTriangle size={32} />
            </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">데이터 중복 발견</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            클라우드와 로컬 저장소 모두에 데이터가 존재합니다.<br/>
            어떤 데이터를 사용할지 선택해주세요.
        </p>

        <div className="flex flex-col gap-3">
            <button 
                onClick={onKeepCloud}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 shrink-0">
                    <Cloud size={20} />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">클라우드 데이터 사용</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">현재 로컬 데이터를 덮어씁니다.</div>
                </div>
            </button>

            <button 
                onClick={onKeepLocal}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
            >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 shrink-0">
                    <Smartphone size={20} />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">로컬 데이터 사용</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">클라우드 데이터를 덮어씁니다.</div>
                </div>
            </button>

            <button 
                onClick={onMerge}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 transition-all group"
            >
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50 shrink-0">
                    <Merge size={20} />
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">모두 병합하기</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        두 데이터를 합칩니다.<br/>
                        <span className="text-violet-500/80 font-medium">(중복 시 로컬 데이터 우선)</span>
                    </div>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};
