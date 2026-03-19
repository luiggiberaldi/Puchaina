import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    // Intento 1: DolarApi.com
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/bcv', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.promedio) {
          return response.status(200).json({ rate: data.promedio, source: 'dolarapi' });
        }
      }
    } catch (e) { console.error("DolarApi error:", e); }
    
    // Intento 2: CriptoDolar
    try {
      const cryptoRes = await fetch('https://criptodolar.com/api/v1/dollar/bcv', { headers });
      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        if (data && data.price) {
          return response.status(200).json({ rate: data.price, source: 'criptodolar' });
        }
      }
    } catch (e) { console.error("CriptoDolar error:", e); }

    // Intento 3: pydolarve
    try {
      const fallbackRes = await fetch('https://pydolarve.org/api/v1/dollar?type=bcv', { headers });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const rate = data?.monitors?.bcv?.price;
        if (rate) {
          return response.status(200).json({ rate, source: 'pydolarve' });
        }
      }
    } catch (e) { console.error("pydolarve error:", e); }

    // Intento 4: Monitor Dolar
    try {
      const monitorRes = await fetch('https://api.monitordolarvenezuela.com/api/v1/dollar?type=bcv', { headers });
      if (monitorRes.ok) {
        const data = await monitorRes.json();
        const rate = data?.monitors?.bcv?.price;
        if (rate) {
          return response.status(200).json({ rate, source: 'monitordolar' });
        }
      }
    } catch (e) { console.error("Monitor Dolar error:", e); }

    return response.status(502).json({ error: "No se pudo obtener la tasa de ninguna fuente" });
  } catch (error) {
    console.error("Error en API BCV:", error);
    return response.status(500).json({ error: "Error interno al obtener la tasa" });
  }
}
