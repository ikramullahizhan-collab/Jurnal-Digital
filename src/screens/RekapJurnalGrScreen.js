import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { callBackendAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';

const getInitialStatus = (status) => {
  if (!status) return 'B';
  const s = status.toString().trim().toUpperCase();
  if (s.startsWith('H')) return 'H';
  if (s.startsWith('S')) return 'S';
  if (s.startsWith('I')) return 'I';
  if (s.startsWith('A')) return 'A';
  return 'B';
};

const getValidImageUri = (url) => {
  if (!url || typeof url !== 'string') return null;
  const str = url.trim();

  // 1. Link Google Drive
  if (str.includes('drive.google.com')) {
    const match = str.match(/[-\w]{25,}/);
    if (match) return `https://lh3.googleusercontent.com/d/${match[0]}`;
  }

  // 2. Link Online, File Lokal, atau Data URI
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('file://') ||
    str.startsWith('content://') ||
    str.startsWith('data:')
  ) {
    return str;
  }

  // 3. Raw Base64 String
  return `data:image/jpeg;base64,${str}`;
};

const convertUriToBase64 = async (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  const cleanUri = uri.trim();

  // 1. Sudah dalam format Data URI Base64
  if (cleanUri.startsWith('data:image')) {
    return cleanUri;
  }

  // 2. File Lokal (file://, content://, atau path direktori)
  if (cleanUri.startsWith('file://') || cleanUri.startsWith('content://') || cleanUri.startsWith('/')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(cleanUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      console.log('Gagal membaca file lokal:', err);
      return null;
    }
  }

  // 3. Format Link Google Drive
  let targetUrl = cleanUri;
  if (cleanUri.includes('drive.google.com')) {
    const match = cleanUri.match(/[-\w]{25,}/);
    if (match) {
      targetUrl = `https://lh3.googleusercontent.com/d/${match[0]}`;
    }
  }

  // 4. Link Gambar Online (http / https) -> Gunakan fetch & FileReader
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    try {
      const response = await fetch(targetUrl);
      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(targetUrl);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.log('Gagal konversi gambar online:', err);
      return targetUrl;
    }
  }

  // 5. Raw Base64 string tanpa prefix
  return `data:image/jpeg;base64,${cleanUri}`;
};

const parseMonthFromWaktu = (waktuStr) => {
  if (!waktuStr) return null;
  const str = waktuStr.toString().trim();

  // 1. Format YYYY-MM-DD atau YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split(' ')[0].split(/[-/]/);
    return parseInt(parts[1], 10) - 1;
  }

  // 2. Format DD-MM-YYYY atau DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(' ')[0].split(/[-/]/);
    return parseInt(parts[1], 10) - 1;
  }

  // 3. Nama Bulan Bahasa Indonesia (misal: "15 September 2024")
  const namaBulanIndo = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ];
  const lower = str.toLowerCase();
  for (let i = 0; i < namaBulanIndo.length; i++) {
    if (lower.includes(namaBulanIndo[i])) {
      return i;
    }
  }

  // 4. Fallback ke parser bawaan JS
  const d = new Date(str.replace(/-/g, '/'));
  return isNaN(d.getTime()) ? null : d.getMonth();
};

const DAFTAR_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function RekapJurnalGrScreen() {
  const { user } = useContext(AuthContext);

  const [jurnalData, setJurnalData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchKelas, setSearchKelas] = useState('');
  const [statusTinjauan, setStatusTinjauan] = useState('Semua');

  // Modal Absen States
  const [modalAbsenVisible, setModalAbsenVisible] = useState(false);
  const [selectedAbsen, setSelectedAbsen] = useState([]);
  const [selectedAbsenKelas, setSelectedAbsenKelas] = useState('');
  const [selectedJurnalId, setSelectedJurnalId] = useState(null);
  const [savingAbsen, setSavingAbsen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal Detail States
  const [modalDetailVisible, setModalDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Modal Cetak States
  const [modalCetakVisible, setModalCetakVisible] = useState(false);
  const [jenisCetak, setJenisCetak] = useState('Bulanan'); // 'Bulanan' | 'Semester'
  const [bulanPilihan, setBulanPilihan] = useState(new Date().getMonth()); // 0-11
  const [semesterPilihan, setSemesterPilihan] = useState('Ganjil'); // 'Ganjil' | 'Genap'
  const [pakaiFoto, setPakaiFoto] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Custom Dropdown Modal States
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [selectModalType, setSelectModalType] = useState(''); // 'STATUS_TINJAUAN', 'JENIS_CETAK', 'BULAN_CETAK', 'SEMESTER_CETAK'

  useEffect(() => {
    fetchDataJurnal();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchKelas, statusTinjauan, jurnalData]);

  const fetchDataJurnal = async () => {
    setLoading(true);
    try {
      const namaGuruAktif = user?.nama || user?.namaLengkap || '';
      const res = await callBackendAPI('getJurnalGuruSaya', { namaGuruAktif });

      if (res && res.success && Array.isArray(res.data)) {
        const formattedData = res.data.map((item) => ({
          id: item.idJurnal,
          waktu: item.waktu,
          kelas: item.kelas,
          jamKe: item.jamKe,
          mapel: item.namaMapel,
          materi: item.materi,
          uraian: item.uraian,
          hambatan: item.hambatan,
          catatanKepsek: item.catatanKepsek,
          foto: item.buktiFoto,
          statusTinjauan: (item.catatanKepsek && item.catatanKepsek.trim() !== '') ? 'Sudah' : 'Belum',
          absenSiswa: item.listAbsen || []
        }));

        setJurnalData(formattedData);
      } else {
        Alert.alert('Informasi', res?.message || 'Data jurnal tidak ditemukan.');
      }
    } catch (error) {
      console.log('Error fetch jurnal:', error);
      Alert.alert('Error', 'Gagal memuat data jurnal.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = jurnalData;

    if (searchKelas.trim() !== '') {
      result = result.filter(item =>
        item.kelas.toLowerCase().includes(searchKelas.toLowerCase())
      );
    }

    if (statusTinjauan === 'Belum') {
      result = result.filter(item => item.statusTinjauan === 'Belum');
    } else if (statusTinjauan === 'Sudah') {
      result = result.filter(item => item.statusTinjauan === 'Sudah');
    }

    setFilteredData(result);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus jurnal ini? Data absensi siswa terkait juga akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await callBackendAPI('deleteJurnal', { idJurnal: id });

              if (res && (res.success || res.status === 'success')) {
                setJurnalData(prev => prev.filter(item => item.id !== id));
                Alert.alert('Berhasil', 'Jurnal dan data presensi berhasil dihapus.');
              } else {
                Alert.alert('Gagal', res?.message || 'Gagal menghapus jurnal di server.');
              }
            } catch (error) {
              console.log('Error hapus jurnal:', error);
              Alert.alert('Error', 'Terjadi kesalahan koneksi saat menghapus data.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleStatusChange = (index, newStatus) => {
    setSelectedAbsen((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleSaveAbsen = async () => {
    if (!selectedJurnalId) return;

    setSavingAbsen(true);
    try {
      const res = await callBackendAPI('updateAbsensiJurnal', {
        idJurnal: selectedJurnalId,
        listAbsen: selectedAbsen
      });

      if (res && (res.success || res.status === 'success')) {
        setJurnalData((prev) =>
          prev.map((item) =>
            item.id === selectedJurnalId
              ? { ...item, absenSiswa: selectedAbsen }
              : item
          )
        );
        Alert.alert('Berhasil', 'Data presensi siswa berhasil diperbarui.');
        setIsEditMode(false);
        setModalAbsenVisible(false);
      } else {
        Alert.alert('Gagal', res?.message || 'Gagal menyimpan perubahan presensi.');
      }
    } catch (error) {
      console.log('Error update absensi:', error);
      Alert.alert('Error', 'Terjadi kesalahan koneksi saat menyimpan data.');
    } finally {
      setSavingAbsen(false);
    }
  };

  // Handler Dropdown Custom Modal
  const openSelectModal = (type) => {
    setSelectModalType(type);
    setSelectModalVisible(true);
  };

  const handleSelectOption = (value) => {
    if (selectModalType === 'STATUS_TINJAUAN') {
      setStatusTinjauan(value);
    } else if (selectModalType === 'JENIS_CETAK') {
      setJenisCetak(value);
    } else if (selectModalType === 'BULAN_CETAK') {
      setBulanPilihan(value);
    } else if (selectModalType === 'SEMESTER_CETAK') {
      setSemesterPilihan(value);
    }
    setSelectModalVisible(false);
  };

  const getStatusTinjauanLabel = () => {
    if (statusTinjauan === 'Belum') return 'Belum Ditinjau';
    if (statusTinjauan === 'Sudah') return 'Sudah Ditinjau';
    return 'Semua Status';
  };

  const getJenisCetakLabel = () => {
    return jenisCetak === 'Bulanan' ? 'Cetak Bulanan' : 'Cetak Per Semester';
  };

  const getBulanPilihanLabel = () => {
    return DAFTAR_BULAN[parseInt(bulanPilihan, 10)] || 'Pilih Bulan';
  };

  const getSemesterPilihanLabel = () => {
    return semesterPilihan === 'Ganjil'
      ? 'Semester Ganjil (Juli - Des)'
      : 'Semester Genap (Jan - Juni)';
  };

  // --- FUNGSI CETAK PDF & PREVIEW ---
  const handleProsesCetakPdf = async () => {
    setGeneratingPdf(true);

    try {
      const dataTerfilter = jurnalData.filter((item) => {
        const bulanIndex = parseMonthFromWaktu(item.waktu);
        if (bulanIndex === null) return false;

        if (jenisCetak === 'Bulanan') {
          return bulanIndex === parseInt(bulanPilihan, 10);
        } else {
          return semesterPilihan === 'Ganjil' 
            ? (bulanIndex >= 6 && bulanIndex <= 11)
            : (bulanIndex >= 0 && bulanIndex <= 5);
        }
      });

      if (dataTerfilter.length === 0) {
        Alert.alert('Informasi', 'Tidak ada data jurnal pada periode yang dipilih.');
        setGeneratingPdf(false);
        return;
      }

      const namaGuru = user?.nama || user?.namaLengkap || 'Guru Pengajar';
      const judulPeriode = jenisCetak === 'Bulanan' 
        ? `Bulan ${DAFTAR_BULAN[parseInt(bulanPilihan, 10)]}`
        : `Semester ${semesterPilihan}`;

      let rowsHtml = '';
      let lampiranHtml = '';

      for (let index = 0; index < dataTerfilter.length; index++) {
        const item = dataTerfilter[index];

        rowsHtml += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${item.waktu || '-'}</td>
            <td style="text-align: center;">${item.kelas || '-'}<br/><small style="color: #666;">(Jam: ${item.jamKe || '-'})</small></td>
            <td>
              <strong>${item.mapel || ''}</strong><br/>
              <b>Materi:</b> ${item.materi || '-'}<br/>
              <b>Kegiatan:</b> ${item.uraian || '-'}
            </td>
            <td>${item.hambatan || '-'}</td>
          </tr>
        `;

        if (pakaiFoto && item.foto) {
          const base64Img = await convertUriToBase64(item.foto);

          if (base64Img) {
            lampiranHtml += `
              <div style="margin-bottom: 20px; page-break-inside: avoid; text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">[Jurnal #${index + 1}] ${item.kelas} - ${item.mapel} (${item.waktu})</p>
                <img src="${base64Img}" style="max-width: 100%; max-height: 280px; border-radius: 4px; object-fit: contain;" />
              </div>
            `;
          }
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Jurnal Mengajar Guru</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
              .header p { margin: 4px 0 0 0; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #444; padding: 8px; text-align: left; vertical-align: top; }
              th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
              .page-break { page-break-before: always; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>REKAPITULASI JURNAL MENGAJAR GURU</h2>
              <p>Nama Guru: <strong>${namaGuru}</strong> | Periode: <strong>${judulPeriode}</strong></p>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">No</th>
                  <th style="width: 15%;">Tanggal</th>
                  <th style="width: 12%;">Kelas</th>
                  <th style="width: 43%;">Materi & Kegiatan</th>
                  <th style="width: 25%;">Hambatan / Kendala</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            ${pakaiFoto && lampiranHtml ? `
              <div class="page-break"></div>
              <h3 style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">LAMPIRAN DOKUMENTASI KEGIATAN</h3>
              ${lampiranHtml}
            ` : ''}
          </body>
        </html>
      `;

      setModalCetakVisible(false);
      await Print.printAsync({ html: htmlContent });

    } catch (error) {
      console.log('Error Cetak PDF:', error);
      Alert.alert('Error', 'Gagal memproses file PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderModalAbsen = () => {
    const summary = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Bolos: 0 };
    if (selectedAbsen) {
      selectedAbsen.forEach((siswa) => {
        const st = getInitialStatus(siswa.status);
        if (st === 'H') summary.Hadir++;
        else if (st === 'S') summary.Sakit++;
        else if (st === 'I') summary.Izin++;
        else if (st === 'A') summary.Alpa++;
        else if (st === 'B') summary.Bolos++;
      });
    }

    const summaryItems = Object.keys(summary).filter((key) => summary[key] > 0);
    const totalSiswa = selectedAbsen ? selectedAbsen.length : 0;

    const getSummaryTheme = (status) => {
      switch(status) {
        case 'H': return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
        case 'S': return { bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A' };
        case 'I': return { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE' };
        case 'A': return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
        default:  return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
      }
    };

    const statusOptions = [
      { key: 'H', label: 'H', full: 'Hadir', bg: '#16A34A' },
      { key: 'S', label: 'S', full: 'Sakit', bg: '#EAB308' },
      { key: 'I', label: 'I', full: 'Izin', bg: '#2563EB' },
      { key: 'A', label: 'A', full: 'Alpa', bg: '#DC2626' },
      { key: 'B', label: 'B', full: 'Bolos', bg: '#6B7280' },
    ];

    return (
      <Modal visible={modalAbsenVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.btnHeaderEdit}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Ionicons name={isEditMode ? "close-circle-outline" : "create-outline"} size={16} color="#2563EB" />
                <Text style={styles.btnHeaderEditText}>{isEditMode ? "Batal" : "Edit"}</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {isEditMode ? "Edit Absensi" : "Detail Absensi"}
              </Text>

              <TouchableOpacity 
                style={styles.btnHeaderClose}
                onPress={() => setModalAbsenVisible(false)}
              >
                <Text style={styles.btnHeaderCloseText}>Tutup</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSiswaContainer}>
              <Text style={styles.infoSiswaText}>
                Kelas: <Text style={{fontWeight: 'bold'}}>{selectedAbsenKelas}</Text>
              </Text>
              <Text style={styles.infoSiswaText}>
                Total Siswa: <Text style={{fontWeight: 'bold'}}>{totalSiswa}</Text>
              </Text>
            </View>

            {summaryItems.length > 0 && (
              <View style={styles.summaryContainer}>
                {summaryItems.map((key) => {
                  const theme = getSummaryTheme(getInitialStatus(key));
                  return (
                    <View 
                      key={key} 
                      style={[
                        styles.summaryBadgeItem, 
                        { backgroundColor: theme.bg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.summaryBadgeText, { color: theme.text }]}>
                        {key}: {summary[key]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <ScrollView style={styles.modalContent}>
              {selectedAbsen?.map((siswa, index) => {
                const initStatus = getInitialStatus(siswa.status);
                return (
                  <View key={index} style={styles.absenRow}>
                    <Text style={styles.absenName}>{index + 1}. {siswa.nama}</Text>
                    {isEditMode ? (
                      <View style={styles.statusChipGroup}>
                        {statusOptions.map((st) => {
                          const isSelected = initStatus === st.key;
                          return (
                            <TouchableOpacity
                              key={st.key}
                              style={[
                                styles.statusChip,
                                { backgroundColor: isSelected ? st.bg : '#E2E8F0' }
                              ]}
                              onPress={() => handleStatusChange(index, st.full)}
                            >
                              <Text style={[
                                styles.statusChipText,
                                { color: isSelected ? '#FFF' : '#64748B' }
                              ]}>
                                {st.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={[styles.absenBadge, styles[`badge_${initStatus}`]]}>
                        {siswa.status}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {isEditMode && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.btnSaveAbsen}
                  onPress={handleSaveAbsen}
                  disabled={savingAbsen}
                >
                  {savingAbsen ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFF" />
                      <Text style={styles.btnSaveAbsenText}>Simpan Perubahan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>
    );
  };

  const renderModalDetail = () => (
    <Modal visible={modalDetailVisible} transparent animationType="slide">
      <View style={styles.modalBackground}>
        <View style={[styles.modalContainer, { height: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detail Jurnal Mengajar</Text>
            <TouchableOpacity onPress={() => setModalDetailVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedDetail && (
              <View>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Mapel</Text>
                  <Text style={styles.detailText}>{selectedDetail.mapel}</Text>
                </View>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Kelas & Jam Ke</Text>
                  <Text style={styles.detailText}>{selectedDetail.kelas} (Jam ke: {selectedDetail.jamKe})</Text>
                </View>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Materi Pokok</Text>
                  <Text style={styles.detailText}>{selectedDetail.materi}</Text>
                </View>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Uraian Kegiatan</Text>
                  <Text style={styles.detailText}>{selectedDetail.uraian}</Text>
                </View>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Hambatan</Text>
                  <Text style={styles.detailText}>{selectedDetail.hambatan || '-'}</Text>
                </View>

                <View style={[styles.detailGroup, styles.kepsekBox]}>
                  <Text style={styles.detailLabel}>Catatan Kepala Sekolah</Text>
                  {selectedDetail.statusTinjauan === 'Sudah' ? (
                    <Text style={styles.catatanText}>{selectedDetail.catatanKepsek || 'Telah ditinjau tanpa catatan.'}</Text>
                  ) : (
                    <Text style={styles.belumTinjauText}>Menunggu tinjauan Kepala Sekolah</Text>
                  )}
                </View>

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Bukti Dokumentasi</Text>
                  {getValidImageUri(selectedDetail.foto) ? (
                    <Image 
                      source={{ uri: getValidImageUri(selectedDetail.foto) }} 
                      style={styles.detailImage}
                      resizeMode="contain" 
                    />
                  ) : (
                    <Text style={styles.detailText}>Tidak ada dokumentasi / Format salah</Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // --- RENDER MODAL PILIHAN CETAK ---
  const renderModalCetak = () => (
    <Modal visible={modalCetakVisible} transparent animationType="fade">
      <View style={styles.modalBackground}>
        <View style={[styles.modalContainer, { width: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cetak PDF Jurnal</Text>
            <TouchableOpacity onPress={() => setModalCetakVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Pilihan Jenis Periode */}
            <Text style={styles.labelField}>Jenis Periode:</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => openSelectModal('JENIS_CETAK')}
            >
              <Text style={styles.selectBoxText}>{getJenisCetakLabel()}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            {/* Opsi Berdasarkan Jenis Periode */}
            {jenisCetak === 'Bulanan' ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.labelField}>Pilih Bulan:</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => openSelectModal('BULAN_CETAK')}
                >
                  <Text style={styles.selectBoxText}>{getBulanPilihanLabel()}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.labelField}>Pilih Semester:</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => openSelectModal('SEMESTER_CETAK')}
                >
                  <Text style={styles.selectBoxText}>{getSemesterPilihanLabel()}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            {/* Switch Lampiran Foto */}
            <View style={styles.switchRow}>
              <Text style={styles.labelField}>Sertakan Lampiran Foto:</Text>
              <Switch
                value={pakaiFoto}
                onValueChange={setPakaiFoto}
                trackColor={{ false: "#CBD5E1", true: "#BFDBFE" }}
                thumbColor={pakaiFoto ? "#2563EB" : "#94A3B8"}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnProcessPrint}
              onPress={handleProsesCetakPdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={18} color="#FFF" />
                  <Text style={styles.btnProcessPrintText}>Pratinjau & Cetak</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );

  // --- RENDER MODAL SELECTION DROPDOWN CUSTOM ---
  const renderGenericSelectModal = () => {
    let title = '';
    let options = [];
    let currentValue = null;

    if (selectModalType === 'STATUS_TINJAUAN') {
      title = 'Pilih Status Tinjauan';
      options = [
        { label: 'Semua Status', value: 'Semua' },
        { label: 'Belum Ditinjau', value: 'Belum' },
        { label: 'Sudah Ditinjau', value: 'Sudah' },
      ];
      currentValue = statusTinjauan;
    } else if (selectModalType === 'JENIS_CETAK') {
      title = 'Pilih Jenis Periode';
      options = [
        { label: 'Cetak Bulanan', value: 'Bulanan' },
        { label: 'Cetak Per Semester', value: 'Semester' },
      ];
      currentValue = jenisCetak;
    } else if (selectModalType === 'BULAN_CETAK') {
      title = 'Pilih Bulan';
      options = DAFTAR_BULAN.map((b, idx) => ({ label: b, value: idx }));
      currentValue = bulanPilihan;
    } else if (selectModalType === 'SEMESTER_CETAK') {
      title = 'Pilih Semester';
      options = [
        { label: 'Semester Ganjil (Juli - Des)', value: 'Ganjil' },
        { label: 'Semester Genap (Jan - Juni)', value: 'Genap' },
      ];
      currentValue = semesterPilihan;
    }

    return (
      <Modal visible={selectModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectModalVisible(false)}
        >
          <View style={styles.selectModalContent}>
            <Text style={styles.selectModalTitle}>{title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((item, index) => {
                const isSelected = String(item.value) === String(currentValue);
                return (
                  <TouchableOpacity
                    key={index.toString()}
                    style={[styles.modalSelectItem, isSelected && styles.modalSelectItemActive]}
                    onPress={() => handleSelectOption(item.value)}
                  >
                    <Text style={[styles.modalSelectText, isSelected && styles.modalSelectTextActive]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterSection}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Rekap Jurnal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.btnPrint}
              onPress={() => setModalCetakVisible(true)}
            >
              <Ionicons name="print" size={16} color="#FFF" />
              <Text style={styles.btnPrintText}>Cetak PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnRefresh}
              onPress={fetchDataJurnal}
              disabled={loading}
            >
              <Ionicons name="refresh" size={16} color="#2563EB" />
              <Text style={styles.btnRefreshText}>
                {loading ? 'Memuat...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={styles.inputSearch}
            placeholder="Cari Kelas..."
            value={searchKelas}
            onChangeText={setSearchKelas}
          />
          <TouchableOpacity
            style={styles.selectBoxFilter}
            onPress={() => openSelectModal('STATUS_TINJAUAN')}
          >
            <Text style={styles.selectBoxText} numberOfLines={1}>
              {getStatusTinjauanLabel()}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal={true} style={styles.tableWrapper}>
        <View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.headerText, { width: 120 }]}>Waktu</Text>
            <Text style={[styles.cell, styles.headerText, { width: 160 }]}>Mapel / Materi</Text>
            <Text style={[styles.cell, styles.headerText, { width: 100 }]}>Kelas/Jam</Text>
            <Text style={[styles.cell, styles.headerText, { width: 90 }]}>Absen</Text>
            <Text style={[styles.cell, styles.headerText, { width: 130 }]}>Status Kepsek</Text>
            <Text style={[styles.cell, styles.headerText, { width: 130 }]}>Aksi</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={true}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Menghubungkan ke server...</Text>
              </View>
            ) : filteredData.length === 0 ? (
              <Text style={styles.emptyData}>Tidak ada jurnal ditemukan.</Text>
            ) : (
              filteredData.map((item, index) => (
                <View key={item.id || index} style={styles.tableRow}>
                  <View style={[styles.cell, { width: 120 }]}>
                    <Text style={styles.cellText}>{item.waktu}</Text>
                  </View>
                  <View style={[styles.cell, { width: 160 }]}>
                    <Text style={[styles.cellText, styles.boldText]}>{item.mapel}</Text>
                    <Text style={styles.subText}>{item.materi}</Text>
                  </View>
                  <View style={[styles.cell, { width: 100 }]}>
                    <Text style={[styles.cellText, styles.boldText]}>{item.kelas}</Text>
                    <Text style={styles.subText}>Jam: {item.jamKe}</Text>
                  </View>
                  <View style={[styles.cell, { width: 90 }]}>
                    <TouchableOpacity
                      style={styles.btnOutline}
                      onPress={() => {
                        setSelectedAbsen(item.absenSiswa ? JSON.parse(JSON.stringify(item.absenSiswa)) : []);
                        setSelectedAbsenKelas(item.kelas);
                        setSelectedJurnalId(item.id);
                        setIsEditMode(false);
                        setModalAbsenVisible(true);
                      }}
                    >
                      <Text style={styles.btnOutlineText}>Detail</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.cell, { width: 130 }]}>
                    <Text style={[
                      styles.statusBadge,
                      item.statusTinjauan === 'Sudah' ? styles.bgSuccess : styles.bgWarning
                    ]}>
                      {item.statusTinjauan === 'Sudah' ? 'Ditinjau' : 'Belum Ditinjau'}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 130, flexDirection: 'row', gap: 8 }]}>
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnView]}
                      onPress={() => {
                        setSelectedDetail(item);
                        setModalDetailVisible(true);
                      }}
                    >
                      <Ionicons name="eye" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnDelete]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {renderModalAbsen()}
      {renderModalDetail()}
      {renderModalCetak()}
      {renderGenericSelectModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filterSection: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  
  btnPrint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#16A34A', borderRadius: 6 },
  btnPrintText: { fontSize: 12, color: '#FFF', fontWeight: 'bold' },

  btnRefresh: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  btnRefreshText: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', gap: 10 },
  inputSearch: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, height: 45, backgroundColor: '#F1F5F9' },
  selectBoxFilter: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, height: 45, paddingHorizontal: 12, backgroundColor: '#F1F5F9' },

  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, height: 42, paddingHorizontal: 12, backgroundColor: '#F8FAFC', marginTop: 4 },
  selectBoxText: { fontSize: 13, color: '#334155', fontWeight: '500', flex: 1 },

  tableWrapper: { flex: 1, margin: 10, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, paddingHorizontal: 8 },
  tableHeader: { backgroundColor: '#F1F5F9', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  cell: { justifyContent: 'center', paddingHorizontal: 4 },
  headerText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  cellText: { fontSize: 13, color: '#334155' },
  boldText: { fontWeight: 'bold', color: '#0F172A' },
  subText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  emptyData: { textAlign: 'center', padding: 20, color: '#94A3B8' },
  loadingBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  loadingText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  btnOutline: { borderWidth: 1, borderColor: '#2563EB', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignItems: 'center' },
  btnOutlineText: { fontSize: 11, color: '#2563EB', fontWeight: 'bold' },
  btnAction: { padding: 8, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  btnView: { backgroundColor: '#2563EB' },
  btnDelete: { backgroundColor: '#DC2626' },
  statusBadge: { fontSize: 11, fontWeight: 'bold', color: '#FFF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, textAlign: 'center', overflow: 'hidden' },
  bgSuccess: { backgroundColor: '#16A34A' },
  bgWarning: { backgroundColor: '#F59E0B' },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  btnHeaderEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  btnHeaderEditText: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
  btnHeaderClose: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#F1F5F9', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  btnHeaderCloseText: { fontSize: 12, color: '#475569', fontWeight: 'bold' },

  modalContent: { padding: 16 },

  absenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  absenName: { fontSize: 14, color: '#334155', flex: 1 },

  absenBadge: { fontSize: 12, fontWeight: 'bold', color: '#FFF', width: 65, textAlign: 'center', borderRadius: 4, overflow: 'hidden', paddingVertical: 4 },
  statusChipGroup: { flexDirection: 'row', gap: 4 },
  statusChip: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  statusChipText: { fontSize: 12, fontWeight: 'bold' },

  badge_H: { backgroundColor: '#16A34A' }, 
  badge_S: { backgroundColor: '#EAB308' }, 
  badge_I: { backgroundColor: '#2563EB' }, 
  badge_A: { backgroundColor: '#DC2626' }, 
  badge_B: { backgroundColor: '#6B7280' },

  modalFooter: { padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  btnSaveAbsen: { backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSaveAbsenText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  detailGroup: { marginBottom: 16 },
  detailLabel: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#1E3A8A', lineHeight: 22 },
  detailImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  kepsekBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  catatanText: { fontSize: 14, color: '#1E3A8A', fontStyle: 'italic' },
  belumTinjauText: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },

  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    gap: 8,
  },
  summaryBadgeItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSiswaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoSiswaText: {
    fontSize: 13,
    color: '#475569',
  },

  labelField: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginBottom: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  btnProcessPrint: { backgroundColor: '#16A34A', paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnProcessPrintText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  // Styles Custom Modal Selection
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectModalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  selectModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSelectItemActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  modalSelectText: {
    fontSize: 14,
    color: '#334155',
  },
  modalSelectTextActive: {
    fontWeight: 'bold',
    color: '#2563EB',
  },
});