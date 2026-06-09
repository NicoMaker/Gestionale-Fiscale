const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const cron = require("node-cron");
const { initDB } = require("./modules/database");
const { getLocalIP, getPublicIP } = require("./modules/utils/network");
const setupSocketHandlers = require("./modules/sockets");
const downloadDbRouter = require("./modules/routes/downloadDb");
const avvioHtmlRouter = require("./modules/routes/avviohtml");
const cestinoModel = require("./modules/models/cestino");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
});

app.set("io", io);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servi file statici dal frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Route API
app.use("/api", downloadDbRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    socketConnections: io.engine.clientsCount,
  });
});

// Il router HTML va DOPO le route API e i file statici
app.use(avvioHtmlRouter);

setupSocketHandlers(io);

// ── CRON: eliminazione automatica cestino ogni notte a mezzanotte ──────────
// Scatta alle 00:00:05 (5 secondi dopo mezzanotte) ogni giorno
cron.schedule("5 0 * * *", () => {
  try {
    const eliminati = cestinoModel.eliminaScadutiCestino();
    if (eliminati > 0) {
      console.log(
        `🗑️ Cron cestino: eliminati ${eliminati} elementi scaduti (>${cestinoModel.GIORNI_RETENTION} giorni)`,
      );
      // Notifica tutti i client connessi: la pagina cestino si aggiorna
      // automaticamente senza che l'utente debba fare refresh
      io.emit("broadcast:cestino_updated");
    }
  } catch (e) {
    console.error("❌ Cron cestino errore:", e.message);
  }
});

const PORT = process.env.PORT || 3000;

initDB().then(async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server avviato con successo!`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:  http://localhost:${PORT}`);
    console.log(`\n--------------------------------------`);
    console.log(
      `⏰ Cron cestino attivo: eliminazione automatica ogni notte alle 00:00`,
    );
  });
});