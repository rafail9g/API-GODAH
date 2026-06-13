const supabase = require("../config/supabase");
const { signToken, verifyToken } = require("../utils/authToken");
const { failure, mapUserPayload, success } = require("../utils/mobileContract");
const { hashPassword, passwordMatches } = require("../utils/passwordHash");

function isRestrictedAccount(account) {
  return ["nonaktif", "diblokir"].includes(account?.status);
}

function profilePayloadForRole(role, authUser, body = {}) {
  const name =
    body.nama ||
    body.name ||
    body.fullName ||
    authUser?.user_metadata?.nama ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split("@")[0] ||
    (role === "porter" ? "Porter GoDah" : "User GoDah");

  const phone =
    body.no_hp ||
    body.noHp ||
    body.phone ||
    body.phoneNumber ||
    authUser?.user_metadata?.no_hp ||
    authUser?.phone;

  const basePayload = {
    id: authUser.id,
    nama: name,
    email: authUser.email,
    no_hp: phone,
    password_hash: "google_oauth",
  };

  if (role === "porter") {
    return {
      ...basePayload,
      status_verifikasi: "menunggu",
      status: "aktif",
      is_aktif: false,
      total_selesai: 0,
    };
  }

  return {
    ...basePayload,
    alamat: body.alamat || body.address || null,
    status: "aktif",
  };
}

async function findProfileByUserId(userId) {
  const candidates = [
    { table: "users", role: "user" },
    { table: "porters", role: "porter" },
    { table: "admins", role: "admin" },
  ];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from(candidate.table)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) return { account: data, role: candidate.role };
  }

  return null;
}

function authResponse(res, message, account, role, statusCode = 200, extra = {}) {
  const token = signToken({ id: account.id, role });

  return success(res, message, account, statusCode, {
    [role]: account,
    role,
    token,
    ...extra,
  });
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

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password_hash,
      options: {
        data: {
          role,
          nama: payload.nama,
          no_hp: payload.no_hp,
        },
      },
    });

    if (authError || !authData?.user) {
      return failure(
        res,
        400,
        "Gagal membuat akun Supabase Auth",
        authError?.message
      );
    }

    const insertPayload = role === "porter"
      ? {
          id: authData.user.id,
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
          id: authData.user.id,
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

    return authResponse(res, "Register berhasil", data, role, 201);
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

      if (["user", "porter"].includes(accountRole) && isRestrictedAccount(account)) {
        return failure(res, 403, `Akun ${accountRole} sedang ${account.status}. Hubungi admin.`);
      }

      return authResponse(res, "Login Supabase berhasil", account, accountRole, 200, {
        supabase_access_token: authData.session?.access_token,
      });
    }

    return failure(res, 401, "Email atau password salah", authError?.message);
  }

  if (["user", "porter"].includes(accountRole) && isRestrictedAccount(account)) {
    return failure(res, 403, `Akun ${accountRole} sedang ${account.status}. Hubungi admin.`);
  }

  return authResponse(res, "Login berhasil", account, accountRole);
}

async function googleLogin(req, res) {
  try {
    const body = req.body || {};
    const idToken = body.id_token || body.idToken || body.token;

    if (!idToken) {
      return failure(res, 400, "id_token/idToken Google wajib diisi");
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      access_token: body.access_token || body.accessToken,
    });

    if (authError || !authData?.user) {
      return failure(res, 401, "Login Google gagal", authError?.message);
    }

    const existingProfile = await findProfileByUserId(authData.user.id);
    if (existingProfile) {
      if (
        ["user", "porter"].includes(existingProfile.role) &&
        isRestrictedAccount(existingProfile.account)
      ) {
        return failure(
          res,
          403,
          `Akun ${existingProfile.role} sedang ${existingProfile.account.status}. Hubungi admin.`
        );
      }

      return authResponse(
        res,
        "Login Google berhasil",
        existingProfile.account,
        existingProfile.role,
        200,
        {
          needs_role_selection: false,
          supabase_access_token: authData.session?.access_token,
          supabase_refresh_token: authData.session?.refresh_token,
        }
      );
    }

    return success(res, "Login Google berhasil, pilih role dulu", null, 200, {
      needs_role_selection: true,
      supabase_user: {
        id: authData.user.id,
        email: authData.user.email,
        nama: authData.user.user_metadata?.name || authData.user.email?.split("@")[0],
      },
      supabase_access_token: authData.session?.access_token,
      supabase_refresh_token: authData.session?.refresh_token,
    });
  } catch (error) {
    console.error("[GOOGLE LOGIN] Error:", error);
    return failure(res, 500, "Login Google error di server", error.message);
  }
}

async function completeGoogleProfile(req, res) {
  try {
    const rawHeader = req.headers.authorization || "";
    const accessToken = rawHeader.startsWith("Bearer ")
      ? rawHeader.slice(7).trim()
      : req.body?.supabase_access_token || req.body?.supabaseAccessToken;

    if (!accessToken) {
      return failure(res, 401, "Supabase access token wajib diisi");
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return failure(res, 401, "Supabase access token tidak valid", authError?.message);
    }

    const role = req.body?.role;
    if (!["user", "porter"].includes(role)) {
      return failure(res, 400, "role wajib user atau porter");
    }

    if (!req.body?.nama && !req.body?.name && !authData.user.user_metadata?.name) {
      return failure(res, 400, "nama/name wajib diisi");
    }

    if (!req.body?.no_hp && !req.body?.noHp && !req.body?.phone && !authData.user.phone) {
      return failure(res, 400, "no_hp/phone wajib diisi");
    }

    const existingProfile = await findProfileByUserId(authData.user.id);
    if (existingProfile && existingProfile.role !== role) {
      return failure(
        res,
        409,
        `Akun Google ini sudah terdaftar sebagai ${existingProfile.role}`
      );
    }
    if (existingProfile) {
      if (isRestrictedAccount(existingProfile.account)) {
        return failure(
          res,
          403,
          `Akun ${existingProfile.role} sedang ${existingProfile.account.status}. Hubungi admin.`
        );
      }

      return authResponse(
        res,
        "Profil Google sudah lengkap",
        existingProfile.account,
        existingProfile.role
      );
    }

    const table = role === "porter" ? "porters" : "users";
    const payload = profilePayloadForRole(role, authData.user, req.body);

    const { data: profile, error: profileError } = await supabase
      .from(table)
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (profileError) {
      return failure(res, 400, "Gagal melengkapi profil Google", profileError.message);
    }

    return authResponse(res, "Profil Google berhasil dilengkapi", profile, role);
  } catch (error) {
    console.error("[GOOGLE COMPLETE] Error:", error);
    return failure(res, 500, "Complete Google profile error di server", error.message);
  }
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
  completeGoogleProfile,
  googleLogin,
  login,
  me,
  register,
};
