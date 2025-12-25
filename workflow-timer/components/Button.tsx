
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon,
  ...props 
}) => {
  // Pill shaped, glassy focus ring, smooth transform
  const baseStyle = "inline-flex items-center justify-center px-5 py-2.5 rounded-full font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96] relative overflow-hidden outline-none focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 shadow-lg hover:shadow-xl backdrop-blur-sm";
  
  const variants = {
    primary: "bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-500/50 shadow-indigo-500/30",
    secondary: "bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-700/80 shadow-slate-200/50 dark:shadow-none",
    danger: "bg-red-500/90 hover:bg-red-500 text-white border border-red-400/50 shadow-red-500/30",
    warning: "bg-amber-400/90 hover:bg-amber-400 text-white border border-amber-300/50 shadow-amber-400/30",
    success: "bg-emerald-500/90 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-500/30",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-700/50 shadow-none hover:shadow-none border-none"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {icon && <span className="mr-2 flex items-center">{icon}</span>}
      {children}
    </button>
  );
};
