const supabase = require("../config/supabase");
const { failure, firstDefined, success, toNumber } = require("../utils/mobileContract");

async function saveProof({ orderId, porterId, jenisBukti, fotoUrl, keterangan, latitude, longitude }) {
  const proofPayload = {
    order_id: orderId,
    porter_id: porterId,
    jenis_bukti: jenisBukti,
    foto_url: fotoUrl,
    keterangan,
    latitude,
    longitude,
  };

  let result = await supabase
    .from("bukti_pengiriman")
    .upsert(
      proofPayload,
      { onConflict: "order_id, jenis_bukti" }
    )
    .select()
    .single();

  if (
    result.error?.message?.includes("Could not find the 'latitude' column") ||
    result.error?.message?.includes("Could not find the 'longitude' column") ||
    result.error?.message?.includes("column \"latitude\" of relation \"bukti_pengiriman\" does not exist") ||
    result.error?.message?.includes("column \"longitude\" of relation \"bukti_pengiriman\" does not exist")
  ) {
    const { latitude: _latitude, longitude: _longitude, ...payloadWithoutLocation } = proofPayload;
    result = await supabase
      .from("bukti_pengiriman")
      .upsert(payloadWithoutLocation, { onConflict: "order_id, jenis_bukti" })
      .select()
      .single();
  }

  return result;
}

async function resolveProofLocation(req, porterId) {
  const latitude = toNumber(firstDefined(
    req.body.latitude,
    req.body.lat,
    req.body.lat_saat_ini,
    req.body.currentLat
  ));
  const longitude = toNumber(firstDefined(
    req.body.longitude,
    req.body.lng,
    req.body.lon,
    req.body.lng_saat_ini,
    req.body.currentLng
  ));

  if (latitude !== undefined && longitude !== undefined) {
    return { latitude, longitude };
  }

  const { data: porter } = await supabase
    .from("porters")
    .select("latitude, longitude")
    .eq("id", porterId)
    .maybeSingle();

  return {
    latitude: latitude !== undefined ? latitude : porter?.latitude,
    longitude: longitude !== undefined ? longitude : porter?.longitude,
  };
}

async function updatePorterLocation(porterId, latitude, longitude) {
  if (latitude === undefined || longitude === undefined) return;
  await supabase
    .from("porters")
    .update({ latitude, longitude })
    .eq("id", porterId);
}

const uploadPickupProof = async (req, res) => {
  const { id } = req.params;
  const porterId = req.auth?.role === "porter"
    ? req.auth.id
    : firstDefined(req.body.porter_id, req.body.porterId);
  const fotoUrl = firstDefined(req.body.foto_url, req.body.fotoUrl, req.body.photoUrl);
  const keterangan = firstDefined(req.body.keterangan, req.body.notes, req.body.note);

  if (!porterId || !fotoUrl) {
    return failure(res, 400, "porter_id/porterId dan foto_url/fotoUrl wajib diisi");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("porter_id")
    .eq("id", id)
    .single();

  if (orderError || !order) return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  if (order.porter_id !== porterId) {
    return failure(res, 403, "Porter hanya bisa upload bukti untuk order miliknya");
  }

  const { latitude, longitude } = await resolveProofLocation(req, porterId);
  if (latitude === undefined || longitude === undefined) {
    return failure(res, 400, "latitude dan longitude wajib diisi atau lokasi terakhir porter harus tersedia");
  }

  const { data, error } = await saveProof({
    orderId: id,
    porterId,
    jenisBukti: "pickup",
    fotoUrl,
    keterangan,
    latitude,
    longitude
  });

  if (error) return failure(res, 400, "Gagal upload bukti pickup", error.message);

  await supabase
    .from("orders")
    .update({ status: "dalam_perjalanan" })
    .eq("id", id);

  await supabase.from("order_tracking").insert([
    {
      order_id: id,
      status_perjalanan: "dalam_perjalanan",
      latitude,
      longitude,
      catatan: "Bukti pickup berhasil diupload"
    }
  ]);

  await updatePorterLocation(porterId, latitude, longitude);

  return success(res, "Bukti pickup berhasil diupload", data, 201, {
    lokasi: { latitude, longitude }
  });
};

const uploadDeliveryProof = async (req, res) => {
  const { id } = req.params;
  const porterId = req.auth?.role === "porter"
    ? req.auth.id
    : firstDefined(req.body.porter_id, req.body.porterId);
  const fotoUrl = firstDefined(req.body.foto_url, req.body.fotoUrl, req.body.photoUrl);
  const keterangan = firstDefined(req.body.keterangan, req.body.notes, req.body.note);

  if (!porterId || !fotoUrl) {
    return failure(res, 400, "porter_id/porterId dan foto_url/fotoUrl wajib diisi");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("porter_id")
    .eq("id", id)
    .single();

  if (orderError || !order) return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  if (order.porter_id !== porterId) {
    return failure(res, 403, "Porter hanya bisa upload bukti untuk order miliknya");
  }

  const { latitude, longitude } = await resolveProofLocation(req, porterId);
  if (latitude === undefined || longitude === undefined) {
    return failure(res, 400, "latitude dan longitude wajib diisi atau lokasi terakhir porter harus tersedia");
  }

  const { data, error } = await saveProof({
    orderId: id,
    porterId,
    jenisBukti: "delivery",
    fotoUrl,
    keterangan,
    latitude,
    longitude
  });

  if (error) return failure(res, 400, "Gagal upload bukti delivery", error.message);

  await supabase
    .from("orders")
    .update({
      status: "selesai",
      waktu_selesai: new Date().toISOString()
    })
    .eq("id", id);

  await supabase.from("order_tracking").insert([
    {
      order_id: id,
      status_perjalanan: "selesai",
      latitude,
      longitude,
      catatan: "Bukti delivery berhasil diupload"
    }
  ]);

  await updatePorterLocation(porterId, latitude, longitude);

  return success(res, "Bukti delivery berhasil diupload", data, 201, {
    lokasi: { latitude, longitude }
  });
};

const getProofByOrderId = async (req, res) => {
  const { orderId } = req.params;
  let order = null;

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, porter_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  }

  order = orderData;

  if (req.auth?.role !== "admin") {
    if (
      (req.auth.role === "user" && order.user_id !== req.auth.id) ||
      (req.auth.role === "porter" && order.porter_id !== req.auth.id)
    ) {
      return failure(res, 403, "Tidak punya akses ke bukti order ini");
    }
  }

  const { data, error } = await supabase
    .from("bukti_pengiriman")
    .select("*")
    .eq("order_id", orderId);

  if (error) return failure(res, 400, "Gagal mengambil bukti pengiriman", error.message);

  return success(res, "Bukti pengiriman berhasil diambil", data || [], 200, {
    order,
    bukti: data || [],
  });
};

const getMyProofs = async (req, res) => {
  let ordersQuery = supabase.from("orders").select("id, user_id, porter_id, status");

  if (req.auth.role === "user") {
    ordersQuery = ordersQuery.eq("user_id", req.auth.id);
  } else if (req.auth.role === "porter") {
    ordersQuery = ordersQuery.eq("porter_id", req.auth.id);
  }

  const { data: orders, error: ordersError } = await ordersQuery;

  if (ordersError) {
    return failure(res, 400, "Gagal mengambil order untuk bukti", ordersError.message);
  }

  if (!orders || orders.length === 0) {
    return success(res, "Bukti pengiriman berhasil diambil", [], 200, {
      orders: [],
      bukti: [],
    });
  }

  const orderIds = orders.map((order) => order.id);
  const { data: proofs, error: proofsError } = await supabase
    .from("bukti_pengiriman")
    .select("*")
    .in("order_id", orderIds);

  if (proofsError) {
    return failure(res, 400, "Gagal mengambil bukti pengiriman", proofsError.message);
  }

  const proofsByOrder = (proofs || []).reduce((result, proof) => {
    result[proof.order_id] = result[proof.order_id] || [];
    result[proof.order_id].push(proof);
    return result;
  }, {});

  const data = orders.map((order) => ({
    order,
    bukti: proofsByOrder[order.id] || [],
  }));

  return success(res, "Bukti pengiriman berhasil diambil", data, 200, {
    orders,
    bukti: proofs || [],
  });
};

module.exports = {
  uploadPickupProof,
  uploadDeliveryProof,
  getProofByOrderId,
  getMyProofs
};
