import { useState, useCallback } from 'react';
import { fetchApiData } from '../lib/api';
import { saveApiResult, updateApiResult, getExistingResult } from '../lib/db';
import { isValidApiResponse } from '../utils/validateApiResponse';
import type { User } from '@supabase/supabase-js';
import type { ParsedResult } from '../types';

export function useUrlProcessor(user: User | null) {
  const [urls, setUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = useCallback(() => {
    setUrls([]);
    setProgress(0);
    setResults([]);
    setIsProcessing(false);
  }, []);

  const processUrls = useCallback(async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    for (let i = 0; i < urls.length; i++) {
      try {
        const existingResult = await getExistingResult(urls[i]);
        
        if (existingResult && isValidApiResponse(existingResult)) {
          setResults(prev => [...prev, existingResult]);
          setProgress(i + 1);
          continue;
        }

        const apiResult = await fetchApiData(urls[i]);
        const resultWithUser = { ...apiResult, user_id: user.id };

        let savedResult;
        if (existingResult) {
          savedResult = await updateApiResult(existingResult.id, resultWithUser);
        } else {
          savedResult = await saveApiResult(resultWithUser);
        }

        if (savedResult) {
          setResults(prev => [...prev, savedResult]);
        }
      } catch (error) {
        console.error('Error processing URL:', error);
        const errorResult = {
          url: urls[i],
          response_data: {},
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          user_id: user.id
        };

        try {
          const savedError = await saveApiResult(errorResult);
          if (savedError) {
            setResults(prev => [...prev, savedError]);
          }
        } catch (saveError) {
          console.error('Error saving error result:', saveError);
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
    handleFileLoad,
    resetState
  };
}