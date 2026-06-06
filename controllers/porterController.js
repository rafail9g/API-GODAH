const supabase = require("../config/supabase");

const getPorters = async (req, res) => {
  const { data, error } = await supabase.from("porters").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const getPorterById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

const createPorter = async (req, res) => {
  const { data, error } = await supabase
    .from("porters")
    .insert([req.body])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

const updatePorter = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("porters")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const deletePorter = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("porters")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Porter berhasil dihapus" });
};

module.exports = {
  getPorters,
  getPorterById,
  createPorter,
  updatePorter,
  deletePorter
};