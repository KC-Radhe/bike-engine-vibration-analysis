import { LogOut, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";


export default function DashboardScreen() {
    const { signOut } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState<string>('');

    const onRefresh = async () => {
        setRefreshing(true);
        //TODO: fetch data to show on dashboard
        setTimeout( () => setRefreshing(false), 3000);
        //TODO: check the vibration and then set status
        setStatus('Healthy');
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header} >
                <View>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.headerSubtitle} >Engine Vibration Overview</Text>
                </View>
                <TouchableOpacity onPress={() => signOut()} style={styles.logoutButton}>
                        <LogOut size={24} color='#64748b' strokeWidth={2} />
                </TouchableOpacity>
            </View>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}  />
                }
             >
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <Text style={styles.statusTitle}>Current Status</Text>
                        <View style={[styles.statusBadge, styles.statusHealthy, ]}>
                            <Text style={styles.statusBadgeText}>{status}</Text>
                        </View>
                    </View>
                    <Text style={styles.statusDescription}>
                        {/* TODO: change description acc to status */}
                        All systems operating normally
                    </Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Readings</Text>
                        <Text style={styles.statValue}>0</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Health Score</Text>
                        <Text style={styles.statValue}>0%</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Vibration</Text>
                        <Text style={styles.statValue}>0 m/s²</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Temperature</Text>
                        <Text style={styles.statValue}>0°C</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Latest Metrics</Text>
                    <View style={styles.emptyState}>
                        <RefreshCw size={48} color='#cbd5e1' strokeWidth={1.5} />
                        <Text style={styles.emptyStateText}>No data available</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Start monitoring to see engine health metrics
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2563eb',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    logoutButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 15,
    },
    statusHealthy: {
        backgroundColor: '#dcfcdc',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#16a34a',
    },
    statusDescription: {
        fontSize: 14,
        color: '#64748b',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 5,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        borderWidth: 2,
        borderColor: '#2563eb',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'center',
    },
});