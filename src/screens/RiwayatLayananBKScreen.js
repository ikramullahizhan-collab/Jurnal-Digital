import React, { useState, useEffect, useContext } from 'react';
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
import * as Print from 'expo-print';
import { callBackendAPI } from '../api/client'; 
import { AuthContext } from '../context/AuthContext'; 

const SEMESTER_OPTIONS = ['Ganjil', 'Genap'];
const BULAN_GANJIL = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_GENAP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

export default function RiwayatLayananBKScreen({ navigation }) {
  const { user } = useContext(AuthContext);

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

  // PEMBARUAN: Penyederhanaan fungsi parsing bulan
  const parseDateToMonthIndex = (dateString) => {
    if (!dateString) return -1;
    
    const str = String(dateString).trim();
    const parts = str.split(/[-/.]/);
    
    if (parts.length === 3) {
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return monthNum - 1; 
      }
    }

    const months = [
      'januari', 'februari', 'maret', 'april', 'mei', 'juni',
      'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ];
    const lowerStr = str.toLowerCase();
    for (let i = 0; i < months.length; i++) {
      if (lowerStr.includes(months[i])) {
        return i;
      }
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

  const handleCetak = async () => {
    const namaGuruBKLogin = user?.nama || user?.name || user?.namaGuru || ""; 

    if (!namaGuruBKLogin) {
      if (Platform.OS === 'web') {
        window.alert('Gagal mengidentifikasi nama Guru BK yang sedang login.');
      } else {
        Alert.alert('Error', 'Gagal mengidentifikasi nama Guru BK yang sedang login.');
      }
      return;
    }

    const dataMilikGuru = filteredData.filter(item => 
      item.namaGuruBK && item.namaGuruBK.toLowerCase() === namaGuruBKLogin.toLowerCase()
    );

    if (dataMilikGuru.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Tidak ada data layanan untuk dicetak pada sesi Guru BK saat ini.');
      } else {
        Alert.alert('Info', 'Tidak ada data layanan untuk dicetak pada sesi Guru BK saat ini.');
      }
      return;
    }

    try {
      const getPrintImgUrl = (item) => {
        const url = item.dokumentasi || item.Dokumentasi || item.foto || item.fotoDokumentasi || null;
        if (!url || typeof url !== 'string') return null;
        const match = url.match(/[-\w]{25,}/);
        if (match && match[0]) {
          return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w800`;
        }
        return url;
      };

      const tableRows = dataMilikGuru.map(item => `
        <tr>
          <td>${item.tanggal || '-'}</td>
          <td>${item.namaSiswa || '-'}</td>
          <td>${item.kelas || '-'}</td>
          <td>${item.jenisLayanan || '-'}</td>
          <td>${item.statusKasus || '-'}</td>
          <td>${item.kasus || item.keluhan || '-'}</td>
          <td>${item.solusi || '-'}</td>
        </tr>
      `).join('');

      const imagesToPrint = dataMilikGuru.filter(item => getPrintImgUrl(item));
      const chunkedImages = [];
      for (let i = 0; i < imagesToPrint.length; i += 4) {
        chunkedImages.push(imagesToPrint.slice(i, i + 4));
      }

      const lampiranHTML = chunkedImages.map((chunk, index) => `
        <div class="page-break"></div>
        <h2>${index === 0 ? 'Lampiran Dokumentasi' : 'Lampiran Dokumentasi (Lanjutan)'}</h2>
        <div class="grid-container">
          ${chunk.map(item => `
            <div class="lampiran-item">
              <p class="lampiran-text">
                <strong>Tanggal:</strong> ${item.tanggal || '-'}<br/>
                <strong>Nama Siswa:</strong> ${item.namaSiswa || '-'}
              </p>
              <img src="${getPrintImgUrl(item)}" alt="Dokumentasi" 
                   onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\\'color:red;\\'><i>Gagal memuat gambar.</i></p>');" />
            </div>
          `).join('')}
        </div>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Laporan Layanan BK - ${selectedBulan}</title>
            <style>
              @page { margin: 15mm; }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
              
              /* CSS Khusus Mode Web Preview */
              @media screen {
                body { padding-top: 70px; background-color: #f1f5f9; }
                .document-wrapper { background-color: white; max-width: 210mm; margin: 0 auto; padding: 20mm; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 4px; }
              }
              @media print {
                .no-print { display: none !important; }
                body { padding-top: 0 !important; background-color: white; }
                .document-wrapper { box-shadow: none; padding: 0; max-width: 100%; margin: 0; }
              }

              .preview-header {
                position: fixed; top: 0; left: 0; right: 0; background-color: #1e293b; color: white;
                padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 1000;
              }
              .btn-print { background-color: #10b981; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-left: 10px; }
              .btn-print:hover { background-color: #059669; }
              .btn-close { background-color: #ef4444; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
              .btn-close:hover { background-color: #dc2626; }

              .header-container { text-align: center; margin-bottom: 38px; }
              h1 { font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
              p.subtitle { font-size: 14px; color: #666; margin: 0 0 5px 0; }
              p.guru-bk { font-size: 14px; color: #0f172a; font-weight: bold; margin: 5px 0 0 0; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
              th { background-color: #f1f5f9 !important; font-weight: bold; color: #334155; }
              
              .page-break { page-break-before: always; }
              h2 { font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
              
              .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 15px; height: 85vh; box-sizing: border-box; }
              .lampiran-item { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background-color: #f8fafc !important; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; box-sizing: border-box; overflow: hidden; }
              .lampiran-text { font-size: 13px; margin: 0 0 10px 0; color: #475569; line-height: 1.4; }
              .lampiran-item img { max-width: 100%; max-height: 80%; object-fit: contain; margin: auto; }
            </style>
          </head>
          <body>
            
            <div class="no-print preview-header">
              <div>
                <strong style="font-size: 15px;">Pratinjau Cetak</strong>
                <span style="font-size: 12px; opacity: 0.8; margin-left: 12px;">⏳ Pastikan gambar telah termuat sebelum dicetak.</span>
              </div>
              <div>
                <button class="btn-close" onclick="window.parent.closePrintPreview()">Tutup</button>
                <button class="btn-print" onclick="window.print()">🖨️ Cetak Dokumen</button>
              </div>
            </div>
            
            <div class="document-wrapper">
              <div class="header-container">
                <h1>Laporan Riwayat Layanan Bimbingan dan Konseling</h1>
                <p class="subtitle">Semester: <strong>${selectedSemester}</strong> | Bulan: <strong>${selectedBulan}</strong></p>
                <p class="guru-bk">Guru Pembimbing: <strong>${namaGuruBKLogin}</strong></p>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 10%;">Tanggal</th>
                    <th style="width: 15%;">Nama Siswa</th>
                    <th style="width: 10%;">Kelas</th>
                    <th style="width: 15%;">Jenis Layanan</th>
                    <th style="width: 10%;">Status</th>
                    <th style="width: 20%;">Masalah/Kasus</th>
                    <th style="width: 20%;">Solusi</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>

              ${lampiranHTML}
            </div>
          </body>
        </html>
      `;

      // PEMBARUAN: Menggunakan Fullscreen Iframe Preview untuk Web/PWA
      if (Platform.OS === 'web') {
        window.closePrintPreview = () => {
          const iframe = document.getElementById('print-preview-iframe');
          if (iframe) iframe.remove();
        };

        window.closePrintPreview();

        const iframe = document.createElement('iframe');
        iframe.id = 'print-preview-iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.zIndex = '99999';
        iframe.style.backgroundColor = '#f1f5f9';
        iframe.style.border = 'none';

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
      } else {
        // Mode Native (Android/iOS)
        await Print.printAsync({ html: htmlContent });
      }

    } catch (error) {
      console.error('Print Error:', error);
      if (Platform.OS === 'web') {
        window.alert('Terjadi kesalahan saat mencoba mencetak dokumen.');
      } else {
        Alert.alert('Error', 'Terjadi kesalahan saat mencoba mencetak dokumen.');
      }
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // PEMBARUAN: Menggunakan URL Thumbnail Google Drive yang stabil di Web & Native
  const getDriveDirectUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/[-\w]{25,}/); 
    if (match && match[0]) {
      return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
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
                // PEMBARUAN: Fallback key menggunakan index
                keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
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