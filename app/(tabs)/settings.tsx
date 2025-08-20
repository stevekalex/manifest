import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SettingsScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const glassMorphic = useThemeColor({}, 'glassMorphic');
  const glassMorphicBorder = useThemeColor({}, 'glassMorphicBorder');
  const tintColor = useThemeColor({}, 'tint');
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = React.useState(colorScheme === 'dark');
  const [notifications, setNotifications] = React.useState(true);

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: darkMode,
          onPress: () => setDarkMode(!darkMode),
          isSwitch: true,
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          value: notifications,
          onPress: () => setNotifications(!notifications),
          isSwitch: true,
        },
      ],
    },
    {
      title: 'Audio',
      items: [
        {
          icon: 'volume-high-outline',
          label: 'Default Volume',
          value: '70%',
          onPress: () => {},
        },
        {
          icon: 'timer-outline',
          label: 'Delay Between Affirmations',
          value: '3s',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Version',
          value: '1.0.0',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => {},
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy Policy',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              
              <View style={[
                styles.sectionContent,
                { backgroundColor: glassMorphic, borderColor: glassMorphicBorder }
              ]}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.settingItem,
                      itemIndex < section.items.length - 1 && styles.settingItemBorder
                    ]}
                    onPress={item.onPress}
                    disabled={item.isSwitch}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name={item.icon as any} size={24} color={iconColor} />
                      <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
                    </View>
                    
                    <View style={styles.settingRight}>
                      {item.isSwitch ? (
                        <Switch
                          value={item.value as boolean}
                          onValueChange={item.onPress}
                          trackColor={{ false: '#767577', true: tintColor }}
                          thumbColor={item.value ? '#f4f3f4' : '#f4f3f4'}
                        />
                      ) : (
                        <>
                          {item.value && (
                            <ThemedText type="caption" style={styles.settingValue}>
                              {item.value as string}
                            </ThemedText>
                          )}
                          <Ionicons name="chevron-forward" size={20} color={iconColor} />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.logoutButton, { borderColor: '#FF3B30' }]}>
              <ThemedText style={[styles.logoutText, { color: '#FF3B30' }]}>
                Sign Out
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 56,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 16,
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    marginRight: 8,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});