import { supabase } from './supabase';
import type { ApiResult } from '../types';

export async function saveApiResult(result: ApiResult & { user_id: string }) {
  const { data, error } = await supabase
    .from('api_results')
    .insert(result)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateApiResult(id: string, result: ApiResult & { user_id: string }) {
  const { data, error } = await supabase
    .from('api_results')
    .update(result)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getExistingResult(url: string) {
  const { data, error } = await supabase
    .from('api_results')
    .select()
    .eq('url', url)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) throw error;
  return data?.[0];
}