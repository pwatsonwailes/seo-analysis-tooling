import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useUrlProcessor(user: User | null) {
  const [urls, setUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processUrls = useCallback(async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i]);
        const data = await response.json();
        
        const result = {
          url: urls[i],
          response_data: data,
          status: response.status,
          success: response.ok,
          user_id: user.id
        };

        const { data: savedResult, error } = await supabase
          .from('api_results')
          .insert(result)
          .select()
          .single();

        if (error) throw error;
        
        setResults(prev => [...prev, savedResult]);
      } catch (error) {
        const errorResult = {
          url: urls[i],
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          user_id: user.id
        };

        const { data: savedError } = await supabase
          .from('api_results')
          .insert(errorResult)
          .select()
          .single();

        if (savedError) {
          setResults(prev => [...prev, savedError]);
        }
      }

      setProgress(i + 1);
    }

    setIsProcessing(false);
  }, [urls, user]);

  const handleFileLoad = useCallback((loadedUrls: string[]) => {
    setUrls(loadedUrls);
    setProgress(0);
    setResults([]);
  }, []);

  return {
    urls,
    progress,
    results,
    isProcessing,
    processUrls,
    handleFileLoad
  };
}