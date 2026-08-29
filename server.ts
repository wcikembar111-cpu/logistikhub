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
    const isCustomPin = Boolean(process.env.APP_PIN && process.env.APP_PIN.trim());
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
      defaultUsers: []
    });
  });

  // Verify User & 6-digit access PIN securely on the server with SQL Database verification
  // The actual PIN is NEVER sent to or visible in client-side inspect element!
  app.post("/api/auth/verify-pin", async (req, res) => {
    const { username, pin } = req.body;
    const rawUsername = (typeof username === "string" ? username : "").trim();
    const cleanUsername = rawUsername.toLowerCase();
    const cleanNoSpace = cleanUsername.replace(/[\s._-]+/g, '');

    if (!rawUsername) {
      return res.status(400).json({ 
        success: false, 
        message: "Username harus diisi." 
      });
    }

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ 
        success: false, 
        message: "PIN harus diisi dengan 6 digit angka." 
      });
    }

    const cleanPin = pin.trim();
    let authenticatedUser: { username: string; nama_lengkap: string; role: string; email?: string } | null = null;

    // Helper matcher
    const checkMatch = (dbUsers: any[]) => {
      return dbUsers.find((u: any) => {
        if (u.is_active === false || u.is_active === "false" || u.is_active === 0) return false;

        const uName = String(u.username || '').trim().toLowerCase();
        const uEmail = String(u.email || '').trim().toLowerCase();
        const uFullName = String(u.nama_lengkap || u.nama || u.name || '').trim().toLowerCase();
        const uId = String(u.id || '').trim().toLowerCase();
        const uNameNoSpace = uName.replace(/[\s._-]+/g, '');
        const uFullNameNoSpace = uFullName.replace(/[\s._-]+/g, '');
        const emailPrefix = cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername;

        const isUserMatch = (
          uName === cleanUsername ||
          uEmail === cleanUsername ||
          uName === emailPrefix ||
          (cleanNoSpace.length >= 3 && uNameNoSpace === cleanNoSpace) ||
          (cleanNoSpace.length >= 3 && uFullNameNoSpace === cleanNoSpace) ||
          uFullName === cleanUsername ||
          (cleanNoSpace.length >= 4 && uFullNameNoSpace.includes(cleanNoSpace)) ||
          (cleanNoSpace.length >= 4 && cleanNoSpace.includes(uFullNameNoSpace)) ||
          (cleanUsername.length > 10 && uId === cleanUsername)
        );

        if (!isUserMatch) return false;

        const dbPin = String(u.pin ?? '').trim();
        const dbPassword = String(u.password ?? '').trim();
        const dbPinCode = String(u.pin_code ?? u.kode_pin ?? u.access_code ?? '').trim();

        const cleanPinNum = cleanPin.replace(/^0+/, '') || '0';
        const dbPinNum = dbPin.replace(/^0+/, '') || '0';
        const dbPinPadded = dbPin.padStart(6, '0');
        const cleanPinPadded = cleanPin.padStart(6, '0');

        return (
          (dbPin && cleanPin === dbPin) ||
          (dbPin && cleanPinPadded === dbPinPadded) ||
          (dbPin && /^\d+$/.test(cleanPin) && /^\d+$/.test(dbPin) && cleanPinNum === dbPinNum) ||
          (dbPassword && cleanPin === dbPassword) ||
          (dbPassword && cleanPin.toLowerCase() === dbPassword.toLowerCase()) ||
          (dbPinCode && cleanPin === dbPinCode)
        );
      });
    };

    // 1. Attempt verification via SQL Database (Supabase PostgreSQL admin_users table)
    if (supabaseServerClient) {
      try {
        let dbUsersList: any[] = [];

        // Check admin_users table first
        const { data: adminUsers, error: dbError } = await supabaseServerClient
          .from("admin_users")
          .select("*");

        if (!dbError && Array.isArray(adminUsers) && adminUsers.length > 0) {
          dbUsersList = adminUsers;
        } else {
          // Fallback: check users table
          const { data: generalUsers, error: usersErr } = await supabaseServerClient
            .from("users")
            .select("*");

          if (!usersErr && Array.isArray(generalUsers) && generalUsers.length > 0) {
            dbUsersList = generalUsers;
          }
        }

        if (dbUsersList.length > 0) {
          const matchedDbUser = checkMatch(dbUsersList);

          if (matchedDbUser) {
            authenticatedUser = {
              username: matchedDbUser.username || cleanUsername,
              nama_lengkap: matchedDbUser.nama_lengkap || matchedDbUser.nama || matchedDbUser.name || matchedDbUser.username || "Pengguna",
              role: (matchedDbUser.role || "admin").toLowerCase(),
              email: matchedDbUser.email || `${matchedDbUser.username || cleanUsername}@kino.co.id`
            };

            // Update last_login timestamp asynchronously
            void (async () => {
              try {
                if (matchedDbUser.id) {
                  await supabaseServerClient
                    .from("admin_users")
                    .update({ last_login: new Date().toISOString() })
                    .eq("id", matchedDbUser.id);
                  await supabaseServerClient
                    .from("users")
                    .update({ last_login: new Date().toISOString() })
                    .eq("id", matchedDbUser.id);
                }
              } catch {}
            })();
          }
        }
      } catch (sqlErr) {
        console.warn("[SQL Auth Warning]:", sqlErr);
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
        message: `Username "${rawUsername}" atau PIN / Password tidak sesuai dengan data di tabel admin_users database.`
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

      if (expectedSig === decoded.sig) {
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
    if (!supabaseServerClient) {
      return res.json({
        success: true,
        source: "database-unconfigured",
        users: []
      });
    }

    try {
      const { data, error } = await supabaseServerClient
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[Users List SQL Warning]:", error.message);
        return res.json({
          success: false,
          source: "error",
          users: [],
          sqlError: error.message
        });
      }

      const formatted = (data || []).map((u: any) => ({
        id: u.id,
        username: u.username || u.email?.split('@')[0] || 'user',
        pin: u.pin || '',
        password: u.password || '',
        nama_lengkap: u.nama_lengkap || u.nama || u.username || 'Pengguna',
        email: u.email || `${u.username || 'user'}@kino.co.id`,
        role: (u.role || 'admin').toLowerCase(),
        is_active: u.is_active !== false,
        last_login: u.last_login,
        created_at: u.created_at,
        updated_at: u.updated_at
      }));

      return res.json({
        success: true,
        source: "sql-database",
        users: formatted
      });
    } catch (err: any) {
      return res.json({
        success: false,
        source: "exception",
        users: [],
        error: err.message
      });
    }
  });

  // POST: Create new user in admin_users
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
      password: cleanPin,
      nama_lengkap: (nama_lengkap || "Administrator").trim(),
      email: (email || `${cleanUsername}@kino.co.id`).trim().toLowerCase(),
      role: (role || "admin").trim().toLowerCase(),
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (supabaseServerClient) {
      try {
        const { data, error } = await supabaseServerClient
          .from("admin_users")
          .upsert([newUserPayload], { onConflict: "username" })
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
          message: `User "${cleanUsername}" berhasil disimpan ke database admin_users.`,
          user: data
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message || "Gagal menyimpan ke database admin_users." });
      }
    }

    return res.json({
      success: true,
      message: `User "${cleanUsername}" berhasil dibuat (mode lokal).`,
      user: { id: `local-${Date.now()}`, ...newUserPayload, created_at: new Date().toISOString() }
    });
  });

  // PUT: Update user & PIN in admin_users
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
      updatePayload.email = String(email).trim().toLowerCase();
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
      updatePayload.password = cleanPin;
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
          message: "Data user & PIN berhasil diperbarui di database admin_users.",
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

  // DELETE: Delete user in admin_users
  app.delete("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;

    if (id === "admin" || id === "6240e310-b057-4de7-8e3d-cb6c416e4245" || id === "superadmin") {
      return res.status(400).json({ 
        success: false, 
        message: "Akun Admin utama ('admin') tidak dapat dihapus demi keamanan sistem." 
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
          message: "User berhasil dihapus dari database SQL (admin_users)."
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    return res.json({
      success: true,
      message: "User berhasil dihapus."
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
