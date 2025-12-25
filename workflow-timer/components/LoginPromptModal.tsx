
import React from 'react';
import { Button } from './Button';
import { LogIn, CheckCircle2, X, BatteryWarning } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onLogin: () => void;
  onSkip: () => void;
  isMobile?: boolean;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ isOpen, onLogin, onSkip, isMobile }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 border border-white/20 dark:border-white/10 text-center relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        
        {/* Decorative Background Blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -z-10"></div>

        <div className="mb-6 animate-in zoom-in duration-700 delay-100">
            <span className="text-4xl">👋</span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          환영합니다!
        </h2>
        
        <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                데이터를 동기화하면<br/>더 편리하게 사용할 수 있습니다.
            </p>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 flex flex-col items-center">
                <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    PC와 모바일 어디서든 이어서 작업
                </li>
                <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    소중한 기록 안전하게 클라우드 백업
                </li>
            </ul>
        </div>

        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
          <Button 
            onClick={onLogin} 
            className="w-full justify-center py-3.5 text-sm shadow-xl shadow-indigo-200/50 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white border-none" 
            icon={<LogIn size={18} />}
          >
            Google로 로그인하고 동기화
          </Button>
          
          <button 
            onClick={onSkip}
            className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            괜찮습니다, 로컬에서만 사용할게요
          </button>
        </div>

        {/* Mobile Battery Optimization Warning (Inline) */}
        {isMobile && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-700">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <BatteryWarning size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">백그라운드 제한 해제 필요</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        화면이 꺼져도 타이머가 정상 작동하려면<br/>
                        <strong>설정 &gt; 애플리케이션 &gt; 배터리</strong>에서<br/>
                        <strong className="text-amber-600 dark:text-amber-400">'제한 없음'</strong>으로 설정해주세요.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
