'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { quizService } from '@/utils/supabase';
import { useClientOnly } from '@/utils/hooks';
import { testSupabaseConnection } from '@/utils/testSupabase';

type QuizHistoryItem = {
  id: string;
  quizId: string;
  quizTitle: string;
  userName: string;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
  category?: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, formattedDates, setFormattedDates] = useClientOnly<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await quizService.getQuizHistory();
        setHistory(data);
        
        // Only format dates on the client side
        if (isClient) {
          const dateFormatter = new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const formattedDateMap: Record<string, string> = {};
          data.forEach(item => {
            formattedDateMap[item.id] = dateFormatter.format(new Date(item.completedAt));
          });
          
          setFormattedDates(formattedDateMap);
        }
      } catch (err) {
        console.error('Error fetching quiz history:', err);
        setError('Failed to load quiz history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isClient, setFormattedDates]);

  // Get unique users and categories for filtering
  const uniqueUsers = Array.from(new Set(history.map(item => item.userName))).sort();
  const uniqueCategories = Array.from(
    new Set(history.filter(item => item.category).map(item => item.category))
  ).sort();

  // Filter history based on selected filters
  const filteredHistory = history.filter(item => {
    const matchesUser = !selectedUser || item.userName === selectedUser;
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      item.quizTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesUser && matchesCategory && matchesSearch;
  });

  // Format time taken (in seconds) for display
  const formatTimeTaken = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Add function to test Supabase connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
      console.log('Connection test result:', result);
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ error: String(error) });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Quiz History
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            View all past quiz attempts and results
          </p>
          
          {/* Add debug button for admins/developers */}
          <div className="mt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
            >
              {isTestingConnection ? 'Testing...' : 'Test Supabase Connection'}
            </button>
          </div>
          
          {/* Show test results if available */}
          {testResult && (
            <div className="mt-2 text-xs text-left mx-auto max-w-lg p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by quiz title or user"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Filter by User
                  </label>
                  <select
                    id="user-filter"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Users</option>
                    {uniqueUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Filter by Category
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category as string} value={category as string}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded shadow-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No quiz history found matching your criteria. Try adjusting your filters or take a quiz to create history!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quiz
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time Taken
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredHistory.map((item) => {
                      const percentage = Math.round((item.score / item.totalQuestions) * 100);
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{item.quizTitle}</td>
                          <td className="py-3 px-4">{item.userName || 'Anonymous'}</td>
                          <td className="py-3 px-4">{item.category || 'General'}</td>
                          <td className="py-3 px-4">{item.score}/{item.totalQuestions}</td>
                          <td className="py-3 px-4">{formatTimeTaken(item.timeTaken)}</td>
                          <td className="py-3 px-4">
                            {isClient ? formattedDates[item.id] || 'Loading...' : 'Loading date...'}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/quiz/${item.quizId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                              Retake Quiz
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-8 flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredHistory.length} of {history.length} results
              </p>
              <div className="flex space-x-4">
                <Link
                  href="/quiz"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Browse Quizzes
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Home
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
                  </svg>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 