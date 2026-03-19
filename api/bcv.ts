import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  try {
    // Intento 1: DolarApi.com
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/bcv');
    if (res.ok) {
      const data = await res.json();
      if (data && data.promedio) {
        return response.status(200).json({ rate: data.promedio, source: 'dolarapi' });
      }
    }
    
    // Intento 2: Fallback API (pydolarve)
    const fallbackRes = await fetch('https://pydolarve.org/api/v1/dollar?type=bcv');
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      const rate = data?.monitors?.bcv?.price;
      if (rate) {
        return response.status(200).json({ rate, source: 'pydolarve' });
      }
    }

    // Intento 3: Otro fallback si ambos fallan (criptodolar)
    const cryptoRes = await fetch('https://criptodolar.com/api/v1/dollar/bcv');
    if (cryptoRes.ok) {
      const data = await cryptoRes.json();
      if (data && data.price) {
        return response.status(200).json({ rate: data.price, source: 'criptodolar' });
      }
    }

    return response.status(502).json({ error: "No se pudo obtener la tasa de ninguna fuente" });
  } catch (error) {
    console.error("Error en API BCV:", error);
    return response.status(500).json({ error: "Error interno al obtener la tasa" });
  }
}
