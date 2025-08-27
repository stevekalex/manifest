import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function TabLayout() {
  const backgroundColor = useThemeColor({}, 'background');
  
  // Bold/prominent color for active tab
  const tintColorSelected = useThemeColor({ light: '#0a7ea4', dark: '#fff' }, 'tint');
  
  // Light/muted color for inactive tabs
  const tintColorInactive = useThemeColor({ 
    light: 'rgba(10, 126, 164, 0.3)', // Light blue with opacity
    dark: 'rgba(255, 255, 255, 0.4)'  // Light white with opacity
  }, 'tabIconDefault');

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: tintColorSelected,
            tabBarInactiveTintColor: tintColorInactive,
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
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
            tabBarActiveLabelStyle: {
              fontWeight: '700', // Bold for active tab
              fontSize: 12,
            },
            tabBarInactiveLabelStyle: {
              fontWeight: '400', // Light for inactive tabs
              fontSize: 12,
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
    </ErrorBoundary>
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