import { supabase } from './supabase';
import type { ApiResult, ParsedResult, Portfolio, KeywordList } from '../types';

// Helper function to format error messages
function formatError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error('An unexpected error occurred');
}

export async function batchGetExistingResults(urls: string[], userId: string): Promise<ParsedResult[]> {
  try {
    if (!urls.length) return [];
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('api_results')
      .select('*')
      .in('url', urls)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const latestResults = new Map<string, ParsedResult>();
    data?.forEach(result => {
      if (!latestResults.has(result.url)) {
        latestResults.set(result.url, result);
      }
    });

    return Array.from(latestResults.values());
  } catch (error) {
    console.error('Error batch getting results:', formatError(error));
    throw formatError(error);
  }
}

export async function updateSearchVolumeIfNeeded(url: string, newSearchVolume: number, userId: string): Promise<void> {
  try {
    if (!url) throw new Error('URL is required');
    if (!userId) throw new Error('User ID is required');
    if (typeof newSearchVolume !== 'number') throw new Error('Search volume must be a number');

    const { data: existing, error: selectError } = await supabase
      .from('api_results')
      .select('id, search_volume')
      .eq('url', url)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectError) throw selectError;

    if (existing && existing.search_volume !== newSearchVolume) {
      const { error: updateError } = await supabase
        .from('api_results')
        .update({ search_volume: newSearchVolume })
        .eq('id', existing.id)
        .eq('user_id', userId);
        
      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Error updating search volume:', formatError(error));
    throw formatError(error);
  }
}

export async function saveApiResponse(result: Omit<ApiResult, 'search_volume'> & { user_id: string }): Promise<ParsedResult> {
  try {
    if (!result.url) throw new Error('URL is required');
    if (!result.user_id) throw new Error('User ID is required');

    const { data: existing, error: selectError } = await supabase
      .from('api_results')
      .select('*')
      .eq('url', result.url)
      .eq('user_id', result.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectError && selectError.code !== 'PGRST116') throw selectError;

    if (existing) {
      const { data, error } = await supabase
        .from('api_results')
        .update({
          response_data: result.response_data,
          status: result.status,
          success: result.success,
          error: result.error
        })
        .eq('id', existing.id)
        .eq('user_id', result.user_id)
        .select()
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Failed to update API result');
      return data;
    } else {
      const { data, error } = await supabase
        .from('api_results')
        .insert({
          url: result.url,
          response_data: result.response_data,
          status: result.status,
          success: result.success,
          error: result.error,
          user_id: result.user_id,
          search_volume: 0
        })
        .select()
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Failed to create API result');
      return data;
    }
  } catch (error) {
    console.error('Error saving API response:', formatError(error));
    throw formatError(error);
  }
}

export async function getExistingResult(url: string, userId: string): Promise<ParsedResult | null> {
  try {
    if (!url) throw new Error('URL is required');
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('api_results')
      .select()
      .eq('url', url)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting existing result:', formatError(error));
    throw formatError(error);
  }
}

export async function savePortfolio(name: string, terms: string[], userId: string): Promise<Portfolio> {
  try {
    if (!name) throw new Error('Portfolio name is required');
    if (!terms?.length) throw new Error('Terms are required');
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('portfolios')
      .insert({ name, terms, user_id: userId })
      .select()
      .single();
      
    if (error) throw error;
    if (!data) throw new Error('Failed to create portfolio');
    return data;
  } catch (error) {
    console.error('Error saving portfolio:', formatError(error));
    throw formatError(error);
  }
}

export async function getPortfolios(): Promise<Portfolio[]> {
  try {
    const { data, error } = await supabase
      .from('portfolios')
      .select()
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error getting portfolios:', formatError(error));
    throw formatError(error);
  }
}

export async function deletePortfolio(id: string): Promise<void> {
  try {
    if (!id) throw new Error('Portfolio ID is required');

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting portfolio:', formatError(error));
    throw formatError(error);
  }
}

export async function saveKeywordList(name: string, urls: string[], searchVolumes: Record<string, number>, userId: string): Promise<KeywordList> {
  try {
    if (!name) throw new Error('List name is required');
    if (!urls?.length) throw new Error('URLs are required');
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('keyword_lists')
      .insert({ 
        name, 
        urls,
        search_volume: searchVolumes,
        user_id: userId 
      })
      .select()
      .single();
      
    if (error) throw error;
    if (!data) throw new Error('Failed to create keyword list');
    return data;
  } catch (error) {
    console.error('Error saving keyword list:', formatError(error));
    throw formatError(error);
  }
}

export async function getKeywordLists(): Promise<KeywordList[]> {
  try {
    const { data, error } = await supabase
      .from('keyword_lists')
      .select()
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error getting keyword lists:', formatError(error));
    throw formatError(error);
  }
}

export async function deleteKeywordList(id: string): Promise<void> {
  try {
    if (!id) throw new Error('List ID is required');

    const { error } = await supabase
      .from('keyword_lists')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting keyword list:', formatError(error));
    throw formatError(error);
  }
}