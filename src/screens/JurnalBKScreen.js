import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { callBackendAPI } from '../api/client';

const JENIS_LAYANAN_OPTIONS = [
  'Bimbingan Pribadi', 
  'Bimbingan Sosial', 
  'Bimbingan Belajar', 
  'Bimbingan Karir'
];
const STATUS_KASUS_OPTIONS = ['Selesai', 'Pantauan Lanjut'];

export default function JurnalBKScreen({ route, navigation }) {
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Data Master
  const [kelasOptions, setKelasOptions] = useState([]);
  const [siswaOptions, setSiswaOptions] = useState([]);
  const [userData, setUserData] = useState(null);

  // Form State
  const [dateObj, setDateObj] = useState(new Date());
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [jenisLayanan, setJenisLayanan] = useState('Bimbingan Pribadi');
  const [kasus, setKasus] = useState('');
  const [solusi, setSolusi] = useState('');
  const [statusKasus, setStatusKasus] = useState('Pantauan Lanjut');
  
  // State Kamera
  const [imageUri, setImageUri] = useState(null);
  const [fotoBase64, setFotoBase64] = useState('');

  // Modals State untuk Dropdown
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [showJenisLayananModal, setShowJenisLayananModal] = useState(false);
  const [showStatusKasusModal, setShowStatusKasusModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Tangkap parameter prefill dari Peta Kerawanan
  useEffect(() => {
    if (route?.params?.prefillSiswa) {
      const siswa = route.params.prefillSiswa;
      setSelectedSiswa(siswa);

      // Set Kelas berdasarkan data siswa
      if (siswa.idKelas || siswa.namaKelas || siswa.kelas) {
        setSelectedKelas({
          id: siswa.idKelas || siswa.kelas,
          nama: siswa.namaKelas || siswa.kelas || siswa.idKelas
        });
      }
    }
  }, [route?.params]);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const sessionStr = await AsyncStorage.getItem('userSession');
      if (sessionStr) setUserData(JSON.parse(sessionStr));

      const response = await callBackendAPI('getFormDataBK');
      if (response && response.data) {
        setKelasOptions(response.data.kelas || response.data.rombel || []);
        setSiswaOptions(response.data.siswa || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data kelas dan siswa.');
    } finally {
      setLoadingData(false);
    }
  };

  const getSiswaByKelas = () => {
    if (!selectedKelas) return [];
    return siswaOptions.filter(s => s.idKelas === selectedKelas.id || s.idKelas === selectedKelas.nama);
  };

  // Handler Date Picker
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && selectedDate instanceof Date) {
      setDateObj(selectedDate);
      
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setTanggal(`${year}-${month}-${day}`);
    }
  };

  // Handler Buka Kamera
  const handleBukaKamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Anda perlu memberikan izin kamera untuk mengambil dokumentasi.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],    
      quality: 0.5, 
      base64: true, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setFotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSimpan = async () => {
    if (!selectedSiswa || !kasus || !solusi) {
      Alert.alert('Peringatan', 'Harap isi Siswa, Kasus/Keluhan, dan Solusi.');
      return;
    }

    try {
      setLoadingSubmit(true);
      
      const payload = {
        tanggal: tanggal,
        namaGuruBK: userData?.namaLengkap || userData?.nama || 'Guru BK',
        idSiswa: selectedSiswa.id || selectedSiswa.idSiswa,
        namaSiswa: selectedSiswa.nama || selectedSiswa.namaSiswa,
        idKelas: selectedKelas?.id || selectedKelas?.idKelas || selectedKelas?.nama,
        jenisLayanan: jenisLayanan,
        keluhan: kasus,
        solusi: solusi,
        statusKasus: statusKasus,
        fotoBase64: fotoBase64 
      };

      const res = await callBackendAPI('simpanJurnalBK', payload);
      
      if (res && (res.status === 'success' || res.success)) {
        Alert.alert('Berhasil', 'Jurnal BK telah disimpan.');
        // Reset Form
        setKasus('');
        setSolusi('');
        setImageUri(null);
        setFotoBase64('');
        if (!route?.params?.prefillSiswa) {
          setSelectedSiswa(null);
        }
      } else {
        Alert.alert('Gagal', res?.message || 'Gagal menyimpan Jurnal BK');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan jaringan saat menyimpan.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10 }}>Memuat Data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        
        {/* Nama Guru BK */}
        <View style={styles.guruHeader}>
          <Ionicons name="person-circle-outline" size={28} color="#2563EB" />
          <View style={styles.guruHeaderTextContainer}>
            <Text style={styles.guruHeaderLabel}>Guru BK yang Bertugas</Text>
            <Text style={styles.guruHeaderName}>
              {userData?.namaLengkap || userData?.nama || 'Memuat...'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Tanggal (Date Picker Web & Native) */}
        <Text style={styles.label}>Tanggal Layanan</Text>
        {Platform.OS === 'web' ? (
          React.createElement('input', {
            type: 'date',
            value: tanggal,
            onChange: (e) => {
              const selectedDate = e.target.value;
              setTanggal(selectedDate);
              setDateObj(new Date(selectedDate));
            },
            style: {
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }
          })
        ) : (
          <View>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dropdownText}>{tanggal}</Text>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onValueChange={handleDateChange}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}
          </View>
        )}

        {/* Pilih Kelas */}
        <Text style={styles.label}>Kelas</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowKelasModal(true)}>
          <Text style={styles.dropdownText}>{selectedKelas ? selectedKelas.nama : 'Pilih Kelas'}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Pilih Siswa */}
        <Text style={styles.label}>Siswa</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
          if (!selectedKelas) return Alert.alert('Perhatian', 'Pilih kelas terlebih dahulu');
          setShowSiswaModal(true);
        }}>
          <Text style={styles.dropdownText}>
            {selectedSiswa ? (selectedSiswa.nama || selectedSiswa.namaSiswa) : 'Pilih Siswa'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Jenis Layanan */}
        <Text style={styles.label}>Jenis Layanan</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowJenisLayananModal(true)}>
          <Text style={styles.dropdownText}>{jenisLayanan}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Kasus / Keluhan */}
        <Text style={styles.label}>Kasus / Keluhan</Text>
        <TextInput 
          style={[styles.input, styles.textArea]}
          placeholder="Tuliskan keluhan atau kasus siswa..."
          multiline
          numberOfLines={4}
          value={kasus}
          onChangeText={setKasus}
        />

        {/* Solusi / Pendekatan */}
        <Text style={styles.label}>Solusi / Pendekatan</Text>
        <TextInput 
          style={[styles.input, styles.textArea]}
          placeholder="Tindakan yang telah dilakukan..."
          multiline
          numberOfLines={4}
          value={solusi}
          onChangeText={setSolusi}
        />

        {/* Status Kasus */}
        <Text style={styles.label}>Status Kasus</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowStatusKasusModal(true)}>
          <Text style={styles.dropdownText}>{statusKasus}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Dokumentasi (Kamera) */}
        <Text style={styles.label}>Dokumentasi / Bukti Layanan</Text>
        
        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.hapusFotoBtn} onPress={() => {
              setImageUri(null);
              setFotoBase64('');
            }}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.hapusFotoText}>Hapus Foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cameraBtn} onPress={handleBukaKamera}>
            <Ionicons name="camera-outline" size={24} color="#2563EB" />
            <Text style={styles.cameraBtnText}>Buka Kamera & Ambil Foto</Text>
          </TouchableOpacity>
        )}

        {/* Tombol Simpan */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSimpan} disabled={loadingSubmit}>
          {loadingSubmit ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Simpan Jurnal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ================= MODAL DROPDOWNS ================= */}

      {/* MODAL KELAS */}
      <Modal visible={showKelasModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Kelas</Text>
            <FlatList
              data={kelasOptions}
              keyExtractor={(item, index) => String(item.id || index)}
              renderItem={({ item }) => {
                const isSelected = selectedKelas && (selectedKelas.id === item.id || selectedKelas.nama === item.nama);
                return (
                  <TouchableOpacity style={styles.modalOption} onPress={() => {
                    setSelectedKelas(item);
                    setSelectedSiswa(null); 
                    setShowKelasModal(false);
                  }}>
                    <Text style={[styles.modalOptionText, isSelected && { color: '#2563EB', fontWeight: 'bold' }]}>
                      {item.nama}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowKelasModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SISWA */}
      <Modal visible={showSiswaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Siswa</Text>
            <FlatList
              data={getSiswaByKelas()}
              keyExtractor={(item, index) => String(item.id || item.idSiswa || index)}
              renderItem={({ item }) => {
                const isSelected = selectedSiswa && (
                  (item.id && selectedSiswa.id === item.id) || 
                  (item.idSiswa && selectedSiswa.idSiswa === item.idSiswa) || 
                  ((item.nama || item.namaSiswa) === (selectedSiswa.nama || selectedSiswa.namaSiswa))
                );
                return (
                  <TouchableOpacity style={styles.modalOption} onPress={() => {
                    setSelectedSiswa(item);
                    setShowSiswaModal(false);
                  }}>
                    <Text style={[styles.modalOptionText, isSelected && { color: '#2563EB', fontWeight: 'bold' }]}>
                      {item.nama || item.namaSiswa}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSiswaModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL JENIS LAYANAN */}
      <Modal visible={showJenisLayananModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Jenis Layanan</Text>
            {JENIS_LAYANAN_OPTIONS.map((item, index) => {
              const isSelected = jenisLayanan === item;
              return (
                <TouchableOpacity key={index} style={styles.modalOption} onPress={() => {
                  setJenisLayanan(item);
                  setShowJenisLayananModal(false);
                }}>
                  <Text style={[styles.modalOptionText, isSelected && { color: '#2563EB', fontWeight: 'bold' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowJenisLayananModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL STATUS KASUS */}
      <Modal visible={showStatusKasusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Status Kasus</Text>
            {STATUS_KASUS_OPTIONS.map((item, index) => {
              const isSelected = statusKasus === item;
              return (
                <TouchableOpacity key={index} style={styles.modalOption} onPress={() => {
                  setStatusKasus(item);
                  setShowStatusKasusModal(false);
                }}>
                  <Text style={[styles.modalOptionText, isSelected && { color: '#2563EB', fontWeight: 'bold' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowStatusKasusModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  
  guruHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  guruHeaderTextContainer: { marginLeft: 10 },
  guruHeaderLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' },
  guruHeaderName: { fontSize: 16, color: '#0F172A', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155' },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  dropdownText: { fontSize: 14, color: '#334155' },
  
  cameraBtn: { flexDirection: 'row', backgroundColor: '#DBEAFE', paddingVertical: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed' },
  cameraBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  imagePreviewContainer: { alignItems: 'center', marginTop: 10, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  hapusFotoBtn: { flexDirection: 'row', marginTop: 12, alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  hapusFotoText: { color: '#EF4444', fontWeight: 'bold', marginLeft: 6 },

  submitBtn: { flexDirection: 'row', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 15, color: '#334155' },
  closeBtn: { marginTop: 15, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center' },
  closeBtnText: { fontWeight: 'bold', color: '#334155' }
});