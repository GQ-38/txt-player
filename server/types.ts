export interface UserStats {
  readingTimeMinutes: number;
  finishedBooks: number;
  consecutiveDays: number;
  lastCheckInDate: string | null;
}

export interface AppUser {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  phone?: string;
  stats: UserStats;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}
