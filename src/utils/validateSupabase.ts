/**
 * Independent Supabase validation utility
 * This directly tests the Supabase credentials without the Supabase client
 */

export const validateSupabaseConnection = async () => {
  try {
    // Get credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Testing Supabase connection with supplied credentials...');
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Missing Supabase URL or API key in environment variables',
        details: {
          urlConfigured: !!supabaseUrl,
          keyConfigured: !!supabaseKey
        }
      };
    }
    
    // Attempt direct connection to the REST API
    const authHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    };
    
    // Test project existence with a simple health check
    console.log('Checking if Supabase project exists...');
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        ...authHeaders
      }
    });
    
    const projectExists = healthResponse.status !== 404;
    const authSuccess = healthResponse.status !== 401;
    
    // Capture response details for debugging
    let responseBody = '';
    try {
      responseBody = await healthResponse.text();
    } catch (e) {
      responseBody = 'Could not read response body';
    }
    
    const responseDetails = {
      status: healthResponse.status,
      statusText: healthResponse.statusText,
      headers: Object.fromEntries([...healthResponse.headers.entries()]),
      body: responseBody
    };
    
    // Try to diagnose the issue based on response
    let diagnosis = '';
    let suggestedFix = '';
    
    if (healthResponse.status === 401) {
      diagnosis = 'Authentication failed. Your API key is not being accepted by Supabase.';
      suggestedFix = 'Go to your Supabase dashboard and generate a new anon/public key, then update your .env.local file.';
    } else if (healthResponse.status === 404) {
      diagnosis = 'The Supabase project could not be found. It may have been deleted or renamed.';
      suggestedFix = 'Check your Supabase project URL and verify it exists in your Supabase dashboard.';
    } else if (!healthResponse.ok) {
      diagnosis = `Unexpected error when connecting to Supabase: HTTP ${healthResponse.status}`;
      suggestedFix = 'Check your network connection and Supabase status page for any ongoing issues.';
    }
    
    // Try a browser-friendly URL test
    console.log('Testing browser-friendly URL (no auth)...');
    const urlTest = await fetch(`${supabaseUrl}`);
    const urlAccessible = urlTest.status !== 404;
    
    // Check if this is a real Supabase URL by looking for typical Supabase headers
    const isSupabaseURL = urlTest.headers.has('x-suicide-prevention') || 
                         urlTest.headers.has('x-stainless') ||
                         healthResponse.headers.has('x-postgres-insert-query');
    
    return {
      success: healthResponse.ok,
      projectExists,
      authSuccess,
      urlAccessible,
      isSupabaseURL,
      diagnosis,
      suggestedFix,
      response: responseDetails,
      credentials: {
        urlConfigured: !!supabaseUrl,
        keyConfigured: !!supabaseKey,
        // Show only the first part and last few characters for debugging without compromising security
        keyPreview: supabaseKey ? 
          `${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 5)}` : 
          null
      }
    };
  } catch (error) {
    console.error('Error validating Supabase connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
  }
};

/**
 * Check if a Supabase project URL is valid and active
 * This can be used to verify if a project still exists without needing API keys
 */
export const checkSupabaseProjectExists = async (projectUrl: string) => {
  try {
    // Extract project ref from URL
    const projectRef = projectUrl.match(/\/\/([a-z0-9-]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      return {
        valid: false,
        error: 'Invalid Supabase URL format'
      };
    }
    
    // Try to access the project's public URL
    const response = await fetch(`https://${projectRef}.supabase.co`);
    
    return {
      valid: response.status !== 404,
      status: response.status,
      statusText: response.statusText,
      projectRef
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}; 