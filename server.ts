import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for API routes
  app.use(express.json());

  // Health check API
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Apps Script Proxy for Data Pemusnahan
  app.all("/api/fetch-gas-pemusnahan", async (req, res) => {
    try {
      const defaultUrl = "https://script.google.com/macros/s/AKfycby5KFkXtBiXWEJ1G7CSLhRippGbA-k8WbV4QQFyNfur1ktnS6oNbcnsboFrBCLVXlxN/exec";
      const targetUrl = (req.body?.gasUrl || req.query?.gasUrl || defaultUrl) as string;
      const sheetName = (req.body?.sheetName || req.query?.sheetName || "Pemusnahan") as string;

      // Build target URL with parameters
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set("sheet", sheetName);
      urlObj.searchParams.set("action", "read");

      // Attempt 1: Fetch with GET & follow redirects
      let fetchRes = await fetch(urlObj.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json, text/plain, */*"
        },
        redirect: "follow"
      });

      let text = await fetchRes.text();

      // If GET returns webhook ready msg or html, attempt GET with action=getdata
      if (!text || text.includes("siap menerima POST request") || text.includes("<!DOCTYPE html>")) {
        try {
          const urlObj2 = new URL(targetUrl);
          urlObj2.searchParams.set("sheet", sheetName);
          urlObj2.searchParams.set("action", "getdata");
          const getRes2 = await fetch(urlObj2.toString(), {
            method: "GET",
            headers: { "Accept": "application/json" },
            redirect: "follow"
          });
          const text2 = await getRes2.text();
          if (text2 && !text2.includes("<!DOCTYPE html>") && !text2.includes("siap menerima POST request")) {
            text = text2;
          }
        } catch {
          // fallback
        }
      }

      // Try to parse as JSON
      try {
        const json = JSON.parse(text);
        const rows = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.rows) ? json.rows : null));
        return res.json({ 
          success: true, 
          data: rows || json, 
          fullResponse: json,
          total: rows ? rows.length : (json?.total || 0),
          raw: text 
        });
      } catch {
        return res.json({ success: true, text: text });
      }
    } catch (err: any) {
      console.error("[GAS Proxy Error]:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Gagal menghubungkan ke Google Apps Script."
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CKB Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
