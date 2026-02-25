import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { VibrationLog } from "../../types/database";
import { useCollection } from "./_layout";

export default function HistoryScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VibrationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<VibrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | "all">("all");
  const { collectionName } = useCollection();

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const queryObj = query(
      collection(db, collectionName),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
    );

    const unsubscribe = onSnapshot(
      queryObj,
      (querySnapshot) => {
        const logsData: VibrationLog[] = querySnapshot.docs.map((doc) => {
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

        setLogs(logsData);
        applyFilter(logsData, filter);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error listening to history logs:", error);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return () => unsubscribe();
  }, [user, collectionName, filter]);

  const applyFilter = (logsData: VibrationLog[], filter: string | "all") => {
    if (filter === "all") {
      setFilteredLogs(logsData);
    } else {
      setFilteredLogs(logsData.filter((log) => log.healthStatus === filter));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    applyFilter(logs, filter);
  }, [logs, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    applyFilter(logs, filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "warning":
        return { bg: "#fef3c7", text: "#d97706" };
      case "faulty":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#e2e8f0", text: "#64748b" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 size={24} color="#16a34a" strokeWidth={2} />;
      case "warning":
        return <AlertTriangle size={24} color="#d97706" strokeWidth={2} />;
      case "faulty":
        return <AlertTriangle size={24} color="#dc2626" strokeWidth={2} />;
      default:
        return <RefreshCw size={24} color="#64748b" strokeWidth={2} />;
    }
  };

  const groupLogsByDate = (logs: VibrationLog[]) => {
    const grouped: { [key: string]: VibrationLog[] } = {};

    logs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const groupedLogs = groupLogsByDate(filteredLogs);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "all" && styles.filterButtonTextActive,
              ]}
            >
              All ({logs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "healthy" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("healthy")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "healthy" && styles.filterButtonTextActive,
              ]}
            >
              Healthy (
              {logs.filter((log) => log.healthStatus === "healthy").length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "warning" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("warning")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "warning" && styles.filterButtonTextActive,
              ]}
            >
              Warning (
              {logs.filter((log) => log.healthStatus === "warning").length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "faulty" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("faulty")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "faulty" && styles.filterButtonTextActive,
              ]}
            >
              Faulty (
              {logs.filter((log) => log.healthStatus === "faulty").length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Filter size={64} color="#cbd5e1" strokeWidth={1.5} />
          <Text style={styles.emptyText}>No Logs Found</Text>
          <Text style={styles.emptySubtext}>
            {filter === "all"
              ? "Start monitoring to see history"
              : `No ${filter} readings yet`}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {dateLogs.map((log) => {
                const statusColors = getStatusColor(log.healthStatus);
                return (
                  <View
                    key={log.id}
                    style={[
                      styles.logCard,
                      { borderLeftColor: statusColors.bg, borderLeftWidth: 6 },
                    ]}
                  >
                    <View style={styles.logHeader}>
                      <View style={styles.logTime}>
                        <Text style={styles.timeText}>
                          {new Date(log.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg },
                        ]}
                      >
                        {getStatusIcon(log.healthStatus)}
                        <Text
                          style={[
                            styles.statusText,
                            { color: statusColors.text },
                          ]}
                        >
                          {log.healthStatus.charAt(0).toUpperCase() +
                            log.healthStatus.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logMetrics}>
                      <View style={styles.metricRow}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Magnitude</Text>
                          <Text style={styles.metricValue}>
                            {log.magnitude.toFixed(3)} m/s²
                          </Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Frequency</Text>
                          <Text style={styles.metricValue}>
                            {log.frequency.toFixed(1)} Hz
                          </Text>
                        </View>
                      </View>
                      <View style={styles.confidenceRow}>
                        <Text style={styles.confidenceLabel}>Confidence:</Text>
                        <Text style={styles.confidenceValue}>
                          {log.confidenceLevel.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563eb",
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginRight: 8,
  },
  filterButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#2563eb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  confidenceLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
});
