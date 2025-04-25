'use client';

import { useState } from 'react';
import { validateSupabaseConnection, checkSupabaseProjectExists } from '@/utils/validateSupabase';
import Link from 'next/link';

export default function VerifyConnectionPage() {
  const [results, setResults] = useState<any>(null);
  const [projectCheckResults, setProjectCheckResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const [customUrl, setCustomUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  const handleTest = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const validationResults = await validateSupabaseConnection();
      setResults(validationResults);
      console.log('Validation results:', validationResults);
    } catch (error) {
      console.error('Error testing connection:', error);
      setResults({
        success: false,
        error: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckProject = async () => {
    if (!customUrl) return;
    
    setIsCheckingProject(true);
    setProjectCheckResults(null);
    
    try {
      const checkResults = await checkSupabaseProjectExists(customUrl);
      setProjectCheckResults(checkResults);
      console.log('Project check results:', checkResults);
    } catch (error) {
      console.error('Error checking project:', error);
      setProjectCheckResults({
        valid: false,
        error: String(error)
      });
    } finally {
      setIsCheckingProject(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verify Supabase Connection</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-medium mb-4">Test Current Credentials</h2>
        <button
          onClick={handleTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
        
        {results && (
          <div className="mt-6">
            <div className={`p-4 mb-4 rounded-md ${results.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">
                Status: {results.success ? 'Connected' : 'Connection Failed'}
              </p>
              {results.diagnosis && (
                <p className="mt-2">{results.diagnosis}</p>
              )}
              {results.suggestedFix && (
                <p className="mt-1 text-sm">{results.suggestedFix}</p>
              )}
            </div>
            
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-md font-medium mb-2">Connection Details</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Project exists: {results.projectExists ? 'Yes' : 'No'}</li>
                  <li>Authentication valid: {results.authSuccess ? 'Yes' : 'No'}</li>
                  <li>URL accessible: {results.urlAccessible ? 'Yes' : 'No'}</li>
                  <li>Valid Supabase URL: {results.isSupabaseURL ? 'Yes' : 'No'}</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-md font-medium mb-2">Current Configuration</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                  <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not available'}</p>
                  <p>API Key: {results.credentials?.keyPreview || 'Not available'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium mb-2">Raw Response</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(results.response, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-4">Check if Project Exists</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Enter Supabase URL"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleCheckProject}
            disabled={isCheckingProject || !customUrl}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            {isCheckingProject ? 'Checking...' : 'Check Project'}
          </button>
        </div>
        
        {projectCheckResults && (
          <div className={`p-4 rounded-md ${projectCheckResults.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium">
              Project {projectCheckResults.projectRef}: {projectCheckResults.valid ? 'Found' : 'Not Found'}
            </p>
            {projectCheckResults.error && (
              <p className="mt-2 text-sm">{projectCheckResults.error}</p>
            )}
            <p className="mt-2 text-sm">
              Status: {projectCheckResults.status} {projectCheckResults.statusText}
            </p>
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