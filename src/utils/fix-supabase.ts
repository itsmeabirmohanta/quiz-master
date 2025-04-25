/**
 * Supabase client diagnostic and repair utility
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Diagnose why the Supabase client might not be working correctly
 */
export async function diagnoseSupabaseClient() {
  console.log('🔍 Diagnosing Supabase client issues...');

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      error: 'Missing Supabase URL or API key in environment variables',
      solution: 'Make sure .env.local file exists and has the correct values.'
    };
  }

  try {
    // Test creating a fresh client
    console.log('Creating fresh Supabase client...');
    const testClient = createClient(supabaseUrl, supabaseKey);

    // Test basic connection
    console.log('Testing connection with fresh client...');
    const { data: versionData, error: versionError } = await testClient
      .from('_anquery_version')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.log('Error testing version:', versionError);
      
      // Try a more direct test
      const { data: testData, error: testError } = await testClient
        .from('quiz_results')
        .select('count(*)', { count: 'exact' });
        
      if (testError) {
        return {
          success: false,
          error: 'Connection failed with fresh client',
          details: testError,
          solution: 'Try restarting your Next.js server. Environment variables may not be properly loaded.'
        };
      } else {
        return {
          success: true,
          message: 'Connection works with fresh client, but not with version check',
          data: testData,
          solution: 'The issue may be with the cached client. Try restarting your Next.js server.'
        };
      }
    }

    // Try a direct REST API call for comparison
    console.log('Testing direct REST API call...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Direct API call failed: ${response.status} ${response.statusText}`,
        clientTest: 'Passed',
        solution: 'This is unusual - client works but direct API does not. Network issue may be intermittent.'
      };
    }

    return {
      success: true,
      message: 'Supabase client works correctly with current credentials',
      clientTest: 'Passed',
      directTest: 'Passed',
      solution: 'If you still have issues, try restarting your Next.js server completely to refresh the environment.'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      solution: 'Unexpected error creating Supabase client. Make sure your dependencies are up to date.'
    };
  }
}

/**
 * Create a new Supabase client instance independent of the global one
 */
export function createFreshSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or API key in environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
} 