import express from "express";
import path from "path";
import crypto from "crypto";
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
      const action = (req.body?.action || req.query?.action || "getData") as string;

      // Build target URL with parameters
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set("sheet", sheetName);
      urlObj.searchParams.set("action", action);

      // Attempt 1: Fetch with GET & follow redirects
      let fetchRes = await fetch(urlObj.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json, text/plain, */*"
        },
        redirect: "follow"
      });

      let text = await fetchRes.text();

      // If GET returns webhook ready msg or html, attempt POST payload
      if (!text || text.includes("siap menerima POST request") || text.includes("<!DOCTYPE html>")) {
        try {
          const postRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
              action: action,
              sheet: sheetName,
              sheetName: sheetName
            }),
            redirect: "follow"
          });
          const postText = await postRes.text();
          if (postText && !postText.includes("<!DOCTYPE html>")) {
            text = postText;
          }
        } catch {
          // Keep original text
        }
      }

      // Try to parse as JSON
      try {
        const json = JSON.parse(text);
        return res.json({ success: true, data: json, raw: text });
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

  // Check PIN Configuration Status (does not expose the PIN!)
  app.get("/api/auth/pin-status", (_req, res) => {
    const isCustomPin = Boolean(process.env.APP_PIN && process.env.APP_PIN.trim() !== "089739");
    res.json({
      configured: true,
      digits: 6,
      isCustom: isCustomPin,
      authMethod: "server-side-gate"
    });
  });

  // Verify 6-digit access PIN securely on the server
  // The actual PIN is NEVER sent to or visible in client-side inspect element!
  app.post("/api/auth/verify-pin", (req, res) => {
    const { pin } = req.body;
    const serverPin = (process.env.APP_PIN || "089739").trim();

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ 
        success: false, 
        message: "PIN harus diisi dengan 6 digit angka." 
      });
    }

    const cleanInput = pin.trim();

    // Constant-time length and timing comparison to prevent timing attacks
    const pinBuffer = Buffer.from(cleanInput);
    const targetBuffer = Buffer.from(serverPin);

    let match = false;
    if (pinBuffer.length === targetBuffer.length) {
      match = crypto.timingSafeEqual(pinBuffer, targetBuffer);
    }

    if (match) {
      // Generate a signed session token
      const issuedAt = Date.now();
      const sessionSecret = process.env.SESSION_SECRET || "ckb-hub-secure-auth-secret-key-2026";
      const signature = crypto
        .createHmac("sha256", sessionSecret)
        .update(`${issuedAt}:${serverPin}:ckb_authorized`)
        .digest("hex");

      const sessionToken = Buffer.from(
        JSON.stringify({
          valid: true,
          iat: issuedAt,
          exp: issuedAt + (30 * 24 * 60 * 60 * 1000), // 30 days
          sig: signature
        })
      ).toString("base64");

      return res.json({
        success: true,
        message: "Akses PIN berhasil diverifikasi.",
        token: sessionToken,
        expiresIn: 30 * 24 * 60 * 60 * 1000
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "PIN 6 digit tidak sesuai. Silakan coba lagi."
      });
    }
  });

  // Verify existing token validity
  app.post("/api/auth/validate-token", (req, res) => {
    const { token } = req.body;
    const serverPin = (process.env.APP_PIN || "089739").trim();
    const sessionSecret = process.env.SESSION_SECRET || "ckb-hub-secure-auth-secret-key-2026";

    if (!token || typeof token !== "string") {
      return res.json({ valid: false });
    }

    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (!decoded || !decoded.iat || !decoded.sig || !decoded.exp) {
        return res.json({ valid: false });
      }

      if (Date.now() > decoded.exp) {
        return res.json({ valid: false, reason: "expired" });
      }

      const expectedSig = crypto
        .createHmac("sha256", sessionSecret)
        .update(`${decoded.iat}:${serverPin}:ckb_authorized`)
        .digest("hex");

      if (expectedSig === decoded.sig) {
        return res.json({ valid: true });
      }
      return res.json({ valid: false });
    } catch {
      return res.json({ valid: false });
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
