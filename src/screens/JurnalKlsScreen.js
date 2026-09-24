import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { callBackendAPI } from '../api/client';

export default function JurnalKlsScreen({ navigation }) {
  const [jurnalData, setJurnalData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [listMapel, setListMapel] = useState([{ id: '', nama: 'Semua Mata Pelajaran' }]);
  
  const [namaGuru, setNamaGuru] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMapel, setSelectedMapel] = useState('');
  const [filterHambatan, setFilterHambatan] = useState('semua');

  // State Modals
  const [modalMapelVisible, setModalMapelVisible] = useState(false);
  const [modalAbsenVisible, setModalAbsenVisible] = useState(false);
  const [modalDetailVisible, setModalDetailVisible] = useState(false);
  
  // State Mode Cetak
  const [modalCetakVisible, setModalCetakVisible] = useState(false);
  const [cetakMode, setCetakMode] = useState(''); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // State Dropdown Cetak
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showMulaiDropdown, setShowMulaiDropdown] = useState(false);
  const [showSelesaiDropdown, setShowSelesaiDropdown] = useState(false);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);

  const [bulanMulai, setBulanMulai] = useState('');
  const [bulanSelesai, setBulanSelesai] = useState('');
  const [semesterPilihan, setSemesterPilihan] = useState('');
  
  const [selectedJurnal, setSelectedJurnal] = useState(null);

  const daftarBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    const getUserSession = async () => {
      try {
        const sessionString = await AsyncStorage.getItem('userSession');
        if (sessionString) {
          const userData = JSON.parse(sessionString);
          const guruNama = userData?.nama || userData?.namaGuru || userData?.namaLengkap || userData?.data?.nama || '';
          setNamaGuru(guruNama);
          
          if (guruNama) {
            loadAllData(guruNama);
          } else {
            Alert.alert("Informasi", "Nama pengguna tidak terdeteksi dari sesi login.");
          }
        }
      } catch (error) {
        console.log('Error membaca session:', error);
      }
    };
    getUserSession();
  }, []);

  const formatImageUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    let cleanUrl = url.trim();
    const matchD = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    let fileId = null;
    if (matchD && matchD[1]) fileId = matchD[1];
    else if (matchId && matchId[1]) fileId = matchId[1];
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
    return cleanUrl;
  };

  const loadAllData = async (targetNamaGuru) => {
    if (!targetNamaGuru) return;
    setLoading(true);
    
    try {
      const resJurnal = await callBackendAPI('getJurnalWaliKelas', { namaGuru: targetNamaGuru }).catch(() => null);

      let arrayJurnal = [];
      if (resJurnal?.success) arrayJurnal = resJurnal.data || [];
      else if (Array.isArray(resJurnal)) arrayJurnal = resJurnal;

      const normalizedJurnal = arrayJurnal.map(item => {
        let listAbsen = item.dataAbsensi || [];
        if (typeof listAbsen === 'string') {
          try { listAbsen = JSON.parse(listAbsen); } catch (e) { listAbsen = []; }
        }
        const rawFoto = item.foto || item.buktiFoto || item.buktiSwafoto || item.fotoDokumentasi || null;
        return { 
          ...item, 
          mapel: (item.mapel && item.mapel !== '-') ? item.mapel : 'Tanpa Mapel',
          dataAbsensi: listAbsen,
          foto: formatImageUrl(rawFoto)
        };
      });

      setJurnalData(normalizedJurnal);

      const uniqueMapels = [...new Set(normalizedJurnal.map(j => j.mapel))]
        .filter(m => m && m !== 'Tanpa Mapel')
        .map(m => ({ id: m, nama: m }));

      setListMapel([{ id: '', nama: 'Semua Mata Pelajaran' }, ...uniqueMapels]);
      applyFilter(normalizedJurnal, selectedMapel, filterHambatan);
    } catch (error) {
      console.log('Gagal memuat data:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat memuat data jurnal.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data, mapel, hambatanMode = filterHambatan) => {
    let filtered = [...data];
    if (mapel) filtered = filtered.filter(item => item.mapel === mapel);
    if (hambatanMode === 'hambatan') {
      filtered = filtered.filter(item => {
        if (!item.hambatan) return false;
        const textHambatan = String(item.hambatan).trim().toLowerCase();
        return textHambatan !== '' && textHambatan !== '-' && textHambatan !== 'nihil' && textHambatan !== 'tidak ada';
      });
    }
    setFilteredData(filtered);
  };

  const handleSelectMapel = (mapelId) => {
    setSelectedMapel(mapelId);
    applyFilter(jurnalData, mapelId, filterHambatan);
    setModalMapelVisible(false);
  };

  const handleSelectFilterHambatan = (mode) => {
    setFilterHambatan(mode);
    applyFilter(jurnalData, selectedMapel, mode);
  };

  const openAbsensi = (jurnal) => {
    setSelectedJurnal(jurnal);
    setModalAbsenVisible(true);
  };

  const openDetail = (jurnal) => {
    setSelectedJurnal(jurnal);
    setModalDetailVisible(true);
  };

  const handleBukaCetak = () => {
    setModalCetakVisible(true);
    setCetakMode('');
    setShowModeDropdown(false);
    setShowMulaiDropdown(false);
    setShowSelesaiDropdown(false);
    setShowSemesterDropdown(false);
    setBulanMulai('');
    setBulanSelesai('');
    setSemesterPilihan('');
  };

  const handlePilihModeCetak = (mode) => {
    setCetakMode(mode);
    setShowModeDropdown(false);
    setBulanMulai('');
    setBulanSelesai('');
    setSemesterPilihan('');
    setShowMulaiDropdown(false);
    setShowSelesaiDropdown(false);
    setShowSemesterDropdown(false);
  };

  const buildPdfHtml = (dataCetak, judulPeriode) => {
    const tableRows = dataCetak.map((item, index) => {
      const safeMateri = String(item.materi || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeUraian = String(item.uraian || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // Memastikan Keterangan Masuk / Tidak Masuk lebih akurat
      const textKeterangan = String(item.keterangan || item.status || 'Masuk').toLowerCase();
      const isTidakMasuk = textKeterangan.includes('tidak') || textKeterangan.includes('alpa') || textKeterangan.includes('izin');
      const labelKeterangan = isTidakMasuk ? 'Tidak Masuk' : 'Masuk';

      return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.tanggal || '-'}<br/><small style="color: #64748B;">Jam: ${item.jamKe || '-'}</small></td>
          <td><b>${item.mapel || '-'}</b><br/><small style="color: #64748B;">${item.namaGuru || '-'}</small></td>
          <td><b>${safeMateri}</b><br/>${safeUraian}</td>
          <td style="color: ${item.hambatan && item.hambatan !== '-' && item.hambatan.toLowerCase() !== 'nihil' ? '#DC2626' : '#16A34A'};">
            ${item.hambatan || 'Nihil'}
          </td>
          <td style="text-align: center; font-weight: bold; color: ${isTidakMasuk ? '#DC2626' : '#16A34A'};">
            ${labelKeterangan}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 0; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0F172A; padding-bottom: 10px; }
            .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; color: #0F172A; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #475569; }
            
            /* Penambahan aturan CSS page-break agar halaman tidak blank di Android */
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; page-break-inside: auto; }
            th { background-color: #1E293B; color: #FFFFFF; border: 1px solid #CBD5E1; padding: 8px 6px; text-align: left; }
            td { border: 1px solid #CBD5E1; padding: 6px; vertical-align: top; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            tr:nth-child(even) { background-color: #F8FAFC; }
            
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; page-break-inside: avoid; }
            .signature { text-align: center; width: 200px; margin-left: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>LAPORAN JURNAL PEMBELAJARAN KELAS</h2>
            <p>Wali Kelas / Pengajar: <b>${namaGuru || 'Guru'}</b> | Periode: <b>${judulPeriode}</b></p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th style="width: 90px;">Waktu / Jam</th>
                <th style="width: 140px;">Mapel & Guru</th>
                <th>Materi & Uraian</th>
                <th style="width: 130px;">Hambatan</th>
                <th style="width: 90px; text-align: center;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.length > 0 ? tableRows : '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data jurnal pada periode ini.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div></div>
            <div class="signature">
              <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
              <br/><br/><br/>
              <p><b>( ${namaGuru || 'Wali Kelas'} )</b></p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const prosesKonfirmasiCetak = async () => {
    if (!cetakMode) {
      Alert.alert('Peringatan', 'Silakan pilih mode cetak terlebih dahulu.');
      return;
    }
    
    if (cetakMode === 'bulanan' && (!bulanMulai || !bulanSelesai)) {
      Alert.alert('Peringatan', 'Silakan pilih bulan mulai dan bulan selesai.');
      return;
    }

    if (cetakMode === 'semester' && !semesterPilihan) {
      Alert.alert('Peringatan', 'Silakan pilih semester (Ganjil/Genap).');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      let dataFilterCetak = [...jurnalData];
      let periodeJudul = '';

      if (cetakMode === 'bulanan') {
        const idx1 = daftarBulan.indexOf(bulanMulai);
        const idx2 = daftarBulan.indexOf(bulanSelesai);
        
        // Perbaikan: Mencegah error indeks bulan jika user salah pilih urutan terbalik
        const startIdx = Math.min(idx1, idx2);
        const endIdx = Math.max(idx1, idx2);

        dataFilterCetak = dataFilterCetak.filter(item => {
          if (!item.tanggal) return true;
          const match = daftarBulan.find(b => item.tanggal.toLowerCase().includes(b.toLowerCase()));
          if (match) {
            const idxItem = daftarBulan.indexOf(match);
            return idxItem >= startIdx && idxItem <= endIdx;
          }
          return true; // Asumsikan ikut tercetak jika format tanggal pakai angka (bukan text bulan)
        });
        periodeJudul = `Bulan ${daftarBulan[startIdx]} s.d. ${daftarBulan[endIdx]}`;
      } else {
        periodeJudul = `Semester ${semesterPilihan}`;
      }

      const htmlContent = buildPdfHtml(dataFilterCetak, periodeJudul);
      setModalCetakVisible(false);

      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.log('Error saat memproses cetak:', error);
      Alert.alert('Error', 'Gagal memproses pembuatan dokumen PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getBadgeStyle = (status) => {
    const stat = (status || '').toLowerCase().trim();
    switch (stat) {
      case 'alpa': case 'alpha': case 'a': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'izin': case 'i': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'sakit': case 's': return { bg: '#FFEDD5', text: '#EA580C' };
      case 'bolos': case 'b': return { bg: '#E7CEB5', text: '#8B4513' };
      default: return { bg: '#FEE2E2', text: '#DC2626' };
    }
  };

  const renderTableRow = ({ item, index }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.tableRow, isEven ? styles.rowEven : styles.rowOdd]}>
        <View style={[styles.col, styles.colWaktu]}>
          <Text style={styles.cellMainText}>{item.tanggal || '-'}</Text>
          <Text style={styles.cellSubText}>Jam: {item.jamKe || '-'}</Text>
        </View>
        <View style={[styles.col, styles.colMapel]}>
          <Text style={styles.cellMainText} numberOfLines={2}>{item.mapel}</Text>
          <Text style={styles.cellSubText} numberOfLines={1}>{item.namaGuru || '-'}</Text>
        </View>
        <View style={[styles.col, styles.colMateri]}>
          <Text style={styles.cellMainText} numberOfLines={2}>{item.materi || '-'}</Text>
          <Text style={styles.cellSubText} numberOfLines={2}>{item.uraian || '-'}</Text>
        </View>
        <View style={[styles.col, styles.colHambatan]}>
          <Text style={[
            styles.cellMainText, 
            { color: item.hambatan && item.hambatan !== '-' && item.hambatan.toLowerCase() !== 'nihil' ? '#DC2626' : '#16A34A', fontSize: 12 }
          ]} numberOfLines={3}>
            {item.hambatan || 'Nihil'}
          </Text>
        </View>
        <View style={[styles.col, styles.colAbsen, { justifyContent: 'center' }]}>
          <TouchableOpacity style={styles.btnTableAbsen} onPress={() => openAbsensi(item)}>
            <Text style={styles.btnText}>Detail</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.col, styles.colAksi]}>
          <TouchableOpacity style={styles.btnTableDetail} onPress={() => openDetail(item)}>
            <Text style={styles.btnText}>Detail</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topFilterContainer}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setModalMapelVisible(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedMapel ? selectedMapel : 'Semua Mata Pelajaran'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => loadAllData(namaGuru)} disabled={loading}>
               {loading ? <ActivityIndicator size="small" color="#16A34A" /> : <Ionicons name="refresh" size={22} color="#16A34A" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleBukaCetak}>
               <Ionicons name="print" size={22} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterHambatanBar}>
          <TouchableOpacity 
            style={[styles.chipBtn, filterHambatan === 'semua' && styles.chipBtnActive]} 
            onPress={() => handleSelectFilterHambatan('semua')}
          >
            <Text style={[styles.chipText, filterHambatan === 'semua' && styles.chipTextActive]}>Semua Jurnal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.chipBtn, filterHambatan === 'hambatan' && styles.chipBtnActive]} 
            onPress={() => handleSelectFilterHambatan('hambatan')}
          >
            <Text style={[styles.chipText, filterHambatan === 'hambatan' && styles.chipTextActive]}>Dengan Hambatan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colWaktu]}>Waktu / Jam</Text>
            <Text style={[styles.headerCell, styles.colMapel]}>Mapel & Guru</Text>
            <Text style={[styles.headerCell, styles.colMateri]}>Materi & Uraian</Text>
            <Text style={[styles.headerCell, styles.colHambatan]}>Hambatan</Text>
            <Text style={[styles.headerCell, styles.colAbsen]}>Absen</Text>
            <Text style={[styles.headerCell, styles.colAksi]}>Detail</Text>
          </View>
          {loading ? (
            <View style={styles.tableLoadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Memuat data jurnal...</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.tableEmptyContainer}>
              <Text style={styles.emptyText}>Tidak ada data jurnal yang sesuai.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderTableRow}
              contentContainerStyle={{ paddingBottom: 60 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal Filter Mapel */}
      <Modal visible={modalMapelVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Mata Pelajaran</Text>
            <FlatList
              data={listMapel}
              keyExtractor={(item, idx) => `mapel-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectMapel(item.id)}>
                  <Text style={[styles.modalItemText, selectedMapel === item.id && { color: '#2563EB', fontWeight: 'bold' }]}>
                    {item.nama}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalMapelVisible(false)}>
              <Text style={styles.modalCloseText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Cetak Jurnal */}
      <Modal visible={modalCetakVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pengaturan Cetak Jurnal</Text>
            
            <View style={styles.cetakFormContainer}>
              <Text style={styles.cetakLabel}>Mode Cetak</Text>
              <TouchableOpacity style={styles.dropdownHeader} onPress={() => setShowModeDropdown(!showModeDropdown)}>
                <Text style={styles.dropdownHeaderText}>
                  {cetakMode === 'bulanan' ? 'Bulanan' : cetakMode === 'semester' ? 'Per Semester' : 'Pilih Mode Cetak...'}
                </Text>
                <Ionicons name={showModeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
              </TouchableOpacity>
              {showModeDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => handlePilihModeCetak('bulanan')}>
                    <Text style={[styles.dropdownItemText, cetakMode === 'bulanan' && styles.dropdownItemTextActive]}>Bulanan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomWidth: 0 }]} onPress={() => handlePilihModeCetak('semester')}>
                    <Text style={[styles.dropdownItemText, cetakMode === 'semester' && styles.dropdownItemTextActive]}>Per Semester</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {cetakMode === 'bulanan' && (
              <View style={styles.cetakFormContainer}>
                <Text style={styles.cetakLabel}>Pilih Rentang Bulan:</Text>
                <Text style={styles.cetakSubLabel}>Dari Bulan:</Text>
                <TouchableOpacity style={[styles.dropdownHeader, { marginBottom: 10 }]} onPress={() => { setShowMulaiDropdown(!showMulaiDropdown); setShowSelesaiDropdown(false); }}>
                  <Text style={styles.dropdownHeaderText}>{bulanMulai || 'Pilih Bulan Mulai...'}</Text>
                  <Ionicons name={showMulaiDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                </TouchableOpacity>
                {showMulaiDropdown && (
                  <View style={[styles.dropdownList, { maxHeight: 150, marginBottom: 10 }]}>
                    <ScrollView nestedScrollEnabled={true}>
                      {daftarBulan.map((bln, i) => (
                        <TouchableOpacity key={`mulai-${i}`} style={styles.dropdownItem} onPress={() => { setBulanMulai(bln); setShowMulaiDropdown(false); }}>
                          <Text style={[styles.dropdownItemText, bulanMulai === bln && styles.dropdownItemTextActive]}>{bln}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <Text style={styles.cetakSubLabel}>Sampai Bulan:</Text>
                <TouchableOpacity style={styles.dropdownHeader} onPress={() => { setShowSelesaiDropdown(!showSelesaiDropdown); setShowMulaiDropdown(false); }}>
                  <Text style={styles.dropdownHeaderText}>{bulanSelesai || 'Pilih Bulan Selesai...'}</Text>
                  <Ionicons name={showSelesaiDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                </TouchableOpacity>
                {showSelesaiDropdown && (
                  <View style={[styles.dropdownList, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled={true}>
                      {daftarBulan.map((bln, i) => (
                        <TouchableOpacity key={`selesai-${i}`} style={styles.dropdownItem} onPress={() => { setBulanSelesai(bln); setShowSelesaiDropdown(false); }}>
                          <Text style={[styles.dropdownItemText, bulanSelesai === bln && styles.dropdownItemTextActive]}>{bln}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {cetakMode === 'semester' && (
              <View style={styles.cetakFormContainer}>
                <Text style={styles.cetakLabel}>Pilih Semester:</Text>
                <TouchableOpacity style={styles.dropdownHeader} onPress={() => setShowSemesterDropdown(!showSemesterDropdown)}>
                  <Text style={styles.dropdownHeaderText}>{semesterPilihan || 'Pilih Semester...'}</Text>
                  <Ionicons name={showSemesterDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                </TouchableOpacity>
                {showSemesterDropdown && (
                  <View style={styles.dropdownList}>
                    {['Ganjil', 'Genap'].map((sem, i) => (
                      <TouchableOpacity key={`sem-${i}`} style={styles.dropdownItem} onPress={() => { setSemesterPilihan(sem); setShowSemesterDropdown(false); }}>
                        <Text style={[styles.dropdownItemText, semesterPilihan === sem && styles.dropdownItemTextActive]}>{sem}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalCetakVisible(false)} disabled={isGeneratingPdf}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={prosesKonfirmasiCetak} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalSubmitText}>Cetak</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Absensi */}
      <Modal visible={modalAbsenVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Siswa Tidak Hadir</Text>
            <Text style={styles.subInfoModal}>
              {selectedJurnal?.mapel} | Jam Ke: {selectedJurnal?.jamKe}
            </Text>
            <ScrollView style={{ marginTop: 10 }}>
              {selectedJurnal && selectedJurnal.dataAbsensi && selectedJurnal.dataAbsensi.length > 0 ? (
                selectedJurnal.dataAbsensi.map((siswa, idx) => {
                  const badgeColors = getBadgeStyle(siswa.status);
                  return (
                    <View key={idx} style={styles.absenRow}>
                      <Text style={styles.absenName}>{idx + 1}. {siswa.nama}</Text>
                      <View style={[styles.absenBadge, { backgroundColor: badgeColors.bg }]}>
                        <Text style={[styles.absenBadgeText, { color: badgeColors.text }]}>{siswa.status ? siswa.status.toUpperCase() : 'TIDAK HADIR'}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyTextCenter}>Semua siswa hadir (atau tidak ada data absen tercatat).</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalAbsenVisible(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Detail Jurnal */}
      <Modal visible={modalDetailVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Detail Jurnal Pembelajaran</Text>
            <ScrollView style={{ marginTop: 5 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailLabel}>Guru Pengajar</Text>
              <Text style={styles.detailValue}>{selectedJurnal?.namaGuru || '-'}</Text>
              <Text style={styles.detailLabel}>Mata Pelajaran</Text>
              <Text style={styles.detailValue}>{selectedJurnal?.mapel}</Text>
              <Text style={styles.detailLabel}>Waktu</Text>
              <Text style={styles.detailValue}>{selectedJurnal?.tanggal} (Jam Ke: {selectedJurnal?.jamKe})</Text>
              <Text style={styles.detailLabel}>Materi</Text>
              <Text style={styles.detailValue}>{selectedJurnal?.materi || '-'}</Text>
              <Text style={styles.detailLabel}>Kegiatan / Uraian</Text>
              <Text style={styles.detailValue}>{selectedJurnal?.uraian || '-'}</Text>
              <Text style={styles.detailLabel}>Hambatan / Catatan</Text>
              <Text style={[styles.detailValue, { color: '#DC2626' }]}>
                {selectedJurnal?.hambatan || 'Tidak ada hambatan dicatat.'}
              </Text>
              <Text style={styles.detailLabel}>Dokumentasi Foto</Text>
              {selectedJurnal?.foto ? (
                <Image source={{ uri: selectedJurnal.foto }} style={styles.fotoDokumentasi} resizeMode="cover" />
              ) : (
                <View style={styles.noFotoBox}>
                  <Text style={styles.noFotoText}>Tidak ada foto dilampirkan</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalDetailVisible(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topFilterContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginRight: 10 },
  filterBtnText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  filterHambatanBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 0, paddingBottom: 10, gap: 8 },
  chipBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  chipBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#64748B' },
  emptyTextCenter: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 20 },
  tableContainer: { paddingHorizontal: 12, paddingTop: 8, minWidth: 830 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 6 },
  headerCell: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'left' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: '#F8FAFC' },
  tableLoadingContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748B' },
  tableEmptyContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  col: { paddingHorizontal: 4 },
  colWaktu: { width: 110 },
  colMapel: { width: 150 },
  colMateri: { width: 180 },
  colHambatan: { width: 130 },
  colAbsen: { width: 110, alignItems: 'center' },
  colAksi: { width: 75, alignItems: 'center' },
  cellMainText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  cellSubText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  btnTableAbsen: { backgroundColor: '#F59E0B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnTableDetail: { backgroundColor: '#2563EB', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#0F172A', textAlign: 'center' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 15, color: '#334155' },
  cetakFormContainer: { marginVertical: 8, zIndex: 10 },
  cetakLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  cetakSubLabel: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  dropdownHeaderText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginTop: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 14, color: '#475569' },
  dropdownItemTextActive: { color: '#2563EB', fontWeight: 'bold' },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center' },
  modalCancelText: { color: '#475569', fontWeight: 'bold' },
  modalSubmitBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#16A34A', borderRadius: 8, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: 'bold' },
  modalCloseBtn: { marginTop: 16, padding: 12, backgroundColor: '#DC2626', borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontWeight: 'bold' },
  subInfoModal: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 10 },
  absenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  absenName: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  absenBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  absenBadgeText: { fontWeight: 'bold', fontSize: 12 },
  detailLabel: { fontSize: 12, color: '#64748B', marginTop: 12, fontWeight: '600' },
  detailValue: { fontSize: 15, color: '#0F172A', fontWeight: '500', marginTop: 2 },
  fotoDokumentasi: { width: '100%', height: 200, borderRadius: 8, marginTop: 8, backgroundColor: '#F1F5F9' },
  noFotoBox: { width: '100%', height: 100, borderRadius: 8, marginTop: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  noFotoText: { color: '#94A3B8', fontSize: 13 },
});