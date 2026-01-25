import React, { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className = "" }) => {
  return (
    <div className={`group relative inline-flex items-center ${className} z-50`}>
      {children || <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-help" />}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-center transform group-hover:-translate-y-1 z-[9999]">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );
};

export default Tooltip;