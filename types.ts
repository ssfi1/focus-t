
export interface TimeSegment {
  start: number;
  end: number | null; // null means currently running
  stopReason?: 'hard-stop'; // If present, the gap following this segment is not a break
  deletedAt?: number; // If present, this segment is in the "Segment Trash"
  isDeletedGap?: boolean; // True if this segment was created to fill a deleted break (gap)
}

export interface Group {
  id: string;
  name: string;
  color: string; // e.g., 'blue', 'green', 'purple'
}

export interface Session {
  id: string;
  name: string;
  groupId: string; // Reference to Group
  createdAt: number;
  segments: TimeSegment[];
  isActive: boolean; // True if the timer is currently ticking (not paused, not stopped)
  isFinished: boolean; // True if the session is archived
  completionStatus?: 'completed' | 'on-hold'; // Status of the archived session
  memo?: string;
  deletedAt?: number; // Timestamp if moved to trash
}

export interface NotificationSettings {
  workEnabled: boolean;
  workInterval: number; // minutes
  breakEnabled: boolean;
  breakInterval: number; // minutes
  soundEnabled: boolean;
  nativeNotificationEnabled: boolean; // Controls browser/system notifications
  customSound?: string; // Base64 encoded audio string
  shortcutEnabled: boolean;
  dayStartHour: number; // 0-23, Start of the day (default 06:00)
}

export interface WorkDay {
  startTime: number;
  endTime: number;
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';
