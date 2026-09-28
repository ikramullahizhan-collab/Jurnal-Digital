import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { callBackendAPI } from '../api/client';

export default function PantauGuruScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataHambatan, setDataHambatan] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal Detail & Error Image
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Load Data dari Backend Google Apps Script
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await callBackendAPI('getJurnalGuruHambatan');
      if (res && res.success && Array.isArray(res.data)) {
        setDataHambatan(res.data);
        setFilteredData(res.data);
      } else {
        setDataHambatan([]);
        setFilteredData([]);
        if (res && res.message) {
          Alert.alert('Informasi', res.message);
        }
      }
    } catch (error) {
      console.error('Error fetching jurnal hambatan:', error);
      Alert.alert('Error', 'Gagal memuat data jurnal hambatan: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Data berdasarkan Search Bar
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(dataHambatan);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = dataHambatan.filter((item) => {
        const guru = (item.namaGuru || '').toLowerCase();
        const mapel = (item.namaMapel || '').toLowerCase();
        const kelas = (item.kelas || '').toLowerCase();
        const materi = (item.materi || '').toLowerCase();
        const hambatan = (item.hambatan || '').toLowerCase();

        return (
          guru.includes(query) ||
          mapel.includes(query) ||
          kelas.includes(query) ||
          materi.includes(query) ||
          hambatan.includes(query)
        );
      });
      setFilteredData(filtered);
    }
  }, [searchQuery, dataHambatan]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Buka Modal Detail
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setImageError(false); // Reset status error gambar setiap membuka modal baru
    setShowDetailModal(true);
  };

  // Helper untuk menentukan warna badge berdasarkan status presensi
  const getStatusStyle = (status = '') => {
    const s = status.trim().toLowerCase();
    if (s === 'alpa' || s === 'alpha') {
      return { bg: '#FFEBEE', text: '#C62828' };
    }
    if (s === 'sakit') {
      return { bg: '#FFF8E1', text: '#E65100' };
    }
    if (s === 'izin') {
      return { bg: '#E3F2FD', text: '#1565C0' };
    }
    if (s.includes('dispen') || s.includes('tugas')) {
      return { bg: '#F3E5F5', text: '#7B1FA2' };
    }
    return { bg: '#E0E0E0', text: '#424242' };
  };

  // Helper untuk merubah link Google Drive viewer menjadi direct image link
  const getDirectImageUrl = (url) => {
    if (!url) return null;
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  // Render Setiap Kartu Jurnal
  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={14} color="#0052CC" />
            <Text style={styles.timeText}>{item.waktu || '-'}</Text>
          </View>
          <View style={styles.kelasBadge}>
            <Text style={styles.kelasText}>{item.kelas || '-'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={20} color="#333" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guruText}>{item.namaGuru || 'Guru Tidak Diketahui'}</Text>
            <Text style={styles.mapelText}>
              {item.namaMapel || 'Mata Pelajaran'} • Jam ke-{item.jamKe || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Materi Pokok:</Text>
          <Text style={styles.materiText} numberOfLines={2}>
            {item.materi || '-'}
          </Text>
        </View>

        <View style={styles.hambatanBox}>
          <View style={styles.hambatanHeader}>
            <Ionicons name="warning" size={18} color="#D32F2F" />
            <Text style={styles.hambatanTitle}>Catatan Hambatan / Kendala:</Text>
          </View>
          <Text style={styles.hambatanText}>{item.hambatan || '-'}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => handleOpenDetail(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailButtonText}>Lihat Detail Lengkap</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const siswaTidakHadir = selectedItem?.listAbsen
    ? selectedItem.listAbsen.filter(
        (absen) => (absen.status || '').trim().toLowerCase() !== 'hadir'
      )
    : [];

  // Pengecekan aman properti foto dari backend
  const rawPhotoUrl = selectedItem?.buktiFoto || selectedItem?.buktiSwafoto || selectedItem?.['Bukti Swafoto'];
  const validPhotoUrl = typeof rawPhotoUrl === 'string' && rawPhotoUrl.startsWith('http') ? rawPhotoUrl : null;
  const directImageUrl = getDirectImageUrl(validPhotoUrl);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Pantau Hambatan Guru</Text>
            <Text style={styles.headerSubtitle}>
              Daftar jurnal mengajar yang memiliki catatan kendala/masalah
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshIconButton}
            onPress={fetchData}
            disabled={loading || refreshing}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color="#0052CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama guru, mapel, kelas, hambatan..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#888"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryBadge}>
          <Ionicons name="alert-circle" size={16} color="#C62828" />
          <Text style={styles.summaryText}>
            Ditemukan <Text style={{ fontWeight: 'bold' }}>{filteredData.length}</Text> Jurnal Bermasalah
          </Text>
        </View>
      </View>

      {/* Main Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0052CC" />
          <Text style={styles.loadingText}>Memuat jurnal hambatan...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.idJurnal || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#2E7D32" />
              <Text style={styles.emptyTitle}>Tidak Ada Hambatan</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Tidak ditemukan data yang sesuai dengan kata kunci pencarian.'
                  : 'Semua kegiatan mengajar berjalan lancar tanpa kendala.'}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL DETAIL JURNAL */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Jurnal Guru</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalMetaRow}>
                  <View style={styles.modalMetaBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#0052CC" />
                    <Text style={styles.modalMetaText}>{selectedItem.waktu}</Text>
                  </View>
                  <View style={[styles.modalMetaBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="school-outline" size={14} color="#1976D2" />
                    <Text style={[styles.modalMetaText, { color: '#1976D2' }]}>
                      {selectedItem.kelas}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Guru Pengajar</Text>
                  <Text style={styles.modalValueBold}>{selectedItem.namaGuru}</Text>
                  <Text style={[styles.modalLabel, { marginTop: 10 }]}>Mata Pelajaran & Jam</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.namaMapel} (Jam ke-{selectedItem.jamKe})
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Materi Pokok</Text>
                  <Text style={styles.modalValue}>{selectedItem.materi || '-'}</Text>
                  <Text style={[styles.modalLabel, { marginTop: 10 }]}>Uraian Kegiatan</Text>
                  <Text style={styles.modalValue}>{selectedItem.uraian || '-'}</Text>
                </View>

                <View style={styles.modalHambatanBox}>
                  <Text style={styles.modalHambatanLabel}>Catatan Hambatan / Kendala:</Text>
                  <Text style={styles.modalHambatanValue}>{selectedItem.hambatan || '-'}</Text>
                </View>

                {selectedItem.catatanKepsek ? (
                  <View style={styles.modalKepsekBox}>
                    <Text style={styles.modalKepsekLabel}>Catatan Kepala Sekolah:</Text>
                    <Text style={styles.modalKepsekValue}>{selectedItem.catatanKepsek}</Text>
                  </View>
                ) : null}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>
                    Siswa Tidak Hadir ({siswaTidakHadir.length})
                  </Text>
                  {siswaTidakHadir.length > 0 ? (
                    siswaTidakHadir.map((absen, idx) => {
                      const styleBadge = getStatusStyle(absen.status);
                      return (
                        <View key={idx} style={styles.absenItemRow}>
                          <Ionicons name="person-outline" size={16} color="#555" />
                          <Text style={styles.absenNamaText}>{absen.nama}</Text>
                          <View
                            style={[
                              styles.absenStatusBadge,
                              { backgroundColor: styleBadge.bg },
                            ]}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: styleBadge.text }}>
                              {absen.status}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyAbsenText}>Semua siswa hadir lengkap.</Text>
                  )}
                </View>

                {/* Bagian Bukti Foto - Mendukung PWA dengan Fallback URL */}
                {validPhotoUrl ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Foto Dokumentasi Jurnal Guru</Text>
                    
                    {!imageError && directImageUrl ? (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: directImageUrl }}
                          style={styles.buktiFotoImage}
                          resizeMode="cover"
                          onError={() => setImageError(true)} // Deteksi jika browser PWA memblokir gambar
                        />
                      </View>
                    ) : null}

                    {/* Tombol akan muncul di PWA (Web) ATAU jika gambar gagal dirender (CORS Block) */}
                    {(Platform.OS === 'web' || imageError || !directImageUrl) && (
                      <TouchableOpacity
                        style={styles.btnOpenDrive}
                        onPress={() => Linking.openURL(validPhotoUrl)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="open-outline" size={18} color="#FFF" />
                        <Text style={styles.btnOpenDriveText}>Buka Foto di Tab Baru</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeModalButtonText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  headerContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  refreshIconButton: { padding: 8, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1F2937' },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 10 },
  summaryText: { fontSize: 12, color: '#C62828', marginLeft: 6 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  listContent: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeBadge: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#0052CC', marginLeft: 4, fontWeight: '500' },
  kelasBadge: { backgroundColor: '#E8EAF6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  kelasText: { fontSize: 12, color: '#283593', fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  guruText: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  mapelText: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  sectionContainer: { marginBottom: 10 },
  sectionTitle: { fontSize: 12, color: '#888', fontWeight: '600' },
  materiText: { fontSize: 14, color: '#333', marginTop: 2 },
  hambatanBox: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082', borderRadius: 8, padding: 10, marginBottom: 12 },
  hambatanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  hambatanTitle: { fontSize: 13, fontWeight: 'bold', color: '#D32F2F', marginLeft: 6 },
  hambatanText: { fontSize: 13, color: '#3E2723', lineHeight: 18 },
  detailButton: { backgroundColor: '#0052CC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 9, borderRadius: 6 },
  detailButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginRight: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%', width: '100%', maxWidth: 600, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalBody: { padding: 16 },
  modalMetaRow: { flexDirection: 'row', marginBottom: 14 },
  modalMetaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8EAF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 8 },
  modalMetaText: { fontSize: 12, fontWeight: '600', color: '#0052CC', marginLeft: 4 },
  modalSection: { marginBottom: 16 },
  modalLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  modalValueBold: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  modalValue: { fontSize: 14, color: '#333', marginTop: 2, lineHeight: 20 },
  modalHambatanBox: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 8, padding: 12, marginBottom: 16 },
  modalHambatanLabel: { fontSize: 13, fontWeight: 'bold', color: '#C62828', marginBottom: 4 },
  modalHambatanValue: { fontSize: 14, color: '#B71C1C', lineHeight: 20 },
  modalKepsekBox: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 8, padding: 12, marginBottom: 16 },
  modalKepsekLabel: { fontSize: 13, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  modalKepsekValue: { fontSize: 14, color: '#1B5E20', lineHeight: 20 },
  absenItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  absenNamaText: { flex: 1, fontSize: 13, color: '#333', marginLeft: 8 },
  absenStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  emptyAbsenText: { fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 4 },
  
  imageContainer: { marginTop: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E0E0E0' },
  buktiFotoImage: { width: '100%', height: 200 },
  btnOpenDrive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0052CC', paddingVertical: 10, borderRadius: 8, marginTop: 10 },
  btnOpenDriveText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  
  modalFooter: { paddingHorizontal: 16, paddingTop: 10 },
  closeModalButton: { backgroundColor: '#E0E0E0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeModalButtonText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
});