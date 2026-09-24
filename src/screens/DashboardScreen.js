import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getUserMenus } from '../config/menuConfig';

const getImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const regExp = /[-\w]{25,}/;
  const match = url.match(regExp);
  return match && match[0] ? `https://lh3.googleusercontent.com/d/${match[0]}` : url;
};

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [hasImageError, setHasImageError] = useState(false);

  const role = user?.role || 'Guru';
  const isWaliKelas = user?.isWaliKelas || false;
  const namaKelasWali = user?.namaKelasWali || '';
  
  const allRoleMenus = getUserMenus(role, isWaliKelas);
  const gridMenus = allRoleMenus.filter((m) => m.id !== 'home');
  const photoUri = getImageUrl(user?.foto);

  const handleMenuPress = (menu) => {
    try {
      navigation.navigate(menu.screen);
    } catch (e) {
      Alert.alert('Informasi', `Fitur ${menu.title} sedang dalam pengembangan.`);
    }
  };

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Kartu Profil */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.profileInfo}>
              <Text style={styles.greeting}>Selamat Datang,</Text>
              <Text style={styles.name}>{user?.nama || 'Pengguna'}</Text>
              <Text style={styles.roleDetail}>NIP: {user?.nip || '-'}</Text>
              {isWaliKelas && (
                <Text style={styles.roleDetail}>Wali Kelas ({namaKelasWali})</Text>
              )}
            </View>

            <View style={styles.avatarBorder}>
              {photoUri && !hasImageError ? (
                <Image 
                  source={{ uri: photoUri }} 
                  style={styles.avatarImage} 
                  resizeMode="cover"
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <Ionicons name="person" size={30} color="#E0E7FF" />
              )}
            </View>
          </View>
        </View>

        {/* Menu Layanan Utama */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>
            Menu Utama {isWaliKelas ? `(${role} + Wali Kelas)` : `(${role})`}
          </Text>

          <View style={styles.menuGrid}>
            {gridMenus.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuCard}
                onPress={() => handleMenuPress(item)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon || 'grid-outline'} size={24} color="#2563EB" />
                </View>
                <Text style={styles.menuTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { flex: 1 },
  avatarBorder: {
    width: 50,
    height: 75,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { color: '#E0E7FF', fontSize: 12 },
  name: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginVertical: 2 },
  roleDetail: { color: '#C7D2FE', fontSize: 11, fontWeight: '500', marginTop: 1 },
  menuSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  menuCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
});