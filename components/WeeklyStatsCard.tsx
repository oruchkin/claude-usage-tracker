
import React, { useEffect, useState } from 'react';
import { WeeklyCalculationResult } from '../types';
import { CalendarDays, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Tooltip from './Tooltip';

interface WeeklyStatsCardProps {
  stats: WeeklyCalculationResult;
  title?: string;
}

const WeeklyStatsCard: React.FC<WeeklyStatsCardProps> = ({ stats, title = "Current Week" }) => {
  const { 
    percentUsed, 
    benchmarkPercent,
    resetDate, 
    startDate,
    status,
    daysRemaining,
    hoursRemaining,
    currentDailyPace,
    maxSafeDailyPace,
    workDays
  } = stats;

  const [animateUsedPace, setAnimateUsedPace] = useState(false);

  useEffect(() => {
    setAnimateUsedPace(true);
    const timer = setTimeout(() => setAnimateUsedPace(false), 400);
    return () => clearTimeout(timer);
  }, [percentUsed]);

  const statusConfig = {
    ok: { barColor: 'bg-emerald-500', label: 'Safe buffer' },
    warning: { barColor: 'bg-amber-500', label: 'Pace Warning' },
    critical: { barColor: 'bg-rose-500', label: 'Over Budget' },
  };

  const currentStatus = statusConfig[status];
  const deviation = percentUsed - benchmarkPercent;
  const isPaceRisky = currentDailyPace > maxSafeDailyPace;

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-300 flex flex-col h-full">
      <div className="p-5 space-y-4 flex-grow">
        <div className="flex items-center justify-between">
          <Tooltip text={title.toLowerCase().includes('sonnet') ? "Tracks specific weekly limits for the Sonnet model." : "Tracks combined weekly usage for Sonnet and Opus models."}>
            <h3 className="text-lg font-bold text-gray-800 truncate cursor-help">{title}</h3>
          </Tooltip>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-600">
             {percentUsed.toFixed(1)}% used
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
           <Tooltip text="The beginning of the current 7-day rolling window.">
             <div className="cursor-help">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Started</span>
                <span className="font-semibold text-gray-900 font-mono text-sm">{format(startDate, 'MMM d HH:mm')}</span>
             </div>
           </Tooltip>
           <Tooltip text="When your weekly quota resets.">
             <div className="text-right flex flex-col items-end cursor-help">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Resets</span>
                <span className="font-semibold text-gray-900 font-mono text-sm">{format(resetDate, 'MMM d HH:mm')}</span>
             </div>
           </Tooltip>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 shadow-sm relative">
           <div className="absolute left-1/2 top-3 bottom-3 w-px bg-slate-200"></div>
           <Tooltip text="Average daily consumption since the start of the week.">
             <div className="flex flex-col justify-between cursor-help">
                <span className="text-gray-700 text-xs font-bold uppercase tracking-tight mb-1">Used Pace</span>
                <div className={`text-xl font-black font-mono transition-all ${animateUsedPace ? 'animate-pop' : ''} ${isPaceRisky ? 'text-rose-600' : 'text-emerald-600'}`}>
                   {currentDailyPace.toFixed(1)} <span className="text-[10px] text-gray-400 font-bold">% / day</span>
                </div>
             </div>
           </Tooltip>
           <Tooltip text={`Safe daily quota based on ${workDays} work days per week.`}>
             <div className="flex flex-col justify-between items-end text-right cursor-help">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-tight mb-1">Max Safe</span>
                <div className="text-lg font-bold font-mono text-gray-500">
                   {maxSafeDailyPace.toFixed(1)} <span className="text-[10px] text-gray-400 font-bold">% / day</span>
                </div>
             </div>
           </Tooltip>
        </div>

        <div className="pt-1">
             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 mb-2">
                <span>Used: {percentUsed.toFixed(1)}%</span>
                <span>Schedule: {benchmarkPercent.toFixed(1)}%</span>
             </div>
             
             <div className="relative h-6 w-full bg-gray-100 rounded-lg shadow-inner ring-1 ring-gray-200/50 flex">
                {/* 1. USED SEGMENT */}
                <Tooltip 
                  text={`Actual Usage: ${percentUsed.toFixed(1)}%`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  className="h-full cursor-help z-30"
                >
                  <div className={`h-full w-full opacity-95 ${currentStatus.barColor} shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-l-lg`} />
                </Tooltip>

                {/* 2. SCHEDULE GAP (Only if Under Budget) */}
                {benchmarkPercent > percentUsed && (
                  <Tooltip 
                    text={`Target Schedule: ${benchmarkPercent.toFixed(1)}%`}
                    style={{ width: `${Math.min(benchmarkPercent - percentUsed, 100 - percentUsed)}%` }}
                    className="h-full cursor-help z-20"
                  >
                    <div className="h-full w-full bg-slate-300 border-x border-slate-400/50" />
                  </Tooltip>
                )}

                {/* 3. REMAINING WEEKLY BUFFER */}
                <Tooltip 
                  text={`Remaining Quota: ${(100 - Math.max(percentUsed, benchmarkPercent)).toFixed(1)}%`}
                  style={{ flex: 1 }}
                  className="h-full cursor-help z-10"
                >
                  <div className="h-full w-full bg-transparent rounded-r-lg" />
                </Tooltip>
             </div>
             
             <div className="mt-3 text-center text-xs">
                {deviation > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center justify-center gap-1 bg-rose-50 py-1.5 px-3 rounded-lg inline-block">
                    <ArrowRight className="w-3 h-3" />
                    +{deviation.toFixed(1)}% ahead
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block">
                    <CheckCircle className="w-3 h-3" />
                    {Math.abs(deviation).toFixed(1)}% safe buffer
                  </span>
                )}
             </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400 font-medium text-xs pt-2 border-t border-gray-50">
           <AlertCircle className="w-3.5 h-3.5" />
           <span>{daysRemaining}d {hoursRemaining}h left</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyStatsCard;
