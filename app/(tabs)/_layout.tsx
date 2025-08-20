import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const tintColorLight = useThemeColor({ light: '#0a7ea4', dark: '#fff' }, 'tabIconDefault');
  const tintColorSelected = useThemeColor({ light: '#0a7ea4', dark: '#fff' }, 'tabIconSelected');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tintColorSelected,
          tabBarInactiveTintColor: tintColorLight,
          tabBarStyle: {
            backgroundColor,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 90,
            paddingBottom: 25,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          headerShown: false,
        }}
        sceneContainerStyle={[
          { backgroundColor },
          styles.sceneContainer
        ]}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'My library',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sceneContainer: {
    paddingBottom: 90, // Tab bar height
  },
});