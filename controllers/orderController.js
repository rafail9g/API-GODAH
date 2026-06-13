const supabase = require("../config/supabase");
const {
  ORDER_STATUSES,
  failure,
  firstDefined,
  isAllowed,
  mapOrderPayload,
  success,
  toNumber,
} = require("../utils/mobileContract");

const getOrders = async (req, res) => {
  const includeRelations = req.query.include_relations !== "false";
  const select = includeRelations
    ? "*, porters(id, nama, no_hp, latitude, longitude), order_tracking(status_perjalanan, waktu_update, catatan), bukti_pengiriman(foto_url, keterangan, jenis_bukti), ratings(id, order_id, nilai, ulasan)"
    : "*";

  let query = supabase.from("orders").select(select);

  if (req.query.unassigned === "true") {
    query = query.is("porter_id", null);
  }
  if (req.query.user_id || req.query.userId) {
    query = query.eq("user_id", req.query.user_id || req.query.userId);
  }
  if (req.query.porter_id || req.query.porterId) {
    query = query.eq("porter_id", req.query.porter_id || req.query.porterId);
  }
  if (req.query.status) {
    query = query.eq("status", req.query.status);
  }
  if (req.query.status_in || req.query.statusIn) {
    const statuses = String(req.query.status_in || req.query.statusIn)
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);
    if (statuses.length > 0) query = query.in("status", statuses);
  }

  query = query.order("waktu_pesan", { ascending: false });

  const { data, error } = await query;
  if (error) return failure(res, 400, "Gagal mengambil orders", error.message);
  return success(res, "Orders berhasil diambil", data, 200, { orders: data });
};

const getAvailableOrders = async (_req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, users(nama, no_hp)")
    .eq("status", "menunggu")
    .is("porter_id", null)
    .order("waktu_pesan", { ascending: false });

  if (error) return failure(res, 400, "Gagal mengambil order tersedia", error.message);
  return success(res, "Order tersedia berhasil diambil", data, 200, { orders: data });
};

const getActiveTarif = async (_req, res) => {
  const { data, error } = await supabase
    .from("tarif")
    .select("*")
    .eq("is_aktif", true);

  if (error) return failure(res, 400, "Gagal mengambil tarif aktif", error.message);
  return success(res, "Tarif aktif berhasil diambil", data || [], 200, { tarif: data || [] });
};

const getPorterOrders = async (req, res) => {
  const porterId = req.auth?.id || req.query.porter_id || req.query.porterId;
  if (!porterId) return failure(res, 400, "porter_id/porterId wajib diisi");

  const { data, error } = await supabase
    .from("orders")
    .select("*, users(nama, no_hp)")
    .eq("porter_id", porterId)
    .order("waktu_pesan", { ascending: false });

  if (error) return failure(res, 400, "Gagal mengambil order porter", error.message);
  return success(res, "Order porter berhasil diambil", data, 200, { orders: data });
};

const getOrderById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return failure(res, 404, "Order tidak ditemukan", error.message);

  if (
    req.auth?.role === "user" &&
    data.user_id !== req.auth.id
  ) {
    return failure(res, 403, "User hanya bisa melihat order miliknya");
  }

  if (
    req.auth?.role === "porter" &&
    data.porter_id !== req.auth.id &&
    data.status !== "menunggu"
  ) {
    return failure(res, 403, "Porter hanya bisa melihat order tersedia atau order miliknya");
  }

  return success(res, "Order berhasil diambil", data, 200, { order: data });
};

const createOrder = async (req, res) => {
  if (req.auth?.role !== "user") {
    return failure(res, 403, "Order hanya bisa dibuat oleh user login");
  }

  const payload = mapOrderPayload(req.body);
  payload.status = payload.status || "menunggu";
  payload.lokasi_jemput =
    payload.lokasi_jemput || `Lat: ${payload.lat_jemput}, Lng: ${payload.lng_jemput}`;
  payload.lokasi_tujuan =
    payload.lokasi_tujuan || `Lat: ${payload.lat_tujuan}, Lng: ${payload.lng_tujuan}`;

  payload.user_id = req.auth.id;
  delete payload.porter_id;
  payload.status = "menunggu";

  if (
    !payload.user_id ||
    payload.lat_jemput === undefined ||
    payload.lng_jemput === undefined ||
    payload.lat_tujuan === undefined ||
    payload.lng_tujuan === undefined
  ) {
    return failure(
      res,
      400,
      "user_id/userId dan koordinat jemput/tujuan wajib diisi"
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .insert([payload])
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal membuat order", error.message);

  await supabase.from("order_tracking").insert([
    {
      order_id: data.id,
      status_perjalanan: data.status || "menunggu",
      latitude: data.lat_jemput,
      longitude: data.lng_jemput,
      catatan: "Pesanan dibuat"
    }
  ]);

  return success(res, "Order berhasil dibuat", data, 201, { order: data });
};

const updateOrder = async (req, res) => {
  const { id } = req.params;

  const payload = mapOrderPayload(req.body);

  if (req.auth?.role === "admin") {
    const allowedAdminFields = [
      "lokasi_jemput",
      "lokasi_tujuan",
      "lat_jemput",
      "lng_jemput",
      "lat_tujuan",
      "lng_tujuan",
      "jenis_layanan",
      "tarif_id",
      "status",
      "total_biaya",
      "catatan",
    ];
    const adminPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => allowedAdminFields.includes(key))
    );

    if (Object.keys(adminPayload).length === 0) {
      return failure(
        res,
        400,
        "Admin hanya bisa update lokasi, koordinat, status, catatan, jenis layanan, tarif, dan total biaya order"
      );
    }

    if (adminPayload.status && !isAllowed(adminPayload.status, ORDER_STATUSES)) {
      return failure(res, 400, `Status order harus salah satu dari: ${ORDER_STATUSES.join(", ")}`);
    }

    if (adminPayload.status === "selesai") {
      adminPayload.waktu_selesai = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("orders")
      .update(adminPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return failure(res, 400, "Gagal update order", error.message);

    if (adminPayload.status) {
      const latitude = toNumber(firstDefined(req.body.latitude, req.body.lat, req.body.lat_tujuan));
      const longitude = toNumber(firstDefined(req.body.longitude, req.body.lng, req.body.lon, req.body.lng_tujuan));

      await supabase.from("order_tracking").insert([
        {
          order_id: id,
          status_perjalanan: adminPayload.status,
          latitude,
          longitude,
          catatan: adminPayload.catatan || "Status order diubah admin",
        }
      ]);
    }

    return success(res, "Order berhasil diupdate", data, 200, { order: data });
  }

  if (req.auth?.role === "user") {
    delete payload.user_id;
    delete payload.porter_id;
    delete payload.status;
    delete payload.total_biaya;

    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return failure(res, 404, "Order tidak ditemukan", existingError?.message);
    }
    if (existing.user_id !== req.auth.id) {
      return failure(res, 403, "User hanya bisa update order miliknya");
    }
    if (existing.status !== "menunggu") {
      return failure(res, 403, "Order hanya bisa diubah saat masih menunggu");
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(res, 400, "Gagal update order", error.message);
  return success(res, "Order berhasil diupdate", data, 200, { order: data });
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const status = firstDefined(req.body.status, req.body.orderStatus);
  const latitude = toNumber(firstDefined(req.body.latitude, req.body.lat));
  const longitude = toNumber(firstDefined(req.body.longitude, req.body.lng, req.body.lon));
  const catatan = firstDefined(req.body.catatan, req.body.notes, req.body.note);
  const porterId = req.auth?.role === "porter"
    ? req.auth.id
    : firstDefined(req.body.porter_id, req.body.porterId, req.query.porter_id, req.query.porterId);
  let shouldAssignPorter = false;

  if (!status) {
    return failure(res, 400, "status/orderStatus wajib diisi");
  }
  if (!isAllowed(status, ORDER_STATUSES)) {
    return failure(res, 400, `Status order harus salah satu dari: ${ORDER_STATUSES.join(", ")}`);
  }

  if (req.auth?.role === "porter" || porterId) {
    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("porter_id, status")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return failure(res, 404, "Order tidak ditemukan", existingError?.message);
    }
    if (["selesai", "batal"].includes(existing.status)) {
      return failure(res, 403, `Order sudah ${existing.status}, status tidak bisa dilanjutkan oleh porter`);
    }

    if (status === "diterima") {
      if (existing.porter_id && existing.porter_id !== porterId) {
        return failure(res, 403, "Order sudah diambil porter lain");
      }
      if (!existing.porter_id && existing.status !== "menunggu") {
        return failure(res, 403, "Order hanya bisa diterima saat masih menunggu");
      }
      shouldAssignPorter = !existing.porter_id;
    } else if (existing.porter_id && porterId && existing.porter_id !== porterId) {
      return failure(res, 403, "Porter hanya bisa update order miliknya");
    }
  }

  const updateData = { status };

  if (shouldAssignPorter) {
    if (!porterId) return failure(res, 400, "porter_id/porterId wajib diisi untuk menerima order");
    updateData.porter_id = porterId;
  }

  if (status === "selesai") {
    updateData.waktu_selesai = new Date().toISOString();
  }

  let updateQuery = supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (shouldAssignPorter) {
    updateQuery = updateQuery.eq("status", "menunggu").is("porter_id", null);
  }

  const { data, error } = await updateQuery.select().single();

  if (error) {
    return failure(
      res,
      400,
      shouldAssignPorter ? "Order sudah diambil porter lain atau tidak lagi menunggu" : "Gagal update status order",
      error.message
    );
  }

  await supabase.from("order_tracking").insert([
    {
      order_id: id,
      status_perjalanan: status,
      latitude,
      longitude,
      catatan
    }
  ]);

  return success(res, "Status order berhasil diupdate", data, 200, { order: data });
};

const getOrderPorterContact = async (req, res) => {
  const { id } = req.params;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, porter_id")
    .eq("id", id)
    .single();

  if (orderError || !order) return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  if (req.auth?.role === "user" && order.user_id !== req.auth.id) {
    return failure(res, 403, "User hanya bisa menghubungi porter dari order miliknya");
  }
  if (!order.porter_id) {
    return failure(res, 404, "Order belum memiliki porter");
  }

  const { data: porter, error: porterError } = await supabase
    .from("porters")
    .select("id, nama, email, no_hp, status_verifikasi, is_aktif")
    .eq("id", order.porter_id)
    .single();

  if (porterError || !porter) return failure(res, 404, "Porter tidak ditemukan", porterError?.message);
  return success(res, "Kontak porter berhasil diambil", porter, 200, { porter });
};

const cancelOrder = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth?.role === "user"
    ? req.auth.id
    : firstDefined(req.body.user_id, req.body.userId, req.query.user_id, req.query.userId);

  if (req.auth?.role === "user" || userId) {
    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return failure(res, 404, "Order tidak ditemukan", existingError?.message);
    }
    if (existing.user_id !== userId) {
      return failure(res, 403, "User hanya bisa membatalkan order miliknya");
    }
    if (!["menunggu", "diterima"].includes(existing.status)) {
      return failure(res, 403, "Order tidak bisa dibatalkan pada status saat ini");
    }
  }

  req.body.status = "batal";
  req.body.catatan = req.body.catatan || "Order dibatalkan";
  return updateOrderStatus(req, res);
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id");

  if (error) {
    const isForeignKey = error.message?.includes("violates foreign key constraint");
    return failure(
      res,
      isForeignKey ? 409 : 400,
      isForeignKey
        ? "Order masih punya data terkait, jadi tidak bisa dihapus sebelum data terkait dihapus."
        : "Gagal menghapus order",
      isForeignKey ? null : error.message
    );
  }

  if (!data || data.length === 0) {
    return failure(res, 404, "Order tidak ditemukan");
  }

  return success(res, "Order berhasil dihapus", null);
};

module.exports = {
  getActiveTarif,
  getOrders,
  getAvailableOrders,
  getPorterOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderPorterContact,
  cancelOrder,
  deleteOrder
};
