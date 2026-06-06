const supabase = require("../config/supabase");

const getOrderTrackings = async (req, res) => {
  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .order("waktu_update", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const getOrderTrackingById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

const getTrackingByOrderId = async (req, res) => {
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .order("waktu_update", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const createOrderTracking = async (req, res) => {
  const { data, error } = await supabase
    .from("order_tracking")
    .insert([req.body])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

const updateOrderTracking = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("order_tracking")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const deleteOrderTracking = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("order_tracking")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Order tracking berhasil dihapus" });
};

module.exports = {
  getOrderTrackings,
  getOrderTrackingById,
  getTrackingByOrderId,
  createOrderTracking,
  updateOrderTracking,
  deleteOrderTracking
};