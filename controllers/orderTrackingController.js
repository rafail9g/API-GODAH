const supabase = require("../config/supabase");
const { failure, success } = require("../utils/mobileContract");

async function canAccessOrder(orderId, auth) {
  if (!auth || auth.role === "admin") return true;

  const { data: order, error } = await supabase
    .from("orders")
    .select("user_id, porter_id")
    .eq("id", orderId)
    .single();

  if (error || !order) return false;
  if (auth.role === "user") return order.user_id === auth.id;
  if (auth.role === "porter") return order.porter_id === auth.id || !order.porter_id;
  return false;
}

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

  if (!(await canAccessOrder(orderId, req.auth))) {
    return res.status(403).json({
      success: false,
      message: "Tidak punya akses ke tracking order ini",
    });
  }

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .order("waktu_update", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

const getMyOrderTracking = async (req, res) => {
  const { orderId } = req.params;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, porter_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  }
  if (order.user_id !== req.auth.id) {
    return failure(res, 403, "User hanya bisa melihat tracking order miliknya");
  }

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .order("waktu_update", { ascending: true });

  if (error) return failure(res, 400, "Gagal mengambil tracking order", error.message);
  return success(res, "Tracking order berhasil diambil", data, 200, {
    order,
    tracking: data,
  });
};

const getMyOrderTrackings = async (req, res) => {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", req.auth.id);

  if (ordersError) {
    return failure(res, 400, "Gagal mengambil order user", ordersError.message);
  }

  if (!orders || orders.length === 0) {
    return success(res, "Tracking order user berhasil diambil", [], 200, {
      orders: [],
      tracking: [],
    });
  }

  const orderIds = orders.map((order) => order.id);
  const { data: tracking, error: trackingError } = await supabase
    .from("order_tracking")
    .select("*")
    .in("order_id", orderIds)
    .order("waktu_update", { ascending: true });

  if (trackingError) {
    return failure(res, 400, "Gagal mengambil tracking order user", trackingError.message);
  }

  const trackingByOrder = (tracking || []).reduce((result, item) => {
    result[item.order_id] = result[item.order_id] || [];
    result[item.order_id].push(item);
    return result;
  }, {});

  const data = orders.map((order) => ({
    order,
    tracking: trackingByOrder[order.id] || [],
  }));

  return success(res, "Tracking order user berhasil diambil", data, 200, {
    orders,
    tracking,
  });
};

const createOrderTracking = async (req, res) => {
  if (req.auth?.role === "porter" && !(await canAccessOrder(req.body.order_id, req.auth))) {
    return res.status(403).json({
      success: false,
      message: "Porter hanya bisa membuat tracking order miliknya",
    });
  }

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
  getMyOrderTracking,
  getMyOrderTrackings,
  createOrderTracking,
  updateOrderTracking,
  deleteOrderTracking
};
