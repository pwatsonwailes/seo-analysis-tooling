import { useState, useCallback } from 'react';
import { fetchApiData } from '../lib/api';
import { saveApiResult, updateApiResult, getExistingResult } from '../lib/db';
import { isValidApiResponse } from '../utils/validateApiResponse';
import type { User } from '@supabase/supabase-js';
import type { ParsedResult } from '../types';

export function useUrlProcessor(user: User | null) {
  const [urls, setUrls] = useState<string[]>([]);
  const [searchVolumes, setSearchVolumes] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadedFromSavedList, setLoadedFromSavedList] = useState(false);

  const resetState = useCallback(() => {
    setUrls([]);
    setSearchVolumes({});
    setProgress(0);
    setResults([]);
    setIsProcessing(false);
    setLoadedFromSavedList(false);
  }, []);

  const loadExistingResults = useCallback(async (urlsToLoad: string[], volumes: Record<string, number>) => {
    if (!user) return { existingResults: [], newUrls: urlsToLoad };
    
    const existingResults: ParsedResult[] = [];
    const newUrls: string[] = [];
    
    for (const url of urlsToLoad) {
      try {
        const existingResult = await getExistingResult(url, user.id);
        if (existingResult) {
          // Always update with the new search volume
          const updatedResult = await updateApiResult(existingResult.id, {
            ...existingResult,
            search_volume: volumes[url],
            user_id: user.id
          });
          existingResults.push(updatedResult);
        } else {
          newUrls.push(url);
        }
      } catch (error) {
        console.error('Error checking existing result:', error);
        newUrls.push(url);
      }
    }
    
    return { existingResults, newUrls };
  }, [user]);

  const processUrls = useCallback(async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const searchVolume = searchVolumes[url] || 0;

      try {
        const existingResult = await getExistingResult(url, user.id);
        
        if (existingResult) {
          // Always update the search volume for existing results
          const updatedResult = await updateApiResult(existingResult.id, {
            ...existingResult,
            search_volume: searchVolume,
            user_id: user.id
          });
          setResults(prev => [...prev, updatedResult]);
        } else {
          // Fetch new data and include search volume
          const apiResult = await fetchApiData(url);
          const resultWithUser = { 
            ...apiResult, 
            user_id: user.id,
            search_volume: searchVolume
          };

          const savedResult = await saveApiResult(resultWithUser);
          if (savedResult) {
            setResults(prev => [...prev, savedResult]);
          }
        }
      } catch (error) {
        console.error('Error processing URL:', error);
        const errorResult = {
          url,
          response_data: {},
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          user_id: user.id,
          search_volume: searchVolume
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
  }, [urls, searchVolumes, user]);

  const handleFileLoad = useCallback(async (loadedUrls: string[], volumes: Record<string, number>, fromSavedList = false) => {
    const cleanedUrls = loadedUrls.map(url => url.trim());
    setUrls(cleanedUrls);
    setSearchVolumes(volumes);
    setProgress(0);
    setResults([]);
    setLoadedFromSavedList(fromSavedList);

    if (user) {
      const { existingResults, newUrls } = await loadExistingResults(cleanedUrls, volumes);
      if (existingResults.length > 0) {
        setResults(existingResults);
        setUrls(newUrls);
        setProgress(existingResults.length);
      }
    }
  }, [user, loadExistingResults]);

  return {
    urls,
    progress,
    results,
    isProcessing,
    processUrls,
    handleFileLoad,
    resetState,
    loadedFromSavedList
  };
}