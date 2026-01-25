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

  // Animation state
  const [animateSafePace, setAnimateSafePace] = useState(false);
  const [animateUsedPace, setAnimateUsedPace] = useState(false);

  // Animate Max Safe Pace when Work Days changes
  useEffect(() => {
    setAnimateSafePace(true);
    const timer = setTimeout(() => setAnimateSafePace(false), 400);
    return () => clearTimeout(timer);
  }, [maxSafeDailyPace]);

  // Animate Used Pace when Percent Used changes
  useEffect(() => {
    setAnimateUsedPace(true);
    const timer = setTimeout(() => setAnimateUsedPace(false), 400);
    return () => clearTimeout(timer);
  }, [percentUsed]);

  const statusConfig = {
    ok: {
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      label: 'Safe',
    },
    warning: {
      barColor: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      label: 'Warning',
    },
    critical: {
      barColor: 'bg-rose-500',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      label: 'Critical',
    },
  };

  const currentStatus = statusConfig[status];
  
  // Calculate deviation based on Benchmark (Work Day Adjusted) instead of pure Time
  const deviation = percentUsed - benchmarkPercent;
  
  const isPaceRisky = currentDailyPace > maxSafeDailyPace;

  // Determine Tooltip Text based on title
  const isSonnetOnly = title.toLowerCase().includes('sonnet');
  const tooltipText = isSonnetOnly
    ? "Tracks specific weekly limits for the Sonnet model."
    : "Tracks combined weekly usage for Sonnet and Opus models.";

  return (
    // Removed overflow-hidden to allow tooltips to popup
    <div className={`w-full bg-white rounded-2xl shadow-xl border border-gray-300 flex flex-col h-full`}>
      <div className="p-5 space-y-4 flex-grow">
      
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800 truncate">
              {title}
            </h3>
            <Tooltip text={tooltipText} />
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-600 whitespace-nowrap`}>
             {percentUsed.toFixed(1)}% used
          </span>
        </div>

        {/* Start / Reset Info Grid */}
        <div className="grid grid-cols-2 gap-2 pb-2 text-sm">
           <div>
              <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                Started
                <Tooltip text="The beginning of the current 7-day rolling window." />
              </span>
              <span className="font-semibold text-gray-900 font-mono text-sm">
                 {format(startDate, 'MMM d HH:mm')}
              </span>
           </div>
           <div className="text-right flex flex-col items-end">
              <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                Resets
                <Tooltip text="When your weekly quota resets." />
              </span>
              <span className="font-semibold text-gray-900 font-mono text-sm">
                 {format(resetDate, 'MMM d HH:mm')}
              </span>
           </div>
        </div>

        {/* Pace Stats - Split Layout */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 shadow-sm relative">
           {/* Center Divider Line */}
           <div className="absolute left-1/2 top-3 bottom-3 w-px bg-slate-200"></div>

           {/* Left: Used Pace */}
           <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                 <span className="text-gray-700 text-xs font-bold uppercase tracking-tight">Used Pace</span>
                 <Tooltip text="Average daily consumption since the start of the week." />
              </div>
              <div className={`text-xl font-black font-mono tracking-tight transition-all ${animateUsedPace ? 'animate-pop' : ''} ${isPaceRisky ? 'text-rose-600' : 'text-emerald-600'}`}>
                 {currentDailyPace.toFixed(1)} <span className="text-xs text-gray-400 font-bold">% / day</span>
              </div>
           </div>

           {/* Right: Max Safe Pace */}
           <div className="flex flex-col justify-between items-end text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                 <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Max Safe</span>
                 <Tooltip text={`Calculated based on your setting of ${workDays} work days per week.`} />
              </div>
              <div className={`text-lg font-bold font-mono tracking-tight text-gray-500 transition-all ${animateSafePace ? 'animate-pop' : ''}`}>
                 {maxSafeDailyPace.toFixed(1)} <span className="text-xs text-gray-400 font-bold">% / day</span>
              </div>
           </div>
        </div>

        {/* Progress Section */}
        <div className="pt-1">
             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${currentStatus.barColor}`}></div>
                  Used
                </span>
                <span className="flex items-center gap-1">
                  Schedule
                  <Tooltip text={`Benchmark progress assuming you work ${workDays} days a week.`} />
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                </span>
             </div>
             
             {/* Comparative Progress Bar */}
             <div className="relative h-6 w-full bg-gray-100 rounded-lg overflow-hidden shadow-inner ring-1 ring-gray-200/50">
                {/* Benchmark Indicator (Adjusted for Work Days) */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-slate-300 z-10 border-r border-slate-400 transition-all duration-500"
                  style={{ width: `${Math.min(benchmarkPercent, 100)}%` }}
                />

                {/* Usage Bar (Colored) */}
                <div 
                  className={`absolute top-0 bottom-0 left-0 z-20 transition-all duration-500 opacity-90 ${currentStatus.barColor}`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
             </div>
             
             {/* Status Text */}
             <div className="mt-3 text-center text-xs">
                {deviation > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center justify-center gap-1 bg-rose-50 py-1 px-2 rounded-md inline-block">
                    <ArrowRight className="w-3 h-3" />
                    +{deviation.toFixed(1)}% ahead of schedule
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 bg-emerald-50 py-1 px-2 rounded-md inline-block">
                    <CheckCircle className="w-3 h-3" />
                    {Math.abs(deviation).toFixed(1)}% safe buffer
                  </span>
                )}
             </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs pt-1 mt-auto">
          <div className="flex items-center gap-1.5 text-gray-400 font-medium">
             {status !== 'ok' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
             <span>
               {daysRemaining}d {hoursRemaining}h left
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyStatsCard;