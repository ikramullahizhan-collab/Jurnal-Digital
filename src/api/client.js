const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAUp7T2LpoOgfVcIrqguekruEcFOUt3gTRKKP3FoTCOc1kM3Txm4D2mjg6ZWwMLQwj/exec';

export const callBackendAPI = async (action, payload = {}) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Menggunakan text/plain agar tidak memicu CORS Preflight
      },
      body: JSON.stringify({ action, payload }),
    });

    const responseText = await response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: 'Gagal terhubung ke server' };
  }
};