const express = require("express");
const router = express.Router();

const {
  getVerifications,
  getMyVerification,
  getVerificationById,
  submitVerification,
  reviewVerification,
} = require("../controllers/porterVerifikasiController");
const { authenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Porter Verifikasi
 *   description: API pengajuan dan review verifikasi porter
 */

/**
 * @swagger
 * /porter-verifikasi/me:
 *   get:
 *     summary: Mengambil verifikasi porter sendiri (Porter)
 *     tags: [Porter Verifikasi]
 */
router.get("/me", authenticate, requireRole("porter"), getMyVerification);

/**
 * @swagger
 * /porter-verifikasi:
 *   post:
 *     summary: Submit dokumen verifikasi porter (Porter)
 *     tags: [Porter Verifikasi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             dokumen_url: https://contoh.com/dokumen-porter.jpg
 *           schema:
 *             type: object
 *             properties:
 *               dokumen_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Verifikasi porter berhasil disubmit
 */
router.post("/", authenticate, requireRole("porter"), submitVerification);

/**
 * @swagger
 * /porter-verifikasi:
 *   get:
 *     summary: Mengambil semua verifikasi porter (Admin)
 *     tags: [Porter Verifikasi]
 */
router.get("/", authenticate, requireRole("admin"), getVerifications);

/**
 * @swagger
 * /porter-verifikasi/{id}:
 *   get:
 *     summary: Mengambil verifikasi porter berdasarkan ID (Admin)
 *     tags: [Porter Verifikasi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", authenticate, requireRole("admin"), getVerificationById);

/**
 * @swagger
 * /porter-verifikasi/{id}/review:
 *   put:
 *     summary: Review verifikasi porter (Admin)
 *     tags: [Porter Verifikasi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: disetujui
 *             catatan_admin: Dokumen valid
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [menunggu, disetujui, ditolak]
 *               catatan_admin:
 *                 type: string
 */
router.put("/:id/review", authenticate, requireRole("admin"), reviewVerification);

module.exports = router;
