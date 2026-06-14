const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { authenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API untuk mengelola data users
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Mengambil semua users (Admin)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Berhasil
 */
router.get("/me", authenticate, requireRole("user"), (req, res) => {
  req.params.id = req.auth.id;
  return getUserById(req, res);
});

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Mengubah profil sendiri (User)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nama: Rafail
 *             no_hp: "081234567890"
 *             alamat: Jember
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *               no_hp:
 *                 type: string
 *               alamat:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil berhasil diubah
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User berhasil diupdate
 *               data:
 *                 nama: Rafail
 *                 no_hp: "081234567890"
 *                 alamat: Jember
 */
router.put("/me", authenticate, requireRole("user"), (req, res) => {
  req.params.id = req.auth.id;
  return updateUser(req, res);
});

router.get("/", authenticate, requireRole("admin"), getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Mengambil user berdasarkan ID (Admin)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil
 */
router.get("/:id", authenticate, requireRole("admin"), getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Menambahkan user (Admin)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *                 example: Rafail
 *               email:
 *                 type: string
 *                 example: rafail@mail.com
 *               password_hash:
 *                 type: string
 *                 example: manual_api
 *               no_hp:
 *                 type: string
 *                 example: "081234567890"
 *               alamat:
 *                 type: string
 *                 example: Jember
 *               status:
 *                 type: string
 *                 enum: [aktif, nonaktif, diblokir]
 *                 example: aktif
 *     responses:
 *       201:
 *         description: Berhasil ditambahkan
 */
router.post("/", authenticate, requireRole("admin"), createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Mengubah status user (Admin)
 *     tags: [Users]
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
 *             status: aktif
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [aktif, nonaktif, diblokir]
 *                 example: aktif
 *     responses:
 *       200:
 *         description: Berhasil diubah
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User berhasil diupdate
 *               data:
 *                 status: aktif
 */
router.put("/:id", authenticate, requireRole("admin"), updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Menghapus user (Admin)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil dihapus
 */
router.delete("/:id", authenticate, requireRole("admin"), deleteUser);

module.exports = router;
