import { useState, useCallback, useRef } from 'react';
import { fetchApiData, fetchApiDataBatch } from '../lib/api';
import { saveApiResponse, batchGetExistingResults } from '../lib/db';
import type { User } from '@supabase/supabase-js';
import type { ParsedResult } from '../types';

export function useUrlProcessor(user: User | null) {
  const [baseData, setBaseData] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState(0);
  const [dbLoadingProgress, setDbLoadingProgress] = useState(0);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [loadedFromSavedList, setLoadedFromSavedList] = useState(false);
  
  // Use refs to track ongoing operations
  const processingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setBaseData({});
    setProgress(0);
    setDbLoadingProgress(0);
    setResults([]);
    setIsProcessing(false);
    setIsLoadingFromDb(false);
    setLoadedFromSavedList(false);
    processingRef.current = false;
  }, []);

  const loadExistingResults = useCallback(async (data: Record<string, number>) => {
    const urlsToLoad = Object.keys(data);
    if (!user) return { existingResults: [], newUrls: urlsToLoad };
    if (!urlsToLoad.length) return { existingResults: [], newUrls: [] };
    
    try {
      setIsLoadingFromDb(true);
      setDbLoadingProgress(0);
      
      // Create a new abort controller for this operation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Process in smaller batches for better UI responsiveness
      const BATCH_SIZE = 50;
      const batches = Math.ceil(urlsToLoad.length / BATCH_SIZE);
      
      const existingResults: ParsedResult[] = [];
      const failedUrls: string[] = [];
      
      for (let i = 0; i < batches; i++) {
        // Check if operation was aborted
        if (signal.aborted) {
          throw new Error('Operation aborted');
        }
        
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, urlsToLoad.length);
        const batchUrls = urlsToLoad.slice(start, end);
        
        const batchResults = await batchGetExistingResults(batchUrls, user.id);
        
        // Process each result in the batch
        for (const result of batchResults) {
          if (!result || !result.response_data) {
            failedUrls.push(result?.url || '');
            continue;
          }

          if (!result.success || result.error) {
            failedUrls.push(result.url);
          } else {
            // Update search volume if it's different from what's in the database
            if (data[result.url] !== result.search_volume) {
              try {
                const updatedResult = await saveApiResponse({
                  ...result,
                  user_id: user.id,
                  search_volume: data[result.url]
                });
                existingResults.push(updatedResult);
              } catch (error) {
                console.error(`Error updating search volume for ${result.url}:`, error);
                existingResults.push(result);
              }
            } else {
              existingResults.push(result);
            }
          }
        }
        
        // Update progress
        setDbLoadingProgress(Math.round(((i + 1) / batches) * 100));
      }

      setDbLoadingProgress(100);
      setIsLoadingFromDb(false);

      // Get URLs that don't have any results yet
      const existingUrls = new Set(existingResults.map(result => result.url));
      const completelyNewUrls = urlsToLoad.filter(url => !existingUrls.has(url));

      // Combine failed URLs with completely new ones
      const urlsToProcess = [...new Set([...failedUrls, ...completelyNewUrls])];

      return { 
        existingResults, 
        newUrls: urlsToProcess
      };
    } catch (error) {
      console.error('Error loading existing results:', error);
      setIsLoadingFromDb(false);
      
      // Only treat all URLs as new if the operation wasn't aborted
      if (error instanceof Error && error.message === 'Operation aborted') {
        return { existingResults: [], newUrls: [] };
      }
      
      // On other errors, treat all URLs as new to ensure no data is lost
      return { existingResults: [], newUrls: urlsToLoad };
    } finally {
      abortControllerRef.current = null;
    }
  }, [user]);

  const processUrls = useCallback(async () => {
    if (!user || processingRef.current) return;
    
    setIsProcessing(true);
    processingRef.current = true;
    setProgress(0);

    const urls = Object.keys(baseData);
    if (urls.length === 0) {
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }
    
    // Create a new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    const BATCH_SIZE = 10;
    const newResults: ParsedResult[] = [];
    
    try {
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        // Check if operation was aborted
        if (signal.aborted) {
          throw new Error('Operation aborted');
        }
        
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
                  search_volume: baseData[apiResult.url] || 0
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
                  search_volume: baseData[apiResult.url] || 0
                };

                return await saveApiResponse(errorResult);
              }
            })
          );

          newResults.push(...processedResults);
          setResults(prev => [...prev, ...processedResults]);
          setProgress(i + batch.length);
        } catch (error) {
          // Handle failed batch by processing individually
          const individualResults = await Promise.all(
            batch.map(url => fetchApiData(url).then(async (apiResult) => {
              return await saveApiResponse({
                ...apiResult,
                user_id: user.id,
                search_volume: baseData[url] || 0
              });
            }).catch(async (error) => {
              const errorResult = {
                url,
                response_data: {},
                status: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                user_id: user.id,
                search_volume: baseData[url] || 0
              };
              return await saveApiResponse(errorResult);
            }))
          );

          newResults.push(...individualResults);
          setResults(prev => [...prev, ...individualResults]);
          setProgress(i + batch.length);
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      // If aborted, we don't need to do anything special
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [baseData, user]);

  const handleFileLoad = useCallback(async (data: Record<string, number>, fromSavedList = false) => {
    // Cancel any ongoing operations first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setBaseData(data);
    setProgress(0);
    setDbLoadingProgress(0);
    setResults([]);
    setLoadedFromSavedList(fromSavedList);
    processingRef.current = false;

    if (user && Object.keys(data).length > 0) {
      const { existingResults, newUrls } = await loadExistingResults(data);
      setResults(existingResults);
      
      if (newUrls.length > 0) {
        // Filter baseData to only include new URLs
        const newData = Object.fromEntries(
          Object.entries(data).filter(([url]) => newUrls.includes(url))
        );
        setBaseData(newData);
        // Automatically start processing failed and new URLs
        setIsProcessing(true);
        processUrls();
      } else {
        setBaseData({});
      }
    }
  }, [user, loadExistingResults, processUrls]);

  return {
    baseData,
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