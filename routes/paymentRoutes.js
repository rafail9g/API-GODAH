const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPaymentByOrderId,
  checkPaymentStatus,
} = require("../controllers/paymentController");
const { optionalAuthenticate } = require("../Middleware/middleware");

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
 *     summary: Membuat transaksi pembayaran Midtrans (User/Admin)
 *     tags: [Payments]
 *     description: Membuat Snap Token dan redirect URL Midtrans berdasarkan order_id. Amount otomatis diambil dari total_biaya order.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             order_id: 0bfc19b6-dfc7-44f9-8fce-c92df657bc2e
 *             amount: 15000
 *             user_name: Rafail
 *             user_email: rafail@mail.com
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
 *                 description: Optional dari Flutter; server tetap memprioritaskan total_biaya order.
 *                 example: 15000
 *               user_name:
 *                 type: string
 *                 description: Optional dari Flutter untuk customer_details Midtrans.
 *                 example: Rafail
 *               user_email:
 *                 type: string
 *                 description: Optional dari Flutter untuk customer_details Midtrans.
 *                 example: rafail@mail.com
 *     responses:
 *       201:
 *         description: Transaksi Midtrans berhasil dibuat
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transaksi Midtrans berhasil dibuat
 *               midtrans_order_id: GD-1780807575772-c88e597c
 *               snap_token: 0b8f4a52-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *               redirect_url: https://app.sandbox.midtrans.com/snap/v4/redirection/0b8f4a52-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *               data:
 *                 order_id: 0bfc19b6-dfc7-44f9-8fce-c92df657bc2e
 *                 amount: 15000
 *                 status: pending
 *       400:
 *         description: Request tidak valid
 *       404:
 *         description: Order tidak ditemukan
 *       500:
 *         description: Gagal membuat transaksi Midtrans
 */
router.post("/create", optionalAuthenticate, createPayment);

/**
 * @swagger
 * /payments/check-status:
 *   post:
 *     summary: Cek status pembayaran secara manual ke Midtrans (User/Admin)
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
router.post("/check-status", optionalAuthenticate, checkPaymentStatus);

/**
 * @swagger
 * /payments/order/{order_id}:
 *   get:
 *     summary: Mengambil data pembayaran berdasarkan order ID (User/Admin)
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
router.get("/order/:order_id", optionalAuthenticate, getPaymentByOrderId);

module.exports = router;
