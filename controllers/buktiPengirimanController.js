const supabase = require("../config/supabase");

const uploadPickupProof = async (req, res) => {
  const { id } = req.params;
  const { porter_id, foto_url, keterangan } = req.body;

  const { data, error } = await supabase
    .from("bukti_pengiriman")
    .insert([
      {
        order_id: id,
        porter_id,
        jenis_bukti: "pickup",
        foto_url,
        keterangan
      }
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });

  await supabase
    .from("orders")
    .update({ status: "dalam_perjalanan" })
    .eq("id", id);

  await supabase.from("order_tracking").insert([
    {
      order_id: id,
      status_perjalanan: "dalam_perjalanan",
      catatan: "Bukti pickup berhasil diupload"
    }
  ]);

  res.status(201).json({
    message: "Bukti pickup berhasil diupload",
    data
  });
};

const uploadDeliveryProof = async (req, res) => {
  const { id } = req.params;
  const { porter_id, foto_url, keterangan } = req.body;

  const { data, error } = await supabase
    .from("bukti_pengiriman")
    .insert([
      {
        order_id: id,
        porter_id,
        jenis_bukti: "delivery",
        foto_url,
        keterangan
      }
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });

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
      catatan: "Bukti delivery berhasil diupload"
    }
  ]);

  res.status(201).json({
    message: "Bukti delivery berhasil diupload",
    data
  });
};

const getProofByOrderId = async (req, res) => {
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from("bukti_pengiriman")
    .select("*")
    .eq("order_id", orderId);

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};

module.exports = {
  uploadPickupProof,
  uploadDeliveryProof,
  getProofByOrderId
};