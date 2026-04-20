const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Percorso corretto per gestionale.db (backend/db/gestionale.db)
const DB_PATH = path.join(__dirname, '..', 'db', 'gestionale.db');

router.get("/download-db", (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    console.error("❌ File database non trovato:", DB_PATH);
    return res.status(404).json({
      error: "File database non trovato",
      path: DB_PATH,
    });
  }

  const dowloadFilename = `gestionale.db`;

  console.log(`📥 Download DB richiesto - File: ${downloadFilename}`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);

  const fileStream = fs.createReadStream(DB_PATH);
  fileStream.on("error", (err) => {
    console.error("❌ Errore lettura DB:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Errore durante la lettura del database" });
    }
  });
  fileStream.pipe(res);
});

module.exports = router;