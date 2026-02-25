export type AlertType = "fault_detected" | "high_vibration" | "critical";
export type Severity = "medium" | "high" | "critical";

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  bikeModel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthSummary {
  id: string;
  userId: string;
  date: string;
  totalReadings: number;
  healthyCount: number;
  warningCount: number;
  faultyCount: number;
  avgVibration: number;
  maxVibration: number;
  avgFrequency: number;
  overallHealthLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VibrationLog {
  id: string;
  userId: string;
  timestamp: Date;
  vibrationX: number;
  vibrationY: number;
  vibrationZ: number;
  magnitude: number;
  frequency: number;
  healthStatus: string;
  confidenceLevel: number;
  createdAt: Date;
}

export interface Alert {
  id: string;
  userId: string;
  alertType: AlertType;
  severity: Severity;
  title: string;
  message: string;
  vibraionLogId: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
}
