const express = require("express");
const router = express.Router();

const {
  uploadPickupProof,
  uploadDeliveryProof,
  getProofByOrderId,
  getMyProofs
} = require("../controllers/buktiPengirimanController");
const { authenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Bukti Pengiriman
 *   description: API untuk bukti pickup dan delivery
 */

/**
 * @swagger
 * /orders/{id}/proof-pickup:
 *   post:
 *     summary: Ambil barang dan upload bukti jemput (Porter)
 *     tags: [Bukti Pengiriman]
 *     description: Porter upload foto barang saat dijemput. Endpoint ini otomatis mengubah status order menjadi dalam_perjalanan.
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
 *               foto_url:
 *                 type: string
 *                 example: https://contoh.com/foto-pickup.jpg
 *               latitude:
 *                 type: number
 *                 example: -8.163265
 *               longitude:
 *                 type: number
 *                 example: 113.721647
 *               keterangan:
 *                 type: string
 *                 example: Barang sudah dijemput
 *     responses:
 *       201:
 *         description: Bukti pickup berhasil diupload dan status menjadi dalam_perjalanan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Bukti pickup berhasil diupload
 */
router.post("/orders/:id/proof-pickup", authenticate, requireRole("porter"), uploadPickupProof);

/**
 * @swagger
 * /orders/{id}/proof-delivery:
 *   post:
 *     summary: Upload bukti sampai tujuan dan selesaikan order (Porter)
 *     tags: [Bukti Pengiriman]
 *     description: Porter upload foto bukti sampai tujuan. Endpoint ini otomatis mengubah status order menjadi selesai.
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
 *               foto_url:
 *                 type: string
 *                 example: https://contoh.com/foto-delivery.jpg
 *               latitude:
 *                 type: number
 *                 example: -8.170001
 *               longitude:
 *                 type: number
 *                 example: 113.715001
 *               keterangan:
 *                 type: string
 *                 example: Barang sudah sampai tujuan
 *     responses:
 *       201:
 *         description: Bukti delivery berhasil diupload dan status menjadi selesai
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Bukti delivery berhasil diupload
 */
router.post("/orders/:id/proof-delivery", authenticate, requireRole("porter"), uploadDeliveryProof);

/**
 * @swagger
 * /bukti-pengiriman/my:
 *   get:
 *     summary: Mengambil semua bukti milik user/porter login (User/Porter)
 *     tags: [Bukti Pengiriman]
 *     responses:
 *       200:
 *         description: Bukti pengiriman berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Bukti pengiriman berhasil diambil
 *               data:
 *                 - order:
 *                     id: order-id
 *                     status: selesai
 *                   bukti:
 *                     - jenis_bukti: pickup
 *                     - jenis_bukti: delivery
 */
router.get("/bukti-pengiriman/my", authenticate, requireRole("user", "porter"), getMyProofs);

/**
 * @swagger
 * /bukti-pengiriman/order/{orderId}:
 *   get:
 *     summary: Mengambil bukti berdasarkan order ID (User/Porter/Admin)
 *     tags: [Bukti Pengiriman]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bukti pengiriman berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Bukti pengiriman berhasil diambil
 *               data:
 *                 - jenis_bukti: pickup
 *                   foto_url: https://contoh.com/foto-pickup.jpg
 *       403:
 *         description: Tidak punya akses ke bukti order ini
 *       404:
 *         description: Order tidak ditemukan
 */
router.get("/bukti-pengiriman/order/:orderId", authenticate, getProofByOrderId);

module.exports = router;
