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
      console.warn("[GAS Proxy Warning]:", err?.message || err);
      return res.status(200).json({
        success: false,
        message: err?.message || "Gagal menghubungkan ke Google Apps Script."
      });
    }
  });

  // Google Sheets Proxy for Match GRFG Repack Master Konversi
  let cachedKonversiCsv: string | null = null;
  let cachedKonversiTime = 0;

  app.get("/api/match-grfg/fetch-konversi", async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || "1o8hWUAK6DO1rmggbiRaRNfT7On4c9RhrHR6X07nqZm4";
      const gid = (req.query.gid as string) || "901676227";
      const forceRefresh = req.query.refresh === "true";

      const now = Date.now();
      // Cache for 30 minutes unless forceRefresh
      if (!forceRefresh && cachedKonversiCsv && (now - cachedKonversiTime < 30 * 60 * 1000)) {
        return res.json({
          success: true,
          fromCache: true,
          cachedAt: new Date(cachedKonversiTime).toISOString(),
          csv: cachedKonversiCsv
        });
      }

      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const response = await fetch(gvizUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      if (!response.ok) {
        throw new Error(`Google Sheets status ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      cachedKonversiCsv = csvText;
      cachedKonversiTime = now;

      return res.json({
        success: true,
        fromCache: false,
        cachedAt: new Date(now).toISOString(),
        csv: csvText
      });
    } catch (err: any) {
      console.warn("[Match GRFG Konversi Warning]:", err?.message || err);
      if (cachedKonversiCsv) {
        return res.json({
          success: true,
          fromCache: true,
          warning: "Menggunakan cache lokal karena Google Sheets tidak merespon.",
          csv: cachedKonversiCsv
        });
      }
      return res.status(200).json({
        success: false,
        message: err?.message || "Gagal mengambil data sheet KONVERSI dari Google Spreadsheet."
      });
    }
  });

  // Google Spreadsheet Data Fetcher & Proxy (Multi-Sheet XLSX & GViz CSV)
  app.all(["/api/fetch-google-spreadsheet", "/api/fetch-onedrive-excel"], async (req, res) => {
    try {
      const rawUrl = (req.body?.url || req.query?.url || "") as string;
      let sheetId = (req.body?.sheetId || req.query?.sheetId || "") as string;
      let gid = (req.body?.gid || req.query?.gid || "0") as string;
      const format = (req.body?.format || req.query?.format || "xlsx") as string;
      let pubId = "";

      if (rawUrl) {
        // 1. Check for published spreadsheet (/spreadsheets/d/e/2PACX-.../)
        const pubMatch = rawUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
        if (pubMatch) {
          pubId = pubMatch[1];
        }

        // 2. Check for standard spreadsheet ID (/spreadsheets/d/...)
        if (!pubId) {
          const idMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (idMatch && idMatch[1] !== "e") {
            sheetId = idMatch[1];
          }
        }

        // 3. Check for Google Drive file link (/file/d/...)
        if (!pubId && !sheetId) {
          const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
          if (driveMatch) {
            sheetId = driveMatch[1];
          }
        }

        // 4. Extract gid if present
        const gidMatch = rawUrl.match(/[#&?]gid=([0-9]+)/);
        if (gidMatch) {
          gid = gidMatch[1];
        }

        // 5. Fallback: if rawUrl itself looks like a raw alphanumeric Sheet ID
        if (!pubId && !sheetId && /^[a-zA-Z0-9-_]{20,}$/.test(rawUrl.trim())) {
          sheetId = rawUrl.trim();
        }
      }

      // If user provided a published sheet link
      if (pubId) {
        // Try XLSX download from published link
        if (format !== "csv") {
          try {
            const pubXlsxUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=xlsx`;
            const pubRes = await fetch(pubXlsxUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              redirect: "follow"
            });
            if (pubRes.ok) {
              const arr = await pubRes.arrayBuffer();
              const buf = Buffer.from(arr);
              if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
                return res.json({
                  success: true,
                  format: "xlsx",
                  pubId,
                  gid,
                  size: buf.length,
                  base64: buf.toString("base64"),
                  fetchedAt: new Date().toISOString()
                });
              }
            }
          } catch (err) {
            console.warn("[Google Sheets pub XLSX warning]:", err);
          }
        }

        // Try CSV download from published link
        try {
          const pubCsvUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`;
          const pubRes = await fetch(pubCsvUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            redirect: "follow"
          });
          if (pubRes.ok) {
            const csvText = await pubRes.text();
            if (!csvText.includes("<!DOCTYPE") && !csvText.includes("<html")) {
              return res.json({
                success: true,
                format: "csv",
                pubId,
                gid,
                csv: csvText,
                fetchedAt: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.warn("[Google Sheets pub CSV warning]:", err);
        }
      }

      if (!sheetId && !pubId) {
        return res.status(200).json({
          success: false,
          isInvalidUrl: true,
          message: "URL Google Spreadsheet tidak valid atau Sheet ID tidak dapat ditemukan. Pastikan tautan lengkap disalin dari browser."
        });
      }

      if (sheetId) {
        // Try 1: Full Workbook XLSX Export (Enables multi-sheet tab switching)
        if (format !== "csv") {
          try {
            const exportXlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
            const xlsxRes = await fetch(exportXlsxUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
              },
              redirect: "follow"
            });

            if (xlsxRes.ok) {
              const arr = await xlsxRes.arrayBuffer();
              const buf = Buffer.from(arr);
              // Verify OpenXML Zip / XLSX magic bytes PK\x03\x04
              if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
                return res.json({
                  success: true,
                  format: "xlsx",
                  sheetId,
                  gid,
                  size: buf.length,
                  base64: buf.toString("base64"),
                  fetchedAt: new Date().toISOString()
                });
              }
            }
          } catch (err) {
            console.warn("[Google Sheets XLSX export warning]:", err);
          }
        }

        // Try 2: GViz CSV (Instant single-sheet CSV export)
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
          const gvizRes = await fetch(gvizUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            redirect: "follow"
          });

          if (gvizRes.ok) {
            const csvText = await gvizRes.text();
            if (!csvText.includes("<!DOCTYPE") && !csvText.includes("<html")) {
              return res.json({
                success: true,
                format: "csv",
                sheetId,
                gid,
                csv: csvText,
                fetchedAt: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.warn("[Google Sheets GViz CSV export warning]:", err);
        }

        // Try 3: Direct export?format=csv
        try {
          const directCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
          const directRes = await fetch(directCsvUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            redirect: "follow"
          });

          if (directRes.ok) {
            const csvText = await directRes.text();
            if (!csvText.includes("<!DOCTYPE") && !csvText.includes("<html")) {
              return res.json({
                success: true,
                format: "csv",
                sheetId,
                gid,
                csv: csvText,
                fetchedAt: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.warn("[Google Sheets Direct CSV export warning]:", err);
        }
      }

      // If all attempts failed (sheet is private or restricted)
      return res.status(200).json({
        success: false,
        isPrivateOrRestricted: true,
        sheetId: sheetId || pubId,
        gid,
        message: "Google Spreadsheet tidak dapat diakses atau dibagikan secara privat. Pastikan akses Google Sheets telah disetel ke 'Siapa saja yang memiliki link' (Anyone with the link) dengan peran Pelihat (Viewer)."
      });
    } catch (err: any) {
      console.warn("[Google Spreadsheet Fetch Notice]:", err?.message || err);
      return res.status(200).json({
        success: false,
        isPrivateOrRestricted: true,
        message: err?.message || "Gagal mengambil data dari Google Spreadsheet."
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
