const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const porterRoutes = require("./routes/porterRoutes");
const orderRoutes = require("./routes/orderRoutes");
const orderTrackingRoutes = require("./routes/orderTrackingRoutes");
const buktiPengirimanRoutes = require("./routes/buktiPengirimanRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ratingsRoutes = require("./routes/ratingsRoutes");
const porterVerifikasiRoutes = require("./routes/porterVerifikasiRoutes");
const tarifRoutes = require("./routes/tarifRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { errorHandler, notFound, requestLogger } = require("./Middleware/middleware");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API GoDah berjalan!",
    endpoints: {
      auth: "/auth atau /api/auth",
      users: "/users atau /api/users",
      porters: "/porters atau /api/porters",
      porterVerifikasi: "/porter-verifikasi atau /api/porter-verifikasi",
      orders: "/orders atau /api/orders",
      payments: "/payments atau /api/payments",
      ratings: "/ratings atau /api/ratings",
      notifications: "/notifications atau /api/notifications",
      tarif: "/tarif atau /api/tarif",
      docs: "/api-docs",
    },
  });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/admins", adminRoutes);
app.use("/porters", porterRoutes);
app.use("/porter-verifikasi", porterVerifikasiRoutes);
app.use("/orders", orderRoutes);
app.use("/order-tracking", orderTrackingRoutes);
app.use("/payments", paymentRoutes);
app.use("/ratings", ratingsRoutes);
app.use("/notifications", notificationRoutes);
app.use("/tarif", tarifRoutes);
app.use("/", buktiPengirimanRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/porters", porterRoutes);
app.use("/api/porter-verifikasi", porterVerifikasiRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-tracking", orderTrackingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tarif", tarifRoutes);
app.use("/api", buktiPengirimanRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Server gagal jalan:", err);
});
