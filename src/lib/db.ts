import { supabase } from './supabase';
import type { ApiResult, ParsedResult } from '../types';

export async function saveApiResult(result: ApiResult & { user_id: string }): Promise<ParsedResult> {
  const { data, error } = await supabase
    .from('api_results')
    .insert(result)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateApiResult(id: string, result: ApiResult & { user_id: string }): Promise<ParsedResult> {
  // Remove id from the update payload if it exists
  const { id: _, ...updateData } = result;

  const { data, error } = await supabase
    .from('api_results')
    .update(updateData)
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) throw error;
  return data;
}