/*
  # API Results Storage Schema

  1. New Tables
    - `api_results`
      - `id` (uuid, primary key) - Unique identifier
      - `url` (text) - The API endpoint URL
      - `response_data` (jsonb) - The JSON response data
      - `status` (int) - HTTP status code
      - `created_at` (timestamp) - When the result was stored
      - `success` (boolean) - Whether the request succeeded
      - `error` (text) - Error message if request failed

  2. Security
    - Enable RLS on `api_results` table
    - Add policies for authenticated users to read/write their own data
*/

CREATE TABLE IF NOT EXISTS api_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  response_data jsonb,
  status int,
  created_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error text,
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE api_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
  ON api_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own results"
  ON api_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);