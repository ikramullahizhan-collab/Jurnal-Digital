const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznLluyYZTJv0STe-a_9gh6886gx5iH9wWNFbD7_xllFYnmNabWf_6TtbSICYXzXPJT/exec';

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