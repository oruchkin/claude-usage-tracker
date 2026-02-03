import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Percent, Hourglass, RotateCcw, Settings, Globe, Calendar, Zap, Briefcase, Plus, Minus, LayoutDashboard, AlertCircle } from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import { QuotaState } from './types';
import { calculateQuotaStats, calculateWeeklyStats, calculateMonthlyProgress } from './utils/timeUtils';
import StatsCard from './components/StatsCard';
import WeeklyStatsCard from './components/WeeklyStatsCard';
import SubscriptionCard from './components/SubscriptionCard';
import InputField from './components/InputField';
import Tooltip from './components/Tooltip';

const App: React.FC = () => {
  const [systemTime, setSystemTime] = useState<Date>(new Date());
  
  const [timeMode, setTimeMode] = useState<'local' | 'utc'>(() => {
    const saved = localStorage.getItem('quota_time_mode');
    return (saved === 'local' || saved === 'utc') ? saved : 'local';
  });

  const [hourOffset, setHourOffset] = useState<number>(() => {
    const saved = localStorage.getItem('quota_hour_offset');
    return saved ? Number(saved) : 0;
  });

  const [showTimeSettings, setShowTimeSettings] = useState(false);

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
  const sonnetStats = useMemo(() => calculateWeeklyStats(effectiveNow, { ...inputs, weeklyPercentUsed: inputs.weeklySonnetPercentUsed || 0 }), [effectiveNow, inputs]);

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
    <div className="min-h-screen bg-gray-100 py-4 px-4 sm:py-6 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md"><Hourglass className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Claude Usage Tracker</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 bg-white sm:bg-transparent px-3 py-1.5 rounded-full border sm:border-0 border-gray-100 shadow-sm">
             <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> {timeMode === 'utc' ? 'UTC' : 'Local'} Time</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
            <div className={`bg-white rounded-xl border-2 border-gray-300 shadow-lg p-4 transition-all duration-300 ${isWindowInactive ? 'border-amber-300 ring-2 ring-amber-100' : ''}`}>
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1">{timeMode === 'utc' ? <Globe className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {timeMode === 'utc' ? 'UTC' : 'Local'}</span>
                    <Tooltip text="Internal calc time. Adjusted by Mode/Offset." />
                  </div>
                  <button onClick={() => setShowTimeSettings(!showTimeSettings)} className={`p-1.5 rounded-md ${showTimeSettings ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}><Settings className="w-4 h-4" /></button>
               </div>
               <div className="text-4xl font-mono font-medium text-gray-800 tracking-tight">{format(effectiveNow, 'HH:mm:ss')}</div>
               {isWindowInactive && <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700 leading-relaxed"><strong>Window Inactive</strong>. Check Mode/Offset or Reset Time.</div>}
               {showTimeSettings && <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between"><label className="text-xs font-medium text-gray-500">Mode</label><div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={() => setTimeMode('local')} className={`px-3 py-1 text-xs font-medium rounded-md ${timeMode === 'local' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Local</button><button onClick={() => setTimeMode('utc')} className={`px-3 py-1 text-xs font-medium rounded-md ${timeMode === 'utc' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>UTC</button></div></div>
                    <div className="flex items-center justify-between"><label className="text-xs font-medium text-gray-500">Offset</label><div className="flex items-center gap-2"><button onClick={() => setHourOffset(h => h - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"><Minus className="w-3 h-3" /></button><span className="text-xs font-mono w-8 text-center">{hourOffset > 0 ? '+' : ''}{hourOffset}h</span><button onClick={() => setHourOffset(h => h + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"><Plus className="w-3 h-3" /></button></div></div>
                    <button onClick={() => { setHourOffset(0); setTimeMode('local'); }} className="text-xs text-indigo-500 hover:text-indigo-700 underline w-full text-center block pt-1">Reset</button>
               </div>}
            </div>

            {/* Main Input Controls Block */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300">
              <div className="p-4 sm:p-5 border-b border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" /> SESSION
                </h3>
                <div className="space-y-4">
                  <InputField label="Reset Time" type="time" value={inputs.resetTime} onChange={(v) => updateInput('resetTime', v)} icon={<RotateCcw className="w-4 h-4" />} hint="24h" highlight={isWindowInactive} />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Used %" type="number" value={inputs.percentUsed} onChange={(v) => updateInput('percentUsed', v)} onBlur={() => handleBlur('percentUsed')} min="0" max="100" step="0.1" icon={<Percent className="w-4 h-4" />} suffix="%" />
                    <InputField label="Window" type="number" value={inputs.windowLengthHours} onChange={(v) => updateInput('windowLengthHours', v)} onBlur={() => handleBlur('windowLengthHours')} min="0.1" max="24" step="0.5" icon={<Clock className="w-4 h-4" />} suffix="hr" variant="dimmed" />
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-gray-50/30">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> WEEKLY
                </h3>
                <div className="space-y-4">
                   <InputField label="Weekly Reset" type="datetime-local" value={inputs.weeklyResetDate} onChange={(v) => updateInput('weeklyResetDate', v)} icon={<Calendar className="w-4 h-4" />} />
                   <div className="grid grid-cols-2 gap-3">
                      <InputField label="All %" type="number" value={inputs.weeklyPercentUsed} onChange={(v) => updateInput('weeklyPercentUsed', v)} onBlur={() => handleBlur('weeklyPercentUsed')} icon={<LayoutDashboard className="w-4 h-4" />} suffix="%" />
                      <InputField label="Work Days" type="number" value={inputs.weeklyWorkDays} onChange={(v) => updateInput('weeklyWorkDays', v)} onBlur={() => handleBlur('weeklyWorkDays')} min="1" max="7" icon={<Briefcase className="w-4 h-4" />} suffix="d" variant="dimmed" />
                   </div>
                   <InputField label="Sonnet Only %" type="number" value={inputs.weeklySonnetPercentUsed || 0} onChange={(v) => updateInput('weeklySonnetPercentUsed', v)} onBlur={() => handleBlur('weeklySonnetPercentUsed')} icon={<Percent className="w-4 h-4" />} suffix="%" />
                </div>
              </div>
            </div>

            {/* Subscription Block moved here and made minimalistic */}
            <SubscriptionCard 
              stats={monthlyStats} 
              lastPaymentDate={inputs.lastPaymentDate} 
              onDateChange={(v) => updateInput('lastPaymentDate', v)} 
            />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <StatsCard stats={stats} windowLengthHours={Number(inputs.windowLengthHours)} currentDate={effectiveNow} />
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