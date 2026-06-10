const supabase = require("../config/supabase");
const {
  PORTER_STATUSES,
  PORTER_VERIFICATION_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  mapPorterPayload,
  success,
} = require("../utils/mobileContract");
const { hashPassword, passwordMatches } = require("../utils/passwordHash");

const PORTER_SAFE_SELECT = "id, nama, email, no_hp, status, status_verifikasi, is_aktif, latitude, longitude, total_selesai";

const getPorters = async (req, res) => {
  let query = supabase.from("porters").select(PORTER_SAFE_SELECT);

  if (req.query.available === "true") {
    query = query.eq("is_aktif", true);
  }
  if (req.query.status) {
    query = query.eq("status", req.query.status);
  }
  if (req.query.status_verifikasi || req.query.verificationStatus) {
    query = query.eq(
      "status_verifikasi",
      req.query.status_verifikasi || req.query.verificationStatus
    );
  }

  const { data, error } = await query;
  if (error) return failure(res, 400, "Gagal mengambil porters", error.message);
  return success(res, "Porters berhasil diambil", data);
};

const getPorterById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porters")
    .select(PORTER_SAFE_SELECT)
    .eq("id", id)
    .single();

  if (error) return failure(res, 404, "Porter tidak ditemukan", error.message);
  return success(res, "Porter berhasil diambil", data, 200, { porter: data });
};

const createPorter = async (req, res) => {
  const payload = mapPorterPayload(req.body);

  if (!payload.nama || !payload.email || !payload.no_hp) {
    return failure(res, 400, "nama/name, email, dan no_hp/phone wajib diisi");
  }

  if (payload.password_hash) {
    payload.password_hash = hashPassword(payload.password_hash);
  }

  const { data, error } = await supabase
    .from("porters")
    .insert([
      {
        status_verifikasi: "menunggu",
        status: "aktif",
        is_aktif: false,
        total_selesai: 0,
        ...payload,
      }
    ])
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal membuat porter", error.message);
  return success(res, "Porter berhasil dibuat", data, 201, { porter: data });
};

const updatePorter = async (req, res) => {
  const { id } = req.params;

  let payload = mapPorterPayload(req.body);

  if (req.auth?.role === "porter") {
    payload = {
      ...(payload.nama !== undefined ? { nama: payload.nama } : {}),
      ...(payload.no_hp !== undefined ? { no_hp: payload.no_hp } : {}),
    };

    if (Object.keys(payload).length === 0) {
      return failure(res, 400, "Porter hanya bisa update nama dan no_hp");
    }
  }

  if (req.auth?.role === "admin") {
    payload = {};
    if (req.body.status !== undefined) {
      payload.status = mapPorterPayload(req.body).status;
      if (!isAllowed(payload.status, PORTER_STATUSES)) {
        return failure(
          res,
          400,
          `Status porter harus salah satu dari: ${PORTER_STATUSES.join(", ")}`
        );
      }
    }
    if (req.body.status_verifikasi !== undefined || req.body.verificationStatus !== undefined) {
      payload.status_verifikasi = mapPorterPayload(req.body).status_verifikasi;
      if (!isAllowed(payload.status_verifikasi, PORTER_VERIFICATION_STATUSES)) {
        return failure(
          res,
          400,
          `Status verifikasi porter harus salah satu dari: ${PORTER_VERIFICATION_STATUSES.join(", ")}`
        );
      }
    }
    if (req.body.is_aktif !== undefined || req.body.isActive !== undefined || req.body.active !== undefined) {
      payload.is_aktif = mapPorterPayload(req.body).is_aktif;
    }

    if (Object.keys(payload).length === 0) {
      return failure(res, 400, "Admin hanya bisa update status, status_verifikasi, dan/atau is_aktif porter");
    }
  }

  const { data, error } = await supabase
    .from("porters")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal update porter", error.message);
  return success(res, "Porter berhasil diupdate", data, 200, { porter: data });
};

const updatePorterLocation = async (req, res) => {
  const payload = mapPorterPayload(req.body);
  const updatePayload = {
    ...(payload.latitude !== undefined ? { latitude: payload.latitude } : {}),
    ...(payload.longitude !== undefined ? { longitude: payload.longitude } : {}),
  };

  if (Object.keys(updatePayload).length === 0) {
    return failure(res, 400, "latitude dan longitude wajib diisi");
  }

  const { data, error } = await supabase
    .from("porters")
    .update(updatePayload)
    .eq("id", req.auth.id)
    .select(PORTER_SAFE_SELECT)
    .single();

  if (error) return failure(res, 400, "Gagal update lokasi porter", error.message);
  return success(res, "Lokasi porter berhasil diupdate", data, 200, { porter: data });
};

const getPorterLocation = async (req, res) => {
  const { data, error } = await supabase
    .from("porters")
    .select("id, latitude, longitude, is_aktif")
    .eq("id", req.auth.id)
    .single();

  if (error) return failure(res, 400, "Gagal mengambil lokasi porter", error.message);
  return success(res, "Lokasi porter berhasil diambil", data, 200, { location: data });
};

const updatePorterOnlineStatus = async (req, res) => {
  const payload = mapPorterPayload(req.body);
  if (payload.is_aktif === undefined) {
    return failure(res, 400, "is_aktif/isActive wajib diisi");
  }

  const { data, error } = await supabase
    .from("porters")
    .update({ is_aktif: payload.is_aktif })
    .eq("id", req.auth.id)
    .select(PORTER_SAFE_SELECT)
    .single();

  if (error) return failure(res, 400, "Gagal update status online porter", error.message);
  return success(res, "Status online porter berhasil diupdate", data, 200, { porter: data });
};

const resetPorterPassword = async (req, res) => {
  const currentPassword = firstDefined(
    req.body.current_password,
    req.body.currentPassword,
    req.body.old_password,
    req.body.oldPassword,
    req.body.password_lama,
    req.body.passwordLama
  );
  const newPassword = firstDefined(
    req.body.new_password,
    req.body.newPassword,
    req.body.password_baru,
    req.body.passwordBaru,
    req.body.password
  );

  if (!currentPassword || !newPassword) {
    return failure(res, 400, "current_password/old_password dan new_password/password wajib diisi");
  }

  const { data: porter, error: porterError } = await supabase
    .from("porters")
    .select("id, password_hash")
    .eq("id", req.auth.id)
    .single();

  if (porterError || !porter) return failure(res, 404, "Porter tidak ditemukan", porterError?.message);
  if (!passwordMatches(porter.password_hash, currentPassword)) {
    return failure(res, 401, "Password lama salah");
  }

  const { data, error } = await supabase
    .from("porters")
    .update({ password_hash: hashPassword(newPassword) })
    .eq("id", req.auth.id)
    .select(PORTER_SAFE_SELECT)
    .single();

  if (error) return failure(res, 400, "Gagal reset password porter", error.message);
  return success(res, "Password porter berhasil direset", data, 200, { porter: data });
};

const deletePorter = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porters")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    const isForeignKey = error.message?.includes("violates foreign key constraint");
    return failure(
      res,
      isForeignKey ? 409 : 400,
      isForeignKey
        ? "Porter masih punya data terkait seperti order, bukti pengiriman, atau verifikasi, jadi tidak bisa dihapus. Nonaktifkan porter atau hapus data terkait dulu."
        : "Gagal menghapus porter",
      isForeignKey ? null : error.message
    );
  }

  if (!data || data.length === 0) {
    return failure(res, 404, "Porter tidak ditemukan");
  }

  return success(res, "Porter berhasil dihapus", null);
};

module.exports = {
  getPorters,
  getPorterById,
  createPorter,
  updatePorter,
  getPorterLocation,
  updatePorterLocation,
  updatePorterOnlineStatus,
  resetPorterPassword,
  deletePorter
};
