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

const ratePorter = async (req, res) => {
  const { orderId } = req.params;
  const nilai = Number(firstDefined(req.body.nilai, req.body.rating, req.body.bintang, req.body.stars));
  const ulasan = firstDefined(req.body.ulasan, req.body.review, req.body.komentar, req.body.comment);

  if (!Number.isInteger(nilai) || nilai < 1 || nilai > 5) {
    return failure(res, 400, "nilai/rating wajib angka 1 sampai 5");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, porter_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return failure(res, 404, "Order tidak ditemukan", orderError?.message);
  if (order.user_id !== req.auth.id) {
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
        user_id: req.auth.id,
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
          user_id: req.auth.id,
          porter_id: order.porter_id,
          nilai,
          ulasan,
        }
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

const getRatingsByPorter = async (req, res) => {
  const { porterId } = req.params;

  let { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("porter_id", porterId)
    .order("created_at", { ascending: false });

  if (error?.message?.includes("Could not find the 'created_at' column")) {
    const retry = await supabase
      .from("ratings")
      .select("*")
      .eq("porter_id", porterId);
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

  if (error) return failure(res, 400, "Gagal mengambil rating porter", error.message);
  return success(res, "Rating porter berhasil diambil", data);
};

const getMyRatings = async (req, res) => {
  let { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("user_id", req.auth.id)
    .order("created_at", { ascending: false });

  if (error?.message?.includes("Could not find the 'created_at' column")) {
    const retry = await supabase
      .from("ratings")
      .select("*")
      .eq("user_id", req.auth.id);
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

  if (error) return failure(res, 400, "Gagal mengambil rating user", error.message);
  return success(res, "Rating user berhasil diambil", data, 200, { ratings: data });
};

module.exports = {
  ratePorter,
  getRatingsByPorter,
  getMyRatings,
};
