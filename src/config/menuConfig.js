export const ROLE_MENUS = {
  Guru: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard', color: '#2563EB', bgColor: '#EFF6FF' },
    { id: 'jurnal_absen', title: 'Jurnal & Absen', icon: 'book', screen: 'JurnalGuru', color: '#2563EB', bgColor: '#EFF6FF' },
    { id: 'rekap_jurnal', title: 'Rekap Jurnal', icon: 'journal', screen: 'RekapJurnal', color: '#2563EB', bgColor: '#EFF6FF' },
    { id: 'rekap_absen', title: 'Rekap Absen', icon: 'stats-chart', screen: 'RekapAbsen', color: '#2563EB', bgColor: '#EFF6FF' },
  ],
  'Guru BK': [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard', color: '#7C3AED', bgColor: '#F5F3FF' },
    { id: 'peta_kerawanan', title: 'Peta Kerawanan Siswa', icon: 'warning', screen: 'PetaKerawanan', color: '#7C3AED', bgColor: '#F5F3FF' },
    { id: 'jurnal_bk', title: 'Jurnal Layanan BK', icon: 'heart', screen: 'JurnalBK', color: '#7C3AED', bgColor: '#F5F3FF' },
    { id: 'riwayat_layanan', title: 'Riwayat Layanan', icon: 'time', screen: 'RiwayatLayanan', color: '#7C3AED', bgColor: '#F5F3FF' },
    { id: 'pantau_guru', title: 'Pantau Jurnal Guru', icon: 'eye', screen: 'PantauJurnalGuru', color: '#7C3AED', bgColor: '#F5F3FF' },
    { id: 'cetak_laporan', title: 'Cetak Laporan', icon: 'print', screen: 'CetakLaporanBK', color: '#7C3AED', bgColor: '#F5F3FF' },
  ],
  Kepsek: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard', color: '#D97706', bgColor: '#FFFBEB' },
    { id: 'jurnal_guru', title: 'Jurnal Guru', icon: 'book', screen: 'PantauJurnalGuru', color: '#D97706', bgColor: '#FFFBEB' },
    { id: 'jurnal_bk', title: 'Jurnal Layanan BK', icon: 'heart', screen: 'JurnalBKView', color: '#D97706', bgColor: '#FFFBEB' },
    { id: 'cetak_laporan', title: 'Cetak Laporan', icon: 'print', screen: 'CetakLaporanKepsek', color: '#D97706', bgColor: '#FFFBEB' },
  ],
  Admin: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'pengaturan_sekolah', title: 'Pengaturan Sekolah', icon: 'settings', screen: 'PengaturanSekolah', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'data_pengguna', title: 'Data Pengguna', icon: 'people', screen: 'DataPengguna', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'data_master', title: 'Data Master', icon: 'folder', screen: 'DataMaster', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'data_akademik', title: 'Data Akademik', icon: 'school', screen: 'DataAkademik', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'cetak', title: 'Cetak', icon: 'print', screen: 'CetakAdmin', color: '#475569', bgColor: '#F8FAFC' },
    { id: 'log_aktivitas', title: 'Log Aktivitas', icon: 'list', screen: 'LogAktivitas', color: '#475569', bgColor: '#F8FAFC' },
  ],
};

// Menu Tambahan Khusus Wali Kelas (Warna Hijau)
export const WALI_KELAS_MENUS = [
  { id: 'absen_kelas', title: 'Absen Kelas', icon: 'clipboard', screen: 'AbsenKelas', color: '#059669', bgColor: '#ECFDF5' },
  { id: 'jurnal_kelas', title: 'Jurnal Kelas', icon: 'albums', screen: 'JurnalKelas', color: '#059669', bgColor: '#ECFDF5' },
];

/**
 * Menggabungkan menu role dengan menu wali kelas jika isWaliKelas === true
 */
export const getUserMenus = (role, isWaliKelas = false) => {
  // Normalisasi penamaan role 'BK' menjadi 'Guru BK' jika ada data lama
  const normalizedRole = role === 'BK' ? 'Guru BK' : role;
  const baseMenus = ROLE_MENUS[normalizedRole] ? [...ROLE_MENUS[normalizedRole]] : [];
  
  if (isWaliKelas) {
    return [...baseMenus, ...WALI_KELAS_MENUS];
  }
  
  return baseMenus;
};