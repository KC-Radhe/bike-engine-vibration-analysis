import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
    const [loading, setLoading] = useState(false);
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        setLoading(true);
        await signOut();
        
    }
    return (
        <View style={styles.container}>
        <Text>HELLO WORLD</Text>
        <Text>welcome to home page</Text>
        <View >
        <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignOut}
            disabled={loading}
            >
            <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
             </View>

        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 18,
        
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
