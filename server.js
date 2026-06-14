const express = require("express");
const cors = require("cors");
require("dotenv").config();

const paymentRoutes = require("./routes/paymentRoutes");
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
      payments: "/payments",
      docs: "/api-docs",
    },
  });
});

app.use("/payments", paymentRoutes);

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
