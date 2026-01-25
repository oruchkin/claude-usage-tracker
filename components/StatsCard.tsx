import React, { useEffect, useState } from 'react';
import { CalculationResult } from '../types';
import { formatDuration, formatRelativeTime } from '../utils/timeUtils';
import { CheckCircle, XCircle, TrendingUp, AlertTriangle, ArrowRight, AlertCircle } from 'lucide-react';
import Tooltip from './Tooltip';

interface StatsCardProps {
  stats: CalculationResult;
  windowLengthHours: number;
  currentDate: Date;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats, windowLengthHours, currentDate }) => {
  const {
    windowStart,
    windowEnd,
    ratePerHour,
    safeRatePerHour,
    remainingPercent,
    estimatedFinishDate,
    timeProgressPercent,
    status,
    isWindowActive,
  } = stats;

  // Calculate used percent
  const percentUsed = 100 - remainingPercent;

  // Calculate deviation for display
  const usageDeviation = percentUsed - timeProgressPercent; 
  
  // Calculate time remaining until reset
  const timeToResetMs = windowEnd.getTime() - currentDate.getTime();
  
  // --- Animations ---
  const [animPace, setAnimPace] = useState(false);
  const [animSafe, setAnimSafe] = useState(false);
  const [animEst, setAnimEst] = useState(false);

  // Trigger animation when Used Percent changes (User Input)
  useEffect(() => {
    setAnimPace(true);
    setAnimEst(true);
    const t = setTimeout(() => { setAnimPace(false); setAnimEst(false); }, 400);
    return () => clearTimeout(t);
  }, [remainingPercent]); // Stable dependence on input

  // Trigger animation when Window Length changes (User Input)
  useEffect(() => {
    setAnimSafe(true);
    setAnimEst(true);
    const t = setTimeout(() => { setAnimSafe(false); setAnimEst(false); }, 400);
    return () => clearTimeout(t);
  }, [windowLengthHours]);

  const statusConfig = {
    ok: {
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      barColor: 'bg-emerald-500',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Safe',
    },
    warning: {
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      barColor: 'bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5" />,
      label: 'Warning',
    },
    critical: {
      color: 'bg-rose-100 text-rose-800 border-rose-200',
      barColor: 'bg-rose-500',
      icon: <XCircle className="w-5 h-5" />,
      label: 'Critical',
    },
  };

  const currentStatus = statusConfig[status];

  return (
    // Removed overflow-hidden so tooltips can float outside
    <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-300 flex flex-col">
      <div className="p-4 sm:p-6 space-y-6 flex-grow">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Statistics
            <Tooltip text="Real-time analysis of your current short-term usage window." />
          </h2>
          <div className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-1 rounded-full text-sm font-medium border ${currentStatus.color} self-start sm:self-auto`}>
            {currentStatus.icon}
            <span>{currentStatus.label}</span>
          </div>
        </div>

        {/* Not Started Warning */}
        {!isWindowActive && (
          <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-xs uppercase tracking-wider mb-0.5">Window Inactive</span>
              <span>Next window starts: <strong>{formatRelativeTime(windowStart, currentDate)}</strong></span>
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="grid grid-cols-1 gap-y-4 text-sm">
          
          {/* Row 1: Times */}
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-100">
             <div>
                <span className="text-gray-500 block text-[10px] sm:text-xs uppercase tracking-wide flex items-center gap-1">
                  Window Start
                  <Tooltip text="When this usage window began." />
                </span>
                <span className="font-semibold text-gray-900 font-mono text-base sm:text-lg whitespace-nowrap">
                  {formatRelativeTime(windowStart, currentDate)}
                </span>
             </div>
             <div className="text-right flex flex-col items-end">
                <span className="text-gray-500 block text-[10px] sm:text-xs uppercase tracking-wide flex items-center gap-1">
                  Reset Time
                  <Tooltip text="When your quota resets and this window ends." />
                </span>
                <span className="font-semibold text-gray-900 font-mono text-base sm:text-lg whitespace-nowrap">
                  {formatRelativeTime(windowEnd, currentDate)}
                </span>
             </div>
          </div>

          {/* Row 2: Pace */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium flex items-center gap-1">
                Current Pace
                <Tooltip text="Your average hourly consumption in this window." />
              </span>
              <span className={`text-[10px] sm:text-xs text-gray-400 transition-all ${animSafe ? 'animate-pop text-indigo-500 font-bold' : ''}`}>
                Max safe: {safeRatePerHour.toFixed(1)}% / h
              </span>
            </div>
            <div className={`font-bold font-mono text-lg sm:text-xl transition-all ${animPace ? 'animate-pop' : ''} ${ratePerHour > safeRatePerHour ? 'text-rose-600' : 'text-emerald-600'}`}>
               {ratePerHour.toFixed(1)} <span className="text-sm font-normal text-gray-500">/ h</span>
            </div>
          </div>

          {/* Row 3: Exhaustion */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600 font-medium flex items-center gap-1">
              Est. Exhaustion
              <Tooltip text="At current pace, when you will hit 100% usage." />
            </span>
            <span className={`font-semibold font-mono text-base sm:text-lg transition-all ${animEst ? 'animate-pop' : ''} ${status === 'critical' ? 'text-rose-600' : 'text-gray-900'}`}>
              {estimatedFinishDate ? formatRelativeTime(estimatedFinishDate, currentDate) : '--:--'}
            </span>
          </div>

          {/* Row 4: Time to Reset */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 font-medium">
              <span>Time to Reset</span>
            </div>
            <span className="font-semibold font-mono text-lg text-indigo-600">
              {formatDuration(Math.max(0, timeToResetMs))}
            </span>
          </div>

          {/* Row 5: Visual Progress */}
          <div className="pt-4">
             <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${currentStatus.barColor}`}></div>
                  Used: {percentUsed.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  Time: {timeProgressPercent.toFixed(1)}%
                </span>
             </div>
             
             {/* Comparative Progress Bar */}
             {/* Base Track */}
             <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden shadow-inner ring-1 ring-gray-200/50">
                
                {/* 1. Time Indicator (The Benchmark - Neutral Gray) */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-slate-300 z-10 border-r border-slate-400 transition-all duration-500"
                  style={{ width: `${Math.min(timeProgressPercent, 100)}%` }}
                >
                  {/* Label inside bar if wide enough */}
                  {timeProgressPercent > 20 && (
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase hidden sm:block">
                       Time
                     </span>
                  )}
                </div>

                {/* 2. Usage Bar (The Actual - Colored) */}
                {/* z-index 20 ensures it draws ON TOP of the time bar */}
                <div 
                  className={`absolute top-0 bottom-0 left-0 z-20 transition-all duration-500 opacity-90 ${currentStatus.barColor} flex items-center justify-end pr-2`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                >
                   {/* Label inside bar if wide enough */}
                   {percentUsed > 20 && (
                     <span className="text-[10px] font-bold text-white uppercase drop-shadow-md hidden sm:block">
                       Used
                     </span>
                  )}
                </div>
             </div>
             
             {/* Status Text */}
             <div className="mt-3 text-center text-xs">
                {usageDeviation > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center justify-center gap-1 bg-rose-50 py-1 px-2 rounded-md inline-block">
                    <ArrowRight className="w-3 h-3" />
                    +{usageDeviation.toFixed(1)}% over budget
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50 py-1 px-2 rounded-md inline-block">
                    <CheckCircle className="w-3 h-3" />
                    {Math.abs(usageDeviation).toFixed(1)}% under budget
                  </span>
                )}
             </div>
          </div>
        
        </div>
      </div>
      
      {/* Footer warning if Critical */}
      {status === 'critical' && (
        <div className="bg-rose-50 border-t border-rose-100 p-3 text-center text-xs text-rose-700 font-medium animate-pulse rounded-b-2xl">
          Alert: Consuming faster than time allows.
        </div>
      )}
    </div>
  );
};

export default StatsCard;