const supabase = require("../config/supabase");

const getOrders = async (req, res) => {
  const { data, error } = await supabase.from("orders").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const getOrderById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

const createOrder = async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([req.body])
    .select();

  if (error) return res.status(400).json({ error: error.message });

  await supabase.from("order_tracking").insert([
    {
      order_id: data[0].id,
      status_perjalanan: data[0].status || "menunggu",
      latitude: data[0].lat_jemput,
      longitude: data[0].lng_jemput,
      catatan: "Pesanan dibuat"
    }
  ]);

  res.status(201).json(data);
};

const updateOrder = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("orders")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, latitude, longitude, catatan } = req.body;

  const updateData = { status };

  if (status === "selesai") {
    updateData.waktu_selesai = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });

  await supabase.from("order_tracking").insert([
    {
      order_id: id,
      status_perjalanan: status,
      latitude,
      longitude,
      catatan
    }
  ]);

  res.json({
    message: "Status order berhasil diupdate",
    data
  });
};

const acceptOrder = async (req, res) => {
  req.body.status = "diterima";
  req.body.catatan = req.body.catatan || "Order diterima porter";
  return updateOrderStatus(req, res);
};

const goToPickup = async (req, res) => {
  req.body.status = "menuju_lokasi";
  req.body.catatan = req.body.catatan || "Porter menuju lokasi jemput";
  return updateOrderStatus(req, res);
};

const startDelivery = async (req, res) => {
  req.body.status = "dalam_perjalanan";
  req.body.catatan = req.body.catatan || "Barang dalam perjalanan";
  return updateOrderStatus(req, res);
};

const arrivedOrder = async (req, res) => {
  req.body.status = "sampai_tujuan";
  req.body.catatan = req.body.catatan || "Porter sampai tujuan";
  return updateOrderStatus(req, res);
};

const cancelOrder = async (req, res) => {
  req.body.status = "batal";
  req.body.catatan = req.body.catatan || "Order dibatalkan";
  return updateOrderStatus(req, res);
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Order berhasil dihapus" });
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  acceptOrder,
  goToPickup,
  startDelivery,
  arrivedOrder,
  cancelOrder,
  deleteOrder
};