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