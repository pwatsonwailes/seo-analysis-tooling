import { useState, useCallback } from 'react';
import { fetchApiData, fetchApiDataBatch } from '../lib/api';
import { saveApiResponse, updateSearchVolumeIfNeeded, batchGetExistingResults } from '../lib/db';
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
    
    try {
      const existingResults = await batchGetExistingResults(urlsToLoad, user.id);
      const existingUrls = new Set(existingResults.map(result => result.url));
      const newUrls = urlsToLoad.filter(url => !existingUrls.has(url));

      // Update search volumes in bulk if needed
      const volumeUpdates = existingResults.map(async result => {
        if (result.search_volume !== volumes[result.url]) {
          await updateSearchVolumeIfNeeded(result.url, volumes[result.url], user.id);
          result.search_volume = volumes[result.url];
        }
        return result;
      });

      await Promise.all(volumeUpdates);
      
      return { existingResults, newUrls };
    } catch (error) {
      console.error('Error loading existing results:', error);
      return { existingResults: [], newUrls: urlsToLoad };
    }
  }, [user]);

  const processUrls = useCallback(async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setProgress(0);

    const BATCH_SIZE = 10;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch API data in batches
        const apiResults = await fetchApiDataBatch(batch);
        
        // Save results and update search volumes in parallel
        const processedResults = await Promise.all(
          apiResults.map(async (apiResult) => {
            const searchVolume = searchVolumes[apiResult.url] || 0;
            
            try {
              const savedResult = await saveApiResponse({
                ...apiResult,
                user_id: user.id
              });
              
              await updateSearchVolumeIfNeeded(apiResult.url, searchVolume, user.id);
              return { ...savedResult, search_volume: searchVolume };
            } catch (error) {
              console.error('Error saving result:', error);
              const errorResult = {
                url: apiResult.url,
                response_data: {},
                status: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                user_id: user.id
              };

              const savedError = await saveApiResponse(errorResult);
              return { ...savedError, search_volume: searchVolume };
            }
          })
        );

        setResults(prev => [...prev, ...processedResults]);
        setProgress(i + batch.length);
      } catch (error) {
        console.error('Error processing batch:', error);
        // Handle failed batch by processing individually
        const individualResults = await Promise.all(
          batch.map(url => fetchApiData(url).then(async (apiResult) => {
            const searchVolume = searchVolumes[url] || 0;
            const savedResult = await saveApiResponse({
              ...apiResult,
              user_id: user.id
            });
            await updateSearchVolumeIfNeeded(url, searchVolume, user.id);
            return { ...savedResult, search_volume: searchVolume };
          }).catch(async (error) => {
            const errorResult = {
              url,
              response_data: {},
              status: 0,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              user_id: user.id
            };
            const savedError = await saveApiResponse(errorResult);
            return { ...savedError, search_volume: searchVolumes[url] || 0 };
          }))
        );

        setResults(prev => [...prev, ...individualResults]);
        setProgress(i + batch.length);
      }
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