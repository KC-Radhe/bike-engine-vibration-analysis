import { Cpu, X, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { FirestoreService } from "../services/firestoreService";
import { SensorService } from "../services/sensorServices";
import type { InferencePayload } from "../types/database";
import realInference from "../unseen_inference_output.json";
import { genereateSimulatedData } from "../utils/sensorSimulator";

interface SimulatorButtonProps {
  onDataSent?: () => void;
  onToggleChange?: (toReal: boolean, onDone: () => void) => void;
}

export function SimulatorButton({ onDataSent, onToggleChange }: SimulatorButtonProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [useRealSensors, setUseRealSensors] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const simulateData = async (condition: "healthy" | "warning" | "faulty") => {
    if (!user) return;
    setLoading(true);
    setMessage("");

    // Generates data in the SAME shape as the inference JSON payload
    const payload = genereateSimulatedData(condition);

    // Save only ONCE (fix: today's overview count must increment by 1)
    const colName = "vibration_simulate";

    const r1 = await FirestoreService.saveVibrationLog(user.uid, payload, colName);

    if (r1.success) {
      const c = condition.charAt(0).toUpperCase() + condition.slice(1);
      setMessage(`${c} data sent successfully.`);
      onDataSent?.();
    } else {
      setMessage(`Error: ${r1.error}`);
    }
    setLoading(false);
  };

  const handleToggle = async (toReal: boolean) => {
    setMessage("");
    setLoading(true);

    // IMPORTANT: keep delete behavior (when toggling back to Real)
    if (toReal && user) {
      setMessage("Cleaning up Simulated data...");
      const result = await SensorService.deleteSimulatedData(user.uid);
      if (result.success) {
        setMessage(`Deleted ${result.deleted} simulated records.`);
      } else {
        setMessage(`Cleanup warning: ${result.error}`);
      }
    }

    setUseRealSensors(toReal);
    onToggleChange?.(toReal, () => {
      setLoading(false);
    });
  };

  const startRealSensorMonitoring = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");
    setIsMonitoring(true);

    try {
      // "Real sensor" mode (for now) reads from the inference JSON bundled in the app.
      const payload = realInference as unknown as InferencePayload;

      const result = await FirestoreService.saveVibrationLog(
        user.uid,
        payload,
        "vibration_real",
      );

      if (result.success) {
        setMessage("Real sensor data saved to Firestore (vibration_real).");
        onDataSent?.();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
      setIsMonitoring(false);
    }
  };

  const stopRealSensorMonitoring = () => {
    setIsMonitoring(false);
    setMessage("Monitoring stopped.");
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Zap size={24} color="#fff" strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sensor Simulator</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#64748b" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Test the app with simulated sensor data
            </Text>

            <View style={styles.toggleContainer}>
              <Cpu size={20} color="#64748b" strokeWidth={2} />
              <Text style={styles.toggleLabel}>Use Real Sensors</Text>
              <Switch
                value={useRealSensors}
                onValueChange={handleToggle}
                trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
                thumbColor={useRealSensors ? "#fff" : "#f1f5f9"}
                disabled={loading}
              />
            </View>

            <Text style={styles.modalSubtitle}>
              {loading
                ? "Switching data"
                : useRealSensors
                ? "Connect to hardware sensors"
                : "Test the app with simulated sensor data"}
            </Text>

            {message ? (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            {loading && (
              <View style={styles.transitionLoading}>
                <ActivityIndicator color="#2563eb" size="large" />
                <Text style={styles.transitionText}>
                  {useRealSensors
                    ? "Loading real sensor data..."
                    : "Loading simulated data..."}
                </Text>
              </View>
            )}

            {!loading && useRealSensors && (
              <View style={styles.buttonContainer}>
                {!isMonitoring ? (
                  <TouchableOpacity
                    style={[styles.simButton, styles.startButton]}
                    onPress={startRealSensorMonitoring}
                    disabled={loading}
                  >
                    <>
                      <Text style={styles.simButtonText}>Start Monitoring</Text>
                      <Text style={styles.simButtonSubtext}>
                        Save inference JSON to vibration_real
                      </Text>
                    </>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.simButton, styles.stopButton]}
                    onPress={stopRealSensorMonitoring}
                  >
                    <Text style={styles.simButtonText}>Stop Monitoring</Text>
                    <Text style={styles.simButtonSubtext}>End data collection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!loading && !useRealSensors && (
              <View style={styles.buttonContainer}>
                <>
                  <TouchableOpacity
                    style={[styles.simButton, styles.healthyButton]}
                    onPress={() => simulateData("healthy")}
                    disabled={loading}
                  >
                    <>
                      <Text style={styles.simButtonText}>Healthy Data</Text>
                      <Text style={styles.simButtonSubtext}>Low Fault Risk</Text>
                    </>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.simButton, styles.warningButton]}
                    onPress={() => simulateData("warning")}
                    disabled={loading}
                  >
                    <>
                      <Text style={styles.simButtonText}>Warning Data</Text>
                      <Text style={styles.simButtonSubtext}>Around Threshold</Text>
                    </>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.simButton, styles.faultyButon]}
                    onPress={() => simulateData("faulty")}
                    disabled={loading}
                  >
                    <>
                      <Text style={styles.simButtonText}>Faulty Data</Text>
                      <Text style={styles.simButtonSubtext}>High Fault Risk</Text>
                    </>
                  </TouchableOpacity>
                </>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    right: 30,
    bottom: 60,
    width: 60,
    height: 60,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2562e2",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderColor: "#2563eb",
    borderWidth: 4,
    padding: 24,
    width: "90%",
    shadowColor: "#040404ff",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginLeft: 10,
  },
  messageContainer: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  messageText: {
    color: "#334155",
    fontSize: 14,
    textAlign: "center",
  },
  transitionLoading: {
    alignItems: "center",
    paddingVertical: 20,
  },
  transitionText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 14,
  },
  buttonContainer: {
    gap: 10,
  },
  simButton: {
    padding: 16,
    borderRadius: 12,
  },
  simButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  simButtonSubtext: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
  startButton: {
    backgroundColor: "#2563eb",
  },
  stopButton: {
    backgroundColor: "#dc2626",
  },
  healthyButton: {
    backgroundColor: "#16a34a",
  },
  warningButton: {
    backgroundColor: "#d97706",
  },
  faultyButon: {
    backgroundColor: "#dc2626",
  },
});
