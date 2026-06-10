const supabase = require("../config/supabase");
const {
  PORTER_VERIFICATION_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  success,
} = require("../utils/mobileContract");

const getVerifications = async (_req, res) => {
  const { data, error } = await supabase
    .from("porter_verifikasi")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return failure(res, 400, "Gagal mengambil verifikasi porter", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data);
};

const getMyVerification = async (req, res) => {
  const { data, error } = await supabase
    .from("porter_verifikasi")
    .select("*")
    .eq("porter_id", req.auth.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return failure(res, 400, "Gagal mengambil verifikasi porter", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data?.[0] || null);
};

const getVerificationById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return failure(res, 404, "Verifikasi porter tidak ditemukan", error.message);
  return success(res, "Verifikasi porter berhasil diambil", data);
};

const submitVerification = async (req, res) => {
  const dokumenUrl = firstDefined(req.body.dokumen_url, req.body.dokumenUrl, req.body.documentUrl);

  if (!dokumenUrl) {
    return failure(res, 400, "dokumen_url/dokumenUrl wajib diisi");
  }

  const { data, error } = await supabase
    .from("porter_verifikasi")
    .insert([
      {
        porter_id: req.auth.id,
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
    .eq("id", req.auth.id);

  return success(res, "Verifikasi porter berhasil disubmit", data, 201);
};

const reviewVerification = async (req, res) => {
  const { id } = req.params;
  const status = firstDefined(req.body.status);
  const catatanAdmin = firstDefined(req.body.catatan_admin, req.body.catatanAdmin, req.body.catatan);

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
      admin_id: req.auth.id,
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
