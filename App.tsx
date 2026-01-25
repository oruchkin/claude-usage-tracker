import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Percent, Hourglass, RotateCcw, Settings, Globe, Calendar, Zap, Briefcase, Plus, Minus, LayoutDashboard, AlertCircle } from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import { QuotaState } from './types';
import { calculateQuotaStats, calculateWeeklyStats } from './utils/timeUtils';
import StatsCard from './components/StatsCard';
import WeeklyStatsCard from './components/WeeklyStatsCard';
import InputField from './components/InputField';
import Tooltip from './components/Tooltip';

const App: React.FC = () => {
  // --- State ---
  const [systemTime, setSystemTime] = useState<Date>(new Date());
  
  // Time Configuration (Initialize from localStorage)
  const [timeMode, setTimeMode] = useState<'local' | 'utc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quota_time_mode');
      return (saved === 'local' || saved === 'utc') ? saved : 'local';
    }
    return 'local';
  });

  const [hourOffset, setHourOffset] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quota_hour_offset');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });

  const [showTimeSettings, setShowTimeSettings] = useState(false);

  // Inputs State (Initialize from localStorage or default)
  const [inputs, setInputs] = useState<QuotaState>(() => {
    // Default fallback generator
    const getDefaults = () => {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0);
      
      const nextWeek = addDays(new Date(), 7);
      nextWeek.setHours(15, 0, 0, 0); // Default 3 PM

      return {
        resetTime: format(nextHour, 'HH:mm'), 
        percentUsed: 0,
        windowLengthHours: 5,
        weeklyPercentUsed: 0,
        weeklySonnetPercentUsed: 0,
        weeklyResetDate: format(nextWeek, "yyyy-MM-dd'T'HH:mm"),
        weeklyWorkDays: 7, // Changed from 5 to 7 by default
      };
    };

    if (typeof window !== 'undefined') {
      const savedRaw = localStorage.getItem('quota_inputs');
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          const defaults = getDefaults();
          const now = new Date();
          
          // 1. Weekly Logic: Check if Weekly Reset Date is in the past (expired)
          const savedWeeklyReset = saved.weeklyResetDate ? parseISO(saved.weeklyResetDate) : null;
          const isWeeklyExpired = !savedWeeklyReset || !isValid(savedWeeklyReset) || savedWeeklyReset < now;

          if (isWeeklyExpired) {
            // Weekly quota expired: Reset weekly tracking stats, but KEEP preferences (like workDays)
            console.log("Weekly quota expired, resetting weekly stats.");
            saved.weeklyResetDate = defaults.weeklyResetDate; // Reset to next week
            saved.weeklyPercentUsed = 0;
            saved.weeklySonnetPercentUsed = 0;
            // Note: saved.weeklyWorkDays is preserved implicitly by not overwriting it
          }

          // 2. Daily Logic: Check for stale session data
          // If the stored data is older than 12 hours, reset the Daily Used % to 0
          // (User is likely starting a new day/session, so old % is irrelevant)
          if (saved._updatedAt) {
            const lastUpdate = new Date(saved._updatedAt);
            if (isValid(lastUpdate)) {
               const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
               if (hoursSinceUpdate > 12) {
                  console.log("Session stale (>12h), resetting daily percent.");
                  saved.percentUsed = 0;
               }
            }
          }

          // Merge: Defaults -> Saved (with applied resets)
          // This ensures any new fields in 'defaults' are added, while 'saved' values take precedence
          return { ...defaults, ...saved };
        } catch (e) {
          console.error("Failed to parse saved inputs", e);
        }
      }
    }
    
    return getDefaults();
  });

  // --- Effects ---
  
  // Timer to update 'systemTime' every second
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save State to LocalStorage whenever it changes
  // We add a timestamp (_updatedAt) to help validity checks on reload
  useEffect(() => {
    localStorage.setItem('quota_inputs', JSON.stringify({
      ...inputs,
      _updatedAt: new Date().toISOString()
    }));
  }, [inputs]);

  useEffect(() => {
    localStorage.setItem('quota_time_mode', timeMode);
  }, [timeMode]);

  useEffect(() => {
    localStorage.setItem('quota_hour_offset', String(hourOffset));
  }, [hourOffset]);

  // --- Computations ---

  // Calculate "Effective Now" based on user settings
  const effectiveNow = useMemo(() => {
    let d = new Date(systemTime);
    
    // 1. UTC Mode
    if (timeMode === 'utc') {
      const offsetMs = d.getTimezoneOffset() * 60000;
      d = new Date(d.getTime() + offsetMs);
    }

    // 2. Manual Hour Offset
    if (hourOffset !== 0) {
      d = new Date(d.getTime() + (hourOffset * 60 * 60 * 1000));
    }
    
    return d;
  }, [systemTime, timeMode, hourOffset]);

  const stats = useMemo(() => calculateQuotaStats(effectiveNow, inputs), [effectiveNow, inputs]);
  const weeklyStats = useMemo(() => calculateWeeklyStats(effectiveNow, inputs), [effectiveNow, inputs]);
  
  // Sonnet Stats: reuse weekly logic but substitute usage percent
  const sonnetStats = useMemo(() => {
    const sonnetInputs = { ...inputs, weeklyPercentUsed: inputs.weeklySonnetPercentUsed || 0 };
    return calculateWeeklyStats(effectiveNow, sonnetInputs);
  }, [effectiveNow, inputs]);

  // --- Handlers ---
  const updateInput = (key: keyof QuotaState, value: string) => {
    // Validate inputs instantaneously while typing (Upper bounds validation)
    let validatedVal = value;

    if (key === 'percentUsed' || key === 'weeklyPercentUsed' || key === 'weeklySonnetPercentUsed') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 100) validatedVal = '100';
      // We allow empty string or negative (though min handles negative in input)
    }

    if (key === 'weeklyWorkDays') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 7) validatedVal = '7';
    }

    if (key === 'windowLengthHours') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 24) validatedVal = '24'; // Cap at 24h as per request
    }

    setInputs(prev => ({
      ...prev,
      [key]: validatedVal
    }));
  };

  // Validate inputs on Blur (Lower bounds / Defaulting validation)
  const handleBlur = (key: keyof QuotaState) => {
    setInputs(prev => {
      let val = prev[key];
      const num = parseFloat(val as string);

      if (key === 'weeklyWorkDays') {
        // Must be between 1 and 7. Default to 5 or 7 if empty.
        if (isNaN(num) || num < 1) val = 1;
        // Max checked in updateInput, but double check
        if (num > 7) val = 7;
      }

      if (key === 'windowLengthHours') {
        // Must be at least 0.1 hour
        if (isNaN(num) || num <= 0) val = 5; // Default back to 5 if user clears it
        if (num > 24) val = 24;
      }

      if (['percentUsed', 'weeklyPercentUsed', 'weeklySonnetPercentUsed'].includes(key)) {
         if (isNaN(num) || num < 0) val = 0;
         if (num > 100) val = 100;
      }

      return { ...prev, [key]: val };
    });
  };

  const isWindowInactive = !stats.isWindowActive;

  // Auto-expand settings when window is inactive to reveal fix controls
  useEffect(() => {
    if (isWindowInactive) {
      setShowTimeSettings(true);
    }
  }, [isWindowInactive]);

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4 sm:py-6 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
              <Hourglass className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              Claude Usage Tracker
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 bg-white sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-full border sm:border-0 border-gray-100 shadow-sm sm:shadow-none self-start sm:self-auto">
             <span className="flex items-center gap-1.5">
               <Globe className="w-3 h-3" />
               <span className="sm:hidden">Calc Mode:</span>
               {timeMode === 'utc' ? 'UTC' : 'Local'} Time
             </span>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Controls */}
          {/* On Mobile/Tablet: Static. On Large Desktop: Sticky */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
            
            {/* System Time Card */}
            <div className={`bg-white rounded-xl border-2 border-gray-300 shadow-lg p-4 transition-all duration-300 ${isWindowInactive ? 'border-amber-300 ring-2 ring-amber-100' : ''}`}>
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                      {timeMode === 'utc' ? <Globe className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {timeMode === 'utc' ? 'UTC' : 'Local'}
                      {hourOffset !== 0 && <span className="text-indigo-400 normal-case ml-1">({hourOffset > 0 ? '+' : ''}{hourOffset}h)</span>}
                    </span>
                    <Tooltip text="The internal time used for all calculations. Change Mode or Offset below to match API timezone." />
                  </div>
                  <button 
                    onClick={() => setShowTimeSettings(!showTimeSettings)}
                    className={`p-1.5 rounded-md transition-colors ${showTimeSettings ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="text-4xl font-mono font-medium text-gray-800 tracking-tight">
                {format(effectiveNow, 'HH:mm:ss')}
               </div>

               {/* Inactive Window Warning */}
               {isWindowInactive && (
                 <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2.5 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                       <p className="font-bold text-amber-800 mb-0.5">Window Inactive</p>
                       <p className="text-amber-700 leading-relaxed">
                         Calculated window is in the future. Check <button onClick={() => setShowTimeSettings(true)} className="underline decoration-amber-400 hover:text-amber-900 font-medium">Time Settings</button> (Mode/Offset) or Reset Time.
                       </p>
                    </div>
                 </div>
               )}

               {/* Time Settings Panel */}
                {showTimeSettings && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-500">Mode</label>
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setTimeMode('local')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeMode === 'local' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Local</button>
                        <button onClick={() => setTimeMode('utc')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeMode === 'utc' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>UTC</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-medium text-gray-500">Offset</label>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setHourOffset(h => h - 1)} 
                            className={`w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors ${isWindowInactive ? 'animate-subtle-pulse ring-1 ring-indigo-200 border border-indigo-300' : ''}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono w-8 text-center">{hourOffset > 0 ? '+' : ''}{hourOffset}h</span>
                          <button 
                            onClick={() => setHourOffset(h => h + 1)} 
                            className={`w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors ${isWindowInactive ? 'animate-subtle-pulse ring-1 ring-indigo-200 border border-indigo-300' : ''}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                       </div>
                    </div>
                    <button onClick={() => { setHourOffset(0); setTimeMode('local'); }} className="text-xs text-indigo-500 hover:text-indigo-700 underline w-full text-center block pt-1">Reset</button>
                  </div>
                )}
            </div>

            {/* Combined Input Form */}
            {/* On Tablet (md), display as grid to save vertical space. On lg, stack again. */}
            {/* Removed overflow-hidden to fix tooltip clipping */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-col">
              
              {/* Section 1: Short Term */}
              <div className="p-4 sm:p-5 border-b border-gray-200 md:border-b-0 md:border-r lg:border-r-0 lg:border-b">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Zap className="w-3 h-3 text-indigo-500" /> Current Session
                </h3>
                <div className="space-y-4">
                  <InputField 
                    label="Quota Reset Time" 
                    type="time" 
                    value={inputs.resetTime} 
                    onChange={(v) => updateInput('resetTime', v)} 
                    icon={<RotateCcw className="w-4 h-4" />} 
                    hint="24h Format"
                    tooltip="The time (in System Time) when your current 5-hour quota window ends/resets."
                    highlight={isWindowInactive}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField 
                      label="Used %" 
                      type="number" 
                      value={inputs.percentUsed} 
                      onChange={(v) => updateInput('percentUsed', v)} 
                      onBlur={() => handleBlur('percentUsed')}
                      min="0" max="100" step="0.1" 
                      icon={<Percent className="w-4 h-4" />} suffix="%" 
                    />
                    <InputField 
                      label="Window" 
                      type="number" 
                      value={inputs.windowLengthHours} 
                      onChange={(v) => updateInput('windowLengthHours', v)} 
                      onBlur={() => handleBlur('windowLengthHours')}
                      min="0.1" 
                      max="24"
                      step="0.5" 
                      icon={<Clock className="w-4 h-4" />} 
                      suffix="hr" 
                      variant="dimmed"
                      tooltip="The duration of the sliding quota window (usually 5 hours for Claude)."
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Weekly General */}
              <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50 md:bg-white lg:bg-gray-50/50 md:border-b-0">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Calendar className="w-3 h-3 text-indigo-500" /> Weekly Limits
                </h3>
                <div className="space-y-4">
                   <InputField 
                      label="Weekly Reset" 
                      type="datetime-local" 
                      value={inputs.weeklyResetDate} 
                      onChange={(v) => updateInput('weeklyResetDate', v)} 
                      icon={<Calendar className="w-4 h-4" />} 
                      hint="24h"
                      tooltip="The date and time when your overall weekly usage quota resets."
                   />
                   <div className="grid grid-cols-2 gap-3">
                      <InputField 
                        label="All Models %" 
                        type="number" 
                        value={inputs.weeklyPercentUsed} 
                        onChange={(v) => updateInput('weeklyPercentUsed', v)} 
                        onBlur={() => handleBlur('weeklyPercentUsed')}
                        min="0" max="100" step="0.1" 
                        icon={<LayoutDashboard className="w-4 h-4" />} suffix="%" 
                      />
                      <InputField 
                        label="Work Days" 
                        type="number" 
                        value={inputs.weeklyWorkDays || 7} 
                        onChange={(v) => updateInput('weeklyWorkDays', v)} 
                        onBlur={() => handleBlur('weeklyWorkDays')}
                        min="1" 
                        max="7" 
                        step="1" 
                        icon={<Briefcase className="w-4 h-4" />} 
                        suffix="d" 
                        variant="dimmed"
                        tooltip="The number of days you work per week. Used to calculate your 'Max Safe' daily pace."
                      />
                   </div>
                </div>
              </div>
              
              {/* Section 3: Sonnet (Weekly) */}
              <div className="p-4 sm:p-5 bg-gray-50/50 md:col-span-2 border-t border-gray-200 lg:border-t-0 md:bg-gray-50/50">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Zap className="w-3 h-3 text-indigo-500" /> Sonnet Limit
                </h3>
                 <InputField 
                    label="Sonnet Only %" 
                    type="number" 
                    value={inputs.weeklySonnetPercentUsed || 0} 
                    onChange={(v) => updateInput('weeklySonnetPercentUsed', v)} 
                    onBlur={() => handleBlur('weeklySonnetPercentUsed')}
                    min="0" max="100" step="0.1" 
                    icon={<Percent className="w-4 h-4" />} 
                    suffix="%" 
                    tooltip="Specific usage percentage for the Sonnet model, if tracked separately."
                  />
              </div>

            </div>
            
          </div>

          {/* Right Column: Stats (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Short Term (Full width of right col) */}
            <StatsCard 
              stats={stats} 
              windowLengthHours={Number(inputs.windowLengthHours) || 0}
              currentDate={effectiveNow}
            />

            {/* 2. Weekly Stats (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <WeeklyStatsCard stats={weeklyStats} title="Current Week (All)" />
               <WeeklyStatsCard stats={sonnetStats} title="Current Week (Sonnet)" />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default App;