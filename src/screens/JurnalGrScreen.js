import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callBackendAPI } from '../api/client';

export default function JurnalScreen({ route, navigation }) {
  // State Form
  const [rombel, setRombel] = useState('');
  const [mapel, setMapel] = useState('');
  const [jamKe, setJamKe] = useState('');
  const [materi, setMateri] = useState('');
  const [uraian, setUraian] = useState('');
  const [hambatan, setHambatan] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoBase64, setFotoBase64] = useState('');

  // State Data Master & Presensi
  const [listRombel, setListRombel] = useState([]);
  const [listMapel, setListMapel] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [waliKelas, setWaliKelas] = useState('');
  const [presensi, setPresensi] = useState({});
  const [namaGuru, setNamaGuru] = useState('Guru Pengajar');

  // State Status Koneksi Database
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  // State Modal Dropdown
  const [modalRombel, setModalRombel] = useState(false);
  const [modalMapel, setModalMapel] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const sessionString = await AsyncStorage.getItem('userSession'); 
        if (sessionString) {
          const userData = JSON.parse(sessionString);
          const namaAsli = userData.nama || userData?.data?.nama || 'Guru Pengajar';
          setNamaGuru(namaAsli);
        }
      } catch (error) {
        console.log('Gagal mengambil nama guru dari storage:', error);
      }
    };
    getProfile();
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (rombel) {
      fetchSiswaData();
    }
  }, [rombel, mapel]);

  const fetchMasterData = async () => {
    setLoadingMaster(true);
    try {
      const res = await callBackendAPI('getFormData');

      // Peningkatan deteksi array rombel dan mapel agar tidak mudah gagal
      const rawRombel = res?.data?.rombel || res?.data?.kelas || res?.kelas || res?.rombel || [];
      const rawMapel = res?.data?.mapel || res?.mapel || [];

      const cleanRombel = Array.isArray(rawRombel)
        ? rawRombel.map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              return {
                id: String(item.id || item.idKelas || item.nama || item.namaKelas || idx),
                nama: String(item.nama || item.namaKelas || item.id || item.idKelas || `Kelas ${idx + 1}`),
              };
            }
            return { id: String(item || ''), nama: String(item || '') };
          }).filter((x) => x.id !== '')
        : [];

      const cleanMapel = Array.isArray(rawMapel)
        ? rawMapel.map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              return {
                id: String(item.id || item.idMapel || item.nama || item.namaMapel || idx),
                nama: String(item.nama || item.namaMapel || item.id || item.idMapel || `Mapel ${idx + 1}`),
              };
            }
            return { id: String(item || ''), nama: String(item || '') };
          }).filter((x) => x.id !== '')
        : [];

      setListRombel(cleanRombel);
      setListMapel(cleanMapel);
    } catch (error) {
      console.log('Gagal memuat data master:', error);
    } finally {
      setLoadingMaster(false);
    }
  };

  const fetchSiswaData = async () => {
    setLoadingSiswa(true);
    try {
      const mapelStr = String(mapel || '').toLowerCase();
      const isMapelAgama = mapelStr.includes('agama') || mapelStr.includes('pai');

      const res = await callBackendAPI('getSiswa', { 
        rombel, 
        idKelas: rombel,
        mapel,
        idMapel: mapel,
        filterAgama: isMapelAgama 
      });

      const namaWali = res?.waliKelas || res?.data?.waliKelas || res?.wali || '-';
      setWaliKelas(namaWali);

      let listSiswa = [];
      if (Array.isArray(res)) listSiswa = res;
      else if (Array.isArray(res?.data)) listSiswa = res.data;
      else if (Array.isArray(res?.data?.data)) listSiswa = res.data.data;

      if (listSiswa.length > 0) {
        setSiswa(listSiswa);
        const initialPresensi = {};
        listSiswa.forEach((item, idx) => {
          const keyId = String(item.idSiswa || item.id || idx);
          initialPresensi[keyId] = 'H';
        });
        setPresensi(initialPresensi);
      } else {
        setSiswa([]);
      }
    } catch (error) {
      console.log('Gagal memuat data siswa:', error);
    } finally {
      setLoadingSiswa(false);
    }
  };

  const setStatusPresensi = (siswaId, status) => {
    setPresensi((prev) => ({
      ...prev,
      [siswaId]: status,
    }));
  };

  const ambilFoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin akses kamera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFoto(result.assets[0].uri);
        setFotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengambil foto.');
    }
  };

  const handleSimpan = async () => {
    if (!rombel) return Alert.alert('Peringatan', 'Pilih Rombel / Kelas terlebih dahulu');
    if (!mapel) return Alert.alert('Peringatan', 'Pilih Mata Pelajaran terlebih dahulu');
    if (!jamKe.trim()) return Alert.alert('Peringatan', 'Jam Ke - (Mulai - Selesai) wajib diisi');
    if (!materi.trim()) return Alert.alert('Peringatan', 'Materi Pokok Pembelajaran wajib diisi');
    if (!uraian.trim()) return Alert.alert('Peringatan', 'Uraian Singkat Kegiatan wajib diisi');

    setLoading(true);

    const dataAbsensi = Object.keys(presensi).map((idSiswaKey) => ({
      idSiswa: idSiswaKey,
      status: presensi[idSiswaKey] || 'H',
      ket: '',
    }));

    const payload = {
      namaGuru: namaGuru, 
      idKelas: rombel,
      idMapel: mapel,
      jamKe: jamKe.trim(),
      materi: materi.trim(),
      uraian: uraian.trim(),
      hambatan: hambatan.trim(),
      koordinat: '-',
      dataAbsensi: dataAbsensi,
      fotoBase64: fotoBase64 || '',
    };

    try {
      const res = await callBackendAPI('simpanJurnal', payload);
      setLoading(false);

      if (res && (res.status === 'success' || res.success)) {
        Alert.alert('Berhasil', 'Jurnal pembelajaran berhasil disimpan', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Gagal', res?.message || 'Gagal menyimpan jurnal');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Kesalahan', 'Terjadi kesalahan sistem. Silakan coba lagi.');
    }
  };

  const optionsStatus = ['H', 'S', 'I', 'A', 'B'];
  const isMapelAgamaCurrent = String(mapel || '').toLowerCase().includes('agama') || String(mapel || '').toLowerCase().includes('pai');

  const isRombelDisabled = loadingMaster || listRombel.length === 0;
  const isMapelDisabled = loadingMaster || listMapel.length === 0;

  const getRombelText = () => {
    if (loadingMaster) return 'Menghubungkan ke database...';
    if (listRombel.length === 0) return 'Gagal memuat data kelas';
    if (!rombel) return '-- Pilih Rombel / Kelas --';
    const found = listRombel.find((r) => r.id === rombel);
    return found ? found.nama : rombel;
  };

  const getMapelText = () => {
    if (loadingMaster) return 'Menghubungkan ke database...';
    if (listMapel.length === 0) return 'Gagal memuat data mapel';
    if (!mapel) return '-- Pilih Mata Pelajaran --';
    const found = listMapel.find((m) => m.id === mapel);
    return found ? found.nama : mapel;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* HEADER DENGAN TOMBOL REFRESH */}
      <View style={styles.headerTitleBox}>
        <Text style={styles.headerTitle}>Input Jurnal Pembelajaran</Text>
        <TouchableOpacity onPress={fetchMasterData} disabled={loadingMaster}>
          {loadingMaster ? (
             <ActivityIndicator size="small" color="#16A34A" />
          ) : (
             <Ionicons name="refresh" size={24} color="#16A34A" />
          )}
        </TouchableOpacity>
      </View>

      {/* DROPDOWN KELAS */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Pilih Rombel / Kelas *</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, isRombelDisabled && styles.dropdownDisabled]}
          onPress={() => setModalRombel(true)}
          disabled={isRombelDisabled}
        >
          <Text style={[styles.dropdownBtnText, isRombelDisabled && styles.dropdownTextDisabled]}>
            {getRombelText()}
          </Text>
          {loadingMaster ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <Ionicons name="chevron-down" size={20} color={isRombelDisabled ? '#94A3B8' : '#64748B'} />
          )}
        </TouchableOpacity>
      </View>

      {/* DROPDOWN MAPEL */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Mata Pelajaran *</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, isMapelDisabled && styles.dropdownDisabled]}
          onPress={() => setModalMapel(true)}
          disabled={isMapelDisabled}
        >
          <Text style={[styles.dropdownBtnText, isMapelDisabled && styles.dropdownTextDisabled]}>
            {getMapelText()}
          </Text>
          {loadingMaster ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <Ionicons name="chevron-down" size={20} color={isMapelDisabled ? '#94A3B8' : '#64748B'} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Jam Ke - (Mulai - Selesai) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: 1 - 3"
          placeholderTextColor="#94A3B8"
          value={jamKe}
          onChangeText={setJamKe}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Materi Pokok Pembelajaran *</Text>
        <TextInput
          style={styles.input}
          placeholder="Masukkan materi pokok"
          placeholderTextColor="#94A3B8"
          value={materi}
          onChangeText={setMateri}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Uraian Singkat Kegiatan *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tuliskan uraian singkat kegiatan pembelajaran..."
          placeholderTextColor="#94A3B8"
          value={uraian}
          onChangeText={setUraian}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Hambatan / Catatan Kelas (Opsional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tuliskan hambatan atau catatan jika ada..."
          placeholderTextColor="#94A3B8"
          value={hambatan}
          onChangeText={setHambatan}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Presensi Kehadiran Siswa</Text>
          {Boolean(rombel) && (
            <View style={styles.metaInfoBox}>
              <Text style={styles.metaText}>
                Wali Kelas: <Text style={styles.metaHighlight}>{waliKelas || '-'}</Text>
              </Text>
              <Text style={styles.badgeSiswa}>Jumlah Siswa {siswa.length}</Text>
            </View>
          )}
        </View>
        {isMapelAgamaCurrent && (
          <Text style={styles.badgeAgama}>Kategori Agama</Text>
        )}
      </View>

      {!rombel ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Pilih Rombel / Kelas untuk menampilkan daftar siswa.</Text>
        </View>
      ) : loadingSiswa ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.siswaContainer}>
          {siswa.map((item, index) => {
            const idSiswaKey = String(item.idSiswa || item.id || index);
            return (
              <View key={`siswa-${idSiswaKey}-${index}`} style={styles.siswaCard}>
                <View style={styles.siswaInfo}>
                  <Text style={styles.siswaNo}>{index + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.siswaNama}>{item.nama}</Text>
                    {item.agama && <Text style={styles.siswaSub}>Agama: {item.agama}</Text>}
                  </View>
                </View>

                <View style={styles.statusGroup}>
                  {optionsStatus.map((st) => {
                    const isActive = presensi[idSiswaKey] === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.btnStatus,
                          isActive && styles[`btnStatusActive_${st}`],
                        ]}
                        onPress={() => setStatusPresensi(idSiswaKey, st)}
                      >
                        <Text style={[styles.btnStatusText, isActive && styles.btnStatusTextActive]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Foto Kegiatan (Opsional)</Text>
        <TouchableOpacity style={styles.btnFoto} onPress={ambilFoto}>
          <Ionicons name="camera-outline" size={20} color="#2563EB" />
          <Text style={styles.btnFotoText}>
            {foto ? 'Ganti Foto Pembelajaran' : 'Ambil Foto Pembelajaran'}
          </Text>
        </TouchableOpacity>

        {foto && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: foto }} style={styles.imagePreview} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSimpan}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Simpan Jurnal</Text>
        )}
      </TouchableOpacity>

      {/* MODAL PILIH ROMBEL */}
      <Modal visible={modalRombel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Rombel / Kelas</Text>
            <FlatList
              data={listRombel}
              keyExtractor={(item) => `rombel-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setRombel(item.id);
                    setModalRombel(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.nama}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalRombel(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PILIH MAPEL */}
      <Modal visible={modalMapel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Mata Pelajaran</Text>
            <FlatList
              data={listMapel}
              keyExtractor={(item) => `mapel-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setMapel(item.id);
                    setModalMapel(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.nama}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalMapel(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 20, paddingBottom: 110 },
  
  // MODIFIKASI HEADER: Menambahkan Flex Row agar tulisan dan icon sejajar
  headerTitleBox: { 
    backgroundColor: '#FFF', 
    borderWidth: 1.5, 
    borderColor: '#16A34A', 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    marginBottom: 20,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, backgroundColor: '#FFF', fontSize: 14, color: '#0F172A' },
  textArea: { height: 90, textAlignVertical: 'top' },
  
  dropdownBtn: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#FFF', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.65 },
  dropdownBtnText: { fontSize: 14, color: '#0F172A' },
  dropdownTextDisabled: { color: '#94A3B8' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginTop: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  metaInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#64748B' },
  metaHighlight: { fontWeight: '600', color: '#1E293B' },
  badgeSiswa: { fontSize: 11, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  badgeAgama: { fontSize: 12, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  emptyContainer: { padding: 16, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 13, color: '#64748B' },
  siswaContainer: { marginBottom: 16 },
  siswaCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  siswaInfo: { flexDirection: 'row', marginBottom: 10 },
  siswaNo: { fontSize: 14, fontWeight: '600', color: '#334155', marginRight: 6 },
  siswaNama: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  siswaSub: { fontSize: 12, color: '#64748B' },
  statusGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  btnStatus: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  btnStatusText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  btnStatusTextActive: { color: '#FFF' },
  btnStatusActive_H: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnStatusActive_S: { backgroundColor: '#EAB308', borderColor: '#EAB308' },
  btnStatusActive_I: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  btnStatusActive_A: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnStatusActive_B: { backgroundColor: '#6B7280', borderColor: '#6B7280' },
  btnFoto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#2563EB', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#EFF6FF', gap: 8 },
  btnFotoText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  imagePreviewContainer: { marginTop: 10, alignItems: 'center' },
  imagePreview: { width: '100%', height: 180, borderRadius: 8 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#0F172A' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 14, color: '#334155' },
  modalCloseBtn: { marginTop: 16, padding: 12, backgroundColor: '#DC2626', borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontWeight: 'bold' },
});