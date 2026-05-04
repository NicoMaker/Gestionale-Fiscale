// ═══════════════════════════════════════════════════════════════
// SCRIPT.JS — Entry point: tutti i moduli sono già caricati
//             dall'HTML nell'ordine corretto. Qui si avvia l'app.
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initNav();
});

// Aggiungi la funzione toggleClienteSelect globalmente
window.toggleClienteSelect = function() {
  const generaPer = document.getElementById("custom-adp-genera-per")?.value;
  const clienteDiv = document.getElementById("custom-adp-cliente-div");
  if (clienteDiv) {
    clienteDiv.style.display = generaPer === "selezionati" ? "block" : "none";
  }
};

// Ascolta i cambiamenti del checkbox "solo attivi" nel modal applica adempimenti
document.addEventListener('change', function(e) {
  if (e.target.id === 'applica-clienti-solo-attivi') {
    renderApplicaClientiList();
  }
});