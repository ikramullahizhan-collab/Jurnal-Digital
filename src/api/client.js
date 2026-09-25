const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1GRjEDqqIB3xEuyI9PHX63IJYLH_ium1Vv-Q-5LzPXhJpRtcNMddFEYF1s_Wfu-wl/exec';

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