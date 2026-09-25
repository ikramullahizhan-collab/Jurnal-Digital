import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthContext } from '../context/AuthContext';
import { getUserMenus } from '../config/menuConfig';
import { callBackendAPI } from '../api/client'; // SESUAIKAN PATH INI DENGAN LOKASI FILE client.js ANDA

const getImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const regExp = /[-\w]{25,}/;
  const match = url.match(regExp);
  return match && match[0] ? `https://lh3.googleusercontent.com/d/${match[0]}` : url;
};

export default function DashboardScreen({ navigation }) {
  const { user, login } = useContext(AuthContext); 
  const insets = useSafeAreaInsets();
  const [hasImageError, setHasImageError] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [localPhotoUri, setLocalPhotoUri] = useState(getImageUrl(user?.foto));

  const role = user?.role || 'Guru';
  const isWaliKelas = user?.isWaliKelas || false;
  const namaKelasWali = user?.namaKelasWali || '';
  
  const allRoleMenus = getUserMenus(role, isWaliKelas);
  const gridMenus = allRoleMenus.filter((m) => m.id !== 'home');

  const handleMenuPress = (menu) => {
    try {
      navigation.navigate(menu.screen);
    } catch (e) {
      Alert.alert('Informasi', `Fitur ${menu.title} sedang dalam pengembangan.`);
    }
  };

  const handleUploadFoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto Anda.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.5,
    });

    if (pickerResult.canceled) return;

    const uri = pickerResult.assets[0].uri;
    setIsUploading(true);

    try {
      const base64Image = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Siapkan payload
      const payloadData = {
        nip: user?.nip, 
        base64: base64Image,
        mimeType: 'image/jpeg',
        filename: `PROFIL_${user?.nip}.jpg`
      };

      // Gunakan fungsi callBackendAPI dari client.js
      const result = await callBackendAPI('uploadFotoProfil', payloadData);

      if (result.success) {
        Alert.alert('Berhasil', 'Foto profil berhasil diperbarui.');
        setLocalPhotoUri(getImageUrl(result.url)); 
        setIsPhotoModalVisible(false);
      } else {
        Alert.alert('Gagal', result.message || 'Terjadi kesalahan saat mengunggah foto.');
      }

    } catch (error) {
      Alert.alert('Error', 'Gagal mengunggah foto. Pastikan koneksi internet stabil.');
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
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

            <TouchableOpacity 
              style={styles.avatarBorder} 
              onPress={() => setIsPhotoModalVisible(true)}
              activeOpacity={0.7}
            >
              {localPhotoUri && !hasImageError ? (
                <Image 
                  source={{ uri: localPhotoUri }} 
                  style={styles.avatarImage} 
                  resizeMode="cover"
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <Ionicons name="person" size={30} color="#E0E7FF" />
              )}
            </TouchableOpacity>
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
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor || '#EFF6FF' }]}>
                  <Ionicons name={item.icon || 'grid-outline'} size={24} color={item.color || '#2563EB'} />
                </View>
                <Text style={styles.menuTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Preview Foto */}
      <Modal
        visible={isPhotoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Preview Foto Profil</Text>
            
            <View style={styles.modalImageContainer}>
              {localPhotoUri && !hasImageError ? (
                <Image 
                  source={{ uri: localPhotoUri }} 
                  style={styles.modalImagePreview} 
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={80} color="#94A3B8" />
              )}
            </View>

            <TouchableOpacity 
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]} 
              onPress={handleUploadFoto}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="camera-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.uploadButtonText}>
                {isUploading ? 'Mengunggah...' : 'Upload Foto Baru'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => setIsPhotoModalVisible(false)}
              disabled={isUploading}
            >
              <Text style={styles.closeModalText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 20,
  },
  modalImageContainer: {
    width: 140,
    height: 210, 
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalImagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  uploadButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeModalButton: {
    width: '100%',
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
});