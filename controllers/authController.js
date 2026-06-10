const supabase = require("../config/supabase");
const { signToken, verifyToken } = require("../utils/authToken");
const { failure, mapUserPayload, success } = require("../utils/mobileContract");
const { hashPassword, passwordMatches } = require("../utils/passwordHash");

function isRestrictedPorter(account) {
  return ["nonaktif", "diblokir"].includes(account?.status);
}

async function register(req, res) {
  try {
    const payload = mapUserPayload(req.body);
    const role = req.body?.role || "user";

    if (!payload.nama || !payload.email || !payload.password_hash || !payload.no_hp) {
      return failure(res, 400, "nama/name, email, password, dan no_hp/phone wajib diisi");
    }

    if (!["user", "porter"].includes(role)) {
      return failure(res, 400, "role register harus user atau porter");
    }

    const table = role === "porter" ? "porters" : "users";
    const { data: existingUser, error: existingError } = await supabase
      .from(table)
      .select("id")
      .eq("email", payload.email)
      .maybeSingle();

    if (existingError) {
      console.error("[REGISTER] Gagal cek email:", existingError);
      return failure(res, 400, "Gagal cek email terdaftar", existingError.message);
    }

    if (existingUser) {
      return failure(res, 409, "Email sudah terdaftar");
    }

    const insertPayload = role === "porter"
      ? {
          nama: payload.nama,
          email: payload.email,
          password_hash: hashPassword(payload.password_hash),
          no_hp: payload.no_hp,
          status_verifikasi: "menunggu",
          status: payload.status || "aktif",
          is_aktif: false,
          total_selesai: 0,
        }
      : {
          ...payload,
          password_hash: hashPassword(payload.password_hash),
          status: payload.status || "aktif",
        };

    let { data, error } = await supabase
      .from(table)
      .insert([insertPayload])
      .select()
      .single();

    if (
      role === "porter" &&
      (
        error?.message?.includes("Could not find the 'status' column") ||
        error?.message?.includes("column \"status\" of relation \"porters\" does not exist")
      )
    ) {
      const { status, ...payloadWithoutStatus } = insertPayload;
      const retry = await supabase
        .from(table)
        .insert([payloadWithoutStatus])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[REGISTER] Gagal insert:", error);
      return failure(res, 400, "Gagal membuat akun", error.message || JSON.stringify(error));
    }

    const token = signToken({
      id: data.id,
      role,
    });

    return success(res, "Register berhasil", data, 201, { [role]: data, role, token });
  } catch (error) {
    console.error("[REGISTER] Error tidak terduga:", error);
    return failure(res, 500, "Register error di server", error.message);
  }
}

async function login(req, res) {
  const { email, password, password_hash, role } = req.body || {};
  const submittedPassword = password || password_hash;

  if (!email || !submittedPassword) {
    return failure(res, 400, "email dan password wajib diisi");
  }

  if (role && !["user", "porter", "admin"].includes(role)) {
    return failure(res, 400, "role harus user, porter, atau admin");
  }

  const candidates = role
    ? [{ table: `${role === "user" ? "users" : `${role}s`}`, role }]
    : [
        { table: "users", role: "user" },
        { table: "porters", role: "porter" },
        { table: "admins", role: "admin" },
      ];

  let account = null;
  let accountRole = null;

  for (const candidate of candidates) {
    const { data } = await supabase
      .from(candidate.table)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (data && passwordMatches(data.password_hash, submittedPassword)) {
      account = data;
      accountRole = candidate.role;
      break;
    }
  }

  if (!account) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: submittedPassword,
    });

    if (!authError && authData?.user) {
      const authUserId = authData.user.id;
      const profileCandidates = [
        { table: "users", role: "user" },
        { table: "porters", role: "porter" },
        { table: "admins", role: "admin" },
      ];

      for (const candidate of profileCandidates) {
        const { data } = await supabase
          .from(candidate.table)
          .select("*")
          .eq("id", authUserId)
          .maybeSingle();

        if (data) {
          account = data;
          accountRole = candidate.role;
          break;
        }
      }

      if (!account) {
        const metadataRole = authData.user.user_metadata?.role;
        const roleFromMetadata = ["user", "porter"].includes(metadataRole)
          ? metadataRole
          : "user";
        const table = roleFromMetadata === "porter" ? "porters" : "users";
        const payload = roleFromMetadata === "porter"
          ? {
              id: authUserId,
              nama: authData.user.user_metadata?.nama || authData.user.email?.split("@")[0] || "Porter GoDah",
              email: authData.user.email,
              no_hp: authData.user.user_metadata?.no_hp || authData.user.phone || `auth-${authUserId.slice(0, 11)}`,
              password_hash: "supabase_managed",
              status_verifikasi: "menunggu",
              status: "aktif",
              is_aktif: false,
              total_selesai: 0,
            }
          : {
              id: authUserId,
              nama: authData.user.user_metadata?.nama || authData.user.email?.split("@")[0] || "User GoDah",
              email: authData.user.email,
              no_hp: authData.user.user_metadata?.no_hp || authData.user.phone || `auth-${authUserId.slice(0, 11)}`,
              password_hash: "supabase_managed",
              status: "aktif",
            };

        const { data: createdProfile, error: profileError } = await supabase
          .from(table)
          .upsert(payload, { onConflict: "id" })
          .select()
          .single();

        if (profileError) {
          return failure(
            res,
            403,
            "Login Supabase berhasil, tapi profil public gagal dibuat/ditemukan",
            profileError.message
          );
        }

        account = createdProfile;
        accountRole = roleFromMetadata;
      }

      const token = signToken({
        id: account.id,
        role: accountRole,
      });

      if (accountRole === "porter" && isRestrictedPorter(account)) {
        return failure(res, 403, `Akun porter sedang ${account.status}. Hubungi admin.`);
      }

      return success(res, "Login Supabase berhasil", account, 200, {
        [accountRole]: account,
        role: accountRole,
        token,
        supabase_access_token: authData.session?.access_token,
      });
    }

    return failure(res, 401, "Email atau password salah", authError?.message);
  }

  if (accountRole === "porter" && isRestrictedPorter(account)) {
    return failure(res, 403, `Akun porter sedang ${account.status}. Hubungi admin.`);
  }

  const token = signToken({
    id: account.id,
    role: accountRole,
  });

  return success(res, "Login berhasil", account, 200, {
    [accountRole]: account,
    role: accountRole,
    token,
  });
}

async function me(req, res) {
  if (req.auth) {
    return success(res, "Akun ditemukan", req.auth.profile, 200, {
      [req.auth.role]: req.auth.profile,
      role: req.auth.role,
    });
  }

  const rawToken = req.headers.authorization?.replace("Bearer ", "");
  const localPayload = verifyToken(rawToken);
  const userId = localPayload?.id || req.query.user_id;
  const role = localPayload?.role || req.query.role || "user";

  if (!userId) {
    return failure(res, 401, "Token/user_id tidak ditemukan");
  }

  const table = role === "admin" ? "admins" : role === "porter" ? "porters" : "users";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return failure(res, 404, "Akun tidak ditemukan", error?.message);

  return success(res, "Akun ditemukan", data, 200, { [role]: data, role });
}

module.exports = {
  login,
  me,
  register,
};
