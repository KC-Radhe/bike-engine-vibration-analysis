export type AlertType = 'fault_detected' | 'high_vibration' | 'critical';
export type Severity = 'medium' | 'high' | 'critical';

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
    overallHealthLevel: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface VibrationLog {
    id: string;
    userId: string;
    timestamp: Date;
    // Raw sensor readings (simulator/hardware mode). For inference JSON logs, these can be null.
    vibrationX: number | null;
    vibrationY: number | null;
    vibrationZ: number | null;
    magnitude: number;
    frequency: number;
    healthStatus: string;
    confidenceLevel: number;

    // Optional inference fields (present when a JSON inference payload is saved)
    generatedAt?: string;
    thresholdUsed?: number;
    meanFaultyProbability?: number;
    minFaultyProbability?: number;
    maxFaultyProbability?: number;
    totalWindows?: number;
    predictedFaultyWindows?: number;
    predictedHealthyWindows?: number;
    overallVibrationMean?: number;
    overallVibrationMin?: number;
    overallVibrationMax?: number;
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

// ---------------- Inference JSON payload (matches unseen_inference_output.json) ----------------

export interface InferenceVibrationStats {
    mean: number;
    min: number;
    max: number;
}

export interface InferenceProbabilityStats {
    mean_faulty_probability: number;
    min_faulty_probability: number;
    max_faulty_probability: number;
    threshold_used: number;
    total_windows: number;
    predicted_faulty_windows: number;
    predicted_healthy_windows: number;
}

export interface InferenceOverallBlock {
    rows: number;
    vibration_stats: InferenceVibrationStats;
    probability_stats: InferenceProbabilityStats;
}

export interface InferenceWindowPayload {
    start_idx: number;
    end_idx: number;
    start_time_ms: number;
    end_time_ms: number;
    vibration_stats: InferenceVibrationStats;
    faulty_probability: number;
    predicted_label: 0 | 1;
}

export interface InferencePayload {
    generated_at: string;
    model_path: string;
    unseen_csv: string;
    overall: InferenceOverallBlock;
    windows: InferenceWindowPayload[];
}