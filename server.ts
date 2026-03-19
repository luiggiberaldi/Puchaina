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
    try {
      console.log("Fetching BCV rate from sources...");
      
      // Intento 1: DolarApi.com
      try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/bcv');
        if (response.ok) {
          const data = await response.json();
          if (data && data.promedio) {
            console.log("Success with DolarApi");
            return res.json({ rate: data.promedio, source: 'dolarapi' });
          }
        }
      } catch (e) { console.error("DolarApi error:", e); }
      
      // Intento 2: Fallback API (pydolarve)
      try {
        const fallbackResponse = await fetch('https://pydolarve.org/api/v1/dollar?type=bcv');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const rate = data?.monitors?.bcv?.price;
          if (rate) {
            console.log("Success with pydolarve");
            return res.json({ rate, source: 'pydolarve' });
          }
        }
      } catch (e) { console.error("pydolarve error:", e); }

      // Intento 3: CriptoDolar
      try {
        const cryptoRes = await fetch('https://criptodolar.com/api/v1/dollar/bcv');
        if (cryptoRes.ok) {
          const data = await cryptoRes.json();
          if (data && data.price) {
            console.log("Success with criptodolar");
            return res.json({ rate: data.price, source: 'criptodolar' });
          }
        }
      } catch (e) { console.error("criptodolar error:", e); }

      res.status(502).json({ error: "No se pudo obtener la tasa de ninguna fuente" });
    } catch (error) {
      console.error("Server proxy error:", error);
      res.status(500).json({ error: "Error interno al obtener la tasa" });
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
