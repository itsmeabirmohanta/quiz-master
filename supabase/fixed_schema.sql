-- Schema for Quiz Master Application (Fixed version)

-- NOTE: Removed JWT secret line that causes permission errors on hosted Supabase

-- Profiles table for users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Quizzes table
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key not null,
  title text not null,
  description text not null,
  category text,
  time_limit integer, -- in minutes
  author_id uuid references public.profiles(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  
  constraint title_length check (char_length(title) >= 3)
);

-- Questions table
create table public.questions (
  id uuid default uuid_generate_v4() primary key not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  text text not null,
  options jsonb not null, -- Array of options as JSON
  correct_answer integer not null, -- Index of the correct option
  position integer not null, -- For ordering questions
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  
  constraint correct_answer_range check (correct_answer >= 0)
);

-- Quiz results table
create table public.quiz_results (
  id uuid default uuid_generate_v4() primary key not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null default 'Anonymous', -- Store name of quiz taker even if anonymous
  score integer not null,
  total_questions integer not null,
  time_taken integer not null, -- in seconds
  completed_at timestamp with time zone default now() not null,
  answers jsonb, -- Detailed answers as JSON [{questionId, selectedAnswer}]
  
  constraint score_validation check (score >= 0 and score <= total_questions)
);

-- Create indexes for performance
create index quizzes_author_id_idx on public.quizzes (author_id);
create index questions_quiz_id_idx on public.questions (quiz_id);
create index questions_position_idx on public.questions (position);
create index quiz_results_quiz_id_idx on public.quiz_results (quiz_id);
create index quiz_results_user_id_idx on public.quiz_results (user_id);

-- Create functions for updating timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updating timestamps
create trigger handle_quizzes_updated_at
before update on public.quizzes
for each row execute procedure public.handle_updated_at();

create trigger handle_questions_updated_at
before update on public.questions
for each row execute procedure public.handle_updated_at();

-- RLS Policies (Row Level Security)
-- Enable RLS on tables
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.profiles enable row level security;

-- IMPORTANT: Modified policies to allow anonymous quiz creation
-- Anyone can read public quizzes and questions
create policy "Quizzes are viewable by everyone"
  on public.quizzes for select
  using (true);

create policy "Questions are viewable by everyone"
  on public.questions for select
  using (true);

-- Allow anonymous quiz creation (modified from original)
create policy "Anyone can create quizzes"
  on public.quizzes for insert
  to anon, authenticated
  with check (true);

-- Users can update their own quizzes
create policy "Users can update own quizzes"
  on public.quizzes for update
  using (auth.uid() = author_id or author_id is null);

-- Users can delete their own quizzes
create policy "Users can delete own quizzes"
  on public.quizzes for delete
  using (auth.uid() = author_id or author_id is null);

-- Allow adding questions to any quiz (modified for anonymous)
create policy "Anyone can add questions to quizzes"
  on public.questions for insert
  to anon, authenticated
  with check (true);

-- Users can update questions on their own quizzes
create policy "Anyone can update questions"
  on public.questions for update
  using (true);

-- Users can delete questions from their own quizzes
create policy "Anyone can delete questions"
  on public.questions for delete
  using (true);

-- Anyone can see quiz results
create policy "Anyone can see quiz results"
  on public.quiz_results for select
  to anon, authenticated
  using (true);

-- Anyone can record quiz results
create policy "Anyone can record quiz results"
  on public.quiz_results for insert
  to anon, authenticated
  with check (true);

-- Function to get a quiz with its questions
create or replace function public.get_quiz_with_questions(quiz_id uuid)
returns jsonb
language sql
as $$
  select 
    jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'description', q.description,
      'category', q.category,
      'time_limit', q.time_limit,
      'author_id', q.author_id,
      'created_at', q.created_at,
      'updated_at', q.updated_at,
      'questions', (
        select 
          jsonb_agg(
            jsonb_build_object(
              'id', qu.id,
              'text', qu.text,
              'options', qu.options,
              'correctAnswer', qu.correct_answer,
              'position', qu.position
            ) order by qu.position
          )
        from public.questions qu
        where qu.quiz_id = q.id
      )
    )
  from public.quizzes q
  where q.id = quiz_id
$$; 