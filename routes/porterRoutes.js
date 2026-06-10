const express = require("express");
const router = express.Router();

const {
  getPorters,
  getPorterById,
  createPorter,
  updatePorter,
  getPorterLocation,
  updatePorterLocation,
  updatePorterOnlineStatus,
  resetPorterPassword,
  deletePorter
} = require("../controllers/porterController");
const { authenticate, requireRole } = require("../Middleware/middleware");

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
 *     summary: Mengambil semua data porter (Admin)
 *     tags: [Porters]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua porter
 */
router.get("/me", authenticate, requireRole("porter"), (req, res) => {
  req.params.id = req.auth.id;
  return getPorterById(req, res);
});

/**
 * @swagger
 * /porters/me:
 *   put:
 *     summary: Mengubah profil sendiri (Porter)
 *     tags: [Porters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nama: Porter Baru
 *             no_hp: "081234567890"
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *               no_hp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil porter berhasil diubah
 */
router.put("/me", authenticate, requireRole("porter"), (req, res) => {
  req.params.id = req.auth.id;
  return updatePorter(req, res);
});

/**
 * @swagger
 * /porters/me/reset-password:
 *   put:
 *     summary: Reset password sendiri (Porter)
 *     tags: [Porters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             current_password: password123
 *             new_password: password456
 *           schema:
 *             type: object
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password porter berhasil direset
 *       401:
 *         description: Password lama salah
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Password lama salah
 */
router.put("/me/reset-password", authenticate, requireRole("porter"), resetPorterPassword);

/**
 * @swagger
 * /porters/me/location:
 *   get:
 *     summary: Mengambil lokasi saat ini (Porter)
 *     tags: [Porters]
 *     responses:
 *       200:
 *         description: Lokasi porter berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Lokasi porter berhasil diambil
 *               data:
 *                 id: 931603b5-884c-4c1c-af8f-bce92664ef02
 *                 latitude: -8.163265
 *                 longitude: 113.721647
 *                 is_aktif: true
 *   put:
 *     summary: Update lokasi sendiri (Porter)
 *     tags: [Porters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             latitude: -8.163265
 *             longitude: 113.721647
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Lokasi porter berhasil diupdate
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Lokasi porter berhasil diupdate
 *               data:
 *                 latitude: -8.163265
 *                 longitude: 113.721647
 */
router.get("/me/location", authenticate, requireRole("porter"), getPorterLocation);
router.put("/me/location", authenticate, requireRole("porter"), updatePorterLocation);

/**
 * @swagger
 * /porters/me/online:
 *   put:
 *     summary: Update status online sendiri (Porter)
 *     tags: [Porters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             is_aktif: true
 *           schema:
 *             type: object
 *             properties:
 *               is_aktif:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status online porter berhasil diupdate
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Status online porter berhasil diupdate
 *               data:
 *                 is_aktif: true
 */
router.put("/me/online", authenticate, requireRole("porter"), updatePorterOnlineStatus);

router.get("/", authenticate, requireRole("admin"), getPorters);

/**
 * @swagger
 * /porters:
 *   post:
 *     summary: Menambahkan porter baru (Admin)
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
 *               status_verifikasi:
 *                 type: string
 *                 enum: [menunggu, disetujui, ditolak]
 *                 example: menunggu
 *               status:
 *                 type: string
 *                 enum: [aktif, nonaktif, diblokir]
 *                 example: aktif
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
router.post("/", authenticate, requireRole("admin"), createPorter);

/**
 * @swagger
 * /porters/{id}:
 *   get:
 *     summary: Mengambil porter berdasarkan ID (Admin)
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
router.get("/:id", authenticate, requireRole("admin"), getPorterById);

/**
 * @swagger
 * /porters/{id}:
 *   put:
 *     summary: Mengubah status porter (Admin)
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
 *           example:
 *             status: aktif
 *             status_verifikasi: disetujui
 *             is_aktif: true
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [aktif, nonaktif, diblokir]
 *                 example: aktif
 *               status_verifikasi:
 *                 type: string
 *                 enum: [menunggu, disetujui, ditolak]
 *                 example: disetujui
 *               is_aktif:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Porter berhasil diubah
 */
router.put("/:id", authenticate, requireRole("admin"), updatePorter);

/**
 * @swagger
 * /porters/{id}:
 *   delete:
 *     summary: Menghapus porter (Admin)
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
router.delete("/:id", authenticate, requireRole("admin"), deletePorter);

module.exports = router;
