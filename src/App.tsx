import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { FileUploader } from './components/FileUploader';
import { ProcessingSection } from './components/ProcessingSection';
import { ResultsTable } from './components/ResultsTable';
import { DomainAnalysis } from './components/DomainAnalysis';
import { Tabs } from './components/Tabs';
import { Auth } from './components/Auth';
import { useAuth } from './hooks/useAuth';
import { useUrlProcessor } from './hooks/useUrlProcessor';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const {
    urls,
    progress,
    results,
    isProcessing,
    processUrls,
    handleFileLoad
  } = useUrlProcessor(user);
  const [activeTab, setActiveTab] = useState('results');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Layout>
      {!user ? (
        <Auth />
      ) : (
        <>
          <FileUploader onFileLoad={handleFileLoad} />
          <ProcessingSection
            urls={urls}
            progress={progress}
            isProcessing={isProcessing}
            onProcess={processUrls}
          />
          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
              {activeTab === 'results' ? (
                <ResultsTable data={results} />
              ) : (
                <DomainAnalysis results={results} />
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}