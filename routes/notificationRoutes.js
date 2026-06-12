const express = require("express");
const router = express.Router();

const {
  sendNotification,
  updateFcmToken,
} = require("../controllers/notificationController");
const { optionalAuthenticate } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API notifikasi FCM untuk Flutter GoDah
 */

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Mengirim notifikasi FCM ke user, porter, atau admin
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target_user_id:
 *                 type: string
 *               target_porter_id:
 *                 type: string
 *               target_admin_id:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *                 example: order_status
 *               data:
 *                 type: object
 *           examples:
 *             orderBaru:
 *               value:
 *                 target_porter_id: porter-id
 *                 title: Order Baru Masuk!
 *                 body: Ada order baru. Segera terima!
 *                 type: order_new
 *                 data:
 *                   order_id: order-id
 *             verifikasi:
 *               value:
 *                 target_admin_id: admin-id
 *                 title: Pengajuan Verifikasi Porter Baru
 *                 body: Porter mengajukan verifikasi dokumen.
 *                 type: verification
 *     responses:
 *       200:
 *         description: Notifikasi berhasil dikirim
 *       501:
 *         description: Firebase Admin belum dikonfigurasi di Railway
 */
router.post("/send", optionalAuthenticate, sendNotification);

/**
 * @swagger
 * /notifications/token:
 *   post:
 *     summary: Menyimpan atau menghapus FCM token role
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - id
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, porter, admin]
 *               id:
 *                 type: string
 *               fcm_token:
 *                 type: string
 *                 nullable: true
 *           example:
 *             role: porter
 *             id: porter-id
 *             fcm_token: firebase-device-token
 *     responses:
 *       200:
 *         description: FCM token berhasil diupdate
 */
router.post("/token", optionalAuthenticate, updateFcmToken);
router.put("/token", optionalAuthenticate, updateFcmToken);

module.exports = router;
