import { supabase } from './supabase';

/**
 * Test Supabase connection and permissions
 * This function tests if the Supabase client can connect and if it has 
 * proper permissions to read/write to the quiz_results table
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    const results = {
      success: false,
      connected: false,
      canRead: false,
      canWrite: false,
      steps: [] as any[],
      error: null as any,
      details: {} as any
    };
    
    // Get URL from environment variable directly instead of accessing protected property
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Step 1: Test basic connection by getting service version
    results.steps.push({ name: 'Basic connection test', status: 'running' });
    
    // Check if we have environment variables set
    if (!supabaseUrl || !supabaseKey) {
      results.steps[0].status = 'failed';
      results.steps[0].error = 'Missing Supabase URL or API key in environment variables';
      results.error = 'Supabase configuration is missing. Check your .env.local file.';
      return results;
    }
    
    // Log partial key for debugging (only first 10 chars for security)
    results.details.configCheck = {
      urlConfigured: !!supabaseUrl,
      keyConfigured: !!supabaseKey,
      keyPreview: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : null
    };
    
    // First, check if we can reach the Supabase URL (network connectivity test)
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`);
      results.details.networkCheck = {
        status: response.status,
        ok: response.ok
      };
      
      if (!response.ok) {
        results.steps[0].status = 'failed';
        results.steps[0].error = `Network connectivity issue: HTTP ${response.status}`;
        results.error = `Cannot connect to Supabase: HTTP ${response.status}`;
        
        // Add more helpful messages based on status code
        if (response.status === 401) {
          results.error += ' - Unauthorized. Your API key may be invalid or expired.';
          results.details.troubleshooting = [
            'Check if your API key is correct in .env.local',
            'Go to your Supabase project settings to get a new API key',
            'Make sure you\'re using the anon/public key for client access',
            'Verify the key hasn\'t been revoked or the project deleted'
          ];
        } else if (response.status === 404) {
          results.error += ' - Not Found. Check your Supabase URL.';
        }
        
        return results;
      }
    } catch (networkError) {
      results.steps[0].status = 'failed';
      results.steps[0].error = networkError instanceof Error ? 
        networkError.message : 'Network connectivity failed';
      results.error = 'Cannot reach Supabase server. Check your internet connection.';
      results.details.networkError = networkError;
      return results;
    }
    
    // Check API version
    const { data: versionData, error: versionError } = await supabase
      .from('_anquery_version')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (versionError) {
      console.log('Could not check version, but still might be connected');
      results.steps[0].status = 'warning';
      results.steps[0].warning = {
        message: 'Could not check API version, will continue testing',
        error: versionError
      };
      // Still proceed with testing
    } else {
      console.log('Connected to Supabase. Version info:', versionData);
      results.steps[0].status = 'success';
      results.steps[0].data = versionData;
      results.connected = true;
    }
    
    // Step 2: Check if we can read from the quiz_results table
    results.steps.push({ name: 'Read access test', status: 'running' });
    const { data: readData, error: readError } = await supabase
      .from('quiz_results')
      .select('id')
      .limit(1);
      
    if (readError) {
      console.error('Error reading from quiz_results table:', readError);
      results.steps[1].status = 'failed';
      results.steps[1].error = {
        message: readError.message,
        code: readError.code,
        details: readError.details,
        hint: readError.hint
      };
      
      results.error = `Cannot read from quiz_results table: ${readError.message}`;
      
      // Specific error diagnosis
      if (readError.code === '42P01') {
        results.error = 'The quiz_results table does not exist. Schema issue detected.';
      } else if (readError.code === '42501' || readError.message?.includes('permission denied')) {
        results.error = 'Permission denied when reading quiz_results table. Check RLS policies.';
      }
      
      results.connected = true; // We could connect, but couldn't read
      return results;
    }
    
    console.log('Can read from quiz_results table:', readData);
    results.steps[1].status = 'success';
    results.steps[1].data = { count: readData.length };
    results.canRead = true;
    
    // Step 3: Check if the quizzes table exists (we'll need a valid quiz_id)
    results.steps.push({ name: 'Find valid quiz ID', status: 'running' });
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .limit(1)
      .single();
      
    let testQuizId = '00000000-0000-0000-0000-000000000000';
    
    if (quizError) {
      console.warn('Could not find a quiz to use for testing:', quizError);
      results.steps[2].status = 'warning';
      results.steps[2].warning = {
        message: 'Using fallback UUID. This might fail due to foreign key constraints.',
        error: quizError
      };
    } else if (quizData?.id) {
      testQuizId = quizData.id;
      console.log('Found quiz to use for testing:', testQuizId);
      results.steps[2].status = 'success';
      results.steps[2].data = { quizId: testQuizId };
    }
    
    // Step 4: Try to insert a test record with a valid quiz ID
    results.steps.push({ name: 'Write access test', status: 'running' });
    const testData = {
      quiz_id: testQuizId, 
      user_name: 'Test User',
      score: 5,
      total_questions: 10,
      time_taken: 300,
      completed_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert test record with data:', testData);
    
    // Use try-catch block with direct fetch for better error handling
    try {
      // First try with supabase client for convenience
      const { data: insertData, error: insertError } = await supabase
        .from('quiz_results')
        .insert(testData)
        .select('id')
        .single();
        
      if (insertError) {
        // Enhanced error logging
        console.error('Error inserting into quiz_results table. Error object:', insertError);
        
        // Create a detailed error object with all available properties
        const errorDetails = {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          toString: insertError.toString()
        };
        
        console.error('Error properties:', errorDetails);
        
        // Diagnose common errors
        let diagnosticMessage = 'Unknown error occurred when inserting test data';
        
        // Foreign key violations
        const isForeignKeyError = 
          insertError.message?.includes('foreign key constraint') || 
          insertError.code === '23503' ||
          insertError.details?.includes('Key (quiz_id)');
          
        if (isForeignKeyError) {
          diagnosticMessage = 'Foreign key violation detected. The quiz_id is invalid or does not exist.';
          console.error(diagnosticMessage);
        }
        
        // Row-level security violations
        const isRLSError = 
          insertError.message?.includes('new row violates row-level security') ||
          insertError.code === '42501' ||
          insertError.message?.includes('permission denied');
          
        if (isRLSError) {
          diagnosticMessage = 'Row-level security policy is preventing the insert. Check RLS policies for the quiz_results table.';
          console.error(diagnosticMessage);
        }
        
        // Specific column constraints
        const isNotNullError = insertError.code === '23502';
        if (isNotNullError) {
          diagnosticMessage = 'NOT NULL constraint failed. A required column is missing data.';
          console.error(diagnosticMessage);
        }
        
        // Return detailed error information
        results.steps[3].status = 'failed';
        results.steps[3].error = errorDetails;
        results.error = diagnosticMessage;
        results.details.insertError = errorDetails;
        
        // Try to use direct fetch API to get more details if possible
        try {
          const directResponse = await fetch(`${supabaseUrl}/rest/v1/quiz_results`, {
            method: 'POST',
            headers: {
              'apiKey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(testData)
          });
          
          // Get the raw response text
          const responseText = await directResponse.text();
          let responseBody;
          try {
            responseBody = JSON.parse(responseText);
          } catch (e) {
            responseBody = responseText; 
          }
          
          results.details.directResponse = {
            status: directResponse.status,
            statusText: directResponse.statusText,
            body: responseBody,
            headers: Object.fromEntries([...directResponse.headers.entries()])
          };
          
          if (!directResponse.ok) {
            results.error = `Direct API call failed with HTTP ${directResponse.status}: ${directResponse.statusText}`;
            
            // Add more context based on status code
            if (directResponse.status === 403) {
              results.error += '. This is a permissions issue. Check your API key and RLS policies.';
            } else if (directResponse.status === 400) {
              results.error += '. This is likely a validation error with the data being sent.';
            } else if (directResponse.status === 404) {
              results.error += '. The quiz_results table may not exist.';
            }
          }
        } catch (directFetchError) {
          console.error('Error with direct fetch attempt:', directFetchError);
          results.details.directFetchError = directFetchError instanceof Error ? 
            { message: directFetchError.message, stack: directFetchError.stack } :
            String(directFetchError);
        }
        
        return {
          connected: true,
          canRead: true,
          canWrite: false,
          success: false,
          error: results.error,
          steps: results.steps,
          details: results.details
        };
      }
      
      console.log('Successfully inserted test record:', insertData);
      results.steps[3].status = 'success';
      results.steps[3].data = insertData;
      
      // If we get here, we should clean up the test record
      if (insertData?.id) {
        results.steps.push({ name: 'Cleanup test', status: 'running' });
        const { error: deleteError } = await supabase
          .from('quiz_results')
          .delete()
          .eq('id', insertData.id);
          
        if (deleteError) {
          console.warn('Could not delete test record:', deleteError);
          results.steps[4].status = 'warning';
          results.steps[4].warning = {
            message: 'Test record was created but could not be deleted.',
            error: deleteError
          };
        } else {
          console.log('Successfully deleted test record');
          results.steps[4].status = 'success';
        }
      }
      
      return {
        connected: true,
        canRead: true,
        canWrite: true,
        success: true,
        steps: results.steps
      };
    } catch (error) {
      console.error('Unexpected error inserting test record:', error);
      
      // Capture as much information as possible about the error
      const errorInfo = error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
        constructor: error.constructor?.name
      } : String(error);
      
      results.steps[3].status = 'failed';
      results.steps[3].error = errorInfo;
      results.error = 'Unexpected error when testing write access';
      results.details.unexpectedError = errorInfo;
      
      return {
        connected: true,
        canRead: true,
        canWrite: false,
        success: false,
        error: results.error,
        steps: results.steps,
        details: results.details
      };
    }
    
  } catch (error) {
    console.error('Unexpected error testing Supabase connection:', error);
    
    // Enhanced error capture for unexpected errors
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      constructor: error instanceof Error ? error.constructor?.name : typeof error,
      stringified: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    };
    
    return {
      connected: false,
      canRead: false,
      canWrite: false,
      success: false,
      error: errorInfo.message,
      details: errorInfo
    };
  }
}; 