export type QuizQuestion = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
  author?: string;
  category?: string;
  timeLimit?: number; // In minutes
};

export type QuizResult = {
  quizId: string;
  score: number;
  totalQuestions: number;
  timeTaken: number; // In seconds
  completedAt: string;
  answers: { questionId: string; selectedAnswer: number }[];
};

export type QuizState = {
  currentQuestionIndex: number;
  answers: { [questionId: string]: number };
  startTime: number;
  endTime?: number;
}; 