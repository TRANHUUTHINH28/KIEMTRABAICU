
export interface Student {
  id: number;
  name: string;
}

export interface Question {
  id: number;
  content: string;
  image?: string;
  options: string[];
  correctAnswer: number; // 0-3
}

export type Grade = '10' | '11' | '12';

export enum AppState {
  SELECT_GRADE = 'SELECT_GRADE',
  LOADING = 'LOADING',
  READY = 'READY',
  SPINNING = 'SPINNING',
  REVEALED = 'REVEALED',
  QUESTION = 'QUESTION',
  ANSWERED = 'ANSWERED'
}
