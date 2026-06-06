const express = require("express");
const router = express.Router();

const {
  getOrderTrackings,
  getOrderTrackingById,
  getTrackingByOrderId,
  createOrderTracking,
  updateOrderTracking,
  deleteOrderTracking
} = require("../controllers/orderTrackingController");

/**
 * @swagger
 * tags:
 *   name: Order Tracking
 *   description: API untuk riwayat tracking order
 */

/**
 * @swagger
 * /order-tracking:
 *   get:
 *     summary: Mengambil semua tracking order
 *     tags: [Order Tracking]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua tracking order
 */
router.get("/", getOrderTrackings);

/**
 * @swagger
 * /order-tracking:
 *   post:
 *     summary: Menambahkan tracking order manual
 *     tags: [Order Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: string
 *               status_perjalanan:
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
 *       201:
 *         description: Tracking berhasil ditambahkan
 */
router.post("/", createOrderTracking);

/**
 * @swagger
 * /order-tracking/order/{orderId}:
 *   get:
 *     summary: Mengambil tracking berdasarkan order ID
 *     tags: [Order Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID order
 *     responses:
 *       200:
 *         description: Berhasil mengambil tracking berdasarkan order
 */
router.get("/order/:orderId", getTrackingByOrderId);

/**
 * @swagger
 * /order-tracking/{id}:
 *   get:
 *     summary: Mengambil tracking berdasarkan ID
 *     tags: [Order Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID tracking
 *     responses:
 *       200:
 *         description: Berhasil mengambil tracking
 */
router.get("/:id", getOrderTrackingById);

/**
 * @swagger
 * /order-tracking/{id}:
 *   put:
 *     summary: Mengubah tracking order
 *     tags: [Order Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID tracking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status_perjalanan:
 *                 type: string
 *                 example: dalam_perjalanan
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               catatan:
 *                 type: string
 *                 example: Tracking diperbarui
 *     responses:
 *       200:
 *         description: Tracking berhasil diubah
 */
router.put("/:id", updateOrderTracking);

/**
 * @swagger
 * /order-tracking/{id}:
 *   delete:
 *     summary: Menghapus tracking order
 *     tags: [Order Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID tracking
 *     responses:
 *       200:
 *         description: Tracking berhasil dihapus
 */
router.delete("/:id", deleteOrderTracking);

module.exports = router;