import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Alert as RNAlert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { Alert } from "../../types/database";
import { useCollection } from "./_layout";

export default function AlertScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const { collectionName } = useCollection();

  const alertCol =
    collectionName === "vibration_real" ? "alerts" : "alerts_simulated";

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const queryObj = query(
      collection(db, alertCol),
      where("userId", "==", user.uid),
      where("isDismissed", "==", false),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      queryObj,
      (snapshot) => {
        const alertsData: Alert[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            alertType: data.alertType,
            severity: data.severity,
            title: data.title,
            message: data.message,
            vibraionLogId: data.vibrationLogId,
            isRead: data.isRead,
            isDismissed: data.isDismissed,
            createdAt: data.createdAt?.toDate(),
          };
        });

        setAlerts(alertsData);
        applyFilter(alertsData, filter);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error listening to alert logs:", error);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return () => unsubscribe();
  }, [user, alertCol, filter]);

  const applyFilter = (alertsData: Alert[], filterType: "all" | "unread") => {
    if (filterType === "unread") {
      setFilteredAlerts(alertsData.filter((alert) => !alert.isRead));
    } else {
      setFilteredAlerts(alertsData);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    applyFilter(alerts, filter);
  }, [filter, alerts]);

  const onRefresh = () => {
    setRefreshing(true);
    applyFilter(filteredAlerts, filter);
  };

  const markAsRead = async (alertId: string) => {
    try {
      await updateDoc(doc(db, alertCol, alertId), {
        isRead: true,
      });
    } catch (error) {
      console.error(`Error making alert as read: ${error}`);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, alertCol, alertId), {
        isDismissed: true,
      });
    } catch (error) {
      console.error(`Error dismisiing alert: ${error}`);
      RNAlert.alert("Error", "Failed to dismiss alert");
    }
  };

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "medium":
        return { bg: "#fef3c7", text: "#d97706", border: "#d97706" };
      case "high":
        return { bg: "#fed7aa", text: "#ea580c", border: "#ea580c" };
      case "critical":
        return { bg: "#fee2e2", text: "#dc2626", border: "#dc2626" };
    }
  };

  const getSeverityIcon = (severity: Alert["severity"]) => {
    const colors = getSeverityColor(severity);
    if (severity === "critical" || severity === "high") {
      return <AlertCircle size={20} color={colors.text} strokeWidth={2} />;
    }
    return <AlertTriangle size={20} color={colors.text} strokeWidth={2} />;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Alerts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* filter buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "unread" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("unread")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "unread" && styles.filterButtonTextActive,
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
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
            All ({alerts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={64} color="#cbd5e1" strokeWidth={1.5} />
          <Text style={styles.emptyText}>No Alerts</Text>
          <Text style={styles.emptySubtext}>
            {filter === "unread"
              ? "All caught up! No unread alerts"
              : "No alerts to display"}
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
          {filteredAlerts.map((alert) => {
            const severityColors = getSeverityColor(alert.severity);
            return (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertCard,
                  !alert.isRead && styles.alertCardUnread,
                  {
                    borderLeftColor: severityColors.border,
                    borderLeftWidth: 4,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertIconContainer}>
                    {getSeverityIcon(alert.severity)}
                  </View>
                  <View style={styles.alertTitleContainer}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: severityColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: severityColors.text },
                        ]}
                      >
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => dismissAlert(alert.id)}
                  >
                    <X size={20} color="#64748b" strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.alertMessage}>{alert.message}</Text>

                <View style={styles.alertFooter}>
                  <Text style={styles.alertTime}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </Text>
                  {!alert.isRead && (
                    <TouchableOpacity
                      style={styles.markReadButton}
                      onPress={() => markAsRead(alert.id)}
                    >
                      <CheckCircle size={16} color="#2563eb" strokeWidth={2} />
                      <Text style={styles.markReadText}>Mark as Read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  unreadBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
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
    paddingBottom: 100,
  },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  alertCardUnread: {
    backgroundColor: "#fefce8",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  alertIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  alertTitleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  alertTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563eb",
  },

  // text: {
  //   fontSize: 16,
  //   color: '#64748b',
  // },
});
