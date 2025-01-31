import React from 'react';
import { ProgressBar } from './ProgressBar';
import { Play } from 'lucide-react';

interface ProcessingSectionProps {
  urls: string[];
  progress: number;
  isProcessing: boolean;
  onProcess: () => void;
  showProcessButton?: boolean;
}

export function ProcessingSection({ 
  urls, 
  progress, 
  isProcessing, 
  onProcess,
  showProcessButton = true 
}: ProcessingSectionProps) {
  if (urls.length === 0) return null;

  return (
    <div className="space-y-4">
      <ProgressBar current={progress} total={urls.length} />
      
      {!isProcessing && showProcessButton && (
        <button
          onClick={onProcess}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Play className="w-4 h-4" />
          Process {urls.length} URLs
        </button>
      )}
    </div>
  );
}