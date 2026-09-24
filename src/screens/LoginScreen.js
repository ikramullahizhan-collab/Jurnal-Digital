import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Image,
  ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { callBackendAPI } from '../api/client';

const SAVED_NIP_HISTORY_KEY = '@user_nip_history';

// Fungsi pembantu untuk membatasi waktu tunggu request (Timeout)
const fetchWithTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    )
  ]);
};

export default function LoginScreen({ navigation }) {
  const [nip, setNip] = useState('');
  const [nipHistory, setNipHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

  useEffect(() => {
    loadNipHistory();
  }, []);

  const loadNipHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(SAVED_NIP_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setNipHistory(parsedHistory);
        if (parsedHistory.length > 0) {
          setNip(parsedHistory[0]);
        }
      }
    } catch (e) {
      console.log('Gagal memuat riwayat NIP:', e);
    }
  };

  const saveNipToHistory = async (newNip) => {
    try {
      const updatedHistory = [newNip, ...nipHistory.filter((item) => item !== newNip)];
      setNipHistory(updatedHistory);
      await AsyncStorage.setItem(SAVED_NIP_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.log('Gagal menyimpan riwayat NIP:', e);
    }
  };

  const removeNipFromHistory = async (targetNip) => {
    try {
      const updatedHistory = nipHistory.filter((item) => item !== targetNip);
      setNipHistory(updatedHistory);
      await AsyncStorage.setItem(SAVED_NIP_HISTORY_KEY, JSON.stringify(updatedHistory));
      if (nip === targetNip) {
        setNip('');
      }
    } catch (e) {
      console.log('Gagal menghapus NIP dari riwayat:', e);
    }
  };

  const handleLogin = async () => {
    const cleanNip = nip.trim();
    if (!cleanNip) {
      Alert.alert('Peringatan', 'Masukkan NIP Anda');
      return;
    }

    setLoading(true);

    try {
      const res = await fetchWithTimeout(
        callBackendAPI('login', { nip: cleanNip }),
        10000
      );

      if (res && res.status === 'success') {
        await saveNipToHistory(cleanNip);

        // Panggil login dari AuthContext
        // Navigasi ke MainApp/Dashboard akan berjalan otomatis dari AppNavigator
        if (login) {
          await login(res);
        }
      } else {
        Alert.alert('Gagal Login', res?.message || 'NIP tidak ditemukan');
      }
    } catch (error) {
      console.error('Login Error:', error);
      if (error.message === 'TIMEOUT') {
        Alert.alert(
          'Koneksi Lambat', 
          'Server tidak merespons dalam 10 detik. Periksa kembali jaringan atau URL backend Anda.'
        );
      } else {
        Alert.alert(
          'Kesalahan Koneksi', 
          'Gagal terhubung ke server. Pastikan server API aktif dan IP dapat dijangkau.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Jurnal Digital</Text>
      <Text style={styles.subtitle}>SMAN 1 Toli-Toli Utara</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>NIP</Text>
        <TextInput
          style={styles.input}
          placeholder="Masukkan NIP Anda"
          placeholderTextColor="#94A3B8"
          value={nip}
          onChangeText={setNip}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {nipHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyLabel}>Pilih Akun Tersimpan:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.chipContainer}
          >
            {nipHistory.map((item) => (
              <View 
                key={item} 
                style={[
                  styles.chip, 
                  nip === item && styles.chipActive
                ]}
              >
                <TouchableOpacity 
                  style={styles.chipContent} 
                  onPress={() => setNip(item)}
                >
                  <Ionicons 
                    name="person-circle-outline" 
                    size={16} 
                    color={nip === item ? '#2563EB' : '#475569'} 
                  />
                  <Text 
                    style={[
                      styles.chipText, 
                      nip === item && styles.chipTextActive
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.chipDelete} 
                  onPress={() => removeNipFromHistory(item)}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Masuk</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: '#F8FAFC' 
  },
  logoContainer: { 
    alignItems: 'center', 
    marginBottom: 16 
  },
  logo: { 
    width: 110, 
    height: 110 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#1E293B' 
  },
  subtitle: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#64748B', 
    marginBottom: 28 
  },
  formGroup: { 
    marginBottom: 8 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#334155', 
    marginBottom: 6 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#CBD5E1', 
    borderRadius: 8, 
    padding: 12, 
    backgroundColor: '#FFF',
    fontSize: 15,
    color: '#0F172A'
  },
  historySection: {
    marginBottom: 20,
    marginTop: 4,
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  chipDelete: {
    marginLeft: 6,
    padding: 2,
  },
  button: { 
    backgroundColor: '#2563EB', 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});