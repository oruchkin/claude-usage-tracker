
import React from 'react';
import { CreditCard, Calendar, Timer } from 'lucide-react';
import { MonthlyCalculationResult } from '../types';
import { format } from 'date-fns';
import Tooltip from './Tooltip';

interface SubscriptionCardProps {
  stats: MonthlyCalculationResult;
  lastPaymentDate: string;
  onDateChange: (val: string) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ stats, lastPaymentDate, onDateChange }) => {
  const { progressPercent, nextBillingDate, daysRemaining, totalDaysInCycle } = stats;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden">
      <div className="p-4 sm:p-5">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> SUBSCRIPTION
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Tooltip text="Date of your most recent Claude Pro payment.">
              <label className="block text-sm font-medium text-gray-700 cursor-help hover:text-indigo-600 transition-colors">Last Payment</label>
            </Tooltip>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input 
                type="date" 
                value={lastPaymentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white bg-white text-gray-900 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-2">
              <span className="flex items-center gap-1 text-indigo-600">
                <Timer className="w-3 h-3" />
                {progressPercent.toFixed(0)}% Cycle
              </span>
              <span className="text-gray-400">{daysRemaining}d left</span>
            </div>

            <div className="relative h-2.5 w-full bg-gray-100 rounded-full flex shadow-inner border border-gray-200">
              {/* Progress Segment */}
              <Tooltip 
                text={`Elapsed: ${progressPercent.toFixed(1)}% (${totalDaysInCycle - daysRemaining} days)`}
                style={{ width: `${progressPercent}%` }}
                className="h-full z-20 cursor-help"
              >
                <div className="h-full w-full bg-indigo-600 rounded-l-full transition-all duration-1000 ease-out shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
              </Tooltip>

              {/* Remaining Segment */}
              <Tooltip 
                text={`Remaining: ${(100 - progressPercent).toFixed(1)}% (${daysRemaining} days)`}
                style={{ flex: 1 }}
                className="h-full z-10 cursor-help"
              >
                <div className="h-full w-full bg-transparent rounded-r-full" />
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Next Billing</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {format(nextBillingDate, 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
