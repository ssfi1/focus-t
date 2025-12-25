
import React from 'react';
import { Button } from './Button';
import { BatteryWarning, X } from 'lucide-react';

interface MobileOptimizationModalProps {
  onClose: () => void;
}

export const MobileOptimizationModal: React.FC<MobileOptimizationModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-300 border border-white/20 dark:border-white/10 relative text-center">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
        >
            <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6 mt-4">
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-800/30 relative">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 animate-ping"></div>
                <BatteryWarning size={36} strokeWidth={1.5} />
            </div>
        </div>

        {/* Main Title */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 leading-tight break-keep">
            백그라운드 제한을<br/>해제해주세요
        </h3>
        
        {/* Description */}
        <div className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed space-y-4">
            <p>
                모바일 절전 모드로 인해 화면이 꺼지면<br/>
                <strong className="text-amber-600 dark:text-amber-400">타이머가 멈출 수 있습니다.</strong>
            </p>
            
            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-xs text-left space-y-2.5">
                <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold shadow-sm border border-slate-200 dark:border-slate-600">1</div>
                    <p className="flex-1 pt-0.5">앱 아이콘 길게 누르기 <span className="text-slate-400">&gt;</span> 정보(i)</p>
                </div>
                <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold shadow-sm border border-slate-200 dark:border-slate-600">2</div>
                    <p className="flex-1 pt-0.5">배터리 <span className="text-slate-400">&gt;</span> <strong>제한 없음</strong> (또는 최적화 제외)</p>
                </div>
            </div>
        </div>

        {/* Action Button */}
        <Button onClick={onClose} className="w-full justify-center py-4 text-base shadow-lg shadow-indigo-500/20">
            확인했습니다
        </Button>
      </div>
    </div>
  );
};
