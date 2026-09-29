import { registerRootComponent } from 'expo';
import { Platform, Image } from 'react-native';
import App from './App';

// Khusus platform Web / PWA: Suntikkan tag ikon untuk Safari iOS secara otomatis
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const logoAsset = Image.resolveAssetSource(require('./assets/logo.png'));
    if (logoAsset && logoAsset.uri) {
      let link = document.querySelector("link[rel='apple-touch-icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.sizes = '180x180';
        document.head.appendChild(link);
      }
      link.href = logoAsset.uri;
    }
  } catch (e) {
    console.log('Gagal memuat apple-touch-icon:', e);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);