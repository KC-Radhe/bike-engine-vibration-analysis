import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Alert, HealthSummary, VibrationLog } from "../types/database";


export class FirestoreService {
    static async saveVibrationLog(
        userId: string,
        data: {
            vibrationX: number;
            vibrationY: number;
            vibrationZ: number;
            frequency: number;
        }
    ): Promise<{ 
        success: boolean;
        logId?: string;
        error?: string;
    }> {
        try {
            const magnitude = Math.sqrt(
                data.vibrationX ** 2 +
                data.vibrationY ** 2 +
                data.vibrationZ ** 2
            );

            let healthStatus: string;
            let confidenceLevel: number;

            if (magnitude < 3.5 && data.frequency < 35) {
                healthStatus = 'healthy';
                confidenceLevel = 95 + Math.random() * 5;
            } else if (magnitude < 8.5 && data.frequency < 70) {
                healthStatus = 'warning';
                confidenceLevel = 75 + Math.random() * 15;
            } else {
                healthStatus = 'faulty';
                confidenceLevel = 85 + Math.random() * 15;
            }

            const vibrationLogRef = await addDoc(collection(db, 'vibrationLogs'), {
                timestamp: serverTimestamp(),
                userId,
                vibrationX: data.vibrationX,
                vibrationY: data.vibrationY,
                vibrationZ: data.vibrationZ,
                magnitude,
                frequency: data.frequency,
                healthStatus,
                confidenceLevel,
                createdAt: serverTimestamp(),
            });

            //update engine health summary
            await this.updateHealthSummary(userId, {
                magnitude,
                frequency: data.frequency,
                healthStatus,
            });

            //create alert if needed
            if (healthStatus === 'faulty' || (healthStatus === 'warning' && magnitude > 3.5 )) {
                await this.createAlert(userId, {
                    magnitude,
                    healthStatus,
                    vibrationLogId: vibrationLogRef.id,
                });
            }

            return { success: true, logId: vibrationLogRef.id };
        } catch (error) {
            console.error( `Error on saving vibration log: ${error}`);
            return { success: false, error: error.message }
        }
    };

    private static async createAlert(
        userId: string,
        data: {
            magnitude: number;
            healthStatus: string;
            vibrationLogId: string;
        }
    ): Promise<void> {
        let alertType: Alert['alertType'];
        let severity: Alert['severity'];
        let title: string;
        let message: string;

        if (data.healthStatus === 'faulty') {
            alertType = 'fault_detected';
            severity = 'critical';
            title = 'Critical Engine Fault Detected';
            message = `Engine fault detected with ${data.magnitude.toFixed(2)}m/s² vibration.\nIMMEDIATE ATTENTION REQUIRED.`;
        } else if (data.magnitude > 7) {
            alertType = 'critical';
            severity = 'high';
            title = 'High Vibration Warning';
            message = `Unusual vibration levels detected (${data.magnitude.toFixed(2)}m/s²).\nCONSIDER INSPECTION`;
        } else {
            alertType = 'high_vibration';
            severity = 'medium';
            title = 'May Fault Warning';
            message = `Engine may fault warning with ${data.magnitude.toFixed(2)}m/s² vibration.\nMONITOR CLOSELY`;
        }

        await addDoc(collection(db, 'alerts'), {
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

    private static async updateHealthSummary(
        userId: string,
        data: {
            magnitude: number,
            frequency: number,
            healthStatus: string,
        }
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const healthSummaryRef = doc(db, 'healthSummaries', `${userId}_${today}`);

        const healthSummaryDoc = await getDoc(healthSummaryRef);

        if (!healthSummaryDoc.exists()) {
            const initialHealthLevel = data.healthStatus === 'healthy'? 100.0 :
            data.healthStatus === 'warning'? 80.0 : 40.0;
            
            await setDoc(healthSummaryRef, {
                userId,
                date: today,
                totalReadings: 1,
                healthyCount: data.healthStatus === 'healthy'? 1 : 0,
                warningCount: data.healthStatus === 'warning'? 1 : 0,
                faultyCount: data.healthStatus === 'faulty'? 1 : 0,
                avgVibration: data.magnitude,
                maxVibration: data.magnitude,
                avgFrequency: data.frequency,
                overallHealthLevel: initialHealthLevel,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return;
        };

        const oldHealthSummary = healthSummaryDoc.data();

        const newTotalReadings = oldHealthSummary.totalReadings + 1;
        const newHealthyCount = oldHealthSummary.healthyCount + (data.healthStatus === 'healthy'? 1 : 0);
        const newWarningCount = oldHealthSummary.warningCount + (data.healthStatus === 'warning'? 1 : 0);
        const newFaultyCount = oldHealthSummary.faultyCount + (data.healthStatus === 'faulty'? 1 : 0);

        const newAvgVibration = (oldHealthSummary.avgVibration * oldHealthSummary.totalReadings + data.magnitude) / newTotalReadings;
        const newMaxVibration = Math.max(oldHealthSummary.maxVibration, data.magnitude);
        const newAvgFrequency = (oldHealthSummary.avgFrequency * oldHealthSummary.totalReadings + data.frequency) / newTotalReadings;

        const healthyPercentage = (newHealthyCount / newTotalReadings) * 100;
        const warningPenalty = (newWarningCount / newTotalReadings) * 20;
        const faultyPenalty = (newFaultyCount / newTotalReadings) * 60;
        const newHealthLevel = Math.max(0, healthyPercentage - warningPenalty - faultyPenalty);
        //warning are concerning: -20% & faults are critical: -60%

        await updateDoc(healthSummaryRef, {
            totalReadings: newTotalReadings,
            healthyCount: newHealthyCount,
            warningCount: newWarningCount,
            faultyCount: newFaultyCount,
            avgVibration: newAvgVibration,
            maxVibration: newMaxVibration,
            avgFrequency: newAvgFrequency,
            overallHealthLevel: newHealthLevel,
            updatedAt: serverTimestamp(),
        });
        return;        
    };

    static async getTodayHealthSummary(userId: string): Promise<HealthSummary> | null {
        try {
            const today = new Date().toISOString().split('T')[0];
            const healthSummaryRef = doc(db, 'healthSummaries', `${userId}_${today}`);
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
                avgFrequency: data.avgFrequency,
                overallHealthLevel: data.overallHealthLevel,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            };
        } catch (error) {
            console.error('Error getting health summary: ', error);
            return null;
        };
    };

    
    static async getLatestVibrationLog(userId: string): Promise<VibrationLog | null> {
        try {
            const queryObj = query(
                collection(db, 'vibrationLogs'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(queryObj);
            if (querySnapshot.empty) return null;
            const latestVibration = querySnapshot.docs[0];
            const data = latestVibration.data();
            return {
                id: latestVibration.id,
                userId: data.userId,
                timestamp: data.timestamp?.toDate(),
                vibrationX: data.vibrationX,
                vibrationY: data.vibrationY,
                vibrationZ: data.vibrationZ,
                magnitude: data.magnitude,
                frequency: data.frequency,
                healthStatus: data.healthStatus,
                confidenceLevel: data.confidenceLevel,
                createdAt: data.createdAt?.toDate(),
            };
        } catch (error) {
            console.error('Error getting latest vibration log: ', error);
            return null;
        };
    };

    static async getRecentVibrationLogs(
        userId: string,
        limitCount: number = 10,
    ) : Promise<VibrationLog[] | null> {
        try {
            const queryObj = query(
                collection(db, 'vibrationLogs'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(limitCount),
            );
            const querySnapshot = await getDocs(queryObj);

            const response = querySnapshot.docs.map( doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userId: data.userId,
                    timestamp: data.timestamp?.toDate(),
                    vibrationX: data.vibrationX,
                    vibrationY: data.vibrationY,
                    vibrationZ: data.vibrationZ,
                    magnitude: data.magnitude,
                    frequency: data.frequency,
                    healthStatus: data.healthStatus,
                    confidenceLevel: data.confidenceLevel,
                    createdAt: data.createdAt?.toDate(),
                };
            });

            return response;
        } catch (error) {
            console.error(`Error getting on recent vibration logs: ${error}`);
            return [];
        }
    }

}