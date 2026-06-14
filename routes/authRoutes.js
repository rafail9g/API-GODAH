const express = require("express");
const router = express.Router();

const {
  completeGoogleProfile,
  forgotPassword,
  googleLogin,
  login,
  me,
  register,
  resetPassword,
} = require("../controllers/authController");
const { authenticate } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Login dan token role-based untuk Swagger/API
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register user atau porter baru (Public)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, email, password, no_hp]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, porter]
 *                 example: user
 *               nama:
 *                 type: string
 *                 example: Rafail
 *               email:
 *                 type: string
 *                 example: rafail@mail.com
 *               password:
 *                 type: string
 *                 example: password123
 *               no_hp:
 *                 type: string
 *                 example: "081234567890"
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user, porter, atau admin (Public)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@godah.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login berhasil, backend otomatis mendeteksi role dan field token bisa dipakai di Swagger Authorize
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Kirim token lupa password ke email (Public)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: rafail@mail.com
 *     responses:
 *       200:
 *         description: Token reset password dikirim ke email
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Token reset password sudah dikirim ke email
 *               data: null
 *               email: rafail@mail.com
 *               role: user
 *       404:
 *         description: Email tidak ditemukan
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password dengan token email (Public)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token, new_password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: rafail@mail.com
 *               token:
 *                 type: string
 *                 example: "123456"
 *               new_password:
 *                 type: string
 *                 example: password456
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password berhasil direset. Silakan login ulang.
 *               role: user
 *       400:
 *         description: Token invalid/kedaluwarsa atau input tidak valid
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login Google menggunakan ID token dari Flutter
 *     tags: [Auth]
 *     security: []
 */
router.post("/google", googleLogin);

/**
 * @swagger
 * /auth/google/complete-profile:
 *   post:
 *     summary: Lengkapi role dan profil setelah Google Sign-In
 *     tags: [Auth]
 *     security: []
 */
router.post("/google/complete-profile", completeGoogleProfile);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Cek akun dari token API (User/Porter/Admin)
 *     tags: [Auth]
 */
router.get("/me", authenticate, me);

module.exports = router;
