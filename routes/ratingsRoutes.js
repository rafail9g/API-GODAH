const express = require("express");
const router = express.Router();

const {
  getRatings,
  ratePorter,
  getRatingsByOrder,
  getRatingsByPorter,
  getMyRatings,
} = require("../controllers/ratingsController");
const { optionalAuthenticate } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: API rating porter
 */

/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Mengambil rating dengan filter opsional
 *     tags: [Ratings]
 *     parameters:
 *       - in: query
 *         name: porter_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: order_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rating berhasil diambil
 *   post:
 *     summary: Membuat rating porter dengan payload Flutter
 *     tags: [Ratings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - user_id
 *               - nilai
 *             properties:
 *               order_id:
 *                 type: string
 *               user_id:
 *                 type: string
 *               porter_id:
 *                 type: string
 *               nilai:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               ulasan:
 *                 type: string
 *           example:
 *             order_id: order-id
 *             user_id: user-id
 *             porter_id: porter-id
 *             nilai: 5
 *             ulasan: Pelayanan bagus
 *     responses:
 *       201:
 *         description: Rating porter berhasil disimpan
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
router.get("/", optionalAuthenticate, getRatings);
router.post("/", optionalAuthenticate, ratePorter);

/**
 * @swagger
 * /ratings/orders/{orderId}:
 *   get:
 *     summary: Mengambil rating berdasarkan order ID
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rating order berhasil diambil
 */
router.get("/orders/:orderId", optionalAuthenticate, getRatingsByOrder);
router.post("/orders/:orderId", optionalAuthenticate, ratePorter);

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
router.get("/my", optionalAuthenticate, getMyRatings);

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
router.get("/porters/:porterId", optionalAuthenticate, getRatingsByPorter);

module.exports = router;
