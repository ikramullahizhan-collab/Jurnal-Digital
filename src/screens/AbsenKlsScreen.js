import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print'; 
import { callBackendAPI } from '../api/client';

const BULAN_OPTIONS = [
  { label: 'Semua Bulan', value: 'Semua' },
  { label: 'Januari', value: '01' }, { label: 'Februari', value: '02' },
  { label: 'Maret', value: '03' }, { label: 'April', value: '04' },
  { label: 'Mei', value: '05' }, { label: 'Juni', value: '06' },
  { label: 'Juli', value: '07' }, { label: 'Agustus', value: '08' },
  { label: 'September', value: '09' }, { label: 'Oktober', value: '10' },
  { label: 'November', value: '11' }, { label: 'Desember', value: '12' },
];

const PRINT_BULAN_OPTIONS = BULAN_OPTIONS.filter(b => b.value !== 'Semua');
const MODE_CETAK_OPTIONS = [
  { label: 'Per Bulan (Rentang)', value: 'Bulan' },
  { label: 'Per Semester', value: 'Semester' }
];
const SEMESTER_OPTIONS = [
  { label: 'Ganjil', value: 'Ganjil' },
  { label: 'Genap', value: 'Genap' }
];
const PAPER_OPTIONS = [
  { label: 'A4', value: 'A4' },
  { label: 'F4 (Folio)', value: 'F4' }
];

export default function AbsenKlsScreen() {
  const [loading, setLoading] = useState(true);
  const [rekapSiswa, setRekapSiswa] = useState([]);
  const [totalHariEfektif, setTotalHariEfektif] = useState(0);
  const [infoKelas, setInfoKelas] = useState({ namaKelas: '-', namaWali: '-', nipWali: '-' });

  const [selectedBulan, setSelectedBulan] = useState(BULAN_OPTIONS[0]);
  const [showBulanModal, setShowBulanModal] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  // STATE UNTUK FITUR CETAK
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState(MODE_CETAK_OPTIONS[0]);
  const [startMonth, setStartMonth] = useState(PRINT_BULAN_OPTIONS[0]);
  const [endMonth, setEndMonth] = useState(PRINT_BULAN_OPTIONS[5]);
  const [selectedSemester, setSelectedSemester] = useState(SEMESTER_OPTIONS[0]);
  const [selectedPaper, setSelectedPaper] = useState(PAPER_OPTIONS[0]);

  // STATE UNTUK DROPDOWN REUSABLE
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownData, setDropdownData] = useState([]);
  const [dropdownTitle, setDropdownTitle] = useState('');
  const [dropdownOnSelect, setDropdownOnSelect] = useState(null);

  useEffect(() => {
    fetchDataAbsensi();
  }, [selectedBulan]);

  const fetchDataAbsensi = async () => {
    try {
      setLoading(true);
      const sessionString = await AsyncStorage.getItem('userSession');
      const userData = sessionString ? JSON.parse(sessionString) : null;
      const idKelasWali = userData?.idKelas || userData?.idKelasWali || userData?.data?.idKelas || '';

      if (!idKelasWali) {
        Alert.alert('Informasi', 'ID Kelas perwalian tidak ditemukan.');
        setLoading(false);
        return;
      }

      const payload = { idKelasWali, bulan: selectedBulan.value };
      const response = await callBackendAPI('getAbsensiKelasWali', payload).catch(() => null);

      if (response?.success) {
        setRekapSiswa(response.data || []);
        setTotalHariEfektif(response.totalHariEfektif || 0);
        setInfoKelas(response.infoKelas || { namaKelas: '-', namaWali: '-', nipWali: '-' }); 
      } else {
        Alert.alert('Gagal', response?.message || 'Gagal mengambil data absensi.');
      }
    } catch (error) {
      Alert.alert('Error', 'Kesalahan jaringan saat memuat absensi.');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (siswa) => {
    setSelectedStudentDetail(siswa);
    setDetailModalVisible(true);
  };

  // HELPER UNTUK MEMBUKA CUSTOM DROPDOWN
  const openCustomDropdown = (title, data, onSelectCallback) => {
    setDropdownTitle(title);
    setDropdownData(data);
    setDropdownOnSelect(() => onSelectCallback);
    setDropdownVisible(true);
  };

  // FUNGSI EKSEKUSI CETAK
  const handleExecutePrint = async () => {
    if (rekapSiswa.length === 0) {
      Alert.alert('Informasi', 'Tidak ada data untuk dicetak saat ini.');
      return;
    }

    try {
      let periodeText = printMode.value === 'Bulan' 
        ? `Periode: ${startMonth.label} s.d ${endMonth.label}`
        : `Semester: ${selectedSemester.label}`;

      const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const dateNow = new Date();
      const tanggalCetak = `${dateNow.getDate()} ${bulanIndo[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

      const namaKelasFormat = infoKelas.namaKelas.replace(/\s+/g, '_');
      const keteranganWaktu = printMode.value === 'Bulan' ? `${startMonth.label}_sd_${endMonth.label}` : selectedSemester.label;
      
      const documentTitle = `Absen_${namaKelasFormat}_${keteranganWaktu}`;
      const safeDocumentTitle = documentTitle.replace(/[^a-zA-Z0-9_-]/g, '');

      const pageSize = selectedPaper.value === 'A4' ? 'A4' : '210mm 330mm'; 

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${safeDocumentTitle}</title>
          <style>
            @page { size: ${pageSize}; margin: 10mm 15mm; }
            body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
            .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .header h2 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
            .sub-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #333; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 5px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: center; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .col-nama { text-align: left; width: 35%; padding-left: 8px; }
            .footer { margin-top: 20px; width: 250px; float: right; text-align: left; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>REKAPITULASI ABSENSI SISWA</h2>
            <div class="sub-header">
              <span>Kelas : ${infoKelas.namaKelas}</span>
              <span>${periodeText}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th class="col-nama">Nama Siswa</th>
                <th>Hadir (H)</th>
                <th>Sakit (S)</th>
                <th>Izin (I)</th>
                <th>Alpa (A)</th>
                <th>Bolos (B)</th>
                <th>Kehadiran (%)</th>
              </tr>
            </thead>
            <tbody>
              ${rekapSiswa.map((siswa, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="col-nama">${siswa.namaSiswa}</td>
                  <td>${siswa.H}</td>
                  <td>${siswa.S}</td>
                  <td>${siswa.I}</td>
                  <td>${siswa.A}</td>
                  <td>${siswa.B}</td>
                  <td>${siswa.persentase}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p style="margin: 0 0 5px 0;">Laulalang, ${tanggalCetak}</p>
            <p style="margin: 0;">Wali Kelas</p>
            <div style="margin-top: 60px;">
              <p style="margin: 0; font-weight: bold; text-decoration: underline;">${infoKelas.namaWali}</p>
              <p style="margin: 0;">NIP. ${infoKelas.nipWali}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await Print.printAsync({ 
        html: htmlContent 
      });
      
      setShowPrintModal(false);
    } catch (error) {
      Alert.alert('Gagal', 'Kesalahan cetak: ' + error.message);
    }
  };

  const renderDetailGroups = () => {
    const details = selectedStudentDetail?.detail || [];
    if (details.length === 0) return <Text style={styles.emptyDetailText}>Tidak ada catatan S, I, A, atau B.</Text>;

    const alpaLogs = details.filter(d => d.statusHarian === 'A');
    const bolosLogs = details.filter(d => d.statusHarian === 'B');
    const sakitLogs = details.filter(d => d.statusHarian === 'S');
    const izinLogs = details.filter(d => d.statusHarian === 'I');

    let totalMapelBolos = 0;
    bolosLogs.forEach(b => {
      if (b.catatanMapel && b.catatanMapel !== 'Tidak ada data spesifik') {
        totalMapelBolos += b.catatanMapel.split(',').length;
      }
    });

    return (
      <View>
        {alpaLogs.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#DC2626' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.groupHeaderText, { color: '#DC2626' }]}>Alpa : {alpaLogs.length}</Text>
            </View>
            <View style={styles.groupBody}>
              {alpaLogs.map((item, idx) => <Text key={idx} style={styles.listItem}>• {item.tanggal}</Text>)}
            </View>
          </View>
        )}

        {bolosLogs.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#92400E' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.groupHeaderText, { color: '#92400E' }]}>Bolos : {bolosLogs.length} | Total Mapel : {totalMapelBolos}</Text>
            </View>
            <View style={styles.groupBody}>
              {bolosLogs.map((item, idx) => {
                const mapelArray = item.catatanMapel ? item.catatanMapel.split(', ') : [];
                return (
                  <View key={idx} style={styles.listItemRow}>
                    <Text style={styles.listItem}>• Tanggal: {item.tanggal}</Text>
                    {mapelArray.map((mapel, mIdx) => (
                      <Text key={mIdx} style={[styles.listItemSub, { color: '#5D2A08', fontWeight: 'bold' }]}>└ Mapel: {mapel}</Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {sakitLogs.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#EA580C' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FFEDD5' }]}>
              <Text style={[styles.groupHeaderText, { color: '#EA580C' }]}>Sakit : {sakitLogs.length}</Text>
            </View>
            <View style={styles.groupBody}>
              {sakitLogs.map((item, idx) => <Text key={idx} style={styles.listItem}>• {item.tanggal}</Text>)}
            </View>
          </View>
        )}

        {izinLogs.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#2563EB' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.groupHeaderText, { color: '#2563EB' }]}>Izin : {izinLogs.length}</Text>
            </View>
            <View style={styles.groupBody}>
              {izinLogs.map((item, idx) => <Text key={idx} style={styles.listItem}>• {item.tanggal}</Text>)}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerBox}>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowBulanModal(true)}>
          <Ionicons name="calendar-outline" size={18} color="#2563EB" />
          <Text style={styles.dropdownText}>{selectedBulan.label}</Text>
          <Ionicons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>

        <View style={styles.actionGroup}>
          <Text style={styles.hariEfektif}>Hari Efektif: {totalHariEfektif}</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPrintModal(true)}>
            <Ionicons name="print" size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={fetchDataAbsensi} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#2563EB" /> : <Ionicons name="refresh" size={20} color="#2563EB" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT SECTION */}
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headCell, styles.colNo]}>No</Text>
            <Text style={[styles.headCell, styles.colNama]}>Nama Siswa</Text>
            <Text style={[styles.headCell, styles.colNilai]}>H</Text>
            <Text style={[styles.headCell, styles.colNilai]}>S</Text>
            <Text style={[styles.headCell, styles.colNilai]}>I</Text>
            <Text style={[styles.headCell, styles.colNilai]}>A</Text>
            <Text style={[styles.headCell, styles.colNilai]}>B</Text>
            <Text style={[styles.headCell, styles.colDetail]}>Detail %</Text>
          </View>

          {loading ? (
            <View style={styles.innerCenterBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.infoText}>Memuat data absensi...</Text>
            </View>
          ) : rekapSiswa.length === 0 ? (
            <View style={styles.innerCenterBox}>
              <Text style={styles.infoText}>Tidak ada data absensi untuk bulan ini.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={true}>
              {rekapSiswa.map((siswa, index) => {
                const isEven = index % 2 === 0;
                return (
                  <View key={siswa.idSiswa || index} style={[styles.tableRow, isEven ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.colNo]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.colNama, { fontWeight: '600' }]} numberOfLines={1}>{siswa.namaSiswa}</Text>
                    <Text style={[styles.cell, styles.colNilai, { color: '#16A34A' }]}>{siswa.H}</Text>
                    <Text style={[styles.cell, styles.colNilai, { color: '#EAB308' }]}>{siswa.S}</Text>
                    <Text style={[styles.cell, styles.colNilai, { color: '#3B82F6' }]}>{siswa.I}</Text>
                    <Text style={[styles.cell, styles.colNilai, { color: '#DC2626' }]}>{siswa.A}</Text>
                    <Text style={[styles.cell, styles.colNilai, { color: '#9333EA', fontWeight: 'bold' }]}>{siswa.B}</Text>
                    
                    <View style={[styles.colDetail, styles.detailCellGroup]}>
                      <Text style={styles.persenText}>{siswa.persentase}%</Text>
                      <TouchableOpacity style={styles.detailBtn} onPress={() => openDetail(siswa)}>
                        <Ionicons name="list-circle" size={24} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* MODAL FILTER BULAN UTAMA */}
      <Modal visible={showBulanModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBulanContent}>
            <Text style={styles.modalTitle}>Pilih Bulan</Text>
            <FlatList
              data={BULAN_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bulanOption}
                  onPress={() => {
                    setSelectedBulan(item);
                    setShowBulanModal(false);
                  }}
                >
                  <Text style={[styles.bulanOptionText, selectedBulan.value === item.value && styles.bulanOptionActive]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowBulanModal(false)}>
              <Text style={styles.closeModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DETAIL SISWA */}
      <Modal visible={detailModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDetailContent}>
            <Text style={styles.modalTitle}>Detail Ketidakhadiran</Text>
            <Text style={styles.modalSubtitle}>{selectedStudentDetail?.namaSiswa}</Text>
            
            <ScrollView style={styles.detailListContainer}>
              {renderDetailGroups()}
            </ScrollView>

            <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setDetailModalVisible(false)}>
              <Text style={[styles.closeModalText, { color: '#FFF' }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PENGATURAN CETAK */}
      <Modal visible={showPrintModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalPrintContent}>
            <Text style={styles.modalTitle}>Pengaturan Cetak</Text>
            
            {/* Pilih Mode */}
            <Text style={styles.inputLabel}>Mode Cetak</Text>
            <TouchableOpacity style={styles.customDropdownBtn} onPress={() => openCustomDropdown('Pilih Mode Cetak', MODE_CETAK_OPTIONS, setPrintMode)}>
              <Text style={styles.customDropdownText}>{printMode.label}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            {/* Pilih Ukuran Kertas */}
            <Text style={styles.inputLabel}>Ukuran Kertas</Text>
            <TouchableOpacity style={styles.customDropdownBtn} onPress={() => openCustomDropdown('Pilih Ukuran Kertas', PAPER_OPTIONS, setSelectedPaper)}>
              <Text style={styles.customDropdownText}>{selectedPaper.label}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            {/* Pilihan Berdasarkan Mode */}
            {printMode.value === 'Bulan' ? (
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Dari Bulan</Text>
                  <TouchableOpacity style={styles.customDropdownBtn} onPress={() => openCustomDropdown('Pilih Bulan Mulai', PRINT_BULAN_OPTIONS, setStartMonth)}>
                    <Text style={styles.customDropdownText}>{startMonth.label}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Sampai Bulan</Text>
                  <TouchableOpacity style={styles.customDropdownBtn} onPress={() => openCustomDropdown('Pilih Bulan Akhir', PRINT_BULAN_OPTIONS, setEndMonth)}>
                    <Text style={styles.customDropdownText}>{endMonth.label}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>Pilih Semester</Text>
                <TouchableOpacity style={styles.customDropdownBtn} onPress={() => openCustomDropdown('Pilih Semester', SEMESTER_OPTIONS, setSelectedSemester)}>
                  <Text style={styles.customDropdownText}>{selectedSemester.label}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={[styles.actionModalBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setShowPrintModal(false)}>
                <Text style={[styles.closeModalText, { color: '#334155' }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionModalBtn, { backgroundColor: '#2563EB' }]} onPress={handleExecutePrint}>
                <Ionicons name="print-outline" size={18} color="#FFF" style={{ marginRight: 5 }} />
                <Text style={[styles.closeModalText, { color: '#FFF' }]}>Cetak</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REUSABLE DROPDOWN MODAL */}
      <Modal visible={dropdownVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBulanContent}>
            <Text style={styles.modalTitle}>{dropdownTitle}</Text>
            <FlatList
              data={dropdownData}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bulanOption}
                  onPress={() => {
                    if (dropdownOnSelect) dropdownOnSelect(item);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.bulanOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDropdownVisible(false)}>
              <Text style={styles.closeModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  dropdownText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hariEfektif: { fontSize: 12, color: '#64748B', marginRight: 5, fontWeight: '500' },
  iconBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  tableContainer: { padding: 15, minWidth: 620 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1E293B', paddingVertical: 10, borderRadius: 6, marginBottom: 4 },
  headCell: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: '#F8FAFC' },
  cell: { fontSize: 13, color: '#334155', textAlign: 'center' },
  colNo: { width: 40 },
  colNama: { width: 220, textAlign: 'left', paddingHorizontal: 10 },
  colNilai: { width: 40 },
  colDetail: { width: 100, textAlign: 'center' },
  detailCellGroup: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  persenText: { fontWeight: 'bold', fontSize: 13, color: '#334155' },
  detailBtn: { padding: 2 },
  innerCenterBox: { height: 250, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, marginTop: 10 },
  infoText: { marginTop: 12, color: '#64748B', fontSize: 13, fontStyle: 'italic' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBulanContent: { width: 280, backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: 400 },
  modalDetailContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalPrintContent: { width: 320, backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 15, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 15, textAlign: 'center', fontWeight: '600' },
  bulanOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bulanOptionText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  bulanOptionActive: { color: '#2563EB', fontWeight: 'bold' },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8 },
  closeDetailBtn: { marginTop: 15, padding: 12, backgroundColor: '#2563EB', borderRadius: 8 },
  closeModalText: { textAlign: 'center', fontWeight: 'bold', color: '#334155' },
  emptyDetailText: { textAlign: 'center', color: '#64748B', fontStyle: 'italic', marginTop: 20 },

  // Detail Groups
  detailListContainer: { flexGrow: 0 },
  groupCard: { backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, overflow: 'hidden' },
  groupHeader: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  groupHeaderText: { fontWeight: 'bold', fontSize: 13 },
  groupBody: { padding: 12 },
  listItemRow: { marginBottom: 8 },
  listItem: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 2 },
  listItemSub: { fontSize: 12, color: '#64748B', marginLeft: 10, marginTop: 2, lineHeight: 18 },

  // Form Cetak
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 10 },
  customDropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  customDropdownText: { fontSize: 14, color: '#334155' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  actionModalBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 }
});