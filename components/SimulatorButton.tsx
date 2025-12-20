import { X, Zap } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { FirestoreService } from "../services/firestoreService";
import { genereateSimulatedData } from "../utils/sensorSimulator";


interface SimulatorButtonProps {
    onDataSent?: () => void;
}

export function SimulatorButton({ onDataSent }: SimulatorButtonProps) {
    const { user } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const simulateData = async (condition: 'healthy' | 'warning' | 'faulty') => {
        if (!user) return;
        setLoading(true);
        setMessage('');

        const data = genereateSimulatedData(condition);
        const result = await FirestoreService.saveVibrationLog(user.uid, data);

        if (result.success) {
            const c = condition.charAt(0).toUpperCase() + condition.slice(1);
            setMessage(`${c} data sent successfully.`);
            onDataSent?.();
        } else {
            setMessage(`Error: ${result.error}`);
        }
        setLoading(false);

        setTimeout( () => {
            setModalVisible(false);
            setMessage('');
        }, 2000);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setModalVisible(true)}
             >
                <Zap size={24} color='#fff' strokeWidth={2} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={ () => setModalVisible(false)}
             >
                <View style={styles.modalOverlay} >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sensor Simulator</Text>
                            <TouchableOpacity
                                onPress={ () => setModalVisible(false)}
                                style={styles.closeButton}
                                >
                                <X size={24} color='#64748b' strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Test the app with simulated sensor data
                        </Text>

                        {message ? (
                            <View style={styles.messageContainer}>
                                <Text style={styles.messageText}>{message}</Text>
                            </View>
                        ) : null}

                        <View style={styles.buttonContainer} >
                            <TouchableOpacity
                                style={[styles.simButton, styles.healthyButton]}
                                onPress={ () => simulateData('healthy')}
                                disabled={loading}
                             >
                                {loading ? (
                                    <ActivityIndicator color='#fff' />
                                ) : (
                                    <>
                                        <Text style={styles.simButtonText} >Healthy Data</Text>
                                        <Text style={styles.simButtonSubtext}>Low Vibration & Frequency, Normal</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.simButton, styles.warningButton]}
                                onPress={ () => simulateData('warning')}
                                disabled={loading}
                             >
                                {loading ? (
                                    <ActivityIndicator color='#fff' />
                                ) : (
                                    <>
                                        <Text style={styles.simButtonText} >Warning Data</Text>
                                        <Text style={styles.simButtonSubtext}>Medium Vibration & Frequency</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.simButton, styles.faultyButon]}
                                onPress={ () => simulateData('faulty')}
                                disabled={loading}
                             >
                                {loading ? (
                                    <ActivityIndicator color='#fff' />
                                ) : (
                                    <>
                                        <Text style={styles.simButtonText} >Faulty Data</Text>
                                        <Text style={styles.simButtonSubtext}>High Vibration & Frequency, Normal</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
};

const styles = StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        right: 30,
        bottom: 60,
        width: 60,
        height: 60,
        borderRadius: 28,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2562e2',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderColor: '#2563eb',
        borderWidth: 4,
        padding: 24,
        width: '90%',
        shadowColor: '#040404ff',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 4,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    closeButton: {
        padding: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 24,
    },
    messageContainer: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    messageText: {
        fontSize: 14,
        color: '#2563eb',
        textAlign: 'center',
        fontWeight: '600',
    },
    buttonContainer: {
        gap: 12,
    },
    simButton: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    healthyButton: {
        backgroundColor: '#10b981',
    },
    warningButton: {
        backgroundColor: '#f59e0b',
    },
    faultyButon: {
        backgroundColor: '#ef4444',
    },
    simButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    simButtonSubtext: {
        fontSize: 13,
        color: '#fff',
        opacity: 0.9,
    },
});