
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

  const percentUsed = 100 - remainingPercent;
  const usageDeviation = percentUsed - timeProgressPercent; 
  const timeToResetMs = windowEnd.getTime() - currentDate.getTime();
  
  const [animPace, setAnimPace] = useState(false);
  const [animSafe, setAnimSafe] = useState(false);
  const [animEst, setAnimEst] = useState(false);

  useEffect(() => {
    setAnimPace(true);
    setAnimEst(true);
    const t = setTimeout(() => { setAnimPace(false); setAnimEst(false); }, 400);
    return () => clearTimeout(t);
  }, [remainingPercent]);

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
    <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-300 flex flex-col">
      <div className="p-4 sm:p-6 space-y-6 flex-grow">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <Tooltip text="Real-time analysis of your current short-term usage window.">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 cursor-help">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              Statistics
            </h2>
          </Tooltip>
          <div className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-1 rounded-full text-sm font-medium border ${currentStatus.color} self-start sm:self-auto`}>
            {currentStatus.icon}
            <span>{currentStatus.label}</span>
          </div>
        </div>

        {!isWindowActive && (
          <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-sm flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-xs uppercase tracking-wider mb-0.5">Window Inactive</span>
              <span>Next window starts: <strong>{formatRelativeTime(windowStart, currentDate)}</strong></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-100">
             <Tooltip text="When this usage window began.">
               <div className="cursor-help">
                  <span className="text-gray-500 block text-[10px] sm:text-xs uppercase tracking-wide">Window Start</span>
                  <span className="font-semibold text-gray-900 font-mono text-base sm:text-lg whitespace-nowrap">
                    {formatRelativeTime(windowStart, currentDate)}
                  </span>
               </div>
             </Tooltip>
             <Tooltip text="When your quota resets and this window ends.">
               <div className="text-right flex flex-col items-end cursor-help">
                  <span className="text-gray-500 block text-[10px] sm:text-xs uppercase tracking-wide">Reset Time</span>
                  <span className="font-semibold text-gray-900 font-mono text-base sm:text-lg whitespace-nowrap">
                    {formatRelativeTime(windowEnd, currentDate)}
                  </span>
               </div>
             </Tooltip>
          </div>

          <Tooltip text="Your average hourly consumption vs the recommended safe pace.">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 cursor-help">
              <div className="flex flex-col">
                <span className="text-gray-600 font-medium">Current Pace</span>
                <span className={`text-[10px] sm:text-xs text-gray-400 transition-all ${animSafe ? 'animate-pop text-indigo-500 font-bold' : ''}`}>
                  Max safe: {safeRatePerHour.toFixed(1)}% / h
                </span>
              </div>
              <div className={`font-bold font-mono text-lg sm:text-xl transition-all ${animPace ? 'animate-pop' : ''} ${ratePerHour > safeRatePerHour ? 'text-rose-600' : 'text-emerald-600'}`}>
                 {ratePerHour.toFixed(1)} <span className="text-sm font-normal text-gray-500">/ h</span>
              </div>
            </div>
          </Tooltip>

          <Tooltip text="At current pace, when you will hit 100% usage.">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 cursor-help">
              <span className="text-gray-600 font-medium">Est. Exhaustion</span>
              <span className={`font-semibold font-mono text-base sm:text-lg transition-all ${animEst ? 'animate-pop' : ''} ${status === 'critical' ? 'text-rose-600' : 'text-gray-900'}`}>
                {estimatedFinishDate ? formatRelativeTime(estimatedFinishDate, currentDate) : '--:--'}
              </span>
            </div>
          </Tooltip>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600 font-medium">Time to Reset</span>
            <span className="font-semibold font-mono text-lg text-indigo-600">
              {formatDuration(Math.max(0, timeToResetMs))}
            </span>
          </div>

          <div className="pt-4">
             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${currentStatus.barColor}`}></div>
                  Used: {percentUsed.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  Time: {timeProgressPercent.toFixed(1)}%
                </span>
             </div>
             
             <div className="relative h-8 w-full bg-gray-100 rounded-lg shadow-inner ring-1 ring-gray-200/50 flex">
                {/* 1. USED SEGMENT */}
                <Tooltip 
                  text={`Current Usage: ${percentUsed.toFixed(1)}%`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  className="h-full cursor-help z-30"
                >
                  <div className={`h-full w-full opacity-95 ${currentStatus.barColor} shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-l-lg flex items-center justify-center`}>
                     {percentUsed > 12 && <span className="text-[10px] font-bold text-white uppercase drop-shadow-sm">USED</span>}
                  </div>
                </Tooltip>

                {/* 2. TIME-GAP SEGMENT (Only visible if Time > Used) */}
                {timeProgressPercent > percentUsed && (
                  <Tooltip 
                    text={`Time Elapsed: ${timeProgressPercent.toFixed(1)}%`}
                    style={{ width: `${Math.min(timeProgressPercent - percentUsed, 100 - percentUsed)}%` }}
                    className="h-full cursor-help z-20"
                  >
                    <div className="h-full w-full bg-slate-200 border-x border-slate-300/50" />
                  </Tooltip>
                )}

                {/* 3. REMAINING SEGMENT */}
                <Tooltip 
                  text={`Window Remaining: ${(100 - Math.max(percentUsed, timeProgressPercent)).toFixed(1)}%`}
                  style={{ flex: 1 }}
                  className="h-full cursor-help z-10"
                >
                  <div className="h-full w-full bg-transparent rounded-r-lg" />
                </Tooltip>
             </div>
             
             <div className="mt-3 text-center text-xs">
                {usageDeviation > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center justify-center gap-1 bg-rose-50 py-1.5 px-3 rounded-lg inline-block shadow-sm">
                    <ArrowRight className="w-3 h-3" />
                    +{usageDeviation.toFixed(1)}% over budget
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block shadow-sm">
                    <CheckCircle className="w-3 h-3" />
                    {Math.abs(usageDeviation).toFixed(1)}% under budget
                  </span>
                )}
             </div>
          </div>
        </div>
      </div>
      
      {status === 'critical' && (
        <div className="bg-rose-50 border-t border-rose-100 p-3 text-center text-[10px] sm:text-xs text-rose-700 font-bold animate-pulse uppercase tracking-wider rounded-b-2xl">
          Alert: Consuming faster than time allows.
        </div>
      )}
    </div>
  );
};

export default StatsCard;
