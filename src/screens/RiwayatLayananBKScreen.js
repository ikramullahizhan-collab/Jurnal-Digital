import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView,
  Alert,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { callBackendAPI } from '../api/client'; 

const SEMESTER_OPTIONS = ['Ganjil', 'Genap'];
const BULAN_GANJIL = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_GENAP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

export default function RiwayatLayananBKScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Ganjil');
  const [selectedBulan, setSelectedBulan] = useState('Semua Bulan');

  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showBulanModal, setShowBulanModal] = useState(false);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedSemester, selectedBulan, data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await callBackendAPI('getRiwayatBKBackend');
      
      if (response && Array.isArray(response)) {
        setData(response);
      } else if (response && response.data) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Gagal mengambil data riwayat layanan.');
      } else {
        Alert.alert('Error', 'Gagal mengambil data riwayat layanan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getBulanOptions = () => {
    let options = ['Semua Bulan'];
    if (selectedSemester === 'Ganjil') {
      options = [...options, ...BULAN_GANJIL];
    } else if (selectedSemester === 'Genap') {
      options = [...options, ...BULAN_GENAP];
    }
    return options;
  };

  const getMonthIndex = (monthName) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months.indexOf(monthName);
  };

  const parseDateToMonthIndex = (dateString) => {
    if (!dateString) return -1;
    let d = new Date(dateString);
    if (!isNaN(d.getMonth())) return d.getMonth();

    const parts = dateString.split(/[-/]/);
    if (parts.length === 3) {
      const isDayFirst = parseInt(parts[0]) > 12; 
      const monthPart = isDayFirst ? parts[1] : parts[0];
      return parseInt(monthPart, 10) - 1; 
    }
    return -1;
  };

  const applyFilters = () => {
    let result = data;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.namaSiswa || '').toLowerCase().includes(query) ||
          (item.kelas || '').toLowerCase().includes(query)
      );
    }

    result = result.filter((item) => {
      const monthIdx = parseDateToMonthIndex(item.tanggal);
      if (monthIdx === -1) return true; 

      const isGanjil = monthIdx >= 6; 
      const isGenap = monthIdx >= 0 && monthIdx <= 5; 

      let passSemester = true;
      if (selectedSemester === 'Ganjil') passSemester = isGanjil;
      if (selectedSemester === 'Genap') passSemester = isGenap;

      let passBulan = true;
      if (selectedBulan !== 'Semua Bulan') {
        const targetMonthIdx = getMonthIndex(selectedBulan);
        passBulan = monthIdx === targetMonthIdx;
      }

      return passSemester && passBulan;
    });

    setFilteredData(result);
  };

  const handleCetak = () => {
    if (Platform.OS === 'web') {
      window.alert('Fitur cetak dokumen (PDF/Excel) sedang dalam pengembangan.');
    } else {
      Alert.alert('Informasi', 'Fitur cetak dokumen (PDF/Excel) sedang dalam pengembangan.');
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // --- PEMBARUAN: Penanganan URL Drive Menggunakan Thumbnail API untuk Web ---
  const getDriveDirectUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    // Mengekstrak ID File Google Drive
    const match = url.match(/[-\w]{25,}/); 
    if (match && match[0]) {
      const fileId = match[0];
      
      if (Platform.OS === 'web') {
        // Menggunakan Thumbnail API Google Drive khusus untuk mode PWA/Web
        // Parameter sz=w1000 digunakan agar resolusi gambar tetap bagus
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
      
      // Jika berjalan di Native (Android/iOS), gunakan link download langsung
      return `https://drive.google.com/uc?id=${fileId}`;
    }
    return url; 
  };

  const getImageUrl = (item) => {
    if (!item) return null;
    const rawUrl = item.dokumentasi || item.Dokumentasi || item.foto || item.fotoDokumentasi || null;
    return getDriveDirectUrl(rawUrl);
  };

  const renderTableRow = ({ item, index }) => (
    <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
      <Text style={[styles.cell, styles.cellTanggal]}>{item.tanggal || '-'}</Text>
      <Text style={[styles.cell, styles.cellNama]} numberOfLines={2}>{item.namaSiswa || 'Tanpa Nama'}</Text>
      <Text style={[styles.cell, styles.cellKelas]}>{item.kelas || '-'}</Text>
      <Text style={[styles.cell, styles.cellJenis]}>{item.jenisLayanan || '-'}</Text>
      <View style={[styles.cell, styles.cellStatus]}>
        <View style={[
          styles.badge, 
          item.statusKasus === 'Selesai' ? styles.badgeSuccess : styles.badgeWarning
        ]}>
          <Text style={[
            styles.badgeText,
            item.statusKasus === 'Selesai' ? styles.badgeTextSuccess : styles.badgeTextWarning
          ]}>{item.statusKasus || '-'}</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.cellAksi]}>
        <TouchableOpacity style={styles.btnDetail} onPress={() => openDetail(item)}>
          <Text style={styles.btnDetailText}>Detail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRowContainer}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowSemesterModal(true)}>
          <Text style={styles.filterBtnText} numberOfLines={1}>{selectedSemester}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowBulanModal(true)}>
          <Text style={styles.filterBtnText} numberOfLines={1}>{selectedBulan}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={fetchData}>
          <Ionicons name="refresh-outline" size={20} color="#2563EB" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={handleCetak}>
          <Ionicons name="print-outline" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRowContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari Nama Siswa / Kelas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tableContainer}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 10, color: '#64748B' }}>Memuat data layanan BK...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text style={{ marginTop: 10, color: '#64748B' }}>Tidak ada riwayat layanan ditemukan.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableInner}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.cellTanggal]}>Tanggal</Text>
                <Text style={[styles.headerCell, styles.cellNama]}>Nama Siswa</Text>
                <Text style={[styles.headerCell, styles.cellKelas]}>Kelas</Text>
                <Text style={[styles.headerCell, styles.cellJenis]}>Jenis Layanan</Text>
                <Text style={[styles.headerCell, styles.cellStatus]}>Status Kasus</Text>
                <Text style={[styles.headerCell, styles.cellAksi]}>Aksi</Text>
              </View>

              <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id ? String(item.id) : Math.random().toString()}
                renderItem={renderTableRow}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </ScrollView>
        )}
      </View>

      <Modal visible={showSemesterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Semester</Text>
            {SEMESTER_OPTIONS.map((item, index) => (
              <TouchableOpacity key={index} style={styles.modalOption} onPress={() => {
                setSelectedSemester(item);
                setSelectedBulan('Semua Bulan'); 
                setShowSemesterModal(false);
              }}>
                <Text style={[styles.modalOptionText, selectedSemester === item && styles.textPrimary]}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSemesterModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showBulanModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Pilih Bulan</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getBulanOptions().map((item, index) => (
                <TouchableOpacity key={index} style={styles.modalOption} onPress={() => {
                  setSelectedBulan(item);
                  setShowBulanModal(false);
                }}>
                  <Text style={[styles.modalOptionText, selectedBulan === item && styles.textPrimary]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowBulanModal(false)}>
              <Text style={styles.closeBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Detail Layanan BK</Text>
            
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tanggal</Text>
                  <Text style={styles.detailValue}>{selectedItem.tanggal || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guru BK</Text>
                  <Text style={styles.detailValue}>{selectedItem.namaGuruBK || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nama Siswa</Text>
                  <Text style={styles.detailValue}>{selectedItem.namaSiswa || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Kelas</Text>
                  <Text style={styles.detailValue}>{selectedItem.kelas || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Jenis Layanan</Text>
                  <Text style={styles.detailValue}>{selectedItem.jenisLayanan || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status Kasus</Text>
                  <Text style={styles.detailValue}>{selectedItem.statusKasus || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Masalah / Kasus</Text>
                  <Text style={styles.detailValue}>{selectedItem.kasus || selectedItem.keluhan || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Solusi / Tindak Lanjut</Text>
                  <Text style={styles.detailValue}>{selectedItem.solusi || '-'}</Text>
                </View>

                <Text style={[styles.detailLabel, { marginTop: 16, marginBottom: 8, flex: 1 }]}>Foto Dokumentasi:</Text>
                
                {getImageUrl(selectedItem) ? (
                  <Image
                    source={{ uri: getImageUrl(selectedItem) }}
                    style={styles.detailImage}
                    resizeMode="contain" 
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Ionicons name="image-outline" size={40} color="#94A3B8" />
                    <Text style={styles.noImageText}>Tidak ada foto dokumentasi</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailModal(false)}>
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topRowContainer: { flexDirection: 'row', padding: 16, paddingBottom: 8, backgroundColor: '#FFF', gap: 8 },
  searchRowContainer: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterBtn: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, height: 42 },
  filterBtnText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  actionBtn: { width: 42, height: 42, backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, height: 42 },
  searchIcon: { marginRight: 8 },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#334155',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  tableContainer: { flex: 1, padding: 16 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableInner: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingVertical: 12 },
  headerCell: { fontSize: 13, fontWeight: 'bold', color: '#475569', paddingHorizontal: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 12, alignItems: 'center' },
  tableRowAlternate: { backgroundColor: '#F8FAFC' },
  cell: { fontSize: 13, color: '#334155', paddingHorizontal: 10 },
  cellTanggal: { width: 100 },
  cellNama: { width: 150 },
  cellKelas: { width: 90 },
  cellJenis: { width: 140 },
  cellStatus: { width: 120 },
  cellAksi: { width: 80, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextWarning: { color: '#D97706' },
  btnDetail: { backgroundColor: '#C8A2C8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  btnDetailText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 15, color: '#334155', textAlign: 'center' },
  textPrimary: { color: '#2563EB', fontWeight: 'bold' },
  closeBtn: { marginTop: 16, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center' },
  closeBtnText: { fontWeight: 'bold', color: '#475569' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 13, color: '#64748B', flex: 1 },
  detailValue: { fontSize: 13, color: '#334155', fontWeight: '600', flex: 1.5, textAlign: 'right' },
  detailImage: { width: '100%', height: 300, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  noImageContainer: { width: '100%', height: 150, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  noImageText: { color: '#94A3B8', fontSize: 13, marginTop: 8 }
});