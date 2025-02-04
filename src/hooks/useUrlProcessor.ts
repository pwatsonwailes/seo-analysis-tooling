import { useState, useCallback } from 'react';
import { fetchApiData, fetchApiDataBatch } from '../lib/api';
import { saveApiResponse, batchGetExistingResults } from '../lib/db';
import type { User } from '@supabase/supabase-js';
import type { ParsedResult } from '../types';

export function useUrlProcessor(user: User | null) {
  const [urls, setUrls] = useState<string[]>([]);
  const [searchVolumes, setSearchVolumes] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState(0);
  const [dbLoadingProgress, setDbLoadingProgress] = useState(0);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [loadedFromSavedList, setLoadedFromSavedList] = useState(false);

  const resetState = useCallback(() => {
    setUrls([]);
    setSearchVolumes({});
    setProgress(0);
    setDbLoadingProgress(0);
    setResults([]);
    setIsProcessing(false);
    setIsLoadingFromDb(false);
    setLoadedFromSavedList(false);
  }, []);

  const loadExistingResults = useCallback(async (urlsToLoad: string[], volumes: Record<string, number>) => {
    if (!user) return { existingResults: [], newUrls: urlsToLoad };
    if (!urlsToLoad.length) return { existingResults: [], newUrls: [] };
    
    try {
      setIsLoadingFromDb(true);
      setDbLoadingProgress(0);
      
      const existingResults = await batchGetExistingResults(urlsToLoad, user.id);
      
      // Separate successful and failed results
      const successfulResults: ParsedResult[] = [];
      const failedUrls: string[] = [];
      
      // Process each result
      for (const result of existingResults) {
        // Ensure result and response_data are defined
        if (!result || !result.response_data) {
          failedUrls.push(result?.url || '');
          continue;
        }

        // Use the volume from the provided volumes object if it exists,
        // otherwise use the volume from the database result
        const newVolume = volumes[result.url] !== undefined 
          ? volumes[result.url] 
          : (result.search_volume || 0);
        
        // Check if the result was successful
        if (!result.success || result.error) {
          failedUrls.push(result.url);
        } else {
          // Update search volume if it's different from what's in the database
          if (newVolume !== result.search_volume) {
            try {
              const updatedResult = await saveApiResponse({
                ...result,
                user_id: user.id,
                search_volume: newVolume
              });
              successfulResults.push(updatedResult);
            } catch (error) {
              console.error(`Error updating search volume for ${result.url}:`, error);
              successfulResults.push(result);
            }
          } else {
            // Keep the existing result with its current search volume
            successfulResults.push(result);
          }
        }
      }

      setDbLoadingProgress(100);
      setIsLoadingFromDb(false);

      // Get URLs that don't have any results yet
      const existingUrls = new Set(existingResults.map(result => result.url));
      const completelyNewUrls = urlsToLoad.filter(url => !existingUrls.has(url));

      // Combine failed URLs with completely new ones
      const urlsToProcess = [...failedUrls, ...completelyNewUrls];

      return { 
        existingResults: successfulResults, 
        newUrls: urlsToProcess
      };
    } catch (error) {
      console.error('Error loading existing results:', error);
      setIsLoadingFromDb(false);
      // On error, treat all URLs as new to ensure no data is lost
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
        
        // Save results with search volumes
        const processedResults = await Promise.all(
          apiResults.map(async (apiResult) => {
            try {
              return await saveApiResponse({
                ...apiResult,
                user_id: user.id,
                search_volume: searchVolumes[apiResult.url] || 0
              });
            } catch (error) {
              console.error('Error saving result:', error);
              const errorResult = {
                url: apiResult.url,
                response_data: {},
                status: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                user_id: user.id,
                search_volume: searchVolumes[apiResult.url] || 0
              };

              return await saveApiResponse(errorResult);
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
            return await saveApiResponse({
              ...apiResult,
              user_id: user.id,
              search_volume: searchVolumes[url] || 0
            });
          }).catch(async (error) => {
            const errorResult = {
              url,
              response_data: {},
              status: 0,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              user_id: user.id,
              search_volume: searchVolumes[url] || 0
            };
            return await saveApiResponse(errorResult);
          }))
        );

        setResults(prev => [...prev, ...individualResults]);
        setProgress(i + batch.length);
      }
    }

    setIsProcessing(false);
  }, [urls, searchVolumes, user]);

  const handleFileLoad = useCallback(async (loadedUrls: string[], volumes: Record<string, number>, fromSavedList = false) => {
    const cleanedUrls = loadedUrls.map(url => url.trim()).filter(Boolean);
    setUrls(cleanedUrls);
    setSearchVolumes(volumes);
    setProgress(0);
    setDbLoadingProgress(0);
    setResults([]);
    setLoadedFromSavedList(fromSavedList);

    if (user && cleanedUrls.length > 0) {
      const { existingResults, newUrls } = await loadExistingResults(cleanedUrls, volumes);
      setResults(existingResults);
      
      if (newUrls.length > 0) {
        setUrls(newUrls);
        // Automatically start processing failed and new URLs
        setIsProcessing(true);
        processUrls();
      } else {
        setUrls([]);
      }
    }
  }, [user, loadExistingResults, processUrls]);

  return {
    urls,
    progress,
    dbLoadingProgress,
    results,
    isProcessing,
    isLoadingFromDb,
    processUrls,
    handleFileLoad,
    resetState,
    loadedFromSavedList
  };
}