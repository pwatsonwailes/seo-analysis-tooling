import { supabase } from './supabase';
import type { ApiResult, ParsedResult, Portfolio, KeywordList } from '../types';

export async function saveApiResult(result: ApiResult & { user_id: string }): Promise<ParsedResult> {
  // First check if a result already exists
  const { data: existing } = await supabase
    .from('api_results')
    .select()
    .eq('url', result.url)
    .eq('user_id', result.user_id)
    .maybeSingle();

  if (existing) {
    // If exists, update it
    const { data, error } = await supabase
      .from('api_results')
      .update({
        ...result,
        search_volume: result.search_volume
      })
      .eq('id', existing.id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } else {
    // If not exists, insert new
    const { data, error } = await supabase
      .from('api_results')
      .insert({
        ...result,
        search_volume: result.search_volume
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}

export async function updateApiResult(id: string, result: ApiResult & { user_id: string }): Promise<ParsedResult> {
  const { data, error } = await supabase
    .from('api_results')
    .update({
      ...result,
      search_volume: result.search_volume
    })
    .eq('id', id)
    .eq('user_id', result.user_id)
    .select()
    .single();
    
  if (error) {
    // If update fails, try inserting as new record
    return saveApiResult(result);
  }
  
  return data;
}

export async function getExistingResult(url: string, userId: string): Promise<ParsedResult | null> {
  const { data, error } = await supabase
    .from('api_results')
    .select()
    .eq('url', url)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

// Portfolio management
export async function savePortfolio(name: string, terms: string[], userId: string): Promise<Portfolio> {
  const { data, error } = await supabase
    .from('portfolios')
    .insert({ name, terms, user_id: userId })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getPortfolios(): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select()
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function deletePortfolio(id: string): Promise<void> {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

// Keyword list management
export async function saveKeywordList(name: string, urls: string[], searchVolumes: Record<string, number>, userId: string): Promise<KeywordList> {
  const { data, error } = await supabase
    .from('keyword_lists')
    .insert({ 
      name, 
      urls,
      search_volumes: searchVolumes,
      user_id: userId 
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getKeywordLists(): Promise<KeywordList[]> {
  const { data, error } = await supabase
    .from('keyword_lists')
    .select()
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function deleteKeywordList(id: string): Promise<void> {
  const { error } = await supabase
    .from('keyword_lists')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}