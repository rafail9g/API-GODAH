const express = require("express");
const router = express.Router();

const {
  getVerifications,
  getMyVerification,
  getVerificationById,
  submitVerification,
  reviewVerification,
} = require("../controllers/porterVerifikasiController");
const { optionalAuthenticate } = require("../Middleware/middleware");

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
router.get("/me", optionalAuthenticate, getMyVerification);

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
router.post("/", optionalAuthenticate, submitVerification);

/**
 * @swagger
 * /porter-verifikasi:
 *   get:
 *     summary: Mengambil semua verifikasi porter (Admin)
 *     tags: [Porter Verifikasi]
 */
router.get("/", optionalAuthenticate, getVerifications);

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
router.get("/:id", optionalAuthenticate, getVerificationById);

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
router.put("/:id/review", optionalAuthenticate, reviewVerification);

module.exports = router;
