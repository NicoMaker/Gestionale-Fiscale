const funzioniRepository = require("../repositories/funzioniRepository");

/**
 * Handler socket per la pagina CENTRO FUNZIONI.
 *   get:funzioni { anno } → res:funzioni { success, data }
 */
module.exports = function registerFunzioniController(io, socket) {
  socket.on("get:funzioni", ({ anno } = {}) => {
    try {
      const a = parseInt(anno) || new Date().getFullYear();
      socket.emit("res:funzioni", { success: true, data: funzioniRepository.getFunzioni(a) });
    } catch (e) {
      socket.emit("res:funzioni", { success: false, error: e.message });
    }
  });
};
