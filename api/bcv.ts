import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  };

  const sources = [
    {
      name: 'ExchangeRate-API',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parse: (data: any) => data?.rates?.VES
    },
    {
      name: 'OpenERAPI',
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data: any) => data?.rates?.VES
    },
    {
      name: 'Coinbase',
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=USD',
      parse: (data: any) => data?.data?.rates?.VES
    },
    {
      name: 'DolarApi',
      url: 'https://ve.dolarapi.com/v1/dolares',
      parse: (data: any) => {
        if (Array.isArray(data)) {
          const bcv = data.find(d => d.entidad === 'BCV' || d.key === 'bcv');
          return bcv?.promedio || bcv?.price;
        }
        return data?.promedio;
      }
    },
    {
      name: 'Exchangerate.host',
      url: 'https://api.exchangerate.host/live?access_key=free&source=USD&currencies=VES',
      parse: (data: any) => data?.quotes?.USDVES
    }
  ];

  const fetchSource = async (source: typeof sources[0]) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s per source
    try {
      const res = await fetch(source.url, { headers, signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const rate = source.parse(data);
      if (!rate) throw new Error('Rate not found');
      const numericRate = parseFloat(rate);
      if (isNaN(numericRate) || numericRate <= 0) throw new Error('Invalid rate');
      return { rate: Math.ceil(numericRate), source: source.name };
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  try {
    const result = await Promise.any(sources.map(s => fetchSource(s)));
    return response.status(200).json(result);
  } catch (error) {
    console.error("All BCV sources failed in serverless:", error);
    return response.status(502).json({ 
      error: "No se pudo obtener la tasa automáticamente",
      details: "Todas las fuentes fallaron."
    });
  }
}
