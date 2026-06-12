const supabase = require("../config/supabase");
const { failure, firstDefined, success } = require("../utils/mobileContract");

function isMissingRatingsTable(error) {
  const message = error?.message || "";
  return (
    message.includes("Could not find the table") ||
    message.includes("relation \"ratings\" does not exist") ||
    message.includes("schema cache")
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

function ratingSummary(ratings = []) {
  if (!ratings.length) {
    return { average: 0, count: 0 };
  }

  const total = ratings.reduce((sum, rating) => sum + Number(rating.nilai || 0), 0);
  return {
    average: Number((total / ratings.length).toFixed(2)),
    count: ratings.length,
  };
}

async function selectRatings(query) {
  let { data, error } = await query
    .select("*, users(nama, no_hp), porters(nama, no_hp), orders(jenis_barang, lokasi_jemput, lokasi_tujuan, status)")
    .order("created_at", { ascending: false });

  if (error?.message?.includes("Could not find the 'created_at' column")) {
    const retry = await query.select("*");
    data = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("relationship")) {
    const retry = await query.select("*").order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

const getRatings = async (req, res) => {
  const identifiers = requestIdentifiers(req);
  const porterId = firstDefined(req.query.porter_id, req.query.porterId, identifiers.porterId);
  const userId = firstDefined(req.query.user_id, req.query.userId, identifiers.userId);
  const orderId = firstDefined(req.query.order_id, req.query.orderId);

  let query = supabase.from("ratings");
  if (porterId) query = query.eq("porter_id", porterId);
  if (userId) query = query.eq("user_id", userId);
  if (orderId) query = query.eq("order_id", orderId);

  const { data, error } = await selectRatings(query);

  if (isMissingRatingsTable(error)) {
    return failure(
      res,
      400,
      "Tabel ratings belum ada di Supabase. Jalankan bagian CREATE TABLE public.ratings dari database/godah_api_compat.sql.",
      error.message
    );
  }

  if (error) return failure(res, 400, "Gagal mengambil rating", error.message);
  return success(res, "Rating berhasil diambil", data || [], 200, {
    ratings: data || [],
    summary: ratingSummary(data || []),
  });
};

const ratePorter = async (req, res) => {
  const orderId = firstDefined(req.params.orderId, req.body.order_id, req.body.orderId);
  const identifiers = requestIdentifiers(req);
  const userId = identifiers.userId;
  const nilai = Number(firstDefined(req.body.nilai, req.body.rating, req.body.bintang, req.body.stars));
  const ulasan = firstDefined(req.body.ulasan, req.body.review, req.body.komentar, req.body.comment);

  if (!orderId) return failure(res, 400, "order_id/orderId wajib diisi");
  if (!userId) return failure(res, 400, "user_id/userId wajib diisi");
  if (!Number.isInteger(nilai) || nilai < 1 || nilai > 5) {
    return failure(res, 400, "nilai/rating wajib angka 1 sampai 5");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, porter_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  if (order.user_id !== userId) {
    return failure(res, 403, "User hanya bisa rating porter dari order miliknya");
  }
  if (!order.porter_id) {
    return failure(res, 400, "Order belum memiliki porter");
  }
  if (order.status !== "selesai") {
    return failure(res, 403, `Rating hanya bisa diberikan setelah order selesai. Status order sekarang: ${order.status}`);
  }

  let { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        order_id: order.id,
        user_id: userId,
        porter_id: order.porter_id,
        nilai,
        ulasan,
      },
      { onConflict: "order_id" }
    )
    .select()
    .single();

  if (
    error?.message?.includes("there is no unique or exclusion constraint") ||
    error?.message?.includes("ON CONFLICT")
  ) {
    const retry = await supabase
      .from("ratings")
      .insert([
        {
          order_id: order.id,
          user_id: userId,
          porter_id: order.porter_id,
          nilai,
          ulasan,
        },
      ])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (isMissingRatingsTable(error)) {
    return failure(
      res,
      400,
      "Tabel ratings belum ada di Supabase. Jalankan bagian CREATE TABLE public.ratings dari database/godah_api_compat.sql.",
      error.message
    );
  }

  if (error) return failure(res, 400, "Gagal menyimpan rating porter", error.message);
  return success(res, "Rating porter berhasil disimpan", data, 201, { rating: data });
};

const getRatingsByOrder = async (req, res) => {
  req.query.order_id = req.params.orderId;
  return getRatings(req, res);
};

const getRatingsByPorter = async (req, res) => {
  req.query.porter_id = req.params.porterId;
  return getRatings(req, res);
};

const getMyRatings = async (req, res) => {
  const identifiers = requestIdentifiers(req);
  if (!identifiers.userId && !identifiers.porterId) {
    return failure(res, 400, "user_id/userId atau porter_id/porterId wajib diisi");
  }

  return getRatings(req, res);
};

module.exports = {
  getRatings,
  ratePorter,
  getRatingsByOrder,
  getRatingsByPorter,
  getMyRatings,
};
