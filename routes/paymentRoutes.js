const express = require("express");
const router = express.Router();

const {
  createPayment,
  handleNotification,
  getPaymentByOrderId,
  getPaymentById,
  checkPaymentStatus,
  markPaymentPaidManual
} = require("../controllers/paymentController");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: API untuk pembayaran order menggunakan Midtrans
 */

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Membuat transaksi pembayaran Midtrans
 *     tags: [Payments]
 *     description: Membuat Snap Token dan redirect URL Midtrans berdasarkan order_id. Amount bisa dikirim manual atau diambil dari total_biaya order.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 example: 0bfc19b6-dfc7-44f9-8fce-c92df657bc2e
 *               amount:
 *                 type: integer
 *                 example: 15000
 *               user_name:
 *                 type: string
 *                 example: Rafail
 *               user_email:
 *                 type: string
 *                 example: test@gmail.com
 *     responses:
 *       201:
 *         description: Transaksi Midtrans berhasil dibuat
 *       400:
 *         description: Request tidak valid
 *       404:
 *         description: Order tidak ditemukan
 *       500:
 *         description: Gagal membuat transaksi Midtrans
 */
router.post("/create", createPayment);

/**
 * @swagger
 * /payments/notification:
 *   post:
 *     summary: Webhook notifikasi pembayaran dari Midtrans
 *     tags: [Payments]
 *     description: Endpoint ini dipanggil otomatis oleh Midtrans saat status pembayaran berubah.
 */
router.post("/notification", handleNotification);

/**
 * @swagger
 * /payments/check-status:
 *   post:
 *     summary: Cek status pembayaran secara manual ke Midtrans
 *     tags: [Payments]
 *     description: Digunakan untuk mengecek status transaksi jika webhook belum jalan atau ingin sinkronisasi manual.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - midtrans_order_id
 *             properties:
 *               midtrans_order_id:
 *                 type: string
 *                 example: GD-1780807575772-c88e597c
 *     responses:
 *       200:
 *         description: Status payment berhasil dicek atau data lokal dikembalikan
 *       400:
 *         description: midtrans_order_id wajib diisi
 *       404:
 *         description: Payment tidak ditemukan di database lokal
 *       500:
 *         description: Gagal cek status payment
 */
router.post("/check-status", checkPaymentStatus);

/**
 * @swagger
 * /payments/mark-paid-manual:
 *   post:
 *     summary: Mengubah status payment menjadi paid secara manual untuk development/demo
 *     tags: [Payments]
 *     description: Endpoint khusus development/demo untuk mengubah status pembayaran menjadi paid jika webhook atau check-status Midtrans belum stabil. Jangan digunakan untuk production.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - midtrans_order_id
 *             properties:
 *               midtrans_order_id:
 *                 type: string
 *                 example: GD-1780807575772-c88e597c
 *               payment_type:
 *                 type: string
 *                 example: bank_transfer
 *     responses:
 *       200:
 *         description: Payment berhasil diubah menjadi paid secara manual development
 *       400:
 *         description: midtrans_order_id wajib diisi
 *       404:
 *         description: Payment tidak ditemukan
 *       500:
 *         description: Gagal update payment manual
 */
router.post("/mark-paid-manual", markPaymentPaidManual);

/**
 * @swagger
 * /payments/order/{order_id}:
 *   get:
 *     summary: Mengambil data pembayaran berdasarkan order ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID order dari tabel orders
 *         example: 0bfc19b6-dfc7-44f9-8fce-c92df657bc2e
 *     responses:
 *       200:
 *         description: Payment ditemukan
 *       404:
 *         description: Payment untuk order ini tidak ditemukan
 *       500:
 *         description: Gagal mengambil payment berdasarkan order_id
 */
router.get("/order/:order_id", getPaymentByOrderId);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Mengambil data pembayaran berdasarkan ID payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID payment dari tabel payments
 *         example: 658da179-a8ad-484e-a78a-2ddca3bbda4d
 *     responses:
 *       200:
 *         description: Payment ditemukan
 *       404:
 *         description: Payment tidak ditemukan
 *       500:
 *         description: Terjadi kesalahan server
 */
router.get("/:id", getPaymentById);

module.exports = router;