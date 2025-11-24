import { router } from "expo-router";
import { Activity } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";


export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        };

        setLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            Alert.alert('Login Failed', error.message);
            setLoading(false);
        } else {
            router.replace('/(tabs)/home');
        };
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
         >
            <View style={styles.content} >
                <View style={styles.header} >
                    <Activity size={48} color='#2563eb' strokeWidth={2} />
                    <Text style={styles.title}>Vibra Feel</Text>
                    <Text style={styles.subtitle}>Feel The Vibration, Protect The Ride</Text>
                </View>

                <View style={styles.form} >
                    <TextInput
                        style={styles.input}
                        placeholder='Email'
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize='none'
                        keyboardType='email-address'
                        editable={!loading}
                        placeholderTextColor='#94a3b8'
                     />

                    <TextInput
                        style={styles.input}
                        placeholder='Password'
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!loading}
                        placeholderTextColor='#94a3b8'
                     />
                    
                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                     >
                        {loading ? (
                            <ActivityIndicator color='#fff' />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={ () => router.push('/(auth)/register')}
                        disabled={loading}
                     >
                        <Text style={styles.linkText} >
                            Do not have an account? Sign Up
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    )

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1e293b',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    linkText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '500',
    },
});