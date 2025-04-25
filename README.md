# Quiz Master

A modern quiz application built with Next.js and TypeScript. Create, share, and take quizzes on various topics with a beautiful UI.

## Features

- **Take Quizzes**: Answer multiple-choice questions with timed limits
- **Create Quizzes**: Build your own custom quizzes with a user-friendly interface
- **Instant Scoring**: Get immediate feedback on your quiz performance
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: Comfortable viewing in any lighting condition
- **User Authentication**: Create an account, save your quizzes, and track your progress
- **Leaderboards**: See how your scores compare with others

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.io/)
- **State Management**: React hooks

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account (free tier works great)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/quiz-master.git
cd quiz-master
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase URL and anon key

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Supabase Setup

This application uses Supabase for database, authentication, and storage. Follow these steps to set it up:

1. **Create a Supabase project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key from the API settings

2. **Set up the database schema**
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL script from `supabase/schema.sql` in this repository
   - This will create all necessary tables, functions, and policies

3. **Configure authentication**
   - In your Supabase dashboard, go to Authentication → Settings
   - Set up any additional auth providers you want to use (Google, GitHub, etc.)
   - Update your site URL in the "Site URL" field (use http://localhost:3000 for development)

4. **Update environment variables**
   - Copy your Supabase URL and anon key to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Enable Row Level Security (RLS)**
   - This is set up automatically by the schema SQL script
   - It ensures users can only access their own data

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── create/           # Quiz creation page
│   ├── quiz/             # Quiz listing and taking pages
│   ├── layout.tsx        # Main layout component
│   └── page.tsx          # Homepage
├── components/           # Reusable UI components
├── data/                 # Sample quiz data
├── types/                # TypeScript type definitions
├── utils/                # Utility functions including Supabase client
└── supabase/             # Supabase schema and migration scripts
```

## Development

### Adding New Quizzes

In a production environment, you would use the quiz creation interface which saves to Supabase. For local development without Supabase, you can add more sample quizzes by editing the `src/data/sampleQuizzes.ts` file.

### Extending Functionality

Some ideas for extending the application:
- Advanced quiz types (matching, fill-in-the-blank)
- Quiz categories and search
- Social sharing functionality
- Enhanced analytics for quiz creators

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Icons from [Heroicons](https://heroicons.com/)
- UI inspiration from [Tailwind UI](https://tailwindui.com/)
