import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold mb-6 text-blue-600 dark:text-blue-400">
          Quiz Master
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Challenge yourself with interactive quizzes or create your own to share with others.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <Link 
            href="/quiz" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-300 flex flex-col items-center"
          >
            <span className="text-xl mb-2">Take a Quiz</span>
            <span className="text-sm opacity-80">Test your knowledge</span>
          </Link>
          
          <Link 
            href="/create" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-300 flex flex-col items-center"
          >
            <span className="text-xl mb-2">Create a Quiz</span>
            <span className="text-sm opacity-80">Share with others</span>
          </Link>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Create</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Build custom quizzes with multiple-choice questions and instant scoring.
              </p>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Share</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Share your quizzes with friends, students, or colleagues with a simple link.
              </p>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Learn</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get instant feedback and track your progress as you learn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
