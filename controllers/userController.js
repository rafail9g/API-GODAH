const supabase = require("../config/supabase");
const {
  USER_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  mapUserPayload,
  success,
} = require("../utils/mobileContract");
const { hashPassword } = require("../utils/passwordHash");

const getUsers = async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) return failure(res, 400, "Gagal mengambil users", error.message);

  return success(res, "Users berhasil diambil", data);
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return failure(res, 404, "User tidak ditemukan", error.message);

  return success(res, "User berhasil diambil", data, 200, { user: data });
};

const createUser = async (req, res) => {
  const payload = mapUserPayload(req.body);

  if (!payload.nama || !payload.email || !payload.no_hp) {
    return failure(res, 400, "nama/name, email, dan no_hp/phone wajib diisi");
  }

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        ...payload,
        password_hash: payload.password_hash ? hashPassword(payload.password_hash) : "manual_api",
      }
    ])
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal membuat user", error.message);

  return success(res, "User berhasil dibuat", data, 201, { user: data });
};

const updateUser = async (req, res) => {
  const { id } = req.params;

  let payload = mapUserPayload(req.body);

  if (req.auth?.role === "user") {
    payload = {
      ...(payload.nama !== undefined ? { nama: payload.nama } : {}),
      ...(payload.no_hp !== undefined ? { no_hp: payload.no_hp } : {}),
      ...(payload.alamat !== undefined ? { alamat: payload.alamat } : {}),
    };

    if (Object.keys(payload).length === 0) {
      return failure(res, 400, "User hanya bisa update nama, no_hp, dan alamat");
    }
  }

  if (req.auth?.role === "admin") {
    const status = firstDefined(req.body.status);
    if (!status) {
      return failure(res, 400, "Admin hanya bisa update status user");
    }
    if (!isAllowed(status, USER_STATUSES)) {
      return failure(res, 400, `Status user harus salah satu dari: ${USER_STATUSES.join(", ")}`);
    }
    payload = { status };
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal update user", error.message);

  return success(res, "User berhasil diupdate", data, 200, { user: data });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    const isForeignKey = error.message?.includes("violates foreign key constraint");
    return failure(
      res,
      isForeignKey ? 409 : 400,
      isForeignKey
        ? "User masih punya data terkait seperti order, jadi tidak bisa dihapus. Nonaktifkan user atau hapus data terkait dulu."
        : "Gagal menghapus user",
      isForeignKey ? null : error.message
    );
  }

  if (!data || data.length === 0) {
    return failure(res, 404, "User tidak ditemukan");
  }

  return success(res, "User berhasil dihapus", null);
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
