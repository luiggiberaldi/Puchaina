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
      // Try DolarApi first
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/bcv');
      if (response.ok) {
        const data = await response.json();
        if (data && data.promedio) {
          return res.json({ rate: data.promedio, source: 'dolarapi' });
        }
      }
      
      // Fallback to pydolarve
      const fallbackResponse = await fetch('https://pydolarve.org/api/v1/dollar?type=bcv');
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        const rate = data?.monitors?.bcv?.price;
        if (rate) {
          return res.json({ rate, source: 'pydolarve' });
        }
      }

      res.status(502).json({ error: "Could not fetch BCV rate from any source" });
    } catch (error) {
      console.error("Server proxy error:", error);
      res.status(500).json({ error: "Internal server error fetching BCV rate" });
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
