const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "kapadokya-secret-key-2024";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ hata: "Giriş yapmanız gerekiyor." });
  }
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ hata: "Geçersiz veya süresi dolmuş token." });
  }
}

module.exports = { authMiddleware, SECRET };
