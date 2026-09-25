import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { AuthContext } from '../context/AuthContext';
import { callBackendAPI } from '../api/client';

export default function RekapAbsenScreen() {
  const { user } = useContext(AuthContext);

  // State Data Rekap
  const [dataAbsen, setDataAbsen] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listPertemuan, setListPertemuan] = useState([]);

  // State Navigasi Tab
  const [activeTab, setActiveTab] = useState('BULAN');

  // State Filter & Loading Kelas
  const [listKelas, setListKelas] = useState([]);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [idKelas, setIdKelas] = useState('');
  const [bulan, setBulan] = useState('');
  const [semester, setSemester] = useState('');

  // State Filter & Loading Mapel
  const [selectedMapel, setSelectedMapel] = useState('');
  const [listMapel, setListMapel] = useState([]);
  const [loadingMapel, setLoadingMapel] = useState(true);

  // State Modal Custom Dropdown
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');

  // State Modal Cetak
  const [modalCetakVisible, setModalCetakVisible] = useState(false);
  const [modelCetak, setModelCetak] = useState('REKAP');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const daftarBulan = [
    { label: 'Januari', value: '1' },
    { label: 'Februari', value: '2' },
    { label: 'Maret', value: '3' },
    { label: 'April', value: '4' },
    { label: 'Mei', value: '5' },
    { label: 'Juni', value: '6' },
    { label: 'Juli', value: '7' },
    { label: 'Agustus', value: '8' },
    { label: 'September', value: '9' },
    { label: 'Oktober', value: '10' },
    { label: 'November', value: '11' },
    { label: 'Desember', value: '12' },
  ];

  const daftarSemester = [
    { label: 'Ganjil', value: 'GANJIL' },
    { label: 'Genap', value: 'GENAP' },
  ];

  const daftarModelCetak = [
    { label: 'Rekap Absen (Ringkasan)', value: 'REKAP' },
    { label: 'Detail Absen', value: 'DETAIL' },
  ];

  useEffect(() => {
    fetchFormData();
  }, []);

  const isFilterReady = activeTab === 'BULAN' 
    ? Boolean(idKelas && bulan && selectedMapel) 
    : Boolean(idKelas && semester && selectedMapel);

  // Filter sekarang mewajibkan idKelas, bulan/semester, DAN selectedMapel
  useEffect(() => {
    if (isFilterReady) {
      fetchDataAbsen();
    } else {
      setDataAbsen([]);
      setFilteredData([]);
      setListPertemuan([]);
    }
  }, [activeTab, idKelas, bulan, semester, selectedMapel]);

  const fetchFormData = async () => {
    try {
      setLoadingKelas(true);
      setLoadingMapel(true);
      
      const namaGuruAktif = user?.nama || user?.namaLengkap || '';
      
      // Kirim namaGuru sebagai payload ke getFormData
      const res = await callBackendAPI('getFormData', { namaGuru: namaGuruAktif });
      
      // 1. Set Data Kelas
      const dataKelas = res?.data?.kelas || res?.kelas || [];
      if (Array.isArray(dataKelas) && dataKelas.length > 0) {
        setListKelas(dataKelas);
      } else {
        setListKelas([]);
      }

      // 2. Set Data Mapel
      const dataMapel = res?.data?.mapel || res?.mapel || [];
      if (Array.isArray(dataMapel) && dataMapel.length > 0) {
        // Ambil nama mapel saja (sesuai struktur UI Anda yang lama) dan hapus duplikat
        const namaMapelList = dataMapel.map(item => typeof item === 'object' ? (item.nama || item.id) : item);
        const uniqueMapel = [...new Set(namaMapelList)];
        setListMapel(uniqueMapel);
      } else {
        setListMapel([]);
      }

    } catch (error) {
      console.log('Error fetch data form (Kelas & Mapel):', error);
      Alert.alert('Error', 'Gagal memuat daftar kelas dan mata pelajaran dari server.');
    } finally {
      setLoadingKelas(false);
      setLoadingMapel(false);
    }
  };

  const fetchDataAbsen = async () => {
    try {
      setLoading(true);
      const namaGuruAktif = user?.nama || user?.namaLengkap || '';

      const payload = {
        namaGuru: namaGuruAktif,
        idKelas: idKelas,
        semester: activeTab === 'SEMESTER' ? semester : '',
        bulan: activeTab === 'BULAN' ? bulan : '',
        mapel: selectedMapel,
      };

      const res = await callBackendAPI('getRekapAbsen', payload);

      if (res && res.success && Array.isArray(res.data)) {
        
        let rawPertemuan = [];
        if (res.listPertemuan && Array.isArray(res.listPertemuan)) {
          rawPertemuan = res.listPertemuan;
        } else if (res.pertemuan && Array.isArray(res.pertemuan)) {
          rawPertemuan = res.pertemuan;
        }

        const sortedPertemuan = [...rawPertemuan].sort((a, b) => {
          const valA = typeof a === 'object' && a.tanggal ? a.tanggal : a;
          const valB = typeof b === 'object' && b.tanggal ? b.tanggal : b;
          
          const parseToValue = (tglStr) => {
            if (!tglStr) return '';
            const parts = String(tglStr).split('/');
            
            if (parts.length === 3) {
              if(parts[2].length === 4) return `${parts[2]}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
              if(parts[0].length === 4) return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
            }
            if (parts.length === 2) {
              return `${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
            }
            return String(tglStr);
          };

          return parseToValue(valA).localeCompare(parseToValue(valB));
        });

        setListPertemuan(sortedPertemuan);

        const sortedData = [...res.data].sort((a, b) => {
          const namaA = (a && a.nama ? String(a.nama) : '').toLowerCase();
          const namaB = (b && b.nama ? String(b.nama) : '').toLowerCase();
          return namaA.localeCompare(namaB, 'id', { sensitivity: 'base' });
        });

        const formattedData = sortedData.map((row, idx) => {
          return { ...row, no: idx + 1 };
        });

        setDataAbsen(formattedData);
        setFilteredData(formattedData);
      } else {
        setDataAbsen([]);
        setFilteredData([]);
        setListPertemuan([]);
      }
    } catch (error) {
      console.log('Error fetch rekap absen:', error);
      Alert.alert('Error', 'Gagal memuat data rekap absen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (isFilterReady) {
      setRefreshing(true);
      fetchDataAbsen();
    } else {
      setRefreshing(false);
    }
  };

  // Fungsi untuk tombol refresh global (sejajar dengan tombol cetak)
  const handleRefreshAll = () => {
    fetchFormData();
    if (isFilterReady) {
      fetchDataAbsen();
    }
  };

  const handleCetak = () => {
    if (!isFilterReady) {
      Alert.alert('Peringatan', 'Silakan lengkapi pilihan kelas, bulan/semester, dan mapel terlebih dahulu.');
      return;
    }
    setModalCetakVisible(true);
  };

  const openDropdownModal = (type) => {
    if (type !== 'KELAS' && type !== 'MODEL_CETAK' && !idKelas) {
      Alert.alert('Peringatan', 'Silakan pilih kelas terlebih dahulu.');
      return;
    }
    setModalType(type);
    setModalVisible(true);
  };

  const handleSelectOption = (value) => {
    if (modalType === 'KELAS') {
      setIdKelas(value);
    } else if (modalType === 'BULAN') {
      setBulan(value);
    } else if (modalType === 'SEMESTER') {
      setSemester(value);
    } else if (modalType === 'MODEL_CETAK') {
      setModelCetak(value);
    } else if (modalType === 'MAPEL') {
      setSelectedMapel(value);
    }
    setModalVisible(false);
  };

  const getKelasLabel = () => {
    if (loadingKelas) return 'Memuat...';
    if (!idKelas) return '-- Pilih Kelas --';
    const found = listKelas.find((item) => {
      const val = typeof item === 'object' ? (item.id || item.nama) : item;
      return String(val) === String(idKelas);
    });
    if (found) {
      return typeof found === 'object' ? (found.nama || found.id) : found;
    }
    return idKelas;
  };

  const getPeriodeLabel = () => {
    if (activeTab === 'BULAN') {
      if (!bulan) return '-- Pilih Bulan --';
      const found = daftarBulan.find((b) => b.value === bulan);
      return found ? found.label : bulan;
    } else {
      if (!semester) return '-- Pilih Semester --';
      const found = daftarSemester.find((s) => s.value === semester);
      return found ? found.label : semester;
    }
  };

  const getMapelLabel = () => {
    if (loadingMapel) return 'Memuat Mapel...';
    if (!selectedMapel) return '-- Pilih Mapel --';
    return selectedMapel;
  };

  const parseRowData = (item) => {
    if (!item || typeof item !== 'object') {
      return { no: '', nama: '', presensiList: [], h: 0, s: 0, i: 0, a: 0, b: 0, totalAbsen: 0 };
    }

    const no = item.no || '';
    const nama = item.nama || '';
    const h = Number(item.H) || 0;
    const s = Number(item.S) || 0;
    const i = Number(item.I) || 0;
    const a = Number(item.A) || 0;
    const b = Number(item.B) || 0;

    const presensiList = [];
    if (Array.isArray(listPertemuan)) {
      listPertemuan.forEach((tgl) => {
        const key = typeof tgl === 'object' && tgl.tanggal ? tgl.tanggal : tgl;
        presensiList.push(item.rekap && item.rekap[key] ? item.rekap[key] : '-');
      });
    }

    const totalAbsen = a + s + i + b;

    return { no, nama, presensiList, h, s, i, a, b, totalAbsen };
  };

  const handleProsesCetakPdf = async () => {
    if (!filteredData || filteredData.length === 0) {
      Alert.alert('Informasi', 'Tidak ada data presensi untuk dicetak.');
      return;
    }

    setGeneratingPdf(true);
    try {
      const namaGuruAktif = user?.nama || user?.namaLengkap || '.......................';
      const mapel = selectedMapel || user?.mapel || '.......................';
      
      const selectedKelasObj = listKelas?.find(item => 
        String(typeof item === 'object' ? (item.id || item.nama) : item) === String(idKelas)
      );
      const waliKelas = selectedKelasObj?.waliKelas || selectedKelasObj?.wali_kelas || '.......................';
      
      const labelPeriode = activeTab === 'BULAN' ? 'Bulan' : 'Semester';

      const infoHeaderHtml = `
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 12px; background-color: transparent;">
          <tr>
            <td style="width: 15%; border: none; padding: 4px 0; text-align: left; font-weight: bold;">Mata Pelajaran</td>
            <td style="width: 35%; border: none; padding: 4px 0; text-align: left;">: ${mapel}</td>
            <td style="width: 15%; border: none; padding: 4px 0; text-align: left; font-weight: bold;">Wali Kelas</td>
            <td style="width: 35%; border: none; padding: 4px 0; text-align: left;">: ${waliKelas}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 4px 0; text-align: left; font-weight: bold;">Kelas</td>
            <td style="border: none; padding: 4px 0; text-align: left;">: ${getKelasLabel()}</td>
            <td style="border: none; padding: 4px 0; text-align: left; font-weight: bold;">Guru Mapel</td>
            <td style="border: none; padding: 4px 0; text-align: left;">: ${namaGuruAktif}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 4px 0; text-align: left; font-weight: bold;">${labelPeriode}</td>
            <td style="border: none; padding: 4px 0; text-align: left;">: ${getPeriodeLabel()}</td>
            <td style="border: none;" colspan="2"></td>
          </tr>
        </table>
      `;

      let htmlContent = '';

      if (modelCetak === 'REKAP') {
        let rowsHtml = '';
        filteredData.forEach((item, index) => {
          const { no, nama, h, s, i, a, b, totalAbsen } = parseRowData(item);
          rowsHtml += `
            <tr>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px;">${no || index + 1}</td>
              <td style="border: 1px solid #000; text-align: left; padding: 6px 8px; font-size: 11px;">${nama}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; color: #16a34a; font-weight: bold;">${h}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; color: #eab308; font-weight: bold;">${s}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; color: #3b82f6; font-weight: bold;">${i}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; color: #dc2626; font-weight: bold;">${a}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; color: #4b5563; font-weight: bold;">${b}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 11px; font-weight: bold;">${totalAbsen}</td>
            </tr>
          `;
        });

        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>REKAP ABSENSI SISWA</title>
              <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 10px; }
                .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 18px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; }
                th { background-color: #E2EFD9; border: 1px solid #000; font-size: 11px; padding: 8px 4px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="title">REKAP ABSENSI SISWA</div>
              ${infoHeaderHtml}
              <table>
                <thead>
                  <tr>
                    <th style="width: 35px;">No</th>
                    <th style="text-align: left; padding-left: 8px;">Nama Siswa</th>
                    <th style="width: 45px; color: #16a34a;">Hadir</th>
                    <th style="width: 45px; color: #eab308;">Sakit</th>
                    <th style="width: 45px; color: #3b82f6;">Izin</th>
                    <th style="width: 45px; color: #dc2626;">Alpa</th>
                    <th style="width: 45px; color: #4b5563;">Bolos</th>
                    <th style="width: 50px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </body>
          </html>
        `;
      } else {
        let ptmList = Array.isArray(listPertemuan) ? [...listPertemuan] : [];
        const namaBulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const structuredDates = ptmList.map((tgl) => {
          let hari = String(tgl);
          let namaBulan = 'Pertemuan';

          if (typeof tgl === 'string' && tgl.includes('/')) {
            const parts = tgl.split('/');
            hari = parts[0]; 
            const bulanIdx = parseInt(parts[1], 10) - 1; 
            if (bulanIdx >= 0 && bulanIdx <= 11) {
              namaBulan = namaBulanIndo[bulanIdx];
            }
          }
          return { raw: tgl, tanggal: hari, bulan: namaBulan };
        });

        const monthGroups = [];
        structuredDates.forEach((ptm) => {
          const last = monthGroups[monthGroups.length - 1];
          if (last && last.bulan === ptm.bulan) {
            last.dates.push(ptm);
          } else {
            monthGroups.push({ bulan: ptm.bulan, dates: [ptm] });
          }
        });

        let monthHeaderHtml = '';
        let dateSubHeaderHtml = '';

        monthGroups.forEach((mg) => {
          monthHeaderHtml += `<th colspan="${mg.dates.length}" style="font-size: 13px;">${mg.bulan}</th>`;
          mg.dates.forEach((ptm) => {
            dateSubHeaderHtml += `<th style="font-size: 13px; width: 30px;">${ptm.tanggal}</th>`;
          });
        });

        let rowsHtml = '';
        filteredData.forEach((item, index) => {
          const { no, nama, presensiList, h, s, i, a, b } = parseRowData(item);

          let dailyTdHtml = '';
          ptmList.forEach((_, pIdx) => {
            const val = String(presensiList[pIdx] || '').toUpperCase();
            let colorStyle = 'color: #000;';
            if (val === 'H') colorStyle = 'color: #16a34a;';
            else if (val === 'S') colorStyle = 'color: #eab308;';
            else if (val === 'I') colorStyle = 'color: #3b82f6;';
            else if (val === 'A') colorStyle = 'color: #dc2626;';
            else if (val === 'B') colorStyle = 'color: #4b5563;';

            const cetakVal = val === '-' ? '' : val;
            dailyTdHtml += `<td style="border: 1px solid #000; text-align: center; padding: 6px 2px; font-size: 12px; ${colorStyle}">${cetakVal}</td>`;
          });

          rowsHtml += `
            <tr>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px;">${no || index + 1}</td>
              <td style="border: 1px solid #000; text-align: left; padding: 6px 8px; font-size: 12px; white-space: nowrap;">${nama}</td>
              ${dailyTdHtml}
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px; color: #16a34a; font-weight: bold;">${h}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px; color: #eab308; font-weight: bold;">${s}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px; color: #3b82f6; font-weight: bold;">${i}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px; color: #dc2626; font-weight: bold;">${a}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 6px; font-size: 12px; color: #4b5563; font-weight: bold;">${b}</td>
            </tr>
          `;
        });

        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>DETAIL ABSENSI SISWA</title>
              <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: 'Calibri', 'Arial', sans-serif; color: #000; margin: 0; padding: 10px; }
                .title { text-align: center; font-size: 16px; margin-bottom: 20px; font-weight: bold; letter-spacing: 0.5px; }
                table.absensi { width: 100%; border-collapse: collapse; background-color: #ffffff; }
                table.absensi th { background-color: #E2EFD9; border: 1px solid #000; color: #000; font-weight: normal; text-align: center; vertical-align: middle; padding: 6px 2px; }
              </style>
            </head>
            <body>
              <div class="title">DETAIL ABSENSI SISWA</div>
              ${infoHeaderHtml}
              <table class="absensi">
                <thead>
                  <tr>
                    <th rowspan="2" style="width: 28px; padding: 6px; font-size: 12px;">No</th>
                    <th rowspan="2" style="width: 180px; text-align: center; padding: 6px; font-size: 12px;">Nama Siswa</th>
                    ${monthHeaderHtml}
                    <th colspan="5" style="padding: 6px; font-weight: bold; font-size: 13px;">TOTAL PRESENSI</th>
                  </tr>
                  <tr>
                    ${dateSubHeaderHtml}
                    <th style="width: 28px; color: #16a34a; font-weight: bold; font-size: 12px;">H</th>
                    <th style="width: 28px; color: #eab308; font-weight: bold; font-size: 12px;">S</th>
                    <th style="width: 28px; color: #3b82f6; font-weight: bold; font-size: 12px;">I</th>
                    <th style="width: 28px; color: #dc2626; font-weight: bold; font-size: 12px;">A</th>
                    <th style="width: 28px; color: #4b5563; font-weight: bold; font-size: 12px;">B</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </body>
          </html>
        `;
      }

      setModalCetakVisible(false);
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.log('Error Cetak PDF:', error);
      Alert.alert('Error', 'Gagal memproses pembuatan PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderTableRow = ({ item, index }) => {
    if (!item || typeof item !== 'object') return null;
    const { no, nama, h, s, i, a, b, totalAbsen } = parseRowData(item);
    const isEven = index % 2 === 0;

    return (
      <View style={[styles.tableRow, isEven ? styles.rowEven : styles.rowOdd]}>
        <Text style={[styles.cellText, styles.colNo]}>{no}</Text>
        <Text style={[styles.cellText, styles.colNama]} numberOfLines={1}>
          {nama}
        </Text>
        <Text style={[styles.cellText, styles.colStat, styles.textHadir]}>{h}</Text>
        <Text style={[styles.cellText, styles.colStat, styles.textSakit]}>{s}</Text>
        <Text style={[styles.cellText, styles.colStat, styles.textIzin]}>{i}</Text>
        <Text style={[styles.cellText, styles.colStat, styles.textAlpa]}>{a}</Text>
        <Text style={[styles.cellText, styles.colStat, styles.textBolos]}>{b}</Text>
        <Text style={[styles.cellText, styles.colTotal]}>{totalAbsen}</Text>
      </View>
    );
  };

  const renderModalCetak = () => (
    <Modal visible={modalCetakVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: '88%' }]}>
          <View style={styles.modalCetakHeader}>
            <Text style={styles.modalTitle}>Cetak Absensi Siswa</Text>
            <TouchableOpacity onPress={() => setModalCetakVisible(false)}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={{ marginVertical: 12 }}>
            <Text style={styles.labelField}>Model Cetak:</Text>
            <TouchableOpacity
              style={styles.selectBoxCetak}
              onPress={() => openDropdownModal('MODEL_CETAK')}
            >
              <Text style={styles.selectText}>
                {modelCetak === 'REKAP' ? 'Rekap Absen (Ringkasan)' : 'Detail Absen'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.infoCetakBox}>
              <Text style={styles.infoCetakTitle}>Informasi Cetak:</Text>
              <Text style={styles.infoCetakText}>
                • Kelas: <Text style={{ fontWeight: 'bold' }}>{getKelasLabel()}</Text>
              </Text>
              <Text style={styles.infoCetakText}>
                • Periode: <Text style={{ fontWeight: 'bold' }}>{getPeriodeLabel()} ({activeTab})</Text>
              </Text>
              <Text style={styles.infoCetakText}>
                • Total Siswa: <Text style={{ fontWeight: 'bold' }}>{filteredData.length}</Text>
              </Text>
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

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'BULAN' && styles.activeTab]}
          onPress={() => setActiveTab('BULAN')}
        >
          <Text style={[styles.tabText, activeTab === 'BULAN' && styles.activeTabText]}>
            Bulan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'SEMESTER' && styles.activeTab]}
          onPress={() => setActiveTab('SEMESTER')}
        >
          <Text style={[styles.tabText, activeTab === 'SEMESTER' && styles.activeTabText]}>
            Semester
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      <View style={styles.filterSection}>
        {/* Row 1: Kelas, Periode, Tombol Cetak */}
        <View style={styles.rowFilter}>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={[styles.selectBox, loadingKelas && styles.selectDisabled]}
              onPress={() => openDropdownModal('KELAS')}
              disabled={loadingKelas}
            >
              <Text style={[styles.selectText, !idKelas && styles.placeholderText]} numberOfLines={1}>
                {getKelasLabel()}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={[styles.selectBox, !idKelas && styles.selectDisabled]}
              onPress={() => openDropdownModal(activeTab)}
              disabled={!idKelas}
            >
              <Text
                style={[
                  styles.selectText,
                  !(activeTab === 'BULAN' ? bulan : semester) && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {getPeriodeLabel()}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.printButton} onPress={handleCetak}>
            <Ionicons name="print-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Row 2: Filter Mapel & Tombol Refresh */}
        <View style={[styles.rowFilter, { marginBottom: 0 }]}>
          <View style={[styles.pickerContainer, { marginHorizontal: 3 }]}>
            <TouchableOpacity
              style={[styles.selectBox, (!idKelas || loadingMapel) && styles.selectDisabled]}
              onPress={() => openDropdownModal('MAPEL')}
              disabled={!idKelas || loadingMapel}
            >
              <Text style={[styles.selectText, !selectedMapel && styles.placeholderText]} numberOfLines={1}>
                {getMapelLabel()}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {selectedMapel && !loadingMapel ? (
            <TouchableOpacity 
              style={{ padding: 8, marginRight: 2 }} 
              onPress={() => setSelectedMapel('')}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : null}

          {/* TOMBOL REFRESH BARU (Sejajar dengan tombol Cetak di atasnya) */}
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefreshAll}
            disabled={loadingKelas || loadingMapel || loading}
          >
            {(loadingKelas || loadingMapel || loading) ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="refresh" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tampilan Data Utama Mobile */}
      {!isFilterReady ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="filter-outline" size={48} color="#94A3B8" />
          <Text style={styles.instructionText}>
            Silakan pilih kelas, {activeTab === 'BULAN' ? 'bulan' : 'semester'}, dan mata pelajaran terlebih dahulu untuk menampilkan data.
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 10, color: '#64748B' }}>Menghitung rekap absen...</Text>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colNo]}>No</Text>
            <Text style={[styles.headerCell, styles.colNama]}>Nama Siswa</Text>
            <Text style={[styles.headerCell, styles.colStat, { color: '#16A34A' }]}>H</Text>
            <Text style={[styles.headerCell, styles.colStat, { color: '#D97706' }]}>S</Text>
            <Text style={[styles.headerCell, styles.colStat, { color: '#2563EB' }]}>I</Text>
            <Text style={[styles.headerCell, styles.colStat, { color: '#DC2626' }]}>A</Text>
            <Text style={[styles.headerCell, styles.colStat, { color: '#8B4513' }]}>B</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Tot</Text>
          </View>

          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => (item && item.id ? String(item.id) : index.toString())}
            renderItem={renderTableRow}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Tidak ada data rekap absensi.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Modal Dropdown */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'KELAS'
                ? 'Pilih Kelas'
                : modalType === 'BULAN'
                ? 'Pilih Bulan'
                : modalType === 'SEMESTER'
                ? 'Pilih Semester'
                : modalType === 'MAPEL'
                ? 'Pilih Mapel'
                : 'Pilih Model Cetak'}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              
              {/* Render Mapel Options */}
              {modalType === 'MAPEL' &&
                (listMapel.length > 0 ? (
                  listMapel.map((item, index) => {
                    const isSelected = item === selectedMapel;
                    return (
                      <TouchableOpacity
                        key={index.toString()}
                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                        onPress={() => handleSelectOption(item)}
                      >
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                          {item}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#64748B', textAlign: 'center' }}>
                      Tidak ada mapel yang tersedia.
                    </Text>
                  </View>
                ))}

              {modalType === 'KELAS' &&
                listKelas.map((item, index) => {
                  const val = typeof item === 'object' ? (item.id || item.nama) : item;
                  const label = typeof item === 'object' ? (item.nama || item.id) : item;
                  const isSelected = String(val) === String(idKelas);
                  return (
                    <TouchableOpacity
                      key={index.toString()}
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => handleSelectOption(val)}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                    </TouchableOpacity>
                  );
                })}

              {modalType === 'BULAN' &&
                daftarBulan.map((item) => {
                  const isSelected = item.value === bulan;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => handleSelectOption(item.value)}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                    </TouchableOpacity>
                  );
                })}

              {modalType === 'SEMESTER' &&
                daftarSemester.map((item) => {
                  const isSelected = item.value === semester;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => handleSelectOption(item.value)}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                    </TouchableOpacity>
                  );
                })}

              {modalType === 'MODEL_CETAK' &&
                daftarModelCetak.map((item) => {
                  const isSelected = item.value === modelCetak;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => handleSelectOption(item.value)}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Cetak */}
      {renderModalCetak()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#3B82F6' },
  filterSection: { backgroundColor: '#FFF', padding: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  rowFilter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pickerContainer: { flex: 1, marginHorizontal: 3 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, height: 40, paddingHorizontal: 10 },
  selectDisabled: { backgroundColor: '#E2E8F0', opacity: 0.6 },
  selectText: { fontSize: 13, color: '#334155', fontWeight: '500', flex: 1, marginRight: 4 },
  placeholderText: { color: '#94A3B8' },
  printButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', height: 40, width: 40, borderRadius: 8, marginLeft: 3 },
  
  /* Style Tambahan untuk Tombol Refresh */
  refreshButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', height: 40, width: 40, borderRadius: 8, marginLeft: 3 },
  
  tableWrapper: { flex: 1, marginHorizontal: 12, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  listContainer: { flexGrow: 1, paddingBottom: 50 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#CBD5E1', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  headerCell: { fontSize: 12, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: '#F9FAFB' },
  cellText: { fontSize: 13, color: '#334155', textAlign: 'center' },
  colNo: { width: 28, fontWeight: '600', color: '#64748B' },
  colNama: { flex: 1, textAlign: 'left', paddingLeft: 4, fontWeight: '600' },
  colStat: { width: 24, fontWeight: '600' },
  colTotal: { width: 32, fontWeight: 'bold', color: '#0F172A' },
  textHadir: { color: '#16A34A' },
  textSakit: { color: '#D97706' },
  textIzin: { color: '#2563EB' },
  textAlpa: { color: '#DC2626' },
  textBolos: { color: '#8B4513' },
  centerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  instructionText: { marginTop: 12, fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemSelected: { backgroundColor: '#EFF6FF', borderRadius: 6 },
  modalItemText: { fontSize: 14, color: '#334155' },
  modalItemTextSelected: { fontWeight: 'bold', color: '#3B82F6' },
  modalCetakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10 },
  labelField: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginBottom: 6 },
  selectBoxCetak: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, height: 42, paddingHorizontal: 12, marginBottom: 12 },
  infoCetakBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 12 },
  infoCetakTitle: { fontSize: 12, fontWeight: 'bold', color: '#1E40AF', marginBottom: 4 },
  infoCetakText: { fontSize: 12, color: '#1E3A8A', marginTop: 2 },
  modalFooter: { marginTop: 8, borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 12 },
  btnProcessPrint: { backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnProcessPrintText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});