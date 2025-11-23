import { router, Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";


function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect( () => {
    if(!loading) {
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/register');
      };
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
      {/* <Stack.Screen name="(auth)/login" /> */}
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(tabs)/home" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
  
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style='auto' />
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
});