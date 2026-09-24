import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { getUserMenus } from '../config/menuConfig';

// Import semua screen
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import JurnalGrScreen from '../screens/JurnalGrScreen';
import RekapJurnalGrScreen from '../screens/RekapJurnalGrScreen';
import RekapAbsenScreen from '../screens/RekapAbsenScreen';
import JurnalKlsScreen from '../screens/JurnalKlsScreen'; 
import AbsenKlsScreen from '../screens/AbsenKlsScreen';
import PetaKerawananScreen from '../screens/PetaKerawananScreen'; // Added Peta Kerawanan Screen

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CustomTabBar({ state, navigation }) {
  const { user, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const role = user?.role || 'Guru';
  const isWaliKelas = user?.isWaliKelas || false;
  const allRoleMenus = getUserMenus(role, isWaliKelas);
  const drawerMenus = allRoleMenus.filter((m) => m.id !== 'home');

  const currentRouteName = state.routes[state.index].name;

  const handleMenuPress = (menu) => {
    setIsMenuOpen(false);
    if (menu.screen === 'Dashboard') {
      navigation.navigate('Dashboard');
      return;
    }

    try {
      navigation.navigate(menu.screen);
    } catch (e) {
      Alert.alert('Informasi', `Fitur ${menu.title} sedang dalam pengembangan.`);
    }
  };

  return (
    <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {/* 1. Laci Menu */}
      {isMenuOpen && (
        <View style={styles.drawerPanel}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>
              Menu {isWaliKelas ? `(${role} + Wali Kelas)` : `(${role})`}
            </Text>
            <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerScrollView} nestedScrollEnabled={true}>
            <View style={styles.menuGrid}>
              {drawerMenus.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuCard}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon || 'grid-outline'} size={22} color="#2563EB" />
                  </View>
                  <Text style={styles.menuTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 2. Bar Navigasi Utama */}
      <View style={styles.bottomBarContainer}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setIsMenuOpen(false);
            navigation.navigate('Dashboard');
          }}
        >
          <Ionicons
            name={currentRouteName === 'Dashboard' && !isMenuOpen ? 'home' : 'home-outline'}
            size={24}
            color={currentRouteName === 'Dashboard' && !isMenuOpen ? '#2563EB' : '#64748B'}
          />
          <Text
            style={[
              styles.navLabel,
              currentRouteName === 'Dashboard' && !isMenuOpen && styles.navLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Ionicons
            name={isMenuOpen ? 'grid' : 'grid-outline'}
            size={24}
            color={isMenuOpen ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navLabel, isMenuOpen && styles.navLabelActive]}>
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={[styles.navLabel, { color: '#EF4444' }]}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="JurnalGuru"
        component={JurnalGrScreen}
        options={{
          headerShown: true,
          title: 'Jurnal & Absensi',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="RekapJurnal"
        component={RekapJurnalGrScreen}
        options={{
          headerShown: true,
          title: 'Data Jurnal',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="RekapAbsen"
        component={RekapAbsenScreen}
        options={{
          headerShown: true,
          title: 'Rekap Absen',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="JurnalKelas" 
        component={JurnalKlsScreen}
        options={{
          headerShown: true,
          title: 'Jurnal Kelas',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AbsenKelas" 
        component={AbsenKlsScreen}
        options={{
          headerShown: true,
          title: 'Absensi Kelas',
          headerTitleAlign: 'center',
        }}
      />
      {/* SCREEN PETA KERAWANAN */}
      <Tab.Screen
        name="PetaKerawanan" 
        component={PetaKerawananScreen}
        options={{
          headerShown: true,
          title: 'Peta Kerawanan',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainApp" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  drawerPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    maxHeight: 240,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerScrollView: {
    maxHeight: 190,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  menuCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  bottomBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  navLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  navLabelActive: { color: '#2563EB', fontWeight: 'bold' },
});