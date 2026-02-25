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
      const deleteFromCollection = async (
        collectionName: string,
      ): Promise<number> => {
        const ref = collection(db, collectionName);
        const queryRef = query(ref, where("userId", "==", uid));
        const snap = await getDocs(queryRef);

        if (snap.empty) return 0;
        const batch = writeBatch(db);
        snap.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        return snap.size;
      };

      await deleteFromCollection("healthSummaries_simulated");
      await deleteFromCollection("alerts_simulated");
      const deletedVibrations = await deleteFromCollection(
        "vibration_simulated",
      );
      return { success: true, deleted: deletedVibrations };
    } catch (e: any) {
      return { success: false, deleted: 0, error: e.message };
    }
  }
}
