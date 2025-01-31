import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  showCount?: boolean;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ 
  current, 
  total, 
  showCount = true,
  className = "bg-gray-200",
  barClassName = "bg-blue-600"
}: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <div className={`w-full ${className} rounded-full h-2.5`}>
        <div
          className={`${barClassName} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showCount && (
        <div className="text-sm mt-1 text-gray-600">
          {current} of {total} requests completed
        </div>
      )}
    </div>
  );
}