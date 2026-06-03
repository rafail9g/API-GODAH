const supabase = require("../config/supabase");

const getUsers = async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });

  res.json(data);
};

const createUser = async (req, res) => {
  const { nama, email, password_hash, no_hp, alamat } = req.body;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        nama,
        email,
        password_hash: password_hash || "manual_api",
        no_hp,
        alamat
      }
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(data);
};

const updateUser = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "User berhasil dihapus" });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};