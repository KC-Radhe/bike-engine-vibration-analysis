import { AlertTriangle, CheckCircle2, LogOut, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SimulatorButton } from "../../components/SimulatorButton";
import { useAuth } from "../../contexts/AuthContext";
import { FirestoreService } from "../../services/firestoreService";
import { HealthSummary, VibrationLog } from "../../types/database";


export default function DashboardScreen() {
    const { signOut, user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
    const [latestLog, setLatestLog] = useState<VibrationLog | null>(null);

    const loadData = useCallback( async () => {
        if (!user) return;

        try {
            const [summary, log] = await Promise.all([
                FirestoreService.getTodayHealthSummary(user.uid),
                FirestoreService.getLatestVibrationLog(user.uid),
            ]);
            setHealthSummary(summary);
            setLatestLog(log);
        } catch (error) {
            console.error('Error loading dashboad data: ', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect( () => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
    };
    
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': 
                return { bg: '#dcfce7', text: '#16a34a' };
            case 'warning':
                return { bg: '#fef3c7', text: '#d97706' };
            case 'faulty': 
                return { bg: '#fee2e2', text: '#dc2626' };
            default: 
                return { bg: '#e2e8f0', text: '#64748b' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 size={24} color='#16a34a' strokeWidth={2} />;
            case 'warning':
                return <AlertTriangle size={24} color='#d97706' strokeWidth={2} />;
            case 'faulty':
                return <AlertTriangle size={24} color='#dc2626' strokeWidth={2} />;
            default:
                return <RefreshCw size={24} color='#64748b' strokeWidth={2} />;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer} >
                    <ActivityIndicator size='large' color='#2563eb' />
                </View>
            </SafeAreaView>
        )
    };

    const currentStatus = latestLog?.healthStatus || null;
    const statusColor = getStatusColor(currentStatus);
    
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
                <View style={[styles.statusCard, {backgroundColor: statusColor.bg }]}>
                    <View style={styles.statusHeader}>
                        <Text style={styles.statusTitle}>Current Status</Text>
                        {currentStatus? (
                        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }, ]}>
                            {getStatusIcon(currentStatus)}
                            <Text style={[styles.statusBadgeText, { color: statusColor.text }, ]}>
                                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                            </Text>
                        </View>
                        ) : (
                        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }, ]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor.text }, ]}>
                                NO DATA!!!
                            </Text>
                            {getStatusIcon(currentStatus)}
                        </View>
                        )}
                    </View>
                   
                    <Text style={styles.statusDescription}>
                        {latestLog? (
                            <>
                                Last readings: {' '}
                                <Text style={styles.metricValue}>
                                    {latestLog.magnitude.toFixed(2)}m/s²
                                </Text> {' '}
                                at{' '} 
                                <Text style={styles.metricValue}>
                                    {latestLog.frequency.toFixed(2)}Hz
                                </Text>
                            </>
                        ) :
                            `No readings yet - Start Monitoring`
                        }
                    </Text>
                    {latestLog && (
                        <Text style={styles.statusTimestamp} >
                            {new Date(latestLog.timestamp).toLocaleString()}
                        </Text>
                    )}
                </View>

                {latestLog? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Latest Metrics</Text>
                        <View style={styles.metricsGrid} >
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Vibration X</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.vibrationX.toFixed(3)}m/s²
                                </Text>
                            </View>
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Vibration Y</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.vibrationY.toFixed(3)}m/s²
                                </Text>
                            </View>
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Vibration Z</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.vibrationZ.toFixed(3)}m/s²
                                </Text>
                            </View>
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Magnitude</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.magnitude.toFixed(3)}m/s²
                                </Text>
                            </View>
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Frequency</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.frequency.toFixed(1)}Hz
                                </Text>
                            </View>
                            <View style={styles.metricItem} >
                                <Text style={styles.metricLabel}>Confidence</Text>
                                <Text style={styles.metricValue} >
                                    {latestLog.confidenceLevel.toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
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
                )}

                {/* todays overview */}
                <View style={styles.section} >
                    <Text style={styles.sectionTitle}>Today`s Overview</Text>
                    <View style={styles.overviewGrid} >
                        <View style={styles.overviewItem} >
                            <View style={[styles.overviewDot, { backgroundColor: '#10b981'}]} />
                            <Text style={styles.overviewLabel} >Healthy</Text>
                            <Text style={styles.overviewValue}> {healthSummary?.healthyCount || 0} </Text>
                        </View>
                        <View style={styles.overviewItem} >
                            <View style={[styles.overviewDot, { backgroundColor: '#f59e0b'}]} />
                            <Text style={styles.overviewLabel} >Warning</Text>
                            <Text style={styles.overviewValue}> {healthSummary?.warningCount || 0} </Text>
                        </View>
                        <View style={styles.overviewItem} >
                            <View style={[styles.overviewDot, { backgroundColor: '#ef4444'}]} />
                            <Text style={styles.overviewLabel} >Faulty</Text>
                            <Text style={styles.overviewValue}> {healthSummary?.faultyCount || 0} </Text>
                        </View>
                    </View>  

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Total Readings</Text>
                            <Text style={styles.statValue}>
                                {healthSummary?.totalReadings || 0}
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Health Score</Text>
                            <Text style={styles.statValue}>
                                {healthSummary?.overallHealthLevel.toFixed(0) || 0}%
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Avg Vibration</Text>
                            <Text style={styles.statValue}> 
                                {healthSummary?.avgVibration.toFixed(2) || '0.00'}m/s²
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Avg Frequency</Text>
                            <Text style={styles.statValue}>
                                {healthSummary?.avgFrequency.toFixed(2) || '0.00'}Hz
                            </Text>
                        </View>
                    </View> 
                </View>

            </ScrollView>
            <SimulatorButton onDataSent={loadData} />
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusHealthy: {
        backgroundColor: '#dcfcdc',
    },
    statusBadgeText: {
        fontSize: 18,
        fontWeight: '600',
    },
    statusDescription: {
        fontSize: 14,
        color: '#64748b',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
     overviewGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderRadius: 15,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    overviewItem: {
        alignItems: 'center',
    },
    overviewDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    overviewLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    overviewValue: {
        fontSize: 20,
        fontWeight: '700', 
        color: '#1e293b',
    },
    statusTimestamp: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricItem: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
});