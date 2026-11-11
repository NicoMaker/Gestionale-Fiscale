// ═══════════════════════════════════════════════════════════════
// FUNZIONI.JS — Centro funzioni: tutte le funzionalità dell'app in una
//           pagina, con i numeri chiave e i collegamenti diretti ai
//           dati di ciascuna (clienti, scadenze, note, cestino…).
//
//   Dati:   socket "get:funzioni" { anno }  →  "res:funzioni" { success, data }
//   Azioni: ogni elemento con data-act="tipo:valore" è cliccabile
//             page:<pagina>      apre una pagina dal menu
//             cliente:<id>       apre lo scadenzario di quel cliente
//             fn:<nomeFunzione>  esegue una funzione globale
//             url:<indirizzo>    apre un indirizzo in una nuova scheda
//             click:<selettore>  clicca un elemento esistente
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  let dati = null; // ultimi dati ricevuti
  let filtro = ""; // testo della ricerca funzioni
  let timer = null;

  // ─── utilità ────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const num = (n) => Number(n || 0).toLocaleString("it-IT");
  const dataIt = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  };
  const plurale = (n, uno, molti) => (n === 1 ? uno : molti);
  const percentuale = (d) => {
    const t = d.anno_stats.totale - d.anno_stats.na;
    return t > 0 ? Math.round((d.anno_stats.completati / t) * 100) : 0;
  };

  // ─── catalogo delle funzioni ────────────────────────────────
  // stat(d) → { valore, label }   ·   link(d) → [{ testo, sub, act }]
  const GRUPPI = [
    {
      titolo: "Lavoro quotidiano",
      voci: [
        {
          act: "page:dashboard",
          icona: "📊",
          titolo: "Dashboard",
          desc: "Statistiche degli adempimenti dell'anno, clienti senza adempimenti e assegnazione massiva.",
          chiavi: "statistiche anno completati da fare assegna applica",
          stat: (d) => ({ valore: `${percentuale(d)}%`, label: `completato nel ${d.anno}` }),
          link: (d) => [
            { testo: `${num(d.anno_stats.da_fare)} da fare`, sub: `${num(d.anno_stats.in_corso)} in corso`, act: "page:dashboard" },
            ...(d.senza_adempimenti.count
              ? [{ testo: `${num(d.senza_adempimenti.count)} ${plurale(d.senza_adempimenti.count, "cliente senza adempimenti", "clienti senza adempimenti")}`, act: "page:dashboard" }]
              : []),
          ],
        },
        {
          act: "page:scadenzario",
          icona: "📅",
          titolo: "Scadenzario cliente",
          desc: "Le scadenze di un singolo cliente: stato, importi, rate e note per ogni adempimento.",
          chiavi: "scadenze cliente importi stato rate",
          stat: (d) => ({ valore: num(d.clienti.attivi), label: "clienti con scadenzario" }),
          intestaLink: "Più adempimenti da fare",
          link: (d) =>
            d.top_da_fare.map((c) => ({
              testo: c.nome,
              sub: `${num(c.da_fare)} da fare`,
              act: `cliente:${c.id}`,
            })),
        },
        {
          act: "page:scadenzario_globale",
          icona: "🌐",
          titolo: "Vista Globale",
          desc: "Tutte le scadenze di tutti i clienti in un'unica tabella, con filtri e azioni massive.",
          chiavi: "tutte scadenze tabella filtri globale scadute",
          stat: (d) => ({ valore: num(d.scaduti.count), label: plurale(d.scaduti.count, "scadenza superata", "scadenze superate") }),
          intestaLink: "Le più vecchie",
          link: (d) =>
            d.scaduti.esempi.map((s) => ({
              testo: `${s.adempimento} · ${s.cliente}`,
              sub: `scaduta il ${dataIt(s.data_scadenza)}`,
              act: `cliente:${s.id_cliente}`,
            })),
        },
        {
          act: "page:sintesi",
          icona: "🗓️",
          titolo: "Sintesi Adempimenti",
          desc: "Matrice clienti × adempimenti: a colpo d'occhio cosa è fatto, parziale o ancora da fare.",
          chiavi: "matrice sintesi clienti adempimenti legenda",
          stat: (d) => ({ valore: `${num(d.anno_stats.completati)}/${num(d.anno_stats.totale)}`, label: `pratiche completate nel ${d.anno}` }),
          link: (d) => [{ testo: `${num(d.in_scadenza_7)} in scadenza nei prossimi 7 giorni`, act: "page:scadenzario_globale" }],
        },
      ],
    },
    {
      titolo: "Anagrafica e regole",
      voci: [
        {
          act: "page:clienti",
          icona: "👥",
          titolo: "Clienti",
          desc: "L'anagrafica con classificazione fiscale guidata, ricerca per nome, codice fiscale o partita IVA.",
          chiavi: "anagrafica clienti codice fiscale partita iva",
          stat: (d) => ({ valore: num(d.clienti.attivi), label: `attivi su ${num(d.clienti.totale)}` }),
          intestaLink: "Senza adempimenti",
          link: (d) =>
            d.senza_adempimenti.esempi.map((c) => ({ testo: c.nome, sub: `nessun adempimento nel ${d.anno}`, act: `cliente:${c.id}` })),
        },
        {
          act: "page:adempimenti",
          icona: "📋",
          titolo: "Adempimenti",
          desc: "Il catalogo degli adempimenti: periodicità, modalità di importo e anno di validità.",
          chiavi: "catalogo adempimenti periodicità iva f24",
          stat: (d) => ({ valore: num(d.adempimenti.attivi), label: "adempimenti nel catalogo" }),
          link: () => [],
        },
        {
          act: "page:tipologie",
          icona: "🏷️",
          titolo: "Tipologie Clienti",
          desc: "Tipologie e sottotipologie per classificare i clienti e filtrare le viste.",
          chiavi: "tipologie sottotipologie classificazione",
          stat: (d) => ({ valore: num(d.tipologie.count), label: `tipologie · ${num(d.tipologie.sottotipologie)} sottotipologie` }),
          link: () => [],
        },
      ],
    },
    {
      titolo: "Promemoria dello studio",
      voci: [
        {
          act: "page:appunti",
          icona: "📆",
          titolo: "Scadenze Studio",
          desc: "Promemoria interni con data e priorità, anche collegati a un cliente.",
          chiavi: "appunti promemoria scadenze studio priorità",
          stat: (d) => ({ valore: num(d.appunti.aperti), label: `${plurale(d.appunti.aperti, "aperta", "aperte")} · ${num(d.appunti.scaduti)} ${plurale(d.appunti.scaduti, "scaduta", "scadute")}` }),
          intestaLink: "Prossime",
          link: (d) =>
            d.appunti.prossimi.map((a) => ({
              testo: a.titolo,
              sub: [a.data_scadenza ? dataIt(a.data_scadenza) : "senza data", a.priorita].filter(Boolean).join(" · "),
              act: "page:appunti",
            })),
        },
        {
          act: "page:pagina_bianca",
          icona: "📝",
          titolo: "Note",
          desc: "Pagine di testo libere per lo studio o per un cliente, con allegati.",
          chiavi: "note pagine testo allegati",
          stat: (d) => ({ valore: num(d.note.totale), label: `${num(d.note.studio)} studio · ${num(d.note.cliente)} clienti` }),
          link: () => [],
        },
      ],
    },
    {
      titolo: "Strumenti",
      voci: [
        {
          act: "page:cestino",
          icona: "🗑️",
          titolo: "Cestino",
          desc: "Recupera ciò che hai eliminato per errore. Si svuota da solo ogni notte.",
          chiavi: "cestino ripristina eliminati recupera",
          stat: (d) => ({ valore: num(d.cestino.totale), label: plurale(d.cestino.totale, "elemento recuperabile", "elementi recuperabili") }),
          link: () => [],
        },
        {
          act: "page:scorciatoie",
          icona: "⌨️",
          titolo: "Scorciatoie",
          desc: "Tutti i tasti rapidi dell'app, pagina per pagina, da stampare. Ctrl K cerca ovunque.",
          chiavi: "tasti scorciatoie tastiera ctrl k",
          stat: null,
          link: () => [],
        },
        {
          act: "fn:scaricaDatabase",
          icona: "💾",
          titolo: "Scarica DB",
          desc: "Scarica una copia del database come backup.",
          chiavi: "backup database scarica salva",
          stat: null,
          link: () => [],
          apri: "Scarica",
        },
        {
          act: "url:/manuale-utente-gestionale.pdf",
          icona: "📖",
          titolo: "Guida",
          desc: "Il manuale utente completo in PDF.",
          chiavi: "guida manuale pdf aiuto",
          stat: null,
          link: () => [],
          apri: "Apri il PDF",
        },
        {
          act: "click:#btn-personalizza",
          icona: "🎨",
          titolo: "Personalizza",
          desc: "Colori, carattere, misure e tema dell'aspetto dell'app.",
          chiavi: "aspetto tema colori carattere personalizza",
          stat: null,
          link: () => [],
          apri: "Personalizza",
        },
      ],
    },
  ];

  // ─── "Richiede attenzione" ──────────────────────────────────
  function attenzione(d) {
    const v = [];
    if (d.scaduti.count)
      v.push({ tono: "red", n: d.scaduti.count, t: plurale(d.scaduti.count, "adempimento scaduto non completato", "adempimenti scaduti non completati"), act: "page:scadenzario_globale" });
    if (d.appunti.scaduti)
      v.push({ tono: "red", n: d.appunti.scaduti, t: plurale(d.appunti.scaduti, "scadenza studio superata", "scadenze studio superate"), act: "page:appunti" });
    if (d.in_scadenza_7)
      v.push({ tono: "yellow", n: d.in_scadenza_7, t: "adempimenti in scadenza entro 7 giorni", act: "page:scadenzario_globale" });
    if (d.senza_adempimenti.count)
      v.push({ tono: "yellow", n: d.senza_adempimenti.count, t: plurale(d.senza_adempimenti.count, "cliente senza adempimenti", "clienti senza adempimenti"), act: "page:dashboard" });
    if (d.appunti.in_scadenza_7)
      v.push({ tono: "accent", n: d.appunti.in_scadenza_7, t: plurale(d.appunti.in_scadenza_7, "scadenza studio entro 7 giorni", "scadenze studio entro 7 giorni"), act: "page:appunti" });
    return v;
  }

  function htmlAttenzione(d) {
    const voci = attenzione(d);
    if (!voci.length)
      return `<section class="fz-block"><h2 class="fz-h">Richiede attenzione</h2>
        <div class="fz-ok"><strong>Tutto sotto controllo.</strong> Nessuna scadenza superata e nessun cliente senza adempimenti.</div></section>`;
    return `<section class="fz-block"><h2 class="fz-h">Richiede attenzione</h2>
      <div class="fz-alerts">${voci
        .map(
          (a) => `<button type="button" class="fz-alert fz-${a.tono}" data-act="${esc(a.act)}">
            <span class="fz-alert-n">${num(a.n)}</span><span class="fz-alert-t">${esc(a.t)}</span><span class="fz-alert-go" aria-hidden="true">→</span></button>`,
        )
        .join("")}</div></section>`;
  }

  // ─── card ───────────────────────────────────────────────────
  function htmlCard(v, d) {
    const st = d && v.stat ? v.stat(d) : null;
    const links = d ? v.link(d) : [];
    const cerca = `${v.titolo} ${v.desc} ${v.chiavi}`.toLowerCase();
    return `<article class="fz-card" data-act="${esc(v.act)}" data-cerca="${esc(cerca)}" tabindex="0" role="link" aria-label="Apri ${esc(v.titolo)}">
      <header class="fz-card-h"><span class="fz-ico" aria-hidden="true">${v.icona}</span><h3>${esc(v.titolo)}</h3></header>
      <p class="fz-desc">${esc(v.desc)}</p>
      ${
        v.stat
          ? `<div class="fz-stat"><strong>${st ? esc(st.valore) : "…"}</strong><span>${st ? esc(st.label) : ""}</span></div>`
          : ""
      }
      ${
        links.length
          ? `<div class="fz-links-h">${esc(v.intestaLink || "Collegamenti")}</div><ul class="fz-links">${links
              .map(
                (l) => `<li><button type="button" data-act="${esc(l.act)}"><span class="fz-l-t">${esc(l.testo)}</span>${l.sub ? `<span class="fz-l-s">${esc(l.sub)}</span>` : ""}</button></li>`,
              )
              .join("")}</ul>`
          : ""
      }
      <footer class="fz-open">${esc(v.apri || "Apri")} <span aria-hidden="true">→</span></footer>
    </article>`;
  }

  function htmlGruppi(d) {
    return GRUPPI.map(
      (g) => `<section class="fz-block fz-gruppo">
        <h2 class="fz-h">${esc(g.titolo)}</h2>
        <div class="fz-grid">${g.voci.map((v) => htmlCard(v, d)).join("")}</div>
      </section>`,
    ).join("");
  }

  // ─── render pagina ──────────────────────────────────────────
  function renderFunzioniPage() {
    const top = document.getElementById("topbar-actions");
    if (top)
      top.innerHTML = `<div class="year-sel"><button onclick="changeAnno(-1)" title="Anno precedente">&#9664;</button><span class="year-num">${state.anno}</span><button onclick="changeAnno(1)" title="Anno successivo">&#9654;</button></div>`;
    disegna();
    caricaFunzioni();
  }

  function disegna() {
    const c = document.getElementById("content");
    if (!c || state.page !== "funzioni") return;
    c.innerHTML = `<div class="hm">
      <div class="fz-intro">
        <div>
          <p class="fz-kicker">Studio Fiscale</p>
          <h2 class="fz-title">Cosa vuoi fare?</h2>
          <p class="fz-sub">Tutte le funzioni dell'app in un colpo d'occhio, con i numeri del ${state.anno} e i collegamenti diretti ai dati.</p>
        </div>
        <div class="search-wrap fz-search"><span class="search-icon">🔍</span>
          <input class="input" id="fz-search" type="search" placeholder="Cerca una funzione…" value="${esc(filtro)}" autocomplete="off" aria-label="Cerca una funzione"></div>
      </div>
      ${dati ? htmlAttenzione(dati) : ""}
      ${htmlGruppi(dati)}
      <p class="fz-none" id="fz-none" hidden>Nessuna funzione corrisponde alla ricerca.</p>
    </div>`;
    applicaFiltro();
  }

  function applicaFiltro() {
    const q = filtro.trim().toLowerCase();
    let visibili = 0;
    document.querySelectorAll(".fz-gruppo").forEach((g) => {
      let n = 0;
      g.querySelectorAll(".fz-card").forEach((c) => {
        const ok = !q || c.dataset.cerca.includes(q);
        c.hidden = !ok;
        if (ok) n++;
      });
      g.hidden = n === 0;
      visibili += n;
    });
    const none = document.getElementById("fz-none");
    if (none) none.hidden = visibili > 0;
    // con la ricerca attiva gli avvisi non servono
    document.querySelectorAll(".fz-block:not(.fz-gruppo)").forEach((b) => (b.hidden = !!q));
  }

  function caricaFunzioni() {
    if (typeof socket !== "undefined") socket.emit("get:funzioni", { anno: state.anno });
  }

  // ─── azioni ─────────────────────────────────────────────────
  function esegui(act) {
    const i = act.indexOf(":");
    const tipo = act.slice(0, i);
    const val = act.slice(i + 1);
    if (tipo === "page") {
      const nav = document.querySelector(`.nav-item[data-page="${val}"]`);
      if (nav) nav.click();
      else if (typeof renderPage === "function") renderPage(val);
    } else if (tipo === "cliente") {
      if (typeof goScadenzario === "function") goScadenzario(parseInt(val));
    } else if (tipo === "fn") {
      if (typeof window[val] === "function") window[val]();
    } else if (tipo === "url") {
      window.open(val, "_blank", "noopener");
    } else if (tipo === "click") {
      document.querySelector(val)?.click();
    }
  }

  document.addEventListener("click", (e) => {
    if (state.page !== "funzioni") return;
    const el = e.target.closest("#content [data-act]");
    if (el) esegui(el.dataset.act);
  });
  document.addEventListener("keydown", (e) => {
    if (state.page !== "funzioni") return;
    if (e.key === "Enter" && e.target.classList?.contains("fz-card")) esegui(e.target.dataset.act);
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "fz-search") {
      filtro = e.target.value;
      applicaFiltro();
    }
  });

  // ─── socket ─────────────────────────────────────────────────
  if (typeof socket !== "undefined") {
    socket.on("res:funzioni", ({ success, data }) => {
      if (!success) return;
      dati = data;
      if (state.page === "funzioni") {
        const attivo = document.activeElement?.id === "fz-search";
        disegna();
        if (attivo) {
          const s = document.getElementById("fz-search");
          s?.focus();
          s?.setSelectionRange(s.value.length, s.value.length);
        }
      }
    });
    // Se un altro utente (o tu altrove) modifica i dati, aggiorna i numeri
    socket.onAny((ev) => {
      if (state.page !== "funzioni" || !String(ev).startsWith("broadcast:")) return;
      clearTimeout(timer);
      timer = setTimeout(caricaFunzioni, 400);
    });
  }

  window.renderFunzioniPage = renderFunzioniPage;
  window.caricaFunzioni = caricaFunzioni;
})();
