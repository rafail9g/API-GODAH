const supabase = require("../config/supabase");
const { failure, success } = require("../utils/mobileContract");

const getAdminContacts = async (_req, res) => {
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return failure(res, 400, "Gagal mengambil call center admin", error.message);

  const contacts = (data || []).map((admin) => ({
    id: admin.id,
    nama: admin.nama,
    email: admin.email,
    no_hp: admin.no_hp || admin.phone || null,
    role: admin.role,
  }));

  return success(res, "Call center admin berhasil diambil", contacts);
};

const getAdmins = async (req, res) => {
  const { data, error } = await supabase.from("admins").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const getAdminById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

const createAdmin = async (req, res) => {
  const { data, error } = await supabase
    .from("admins")
    .insert([req.body])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

const updateAdmin = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("admins")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const deleteAdmin = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("admins")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Admin berhasil dihapus" });
};

module.exports = {
  getAdminContacts,
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
};
