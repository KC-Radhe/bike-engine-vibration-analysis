import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./../lib/firebase";

export class SensorService {
  static async deleteSimulatedData(
    uid: string,
  ): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
      const deleteDocsByUser = async (collectionName: string): Promise<number> => {
        const ref = collection(db, collectionName);
        const queryRef = query(ref, where("userId", "==", uid));
        const snap = await getDocs(queryRef);
        if (snap.empty) return 0;

        // Use small batches to stay comfortably under Firestore's 500 ops limit.
        let deleted = 0;
        let batch = writeBatch(db);
        let ops = 0;

        for (const d of snap.docs) {
          batch.delete(d.ref);
          deleted += 1;
          ops += 1;
          if (ops >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
        return deleted;
      };

      const deleteSubcollectionDocs = async (
        parentCollection: string,
        parentDocId: string,
        subcollectionName: string,
      ): Promise<number> => {
        const subRef = collection(db, parentCollection, parentDocId, subcollectionName);
        const subSnap = await getDocs(subRef);
        if (subSnap.empty) return 0;

        let deleted = 0;
        let batch = writeBatch(db);
        let ops = 0;

        for (const sd of subSnap.docs) {
          batch.delete(sd.ref);
          deleted += 1;
          ops += 1;
          if (ops >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
        return deleted;
      };

      // 1) Delete top-level simulated summaries/alerts
      await deleteDocsByUser("healthSummaries_simulated");
      await deleteDocsByUser("alert_simulated");

      // 2) Delete vibration_simulate documents AND their window subcollections.
      const vibrationRef = collection(db, "vibration_simulate");
      const vibrationQuery = query(vibrationRef, where("userId", "==", uid));
      const vibrationSnap = await getDocs(vibrationQuery);

      // First remove any nested window documents (deleting parent docs does NOT delete subcollections)
      for (const d of vibrationSnap.docs) {
        // Some earlier builds may have used either "windows" or "window".
        await deleteSubcollectionDocs("vibration_simulate", d.id, "windows");
        await deleteSubcollectionDocs("vibration_simulate", d.id, "window");
      }

      // Then remove the parent vibration_simulate docs
      let deletedVibrationLogs = 0;
      if (!vibrationSnap.empty) {
        let batch = writeBatch(db);
        let ops = 0;
        for (const d of vibrationSnap.docs) {
          batch.delete(d.ref);
          deletedVibrationLogs += 1;
          ops += 1;
          if (ops >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
      }

      return { success: true, deleted: deletedVibrationLogs };
    } catch (e: any) {
      return { success: false, deleted: 0, error: e.message };
    }
  }
}
