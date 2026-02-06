
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Percent, Hourglass, RotateCcw, Settings, Globe, Calendar, Zap, Briefcase, Plus, Minus, LayoutDashboard, X } from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import { QuotaState } from './types';
import { calculateQuotaStats, calculateWeeklyStats, calculateMonthlyProgress } from './utils/timeUtils';
import StatsCard from './components/StatsCard';
import WeeklyStatsCard from './components/WeeklyStatsCard';
import SubscriptionCard from './components/SubscriptionCard';
import InputField from './components/InputField';

const App: React.FC = () => {
  const [systemTime, setSystemTime] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const [timeMode, setTimeMode] = useState<'local' | 'utc'>(() => {
    const saved = localStorage.getItem('quota_time_mode');
    return (saved === 'local' || saved === 'utc') ? saved : 'local';
  });

  const [hourOffset, setHourOffset] = useState<number>(() => {
    const saved = localStorage.getItem('quota_hour_offset');
    return saved ? Number(saved) : 0;
  });

  // Close settings on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [inputs, setInputs] = useState<QuotaState>(() => {
    const getDefaults = () => {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0);
      
      const nextWeek = addDays(new Date(), 7);
      nextWeek.setHours(15, 0, 0, 0);

      return {
        resetTime: format(nextHour, 'HH:mm'), 
        percentUsed: 0,
        windowLengthHours: 5,
        weeklyPercentUsed: 0,
        weeklySonnetPercentUsed: 0,
        weeklyResetDate: format(nextWeek, "yyyy-MM-dd'T'HH:mm"),
        weeklySonnetResetDate: format(nextWeek, "yyyy-MM-dd'T'HH:mm"),
        weeklyWorkDays: 7,
        lastPaymentDate: format(new Date(), 'yyyy-MM-01'), 
      };
    };

    const savedRaw = localStorage.getItem('quota_inputs');
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw);
        const defaults = getDefaults();
        const now = new Date();
        
        const savedWeeklyReset = saved.weeklyResetDate ? parseISO(saved.weeklyResetDate) : null;
        if (!savedWeeklyReset || !isValid(savedWeeklyReset) || savedWeeklyReset < now) {
          saved.weeklyResetDate = defaults.weeklyResetDate;
          saved.weeklyPercentUsed = 0;
        }

        const savedSonnetReset = saved.weeklySonnetResetDate ? parseISO(saved.weeklySonnetResetDate) : null;
        if (!savedSonnetReset || !isValid(savedSonnetReset) || savedSonnetReset < now) {
          saved.weeklySonnetResetDate = defaults.weeklySonnetResetDate;
          saved.weeklySonnetPercentUsed = 0;
        }

        if (saved._updatedAt) {
          const lastUpdate = new Date(saved._updatedAt);
          if (isValid(lastUpdate) && (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60) > 12) {
            saved.percentUsed = 0;
          }
        }
        return { ...defaults, ...saved };
      } catch (e) { console.error(e); }
    }
    return getDefaults();
  });

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('quota_inputs', JSON.stringify({ ...inputs, _updatedAt: new Date().toISOString() }));
  }, [inputs]);

  useEffect(() => { localStorage.setItem('quota_time_mode', timeMode); }, [timeMode]);
  useEffect(() => { localStorage.setItem('quota_hour_offset', String(hourOffset)); }, [hourOffset]);

  const effectiveNow = useMemo(() => {
    let d = new Date(systemTime);
    if (timeMode === 'utc') d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    if (hourOffset !== 0) d = new Date(d.getTime() + (hourOffset * 60 * 60 * 1000));
    return d;
  }, [systemTime, timeMode, hourOffset]);

  const stats = useMemo(() => calculateQuotaStats(effectiveNow, inputs), [effectiveNow, inputs]);
  const weeklyStats = useMemo(() => calculateWeeklyStats(effectiveNow, inputs), [effectiveNow, inputs]);
  const monthlyStats = useMemo(() => calculateMonthlyProgress(effectiveNow, inputs.lastPaymentDate), [effectiveNow, inputs.lastPaymentDate]);
  
  const sonnetStats = useMemo(() => {
    return calculateWeeklyStats(effectiveNow, { 
      ...inputs, 
      weeklyPercentUsed: inputs.weeklySonnetPercentUsed || 0,
      weeklyResetDate: inputs.weeklySonnetResetDate || inputs.weeklyResetDate
    });
  }, [effectiveNow, inputs]);

  const updateInput = (key: keyof QuotaState, value: string) => {
    let validatedVal = value;
    if (['percentUsed', 'weeklyPercentUsed', 'weeklySonnetPercentUsed'].includes(key)) {
      if (parseFloat(value) > 100) validatedVal = '100';
    }
    if (key === 'weeklyWorkDays' && parseFloat(value) > 7) validatedVal = '7';
    if (key === 'windowLengthHours' && parseFloat(value) > 24) validatedVal = '24';

    setInputs(prev => ({ ...prev, [key]: validatedVal }));
  };

  const handleBlur = (key: keyof QuotaState) => {
    setInputs(prev => {
      let val = prev[key];
      const num = parseFloat(val as string);
      if (key === 'weeklyWorkDays' && (isNaN(num) || num < 1)) val = 1;
      if (key === 'windowLengthHours' && (isNaN(num) || num <= 0)) val = 5;
      if (['percentUsed', 'weeklyPercentUsed', 'weeklySonnetPercentUsed'].includes(key) && (isNaN(num) || num < 0)) val = 0;
      return { ...prev, [key]: val };
    });
  };

  const isWindowInactive = !stats.isWindowActive;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Left: Branding + Time */}
          <div className="flex items-center gap-4 sm:gap-6 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
                <Hourglass className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight hidden sm:block">Claude Usage Tracker</h1>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-gray-300/60 hidden sm:block"></div>

            {/* Main Time Display */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {timeMode === 'utc' ? <Globe className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {timeMode === 'utc' ? 'UTC' : 'Local'}
                {hourOffset !== 0 && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">{hourOffset > 0 ? '+' : ''}{hourOffset}h</span>}
              </div>
              <div className={`text-2xl sm:text-3xl font-mono font-medium tracking-tight leading-none ${isWindowInactive ? 'text-amber-600' : 'text-gray-800'}`}>
                {format(effectiveNow, 'HH:mm:ss')}
              </div>
            </div>
          </div>

          {/* Right: Settings Toggle */}
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2.5 rounded-xl transition-all duration-200 ${isSettingsOpen ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Settings Popover */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-pop">
                 <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time Configuration</h3>
                   <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Time Mode</label>
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setTimeMode('local')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeMode === 'local' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Local</button>
                        <button onClick={() => setTimeMode('utc')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeMode === 'utc' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>UTC</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                       <label className="text-sm font-medium text-gray-700">Offset</label>
                       <div className="flex items-center gap-2">
                          <button onClick={() => setHourOffset(h => h - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"><Minus className="w-4 h-4" /></button>
                          <span className="text-sm font-mono w-8 text-center font-bold text-gray-700">{hourOffset > 0 ? '+' : ''}{hourOffset}h</span>
                          <button onClick={() => setHourOffset(h => h + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"><Plus className="w-4 h-4" /></button>
                       </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                       <button onClick={() => { setHourOffset(0); setTimeMode('local'); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium w-full text-center py-1">Reset to Default</button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* === LEFT COLUMN: CONFIGURATION PANELS (Sticky) === */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 self-start z-10">
            
            {/* 1. CURRENT SESSION BOX */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-5">
               <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" /> Current Session
               </h3>
               <div className="space-y-4">
                  <InputField label="Reset Time" type="time" value={inputs.resetTime} onChange={(v) => updateInput('resetTime', v)} icon={<RotateCcw className="w-4 h-4" />} hint="24h" highlight={isWindowInactive} />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Used %" type="number" value={inputs.percentUsed} onChange={(v) => updateInput('percentUsed', v)} onBlur={() => handleBlur('percentUsed')} min="0" max="100" step="0.1" icon={<Percent className="w-4 h-4" />} suffix="%" />
                    <InputField label="Window" type="number" value={inputs.windowLengthHours} onChange={(v) => updateInput('windowLengthHours', v)} onBlur={() => handleBlur('windowLengthHours')} min="0.1" max="24" step="0.5" icon={<Clock className="w-4 h-4" />} suffix="hr" variant="dimmed" />
                  </div>
               </div>
            </div>

            {/* 2. WEEKLY LIMITS BOX */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-5">
               <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Weekly Limits
               </h3>
               <div className="space-y-5">
                  {/* All Models */}
                  <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">All Models</span>
                      </div>
                      <InputField label="Reset Date" type="datetime-local" value={inputs.weeklyResetDate} onChange={(v) => updateInput('weeklyResetDate', v)} icon={<Calendar className="w-4 h-4" />} />
                      <div className="grid grid-cols-2 gap-3">
                          <InputField label="Used %" type="number" value={inputs.weeklyPercentUsed} onChange={(v) => updateInput('weeklyPercentUsed', v)} onBlur={() => handleBlur('weeklyPercentUsed')} icon={<LayoutDashboard className="w-4 h-4" />} suffix="%" />
                          <InputField label="Work Days" type="number" value={inputs.weeklyWorkDays} onChange={(v) => updateInput('weeklyWorkDays', v)} onBlur={() => handleBlur('weeklyWorkDays')} min="1" max="7" icon={<Briefcase className="w-4 h-4" />} suffix="d" variant="dimmed" />
                      </div>
                  </div>

                  {/* Sonnet Only */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">Sonnet Only</span>
                      </div>
                      <InputField label="Reset Date" type="datetime-local" value={inputs.weeklySonnetResetDate || ''} onChange={(v) => updateInput('weeklySonnetResetDate', v)} icon={<Calendar className="w-4 h-4" />} />
                      <InputField label="Used %" type="number" value={inputs.weeklySonnetPercentUsed || 0} onChange={(v) => updateInput('weeklySonnetPercentUsed', v)} onBlur={() => handleBlur('weeklySonnetPercentUsed')} icon={<Percent className="w-4 h-4" />} suffix="%" />
                  </div>
               </div>
            </div>

            {/* 3. SUBSCRIPTION BOX */}
            <SubscriptionCard 
              stats={monthlyStats} 
              lastPaymentDate={inputs.lastPaymentDate} 
              onDateChange={(v) => updateInput('lastPaymentDate', v)} 
            />
          </div>

          {/* === RIGHT COLUMN: VISUALIZATIONS === */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Main Session Stats */}
            <StatsCard stats={stats} windowLengthHours={Number(inputs.windowLengthHours)} currentDate={effectiveNow} />
            
            {/* 2. Weekly Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex flex-col h-full">
                 <WeeklyStatsCard stats={weeklyStats} title="Current Week (All)" />
               </div>
               <div className="flex flex-col h-full">
                 <WeeklyStatsCard stats={sonnetStats} title="Current Week (Sonnet)" />
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;
