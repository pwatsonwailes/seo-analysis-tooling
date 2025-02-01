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
  if (error && typeof error === 'object') {
    if ('message' in error) {
      return new Error(String(error.message));
    }
    // Handle Supabase error format
    if ('error' in error && typeof error.error === 'string') {
      return new Error(error.error);
    }
    // Handle detailed error format
    if ('details' in error && typeof error.details === 'string') {
      return new Error(error.details);
    }
  }
  return new Error('An unexpected error occurred');
}

export async function batchGetExistingResults(urls: string[], userId: string): Promise<ParsedResult[]> {
  try {
    if (!urls.length) return [];
    if (!userId) throw new Error('User ID is required');

    // Process in smaller batches to avoid query size limits
    const BATCH_SIZE = 100;
    const results: ParsedResult[] = [];
    
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batchUrls = urls.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('api_results')
        .select('*')
        .in('url', batchUrls)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get only the latest result for each URL
      const latestResults = new Map<string, ParsedResult>();
      data?.forEach(result => {
        if (!latestResults.has(result.url)) {
          latestResults.set(result.url, result);
        }
      });

      results.push(...Array.from(latestResults.values()));
    }

    return results;
  } catch (error) {
    console.error('Error batch getting results:', error);
    throw formatError(error);
  }
}

export async function saveApiResponse(
  result: Omit<ApiResult, 'search_volume'> & { user_id: string; search_volume?: number }
): Promise<ParsedResult> {
  try {
    if (!result.url) throw new Error('URL is required');
    if (!result.user_id) throw new Error('User ID is required');

    // First check if we have an existing result
    const { data: existingResults, error: selectError } = await supabase
      .from('api_results')
      .select('*')
      .eq('url', result.url)
      .eq('user_id', result.user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (selectError) {
      console.error('Error fetching existing result:', selectError);
      throw selectError;
    }

    const existing = existingResults?.[0];

    // If we have an existing result
    if (existing) {
      console.log(`Found existing result for ${result.url}. Success: ${existing.success}, Current volume: ${existing.search_volume}, New volume: ${result.search_volume}`);

      // If the existing result was unsuccessful or we have new API data, create a new record
      if (!existing.success || (result.response_data && Object.keys(result.response_data).length > 0)) {
        console.log(`Creating new record for ${result.url} due to ${!existing.success ? 'previous failure' : 'new API data'}`);
        const { data: inserted, error: insertError } = await supabase
          .from('api_results')
          .insert({
            url: result.url,
            response_data: result.response_data,
            status: result.status,
            success: result.success,
            error: result.error,
            user_id: result.user_id,
            search_volume: result.search_volume || 0
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error inserting new record:', insertError);
          throw insertError;
        }

        if (!inserted) {
          throw new Error(`Failed to create API result for ${result.url}`);
        }

        return inserted;
      }

      // If we're just updating the search volume for a successful result
      if (existing.success && existing.search_volume !== result.search_volume) {
        console.log(`Updating only search volume for ${result.url}`);
        
        const { data: updated, error: updateError } = await supabase
          .from('api_results')
          .update({ search_volume: result.search_volume || 0 })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating search volume:', updateError);
          throw updateError;
        }

        if (!updated) {
          throw new Error(`Failed to update search volume for ${result.url}`);
        }

        return updated;
      }

      // If nothing needs to be updated, return the existing result
      return existing;
    }

    // If we don't have an existing result, create a new record
    console.log(`Creating new record for ${result.url} (no existing record)`);
    const { data: inserted, error: insertError } = await supabase
      .from('api_results')
      .insert({
        url: result.url,
        response_data: result.response_data,
        status: result.status,
        success: result.success,
        error: result.error,
        user_id: result.user_id,
        search_volume: result.search_volume || 0
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting new record:', insertError);
      throw insertError;
    }

    if (!inserted) {
      throw new Error(`Failed to create API result for ${result.url}`);
    }

    return inserted;
  } catch (error) {
    const formattedError = formatError(error);
    console.error('Error saving API response:', formattedError);
    throw formattedError;
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
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching existing result:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting existing result:', error);
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