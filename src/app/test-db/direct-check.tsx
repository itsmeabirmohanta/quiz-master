'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { testQuizResultsTable } from '@/utils/supabase';

export default function DirectCheck() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [quizResultsTestResults, setQuizResultsTestResults] = useState<any>(null);
  const [testingQuizResults, setTestingQuizResults] = useState(false);

  const runBasicTest = async () => {
    setLoading(true);
    setResults({});
    
    try {
      // Basic connection test
      const connectionTest = {
        stage: 'Connection Test',
        result: 'Starting...'
      };
      setResults(prev => ({ ...prev, connection: connectionTest }));
      
      // Just try a simple query
      const { data: healthData, error: healthError } = await supabase.from('_service').select('*').limit(1);
      
      if (healthError) {
        setResults(prev => ({ 
          ...prev, 
          connection: {
            ...prev.connection,
            result: 'Failed',
            error: healthError
          } 
        }));
      } else {
        setResults(prev => ({ 
          ...prev, 
          connection: {
            ...prev.connection,
            result: 'Success',
            data: healthData
          } 
        }));
      }
      
      // Check if quiz_results table exists and permissions
      const tableTest = {
        stage: 'Table Test',
        result: 'Starting...'
      };
      setResults(prev => ({ ...prev, table: tableTest }));
      
      const { data: tableData, error: tableError } = await supabase.from('quiz_results').select('count(*)', { count: 'exact' });
      
      if (tableError) {
        setResults(prev => ({ 
          ...prev, 
          table: {
            ...prev.table,
            result: 'Failed',
            error: tableError
          } 
        }));
      } else {
        setResults(prev => ({ 
          ...prev, 
          table: {
            ...prev.table,
            result: 'Success',
            count: tableData
          } 
        }));
      }
      
      // Direct insertion test
      const insertTest = {
        stage: 'Insert Test',
        result: 'Starting...'
      };
      setResults(prev => ({ ...prev, insert: insertTest }));
      
      // First, get a valid quiz ID
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id')
        .limit(1)
        .single();
        
      if (quizError) {
        setResults(prev => ({ 
          ...prev, 
          insert: {
            ...prev.insert,
            result: 'Failed at quiz query',
            error: quizError
          } 
        }));
      } else {
        // Now try inserting with valid quiz_id
        const testResult = {
          quiz_id: quizData.id,
          user_name: 'Test User',
          score: 5,
          total_questions: 10,
          time_taken: 60,
          completed_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('quiz_results')
          .insert(testResult)
          .select('id')
          .single();
          
        if (insertError) {
          setResults(prev => ({ 
            ...prev, 
            insert: {
              ...prev.insert,
              result: 'Failed at insert',
              error: insertError,
              requestData: testResult
            } 
          }));
        } else {
          setResults(prev => ({ 
            ...prev, 
            insert: {
              ...prev.insert,
              result: 'Success',
              insertedId: insertData.id,
              requestData: testResult
            } 
          }));
          
          // Try to delete the test record
          const { error: deleteError } = await supabase
            .from('quiz_results')
            .delete()
            .eq('id', insertData.id);
            
          if (deleteError) {
            setResults(prev => ({ 
              ...prev, 
              delete: {
                result: 'Failed',
                error: deleteError
              } 
            }));
          } else {
            setResults(prev => ({ 
              ...prev, 
              delete: {
                result: 'Success',
                message: 'Test record deleted successfully'
              } 
            }));
          }
        }
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        unexpectedError: {
          message: 'Unexpected error during test',
          error: error instanceof Error ? error.message : String(error),
          fullError: JSON.stringify(error, null, 2)
        } 
      }));
    } finally {
      setLoading(false);
    }
  };

  const testQuizResultsOnly = async () => {
    setTestingQuizResults(true);
    setQuizResultsTestResults(null);
    
    try {
      const testResults = await testQuizResultsTable();
      setQuizResultsTestResults(testResults);
      console.log('Quiz results table test results:', testResults);
    } catch (error) {
      console.error('Error testing quiz results table:', error);
      setQuizResultsTestResults({
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setTestingQuizResults(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Direct Supabase Check</h1>
      
      <div className="flex gap-4 mb-8">
        <button
          onClick={runBasicTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-300"
        >
          {loading ? 'Testing...' : 'Run Basic Test'}
        </button>
        
        <button
          onClick={testQuizResultsOnly}
          disabled={testingQuizResults}
          className="px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-green-300"
        >
          {testingQuizResults ? 'Testing...' : 'Test Quiz Results Table Only'}
        </button>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Basic Test Results</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto whitespace-pre-wrap text-sm">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
      
      {quizResultsTestResults && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quiz Results Table Test</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto whitespace-pre-wrap text-sm">
            {JSON.stringify(quizResultsTestResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 