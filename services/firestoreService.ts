import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Alert, HealthSummary, VibrationLog, InferencePayload } from "../types/database";

export class FirestoreService {
  static async saveVibrationLog(
    userId: string,
    data:
      | {
          vibrationX: number;
          vibrationY: number;
          vibrationZ: number;
          frequency: number;
        }
      | InferencePayload,
    colName: string,
  ): Promise<{
    success: boolean;
    logId?: string;
    error?: string;
  }> {
    try {
      // Supports TWO formats:
      // 1) Raw sensor reading: { vibrationX, vibrationY, vibrationZ, frequency }
      // 2) Inference payload JSON: { generated_at, overall, windows[], ... }

      const isInferencePayload =
        data &&
        typeof data === "object" &&
        "overall" in data &&
        "windows" in data &&
        Array.isArray((data as InferencePayload).windows);

      // ---------------- Inference payload branch ----------------
      if (isInferencePayload) {
        const payload = data as InferencePayload;
        const ps = payload.overall.probability_stats;
        const vs = payload.overall.vibration_stats;

        const magnitude = vs.mean; // representative vibration level
        const frequency = 0; // frequency not present in inference JSON
        const healthStatus =
          ps.mean_faulty_probability >= ps.threshold_used ? "faulty" : "healthy";
        const confidenceLevel = ps.mean_faulty_probability * 100;

        // Batch-write the log + its windows (+ alert if faulty) in ONE commit.
        // This reduces perceived UI delay on slow networks.
        const logRef = doc(collection(db, colName));
        const batch = writeBatch(db);

        batch.set(logRef, {
          timestamp: serverTimestamp(),
          userId,

          // Keep legacy fields so existing UI doesn’t crash
          vibrationX: null,
          vibrationY: null,
          vibrationZ: null,

          magnitude,
          frequency,
          healthStatus,
          confidenceLevel,

          // Inference-specific fields for UI
          generatedAt: payload.generated_at,
          thresholdUsed: ps.threshold_used,
          meanFaultyProbability: ps.mean_faulty_probability,
          minFaultyProbability: ps.min_faulty_probability,
          maxFaultyProbability: ps.max_faulty_probability,
          totalWindows: ps.total_windows,
          predictedFaultyWindows: ps.predicted_faulty_windows,
          predictedHealthyWindows: ps.predicted_healthy_windows,
          overallVibrationMean: vs.mean,
          overallVibrationMin: vs.min,
          overallVibrationMax: vs.max,

          createdAt: serverTimestamp(),
        });

        // Save window timeline as subcollection: {colName}/{logId}/windows
        const windowsCol = collection(db, colName, logRef.id, "windows");

        // For simulation runs we only persist a small, fixed window set
        // to keep Firestore usage predictable (requested: max 21 docs).
        const windowsToSave =
          colName === "vibration_simulate"
            ? payload.windows.slice(0, 21)
            : payload.windows;

        for (const w of windowsToSave) {
          const wRef = doc(windowsCol);
          batch.set(wRef, {
            startIdx: w.start_idx,
            endIdx: w.end_idx,
            startTimeMs: w.start_time_ms,
            endTimeMs: w.end_time_ms,
            vibrationMean: w.vibration_stats.mean,
            vibrationMin: w.vibration_stats.min,
            vibrationMax: w.vibration_stats.max,
            faultyProbability: w.faulty_probability,
            predictedLabel: w.predicted_label,
          });
        }

        // Optional alert doc in SAME batch when faulty
        if (healthStatus === "faulty") {
          const alertCol = colName === "vibration_real" ? "alert_real" : "alert_simulated";
          const alertRef = doc(collection(db, alertCol));
          batch.set(alertRef, {
            userId,
            alertType: "fault_detected",
            severity: "critical",
            title: "Critical Engine Fault Detected",
            message: `Engine fault detected with ${magnitude.toFixed(
              2,
            )}g vibration.\nIMMEDIATE ATTENTION REQUIRED.`,
            vibrationLogId: logRef.id,
            isRead: false,
            isDismissed: false,
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();

        await this.updateHealthSummary(
          userId,
          { magnitude, frequency, healthStatus },
          colName,
        );

        return { success: true, logId: logRef.id };
      }

      // ---------------- Raw sensor reading branch (existing logic) ----------------
      const raw = data as {
        vibrationX: number;
        vibrationY: number;
        vibrationZ: number;
        frequency: number;
      };

      const magnitude = Math.sqrt(
        raw.vibrationX ** 2 + raw.vibrationY ** 2 + raw.vibrationZ ** 2,
      );

      let healthStatus: string;
      let confidenceLevel: number;

      if (magnitude < 3.5 && raw.frequency < 35) {
        healthStatus = "healthy";
        confidenceLevel = 95 + Math.random() * 5;
      } else if (magnitude < 8.5 && raw.frequency < 70) {
        healthStatus = "warning";
        confidenceLevel = 75 + Math.random() * 15;
      } else {
        healthStatus = "faulty";
        confidenceLevel = 85 + Math.random() * 15;
      }

      const vibrationLogRef = await addDoc(collection(db, colName), {
        timestamp: serverTimestamp(),
        userId,
        vibrationX: raw.vibrationX,
        vibrationY: raw.vibrationY,
        vibrationZ: raw.vibrationZ,
        magnitude,
        frequency: raw.frequency,
        healthStatus,
        confidenceLevel,
        createdAt: serverTimestamp(),
      });

      await this.updateHealthSummary(
        userId,
        { magnitude, frequency: raw.frequency, healthStatus },
        colName,
      );

      if (
        healthStatus === "faulty" ||
        (healthStatus === "warning" && magnitude > 3.5)
      ) {
        await this.createAlert(
          userId,
          { magnitude, healthStatus, vibrationLogId: vibrationLogRef.id },
          colName,
        );
      }

      return { success: true, logId: vibrationLogRef.id };
    } catch (error: any) {
      console.error(`Error on saving vibration log: ${error}`);
      return { success: false, error: error?.message ?? String(error) };
    }
  }

  private static async createAlert(
    userId: string,
    data: {
      magnitude: number;
      healthStatus: string;
      vibrationLogId: string;
    },
    colName: string,
  ): Promise<void> {
    let alertType: Alert["alertType"];
    let severity: Alert["severity"];
    let title: string;
    let message: string;

    // Alerts collections (requested)
    const alertCol = colName === "vibration_real" ? "alert_real" : "alert_simulated";

    if (data.healthStatus === "faulty") {
      alertType = "fault_detected";
      severity = "critical";
      title = "Critical Engine Fault Detected";
      message = `Engine fault detected with ${data.magnitude.toFixed(2)}g vibration.\nIMMEDIATE ATTENTION REQUIRED.`;
    } else if (data.magnitude > 7) {
      alertType = "critical";
      severity = "high";
      title = "High Vibration Warning";
      message = `Unusual vibration levels detected (${data.magnitude.toFixed(2)}g).\nCONSIDER INSPECTION`;
    } else {
      alertType = "high_vibration";
      severity = "medium";
      title = "May Fault Warning";
      message = `Engine may fault warning with ${data.magnitude.toFixed(2)}g vibration.\nMONITOR CLOSELY`;
    }

    await addDoc(collection(db, alertCol), {
      userId,
      alertType,
      severity,
      title,
      message,
      vibrationLogId: data.vibrationLogId,
      isRead: false,
      isDismissed: false,
      createdAt: serverTimestamp(),
    });
  }

  /**
   * Reads the latest vibration log for the user (from colName), then returns
   * random window-series values from its `windows` subcollection.
   *
   * Used for dashboard trend charts.
   */
  static async getRandomWindowSeriesForLatestLog(
    userId: string,
    colName: string,
    field: "faultyProbability" | "vibrationMean",
    take: number = 20,
  ): Promise<number[]> {
    try {
      const latest = await this.getLatestVibrationLog(userId, colName);
      if (!latest) return [];

      // Only inference JSON logs have windows subcollection
      if (latest.meanFaultyProbability === undefined) return [];

      const windowsRef = collection(db, colName, latest.id, "windows");
      const snap = await getDocs(windowsRef);
      if (snap.empty) return [];

      const all: number[] = [];
      snap.forEach((d) => {
        const v = d.data()?.[field];
        if (typeof v === "number" && Number.isFinite(v)) all.push(v);
      });

      if (all.length === 0) return [];

      // random sample `take`
      const shuffled = all
        .map((v) => ({ v, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.v);

      return shuffled.slice(0, Math.min(take, shuffled.length));
    } catch (e) {
      console.error("Error fetching window series:", e);
      return [];
    }
  }

  private static async updateHealthSummary(
    userId: string,
    data: {
      magnitude: number;
      frequency: number;
      healthStatus: string;
    },
    colName: string,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const healthSummaryRef = doc(
      db,
      colName === "vibration_real" ? "healthSummaries" : "healthSummaries_simulated",
      `${userId}_${today}`,
    );
    const healthSummaryDoc = await getDoc(healthSummaryRef);

    if (!healthSummaryDoc.exists()) {
      const initialHealthLevel =
        data.healthStatus === "healthy"
          ? 100.0
          : data.healthStatus === "warning"
            ? 80.0
            : 40.0;

      await setDoc(healthSummaryRef, {
        userId,
        date: today,
        totalReadings: 1,
        healthyCount: data.healthStatus === "healthy" ? 1 : 0,
        warningCount: data.healthStatus === "warning" ? 1 : 0,
        faultyCount: data.healthStatus === "faulty" ? 1 : 0,
        avgVibration: data.magnitude,
        maxVibration: data.magnitude,
        overallHealthLevel: initialHealthLevel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const oldHealthSummary = healthSummaryDoc.data();

    const newTotalReadings = oldHealthSummary.totalReadings + 1;
    const newHealthyCount =
      oldHealthSummary.healthyCount + (data.healthStatus === "healthy" ? 1 : 0);
    const newWarningCount =
      oldHealthSummary.warningCount + (data.healthStatus === "warning" ? 1 : 0);
    const newFaultyCount =
      oldHealthSummary.faultyCount + (data.healthStatus === "faulty" ? 1 : 0);

    const newAvgVibration =
      (oldHealthSummary.avgVibration * oldHealthSummary.totalReadings +
        data.magnitude) /
      newTotalReadings;
    const newMaxVibration = Math.max(
      oldHealthSummary.maxVibration,
      data.magnitude,
    );
    const healthyPercentage = (newHealthyCount / newTotalReadings) * 100;
    const warningPenalty = (newWarningCount / newTotalReadings) * 20;
    const faultyPenalty = (newFaultyCount / newTotalReadings) * 60;
    const newHealthLevel = Math.max(
      0,
      healthyPercentage - warningPenalty - faultyPenalty,
    );
    //warning are concerning: -20% & faults are critical: -60%

    await updateDoc(healthSummaryRef, {
      totalReadings: newTotalReadings,
      healthyCount: newHealthyCount,
      warningCount: newWarningCount,
      faultyCount: newFaultyCount,
      avgVibration: newAvgVibration,
      maxVibration: newMaxVibration,
      overallHealthLevel: newHealthLevel,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  static async getTodayHealthSummary(
    userId: string,
    colName: string,
  ): Promise<HealthSummary> | null {
    try {
      const today = new Date().toISOString().split("T")[0];
      const healthSummaryRef = doc(
        db,
        colName === "vibration_real" ? "healthSummaries" : "healthSummaries_simulated",
        `${userId}_${today}`,
      );
      const healthSummaryDoc = await getDoc(healthSummaryRef);

      if (!healthSummaryDoc.exists()) return null;
      const data = healthSummaryDoc.data();
      return {
        id: healthSummaryDoc.id,
        userId: data.userId,
        date: data.date,
        totalReadings: data.totalReadings,
        healthyCount: data.healthyCount,
        warningCount: data.warningCount,
        faultyCount: data.faultyCount,
        avgVibration: data.avgVibration,
        maxVibration: data.maxVibration,
        overallHealthLevel: data.overallHealthLevel,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      };
    } catch (error) {
      console.error("Error getting health summary: ", error);
      return null;
    }
  }

  static async getLatestVibrationLog(
    userId: string,
    colName: string,
  ): Promise<VibrationLog | null> {
    try {
      const queryObj = query(
        collection(db, colName),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(1),
      );

      const querySnapshot = await getDocs(queryObj);
      if (querySnapshot.empty) return null;
      const latestVibration = querySnapshot.docs[0];
      const data = latestVibration.data();
      return {
        id: latestVibration.id,
        userId: data.userId,
        timestamp: data.timestamp?.toDate?.() ?? new Date(),
        vibrationX: data.vibrationX ?? null,
        vibrationY: data.vibrationY ?? null,
        vibrationZ: data.vibrationZ ?? null,
        magnitude: data.magnitude,
        frequency: data.frequency,
        healthStatus: data.healthStatus,
        confidenceLevel: data.confidenceLevel,
        generatedAt: data.generatedAt,
        thresholdUsed: data.thresholdUsed,
        meanFaultyProbability: data.meanFaultyProbability,
        minFaultyProbability: data.minFaultyProbability,
        maxFaultyProbability: data.maxFaultyProbability,
        totalWindows: data.totalWindows,
        predictedFaultyWindows: data.predictedFaultyWindows,
        predictedHealthyWindows: data.predictedHealthyWindows,
        overallVibrationMean: data.overallVibrationMean,
        overallVibrationMin: data.overallVibrationMin,
        overallVibrationMax: data.overallVibrationMax,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    } catch (error) {
      console.error("Error getting latest vibration log: ", error);
      return null;
    }
  }

  static async getRecentVibrationLogs(
    userId: string,
    colName: string,
    limitCount: number = 10,
  ): Promise<VibrationLog[] | null> {
    try {
      const queryObj = query(
        collection(db, colName),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      );
      const querySnapshot = await getDocs(queryObj);

      const response = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          timestamp: data.timestamp?.toDate?.() ?? new Date(),
          vibrationX: data.vibrationX ?? null,
          vibrationY: data.vibrationY ?? null,
          vibrationZ: data.vibrationZ ?? null,
          magnitude: data.magnitude,
          frequency: data.frequency,
          healthStatus: data.healthStatus,
          confidenceLevel: data.confidenceLevel,
          generatedAt: data.generatedAt,
          thresholdUsed: data.thresholdUsed,
          meanFaultyProbability: data.meanFaultyProbability,
          minFaultyProbability: data.minFaultyProbability,
          maxFaultyProbability: data.maxFaultyProbability,
          totalWindows: data.totalWindows,
          predictedFaultyWindows: data.predictedFaultyWindows,
          predictedHealthyWindows: data.predictedHealthyWindows,
          overallVibrationMean: data.overallVibrationMean,
          overallVibrationMin: data.overallVibrationMin,
          overallVibrationMax: data.overallVibrationMax,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
      });

      return response;
    } catch (error) {
      console.error(`Error getting on recent vibration logs: ${error}`);
      return [];
    }
  }

  /**
   * Optional: fetch a "live" real-inference payload from Firestore.
   *
   * Why:
   * - Bundled JSON (unseen_inference_output.json) does NOT change at runtime.
   * - If you want the monitoring loop to pick up changes without stopping/starting,
   *   write the latest payload into this Firestore doc.
   *
   * Path: users/{userId}/real_inference/latest
   */
  static async getRealInferenceSource(userId: string): Promise<InferencePayload | null> {
    try {
      const ref = doc(db, "users", userId, "real_inference", "latest");
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as unknown as InferencePayload;
    } catch {
      return null;
    }
  }
}
