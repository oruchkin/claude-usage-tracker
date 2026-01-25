import React from 'react';
import Tooltip from './Tooltip';

interface InputFieldProps {
  label: string;
  type: string;
  value: string | number;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  suffix?: string;
  min?: string;
  max?: string;
  step?: string;
  variant?: 'default' | 'dimmed';
  hint?: string;
  tooltip?: string;
  highlight?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, type, value, onChange, icon, suffix, min, max, step, variant = 'default', hint, tooltip, highlight = false
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // UX Fix: Only for NUMBER inputs. 
    // If the user types a number while the value is "0" (e.g., becomes "07"),
    // or if a leading zero persists, remove it unless it's a decimal "0."
    if (type === 'number') {
        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
          val = val.substring(1);
        }
    }
    
    onChange(val);
  };

  const isDimmed = variant === 'dimmed';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className={`block text-sm font-medium transition-colors ${isDimmed ? 'text-gray-300 hover:text-gray-400' : 'text-gray-700'}`}>
            {label}
          </label>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        {hint && (
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {hint}
          </span>
        )}
      </div>
      <div className="relative rounded-md shadow-sm group">
        {icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDimmed ? 'text-gray-300 group-hover:text-gray-400' : 'text-gray-400'}`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={`
            block w-full rounded-lg border py-2.5 px-3 sm:text-sm transition-all
            focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white focus:text-gray-900
            ${icon ? 'pl-10' : ''} 
            ${suffix ? 'pr-12' : ''}
            ${highlight ? 'animate-subtle-pulse ring-1 ring-indigo-200 border-indigo-300' : ''}
            ${isDimmed && !highlight
              ? 'bg-gray-50/50 border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-white hover:text-gray-600 hover:shadow-sm' 
              : 'bg-white border-gray-300 text-gray-900'}
          `}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`sm:text-sm transition-colors ${isDimmed ? 'text-gray-300 group-hover:text-gray-400' : 'text-gray-500'}`}>{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputField;