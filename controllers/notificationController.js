const supabase = require("../config/supabase");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const { failure, firstDefined, success } = require("../utils/mobileContract");

const TARGETS = [
  { key: "target_user_id", alias: "targetUserId", table: "users", role: "user" },
  { key: "target_porter_id", alias: "targetPorterId", table: "porters", role: "porter" },
  { key: "target_admin_id", alias: "targetAdminId", table: "admins", role: "admin" },
];

function getTarget(body = {}) {
  for (const target of TARGETS) {
    const id = firstDefined(body[target.key], body[target.alias]);
    if (id) return { ...target, id };
  }
  return null;
}

async function getTargetToken(target) {
  const { data, error } = await supabase
    .from(target.table)
    .select("id, nama, fcm_token")
    .eq("id", target.id)
    .single();

  return { data, error };
}

const sendNotification = async (req, res) => {
  const target = getTarget(req.body);
  const title = firstDefined(req.body.title, req.body.judul);
  const body = firstDefined(req.body.body, req.body.message, req.body.pesan);
  const type = firstDefined(req.body.type, req.body.jenis);
  const extraData = req.body.data || {};

  if (!target) {
    return failure(res, 400, "target_user_id, target_porter_id, atau target_admin_id wajib diisi");
  }
  if (!title || !body) {
    return failure(res, 400, "title dan body/message wajib diisi");
  }

  const { data: recipient, error: recipientError } = await getTargetToken(target);
  if (recipientError || !recipient) {
    return failure(res, 404, "Target notifikasi tidak ditemukan", recipientError?.message);
  }
  if (!recipient.fcm_token) {
    return failure(res, 404, "Target belum punya fcm_token");
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return failure(
      res,
      501,
      "Firebase Admin belum dikonfigurasi di Railway. Isi FIREBASE_SERVICE_ACCOUNT_BASE64 atau FIREBASE_SERVICE_ACCOUNT_JSON."
    );
  }

  const message = {
    token: recipient.fcm_token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries({
        type,
        target_role: target.role,
        target_id: target.id,
        ...extraData,
      })
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ),
    android: {
      priority: "high",
      notification: {
        channelId: type === "verification" ? "godah_verifikasi" : "godah_orders",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  };

  try {
    const messageId = await firebaseAdmin.messaging().send(message);
    return success(res, "Notifikasi berhasil dikirim", { message_id: messageId }, 200, {
      message_id: messageId,
    });
  } catch (error) {
    const invalidToken =
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token";

    if (invalidToken) {
      await supabase.from(target.table).update({ fcm_token: null }).eq("id", target.id);
    }

    return failure(res, 400, "Gagal mengirim notifikasi FCM", error.message);
  }
};

const updateFcmToken = async (req, res) => {
  const role = firstDefined(req.body.role, req.query.role);
  const id = firstDefined(req.body.id, req.body.user_id, req.body.porter_id, req.body.admin_id, req.query.id);
  const token = firstDefined(req.body.fcm_token, req.body.fcmToken, req.body.token);

  const table = role === "admin" ? "admins" : role === "porter" ? "porters" : role === "user" ? "users" : null;
  if (!table || !id) return failure(res, 400, "role dan id wajib diisi");

  const payload = {
    fcm_token: token || null,
    fcm_token_updated_at: token ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select("id, fcm_token, fcm_token_updated_at")
    .single();

  if (error) return failure(res, 400, "Gagal update FCM token", error.message);
  return success(res, "FCM token berhasil diupdate", data);
};

module.exports = {
  sendNotification,
  updateFcmToken,
};
