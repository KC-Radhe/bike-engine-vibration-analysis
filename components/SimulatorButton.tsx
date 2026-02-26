import { Cpu, X, Zap } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import bundledRealInference from "../unseen_inference_output.json";
import { genereateSimulatedData } from "../utils/sensorSimulator";

interface SimulatorButtonProps {
  onDataSent?: () => void;
  onToggleChange?: (toReal: boolean, onDone: () => void) => void;
}

export function SimulatorButton({ onDataSent, onToggleChange }: SimulatorButtonProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    null | "healthy" | "warning" | "faulty" | "start_monitoring"
  >(null);
  const [message, setMessage] = useState("");
  const [tickToast, setTickToast] = useState("");
  const [useRealSensors, setUseRealSensors] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always compare against the latest saved value (avoid stale state in setInterval)
  const lastSavedGeneratedAtRef = useRef<number>(0);

  const showToast = (text: string) => {
    setTickToast(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setTickToast(""), 3500);
  };

  const parseGeneratedAtMs = (generatedAt: string | undefined | null): number => {
    if (!generatedAt) return 0;

    // Normalize formats so Hermes/Android parses consistently.
    let s = String(generatedAt).trim();

    // Support "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
      s = s.replace(" ", "T");
    }

    // If timezone missing, assume UTC.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
      s = `${s}Z`;
    }

    const ms = new Date(s).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  /**
   * IMPORTANT LIMITATION (and the reason your override didn't work while monitoring):
   * - A bundled JSON file (like unseen_inference_output.json) DOES NOT change at runtime.
   * - Editing the file on your computer will not update an already-running app instance
   *   unless the JS bundle is reloaded (Fast Refresh / Reload).
   *
   * Fix implemented here:
   * - If you create/update this Firestore doc, monitoring will pick it up every minute:
   *     users/{uid}/real_inference/latest
   *   (Put the whole payload there, including generated_at)
   * - If that doc doesn't exist, it falls back to the bundled JSON.
   */
  const readRealInferencePayload = async (): Promise<{ payload: InferencePayload; source: "firestore" | "bundle" }> => {
    if (user) {
      const live = await FirestoreService.getRealInferenceSource(user.uid);
      if (live && live.generated_at) {
        return { payload: live, source: "firestore" };
      }
    }

    return { payload: (bundledRealInference as unknown as InferencePayload), source: "bundle" };
  };

  const simulateData = async (condition: "healthy" | "warning" | "faulty") => {
    if (!user) return;
    setActionLoading(condition);
    setMessage("");

    try {
      const payload = genereateSimulatedData(condition);
      const colName = "vibration_simulate";

      const r1 = await FirestoreService.saveVibrationLog(user.uid, payload, colName);

      if (r1.success) {
        const c = condition.charAt(0).toUpperCase() + condition.slice(1);
        setMessage(`${c} data sent successfully.`);
        onDataSent?.();
      } else {
        setMessage(`Error: ${r1.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (toReal: boolean) => {
    setMessage("");
    setLoading(true);

    // Prevent switching sources while monitoring.
    if (isMonitoring) {
      setMessage("Stop monitoring before switching data source.");
      setLoading(false);
      return;
    }

    // Keep existing delete simulated data behavior
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
    if (intervalRef.current) return;

    setActionLoading("start_monitoring");
    setMessage("");
    setIsMonitoring(true);

    try {
      // Prime last-saved generatedAt from Firestore logs.
      const latest = await FirestoreService.getLatestVibrationLog(user.uid, "vibration_real");
      lastSavedGeneratedAtRef.current = parseGeneratedAtMs(latest?.generatedAt ?? null);

      const tick = async (isFirst = false) => {
        if (!user) return;

        showToast("Read a Vibration Log");

        try {
          const { payload, source } = await readRealInferencePayload();
          const currentMs = parseGeneratedAtMs(payload.generated_at);
          const lastMs = lastSavedGeneratedAtRef.current;

          if (!currentMs) {
            setMessage(
              `Read ${source} JSON but generated_at is invalid: ${String(payload.generated_at)}`,
            );
            return;
          }

          if (currentMs > lastMs) {
            const result = await FirestoreService.saveVibrationLog(
              user.uid,
              payload,
              "vibration_real",
            );

            if (result.success) {
              lastSavedGeneratedAtRef.current = currentMs;
              setMessage(isFirst ? `Monitoring started (${source}).` : `New vibration log saved (${source}).`);
              onDataSent?.();
            } else {
              setMessage(`Error: ${result.error}`);
            }
          } else {
            setMessage(
              `Read ${source} JSON (generated_at=${payload.generated_at}) — no newer log found.`,
            );
          }
        } catch (e: any) {
          setMessage(`Error: ${e?.message ?? String(e)}`);
        }
      };

      await tick(true);

      intervalRef.current = setInterval(() => {
        void tick(false);
      }, 60 * 1000);
    } catch (e: any) {
      setMessage(`Error: ${e?.message ?? String(e)}`);
      setIsMonitoring(false);
    } finally {
      setActionLoading(null);
    }
  };

  const stopRealSensorMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    setMessage("Monitoring stopped.");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <TouchableOpacity style={styles.floatingButton} onPress={() => setModalVisible(true)}>
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
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color="#64748b" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Test the app with simulated sensor data</Text>

            <View style={styles.toggleContainer}>
              <Cpu size={20} color="#64748b" strokeWidth={2} />
              <Text style={styles.toggleLabel}>Use Real Sensors</Text>
              {useRealSensors && isMonitoring ? (
                <Text style={styles.lockedToggleText}>Locked</Text>
              ) : (
                <Switch
                  value={useRealSensors}
                  onValueChange={handleToggle}
                  trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
                  thumbColor={useRealSensors ? "#fff" : "#f1f5f9"}
                  disabled={loading || actionLoading !== null}
                />
              )}
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

            {tickToast ? (
              <View style={styles.toastContainer}>
                <Text style={styles.toastText}>{tickToast}</Text>
              </View>
            ) : null}

            {loading && (
              <View style={styles.transitionLoading}>
                <ActivityIndicator color="#2563eb" size="large" />
                <Text style={styles.transitionText}>
                  {useRealSensors ? "Loading real sensor data..." : "Loading simulated data..."}
                </Text>
              </View>
            )}

            {!loading && useRealSensors && (
              <View style={styles.buttonContainer}>
                {!isMonitoring ? (
                  <TouchableOpacity
                    style={[styles.simButton, styles.startButton]}
                    onPress={startRealSensorMonitoring}
                    disabled={loading || actionLoading !== null}
                  >
                    {actionLoading === "start_monitoring" ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.simButtonText}>Starting…</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.simButtonText}>Start Monitoring</Text>
                        <Text style={styles.simButtonSubtext}>
                          Save inference JSON to vibration_real
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
                    disabled={loading || actionLoading !== null}
                  >
                    {actionLoading === "healthy" ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.simButtonText}>Sending…</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.simButtonText}>Healthy Data</Text>
                        <Text style={styles.simButtonSubtext}>Low Fault Risk</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.simButton, styles.warningButton]}
                    onPress={() => simulateData("warning")}
                    disabled={loading || actionLoading !== null}
                  >
                    {actionLoading === "warning" ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.simButtonText}>Sending…</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.simButtonText}>Warning Data</Text>
                        <Text style={styles.simButtonSubtext}>Around Threshold</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.simButton, styles.faultyButon]}
                    onPress={() => simulateData("faulty")}
                    disabled={loading || actionLoading !== null}
                  >
                    {actionLoading === "faulty" ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.simButtonText}>Sending…</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.simButtonText}>Faulty Data</Text>
                        <Text style={styles.simButtonSubtext}>High Fault Risk</Text>
                      </>
                    )}
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
  lockedToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
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
  toastContainer: {
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
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
  inlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
