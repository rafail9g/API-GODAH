const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API GoDah berjalan!" });
});

app.use("/users", userRoutes);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server berjalan di port ${process.env.PORT || 3000}`);
});