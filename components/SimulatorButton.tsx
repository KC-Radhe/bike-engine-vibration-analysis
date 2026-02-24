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
import { genereateSimulatedData } from "../utils/sensorSimulator";

interface SimulatorButtonProps {
  onDataSent?: () => void;
  onToggleChange?: (toReal: boolean) => void;
}

export function SimulatorButton({
  onDataSent,
  onToggleChange,
}: SimulatorButtonProps) {
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

    const data = genereateSimulatedData(condition);
    const result = await FirestoreService.saveVibrationLog(
      user.uid,
      data,
      "vibration_simulated",
    );

    if (result.success) {
      const c = condition.charAt(0).toUpperCase() + condition.slice(1);
      setMessage(`${c} data sent successfully.`);
      onDataSent?.();
    } else {
      setMessage(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  const handleToggle = async (toReal: boolean) => {
    setMessage("");
    if (toReal && user) {
      setLoading(true);
      setMessage("Cleaning up simulated data…");
      const result = await SensorService.deleteSimulatedData(user.uid);
      if (result.success) {
        setMessage(`Deleted ${result.deleted} simulated records.`);
      } else {
        setMessage(`Cleanup warning: ${result.error}`);
      }

      //TODO: Load registered sensors
    }
    setUseRealSensors(toReal);
    onToggleChange?.(toReal);
    setLoading(false);
  };

  const startRealSensorMonitoring = () => {};
  const stopRealSensorMonitoring = () => {};

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

            {/* Toggle between simulator and real sensors */}
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
              {useRealSensors
                ? "Connect to hardware sensors"
                : "Test the app with simulated sensor data"}
            </Text>

            {message ? (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            {loading && (
              <ActivityIndicator color="#2563eb" style={{ marginBottom: 12 }} />
            )}

            {useRealSensors ? (
              <View style={styles.buttonContainer}>
                {!isMonitoring ? (
                  <TouchableOpacity
                    style={[styles.simButton, styles.startButton]}
                    onPress={startRealSensorMonitoring}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.simButtonText}>
                          Start Monitoring
                        </Text>
                        <Text style={styles.simButtonSubtext}>
                          Begin collecting real sensor data
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.simButton, styles.stopButton]}
                    onPress={stopRealSensorMonitoring}
                  >
                    <Text style={styles.simButtonText}>Stop Monitoring</Text>
                    <Text style={styles.simButtonSubtext}>
                      End data collection
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.simButton, styles.healthyButton]}
                  onPress={() => simulateData("healthy")}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.simButtonText}>Healthy Data</Text>
                      <Text style={styles.simButtonSubtext}>Low Vibration</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.simButton, styles.warningButton]}
                  onPress={() => simulateData("warning")}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.simButtonText}>Warning Data</Text>
                      <Text style={styles.simButtonSubtext}>
                        Medium Vibration
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.simButton, styles.faultyButon]}
                  onPress={() => simulateData("faulty")}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.simButtonText}>Faulty Data</Text>
                      <Text style={styles.simButtonSubtext}>
                        High Vibration
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
  messageContainer: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: "#2563eb",
    textAlign: "center",
    fontWeight: "600",
  },
  buttonContainer: {
    gap: 12,
  },
  simButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  healthyButton: {
    backgroundColor: "#10b981",
  },
  warningButton: {
    backgroundColor: "#f59e0b",
  },
  faultyButon: {
    backgroundColor: "#ef4444",
  },
  simButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  simButtonSubtext: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.9,
  },

  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  startButton: {
    backgroundColor: "#10b981",
  },
  stopButton: {
    backgroundColor: "#ef4444",
  },
});
