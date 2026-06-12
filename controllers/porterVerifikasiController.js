const supabase = require("../config/supabase");
const {
  PORTER_VERIFICATION_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  success,
} = require("../utils/mobileContract");

const getVerifications = async (req, res) => {
  let query = supabase
    .from("porter_verifikasi")
    .select("*, porters(id, nama, email, no_hp)");

  if (req.query.status) {
    query = query.eq("status", req.query.status);
  }
  if (req.query.porter_id || req.query.porterId) {
    query = query.eq("porter_id", req.query.porter_id || req.query.porterId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return failure(res, 400, "Gagal mengambil verifikasi porter", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data, 200, {
    verifikasi: data,
  });
};

const getMyVerification = async (req, res) => {
  const porterId = req.auth?.role === "porter"
    ? req.auth.id
    : firstDefined(req.query.porter_id, req.query.porterId, req.body?.porter_id, req.body?.porterId);

  if (!porterId) {
    return failure(res, 400, "porter_id/porterId wajib diisi");
  }

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .select("*, porters(id, nama, email, no_hp)")
    .eq("porter_id", porterId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return failure(res, 400, "Gagal mengambil verifikasi porter", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data?.[0] || null, 200, {
    verifikasi: data?.[0] || null,
  });
};

const getVerificationById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .select("*, porters(id, nama, email, no_hp)")
    .eq("id", id)
    .single();

  if (error) return failure(res, 404, "Verifikasi porter tidak ditemukan", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data);
};

const submitVerification = async (req, res) => {
  const dokumenUrl = firstDefined(req.body.dokumen_url, req.body.dokumenUrl, req.body.documentUrl);
  const porterId = req.auth?.role === "porter"
    ? req.auth.id
    : firstDefined(req.body.porter_id, req.body.porterId, req.query.porter_id, req.query.porterId);

  if (!porterId || !dokumenUrl) {
    return failure(res, 400, "porter_id/porterId dan dokumen_url/dokumenUrl wajib diisi");
  }

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .insert([
      {
        porter_id: porterId,
        dokumen_url: dokumenUrl,
        status: "menunggu",
      },
    ])
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal submit verifikasi porter", error.message);

  await supabase
    .from("porters")
    .update({ status_verifikasi: "menunggu" })
    .eq("id", porterId);

  return success(res, "Verifikasi porter berhasil disubmit", data, 201, {
    verifikasi: data,
  });
};

const reviewVerification = async (req, res) => {
  const { id } = req.params;
  const status = firstDefined(req.body.status);
  const catatanAdmin = firstDefined(req.body.catatan_admin, req.body.catatanAdmin, req.body.catatan);
  const adminId = req.auth?.role === "admin"
    ? req.auth.id
    : firstDefined(req.body.admin_id, req.body.adminId);

  if (!status || !isAllowed(status, PORTER_VERIFICATION_STATUSES)) {
    return failure(
      res,
      400,
      `status wajib salah satu dari: ${PORTER_VERIFICATION_STATUSES.join(", ")}`
    );
  }

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .update({
      admin_id: adminId || null,
      status,
      catatan_admin: catatanAdmin,
      tanggal_verifikasi: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal review verifikasi porter", error.message);

  await supabase
    .from("porters")
    .update({
      status_verifikasi: status,
      is_aktif: status === "disetujui",
    })
    .eq("id", data.porter_id);

  return success(res, "Verifikasi porter berhasil direview", data);
};

module.exports = {
  getVerifications,
  getMyVerification,
  getVerificationById,
  submitVerification,
  reviewVerification,
};
