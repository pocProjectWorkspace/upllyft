import { Author } from './community';

export interface Question {
  id: string;
  title: string;
  content: string;
  slug: string;
  authorId: string;
  author: Author;
  viewCount: number;
  answerCount: number;
  followerCount: number;
  hasAcceptedAnswer: boolean;
  status: 'OPEN' | 'CLOSED';
  topics: string[];
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  author: Author;
  content: string;
  isAccepted: boolean;
  helpfulVotes: number;
  notHelpfulVotes: number;
  createdAt: string;
  updatedAt: string;
}
