'use client';

import { useState } from 'react';
import { quizService } from '@/utils/supabase';
import Link from 'next/link';

export default function TestDatabasePage() {
  const [quizId, setQuizId] = useState('');
  const [userName, setUserName] = useState('Test User');
  const [score, setScore] = useState(5);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [status, setStatus] = useState<{ success?: boolean; message?: string; error?: any }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleTestSave = async () => {
    if (!quizId) {
      setStatus({ success: false, message: 'Please enter a valid Quiz ID' });
      return;
    }

    setIsLoading(true);
    setStatus({});

    try {
      console.log('Attempting to save test quiz result with data:', {
        quizId,
        userName,
        score,
        totalQuestions
      });

      const resultId = await quizService.saveQuizResult({
        quizId,
        score: Number(score),
        totalQuestions: Number(totalQuestions),
        timeTaken: 300, // 5 minutes
        completedAt: new Date().toISOString(),
        userName,
        answers: [{ questionId: 'test-question', selectedAnswer: 0 }]
      });

      setStatus({
        success: true,
        message: `Successfully saved quiz result with ID: ${resultId}`
      });
    } catch (error) {
      console.error('Error saving test quiz result:', error);
      setStatus({
        success: false,
        message: 'Failed to save quiz result',
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetRandomQuizId = async () => {
    setIsLoading(true);
    try {
      const quizzes = await quizService.getAllQuizzes();
      if (quizzes && quizzes.length > 0) {
        const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];
        setQuizId(randomQuiz.id);
        setStatus({
          success: true,
          message: `Retrieved random quiz ID: ${randomQuiz.id} (${randomQuiz.title})`
        });
      } else {
        setStatus({
          success: false,
          message: 'No quizzes found in the database'
        });
      }
    } catch (error) {
      console.error('Error getting random quiz ID:', error);
      setStatus({
        success: false,
        message: 'Failed to get random quiz ID',
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Database Connection</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-4">Test Saving Quiz Results</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quiz ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Enter quiz ID"
              />
              <button
                onClick={handleGetRandomQuizId}
                disabled={isLoading}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm"
              >
                Get Random
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Questions
              </label>
              <input
                type="number"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={handleTestSave}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {isLoading ? 'Saving...' : 'Test Save Quiz Result'}
          </button>
        </div>
        
        {status.message && (
          <div className={`mt-4 p-3 rounded-md ${status.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="text-sm">{status.message}</p>
            {status.error && (
              <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(status.error, null, 2)}
              </pre>
            )}
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <Link href="/history" className="text-blue-600 hover:text-blue-800 text-sm">
              Back to Quiz History
            </Link>
            <Link href="/test-db/direct-check" className="text-green-600 hover:text-green-800 text-sm">
              Run Direct Supabase Check
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 