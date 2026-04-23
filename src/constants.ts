import { Book, Highlight, Chapter } from './types';

export const MOCK_BOOKS: Book[] = [];

export const MOCK_HIGHLIGHTS: Highlight[] = [];

export const MOCK_CHAPTERS: Chapter[] = [
  { id: '1', title: '第一章', page: 1, progress: 100 },
  { id: '2', title: '第二章', page: 2, progress: 100 },
  { id: '3', title: '第三章', page: 3, progress: 32 }
];

export const ACHIEVEMENT_LEVELS = [
  { title: '阅读小白', minHours: 0, icon: '🌱', description: '初出茅庐的阅读爱好者，一切才刚刚开始。' },
  { title: '资深读者', minHours: 1, icon: '📖', description: '已经养成了初步的阅读习惯，书香已入心。' },
  { title: '博学探索者', minHours: 10, icon: '🧭', description: '广泛涉猎各种知识领域，见识日益增长。' },
  { title: '深度沉迷中', minHours: 50, icon: '🌊', description: '书籍已成为生命的一部分，沉浸在智慧的海洋。' },
  { title: '一代宗师', minHours: 100, icon: '🏆', description: '读破万卷书，下笔如有神。已成一代宗师。' }
];
