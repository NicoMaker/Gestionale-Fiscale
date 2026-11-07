// ═══════════════════════════════════════════════════════════════
// TESTO.JS — Dimensione del testo di TUTTA l'interfaccia
//
// Il progetto scrive i font in "px" (nei CSS e negli stili inline dei
// template JS), quindi cambiare il font-size della radice non basta.
// Questo modulo, senza modificare nessun file esistente:
//
//   1. legge tutti i fogli di stile e genera un foglio "gf-testo"
//      che ripete ogni font-size in px come  calc(Npx * var(--gf-txt))
//   2. riscrive allo stesso modo gli stili inline  style="font-size:Npx"
//      (anche quelli creati dopo, quando le pagine si ridisegnano)
//
// Poi basta cambiare la variabile CSS  --gf-txt  (1 = 100%) e tutto il
// testo si ridimensiona all'istante. La variabile la imposta
// personalizza.js dallo slider «Dimensione testo».
//
// Finché la scala resta al 100% questo modulo non fa nulla.
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const STYLE_ID = "gf-testo";
  const FATTORE = "var(--gf-txt,1)";
  const PX = /^\s*(\d*\.?\d+)px\s*$/;

  let attivo = false;
  let styleEl = null;
  const visti = new WeakSet(); // fogli di stile già letti
  let observer = null;

  const scala = (n) => `calc(${n}px * ${FATTORE})`;

  // ─── 1. FOGLI DI STILE ───────────────────────────────────────
  // Restituisce le regole "selettore{font-size:…}" (con eventuali @media)
  function leggiRegole(rules, out) {
    for (const r of Array.from(rules)) {
      // Regola normale
      if (r.type === 1 && r.style) {
        let n = null;
        const fs = r.style.getPropertyValue("font-size");
        const m = PX.exec(fs);
        if (m) n = m[1];
        else if (!fs) {
          // font: 600 13px var(--sans)  →  con var() il browser non espande
          // la scorciatoia, quindi cerco la misura nel testo
          const f = r.style.getPropertyValue("font");
          const mf = f && /(?:^|\s)(\d*\.?\d+)px(?:\s|\/|$)/.exec(f);
          if (mf) n = mf[1];
        }
        if (n !== null) {
          const imp = r.style.getPropertyPriority("font-size") ? "!important" : "";
          out.push(`${r.selectorText}{font-size:${scala(n)}${imp}}`);
        }
        continue;
      }
      // @media / @supports: riscrivo il blocco con le sole regole di font
      if ((r.type === 4 || r.type === 12) && r.cssRules) {
        const dentro = [];
        leggiRegole(r.cssRules, dentro);
        if (dentro.length) {
          const nome = r.type === 4 ? "media" : "supports";
          out.push(`@${nome} ${r.conditionText || (r.media && r.media.mediaText) || ""}{${dentro.join("")}}`);
        }
        continue;
      }
      // @import dello stesso sito
      if (r.type === 3 && r.styleSheet) {
        try {
          leggiRegole(r.styleSheet.cssRules, out);
        } catch (_) {
          /* foglio di un altro sito (es. Google Fonts): non leggibile */
        }
      }
    }
  }

  function scansionaFogli() {
    const nuovi = [];
    for (const sheet of Array.from(document.styleSheets)) {
      if (visti.has(sheet)) continue;
      const id = sheet.ownerNode && sheet.ownerNode.id;
      // salto il mio foglio e quello di personalizza.js (usa già --gf-txt)
      if (id === STYLE_ID || id === "gf-personalizza") continue;
      visti.add(sheet);
      try {
        leggiRegole(sheet.cssRules, nuovi);
      } catch (_) {
        /* foglio non leggibile: lo salto */
      }
    }
    if (!nuovi.length && styleEl) return;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
    }
    styleEl.textContent += nuovi.join("\n");
    // Deve venire DOPO tutti gli altri fogli per vincere a parità di specificità
    document.head.appendChild(styleEl);
  }

  // ─── 2. STILI INLINE ─────────────────────────────────────────
  const INLINE = /font-size\s*:\s*(\d*\.?\d+)px/gi;

  function scalaElemento(el) {
    const s = el.getAttribute && el.getAttribute("style");
    if (!s || s.indexOf("font-size") === -1) return;
    const nuovo = s.replace(INLINE, (_, n) => `font-size:${scala(n)}`);
    if (nuovo !== s) el.setAttribute("style", nuovo);
  }

  function scalaAlbero(root) {
    if (root.nodeType !== 1) return;
    scalaElemento(root);
    root.querySelectorAll('[style*="font-size"]').forEach(scalaElemento);
  }

  function avviaOsservatore() {
    if (observer) return;
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes") scalaElemento(m.target);
        else m.addedNodes.forEach(scalaAlbero);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  // ─── API ─────────────────────────────────────────────────────
  // Da chiamare quando la scala è diversa dal 100%. Si può richiamare
  // quante volte si vuole: fa il lavoro pesante solo la prima volta
  // (e legge i fogli aggiunti dopo).
  function attiva() {
    scansionaFogli();
    if (!attivo) {
      attivo = true;
      const avvia = () => {
        scansionaFogli();
        scalaAlbero(document.documentElement);
        avviaOsservatore();
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", avvia, { once: true });
      } else avvia();
      // a pagina finita rileggo i fogli, nel caso ne mancasse qualcuno
      window.addEventListener("load", scansionaFogli, { once: true });
    }
  }

  window.GF_TESTO = { attiva };
})();
