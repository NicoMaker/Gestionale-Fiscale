const express = require("express");
const path = require("path");
const cors = require("cors");

const apiRoutes = require("./routes");
const htmlRoutes = require("./routes/htmlRoutes");
const errorHandler = require("./middleware/errorHandler");

/**
 * Crea e configura l'applicazione Express.
 *
 * Ordine dei middleware (importante):
 *   1. CORS + parser JSON/urlencoded
 *   2. file statici del frontend
 *   3. route API (/api/...)
 *   4. catch-all SPA (serve index.html per le route non-API)
 *   5. gestione errori
 */
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Guida del programma: il PDF sta nella radice del progetto (fuori da
  // frontend/), quindi lo servo con una route dedicata. Va PRIMA dei file
  // statici e del catch-all SPA, che altrimenti risponderebbe con index.html.
  const guidaPdf = path.join(__dirname, "../../manuale-utente-gestionale.pdf");
  app.get("/manuale-utente-gestionale.pdf", (req, res, next) => {
    res.sendFile(
      guidaPdf,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'inline; filename="manuale-utente-gestionale.pdf"',
        },
      },
      (err) => err && next(err),
    );
  });

  // File statici del frontend (../../frontend rispetto a backend/src)
  app.use(express.static(path.join(__dirname, "../../frontend")));

  // Route API
  app.use(apiRoutes);

  // Catch-all SPA (dopo statici e API)
  app.use(htmlRoutes);

  // Gestione errori centralizzata
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
