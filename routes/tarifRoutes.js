const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { failure, success } = require("../utils/mobileContract");

router.get("/", async (req, res) => {
  let query = supabase.from("tarif").select("*");

  if (req.query.is_aktif !== undefined || req.query.isAktif !== undefined) {
    const raw = req.query.is_aktif ?? req.query.isAktif;
    query = query.eq("is_aktif", raw === true || raw === "true");
  }

  if (req.query.jenis_layanan || req.query.jenisLayanan) {
    query = query.eq("jenis_layanan", req.query.jenis_layanan || req.query.jenisLayanan);
  }

  const { data, error } = await query;
  if (error) return failure(res, 400, "Gagal mengambil tarif", error.message);

  return success(res, "Tarif berhasil diambil", data || [], 200, {
    tarif: data || [],
  });
});

module.exports = router;
