import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Import icon library

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: 'white', paddingBottom: 5 }, // Styling the tab bar
        tabBarActiveTintColor: 'blue', // Active tab color
        tabBarInactiveTintColor: 'gray', // Inactive tab color
        headerShown: false, // Hide header if not needed
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      
      {/* Docs Reader Tab */}
      <Tabs.Screen
        name="ReadDocs"
        options={{
          title: 'Docs Reader',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" color={color} size={size} />
          ),
        }}
      />
      
      {/* SOS Tab */}
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" color={color} size={size} />
          ),
        }}
      />
      
      {/* Navigation Tab with Navigation Icon */}
      <Tabs.Screen
        name="Navigation"
        options={{
          title: 'Navigate',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate" color={color} size={size} /> // Navigation symbol
          ),
        }}
      />
    </Tabs>
  );
}
