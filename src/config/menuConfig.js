export const ROLE_MENUS = {
  Guru: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard' },
    { id: 'jurnal_absen', title: 'Jurnal & Absen', icon: 'book', screen: 'JurnalGuru' },
    { id: 'rekap_jurnal', title: 'Rekap Jurnal', icon: 'journal', screen: 'RekapJurnal' },
    { id: 'rekap_absen', title: 'Rekap Absen', icon: 'stats-chart', screen: 'RekapAbsen' },
  ],
  'Guru BK': [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard' },
    { id: 'peta_kerawanan', title: 'Peta Kerawanan Siswa', icon: 'warning', screen: 'PetaKerawanan' },
    { id: 'jurnal_bk', title: 'Jurnal Layanan BK', icon: 'heart', screen: 'JurnalBK' },
    { id: 'riwayat_layanan', title: 'Riwayat Layanan', icon: 'time', screen: 'RiwayatLayanan' },
    { id: 'pantau_guru', title: 'Pantau Jurnal Guru', icon: 'eye', screen: 'PantauJurnalGuru' },
    { id: 'cetak_laporan', title: 'Cetak Laporan', icon: 'print', screen: 'CetakLaporanBK' },
  ],
  BK: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard' },
    { id: 'peta_kerawanan', title: 'Peta Kerawanan Siswa', icon: 'warning', screen: 'PetaKerawanan' },
    { id: 'jurnal_bk', title: 'Jurnal Layanan BK', icon: 'heart', screen: 'JurnalBK' },
    { id: 'riwayat_layanan', title: 'Riwayat Layanan', icon: 'time', screen: 'RiwayatLayanan' },
    { id: 'pantau_guru', title: 'Pantau Jurnal Guru', icon: 'eye', screen: 'PantauJurnalGuru' },
    { id: 'cetak_laporan', title: 'Cetak Laporan', icon: 'print', screen: 'CetakLaporanBK' },
  ],
  Kepsek: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard' },
    { id: 'jurnal_guru', title: 'Jurnal Guru', icon: 'book', screen: 'PantauJurnalGuru' },
    { id: 'jurnal_bk', title: 'Jurnal Layanan BK', icon: 'heart', screen: 'JurnalBKView' },
    { id: 'cetak_laporan', title: 'Cetak Laporan', icon: 'print', screen: 'CetakLaporanKepsek' },
  ],
  Admin: [
    { id: 'home', title: 'Home', icon: 'home', screen: 'Dashboard' },
    { id: 'pengaturan_sekolah', title: 'Pengaturan Sekolah', icon: 'settings', screen: 'PengaturanSekolah' },
    { id: 'data_pengguna', title: 'Data Pengguna', icon: 'people', screen: 'DataPengguna' },
    { id: 'data_master', title: 'Data Master', icon: 'folder', screen: 'DataMaster' },
    { id: 'data_akademik', title: 'Data Akademik', icon: 'school', screen: 'DataAkademik' },
    { id: 'cetak', title: 'Cetak', icon: 'print', screen: 'CetakAdmin' },
    { id: 'log_aktivitas', title: 'Log Aktivitas', icon: 'list', screen: 'LogAktivitas' },
  ],
};

// Menu Tambahan Khusus Wali Kelas
export const WALI_KELAS_MENUS = [
  { id: 'absen_kelas', title: 'Absen Kelas', icon: 'clipboard', screen: 'AbsenKelas' },
  { id: 'jurnal_kelas', title: 'Jurnal Kelas', icon: 'albums', screen: 'JurnalKelas' },
];

/**
 * Menggabungkan menu role dengan menu wali kelas jika isWaliKelas === true
 */
export const getUserMenus = (role, isWaliKelas = false) => {
  const baseMenus = ROLE_MENUS[role] ? [...ROLE_MENUS[role]] : [];
  
  if (isWaliKelas) {
    return [...baseMenus, ...WALI_KELAS_MENUS];
  }
  
  return baseMenus;
};