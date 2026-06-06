const supabase = require("../config/supabase");

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
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
};