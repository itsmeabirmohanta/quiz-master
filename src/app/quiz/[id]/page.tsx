'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { quizService } from '@/utils/supabase';
import { Quiz, QuizState } from '@/types/quiz';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useClientOnly } from '@/utils/hooks';

export default function TakeQuizPage({ params }: { params: { id: string } }) {
  // Get the quiz ID directly from params
  const quizId = params.id;
  
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    startTime: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [userName, setUserName] = useState('');
  const [nameError, setNameError] = useState('');
  
  // Use this to ensure client-side only rendering for dates
  const [isClientSide, currentTime, setCurrentTime] = useClientOnly<string>('');

  // Load the quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        const quizData = await quizService.getQuizById(quizId);
        setQuiz(quizData);
        if (quizData.timeLimit) {
          setTimeLeft(quizData.timeLimit * 60); // Convert minutes to seconds
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError('Failed to load quiz. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  // Set formatted time when component is mounted on client
  useEffect(() => {
    if (isClientSide) {
      const now = new Date();
      const formattedDateTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      setCurrentTime(formattedDateTime);
    }
  }, [isClientSide, setCurrentTime]);

  // Timer for quiz - now accounts for pausing
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0 || isPaused || showStartScreen) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev > 0) {
          return prev - 1;
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isPaused, showStartScreen]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0) {
      handleFinishQuiz();
    }
  }, [timeLeft]);

  const handleStartQuiz = () => {
    if (!userName.trim()) {
      setNameError('Please enter your name to start the quiz');
      return;
    }
    
    setNameError('');
    setShowStartScreen(false);
    // Reset the start time when actually starting the quiz
    setQuizState((prev) => ({
      ...prev,
      startTime: Date.now(),
    }));
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (isPaused) return; // Don't allow answer selection while paused
    
    setQuizState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answerIndex,
      },
    }));
  };

  const handleNextQuestion = () => {
    if (!quiz || isPaused) return;
    
    if (quizState.currentQuestionIndex < quiz.questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0 && !isPaused) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  };

  const handleFinishQuiz = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const endTime = Date.now();
      setQuizState((prev) => ({
        ...prev,
        endTime,
      }));
      
      // In a production app, we would save results to the database
      if (quiz) {
        const score = calculateScore();
        const timeTaken = Math.floor((endTime - quizState.startTime) / 1000);
        const completedAt = new Date().toISOString();
        
        console.log('Preparing to save quiz result:', {
          quizId: quiz.id,
          score,
          totalQuestions: quiz.questions.length,
          timeTaken,
          userName,
          hasAnswers: Object.keys(quizState.answers).length > 0
        });
        
        try {
          const resultId = await quizService.saveQuizResult({
            quizId: quiz.id,
            score,
            totalQuestions: quiz.questions.length,
            timeTaken,
            completedAt,
            userName, // Save user name with the result
            answers: Object.entries(quizState.answers).map(([questionId, selectedAnswer]) => ({
              questionId,
              selectedAnswer
            }))
          });
          
          console.log('Quiz result saving completed, result ID:', resultId);
        } catch (error) {
          console.error('Error saving quiz results (detailed):', error);
          // Continue showing results even if saving fails
        }
      }
      
      setShowResults(true);
      
      // If score is good, show confetti
      const score = calculateScore();
      if (quiz && (score / quiz.questions.length) >= 0.7) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    if (!quiz) return 0;

    let score = 0;
    quiz.questions.forEach((question) => {
      if (quizState.answers[question.id] === question.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{error || 'Quiz not found'}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Sorry, we couldn't load this quiz. It may not exist or there was a problem with the server.</p>
            <Link 
              href="/quiz" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Back to Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show the start screen to enter name before beginning quiz
  if (showStartScreen) {
    return (
      <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{quiz.title}</h2>
              <p className="mt-2 text-center text-gray-500 dark:text-gray-400">{quiz.description}</p>
            </div>
            
            <div className="px-6 py-8">
              <div className="mb-8">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quiz Details:</div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {quiz.questions.length} questions
                  </li>
                  {quiz.timeLimit && (
                    <li className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time limit: {quiz.timeLimit} minutes
                    </li>
                  )}
                  {quiz.category && (
                    <li className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Category: {quiz.category}
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="mb-8">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your name to start the quiz
                </label>
                <input
                  type="text"
                  id="username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Your name"
                />
                {nameError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{nameError}</p>
                )}
              </div>
              
              <div className="flex justify-between">
                <Link
                  href="/quiz"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </Link>
                <button
                  onClick={handleStartQuiz}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Start Quiz
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    const timeTaken = quizState.endTime ? Math.floor((quizState.endTime - quizState.startTime) / 1000) : 0;
    
    // Determine result message based on score
    let resultMessage = '';
    let resultColor = '';
    
    if (percentage >= 90) {
      resultMessage = "Excellent! You're a master of this subject!";
      resultColor = 'text-green-500 dark:text-green-400';
    } else if (percentage >= 70) {
      resultMessage = 'Great job! You know your stuff!';
      resultColor = 'text-green-500 dark:text-green-400';
    } else if (percentage >= 50) {
      resultMessage = 'Good effort! Keep practicing to improve.';
      resultColor = 'text-yellow-500 dark:text-yellow-400';
    } else {
      resultMessage = "Keep studying! You'll get there.";
      resultColor = 'text-red-500 dark:text-red-400';
    }

    return (
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Quiz Results</h2>
              <p className="mt-1 text-center text-lg text-gray-500 dark:text-gray-400">{quiz.title}</p>
              <p className="mt-1 text-center text-md text-gray-600 dark:text-gray-400">Taken by: {userName}</p>
            </div>
            
            <div className="px-6 py-8">
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <svg className="w-32 h-32" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="2" />
                    <circle 
                      cx="18" cy="18" r="16" fill="none" 
                      className="stroke-blue-500 dark:stroke-blue-400" 
                      strokeWidth="2"
                      strokeDasharray="100"
                      strokeDashoffset={100 - percentage}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
                  </div>
                </div>
                
                <p className={`text-xl font-medium mt-4 ${resultColor}`}>
                  {resultMessage}
                </p>
                
                <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {score} correct out of {totalQuestions}
                  </p>
                  
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time: {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                  </p>
                  
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {isClientSide ? currentTime : 'Loading date...'}
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-10 mb-6">Question Summary</h3>
              <div className="space-y-5">
                {quiz.questions.map((question, index) => {
                  const userAnswer = quizState.answers[question.id];
                  const isCorrect = userAnswer === question.correctAnswer;
                  const isAnswered = userAnswer !== undefined;

                  return (
                    <div 
                      key={question.id} 
                      className={`p-5 rounded-lg ${
                        isAnswered
                          ? isCorrect 
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      }`}
                    >
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Question {index + 1}
                        </h4>
                        {isAnswered ? (
                          <span className={`text-sm font-medium ${
                            isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            Not answered
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-gray-800 dark:text-gray-200 font-medium">{question.text}</p>
                      
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={`flex items-center p-2 rounded ${
                              userAnswer === optionIndex
                                ? isCorrect
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : 'bg-red-100 dark:bg-red-900/30'
                                : ''
                            }`}
                          >
                            <div className={`flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full border ${
                              userAnswer === optionIndex
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-red-500 bg-red-500 text-white'
                                : 'border-gray-300 dark:border-gray-700'
                            }`}>
                              {userAnswer === optionIndex && isCorrect && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {userAnswer === optionIndex && !isCorrect && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                              {option}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-between">
              <div className="flex space-x-4">
                <Link
                  href="/quiz"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Quizzes
                </Link>
                
                <Link
                  href="/history"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View History
                </Link>
              </div>
              
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Home
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[quizState.currentQuestionIndex];
  const isLastQuestion = quizState.currentQuestionIndex === quiz.questions.length - 1;
  const selectedAnswer = quizState.answers[currentQuestion.id];
  const questionProgress = ((quizState.currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{quiz.title}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Question {quizState.currentQuestionIndex + 1} of {quiz.questions.length}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  User: {userName}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-3">
                <button
                  onClick={handlePauseToggle}
                  className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
                    isPaused 
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pause
                    </>
                  )}
                </button>
                
                {timeLeft !== null && (
                  <div className={`px-4 py-2 rounded-full ${
                    timeLeft < 60 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                      : timeLeft < 180
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${questionProgress}%` }}
              ></div>
            </div>
            
            {isPaused && (
              <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-yellow-800 dark:text-yellow-300 text-center">
                  Quiz is paused. Press Resume to continue.
                </p>
              </div>
            )}
          </div>
          
          <div className={`px-6 py-8 border-t border-gray-200 dark:border-gray-700 ${isPaused ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {currentQuestion.text}
            </h3>
            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="relative">
                  <input
                    id={`option-${index}`}
                    name="quiz-option"
                    type="radio"
                    checked={selectedAnswer === index}
                    onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                    className="sr-only"
                    disabled={isPaused}
                  />
                  <label
                    htmlFor={`option-${index}`}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedAnswer === index
                        ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${isPaused ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full border ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {selectedAnswer === index ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                      )}
                    </span>
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      {option}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-between">
            <div className="flex space-x-4">
              <button
                onClick={handlePrevQuestion}
                disabled={quizState.currentQuestionIndex === 0 || isPaused}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  quizState.currentQuestionIndex === 0 || isPaused
                    ? 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <button
                onClick={handleFinishQuiz}
                disabled={isSubmitting || isPaused}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                  isSubmitting || isPaused 
                  ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                  : 'text-white bg-red-600 hover:bg-red-700'
                } transition-colors`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
            
            {isLastQuestion ? (
              <button
                onClick={handleFinishQuiz}
                disabled={isSubmitting || isPaused}
                className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                  isSubmitting || isPaused 
                  ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                  : 'text-white bg-green-600 hover:bg-green-700'
                } transition-colors`}
              >
                {isSubmitting ? 'Submitting...' : 'Finish Quiz'}
                {!isSubmitting && !isPaused && (
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                disabled={isPaused}
                className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                  isPaused
                    ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                Next
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 