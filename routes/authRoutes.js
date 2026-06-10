const express = require("express");
const router = express.Router();

const { login, me, register } = require("../controllers/authController");
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
 * /auth/me:
 *   get:
 *     summary: Cek akun dari token API (User/Porter/Admin)
 *     tags: [Auth]
 */
router.get("/me", authenticate, me);

module.exports = router;
