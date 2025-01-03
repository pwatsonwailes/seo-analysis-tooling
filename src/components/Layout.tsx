import React from 'react';
import { Database } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Database className="w-8 h-8" />
            API Request Processor
          </h1>
          <p className="mt-2 text-gray-600">
            Upload a text file with API URLs to process and store the results
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}