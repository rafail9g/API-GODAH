const express = require("express");
const router = express.Router();

const {
  getOrderTrackings,
  getOrderTrackingById,
  getTrackingByOrderId,
  getMyOrderTracking,
  getMyOrderTrackings,
  createOrderTracking,
  updateOrderTracking,
  deleteOrderTracking
} = require("../controllers/orderTrackingController");
const { optionalAuthenticate } = require("../Middleware/middleware");

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
 *     summary: Mengambil semua tracking order (Admin)
 *     tags: [Order Tracking]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua tracking order
 */
router.get("/", optionalAuthenticate, getOrderTrackings);

/**
 * @swagger
 * /order-tracking:
 *   post:
 *     summary: Menambahkan tracking order manual (Porter/Admin)
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
router.post("/", optionalAuthenticate, createOrderTracking);

/**
 * @swagger
 * /order-tracking/order/{orderId}:
 *   get:
 *     summary: Mengambil tracking berdasarkan order ID (User/Porter/Admin)
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
router.get("/order/:orderId", optionalAuthenticate, getTrackingByOrderId);

/**
 * @swagger
 * /order-tracking/my:
 *   get:
 *     summary: Mengambil semua tracking order milik user login (User)
 *     tags: [Order Tracking]
 *     responses:
 *       200:
 *         description: Tracking semua order user berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Tracking order user berhasil diambil
 *               data:
 *                 - order:
 *                     id: order-id
 *                     status: menuju_lokasi
 *                   tracking:
 *                     - status_perjalanan: menunggu
 *                     - status_perjalanan: diterima
 */
router.get("/my", optionalAuthenticate, getMyOrderTrackings);

/**
 * @swagger
 * /order-tracking/my-order/{orderId}:
 *   get:
 *     summary: Mengambil tracking order milik user login (User)
 *     tags: [Order Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID order milik user login
 *     responses:
 *       200:
 *         description: Tracking order berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Tracking order berhasil diambil
 *               data: []
 *               tracking: []
 *       403:
 *         description: User tidak punya akses ke order ini
 */
router.get("/my-order/:orderId", optionalAuthenticate, getMyOrderTracking);

/**
 * @swagger
 * /order-tracking/{id}:
 *   get:
 *     summary: Mengambil tracking berdasarkan ID (Admin)
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
router.get("/:id", optionalAuthenticate, getOrderTrackingById);

/**
 * @swagger
 * /order-tracking/{id}:
 *   put:
 *     summary: Mengubah tracking order (Admin)
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
router.put("/:id", optionalAuthenticate, updateOrderTracking);

/**
 * @swagger
 * /order-tracking/{id}:
 *   delete:
 *     summary: Menghapus tracking order (Admin)
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
router.delete("/:id", optionalAuthenticate, deleteOrderTracking);

module.exports = router;
