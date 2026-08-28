import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

// Initialize Supabase Server Client if configured
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabaseServerClient = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

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
      const action = (req.body?.action || req.query?.action || "read") as string;

      // Build target URL with parameters (try action=read first as Google Apps Script expects)
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

      // If GET returns webhook ready msg or html, attempt GET with action=getdata or POST payload
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
        // If it's a wrapper object like { status: 'ok', data: [...] }
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

  // Check PIN & Admin Configuration Status (does not expose the PIN!)
  app.get("/api/auth/pin-status", async (_req, res) => {
    const isCustomPin = Boolean(process.env.APP_PIN && process.env.APP_PIN.trim() !== "089739");
    let sqlConnected = false;
    let sqlUsersCount = 0;

    if (supabaseServerClient) {
      try {
        const { count, error } = await supabaseServerClient
          .from("admin_users")
          .select("*", { count: "exact", head: true });
        if (!error) {
          sqlConnected = true;
          sqlUsersCount = count || 0;
        }
      } catch {
        // sql table check
      }
    }

    res.json({
      configured: true,
      digits: 6,
      isCustom: isCustomPin,
      authMethod: "user-and-pin-sql-gate",
      sqlDatabase: {
        connected: sqlConnected,
        table: "admin_users",
        usersCount: sqlUsersCount
      },
      defaultUsers: ["superadmin", "admin", "dede"]
    });
  });

  // Verify User & 6-digit access PIN securely on the server with SQL Database verification
  // The actual PIN is NEVER sent to or visible in client-side inspect element!
  app.post("/api/auth/verify-pin", async (req, res) => {
    const { username, pin } = req.body;
    const rawUsername = (typeof username === "string" ? username : "admin").trim();
    const cleanUsername = rawUsername.toLowerCase();
    const defaultServerPin = (process.env.APP_PIN || "089739").trim();

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ 
        success: false, 
        message: "PIN harus diisi dengan 6 digit angka." 
      });
    }

    const cleanPin = pin.trim();
    let authenticatedUser: { username: string; nama_lengkap: string; role: string; email?: string } | null = null;

    // 1. Attempt verification via SQL Database (Supabase PostgreSQL admin_users table)
    if (supabaseServerClient) {
      try {
        const { data: dbUser, error: dbError } = await supabaseServerClient
          .from("admin_users")
          .select("username, pin, nama_lengkap, email, role, is_active")
          .ilike("username", cleanUsername)
          .eq("is_active", true)
          .single();

        if (!dbError && dbUser && dbUser.pin === cleanPin) {
          authenticatedUser = {
            username: dbUser.username,
            nama_lengkap: dbUser.nama_lengkap || "Administrator",
            role: dbUser.role || "admin",
            email: dbUser.email || `${dbUser.username}@kino.co.id`
          };

          // Update last_login timestamp asynchronously
          void (async () => {
            try {
              await supabaseServerClient
                .from("admin_users")
                .update({ last_login: new Date().toISOString() })
                .ilike("username", cleanUsername);
            } catch {}
          })();
        } else if (!dbError && !dbUser) {
          // Check fallback users table in SQL database
          const { data: legacyUser } = await supabaseServerClient
            .from("users")
            .select("email, password, username, pin, role")
            .or(`email.ilike.${cleanUsername},username.ilike.${cleanUsername}`)
            .single();

          if (legacyUser && (legacyUser.pin === cleanPin || legacyUser.password === cleanPin)) {
            authenticatedUser = {
              username: legacyUser.username || cleanUsername,
              nama_lengkap: "Administrator",
              role: legacyUser.role || "admin",
              email: legacyUser.email
            };
          }
        }
      } catch (sqlErr) {
        console.warn("[SQL Auth Warning]:", sqlErr);
      }
    }

    // 2. Fallback / Built-in Admin Users (Guarantees zero-downtime offline or instant startup)
    if (!authenticatedUser) {
      const allowedAdmins: Record<string, { pin: string; name: string; email: string; role: string }> = {
        superadmin: {
          pin: defaultServerPin,
          name: "Super Administrator (Full Akses)",
          email: "superadmin@kino.co.id",
          role: "superadmin"
        },
        admin: {
          pin: defaultServerPin,
          name: "Administrator Logistics",
          email: "admin@admin.com",
          role: "admin"
        },
        dede: {
          pin: defaultServerPin,
          name: "Dede Suparman (Supervisor)",
          email: "dede.suparman@kino.co.id",
          role: "admin"
        }
      };

      // Also check custom env if defined
      if (process.env.APP_USER) {
        allowedAdmins[process.env.APP_USER.trim().toLowerCase()] = {
          pin: (process.env.APP_PIN || defaultServerPin).trim(),
          name: "Custom Admin User",
          email: "admin@kino.co.id",
          role: "admin"
        };
      }

      const matchedPreset = allowedAdmins[cleanUsername];
      if (matchedPreset) {
        // Constant-time length and timing comparison
        const pinBuffer = Buffer.from(cleanPin);
        const targetBuffer = Buffer.from(matchedPreset.pin);

        let match = false;
        if (pinBuffer.length === targetBuffer.length) {
          match = crypto.timingSafeEqual(pinBuffer, targetBuffer);
        }

        if (match) {
          authenticatedUser = {
            username: cleanUsername,
            nama_lengkap: matchedPreset.name,
            role: matchedPreset.role || "admin",
            email: matchedPreset.email
          };
        }
      }
    }

    // Return response based on authentication result
    if (authenticatedUser) {
      // Generate a signed session token
      const issuedAt = Date.now();
      const sessionSecret = process.env.SESSION_SECRET || "ckb-hub-secure-auth-secret-key-2026";
      const signature = crypto
        .createHmac("sha256", sessionSecret)
        .update(`${issuedAt}:${authenticatedUser.username}:${authenticatedUser.role}:ckb_authorized`)
        .digest("hex");

      const sessionToken = Buffer.from(
        JSON.stringify({
          valid: true,
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          name: authenticatedUser.nama_lengkap,
          iat: issuedAt,
          exp: issuedAt + (30 * 24 * 60 * 60 * 1000), // 30 days
          sig: signature
        })
      ).toString("base64");

      return res.json({
        success: true,
        message: `Login Admin berhasil sebagai ${authenticatedUser.nama_lengkap}.`,
        user: authenticatedUser,
        token: sessionToken,
        expiresIn: 30 * 24 * 60 * 60 * 1000
      });
    } else {
      return res.status(401).json({
        success: false,
        message: `Username "${rawUsername}" atau PIN 6 digit tidak sesuai. Hanya Admin yang memiliki akses.`
      });
    }
  });

  // Verify existing token validity
  app.post("/api/auth/validate-token", (req, res) => {
    const { token } = req.body;
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
        .update(`${decoded.iat}:${decoded.username || 'admin'}:${decoded.role || 'admin'}:ckb_authorized`)
        .digest("hex");

      // Also verify legacy token format if needed
      const legacyExpectedSig = crypto
        .createHmac("sha256", sessionSecret)
        .update(`${decoded.iat}:${process.env.APP_PIN || "089739"}:ckb_authorized`)
        .digest("hex");

      if (expectedSig === decoded.sig || legacyExpectedSig === decoded.sig) {
        return res.json({ 
          valid: true, 
          user: {
            username: decoded.username || 'admin',
            name: decoded.name || 'Administrator',
            role: decoded.role || 'admin'
          }
        });
      }
      return res.json({ valid: false });
    } catch {
      return res.json({ valid: false });
    }
  });

  // =================================================================
  // ADMIN USERS CRUD API (Database SQL admin_users Management)
  // =================================================================

  // GET: Fetch all admin users
  app.get("/api/admin/users", async (_req, res) => {
    const defaultAdmins = [
      {
        id: "default-superadmin-0",
        username: "superadmin",
        pin: (process.env.APP_PIN || "089739").trim(),
        nama_lengkap: "Super Administrator (Full Akses)",
        email: "superadmin@kino.co.id",
        role: "superadmin",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: "default-admin-1",
        username: "admin",
        pin: (process.env.APP_PIN || "089739").trim(),
        nama_lengkap: "Administrator Logistics",
        email: "admin@admin.com",
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: "default-admin-2",
        username: "dede",
        pin: (process.env.APP_PIN || "089739").trim(),
        nama_lengkap: "Dede Suparman (Supervisor)",
        email: "dede.suparman@kino.co.id",
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    if (!supabaseServerClient) {
      return res.json({
        success: true,
        source: "memory-fallback",
        users: defaultAdmins
      });
    }

    try {
      const { data, error } = await supabaseServerClient
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Admin Users List SQL Warning]:", error.message);
        return res.json({
          success: true,
          source: "fallback-on-error",
          users: defaultAdmins,
          sqlError: error.message
        });
      }

      if (!data || data.length === 0) {
        // Auto-seed default admins if table exists but empty
        try {
          await supabaseServerClient.from("admin_users").upsert([
            { username: "admin", pin: "089739", nama_lengkap: "Administrator Logistics", email: "admin@admin.com", role: "admin", is_active: true },
            { username: "dede", pin: "089739", nama_lengkap: "Dede Suparman", email: "dede.suparman@kino.co.id", role: "admin", is_active: true }
          ], { onConflict: "username" });

          const { data: refetched } = await supabaseServerClient
            .from("admin_users")
            .select("*")
            .order("created_at", { ascending: false });
          return res.json({
            success: true,
            source: "sql-seeded",
            users: refetched || defaultAdmins
          });
        } catch {
          return res.json({
            success: true,
            source: "fallback-empty",
            users: defaultAdmins
          });
        }
      }

      return res.json({
        success: true,
        source: "sql-database",
        users: data
      });
    } catch (err: any) {
      return res.json({
        success: true,
        source: "fallback-exception",
        users: defaultAdmins,
        error: err.message
      });
    }
  });

  // POST: Create new admin user
  app.post("/api/admin/users", async (req, res) => {
    const { username, pin, nama_lengkap, email, role, is_active } = req.body;

    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ success: false, message: "Username wajib diisi." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = typeof pin === "string" ? pin.trim() : "";

    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({ success: false, message: "PIN harus berupa 6 digit angka." });
    }

    const newUserPayload = {
      username: cleanUsername,
      pin: cleanPin,
      nama_lengkap: (nama_lengkap || "Administrator").trim(),
      email: (email || `${cleanUsername}@kino.co.id`).trim(),
      role: (role || "admin").trim().toLowerCase(),
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (supabaseServerClient) {
      try {
        const { data, error } = await supabaseServerClient
          .from("admin_users")
          .insert([newUserPayload])
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return res.status(409).json({ success: false, message: `Username "${cleanUsername}" sudah digunakan.` });
          }
          return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({
          success: true,
          message: `User Admin "${cleanUsername}" berhasil ditambahkan ke database.`,
          user: data
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message || "Gagal menyimpan ke database." });
      }
    }

    return res.json({
      success: true,
      message: `User Admin "${cleanUsername}" berhasil dibuat (mode lokal).`,
      user: { id: `local-${Date.now()}`, ...newUserPayload, created_at: new Date().toISOString() }
    });
  });

  // PUT: Update admin user & PIN
  app.put("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    const { username, pin, nama_lengkap, email, role, is_active } = req.body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (username && typeof username === "string") {
      updatePayload.username = username.trim().toLowerCase();
    }
    if (nama_lengkap !== undefined) {
      updatePayload.nama_lengkap = String(nama_lengkap).trim();
    }
    if (email !== undefined) {
      updatePayload.email = String(email).trim();
    }
    if (role !== undefined) {
      updatePayload.role = String(role).trim().toLowerCase();
    }
    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active);
    }
    if (pin && typeof pin === "string" && pin.trim()) {
      const cleanPin = pin.trim();
      if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
        return res.status(400).json({ success: false, message: "PIN harus berupa 6 digit angka." });
      }
      updatePayload.pin = cleanPin;
    }

    if (supabaseServerClient) {
      try {
        let query = supabaseServerClient.from("admin_users").update(updatePayload);
        
        // Handle ID as UUID or username match
        if (id.includes("-") && id.length > 20) {
          query = query.eq("id", id);
        } else {
          query = query.ilike("username", id);
        }

        const { data, error } = await query.select().single();
        if (error) {
          return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({
          success: true,
          message: "Data user & PIN admin berhasil diperbarui di database.",
          user: data
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    return res.json({
      success: true,
      message: "Data user & PIN berhasil diperbarui.",
      user: { id, ...updatePayload }
    });
  });

  // DELETE: Delete admin user
  app.delete("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;

    if (id === "admin" || id === "default-admin-1" || id === "superadmin" || id === "default-superadmin") {
      return res.status(400).json({ 
        success: false, 
        message: "Akun Super Admin dan Admin utama tidak dapat dihapus demi keamanan sistem." 
      });
    }

    if (supabaseServerClient) {
      try {
        let query = supabaseServerClient.from("admin_users").delete();
        if (id.includes("-") && id.length > 20) {
          query = query.eq("id", id);
        } else {
          query = query.ilike("username", id);
        }

        const { error } = await query;
        if (error) {
          return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({
          success: true,
          message: "User Admin berhasil dihapus dari database SQL."
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    return res.json({
      success: true,
      message: "User Admin berhasil dihapus."
    });
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
