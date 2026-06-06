const express = require("express");
const router = express.Router();

const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  acceptOrder,
  goToPickup,
  startDelivery,
  arrivedOrder,
  cancelOrder,
  deleteOrder
} = require("../controllers/orderController");

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
 *     summary: Mengambil semua order
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua order
 */
router.get("/", getOrders);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Membuat order baru
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               porter_id:
 *                 type: string
 *                 nullable: true
 *               tarif_id:
 *                 type: string
 *                 nullable: true
 *               lokasi_jemput:
 *                 type: string
 *                 example: Kampus UNEJ
 *               lokasi_tujuan:
 *                 type: string
 *                 example: Kos Mastrip
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
 *                 example: instant
 *               status:
 *                 type: string
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
router.post("/", createOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update status order manual dan tambah tracking
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
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: menuju_lokasi
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               catatan:
 *                 type: string
 *                 example: Porter menuju lokasi jemput
 *     responses:
 *       200:
 *         description: Status order berhasil diupdate
 */
router.put("/:id/status", updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/accept:
 *   put:
 *     summary: Porter menerima order
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
 *         description: Order diterima porter
 */
router.put("/:id/accept", acceptOrder);

/**
 * @swagger
 * /orders/{id}/go-to-pickup:
 *   put:
 *     summary: Porter menuju lokasi jemput
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
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               catatan:
 *                 type: string
 *                 example: Porter menuju lokasi jemput
 *     responses:
 *       200:
 *         description: Status menjadi menuju_lokasi
 */
router.put("/:id/go-to-pickup", goToPickup);

/**
 * @swagger
 * /orders/{id}/start-delivery:
 *   put:
 *     summary: Barang mulai diantar
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
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               catatan:
 *                 type: string
 *                 example: Barang sedang dalam perjalanan
 *     responses:
 *       200:
 *         description: Status menjadi dalam_perjalanan
 */
router.put("/:id/start-delivery", startDelivery);

/**
 * @swagger
 * /orders/{id}/arrived:
 *   put:
 *     summary: Porter sampai tujuan
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
 *               latitude:
 *                 type: number
 *                 example: -8.170001
 *               longitude:
 *                 type: number
 *                 example: 113.715001
 *               catatan:
 *                 type: string
 *                 example: Porter sudah sampai tujuan
 *     responses:
 *       200:
 *         description: Status menjadi sampai_tujuan
 */
router.put("/:id/arrived", arrivedOrder);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   put:
 *     summary: Membatalkan order
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
router.put("/:id/cancel", cancelOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Mengambil order berdasarkan ID
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
router.get("/:id", getOrderById);

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Mengubah data order
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
 *           schema:
 *             type: object
 *             properties:
 *               lokasi_jemput:
 *                 type: string
 *               lokasi_tujuan:
 *                 type: string
 *               jenis_barang:
 *                 type: string
 *               estimasi_berat:
 *                 type: number
 *               total_biaya:
 *                 type: number
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order berhasil diubah
 */
router.put("/:id", updateOrder);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Menghapus order
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
router.delete("/:id", deleteOrder);

module.exports = router;