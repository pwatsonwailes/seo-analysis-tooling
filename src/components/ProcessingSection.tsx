import React from 'react';
import { ProgressBar } from './ProgressBar';
import { Play, Database } from 'lucide-react';

interface ProcessingSectionProps {
  urls: string[];
  progress: number;
  dbLoadingProgress: number;
  isProcessing: boolean;
  isLoadingFromDb: boolean;
  onProcess: () => void;
  showProcessButton?: boolean;
}

export function ProcessingSection({ 
  urls, 
  progress, 
  dbLoadingProgress,
  isProcessing,
  isLoadingFromDb,
  onProcess,
  showProcessButton = true 
}: ProcessingSectionProps) {
  if (urls.length === 0) return null;

  return (
    <div className="space-y-4">
      {isLoadingFromDb && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Loading from database...</span>
          </div>
          <ProgressBar 
            current={dbLoadingProgress} 
            total={100} 
            showCount={false}
            className="bg-blue-100"
            barClassName="bg-blue-600"
          />
        </div>
      )}
      
      {(isProcessing || progress > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">Processing URLs...</span>
          </div>
          <ProgressBar current={progress} total={urls.length} />
        </div>
      )}
      
      {!isProcessing && !isLoadingFromDb && showProcessButton && (
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