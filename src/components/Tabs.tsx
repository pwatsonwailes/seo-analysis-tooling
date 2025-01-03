import React from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('results')}
          className={`
            py-2 px-1 border-b-2 font-medium text-sm
            ${activeTab === 'results'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
          `}
        >
          Raw Results
        </button>
        <button
          onClick={() => onTabChange('analysis')}
          className={`
            py-2 px-1 border-b-2 font-medium text-sm
            ${activeTab === 'analysis'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
          `}
        >
          Domain Analysis
        </button>
      </nav>
    </div>
  );
}