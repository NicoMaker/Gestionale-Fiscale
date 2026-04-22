// routes/avvioHtml.js

const express = require("express");
const path = require("path");
const router = express.Router();

// ========================================
// 🏠 SERVE INDEX.HTML PER TUTTE LE ROUTE NON-API (SPA)
// ========================================

// Opzione 1: Usare app.use invece di router.get
router.use((req, res, next) => {
  // Escludi le route che iniziano con /api
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../../frontend", "index.html"));
  } else {
    next();
  }
});

module.exports = router;
