const express = require("express");
const router = express.Router();

const {
  getAdminContacts,
} = require("../controllers/adminController");
const { authenticate, requireRole } = require("../Middleware/middleware");

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: API untuk kontak admin
 */

/**
 * @swagger
 * /admins/call-center:
 *   get:
 *     summary: Mengambil kontak call center admin (User)
 *     tags: [Admins]
 */
router.get("/call-center", authenticate, requireRole("user"), getAdminContacts);

module.exports = router;
