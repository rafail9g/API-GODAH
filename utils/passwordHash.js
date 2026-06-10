const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function isSha256Hash(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function passwordMatches(storedPassword, submittedPassword) {
  if (!storedPassword || !submittedPassword) return false;
  if (storedPassword === submittedPassword) return true;
  if (isSha256Hash(storedPassword)) {
    return storedPassword.toLowerCase() === hashPassword(submittedPassword);
  }
  return false;
}

module.exports = {
  hashPassword,
  passwordMatches,
};
