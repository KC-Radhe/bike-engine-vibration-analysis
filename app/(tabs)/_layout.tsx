import { Tabs } from "expo-router";
import { Activity, Bell, History, LayoutDashboard } from "lucide-react-native";
import { createContext, useContext, useState } from "react";

const CollectionContext = createContext<any>(null);

const CollectionProvider = ({ children }) => {
  const [useSimulated, setUseSimulated] = useState(false);
  const collectionName = useSimulated ? "vibration_simulated" : "vibrationLogs";

  return (
    <CollectionContext.Provider value={{ setUseSimulated, collectionName }}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => useContext(CollectionContext);

export default function TabLayout() {
  return (
    <CollectionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            paddingVertical: 10,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ size, color }) => (
              <LayoutDashboard size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tabs.Screen
          name="real_time"
          options={{
            title: "Real-time",
            tabBarIcon: ({ size, color }) => (
              <Activity size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ size, color }) => (
              <History size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tabs.Screen
          name="alert"
          options={{
            title: "Alerts",
            tabBarIcon: ({ size, color }) => (
              <Bell size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      </Tabs>
    </CollectionProvider>
  );
}
