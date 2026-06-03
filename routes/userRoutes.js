const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require("../controllers/userController");

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
 *     summary: Mengambil semua data users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua users
 */
router.get("/", getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Mengambil user berdasarkan ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil user
 */
router.get("/:id", getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Menambahkan user baru
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nama
 *               - email
 *               - no_hp
 *             properties:
 *               nama:
 *                 type: string
 *               email:
 *                 type: string
 *               password_hash:
 *                 type: string
 *               no_hp:
 *                 type: string
 *               alamat:
 *                 type: string
 *     responses:
 *       201:
 *         description: User berhasil ditambahkan
 */
router.post("/", createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Mengubah data user
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
 *           schema:
 *             type: object
 *             properties:
 *               nama:
 *                 type: string
 *               email:
 *                 type: string
 *               no_hp:
 *                 type: string
 *               alamat:
 *                 type: string
 *     responses:
 *       200:
 *         description: User berhasil diupdate
 */
router.put("/:id", updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Menghapus user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 */
router.delete("/:id", deleteUser);

module.exports = router;