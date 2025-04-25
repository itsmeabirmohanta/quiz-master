import { Quiz } from "../types/quiz";

export const sampleQuizzes: Quiz[] = [
  {
    id: "1",
    title: "General Knowledge Quiz",
    description: "Test your general knowledge with these 10 trivia questions.",
    questions: [
      {
        id: "q1",
        text: "What is the capital city of Australia?",
        options: ["Sydney", "Melbourne", "Canberra", "Perth"],
        correctAnswer: 2,
      },
      {
        id: "q2",
        text: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctAnswer: 1,
      },
      {
        id: "q3",
        text: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
        correctAnswer: 2,
      },
      {
        id: "q4",
        text: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correctAnswer: 3,
      },
      {
        id: "q5",
        text: "Which country is known as the Land of the Rising Sun?",
        options: ["China", "Thailand", "Japan", "South Korea"],
        correctAnswer: 2,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "General Knowledge",
    timeLimit: 10,
  },
  {
    id: "2",
    title: "Science Quiz",
    description: "Test your knowledge of basic science concepts.",
    questions: [
      {
        id: "q1",
        text: "What is the chemical symbol for gold?",
        options: ["Go", "Ag", "Au", "Gd"],
        correctAnswer: 2,
      },
      {
        id: "q2",
        text: "What is the smallest unit of life?",
        options: ["Atom", "Cell", "Molecule", "Organ"],
        correctAnswer: 1,
      },
      {
        id: "q3",
        text: "What force pulls objects toward Earth?",
        options: ["Magnetism", "Friction", "Gravity", "Tension"],
        correctAnswer: 2,
      },
      {
        id: "q4",
        text: "What process do plants use to make their own food?",
        options: ["Photosynthesis", "Respiration", "Digestion", "Transpiration"],
        correctAnswer: 0,
      },
      {
        id: "q5",
        text: "What is the largest organ in the human body?",
        options: ["Heart", "Brain", "Liver", "Skin"],
        correctAnswer: 3,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "Science",
    timeLimit: 8,
  },
  {
    id: "3",
    title: "History Quiz",
    description: "Test your knowledge of world history events.",
    questions: [
      {
        id: "q1",
        text: "In which year did World War II end?",
        options: ["1943", "1945", "1947", "1950"],
        correctAnswer: 1,
      },
      {
        id: "q2",
        text: "Who was the first President of the United States?",
        options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"],
        correctAnswer: 2,
      },
      {
        id: "q3",
        text: "The Great Wall of China was built primarily to defend against which group?",
        options: ["Mongols", "Japanese", "Russians", "Vietnamese"],
        correctAnswer: 0,
      },
      {
        id: "q4",
        text: "Which empire was ruled by Caesar Augustus?",
        options: ["Greek", "Persian", "Roman", "Ottoman"],
        correctAnswer: 2,
      },
      {
        id: "q5",
        text: "The Renaissance period began in which country?",
        options: ["France", "Germany", "Italy", "England"],
        correctAnswer: 2,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "History",
    timeLimit: 10,
  },
];

export default sampleQuizzes; 