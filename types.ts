
export interface QuotaState {
  // Daily / Short-term
  resetTime: string;
  percentUsed: number | string;
  windowLengthHours: number | string;
  
  // Weekly
  weeklyPercentUsed: number | string;
  weeklyResetDate: string; // ISO string for datetime-local
  weeklyWorkDays: number | string;
  
  // Sonnet Specific
  weeklySonnetPercentUsed?: number | string;
  weeklySonnetResetDate?: string; // ISO string for datetime-local

  // Monthly / Billing
  lastPaymentDate: string; // ISO date string (YYYY-MM-DD)
}

export interface CalculationResult {
  windowStart: Date;
  windowEnd: Date;
  elapsedMs: number;
  ratePerHour: number;
  safeRatePerHour: number;
  forecastPercent: number;
  remainingPercent: number;
  estimatedFinishDate: Date | null;
  timeProgressPercent: number;
  status: 'ok' | 'warning' | 'critical';
  isWindowActive: boolean;
}

export interface WeeklyCalculationResult {
  startDate: Date;
  resetDate: Date;
  percentUsed: number;
  timeProgressPercent: number;
  benchmarkPercent: number;
  status: 'ok' | 'warning' | 'critical';
  daysRemaining: number;
  hoursRemaining: number;
  currentDailyPace: number;
  maxSafeDailyPace: number;
  workDays: number;
}

export interface MonthlyCalculationResult {
  progressPercent: number;
  nextBillingDate: Date;
  daysRemaining: number;
  totalDaysInCycle: number;
}
