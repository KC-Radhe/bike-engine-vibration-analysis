import { router, Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, Info, XCircle } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Toast, { BaseToast } from 'react-native-toast-message';
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect( () => {
    if(!loading) {
      if (!user) return router.replace('/(auth)/login');
      router.replace('/(tabs)');
    };
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer} >
        <ActivityIndicator size='large' color='#2563eb' />
      </View>
    );
  };

  return (
    <Stack screenOptions={{ headerShown: false}} >
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
  
}

const toastConfig = {
  error: (props) => (
     <BaseToast {...props}
      style= {[styles.toastNoti, {borderLeftColor: '#dc2626', backgroundColor: '#fee2e2'}]}
      text1Style= {[styles.text1Style, {color: '#dc2626'}]}
      text2Style= {[styles.text2Style, {color: '#dc2626'}]}
      renderLeadingIcon={() => <XCircle color='#dc2626' size={36} />}
     />
  ),
  warning: (props) => (
     <BaseToast {...props}
      style= {[styles.toastNoti, {borderLeftColor: '#f59e0b', backgroundColor: '#fef3c7'}]}
      text1Style= {[styles.text1Style, {color: '#f59e0b'}]}
      text2Style= {[styles.text2Style, {color: '#f59e0b'}]}
      renderLeadingIcon={() => <XCircle color='#f59e0b' size={36} />}
     />
  ),
  success: (props) => (
    <BaseToast {...props}
      style= {[styles.toastNoti, {borderLeftColor: '#22c55e', backgroundColor: '#dcfce7'}]}
      text1Style= {[styles.text1Style, {color: '#22c55e'}]}
      text2Style= {[styles.text2Style, {color: '#22c55e'}]}
      renderLeadingIcon={() => <CheckCircle color='#22c55e' size={36} />}
     />
  ),
  info: (props) => (
    <BaseToast {...props}
      style= {[styles.toastNoti, {borderLeftColor: '#3b82f6', backgroundColor: '#dbeafe'}]}
      text1Style= {[styles.text1Style, {color: '#3b82f6'}]}
      text2Style= {[styles.text2Style, {color: '#3b83f6'}]}
      renderLeadingIcon={() => <Info color='#3b83f6' size={36} />}
     />
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style='auto' />
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  toastNoti: {
    height: 65,
    paddingHorizontal: 15,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text1Style: {
    fontSize: 15,
    fontWeight: '700',
  },
  text2Style: {
    fontSize: 13,
    fontWeight: '500',
  },
});