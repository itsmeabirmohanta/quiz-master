import { createClient } from '@supabase/supabase-js';
import { Quiz, QuizQuestion, QuizResult } from '@/types/quiz';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

// Log environment variables to help with debugging
console.log('Supabase URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Create Supabase client using environment variables
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Log when client is initialized to help with debugging
console.log('Supabase client initialized with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Helper function to safely use localStorage (only in browser)
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  }
};

// Enable anonymous quiz creation by adding policies (run this once if needed)
export const enableAnonymousQuizCreation = async () => {
  try {
    console.log('Attempting to create RLS policies for anonymous quiz creation...');
    
    // Create policy for allowing anonymous quiz creation
    const { error: quizPolicyError } = await supabase.rpc('create_anonymous_quiz_policy');
    
    if (quizPolicyError) {
      console.error('Error creating anonymous quiz policy:', quizPolicyError);
      return false;
    }
    
    // Create policy for allowing anonymous question creation
    const { error: questionPolicyError } = await supabase.rpc('create_anonymous_question_policy');
    
    if (questionPolicyError) {
      console.error('Error creating anonymous question policy:', questionPolicyError);
      return false;
    }
    
    console.log('Successfully created anonymous quiz creation policies');
    return true;
  } catch (error) {
    console.error('Error enabling anonymous quiz creation:', error);
    return false;
  }
};

/**
 * Test quiz_results table specifically to diagnose insertion issues
 * This function checks only the quiz_results table for read/write permissions
 */
export const testQuizResultsTable = async () => {
  try {
    console.log('Testing quiz_results table specifically...');
    const results = {
      steps: [] as any[],
      success: false,
      message: '',
    };
    
    // Step 1: Test read access
    results.steps.push({ name: 'Check read access', status: 'running' });
    const { data: readData, error: readError } = await supabase
      .from('quiz_results')
      .select('id, quiz_id')
      .limit(5);
      
    if (readError) {
      results.steps[0].status = 'failed';
      results.steps[0].error = readError;
      results.message = 'Cannot read from quiz_results table';
      return results;
    }
    
    results.steps[0].status = 'success';
    results.steps[0].data = { count: readData.length };
    
    // Step 2: Find a valid quiz ID to use (we need this for foreign key constraint)
    results.steps.push({ name: 'Find valid quiz ID', status: 'running' });
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title')
      .limit(1)
      .single();
      
    if (quizError) {
      results.steps[1].status = 'failed';
      results.steps[1].error = quizError;
      results.message = 'Cannot find a valid quiz ID';
      
      // Try with UUID placeholder - will likely fail due to foreign key
      results.steps[1].status = 'warning';
      results.steps[1].message = 'Using fallback UUID, may fail due to foreign key constraint';
      results.steps[1].fallbackId = '00000000-0000-0000-0000-000000000000';
    } else {
      results.steps[1].status = 'success';
      results.steps[1].data = { quizId: quizData.id, quizTitle: quizData.title };
    }
    
    // Step 3: Try inserting a test record
    results.steps.push({ name: 'Insert test record', status: 'running' });
    const testQuizId = (quizData?.id) || '00000000-0000-0000-0000-000000000000';
    
    const testData = {
      quiz_id: testQuizId,
      user_name: 'Test User',
      score: 5,
      total_questions: 10,
      time_taken: 300,
      completed_at: new Date().toISOString()
    };
    
    // Use the underlying fetch API directly for more detailed error reporting
    try {
      // Get the complete URL and headers for the request
      const url = `${supabase.supabaseUrl}/rest/v1/quiz_results`;
      const headers = {
        'apiKey': supabase.supabaseKey,
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      
      results.steps[2].request = {
        url: url,
        method: 'POST',
        headers: { ...headers, apiKey: '[REDACTED]', Authorization: '[REDACTED]' }, // Don't log actual keys
        body: testData
      };
      
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
      }
      
      if (!response.ok) {
        results.steps[2].status = 'failed';
        results.steps[2].error = {
          status: response.status,
          statusText: response.statusText,
          response: responseData
        };
        results.message = `Failed to insert record. HTTP ${response.status}: ${response.statusText}`;
        
        // Try to provide more helpful messages for common errors
        if (response.status === 403) {
          results.message += '. This appears to be a permissions issue. Check RLS policies.';
        }
        if (response.status === 400 || response.status === 422) {
          results.message += '. This appears to be a validation or constraint issue.';
        }
        if (response.status === 404) {
          results.message += '. The quiz_results table might not exist.';
        }
        
        return results;
      }
      
      results.steps[2].status = 'success';
      results.steps[2].data = responseData;
      
      // Step 4: Clean up by deleting the test record
      if (responseData && responseData[0] && responseData[0].id) {
        results.steps.push({ name: 'Delete test record', status: 'running' });
        const testRecordId = responseData[0].id;
        
        const { error: deleteError } = await supabase
          .from('quiz_results')
          .delete()
          .eq('id', testRecordId);
          
        if (deleteError) {
          results.steps[3].status = 'warning'; // Just a warning since the test record was created
          results.steps[3].error = deleteError;
        } else {
          results.steps[3].status = 'success';
          results.steps[3].message = 'Test record deleted successfully';
        }
      }
      
      results.success = true;
      results.message = 'Successfully tested quiz_results table. All operations working.';
      
    } catch (fetchError) {
      results.steps[2].status = 'failed';
      results.steps[2].error = {
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      };
      results.message = 'Unexpected error during direct fetch test';
    }
    
    return results;
    
  } catch (error) {
    console.error('Error testing quiz_results table:', error);
    return {
      success: false,
      message: 'Unexpected error during test',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
  }
};

// Quiz-related functions
export const quizService = {
  // Get all quizzes
  getAllQuizzes: async () => {
    try {
      console.log('Getting all quizzes');
      
      // Get quizzes from Supabase
      let supabaseQuizzes: any[] = [];
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        supabaseQuizzes = data || [];
      } catch (supabaseError) {
        console.warn('Error fetching quizzes from Supabase:', supabaseError);
      }
      
      // Get quizzes from local storage
      let localQuizzes: Quiz[] = [];
      try {
        const savedQuizzes = safeLocalStorage.getItem('localQuizzes');
        if (savedQuizzes) {
          localQuizzes = JSON.parse(savedQuizzes);
        }
      } catch (localStorageError) {
        console.error('Error reading from localStorage:', localStorageError);
      }
      
      // Format Supabase quizzes to match Quiz type
      const formattedSupabaseQuizzes = supabaseQuizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questions: [], // Questions will be loaded when viewing a specific quiz
        createdAt: quiz.created_at,
        updatedAt: quiz.updated_at,
        category: quiz.category,
        timeLimit: quiz.time_limit
      }));
      
      // Combine both sources and return
      return [...formattedSupabaseQuizzes, ...localQuizzes];
    } catch (error) {
      console.error('Error in getAllQuizzes:', error);
      return [];
    }
  },

  // Get quizzes by category
  getQuizzesByCategory: async (category: string) => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get quizzes by author
  getQuizzesByAuthor: async (authorId: string) => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get quiz by ID with questions
  getQuizById: async (id: string) => {
    try {
      console.log('Getting quiz by ID:', id);
      
      // First try to get from Supabase
      try {
        // Use our custom function to get the quiz with its questions in one call
        const { data, error } = await supabase
          .rpc('get_quiz_with_questions', { quiz_id: id });
        
        if (error) throw error;
        if (!data) throw new Error('Quiz not found in database');
        
        // Format the data to match our Quiz type
        const formattedQuestions: QuizQuestion[] = (data.questions || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer
        }));
        
        return {
          id: data.id,
          title: data.title,
          description: data.description,
          questions: formattedQuestions,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          category: data.category,
          timeLimit: data.time_limit,
          author: data.author_id
        } as Quiz;
      } catch (supabaseError) {
        console.warn('Error getting quiz from Supabase, checking local storage:', supabaseError);
        
        // If not found in Supabase, try local storage
        try {
          const savedQuizzes = safeLocalStorage.getItem('localQuizzes');
          if (savedQuizzes) {
            const localQuizzes: Quiz[] = JSON.parse(savedQuizzes);
            const localQuiz = localQuizzes.find(q => q.id === id);
            
            if (localQuiz) {
              console.log('Found quiz in local storage:', localQuiz.title);
              return localQuiz;
            }
          }
        } catch (localStorageError) {
          console.error('Error accessing local storage:', localStorageError);
        }
        
        // If not found in either place, throw error
        throw new Error('Quiz not found');
      }
    } catch (error) {
      console.error('Error in getQuizById:', error);
      throw error;
    }
  },

  // Create a new quiz with questions
  createQuiz: async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Starting quiz creation...');
      
      // Try to create the quiz in Supabase first
      try {
        // Get current user
        const currentUser = supabase.auth.getUser();
        const authorId = (await currentUser).data.user?.id;
        console.log('Author ID (if available):', authorId);
        
        // Ensure category and timeLimit are handled correctly
        const quizData = {
          title: quiz.title,
          description: quiz.description,
          category: quiz.category ? String(quiz.category) : null,
          time_limit: quiz.timeLimit ? Number(quiz.timeLimit) : null,
          author_id: null // Set to null for anonymous users - RLS check bypass
        };
        
        console.log('Inserting quiz with data:', JSON.stringify(quizData));
        
        // Create a new quiz
        const { data: createdQuiz, error: quizError } = await supabase
          .from('quizzes')
          .insert(quizData)
          .select('id')
          .single();
        
        if (quizError) {
          throw quizError;
        }
        
        if (!createdQuiz) {
          throw new Error('Failed to create quiz - no data returned');
        }
        
        console.log('Quiz created successfully with ID:', createdQuiz.id);
        
        // Then create the questions
        const questionsToInsert = quiz.questions.map((q, index) => ({
          quiz_id: createdQuiz.id,
          text: q.text,
          options: q.options,
          correct_answer: q.correctAnswer,
          position: index
        }));
        
        console.log(`Inserting ${questionsToInsert.length} questions...`);
        
        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);
        
        if (questionsError) {
          console.warn('Error creating questions but quiz was created:', questionsError);
          // Still return the quiz ID even if questions failed - we'll handle this gracefully
        } else {
          console.log('Questions created successfully');
        }
        
        return createdQuiz.id;
      } catch (supabaseError) {
        console.warn('Supabase quiz creation failed, using local fallback:', supabaseError);
        
        // If Supabase fails, use local storage as fallback
        const quizId = uuidv4();
        
        // Format the quiz for local storage
        const localQuiz: Quiz = {
          id: quizId,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions as QuizQuestion[],
          category: quiz.category || undefined,
          timeLimit: quiz.timeLimit || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Get existing locally saved quizzes or initialize empty array
        let localQuizzes: Quiz[] = [];
        try {
          const savedQuizzes = safeLocalStorage.getItem('localQuizzes');
          if (savedQuizzes) {
            localQuizzes = JSON.parse(savedQuizzes);
          }
        } catch (e) {
          console.error('Error reading from localStorage:', e);
        }
        
        // Add new quiz to array and save back to local storage
        localQuizzes.push(localQuiz);
        safeLocalStorage.setItem('localQuizzes', JSON.stringify(localQuizzes));
        
        console.log('Quiz saved locally with ID:', quizId);
        return quizId;
      }
    } catch (error) {
      console.error('Error in createQuiz function:', error);
      throw error;
    }
  },

  // Update an existing quiz
  updateQuiz: async (id: string, quiz: Partial<Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>>) => {
    // Update quiz metadata
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        time_limit: quiz.timeLimit
      })
      .eq('id', id);
    
    if (quizError) throw quizError;
    
    // If questions are provided, update them
    if (quiz.questions && quiz.questions.length > 0) {
      // First, delete existing questions
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', id);
      
      if (deleteError) throw deleteError;
      
      // Then insert new questions
      const questionsToInsert = quiz.questions.map((q, index) => ({
        quiz_id: id,
        text: q.text,
        options: q.options,
        correct_answer: q.correctAnswer,
        position: index
      }));
      
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);
      
      if (questionsError) throw questionsError;
    }
    
    return id;
  },

  // Delete a quiz
  deleteQuiz: async (id: string) => {
    // Due to the cascade delete set up in the schema, deleting the quiz will also
    // delete all associated questions and results
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Save quiz results
  saveQuizResult: async (result: { 
    quizId: string; 
    score: number; 
    totalQuestions: number; 
    timeTaken: number; 
    completedAt: string;
    userName?: string;
    answers?: { questionId: string; selectedAnswer: number }[];
  }) => {
    try {
      // Get current user if authenticated
      const currentUser = supabase.auth.getUser();
      const userId = (await currentUser).data.user?.id;
      
      console.log('Saving quiz result to database:', {
        quizId: result.quizId,
        userId: userId,
        userName: result.userName || 'Anonymous',
        score: result.score,
        totalQuestions: result.totalQuestions
      });
      
      // Try to save to Supabase first
      const resultData = {
        quiz_id: result.quizId,
        user_id: userId || null, // Allow anonymous results
        user_name: result.userName || 'Anonymous',
        score: result.score,
        total_questions: result.totalQuestions,
        time_taken: result.timeTaken,
        completed_at: result.completedAt,
        answers: result.answers ? JSON.stringify(result.answers) : null
      };
      
      console.log('Inserting record with data:', JSON.stringify(resultData));
      
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .insert(resultData)
          .select('id')
          .single();
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message || 'No message',
            details: error.details || 'No details',
            hint: error.hint || 'No hint',
            code: error.code || 'No code',
            fullError: JSON.stringify(error)
          });
          throw error;
        }
        
        console.log('Quiz result saved successfully to database with ID:', data?.id);
        return data?.id;
      } catch (supabaseError) {
        // First log the full error object for debugging
        console.error('Full Supabase error object:', supabaseError);
        console.error('Supabase error stringified:', JSON.stringify(supabaseError, null, 2));
        
        // Check if there's a specific foreign key violation
        const errorStr = String(supabaseError);
        if (errorStr.includes('foreign key constraint')) {
          console.error('Foreign key constraint violation. Make sure the quiz_id exists in the database.');
        }
        
        // Re-throw to be caught by the outer catch
        throw supabaseError;
      }
    } catch (error) {
      // Log different properties of the error to help diagnose
      console.error('Detailed error saving to Supabase:', error);
      console.error('Error type:', typeof error);
      console.error('Error string representation:', String(error));
      console.error('Error stringified:', JSON.stringify(error, null, 2));
      
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Fall back to localStorage
      try {
        // Get existing quiz history from localStorage
        const historyData = safeLocalStorage.getItem('quizHistory');
        let quizHistory = historyData ? JSON.parse(historyData) : [];
        
        // Add the new result
        const localResultId = uuidv4();
        quizHistory.push({
          id: localResultId,
          quizId: result.quizId,
          userName: result.userName || 'Anonymous',
          score: result.score,
          totalQuestions: result.totalQuestions,
          timeTaken: result.timeTaken,
          completedAt: result.completedAt,
          answers: result.answers || []
        });
        
        // Save back to localStorage
        safeLocalStorage.setItem('quizHistory', JSON.stringify(quizHistory));
        console.log('Saved to localStorage instead with ID:', localResultId);
        return localResultId;
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
        return null;
      }
    }
  },

  // Get quiz history - retrieves history from Supabase or localStorage
  getQuizHistory: async () => {
    try {
      // Try to get quiz history from Supabase
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes:quiz_id (
            title,
            category
          )
        `)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          quizId: item.quiz_id,
          quizTitle: item.quizzes?.title || 'Unknown Quiz',
          userName: item.user_name || 'Anonymous',
          score: item.score,
          totalQuestions: item.total_questions,
          timeTaken: item.time_taken,
          completedAt: item.completed_at,
          category: item.quizzes?.category
        }));
      }
    } catch (supabaseError) {
      console.warn('Error getting history from Supabase, checking localStorage:', supabaseError);
    }
    
    // Fall back to localStorage
    try {
      const historyData = safeLocalStorage.getItem('quizHistory');
      if (!historyData) return [];
      
      const localHistory = JSON.parse(historyData);
      
      // Enhance local history with quiz titles if possible
      const enhancedHistory = await Promise.all(localHistory.map(async (item: any) => {
        let quizTitle = 'Unknown Quiz';
        let category = null;
        
        try {
          // Try to get quiz info
          const quizData = await quizService.getQuizById(item.quizId);
          if (quizData) {
            quizTitle = quizData.title;
            category = quizData.category;
          }
        } catch (e) {
          // Unable to get quiz info, continue with default values
        }
        
        return {
          ...item,
          quizTitle,
          category
        };
      }));
      
      return enhancedHistory.sort((a: any, b: any) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    } catch (localError) {
      console.error('Error reading from localStorage:', localError);
      return [];
    }
  },

  // Get quiz results for a user
  getUserQuizResults: async (userId: string) => {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        quizzes:quiz_id (
          title,
          category
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get quiz results for a specific quiz
  getQuizResults: async (quizId: string) => {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('quiz_id', quizId)
      .order('score', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// Authentication functions
export const authService = {
  // Sign up
  signUp: async (email: string, password: string, username: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Create profile for the new user
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username,
          avatar_url: null
        });
      
      if (profileError) throw profileError;
    }
    
    return authData;
  },

  // Sign in
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  },

  // Get current user
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!userData.user) return null;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) throw profileError;
    return profileData;
  },

  // Update user profile
  updateProfile: async (profile: { username?: string; avatarUrl?: string }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!userData.user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        avatar_url: profile.avatarUrl
      })
      .eq('id', userData.user.id);
    
    if (error) throw error;
    return true;
  }
};

export default supabase; 