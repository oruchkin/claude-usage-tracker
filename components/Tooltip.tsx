
import React, { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className = "", style }) => {
  if (!text) return <>{children}</>;
  
  return (
    <div 
      className={`group relative ${className}`} 
      style={style}
    >
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[220px] px-3 py-2 bg-gray-900 text-white text-[11px] font-bold leading-tight rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-center transform group-hover:-translate-y-1 z-[10000]">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default Tooltip;
