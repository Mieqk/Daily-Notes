export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface SleepData {
  hours: number;
  quality: number; // 1-5
  deep: number;    // hours
  light: number;   // hours
  rem: number;     // hours
  awake: number;   // hours
  bedtime: string; // HH:MM
  wakeTime: string; // HH:MM
}
