const supabase = require("../config/supabase");
const { failure, firstDefined, success, toNumber } = require("../utils/mobileContract");

function stripUndefined(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function requestIdentifiers(req) {
  return {
    userId: req.auth?.role === "user"
      ? req.auth.id
      : firstDefined(req.body?.user_id, req.body?.userId, req.query?.user_id, req.query?.userId),
    porterId: req.auth?.role === "porter"
      ? req.auth.id
      : firstDefined(req.body?.porter_id, req.body?.porterId, req.query?.porter_id, req.query?.porterId),
  };
}

function mapTrackingPayload(body = {}) {
  return stripUndefined({
    order_id: firstDefined(body.order_id, body.orderId),
    status_perjalanan: firstDefined(
      body.status_perjalanan,
      body.statusPerjalanan,
      body.status,
      body.orderStatus
    ),
    latitude: toNumber(firstDefined(body.latitude, body.lat)),
    longitude: toNumber(firstDefined(body.longitude, body.lng, body.lon)),
    catatan: firstDefined(body.catatan, body.notes, body.note),
  });
}

async function findOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, user_id, porter_id, status")
    .eq("id", orderId)
    .single();

  return { order: data, error };
}

async function canAccessOrder(orderId, auth, identifiers = {}) {
  if (auth?.role === "admin") return true;
  if (!auth && !identifiers.userId && !identifiers.porterId) return true;

  const { order, error } = await findOrder(orderId);
  if (error || !order) return false;

  if (auth?.role === "user") return order.user_id === auth.id;
  if (auth?.role === "porter") return order.porter_id === auth.id || !order.porter_id;
  if (identifiers.userId) return order.user_id === identifiers.userId;
  if (identifiers.porterId) return order.porter_id === identifiers.porterId || !order.porter_id;
  return false;
}

const getOrderTrackings = async (req, res) => {
  const identifiers = requestIdentifiers(req);
  const orderId = firstDefined(req.query.order_id, req.query.orderId);
  const status = firstDefined(req.query.status_perjalanan, req.query.statusPerjalanan, req.query.status);
  let query = supabase.from("order_tracking").select("*");

  if (orderId) {
    if (!(await canAccessOrder(orderId, req.auth, identifiers))) {
      return failure(res, 403, "Tidak punya akses ke tracking order ini");
    }
    query = query.eq("order_id", orderId);
  } else if (identifiers.userId || identifiers.porterId) {
    let ordersQuery = supabase.from("orders").select("id");
    if (identifiers.userId) ordersQuery = ordersQuery.eq("user_id", identifiers.userId);
    if (identifiers.porterId) ordersQuery = ordersQuery.eq("porter_id", identifiers.porterId);

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) return failure(res, 400, "Gagal mengambil order", ordersError.message);

    const orderIds = (orders || []).map((order) => order.id);
    if (orderIds.length === 0) {
      return success(res, "Tracking order berhasil diambil", [], 200, { tracking: [] });
    }
    query = query.in("order_id", orderIds);
  }

  if (status) query = query.eq("status_perjalanan", status);
  query = query.order("waktu_update", { ascending: false });

  const { data, error } = await query;
  if (error) return failure(res, 400, "Gagal mengambil tracking order", error.message);
  return success(res, "Tracking order berhasil diambil", data, 200, { tracking: data });
};

const getOrderTrackingById = async (req, res) => {
  const { id } = req.params;
  const identifiers = requestIdentifiers(req);

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return failure(res, 404, "Tracking order tidak ditemukan", error?.message);
  if (!(await canAccessOrder(data.order_id, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses ke tracking order ini");
  }

  return success(res, "Tracking order berhasil diambil", data, 200, { tracking: data });
};

const getTrackingByOrderId = async (req, res) => {
  const { orderId } = req.params;
  const identifiers = requestIdentifiers(req);

  if (!(await canAccessOrder(orderId, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses ke tracking order ini");
  }

  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .order("waktu_update", { ascending: true });

  if (error) return failure(res, 400, "Gagal mengambil tracking order", error.message);
  return success(res, "Tracking order berhasil diambil", data, 200, { tracking: data });
};

const getMyOrderTracking = async (req, res) => {
  const { orderId } = req.params;
  const identifiers = requestIdentifiers(req);

  if (!(await canAccessOrder(orderId, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses ke tracking order ini");
  }

  const { order, error: orderError } = await findOrder(orderId);
  if (orderError || !order) {
    return failure(res, 404, "Order tidak ditemukan", orderError?.message);
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
  const identifiers = requestIdentifiers(req);
  let query = supabase.from("orders").select("*");

  if (identifiers.userId) {
    query = query.eq("user_id", identifiers.userId);
  } else if (identifiers.porterId) {
    query = query.eq("porter_id", identifiers.porterId);
  } else {
    return failure(res, 400, "user_id/userId atau porter_id/porterId wajib diisi");
  }

  const { data: orders, error: ordersError } = await query.order("waktu_pesan", { ascending: false });
  if (ordersError) return failure(res, 400, "Gagal mengambil order", ordersError.message);

  if (!orders || orders.length === 0) {
    return success(res, "Tracking order berhasil diambil", [], 200, {
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
    return failure(res, 400, "Gagal mengambil tracking order", trackingError.message);
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

  return success(res, "Tracking order berhasil diambil", data, 200, {
    orders,
    tracking: tracking || [],
  });
};

const createOrderTracking = async (req, res) => {
  const payload = mapTrackingPayload(req.body);
  const identifiers = requestIdentifiers(req);

  if (!payload.order_id || !payload.status_perjalanan) {
    return failure(res, 400, "order_id/orderId dan status_perjalanan/status wajib diisi");
  }
  if (!(await canAccessOrder(payload.order_id, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses membuat tracking order ini");
  }

  const { data, error } = await supabase
    .from("order_tracking")
    .insert([payload])
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal membuat tracking order", error.message);
  return success(res, "Tracking order berhasil dibuat", data, 201, { tracking: data });
};

const updateOrderTracking = async (req, res) => {
  const { id } = req.params;
  const identifiers = requestIdentifiers(req);
  const payload = mapTrackingPayload(req.body);
  delete payload.order_id;

  const { data: existing, error: existingError } = await supabase
    .from("order_tracking")
    .select("order_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return failure(res, 404, "Tracking order tidak ditemukan", existingError?.message);
  }
  if (!(await canAccessOrder(existing.order_id, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses mengubah tracking order ini");
  }
  if (Object.keys(payload).length === 0) {
    return failure(res, 400, "Tidak ada data tracking yang diubah");
  }

  const { data, error } = await supabase
    .from("order_tracking")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal update tracking order", error.message);
  return success(res, "Tracking order berhasil diupdate", data, 200, { tracking: data });
};

const deleteOrderTracking = async (req, res) => {
  const { id } = req.params;
  const identifiers = requestIdentifiers(req);

  const { data: existing, error: existingError } = await supabase
    .from("order_tracking")
    .select("order_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return failure(res, 404, "Tracking order tidak ditemukan", existingError?.message);
  }
  if (!(await canAccessOrder(existing.order_id, req.auth, identifiers))) {
    return failure(res, 403, "Tidak punya akses menghapus tracking order ini");
  }

  const { error } = await supabase
    .from("order_tracking")
    .delete()
    .eq("id", id);

  if (error) return failure(res, 400, "Gagal menghapus tracking order", error.message);
  return success(res, "Tracking order berhasil dihapus", null);
};

module.exports = {
  getOrderTrackings,
  getOrderTrackingById,
  getTrackingByOrderId,
  getMyOrderTracking,
  getMyOrderTrackings,
  createOrderTracking,
  updateOrderTracking,
  deleteOrderTracking,
};
