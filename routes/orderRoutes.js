const express = require("express");
const router = express.Router();

const {
  getOrders,
  getActiveTarif,
  getAvailableOrders,
  getPorterOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderPorterContact,
  cancelOrder,
  deleteOrder
} = require("../controllers/orderController");
const { authenticate, optionalAuthenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: API proses pesanan GoDah
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Mengambil semua order (Admin)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua order
 */
router.get("/my", optionalAuthenticate, (req, res) => {
  req.query.user_id = req.auth?.id || req.query.user_id || req.query.userId;
  return getOrders(req, res);
});

/**
 * @swagger
 * /orders/available:
 *   get:
 *     summary: Mengambil order tersedia untuk diterima (Porter)
 *     tags: [Orders]
 *     description: Mengambil order dengan status menunggu dan belum punya porter.
 *     responses:
 *       200:
 *         description: Order tersedia berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Order tersedia berhasil diambil
 *               data: []
 */
router.get("/available", optionalAuthenticate, getAvailableOrders);

router.get("/tarif/active", optionalAuthenticate, getActiveTarif);

/**
 * @swagger
 * /orders/porter/my:
 *   get:
 *     summary: Mengambil order milik porter login (Porter)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order porter berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Order porter berhasil diambil
 *               data: []
 */
router.get("/porter/my", optionalAuthenticate, getPorterOrders);

router.get("/", authenticate, requireRole("admin"), getOrders);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Membuat order baru (User)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             lat_jemput: -8.163265
 *             lng_jemput: 113.721643
 *             lat_tujuan: -8.1700011
 *             lng_tujuan: 113.715001
 *             jenis_barang: Kardus
 *             estimasi_berat: 5
 *             jenis_layanan: instant
 *             status: menunggu
 *             total_biaya: 15000
 *             catatan: Barang jangan dibanting
 *           schema:
 *             type: object
 *             properties:
 *               lat_jemput:
 *                 type: number
 *                 example: -8.163265
 *               lng_jemput:
 *                 type: number
 *                 example: 113.721647
 *               lat_tujuan:
 *                 type: number
 *                 example: -8.170001
 *               lng_tujuan:
 *                 type: number
 *                 example: 113.715001
 *               jenis_barang:
 *                 type: string
 *                 example: Kardus
 *               estimasi_berat:
 *                 type: number
 *                 example: 5
 *               jenis_layanan:
 *                 type: string
 *                 enum: [instant, terjadwal, semua]
 *                 example: instant
 *               status:
 *                 type: string
 *                 enum: [menunggu, diterima, menuju_lokasi, dalam_perjalanan, sampai_tujuan, selesai, batal]
 *                 example: menunggu
 *               total_biaya:
 *                 type: number
 *                 example: 15000
 *               catatan:
 *                 type: string
 *                 example: Barang jangan dibanting
 *     responses:
 *       201:
 *         description: Order berhasil dibuat
 */
router.post("/", optionalAuthenticate, createOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update status order dan tambah tracking (Porter/Admin)
 *     description: "Flow porter: diterima untuk ambil order, menuju_lokasi saat menuju titik jemput, lalu upload bukti pickup untuk otomatis masuk dalam_perjalanan, sampai_tujuan saat sampai tujuan, lalu upload bukti delivery untuk otomatis selesai."
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: diterima
 *             latitude: -8.163265
 *             longitude: 113.721647
 *             catatan: Order diterima porter
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [menunggu, diterima, menuju_lokasi, dalam_perjalanan, sampai_tujuan, selesai, batal]
 *                 example: diterima
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               catatan:
 *                 type: string
 *                 example: Order diterima porter
 *     responses:
 *       200:
 *         description: Status order berhasil diupdate
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Status order berhasil diupdate
 *               data:
 *                 status: diterima
 *                 porter_id: porter-login-id
 */
router.put("/:id/status", optionalAuthenticate, updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   put:
 *     summary: Membatalkan order (User/Admin)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               catatan:
 *                 type: string
 *                 example: User membatalkan pesanan
 *     responses:
 *       200:
 *         description: Order dibatalkan
 */
router.put("/:id/cancel", optionalAuthenticate, cancelOrder);

/**
 * @swagger
 * /orders/{id}/porter-contact:
 *   get:
 *     summary: Mengambil kontak porter dari order (User/Admin)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 */
router.get("/:id/porter-contact", optionalAuthenticate, getOrderPorterContact);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Mengambil order berdasarkan ID (User/Porter/Admin)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 *     responses:
 *       200:
 *         description: Berhasil mengambil order
 */
router.get("/:id", optionalAuthenticate, getOrderById);

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Mengubah data order (Admin)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             lokasi_tujuan: Gedung Fakultas Teknik
 *             lat_jemput: -8.163265
 *             lng_jemput: 113.721647
 *             lat_tujuan: -8.170001
 *             lng_tujuan: 113.715001
 *             status: menunggu
 *             catatan: Tujuan diperbarui admin
 *             jenis_layanan: terjadwal
 *           schema:
 *             type: object
 *             properties:
 *               lokasi_jemput:
 *                 type: string
 *                 example: Gerbang Kampus
 *               lokasi_tujuan:
 *                 type: string
 *                 example: Gedung Fakultas Teknik
 *               lat_jemput:
 *                 type: number
 *                 example: -8.163265
 *               lng_jemput:
 *                 type: number
 *                 example: 113.721647
 *               lat_tujuan:
 *                 type: number
 *                 example: -8.170001
 *               lng_tujuan:
 *                 type: number
 *                 example: 113.715001
 *               jenis_layanan:
 *                 type: string
 *                 enum: [instant, terjadwal, semua]
 *                 example: terjadwal
 *               status:
 *                 type: string
 *                 enum: [menunggu, diterima, menuju_lokasi, dalam_perjalanan, sampai_tujuan, selesai, batal]
 *                 example: menunggu
 *               tarif_id:
 *                 type: string
 *                 nullable: true
 *               total_biaya:
 *                 type: number
 *                 example: 15000
 *               catatan:
 *                 type: string
 *                 example: Tujuan diperbarui admin
 *     responses:
 *       200:
 *         description: Order berhasil diubah
 */
router.put("/:id", authenticate, requireRole("admin"), updateOrder);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Menghapus order (Admin)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID order
 *     responses:
 *       200:
 *         description: Order berhasil dihapus
 */
router.delete("/:id", authenticate, requireRole("admin"), deleteOrder);

module.exports = router;
