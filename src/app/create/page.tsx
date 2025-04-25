'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, QuizQuestion } from '@/types/quiz';
import { quizService } from '@/utils/supabase';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [questions, setQuestions] = useState<Partial<QuizQuestion>[]>([
    {
      id: `q${Date.now()}`,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    },
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [bulkText, setBulkText] = useState('');
  const [parsingMethod, setParsingMethod] = useState<'manual' | 'automatic'>('manual');
  const [showParsingPreview, setShowParsingPreview] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    questions?: string;
    bulkText?: string;
  }>({});

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q${Date.now()}`,
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = [...questions];
      updatedQuestions.splice(index, 1);
      setQuestions(updatedQuestions);
    }
  };

  const handleQuestionChange = (index: number, field: string, value: string | number) => {
    const updatedQuestions = [...questions];
    if (field === 'text') {
      updatedQuestions[index].text = value as string;
    } else if (field === 'correctAnswer') {
      updatedQuestions[index].correctAnswer = value as number;
    }
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (!updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = ['', '', '', ''];
    }
    updatedQuestions[questionIndex].options![optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const parseQuestionsFromText = () => {
    setParsingError(null);
    if (!bulkText.trim()) {
      setParsingError('Please enter some text to parse');
      return;
    }

    try {
      // Split by double line breaks to separate questions - improved to handle various spacing patterns
      const questionBlocks = bulkText.split(/\n\s*\n+/).filter(block => block.trim().length > 0);
      const parsedQuestions: Partial<QuizQuestion>[] = [];

      questionBlocks.forEach((block, index) => {
        const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length < 5) { // Need at least a question and 4 options
          throw new Error(`Question block ${index + 1} does not have enough lines for a question and 4 options`);
        }

        // First line is the question
        const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim(); // Remove leading numbers and trim
        
        // Next 4 lines are options
        const options = lines.slice(1, 5).map(line => {
          // Remove option markers like A., a), 1., etc. and trim excess whitespace
          return line.replace(/^[A-Da-d0-9][\.\)]\s*/, '').trim();
        });

        // Determine correct answer - by default, first option
        let correctAnswer = 0;
        for (let i = 0; i < options.length; i++) {
          // Look for markers that might indicate correct answer
          if (options[i].includes('(correct)') || options[i].includes('*') || options[i].endsWith('✓')) {
            correctAnswer = i;
            // Remove the marker from the option text
            options[i] = options[i].replace(/\(correct\)|\*|✓/g, '').trim();
            break;
          }
        }

        parsedQuestions.push({
          id: `q${Date.now()}-${index}`,
          text: questionText,
          options,
          correctAnswer,
        });
      });

      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions could be parsed from the text');
      }

      setQuestions(parsedQuestions);
      setShowParsingPreview(true);
    } catch (error) {
      if (error instanceof Error) {
        setParsingError(error.message);
      } else {
        setParsingError('Failed to parse questions. Please check the format and try again.');
      }
      console.error('Parsing error:', error);
    }
  };

  const validateStep1 = () => {
    const newErrors: {
      title?: string;
      description?: string;
      bulkText?: string;
    } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (parsingMethod === 'automatic' && !bulkText.trim() && !showParsingPreview) {
      newErrors.bulkText = 'Please enter some text to parse or switch to manual entry';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: {
      questions?: string;
    } = {};

    // Check if all questions have text and options
    const invalidQuestions = questions.some(
      (q) => 
        !q.text?.trim() || 
        !q.options?.every(option => option.trim()) ||
        q.options?.length !== 4
    );

    if (invalidQuestions) {
      newErrors.questions = 'All questions must have text and four non-empty options';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (parsingMethod === 'automatic' && !showParsingPreview && bulkText.trim()) {
        parseQuestionsFromText();
      }
      
      if (validateStep1()) {
        if (parsingMethod === 'automatic' && questions.length > 0) {
          setCurrentStep(2);
        } else if (parsingMethod === 'manual') {
          setCurrentStep(2);
        }
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        await handleCreateQuiz();
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      setIsSubmitting(true);
      
      // Prepare quiz data for Supabase
      const newQuiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        description,
        questions: questions as QuizQuestion[],
        category: category || undefined,
        timeLimit: timeLimit || undefined,
      };

      console.log('Attempting to create quiz with data:', JSON.stringify({
        ...newQuiz,
        questions: newQuiz.questions.length // Just log the count to avoid huge logs
      }));

      // Attempt to save to Supabase with retry logic
      let quizId: string | null = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (!quizId && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} to create quiz...`);
        
        try {
          quizId = await quizService.createQuiz(newQuiz);
        } catch (error) {
          console.error(`Error on attempt ${attempts}:`, error);
          if (attempts >= maxAttempts) throw error;
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!quizId) {
        throw new Error('Failed to create quiz after multiple attempts');
      }
      
      // Show success message
      toast.success('Quiz created successfully!');
      
      // Redirect to the quiz page
      router.push(`/quiz/${quizId}`);
    } catch (error) {
      console.error('Error creating quiz:', error);
      // Show more detailed error message if available
      if (error instanceof Error) {
        toast.error(`Failed to create quiz: ${error.message}`);
      } else {
        toast.error('Failed to create quiz. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParsingMethodChange = (method: 'manual' | 'automatic') => {
    setParsingMethod(method);
    if (method === 'manual' && questions.length === 0) {
      // Initialize with one empty question if switching to manual mode
      setQuestions([
        {
          id: `q${Date.now()}`,
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
        },
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFF'
            }
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFF'
            }
          }
        }}
      />
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create a New Quiz</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Share your knowledge with the world by creating an interactive quiz.
        </p>
      </div>

      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            } text-lg font-semibold shadow-md transition-all duration-200`}>
              1
            </div>
            <div className={`h-1 w-24 sm:w-32 transition-all duration-300 ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}></div>
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            } text-lg font-semibold shadow-md transition-all duration-200`}>
              2
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center mt-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 w-32 text-center font-medium">Quiz Details</div>
          <div className="w-24 sm:w-32"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400 w-32 text-center font-medium">Questions</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden">
        {currentStep === 1 && (
          <div className="px-6 py-8">
            <div className="space-y-8">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quiz Title*
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`block w-full px-4 py-3 rounded-lg border ${
                    errors.title 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  } shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base transition-colors duration-200`}
                  placeholder="e.g., Science Quiz: Solar System"
                />
                {errors.title && <p className="mt-2 text-sm text-red-500">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description*
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`block w-full px-4 py-3 rounded-lg border ${
                    errors.description 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  } shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base transition-colors duration-200`}
                  placeholder="A comprehensive quiz about our solar system, covering planets, moons, and other celestial bodies."
                />
                {errors.description && <p className="mt-2 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base transition-colors duration-200"
                  >
                    <option value="">Select a category</option>
                    <option value="General Knowledge">General Knowledge</option>
                    <option value="Science">Science</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Sports">Sports</option>
                    <option value="Technology">Technology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Language">Language</option>
                    <option value="Art">Art</option>
                    <option value="Music">Music</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="timeLimit"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 0))}
                      min="1"
                      max="120"
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base transition-colors duration-200"
                    />
                    <div className="ml-2 text-gray-500 dark:text-gray-400">min</div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Set to 0 for no time limit</p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Question Entry Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    parsingMethod === 'automatic' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`} onClick={() => handleParsingMethodChange('automatic')}>
                    <div className="flex items-start">
                      <input
                        id="automatic-parsing"
                        name="parsing-method"
                        type="radio"
                        checked={parsingMethod === 'automatic'}
                        onChange={() => handleParsingMethodChange('automatic')}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 mt-1"
                      />
                      <div className="ml-3">
                        <label htmlFor="automatic-parsing" className="block font-medium text-gray-900 dark:text-white">
                          AI-Assisted
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Paste text with questions and options and we'll automatically extract them.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    parsingMethod === 'manual' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`} onClick={() => handleParsingMethodChange('manual')}>
                    <div className="flex items-start">
                      <input
                        id="manual-entry"
                        name="parsing-method"
                        type="radio"
                        checked={parsingMethod === 'manual'}
                        onChange={() => handleParsingMethodChange('manual')}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 mt-1"
                      />
                      <div className="ml-3">
                        <label htmlFor="manual-entry" className="block font-medium text-gray-900 dark:text-white">
                          Manual Entry
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Build each question and set of answers one by one with full control.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="px-6 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quiz Questions</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Review and edit your questions. Each question must have 4 options with one correct answer.
              </p>
              {errors.questions && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-300">
                  <div className="flex">
                    <svg className="h-5 w-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.questions}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div 
                  key={question.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mr-3">
                        {qIndex + 1}
                      </span>
                      Question {qIndex + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      disabled={questions.length === 1}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm ${
                        questions.length === 1 
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>

                  <div className="mb-5">
                    <label 
                      htmlFor={`question-${qIndex}`} 
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Question Text*
                    </label>
                    <input
                      type="text"
                      id={`question-${qIndex}`}
                      value={question.text || ''}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base transition-colors duration-200"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Answer Options* (select the correct answer)
                    </label>
                    
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((optionIndex) => (
                        <div key={optionIndex} className="flex items-center">
                          <div className="flex-shrink-0">
                            <input
                              type="radio"
                              id={`correct-${qIndex}-${optionIndex}`}
                              name={`correct-${qIndex}`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optionIndex)}
                              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700"
                            />
                          </div>
                          <div className="ml-3 flex-grow">
                            <div className="flex items-center">
                              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium mr-3 border border-gray-300 dark:border-gray-600">
                                {String.fromCharCode(65 + optionIndex)}
                              </div>
                              <input
                                type="text"
                                value={question.options?.[optionIndex] || ''}
                                onChange={(e) => handleOptionChange(qIndex, optionIndex, e.target.value)}
                                className={`block w-full rounded-md border ${
                                  question.correctAnswer === optionIndex
                                    ? 'border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                                } shadow-sm px-4 py-2 focus:ring-4 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-sm transition-colors duration-200`}
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full justify-center transition-colors duration-200"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Another Question
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-5 sm:px-6 flex justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/quiz')}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleNextStep}
            disabled={isSubmitting}
            className={`inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
              currentStep < 2 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
              isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {currentStep < 2 ? 'Processing...' : 'Creating Quiz...'}
              </>
            ) : (
              <>
                {currentStep < 2 ? 'Next' : 'Create Quiz'} 
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {currentStep < 2 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  )}
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {parsingMethod === 'automatic' && (
        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Format Instructions
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Enter your questions and options in the following format:
            </p>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-auto">
              <div className="text-gray-800 dark:text-gray-200">What is the capital of France?</div>
              <div className="text-gray-600 dark:text-gray-400">A. London</div>
              <div className="text-gray-600 dark:text-gray-400">B. Berlin</div>
              <div className="text-green-600 dark:text-green-400">C. Paris*</div>
              <div className="text-gray-600 dark:text-gray-400">D. Madrid</div>
              <div className="text-gray-400 dark:text-gray-500 my-2">(blank line)</div>
              <div className="text-gray-800 dark:text-gray-200">Which planet is closest to the sun?</div>
              <div className="text-gray-600 dark:text-gray-400">1. Venus</div>
              <div className="text-green-600 dark:text-green-400">2. Mercury✓</div>
              <div className="text-gray-600 dark:text-gray-400">3. Earth</div>
              <div className="text-gray-600 dark:text-gray-400">4. Mars</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Mark the correct answer with *, (correct), or ✓. Separate questions with blank lines.
            </p>
          </div>

          <div>
            <label htmlFor="bulkText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste Your Questions and Options*
            </label>
            <textarea
              id="bulkText"
              value={bulkText}
              onChange={(e) => {
                setBulkText(e.target.value);
                setShowParsingPreview(false);
              }}
              rows={10}
              className={`block w-full px-4 py-3 rounded-lg border ${
                errors.bulkText || parsingError
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-opacity-20 dark:bg-gray-700 dark:text-white text-base font-mono transition-colors duration-200`}
              placeholder="Paste your questions and options here..."
              style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}
            />
            {errors.bulkText && <p className="mt-2 text-sm text-red-500">{errors.bulkText}</p>}
            {parsingError && <p className="mt-2 text-sm text-red-500">{parsingError}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={parseQuestionsFromText}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Parse Questions
            </button>
          </div>
          
          {showParsingPreview && questions.length > 0 && (
            <div className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mt-4">
              <div className="flex items-center mb-3">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  Successfully parsed {questions.length} question{questions.length !== 1 ? 's' : ''}
                </h4>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  {questions.map((q, index) => (
                    <li key={q.id} className="border-b border-green-200 dark:border-green-800 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium">Q{index + 1}:</span> {q.text}
                      <div className="pl-5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {q.options?.map((option, oIndex) => (
                          <div key={oIndex} className={oIndex === q.correctAnswer ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                            {String.fromCharCode(65 + oIndex)}. {option}
                            {oIndex === q.correctAnswer && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 