import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isValidApiResponse } from '../utils/validateApiResponse';
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
        // First, check if we already have valid results for this URL
        const { data: existingResults } = await supabase
          .from('api_results')
          .select()
          .eq('url', urls[i])
          .limit(1)
          .single();

        if (existingResults && isValidApiResponse(existingResults)) {
          setResults(prev => [...prev, existingResults]);
          setProgress(i + 1);
          continue;
        }

        // If no existing results or invalid response, make the API call
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urls[i])}`;
        const response = await fetch(proxyUrl);
        const proxyData = await response.json();
        
        const data = JSON.parse(proxyData.contents);
        
        const result = {
          url: urls[i],
          response_data: data,
          status: response.status,
          success: response.ok,
          user_id: user.id
        };

        // If we had invalid results before, update them instead of inserting new ones
        const { data: savedResult, error } = existingResults 
          ? await supabase
              .from('api_results')
              .update(result)
              .eq('id', existingResults.id)
              .select()
              .single()
          : await supabase
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
    const cleanedUrls = loadedUrls.map(url => url.trim());
    setUrls(cleanedUrls);
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