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

export default function PetaKerawananScreen() {
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [siswaKerawanan, setSiswaKerawanan] = useState([]);
  const [infoKelas, setInfoKelas] = useState({ namaKelas: '-', namaWali: '-', nipWali: '-' });

  // STATE FILTER BULAN
  const [selectedBulan, setSelectedBulan] = useState(BULAN_OPTIONS[0]);
  const [showBulanModal, setShowBulanModal] = useState(false);

  // STATE FILTER KELAS
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [kelasOptions, setKelasOptions] = useState([]);

  // STATE DETAIL MODAL
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  useEffect(() => {
    fetchKelasOptions();
  }, []);

  useEffect(() => {
    if (selectedKelas && selectedKelas.value) {
      fetchDataKerawanan();
    }
  }, [selectedBulan, selectedKelas]);

  const fetchKelasOptions = async () => {
    setLoadingKelas(true);
    try {
      const res = await callBackendAPI('getFormData');
      const rawRombel = res?.data?.rombel || res?.data?.kelas || res?.kelas || res?.rombel || [];

      const cleanRombel = Array.isArray(rawRombel)
        ? rawRombel
            .map((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                const namaStr = String(item.nama || item.namaKelas || item.id || item.idKelas || `Kelas ${idx + 1}`);
                return { label: namaStr, value: namaStr };
              }
              const strVal = String(item || '');
              return { label: strVal, value: strVal };
            })
            .filter((x) => x.value !== '')
        : [];

      const uniqueKelas = cleanRombel.filter((v, i, a) => a.findIndex((t) => t.value === v.value) === i);

      setKelasOptions([
        { label: 'Semua Kelas', value: 'Semua' },
        ...uniqueKelas,
      ]);
    } catch (error) {
      console.log('Gagal memuat daftar kelas:', error);
      Alert.alert('Error', 'Gagal memuat daftar kelas dari server.');
      setKelasOptions([{ label: 'Semua Kelas', value: 'Semua' }]);
    } finally {
      setLoadingKelas(false);
    }
  };

  const hitungRekapAbsensi = (siswa) => {
    const details = siswa.detail || [];

    if (!Array.isArray(details) || details.length === 0) {
      return {
        S: Number(siswa.S || siswa.sakit) || 0,
        I: Number(siswa.I || siswa.izin) || 0,
        A: Number(siswa.A || siswa.alpa) || 0,
        B: Number(siswa.B || siswa.bolos) || 0,
      };
    }

    const logPerTanggal = {};
    details.forEach((item) => {
      const tgl = item.tanggal;
      if (!logPerTanggal[tgl]) {
        logPerTanggal[tgl] = [];
      }
      logPerTanggal[tgl].push(item);
    });

    let countS = 0;
    let countI = 0;
    let countA = 0;
    let countB = 0;

    Object.keys(logPerTanggal).forEach((tgl) => {
      const logs = logPerTanggal[tgl];
      const totalMapelHariIni = logs.length;
      
      const alpaMapelCount = logs.filter(
        (l) => l.statusHarian === 'A' || l.status === 'A' || l.statusHarian === 'B' || l.status === 'B'
      ).length;

      const sakitCount = logs.filter((l) => l.statusHarian === 'S' || l.status === 'S').length;
      const izinCount = logs.filter((l) => l.statusHarian === 'I' || l.status === 'I').length;

      if (alpaMapelCount === totalMapelHariIni && totalMapelHariIni > 0) {
        countA += 1;
      } else if (alpaMapelCount > 0 && alpaMapelCount < totalMapelHariIni) {
        countB += 1;
      }

      if (sakitCount === totalMapelHariIni && totalMapelHariIni > 0) {
        countS += 1;
      }
      if (izinCount === totalMapelHariIni && totalMapelHariIni > 0) {
        countI += 1;
      }
    });

    return { S: countS, I: countI, A: countA, B: countB };
  };

  const fetchDataKerawanan = async () => {
    if (!selectedKelas) return;

    try {
      setLoadingTable(true);
      const sessionString = await AsyncStorage.getItem('userSession');
      const userData = sessionString ? JSON.parse(sessionString) : null;

      const payload = { 
        filterKelas: selectedKelas.value,
        kelas: selectedKelas.value,
        rombel: selectedKelas.value,
        bulan: selectedBulan.value 
      };

      const response = await callBackendAPI('getPetaKerawananBK', payload).catch(() => null);

      if (response) {
        const rawData = response.data || response || [];

        const processedData = Array.isArray(rawData) ? rawData.map(siswa => {
          const rekap = hitungRekapAbsensi(siswa);
          const totalTindakLanjut = Number(siswa.totalTindakLanjut) || 0;
          return {
            ...siswa,
            rekapS: rekap.S,
            rekapI: rekap.I,
            rekapA: rekap.A,
            rekapB: rekap.B,
            totalTindakLanjut: totalTindakLanjut,
            proses: siswa.proses || (totalTindakLanjut > 0 ? `${totalTindakLanjut} ✔` : '0'),
            totalTidakHadir: rekap.S + rekap.I + rekap.A + rekap.B
          };
        }) : [];

        const filteredData = processedData.filter(siswa => {
          if (siswa.totalTidakHadir <= 0 && siswa.totalTindakLanjut <= 0) return false;

          if (selectedKelas.value === 'Semua') return true;

          const kSiswaRaw = String(
            siswa.namaKelas || siswa.kelas || siswa.rombel || siswa.idKelas || siswa.nama_kelas || ''
          ).trim();

          if (!kSiswaRaw) return true;

          const cleanKSiswa = kSiswaRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanTarget = String(selectedKelas.value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          return cleanKSiswa === cleanTarget || 
                 cleanKSiswa.includes(cleanTarget) || 
                 cleanTarget.includes(cleanKSiswa);
        });

        setSiswaKerawanan(filteredData);
        setInfoKelas({
          namaKelas: selectedKelas.label,
          namaWali: userData?.namaLengkap || userData?.nama || '-',
          nipWali: userData?.nip || '-'
        });
      } else {
        Alert.alert('Gagal', 'Gagal mengambil data peta kerawanan.');
      }
    } catch (error) {
      Alert.alert('Error', 'Kesalahan jaringan saat memuat data kerawanan.');
    } finally {
      setLoadingTable(false);
    }
  };

  const getKategoriKerawanan = (siswa) => {
    const a = siswa.rekapA ?? 0;
    const b = siswa.rekapB ?? 0;
    const s = siswa.rekapS ?? 0;
    const i = siswa.rekapI ?? 0;

    if (a >= 3 || b >= 3 || (a + b) >= 4) {
      return { label: 'Tinggi', bg: '#FEE2E2', text: '#DC2626', border: '#EF4444' };
    } else if (a > 0 || b > 0 || (s + i) >= 4) {
      return { label: 'Sedang', bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' };
    } else {
      return { label: 'Rendah', bg: '#E0F2FE', text: '#0284C7', border: '#38BDF8' };
    }
  };

  const openDetail = (siswa) => {
    setSelectedStudentDetail(siswa);
    setDetailModalVisible(true);
  };

  const renderDetailGroups = () => {
    const details = selectedStudentDetail?.detail || [];
    if (details.length === 0) {
      return (
        <View style={{ padding: 10 }}>
          <Text style={styles.emptyDetailText}>
            Catatan Alpa/Bolos: {selectedStudentDetail?.catatanMapel || '-'}
          </Text>
        </View>
      );
    }

    const logPerTanggal = {};
    details.forEach((item) => {
      const tgl = item.tanggal;
      if (!logPerTanggal[tgl]) logPerTanggal[tgl] = [];
      logPerTanggal[tgl].push(item);
    });

    const listAlpa = [];
    const listBolos = [];
    const listSakit = [];
    const listIzin = [];

    Object.keys(logPerTanggal).forEach((tgl) => {
      const logs = logPerTanggal[tgl];
      const totalMapel = logs.length;
      const alpaLogs = logs.filter(l => l.statusHarian === 'A' || l.status === 'A' || l.statusHarian === 'B' || l.status === 'B');

      if (alpaLogs.length === totalMapel && totalMapel > 0) {
        listAlpa.push({ tanggal: tgl, ket: 'Alpa Seharian (Semua Jam Mapel)' });
      } else if (alpaLogs.length > 0) {
        const mapelList = alpaLogs.map(l => l.catatanMapel || l.namaMapel || 'Jam Mapel').join(', ');
        listBolos.push({ tanggal: tgl, ket: `Bolos pada: ${mapelList}` });
      }

      const sakitLogs = logs.filter(l => l.statusHarian === 'S' || l.status === 'S');
      if (sakitLogs.length === totalMapel && totalMapel > 0) {
        listSakit.push({ tanggal: tgl });
      }

      const izinLogs = logs.filter(l => l.statusHarian === 'I' || l.status === 'I');
      if (izinLogs.length === totalMapel && totalMapel > 0) {
        listIzin.push({ tanggal: tgl });
      }
    });

    return (
      <View>
        {listAlpa.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#DC2626' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.groupHeaderText, { color: '#DC2626' }]}>Alpa Seharian ({listAlpa.length} Hari)</Text>
            </View>
            <View style={styles.groupBody}>
              {listAlpa.map((item, idx) => (
                <Text key={idx} style={styles.listItem}>• Tanggal: {item.tanggal} ({item.ket})</Text>
              ))}
            </View>
          </View>
        )}

        {listBolos.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#92400E' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.groupHeaderText, { color: '#92400E' }]}>Bolos Jam Mapel ({listBolos.length} Hari)</Text>
            </View>
            <View style={styles.groupBody}>
              {listBolos.map((item, idx) => (
                <Text key={idx} style={styles.listItem}>• Tanggal: {item.tanggal} ({item.ket})</Text>
              ))}
            </View>
          </View>
        )}

        {listSakit.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#EA580C' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#FFEDD5' }]}>
              <Text style={[styles.groupHeaderText, { color: '#EA580C' }]}>Sakit ({listSakit.length} Hari)</Text>
            </View>
            <View style={styles.groupBody}>
              {listSakit.map((item, idx) => <Text key={idx} style={styles.listItem}>• Tanggal: {item.tanggal}</Text>)}
            </View>
          </View>
        )}

        {listIzin.length > 0 && (
          <View style={[styles.groupCard, { borderLeftColor: '#2563EB' }]}>
            <View style={[styles.groupHeader, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.groupHeaderText, { color: '#2563EB' }]}>Izin ({listIzin.length} Hari)</Text>
            </View>
            <View style={styles.groupBody}>
              {listIzin.map((item, idx) => <Text key={idx} style={styles.listItem}>• Tanggal: {item.tanggal}</Text>)}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER BAR & FILTER */}
      <View style={styles.headerBox}>
        <View style={styles.filterGroup}>
          <TouchableOpacity 
            style={styles.dropdownBtn} 
            onPress={() => setShowKelasModal(true)}
            disabled={loadingKelas}
          >
            <Ionicons name="school-outline" size={15} color="#2563EB" />
            <Text style={styles.dropdownText} numberOfLines={1}>
              {loadingKelas ? 'Memuat Kelas...' : (selectedKelas ? selectedKelas.label : 'Pilih Kelas')}
            </Text>
            <Ionicons name="chevron-down" size={15} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowBulanModal(true)}>
            <Ionicons name="calendar-outline" size={15} color="#2563EB" />
            <Text style={styles.dropdownText} numberOfLines={1}>{selectedBulan.label}</Text>
            <Ionicons name="chevron-down" size={15} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={fetchKelasOptions} 
            disabled={loadingKelas}
          >
            {loadingKelas ? <ActivityIndicator size="small" color="#2563EB" /> : <Ionicons name="refresh" size={20} color="#2563EB" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* SUMMARY BANNER */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{selectedKelas ? siswaKerawanan.length : '-'}</Text>
          <Text style={styles.summaryLabel}>Total Siswa Rawan</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {selectedKelas ? siswaKerawanan.filter(s => getKategoriKerawanan(s).label === 'Tinggi').length : '-'}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Kerawanan Tinggi</Text>
        </View>
      </View>

      {/* KONTAINER TABEL UTAMA */}
      <View style={styles.tableCard}>
        {/* HEADER TABEL */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.thCell, styles.colNo]}>No</Text>
          <Text style={[styles.thCell, styles.colNama]}>Nama Siswa</Text>
          <Text style={[styles.thCell, styles.colKelas]}>Kelas</Text>
          <Text style={[styles.thCell, styles.colStat, { color: '#EAB308' }]}>S</Text>
          <Text style={[styles.thCell, styles.colStat, { color: '#3B82F6' }]}>I</Text>
          <Text style={[styles.thCell, styles.colStat, { color: '#DC2626' }]}>A</Text>
          <Text style={[styles.thCell, styles.colStat, { color: '#9333EA' }]}>B</Text>
          <Text style={[styles.thCell, styles.colProses, { color: '#16A34A' }]}>Proses</Text>
          <Text style={[styles.thCell, styles.colAksi]}>Status</Text>
        </View>

        {/* BODY TABEL */}
        <View style={styles.tableBodyContainer}>
          {!selectedKelas ? (
            <View style={styles.innerCenterBox}>
              <Ionicons name="filter-outline" size={44} color="#3B82F6" />
              <Text style={styles.emptyTitleText}>Silakan Pilih Kelas Terlebih Dahulu</Text>
              <Text style={styles.infoText}>Pilih salah satu kelas pada menu filter di atas untuk memuat data peta kerawanan.</Text>
            </View>
          ) : loadingTable ? (
            <View style={styles.innerCenterBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.infoText}>Memuat peta kerawanan...</Text>
            </View>
          ) : siswaKerawanan.length === 0 ? (
            <View style={styles.innerCenterBox}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#16A34A" />
              <Text style={styles.emptyTitleText}>Semua Siswa Hadir Sempurna</Text>
              <Text style={styles.infoText}>Tidak ada catatan S, I, A, B, atau penanganan BK pada periode/kelas ini.</Text>
            </View>
          ) : (
            <ScrollView style={styles.tableScrollView} showsVerticalScrollIndicator={true}>
              {siswaKerawanan.map((siswa, index) => {
                const kerawanan = getKategoriKerawanan(siswa);
                const s = siswa.rekapS;
                const i = siswa.rekapI;
                const a = siswa.rekapA;
                const b = siswa.rekapB;
                const isProsesTindakLanjut = siswa.totalTindakLanjut > 0 || (siswa.proses && siswa.proses !== '0');

                return (
                  <View
                    key={siswa.idSiswa || index}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowEven]}
                  >
                    <Text style={[styles.tdCell, styles.colNo]}>{index + 1}</Text>
                    <Text style={[styles.tdCell, styles.colNama]} numberOfLines={1}>
                      {siswa.namaSiswa || siswa.nama}
                    </Text>
                    <Text style={[styles.tdCell, styles.colKelas]} numberOfLines={1}>
                      {siswa.namaKelas || siswa.kelas || '-'}
                    </Text>
                    <Text style={[styles.tdCell, styles.colStat]}>{s}</Text>
                    <Text style={[styles.tdCell, styles.colStat]}>{i}</Text>
                    <Text style={[styles.tdCell, styles.colStat, a > 0 && styles.textBoldRed]}>{a}</Text>
                    <Text style={[styles.tdCell, styles.colStat, b > 0 && styles.textBoldPurple]}>{b}</Text>
                    
                    <Text style={[styles.tdCell, styles.colProses, isProsesTindakLanjut && styles.textBoldGreen]}>
                      {siswa.proses}
                    </Text>

                    {/* HANYA KOLOM STATUS YANG BISA DIKLIK / DISENTUH */}
                    <TouchableOpacity
                      style={[styles.tdCell, styles.colAksi]}
                      onPress={() => openDetail(siswa)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.miniBadge, { backgroundColor: kerawanan.bg, borderColor: kerawanan.border }]}>
                        <Text style={[styles.miniBadgeText, { color: kerawanan.text }]}>
                          {kerawanan.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* MODAL PILIH KELAS */}
      <Modal visible={showKelasModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBulanContent}>
            <Text style={styles.modalTitle}>Pilih Kelas</Text>
            {loadingKelas ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
            ) : kelasOptions.length === 0 ? (
              <Text style={[styles.infoText, { paddingVertical: 20 }]}>Daftar kelas tidak ditemukan.</Text>
            ) : (
              <FlatList
                data={kelasOptions}
                keyExtractor={(item, index) => String(item.value) + index}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bulanOption}
                    onPress={() => {
                      setSelectedKelas(item);
                      setShowKelasModal(false);
                    }}
                  >
                    <Text style={[styles.bulanOptionText, selectedKelas?.value === item.value && styles.bulanOptionActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowKelasModal(false)}>
              <Text style={styles.closeModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PILIH BULAN */}
      <Modal visible={showBulanModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBulanContent}>
            <Text style={styles.modalTitle}>Pilih Periode Bulan</Text>
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
                  <Text style={[styles.bulanOptionText, selectedBulan.value === item.value && styles.bulanOptionActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowBulanModal(false)}>
              <Text style={styles.closeModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DETAIL RINCIAN ABSENSI */}
      <Modal visible={detailModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDetailContent}>
            <Text style={styles.modalTitle}>Rincian Ketidakhadiran</Text>
            <Text style={styles.modalSubtitle}>
              {selectedStudentDetail?.namaSiswa || selectedStudentDetail?.nama} ({selectedStudentDetail?.namaKelas || selectedStudentDetail?.kelas || '-'})
            </Text>
            
            <ScrollView style={styles.detailListContainer}>
              {renderDetailGroups()}
            </ScrollView>

            <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setDetailModalVisible(false)}>
              <Text style={[styles.closeModalText, { color: '#FFF' }]}>Tutup</Text>
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
  filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, gap: 4, flexShrink: 1 },
  dropdownText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  iconBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  
  summaryBanner: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  summaryLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  tableCard: {
    flex: 1,
    margin: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
  },
  thCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
  },
  tableBodyContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  tableScrollView: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tdCell: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'center',
  },

  colNo: { width: 20, textAlign: 'center' },
  colNama: { flex: 1, textAlign: 'left', paddingLeft: 4, fontWeight: '600' },
  colKelas: { width: 44, textAlign: 'center', fontSize: 9, color: '#64748B' },
  colStat: { width: 17, textAlign: 'center' },
  colProses: { width: 42, textAlign: 'center' },
  colAksi: { width: 50, alignItems: 'center', justifyContent: 'center' },

  textBoldRed: { fontWeight: 'bold', color: '#DC2626' },
  textBoldPurple: { fontWeight: 'bold', color: '#9333EA' },
  textBoldGreen: { fontWeight: 'bold', color: '#16A34A' },

  miniBadge: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
  },

  innerCenterBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitleText: { fontStyle: 'normal', fontWeight: 'bold', color: '#1E293B', marginTop: 8, fontSize: 13, textAlign: 'center' },
  infoText: { marginTop: 4, color: '#64748B', fontSize: 12, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBulanContent: { width: 280, backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: 400 },
  modalDetailContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 12, textAlign: 'center', fontWeight: '600' },
  bulanOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bulanOptionText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  bulanOptionActive: { color: '#2563EB', fontWeight: 'bold' },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8 },
  closeDetailBtn: { marginTop: 15, padding: 12, backgroundColor: '#2563EB', borderRadius: 8 },
  closeModalText: { textAlign: 'center', fontWeight: 'bold', color: '#334155' },
  emptyDetailText: { textAlign: 'center', color: '#64748B', fontStyle: 'italic' },

  detailListContainer: { flexGrow: 0 },
  groupCard: { backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, overflow: 'hidden' },
  groupHeader: { paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  groupHeaderText: { fontWeight: 'bold', fontSize: 12 },
  groupBody: { padding: 10 },
  listItem: { fontSize: 12, color: '#334155', fontWeight: '500', marginBottom: 4 }
});