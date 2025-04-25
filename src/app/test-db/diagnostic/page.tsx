'use client';

import { useState } from 'react';
import { validateSupabaseConnection } from '@/utils/validateSupabase';
import { diagnoseSupabaseClient, createFreshSupabaseClient } from '@/utils/fix-supabase';
import Link from 'next/link';

export default function DiagnosticPage() {
  const [results, setResults] = useState<any>(null);
  const [clientResults, setClientResults] = useState<any>(null);
  const [directResults, setDirectResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [restartCommand, setRestartCommand] = useState('');
  const [showSolutions, setShowSolutions] = useState(false);

  const handleValidateConnection = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const validationResults = await validateSupabaseConnection();
      setResults(validationResults);
    } catch (error) {
      console.error('Error validating connection:', error);
      setResults({
        success: false,
        error: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnoseClient = async () => {
    setIsClientLoading(true);
    setClientResults(null);
    
    try {
      const diagResults = await diagnoseSupabaseClient();
      setClientResults(diagResults);
    } catch (error) {
      console.error('Error diagnosing client:', error);
      setClientResults({
        success: false,
        error: String(error)
      });
    } finally {
      setIsClientLoading(false);
    }
  };

  const handleDirectTest = async () => {
    setIsDirectLoading(true);
    setDirectResults(null);
    
    try {
      // Create a new client for direct testing
      const client = createFreshSupabaseClient();
      const { data, error } = await client.from('quiz_results').select('count(*)', { count: 'exact' });
      
      if (error) {
        setDirectResults({
          success: false,
          error: error
        });
      } else {
        setDirectResults({
          success: true,
          data: data
        });
      }
    } catch (error) {
      console.error('Error with direct test:', error);
      setDirectResults({
        success: false,
        error: String(error)
      });
    } finally {
      setIsDirectLoading(false);
    }
  };

  const restartNextServer = () => {
    // Generate a restart command based on package.json
    setRestartCommand('npm run dev');
    setShowSolutions(true);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Supabase Connection Diagnostic</h1>
      
      <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
        <p className="font-medium">We found that your Supabase connection is returning a 401 error from the application, but direct tests show it might be working. Let's diagnose the issue.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <button
            onClick={handleValidateConnection}
            disabled={isLoading}
            className="w-full mb-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? 'Testing...' : 'Test REST API Connection'}
          </button>
          <p className="text-xs text-gray-500">Tests the connection to Supabase REST API directly</p>
        </div>
        
        <div>
          <button
            onClick={handleDiagnoseClient}
            disabled={isClientLoading}
            className="w-full mb-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            {isClientLoading ? 'Diagnosing...' : 'Diagnose Supabase Client'}
          </button>
          <p className="text-xs text-gray-500">Tests client creation and configuration issues</p>
        </div>
        
        <div>
          <button
            onClick={handleDirectTest}
            disabled={isDirectLoading}
            className="w-full mb-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
          >
            {isDirectLoading ? 'Testing...' : 'Fresh Client Direct Test'}
          </button>
          <p className="text-xs text-gray-500">Creates a new Supabase client and tests it</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* REST API Test Results */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-medium mb-4">REST API Test Results</h2>
          
          {isLoading ? (
            <div className="p-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : results ? (
            <div>
              <div className={`p-4 mb-4 rounded-md ${results.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-medium">
                  Status: {results.success ? 'Connected' : 'Connection Failed'}
                </p>
                {results.diagnosis && (
                  <p className="mt-2">{results.diagnosis}</p>
                )}
              </div>
              
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Connection Details</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Project exists: {results.projectExists ? 'Yes' : 'No'}</li>
                  <li>Authentication valid: {results.authSuccess ? 'Yes' : 'No'}</li>
                  <li>URL accessible: {results.urlAccessible ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Click the button to run the test</p>
          )}
        </div>
        
        {/* Client Diagnostic Results */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-medium mb-4">Client Diagnostic Results</h2>
          
          {isClientLoading ? (
            <div className="p-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : clientResults ? (
            <div>
              <div className={`p-4 mb-4 rounded-md ${clientResults.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-medium">
                  {clientResults.success ? clientResults.message : clientResults.error}
                </p>
                {clientResults.solution && (
                  <p className="mt-2 text-sm">{clientResults.solution}</p>
                )}
              </div>
              
              {clientResults.details && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Error Details</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(clientResults.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Click the button to run diagnostics</p>
          )}
        </div>
      </div>
      
      {/* Direct Client Test Results */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-4">Fresh Client Test Results</h2>
        
        {isDirectLoading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : directResults ? (
          <div>
            <div className={`p-4 mb-4 rounded-md ${directResults.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">
                Status: {directResults.success ? 'Success' : 'Failed'}
              </p>
              
              {directResults.success && directResults.data && (
                <p className="mt-2 text-sm">
                  Count: {directResults.data.count} records in quiz_results table
                </p>
              )}
              
              {!directResults.success && directResults.error && (
                <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(directResults.error, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">Click the button to test with a fresh client</p>
        )}
      </div>
      
      {/* Solutions Section */}
      <div className="mt-8">
        <button
          onClick={restartNextServer}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Show Solutions
        </button>
        
        {showSolutions && (
          <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-xl font-medium mb-4">Recommended Solutions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">1. Restart your Next.js server</h3>
                <p className="mb-2">The most common reason for this issue is that your Next.js server has cached the old environment variables or client.</p>
                <div className="bg-gray-800 text-white p-3 rounded font-mono text-sm">
                  {restartCommand}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">2. Clear browser cache and cookies</h3>
                <p>Sometimes the browser can cache old Supabase sessions or tokens.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">3. Check environment variables</h3>
                <p>Make sure your .env.local file has the correct values and Next.js is loading them.</p>
                <p className="mt-2">Run this script to update your credentials:</p>
                <div className="bg-gray-800 text-white p-3 rounded font-mono text-sm">
                  node scripts/update-supabase-credentials.js
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">4. Check Supabase dashboard</h3>
                <p>Verify in your Supabase dashboard that the project is active and the API keys are valid.</p>
                <a 
                  href="https://app.supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Supabase Dashboard
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 border-t pt-4">
        <Link href="/test-db" className="text-blue-600 hover:text-blue-800">
          Back to Test Database
        </Link>
      </div>
    </div>
  );
} 