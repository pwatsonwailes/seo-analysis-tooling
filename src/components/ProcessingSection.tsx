import React from 'react';
import { ProgressBar } from './ProgressBar';

interface ProcessingSectionProps {
  urls: string[];
  progress: number;
  isProcessing: boolean;
  onProcess: () => void;
}

export function ProcessingSection({ urls, progress, isProcessing, onProcess }: ProcessingSectionProps) {
  if (urls.length === 0) return null;

  return (
    <div className="space-y-4">
      <ProgressBar current={progress} total={urls.length} />
      
      {!isProcessing && progress === 0 && (
        <button
          onClick={onProcess}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Process {urls.length} URLs
        </button>
      )}
    </div>
  );
}