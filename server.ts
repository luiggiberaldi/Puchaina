import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy BCV Rate to avoid CORS issues
  app.get("/api/bcv", async (req, res) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };

    const sources = [
      {
        name: 'DolarApi',
        url: 'https://ve.dolarapi.com/v1/dolares/bcv',
        parse: (data: any) => data?.promedio
      },
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
        name: 'CriptoDolar',
        url: 'https://criptodolar.com/api/v1/dollar/bcv',
        parse: (data: any) => data?.price
      },
      {
        name: 'PyDolarVE',
        url: 'https://pydolarve.org/api/v1/dollar?type=bcv',
        parse: (data: any) => data?.monitors?.bcv?.price
      }
    ];

    const fetchSource = async (source: typeof sources[0]) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s per source
      try {
        console.log(`Trying source: ${source.name}...`);
        const response = await fetch(source.url, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        const rate = source.parse(data);
        if (!rate) throw new Error('Rate not found in response');
        const numericRate = parseFloat(rate);
        if (isNaN(numericRate) || numericRate <= 0) throw new Error('Invalid rate format');
        return { rate: numericRate, source: source.name };
      } catch (e) {
        clearTimeout(id);
        console.error(`Source ${source.name} failed:`, e instanceof Error ? e.message : e);
        throw e;
      }
    };

    try {
      // Intentamos todas las fuentes en paralelo y tomamos la primera que responda con éxito
      // Usamos un pequeño delay entre intentos para no saturar, o simplemente Promise.any
      const result = await Promise.any(sources.map(s => fetchSource(s)));
      console.log(`Success fetching BCV rate from ${result.source}: ${result.rate}`);
      res.json(result);
    } catch (error) {
      console.error("All BCV sources failed:", error);
      res.status(502).json({ 
        error: "No se pudo obtener la tasa automáticamente.",
        details: "Todas las fuentes (DolarApi, ExchangeRate, Coinbase, etc.) fallaron o excedieron el tiempo de espera."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
