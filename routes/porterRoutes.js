const express = require("express");
const router = express.Router();

const {
  getPorters,
  getPorterById,
  createPorter,
  updatePorter,
  deletePorter
} = require("../controllers/porterController");

/**
 * @swagger
 * tags:
 *   name: Porters
 *   description: API untuk mengelola data porter
 */

/**
 * @swagger
 * /porters:
 *   get:
 *     summary: Mengambil semua data porter
 *     tags: [Porters]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua porter
 */
router.get("/", getPorters);

/**
 * @swagger
 * /porters:
 *   post:
 *     summary: Menambahkan porter baru
 *     tags: [Porters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *                 example: Stanley Si Porter
 *               email:
 *                 type: string
 *                 example: porter@gmail.com
 *               no_hp:
 *                 type: string
 *                 example: "081234567890"
 *               foto_profil:
 *                 type: string
 *                 nullable: true
 *               status_verifikasi:
 *                 type: string
 *                 example: menunggu
 *               is_aktif:
 *                 type: boolean
 *                 example: false
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               total_selesai:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Porter berhasil ditambahkan
 */
router.post("/", createPorter);

/**
 * @swagger
 * /porters/{id}:
 *   get:
 *     summary: Mengambil porter berdasarkan ID
 *     tags: [Porters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID Porter
 *     responses:
 *       200:
 *         description: Berhasil mengambil porter
 */
router.get("/:id", getPorterById);

/**
 * @swagger
 * /porters/{id}:
 *   put:
 *     summary: Mengubah data porter
 *     tags: [Porters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID Porter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *                 example: Porter Update
 *               email:
 *                 type: string
 *                 example: porterupdate@gmail.com
 *               no_hp:
 *                 type: string
 *                 example: "089999999999"
 *               foto_profil:
 *                 type: string
 *                 nullable: true
 *               status_verifikasi:
 *                 type: string
 *                 example: disetujui
 *               is_aktif:
 *                 type: boolean
 *                 example: true
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               total_selesai:
 *                 type: integer
 *                 example: 15
 *     responses:
 *       200:
 *         description: Porter berhasil diubah
 */
router.put("/:id", updatePorter);

/**
 * @swagger
 * /porters/{id}:
 *   delete:
 *     summary: Menghapus porter
 *     tags: [Porters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID Porter
 *     responses:
 *       200:
 *         description: Porter berhasil dihapus
 */
router.delete("/:id", deletePorter);

module.exports = router;