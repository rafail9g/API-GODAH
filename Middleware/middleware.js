const supabase = require("../config/supabase");
const { verifyToken } = require("../utils/authToken");

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";

    console.log(
      `${color}[${new Date().toISOString()}] ${req.method} ${req.path} -> ${status} (${ms}ms)\x1b[0m`
    );
  });

  next();
};

async function findSupabaseProfile(userId) {
  const tables = [
    { table: "admins", role: "admin" },
    { table: "porters", role: "porter" },
    { table: "users", role: "user" },
  ];

  for (const candidate of tables) {
    const { data } = await supabase
      .from(candidate.table)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        role: candidate.role,
        profile: data,
      };
    }
  }

  return null;
}

const authenticate = async (req, res, next) => {
  const rawHeader = req.headers.authorization || "";
  const token = rawHeader.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization Bearer token wajib diisi",
    });
  }

  const localPayload = verifyToken(token);
  if (localPayload?.id && localPayload?.role) {
    const profile = await findSupabaseProfile(localPayload.id);
    if (!profile || profile.role !== localPayload.role) {
      return res.status(403).json({
        success: false,
        message: "Profil role tidak ditemukan untuk token ini",
      });
    }

    req.auth = {
      ...profile,
      source: "api-token",
    };
    return next();
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid",
      ...(error ? { error: error.message } : {}),
    });
  }

  const profile = await findSupabaseProfile(data.user.id);
  if (!profile) {
    return res.status(403).json({
      success: false,
      message: "Profil role tidak ditemukan untuk token ini",
    });
  }

  req.auth = {
    ...profile,
    source: "supabase-token",
  };
  return next();
};

const optionalAuthenticate = async (req, res, next) => {
  const rawHeader = req.headers.authorization || "";
  const token = rawHeader.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;

  if (!token) return next();

  return authenticate(req, res, next);
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan",
    });
  }

  if (!roles.includes(req.auth.role)) {
    return res.status(403).json({
      success: false,
      message: `Akses hanya untuk role: ${roles.join(", ")}`,
    });
  }

  if (
    req.auth.role === "porter" &&
    ["nonaktif", "diblokir"].includes(req.auth.profile?.status)
  ) {
    return res.status(403).json({
      success: false,
      message: `Akun porter sedang ${req.auth.profile.status}. Hubungi admin.`,
    });
  }

  return next();
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} tidak ditemukan.`,
    hint: "Lihat dokumentasi di /api-docs",
  });
};

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Terjadi kesalahan server.",
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = {
  requestLogger,
  authenticate,
  optionalAuthenticate,
  requireRole,
  notFound,
  errorHandler,
};
