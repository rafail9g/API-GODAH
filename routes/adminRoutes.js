const express = require("express");
const router = express.Router();

const {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
} = require("../controllers/adminController");

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: API untuk mengelola data admin
 */

/**
 * @swagger
 * /admins:
 *   get:
 *     summary: Mengambil semua admin
 *     tags: [Admins]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua admin
 */
router.get("/", getAdmins);

/**
 * @swagger
 * /admins/{id}:
 *   get:
 *     summary: Mengambil admin berdasarkan ID
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil admin
 */
router.get("/:id", getAdminById);

/**
 * @swagger
 * /admins:
 *   post:
 *     summary: Menambahkan admin baru
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *                 example: Admin Baru
 *               email:
 *                 type: string
 *                 example: adminbaru@mail.com
 *               password_hash:
 *                 type: string
 *                 example: admin123
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       201:
 *         description: Admin berhasil ditambahkan
 */
router.post("/", createAdmin);

/**
 * @swagger
 * /admins/{id}:
 *   put:
 *     summary: Mengubah data admin
 *     tags: [Admins]
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
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *                 example: Admin Update
 *               email:
 *                 type: string
 *                 example: adminupdate@mail.com
 *               password_hash:
 *                 type: string
 *                 example: admin456
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: Admin berhasil diubah
 */
router.put("/:id", updateAdmin);

/**
 * @swagger
 * /admins/{id}:
 *   delete:
 *     summary: Menghapus admin
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin berhasil dihapus
 */
router.delete("/:id", deleteAdmin);

module.exports = router;