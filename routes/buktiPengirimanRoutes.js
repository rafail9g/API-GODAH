const express = require("express");
const router = express.Router();

const {
  uploadPickupProof,
  uploadDeliveryProof,
  getProofByOrderId
} = require("../controllers/buktiPengirimanController");

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
 *     summary: Upload bukti saat barang dijemput
 *     tags: [Bukti Pengiriman]
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
 *               porter_id:
 *                 type: string
 *               foto_url:
 *                 type: string
 *                 example: https://contoh.com/foto-pickup.jpg
 *               keterangan:
 *                 type: string
 *                 example: Barang sudah dijemput
 */
router.post("/orders/:id/proof-pickup", uploadPickupProof);

/**
 * @swagger
 * /orders/{id}/proof-delivery:
 *   post:
 *     summary: Upload bukti saat barang sampai tujuan
 *     tags: [Bukti Pengiriman]
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
 *               porter_id:
 *                 type: string
 *               foto_url:
 *                 type: string
 *                 example: https://contoh.com/foto-delivery.jpg
 *               keterangan:
 *                 type: string
 *                 example: Barang sudah sampai tujuan
 */
router.post("/orders/:id/proof-delivery", uploadDeliveryProof);

/**
 * @swagger
 * /bukti-pengiriman/order/{orderId}:
 *   get:
 *     summary: Mengambil bukti berdasarkan order ID
 *     tags: [Bukti Pengiriman]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/bukti-pengiriman/order/:orderId", getProofByOrderId);

module.exports = router;