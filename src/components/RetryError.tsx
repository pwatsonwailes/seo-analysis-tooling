import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RetryErrorProps {
  message: string;
  onRetry: () => void;
}

export function RetryError({ message, onRetry }: RetryErrorProps) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Error</h2>
      </div>
      <p className="mt-2 text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}