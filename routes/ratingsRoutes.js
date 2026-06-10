const express = require("express");
const router = express.Router();

const {
  ratePorter,
  getRatingsByPorter,
  getMyRatings,
} = require("../controllers/ratingsController");
const { authenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: API rating porter
 */

/**
 * @swagger
 * /ratings/orders/{orderId}:
 *   post:
 *     summary: Memberi rating porter setelah order selesai (User)
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nilai: 5
 *             ulasan: Pelayanan bagus
 *           schema:
 *             type: object
 *             properties:
 *               nilai:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               ulasan:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating porter berhasil disimpan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Rating porter berhasil disimpan
 *       403:
 *         description: Order belum selesai atau bukan milik user
 */
router.post("/orders/:orderId", authenticate, requireRole("user"), ratePorter);

/**
 * @swagger
 * /ratings/my:
 *   get:
 *     summary: Mengambil rating yang pernah dibuat user login (User)
 *     tags: [Ratings]
 *     responses:
 *       200:
 *         description: Rating user berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Rating user berhasil diambil
 *               data: []
 */
router.get("/my", authenticate, requireRole("user"), getMyRatings);

/**
 * @swagger
 * /ratings/porters/{porterId}:
 *   get:
 *     summary: Mengambil rating berdasarkan porter (User/Porter/Admin)
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: porterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rating porter berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Rating porter berhasil diambil
 *               data: []
 */
router.get("/porters/:porterId", authenticate, getRatingsByPorter);

module.exports = router;
