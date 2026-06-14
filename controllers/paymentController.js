const { snap, coreApi } = require("../config/midtrans");
const supabase = require("../config/supabase");
const { firstDefined } = require("../utils/mobileContract");

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

function toOrderPaymentStatus(paymentStatus) {
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "failed") return "failed";
  if (paymentStatus === "expired") return "expired";
  if (paymentStatus === "cancelled") return "cancelled";
  return "pending";
}

async function syncOrderPaymentStatus(orderId, midtransOrderId, paymentStatus) {
  if (!orderId) return;

  const orderPaymentStatus = toOrderPaymentStatus(paymentStatus);
  const updateData = {
    payment_status: orderPaymentStatus,
    midtrans_order_id: midtransOrderId || null,
  };

  if (orderPaymentStatus === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    throw new Error(`Gagal update payment_status order: ${error.message}`);
  }
}

async function getMidtransStatusFromNotification(notification) {
  try {
    return await coreApi.transaction.notification(notification);
  } catch (error) {
    const midtransOrderId = firstDefined(
      notification.order_id,
      notification.midtrans_order_id,
      notification.midtransOrderId
    );

    if (!midtransOrderId) {
      throw error;
    }

    return coreApi.transaction.status(midtransOrderId);
  }
}

async function ensurePaymentAccessByOrderId(res, orderId, auth) {
  if (!auth || auth.role === "admin") return true;

  const { data: order, error } = await supabase
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    res.status(404).json({
      success: false,
      message: "Order tidak ditemukan",
      error: error ? error.message : null,
    });
    return false;
  }

  if (auth.role !== "user" || order.user_id !== auth.id) {
    res.status(403).json({
      success: false,
      message: "User hanya bisa mengakses payment order miliknya",
    });
    return false;
  }

  return true;
}

async function createPayment(req, res) {
  try {
    const body = req.body || {};
    const order_id = firstDefined(body.order_id, body.orderId);
    const amount = firstDefined(body.amount, body.total_biaya, body.totalBiaya);
    const user_name = firstDefined(body.user_name, body.userName, body.name);
    const user_email = firstDefined(body.user_email, body.userEmail, body.email);

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

    if (req.auth?.role === "user" && order.user_id !== req.auth.id) {
      return res.status(403).json({
        success: false,
        message: "User hanya bisa membuat payment untuk order miliknya",
      });
    }

    let finalAmount = Number(firstDefined(order.total_biaya, amount));

    if (Number.isNaN(finalAmount) || finalAmount <= 0) {
      finalAmount = Number(amount);
    }

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

    await syncOrderPaymentStatus(order_id, midtransOrderId, "pending");

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

    let statusResponse;

    try {
      statusResponse = await getMidtransStatusFromNotification(notification);
    } catch (midtransError) {
      console.warn("Midtrans notification ignored:", midtransError.message);

      return res.status(200).json({
        success: true,
        message: "Notification diterima, tapi transaksi belum ditemukan di Midtrans",
        ignored: true,
        error: midtransError.message,
      });
    }

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
      console.warn("Payment notification ignored:", paymentError.message);

      return res.status(200).json({
        success: true,
        message: "Notification diterima, tapi payment lokal belum ditemukan",
        ignored: true,
        midtrans_order_id: midtransOrderId,
        payment_status: paymentStatus,
        error: paymentError.message,
      });
    }

    await syncOrderPaymentStatus(payment.order_id, midtransOrderId, paymentStatus);

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

    if (!(await ensurePaymentAccessByOrderId(res, order_id, req.auth))) return;

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
    const body = req.body || {};
    const midtrans_order_id = firstDefined(body.midtrans_order_id, body.midtransOrderId);

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

    if (!(await ensurePaymentAccessByOrderId(res, localPayment.order_id, req.auth))) return;

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

      await syncOrderPaymentStatus(payment.order_id, midtrans_order_id, paymentStatus);

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
    const body = req.body || {};
    const midtrans_order_id = firstDefined(body.midtrans_order_id, body.midtransOrderId);
    const payment_type = firstDefined(body.payment_type, body.paymentType);

    if (!midtrans_order_id) {
      return res.status(400).json({
        success: false,
        message: "midtrans_order_id wajib diisi",
      });
    }

    const { data: existingPayment, error: existingError } = await supabase
      .from("payments")
      .select("order_id")
      .eq("midtrans_order_id", midtrans_order_id)
      .single();

    if (existingError || !existingPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment tidak ditemukan",
        error: existingError ? existingError.message : null,
      });
    }

    if (!(await ensurePaymentAccessByOrderId(res, existingPayment.order_id, req.auth))) return;

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

    await syncOrderPaymentStatus(payment.order_id, midtrans_order_id, "paid");

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
