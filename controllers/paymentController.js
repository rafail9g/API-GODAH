const { snap, coreApi } = require("../config/midtrans");
const supabase = require("../config/supabase");

function mapMidtransStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === "capture") {
    if (fraudStatus === "accept") return "paid";
    return "challenge";
  }

  if (transactionStatus === "settlement") return "paid";
  if (transactionStatus === "pending") return "pending";
  if (transactionStatus === "deny") return "failed";
  if (transactionStatus === "cancel") return "cancelled";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "refund") return "refunded";
  if (transactionStatus === "partial_refund") return "partial_refund";

  return "pending";
}

function generateMidtransOrderId(orderId) {
  const shortOrderId = String(orderId).replace(/-/g, "").slice(0, 8);
  return `GD-${Date.now()}-${shortOrderId}`;
}

async function createPayment(req, res) {
  try {
    const { order_id, user_name, user_email, amount } = req.body || {};

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id wajib diisi",
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_biaya")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
        error: orderError ? orderError.message : null,
      });
    }

    let finalAmount = amount ? Number(amount) : Number(order.total_biaya);

    if (Number.isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount tidak valid atau total_biaya order masih 0",
      });
    }

    finalAmount = Math.round(finalAmount);

    let finalUserName = user_name || "User GoDah";
    let finalUserEmail = user_email || "user@godah.com";

    if (order.user_id) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("nama, email")
        .eq("id", order.user_id)
        .single();

      if (!userError && user) {
        finalUserName = user_name || user.nama || finalUserName;
        finalUserEmail = user_email || user.email || finalUserEmail;
      }
    }

    const midtransOrderId = generateMidtransOrderId(order_id);

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: finalAmount,
      },
      customer_details: {
        first_name: finalUserName,
        email: finalUserEmail,
      },
      item_details: [
        {
          id: String(order_id).replace(/-/g, "").slice(0, 20),
          price: finalAmount,
          quantity: 1,
          name: "Pembayaran Order GoDah",
        },
      ],
    };

    const transaction = await snap.createTransaction(parameter);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id,
        amount: finalAmount,
        status: "pending",
        midtrans_order_id: midtransOrderId,
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
      })
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({
        success: false,
        message: "Transaksi Midtrans dibuat, tapi gagal simpan ke tabel payments",
        error: paymentError.message,
        midtrans_order_id: midtransOrderId,
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Transaksi Midtrans berhasil dibuat",
      data: payment,
      midtrans_order_id: midtransOrderId,
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal membuat transaksi Midtrans",
      error: error.message,
    });
  }
}

async function handleNotification(req, res) {
  try {
    const notification = req.body || {};

    if (!notification || Object.keys(notification).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Body notification kosong",
      });
    }

    const statusResponse = await coreApi.transaction.notification(notification);

    const midtransOrderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const paymentType = statusResponse.payment_type;

    const paymentStatus = mapMidtransStatus(transactionStatus, fraudStatus);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        payment_type: paymentType || null,
        transaction_status: transactionStatus || null,
        fraud_status: fraudStatus || null,
        updated_at: new Date().toISOString(),
      })
      .eq("midtrans_order_id", midtransOrderId)
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({
        success: false,
        message: "Gagal update payment dari notification Midtrans",
        error: paymentError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification processed",
      payment_status: paymentStatus,
      data: payment,
    });
  } catch (error) {
    console.error("Notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memproses notification Midtrans",
      error: error.message,
    });
  }
}

async function getPaymentByOrderId(req, res) {
  try {
    const { order_id } = req.params;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil payment berdasarkan order_id",
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment untuk order ini tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment ditemukan",
      data: data[0],
    });
  } catch (error) {
    console.error("Get payment by order error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
}

async function getPaymentById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Payment tidak ditemukan",
        error: error ? error.message : null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment ditemukan",
      data,
    });
  } catch (error) {
    console.error("Get payment by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
}

async function checkPaymentStatus(req, res) {
  try {
    const { midtrans_order_id } = req.body || {};

    if (!midtrans_order_id) {
      return res.status(400).json({
        success: false,
        message: "midtrans_order_id wajib diisi",
      });
    }

    const { data: localPayment, error: localError } = await supabase
      .from("payments")
      .select("*")
      .eq("midtrans_order_id", midtrans_order_id)
      .single();

    if (localError || !localPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment tidak ditemukan di database lokal",
        error: localError ? localError.message : null,
      });
    }

    try {
      const statusResponse = await coreApi.transaction.status(midtrans_order_id);

      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const paymentType = statusResponse.payment_type;

      const paymentStatus = mapMidtransStatus(transactionStatus, fraudStatus);

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .update({
          status: paymentStatus,
          payment_type: paymentType || null,
          transaction_status: transactionStatus || null,
          fraud_status: fraudStatus || null,
          updated_at: new Date().toISOString(),
        })
        .eq("midtrans_order_id", midtrans_order_id)
        .select()
        .single();

      if (paymentError) {
        return res.status(500).json({
          success: false,
          message: "Gagal update status payment",
          error: paymentError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Status payment berhasil disinkronkan",
        payment_status: paymentStatus,
        midtrans_order_id,
        midtrans_status: statusResponse,
        data: payment,
      });
    } catch (midtransError) {
      const msg = midtransError.message || "";

      if (msg.includes("Transaction doesn't exist")) {
        return res.status(200).json({
          success: true,
          message: "Transaksi belum ditemukan di Midtrans, data lokal dikembalikan",
          payment_status: localPayment.status,
          data: localPayment,
          midtrans_error: "Transaction doesn't exist",
        });
      }

      throw midtransError;
    }
  } catch (error) {
    console.error("Check payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal cek status payment",
      error: error.message,
    });
  }
}

async function markPaymentPaidManual(req, res) {
  try {
    const { midtrans_order_id, payment_type } = req.body || {};

    if (!midtrans_order_id) {
      return res.status(400).json({
        success: false,
        message: "midtrans_order_id wajib diisi",
      });
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        payment_type: payment_type || "bank_transfer",
        transaction_status: "settlement",
        fraud_status: "accept",
        updated_at: new Date().toISOString(),
      })
      .eq("midtrans_order_id", midtrans_order_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal update payment manual",
        error: error.message,
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment berhasil diubah menjadi paid secara manual development",
      data: payment,
    });
  } catch (error) {
    console.error("Mark payment paid manual error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
}

module.exports = {
  createPayment,
  handleNotification,
  getPaymentByOrderId,
  getPaymentById,
  checkPaymentStatus,
  markPaymentPaidManual,
};