// ═══════════════════════════════════════════════════════════════
// PERSONALIZZA.JS — Temi, colori, misure, font ed effetti
//
// Come funziona: nessun CSS esistente viene toccato. Questo modulo
// genera un <style id="gf-personalizza"> (caricato per ultimo) che
// ridefinisce le variabili CSS (--accent, --bg, --sidebar-w, …) e le
// poche misure scritte "fisse" nei file CSS. Le scelte vengono
// salvate nel localStorage (chiave gf_personalizza).
//
// Va incluso nell'<head>, DOPO i fogli di stile, così gli stili
// salvati vengono applicati subito, senza "lampeggio".
// ═══════════════════════════════════════════════════════════════
(function () {
  "use strict";

  const STORAGE_KEY = "gf_personalizza";
  const STYLE_ID = "gf-personalizza";

  // ─── VALORI DI DEFAULT (quelli di modern-2026.css) ───────────
  const DEF = {
    light: {
      accent: "#4f46e5",
      accent2: "#d946ef",
      bg: "#f6f7fb",
      s0: "#ffffff",
      t0: "#0f1222",
      green: "#12805c",
      red: "#d92d3a",
      yellow: "#b7791f",
      blue: "#2563eb",
      orange: "#d9650b",
      purple: "#7c3aed",
    },
    dark: {
      accent: "#818cf8",
      accent2: "#e879f9",
      bg: "#0b0d16",
      s0: "#141827",
      t0: "#f1f3fb",
      green: "#34d399",
      red: "#f87171",
      yellow: "#fbbf24",
      blue: "#60a5fa",
      orange: "#fb923c",
      purple: "#a78bfa",
    },
  };
  // Colori del TEMA (cambiano con i temi) e colori di STATO (restano uguali
  // in ogni tema: verde = fatto, rosso = da fare, blu = parziale, ecc.)
  const TEMA_KEYS = ["accent", "accent2", "bg", "s0", "t0"];
  const STATO_KEYS = ["green", "red", "blue", "yellow", "orange", "purple"];
  const COLOR_KEYS = Object.keys(DEF.light);

  const MISURE_DEF = {
    zoom: 100, // % scala interfaccia
    sidebar: 252, // px
    topbar: 64, // px
    radius: 100, // % arrotondamento
    densita: "normale", // compatta | normale | comoda
    cellY: 12, // px spazio sopra/sotto il testo nelle celle
    cellX: 14, // px spazio a sinistra/destra nelle celle
    tFont: 13.5, // px testo delle tabelle
    headFont: 11, // px intestazioni delle tabelle
    pageX: 0, // px margine laterale pagina (0 = automatico)
    pageY: 0, // px margine alto/basso pagina (0 = automatico)
    maxW: 1680, // px larghezza massima contenuto (2400 = nessun limite)
  };
  const MISURE_RANGE = {
    zoom: [85, 130],
    sidebar: [200, 340],
    topbar: [48, 96],
    radius: [0, 200],
    cellY: [2, 36],
    cellX: [4, 40],
    tFont: [10, 20],
    headFont: [9, 16],
    pageX: [0, 80],
    pageY: [0, 80],
    maxW: [960, 2400],
  };
  // Valori delle 3 densità (bottoni «Compatta / Normale / Comoda»)
  const DENS_VAL = {
    compatta: { cellY: 5, cellX: 10, tFont: 12.5, headFont: 10 },
    normale: { cellY: 12, cellX: 14, tFont: 13.5, headFont: 11 },
    comoda: { cellY: 18, cellX: 18, tFont: 15, headFont: 12 },
  };

  const FONTS = {
    default: { label: "Predefinito (Inter)", css: null },
    jakarta: {
      label: "Plus Jakarta Sans",
      css: '"Plus Jakarta Sans", system-ui, sans-serif',
    },
    system: {
      label: "Di sistema",
      css: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    },
    serif: {
      label: "Con grazie (Fraunces)",
      css: '"Fraunces", Georgia, "Times New Roman", serif',
    },
    mono: {
      label: "Monospazio",
      css: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    },
  };

  // Font aggiuntivi (caricati da Google Fonts solo quando li scegli)
  Object.assign(FONTS, {
    nunito: { label: "Nunito (morbido)", css: '"Nunito", system-ui, sans-serif', gf: "Nunito:wght@400;600;700;800" },
    dmsans: { label: "DM Sans (pulito)", css: '"DM Sans", system-ui, sans-serif', gf: "DM+Sans:wght@400;500;600;700" },
    plex: { label: "IBM Plex Sans (tecnico)", css: '"IBM Plex Sans", system-ui, sans-serif', gf: "IBM+Plex+Sans:wght@400;500;600;700" },
    spacegrotesk: { label: "Space Grotesk (moderno)", css: '"Space Grotesk", system-ui, sans-serif', gf: "Space+Grotesk:wght@400;500;600;700" },
    poppins: { label: "Poppins (rotondo)", css: '"Poppins", system-ui, sans-serif', gf: "Poppins:wght@400;500;600;700" },
    lora: { label: "Lora (elegante, con grazie)", css: '"Lora", Georgia, serif', gf: "Lora:wght@400;500;600;700" },
    merriweather: { label: "Merriweather (lettura)", css: '"Merriweather", Georgia, serif', gf: "Merriweather:wght@400;700" },
    sourceserif: { label: "Source Serif (editoriale)", css: '"Source Serif 4", Georgia, serif', gf: "Source+Serif+4:wght@400;600;700" },
    playfair: { label: "Playfair (titoli eleganti)", css: '"Playfair Display", Georgia, serif', gf: "Playfair+Display:wght@400;600;700" },
  });
  const _fontCaricati = new Set();
  function caricaFont(id) {
    const f = FONTS[id];
    if (!f || !f.gf || _fontCaricati.has(id)) return;
    _fontCaricati.add(id);
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + f.gf + "&display=swap";
    document.head.appendChild(l);
  }

  // ─── TEMI PRONTI ─────────────────────────────────────────────
  // Ogni tema definisce accent, accent2, bg, s0, t0 per chiaro e scuro.
  const PRESETS = {
    default: { label: "Indaco (predefinito)", light: null, dark: null },
    classico: {
      label: "Classico",
      light: {
        accent: "#1a56db",
        accent2: "#3b82f6",
        bg: "#f3f4f6",
        s0: "#ffffff",
        t0: "#111827",
      },
      dark: {
        accent: "#60a5fa",
        accent2: "#93c5fd",
        bg: "#111827",
        s0: "#1f2937",
        t0: "#f9fafb",
      },
    },
    ledger: {
      label: "Ledger (carta e inchiostro)",
      light: {
        accent: "#1e3a5f",
        accent2: "#2c567f",
        bg: "#f7f5f1",
        s0: "#ffffff",
        t0: "#1c1b18",
      },
      dark: {
        accent: "#d4a24c",
        accent2: "#e3b563",
        bg: "#10131a",
        s0: "#1a1f29",
        t0: "#f0ede4",
      },
    },
    oceano: {
      label: "Oceano",
      light: {
        accent: "#0369a1",
        accent2: "#06b6d4",
        bg: "#f0f7fb",
        s0: "#ffffff",
        t0: "#0b1f2e",
      },
      dark: {
        accent: "#38bdf8",
        accent2: "#22d3ee",
        bg: "#07131c",
        s0: "#0e1f2c",
        t0: "#e6f3fb",
      },
    },
    smeraldo: {
      label: "Smeraldo",
      light: {
        accent: "#047857",
        accent2: "#14b8a6",
        bg: "#f1f8f4",
        s0: "#ffffff",
        t0: "#0c1f17",
      },
      dark: {
        accent: "#34d399",
        accent2: "#2dd4bf",
        bg: "#08150f",
        s0: "#10231a",
        t0: "#e4f5ec",
      },
    },
    menta: {
      label: "Menta",
      light: {
        accent: "#0a7a68",
        accent2: "#16a085",
        bg: "#eefaf6",
        s0: "#ffffff",
        t0: "#0d2a24",
      },
      dark: {
        accent: "#6ee7c7",
        accent2: "#a7f3d0",
        bg: "#07161a",
        s0: "#0d2328",
        t0: "#e3f8f1",
      },
    },
    pera: {
      label: "Pera",
      light: {
        accent: "#587512",
        accent2: "#7f9a1a",
        bg: "#f8f9ec",
        s0: "#ffffff",
        t0: "#252a10",
      },
      dark: {
        accent: "#c5d86d",
        accent2: "#e6d96a",
        bg: "#12150a",
        s0: "#1c210f",
        t0: "#f1f3e0",
      },
    },
    tramonto: {
      label: "Tramonto",
      light: {
        accent: "#c2410c",
        accent2: "#e11d48",
        bg: "#fbf4ef",
        s0: "#ffffff",
        t0: "#2a1409",
      },
      dark: {
        accent: "#fb923c",
        accent2: "#f43f5e",
        bg: "#1a0f0c",
        s0: "#26160f",
        t0: "#fbebe0",
      },
    },
    rosa: {
      label: "Rosa",
      light: {
        accent: "#be185d",
        accent2: "#8b5cf6",
        bg: "#fcf3f7",
        s0: "#ffffff",
        t0: "#2b0d1c",
      },
      dark: {
        accent: "#f472b6",
        accent2: "#a78bfa",
        bg: "#1a0b14",
        s0: "#26101d",
        t0: "#fbe6f0",
      },
    },
    grafite: {
      label: "Grafite",
      light: {
        accent: "#374151",
        accent2: "#6b7280",
        bg: "#f4f4f5",
        s0: "#ffffff",
        t0: "#18181b",
      },
      dark: {
        accent: "#d1d5db",
        accent2: "#9ca3af",
        bg: "#111113",
        s0: "#1b1b1e",
        t0: "#fafafa",
      },
    },
    contrasto: {
      label: "Alto contrasto",
      light: {
        accent: "#0000cc",
        accent2: "#0000cc",
        bg: "#ffffff",
        s0: "#ffffff",
        t0: "#000000",
      },
      dark: {
        accent: "#ffff00",
        accent2: "#ffff00",
        bg: "#000000",
        s0: "#0a0a0a",
        t0: "#ffffff",
      },
    },
  };

  // Temi aggiuntivi (js/modules/core/temi-extra.js)
  Object.assign(PRESETS, window.GF_TEMI_EXTRA || {});

  // ─── TASTI DA TASTIERA (fonte unica) ─────────────────────────
  // Questo elenco alimenta: il promemoria nel pannello, la guida in-app
  // (? / F1) e la pagina "Scorciatoie". I tasti reali sono gestiti più sotto.
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const MOD = isMac ? "⌘" : "Ctrl";
  const PRESET_IDS = Object.keys(PRESETS);
  const NUM_MAX = Math.min(9, PRESET_IDS.length); // i tasti numerici arrivano a 9
  const elencoTemi =
    PRESET_IDS.slice(0, NUM_MAX)
      .map((id, i) => `${i + 1} ${PRESETS[id].label.replace(/ \(.*\)/, "")}`)
      .join(", ") +
    (PRESET_IDS.length > NUM_MAX ? "; gli altri con ← / →" : "");

  const TASTI = {
    // Come aprire il pannello e cambiare tema (valgono ovunque)
    ovunque: [
      {
        key: "d",
        label: "Apre / chiude «Personalizza aspetto» (temi, colori, misure)",
      },
      { key: "t", label: "Passa dal tema chiaro al tema scuro e viceversa" },
      {
        key: `${MOD} K`,
        label: "Palette comandi: scrivi «Personalizza» e premi Invio",
      },
    ],
    // Valgono solo con il pannello aperto
    pannello: [
      {
        key: `1 … ${NUM_MAX}`,
        label: `Applica un tema pronto (${elencoTemi})`,
      },
      { key: "← / →", label: "Tema pronto precedente / successivo" },
      {
        key: "c",
        label: "Vai ai colori: il cursore va sul codice del colore accento",
      },
      {
        key: "#rrggbb",
        label:
          "Nei campi colore scrivi il codice (es. #1e3a5f): si applica subito",
      },
      {
        key: "m",
        label:
          "Vai alle misure (poi ← / → cambiano il valore, Home / End min e max)",
      },
      { key: "f", label: "Vai alla scelta del font" },
      { key: "x", label: "Vai a «Mescola»: accento, sfondo e font da temi diversi" },
      { key: "b", label: "Vai alle misure di tabelle e spazi (righe, celle, margini)" },
      { key: "s", label: "Vai ai colori di stato (verde, rosso, blu…)" },
      { key: "h", label: "Chiude il pannello e torna alla Home" },
      { key: "l / o", label: "Apre la Leggenda / la Paletta dei colori" },
      { key: "Tab / Shift Tab", label: "Scorri colori, misure e opzioni" },
      {
        key: "r",
        label: "Ripristina tutto ai valori originali (chiede conferma)",
      },
      { key: "e", label: "Esporta il tema in un file" },
      { key: "i", label: "Importa un tema da file" },
      {
        key: "Esc",
        label: "Chiude il pannello (in un campo di testo: esce dal campo)",
      },
    ],
  };

  window.GF_PERSONALIZZA = {
    TASTI,
    presets: PRESET_IDS.map((id) => ({ id, label: PRESETS[id].label })),
  };

  // ─── STATO ───────────────────────────────────────────────────
  function stato0() {
    const colori = () => COLOR_KEYS.reduce((o, k) => ((o[k] = null), o), {});
    return {
      v: 1,
      preset: "default",
      light: colori(),
      dark: colori(),
      misure: { ...MISURE_DEF },
      font: "default",
      effetti: { aurora: true, animazioni: true, leggibile: true, zebra: false, griglia: false },
    };
  }

  let state = stato0();

  // ─── UTILITÀ COLORE ──────────────────────────────────────────
  const HEX = /^#[0-9a-f]{6}$/i;
  const isHex = (v) => typeof v === "string" && HEX.test(v);

  function rgb(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  function rgba(hex, a) {
    const [r, g, b] = rgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function luminanza(hex) {
    const c = rgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const contrasto = (a, b) => {
    const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // Testo (bianco o scuro) più leggibile su TUTTA la sfumatura accento → accento2
  function testoSuAccento(a, a2) {
    const peggio = (t) => Math.min(contrasto(t, a), contrasto(t, a2));
    return peggio("#ffffff") >= peggio("#0b0d16") ? "#ffffff" : "#0b0d16";
  }
  const mix = (a, pa, b) => `color-mix(in srgb, ${a} ${pa}%, ${b})`;
  // Sposta un colore verso nero/bianco finché si legge (contrasto ≥ min) su tutti i fondi
  function mescolaHex(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return (
      "#" +
      A.map((v, i) =>
        Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0"),
      ).join("")
    );
  }
  function rendiLeggibile(col, fondi, min) {
    if (!isHex(col) || fondi.some((f) => !isHex(f))) return col;
    if (fondi.every((f) => contrasto(col, f) >= min)) return col;
    const chiaro = fondi.reduce((s, f) => s + luminanza(f), 0) / fondi.length > 0.4;
    const verso = chiaro ? "#000000" : "#ffffff";
    for (let t = 0.04; t <= 1.001; t += 0.04) {
      const r = mescolaHex(col, verso, t);
      if (fondi.every((f) => contrasto(r, f) >= min)) return r;
    }
    return verso;
  }

  // ─── SANITIZZAZIONE (localStorage e import: mai fidarsi) ─────
  const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, n));

  function sanifica(raw) {
    const s = stato0();
    if (!raw || typeof raw !== "object") return s;
    if (
      typeof raw.preset === "string" &&
      (raw.preset in PRESETS || raw.preset === "custom")
    )
      s.preset = raw.preset;
    ["light", "dark"].forEach((m) => {
      COLOR_KEYS.forEach((k) => {
        const v = raw[m] && raw[m][k];
        s[m][k] = isHex(v) ? v.toLowerCase() : null;
      });
    });
    const mi = raw.misure || {};
    Object.keys(MISURE_RANGE).forEach((k) => {
      const n = Number(mi[k]);
      s.misure[k] = Number.isFinite(n)
        ? Math.round(clamp(n, MISURE_RANGE[k]) * 2) / 2
        : MISURE_DEF[k];
    });
    if (mi.densita in DENS_VAL || mi.densita === "custom")
      s.misure.densita = mi.densita;
    if (raw.font in FONTS) s.font = raw.font;
    if (raw.effetti && typeof raw.effetti === "object") {
      s.effetti.aurora = raw.effetti.aurora !== false;
      s.effetti.animazioni = raw.effetti.animazioni !== false;
      s.effetti.leggibile = raw.effetti.leggibile !== false;
      s.effetti.zebra = raw.effetti.zebra === true;
      s.effetti.griglia = raw.effetti.griglia === true;
    }
    return s;
  }

  function carica() {
    try {
      const j = localStorage.getItem(STORAGE_KEY);
      if (j) state = sanifica(JSON.parse(j));
    } catch (_) {
      state = stato0();
    }
  }
  let _saveT = null;
  function salva() {
    clearTimeout(_saveT);
    _saveT = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (_) {}
    }, 150);
  }

  // ─── GENERAZIONE CSS ─────────────────────────────────────────
  function bloccoTema(sel, m, dark) {
    const c = state[m];
    const d = DEF[m];
    const v = [];
    const extra = [];

    // Accento + sfumatura
    if (c.accent || c.accent2) {
      let a = c.accent || d.accent;
      let a2 = c.accent2 || d.accent2;
      if (state.effetti.leggibile) {
        const f = [c.bg || d.bg, c.s0 || d.s0];
        a = rendiLeggibile(a, f, 4.5);
        a2 = rendiLeggibile(a2, f, 3);
      }
      v.push(
        `--accent:${a}`,
        `--accent-hov:${mix(a, 82, dark ? "white" : "black")}`,
        `--accent-d:${rgba(a, 0.1)}`,
        `--accent-b:${rgba(a, 0.24)}`,
        `--accent-glow:${rgba(a, 0.32)}`,
        `--accent-gradient:linear-gradient(135deg, ${a} 0%, ${a2} 100%)`,
        `--grad:linear-gradient(135deg, ${a} 0%, ${mix(a, 50, a2)} 55%, ${a2} 100%)`,
        `--grad-glow:${rgba(a, 0.45)}`,
      );
      // Testo leggibile sopra l'accento (bottoni, voce di menu attiva)
      const on = testoSuAccento(a, a2);
      v.push(`--on-accent:${on}`);
      extra.push(
        `${sel} .btn-primary,${sel} .nav-item.active,${sel} .nav-item.active .nav-label,${sel} .nav-item.active .nav-icon{color:var(--on-accent)}`,
      );
    }

    // Sfondo / schede / bordi / testo
    if (c.bg || c.s0 || c.t0) {
      const B = c.bg || d.bg;
      const S = c.s0 || d.s0;
      let T = c.t0 || d.t0;
      let testoCorretto = false;
      // Leggibilità: se il testo non si legge sullo sfondo scelto, lo correggo
      if (state.effetti.leggibile) {
        const T2 = rendiLeggibile(T, [B, S], 4.5);
        if (T2 !== T) {
          T = T2;
          testoCorretto = true;
        }
      }
      if (c.bg)
        v.push(`--bg:${c.bg}`, `--glass-bg:${mix(c.bg, 80, "transparent")}`);
      if (c.s0) v.push(`--s0:${S}`);
      if (c.bg || c.s0)
        v.push(
          `--s1:${mix(S, 95, T)}`,
          `--s2:${mix(S, 90, T)}`,
          `--s3:${mix(S, 84, T)}`,
          `--b0:${mix(S, 89, T)}`,
          `--b1:${mix(S, 80, T)}`,
          `--b2:${mix(S, 58, T)}`,
        );
      if (c.t0 || testoCorretto)
        v.push(
          `--t0:${T}`,
          `--t1:${mix(T, 86, S)}`,
          `--t2:${mix(T, 64, S)}`,
          `--t3:${mix(T, 46, S)}`,
        );
    }

    // Colori di STATO (verde, rosso, blu, giallo, arancio, viola):
    // non cambiano con i temi, solo se li modifichi tu.
    STATO_KEYS.forEach((k) => {
      if (!c[k]) return;
      let col = c[k];
      if (state.effetti.leggibile)
        col = rendiLeggibile(col, [c.s0 || d.s0, c.bg || d.bg], 3.2);
      v.push(`--${k}:${col}`, `--${k}-d:${rgba(col, 0.12)}`);
    });

    if (!v.length && !extra.length) return "";
    return (v.length ? `${sel}{${v.join(";")}}` : "") + extra.join("");
  }

  function buildCss() {
    const out = [];
    const L = 'html:not([data-theme="dark"])';
    const D = 'html[data-theme="dark"]';
    out.push(bloccoTema(L, "light", false), bloccoTema(D, "dark", true));

    const m = state.misure;
    const root = [];
    const rules = [];

    // Font
    if (FONTS[state.font] && FONTS[state.font].css)
      root.push(`--sans:${FONTS[state.font].css}`);

    // Larghezza sidebar e altezza topbar
    if (m.sidebar !== MISURE_DEF.sidebar)
      root.push(`--sidebar-w:${m.sidebar}px`);
    if (m.topbar !== MISURE_DEF.topbar) root.push(`--topbar-h:${m.topbar}px`);

    // Arrotondamento (scala tutti i raggi)
    if (m.radius !== MISURE_DEF.radius) {
      const k = m.radius / 100;
      const px = (n) => `${Math.round(n * k * 10) / 10}px`;
      root.push(
        `--radius:${px(10)}`,
        `--r-xs:${px(6)}`,
        `--r-sm:${px(8)}`,
        `--r-lg:${px(14)}`,
        `--r-xl:${px(18)}`,
      );
      // Raggi scritti "fissi" in aurora.css
      const fissi = [
        [".sidebar", 26],
        [".logo-icon", 14],
        [".nav-item", 12],
        [".theme-toggle", 14],
        [".topbar", 20],
        [".stat-card", 20],
        [".cliente-card", 20],
        [".modal", 26],
        [".toast", 16],
        [".cmdk", 24],
        ["input:not([type=checkbox]):not([type=radio])", 12],
        ["select", 12],
        ["textarea", 12],
      ];
      fissi.forEach(([sel, n]) =>
        rules.push(`html ${sel}{border-radius:${px(n)}}`),
      );
    }

    // Tabelle: spazi e dimensione del testo (solo le misure cambiate)
    const D0 = MISURE_DEF;
    const r1 = (n) => Math.round(n * 10) / 10;
    if (m.cellY !== D0.cellY || m.cellX !== D0.cellX || m.tFont !== D0.tFont) {
      const Y = m.cellY,
        X = m.cellX,
        F = m.tFont;
      rules.push(
        `html tbody td{padding:${Y}px ${X}px;font-size:${F}px}`,
        `html thead th{padding:${Math.max(3, Y - 1)}px ${X}px}`,
        `html .gxlv-td{padding:${r1(Y * 0.5)}px ${r1(X * 0.5)}px}`,
        `html .gxlv-td-cliente{padding:${r1(Y * 0.85)}px ${r1(X * 0.85)}px}`,
        `html .gxlv-th{padding:${r1(Y * 0.75)}px ${r1(X * 0.7)}px}`,
        `html .sint-table .sint-td{padding:${r1(Y / 3)}px ${r1(X / 3)}px}`,
        `html .sint-table .sint-td-cliente{padding:${r1(Y * 0.65)}px ${r1(X * 0.85)}px}`,
      );
    }
    if (m.headFont !== D0.headFont)
      rules.push(
        `html thead th,html .gxlv-th,html .sint-table thead th{font-size:${m.headFont}px}`,
      );
    // Margini della pagina e larghezza massima del contenuto
    if (m.pageX || m.pageY) {
      const py = m.pageY ? m.pageY + "px" : "clamp(14px, 2.4vw, 32px)";
      const px = m.pageX ? m.pageX + "px" : "clamp(14px, 2.4vw, 32px)";
      rules.push(`html .content{padding:${py} ${px}}`);
    }
    if (m.maxW !== D0.maxW)
      rules.push(
        `html .content{max-width:${m.maxW >= 2400 ? "none" : m.maxW + "px"}}`,
      );
    if (state.effetti.zebra)
      rules.push(
        "html tbody tr:nth-child(even):not(:hover){background:color-mix(in srgb, var(--t0) 4%, transparent)}",
      );
    if (state.effetti.griglia)
      rules.push(
        "html tbody td,html thead th{border-right:1px solid var(--b1);border-bottom:1px solid var(--b1)}",
      );

    // Effetti
    if (!state.effetti.aurora)
      rules.push("html body::before,html body::after{display:none!important}");
    if (!state.effetti.animazioni)
      rules.push(
        "html *,html *::before,html *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}",
      );

    // Scala interfaccia (zoom): compensa le altezze in vh
    if (m.zoom !== MISURE_DEF.zoom) {
      root.push(`--ui-zoom:${m.zoom / 100}`);
      rules.push(
        "html body{zoom:var(--ui-zoom);height:calc(100% / var(--ui-zoom))}",
        "html .sidebar{height:calc((100vh - 24px) / var(--ui-zoom))}",
        "@media (max-width:900px){html .sidebar{height:calc(100vh / var(--ui-zoom))}}",
        "html .modal,html .modal-lg,html .modal-sm{max-height:calc(90dvh / var(--ui-zoom))}",
        "html .kb-guida{max-height:calc(94vh / var(--ui-zoom))}",
        "html .sint-table-wrap{max-height:calc(72vh / var(--ui-zoom))}",
      );
    }

    if (root.length) out.push(`html:root{${root.join(";")}}`);
    return out.concat(rules).join("\n");
  }

  function applica() {
    caricaFont(state.font);
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = buildCss();

    // Colore della barra del browser (mobile)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const dark = modo() === "dark";
      meta.setAttribute(
        "content",
        state[modo()].bg || DEF[dark ? "dark" : "light"].bg,
      );
    }
  }

  function modo() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  // Applica subito (siamo nell'<head>)
  carica();
  applica();

  // ═════════════════════════════════════════════════════════════
  // PANNELLO
  // ═════════════════════════════════════════════════════════════
  let panel = null;
  let aperto = false; // stato logico: vero da subito dopo apri(), falso subito dopo chiudi()

  const COLORI_TEMA_UI = [
    ["accent", "Accento"],
    ["accent2", "Accento secondario (sfumatura)"],
    ["bg", "Sfondo pagina"],
    ["s0", "Schede e pannelli"],
    ["t0", "Testo"],
  ];
  const COLORI_STATO_UI = [
    ["green", "🟢 Verde · completato, successo"],
    ["red", "🔴 Rosso · da fare, errore"],
    ["blue", "🔵 Blu · parziale, in lavorazione"],
    ["yellow", "🟡 Giallo · in corso, avviso"],
    ["orange", "🟠 Arancio · scaduto"],
    ["purple", "🟣 Viola · solo testo"],
  ];
  const COLORI_UI = COLORI_TEMA_UI.concat(COLORI_STATO_UI);

  const SLIDERS_UI = [
    ["zoom", "Scala interfaccia", "%", 5],
    ["sidebar", "Larghezza menu laterale", "px", 4],
    ["topbar", "Altezza barra superiore", "px", 2],
    ["radius", "Arrotondamento angoli", "%", 10],
  ];
  const SLIDERS_TAB_UI = [
    ["cellY", "Altezza righe (spazio sopra e sotto)", "px", 1],
    ["cellX", "Spazio nelle celle (sinistra e destra)", "px", 1],
    ["tFont", "Grandezza testo delle tabelle", "px", 0.5],
    ["headFont", "Grandezza testo intestazioni", "px", 0.5],
    ["pageY", "Margine pagina in alto e in basso", "px", 2],
    ["pageX", "Margine pagina a destra e a sinistra", "px", 2],
    ["maxW", "Larghezza massima del contenuto", "px", 20],
  ];
  const ALL_SLIDERS = SLIDERS_UI.concat(SLIDERS_TAB_UI);
  const fmtMis = (k, v) =>
    (k === "pageX" || k === "pageY") && !v
      ? "auto"
      : k === "maxW" && v >= 2400
        ? "illimitata"
        : v + ALL_SLIDERS.find((x) => x[0] === k)[2];

  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );

  // "Shift Tab" → <kbd>Shift</kbd> <kbd>Tab</kbd>; "a / b" → a oppure b
  function kbdHtml(k) {
    return k
      .split(" / ")
      .map((p) =>
        p
          .split(" ")
          .map((x) => `<kbd>${esc(x)}</kbd>`)
          .join(" "),
      )
      .join(' <span class="pz-or">oppure</span> ');
  }

  let _statusT = null;
  function annuncia(msg) {
    const el = panel && panel.querySelector("#pz-status");
    if (!el) return;
    el.textContent = msg;
    clearTimeout(_statusT);
    _statusT = setTimeout(() => (el.textContent = ""), 2500);
  }

  function costruisciPannello() {
    panel = document.createElement("aside");
    panel.className = "pz-panel";
    panel.id = "pz-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Personalizza aspetto");
    panel.hidden = true;

    const presetsHtml = Object.entries(PRESETS)
      .map(
        ([id, p]) =>
          `<button type="button" class="pz-preset" data-preset="${id}" title="${esc(p.label)}"
              ${PRESET_IDS.indexOf(id) < NUM_MAX ? `aria-keyshortcuts="${PRESET_IDS.indexOf(id) + 1}"` : ""}>
            <span class="pz-sw"></span>
            <span class="pz-preset-name">${esc(p.label)}</span>
            ${PRESET_IDS.indexOf(id) < NUM_MAX ? `<kbd class="pz-num">${PRESET_IDS.indexOf(id) + 1}</kbd>` : ""}
          </button>`,
      )
      .join("");

    const rigaColore = ([k, label]) => `
        <div class="pz-row">
          <label for="pz-h-${k}">${esc(label)}<small class="pz-cr" id="pz-cr-${k}"></small></label>
          <input type="text" id="pz-h-${k}" class="pz-hex" data-hex="${k}"
            maxlength="7" spellcheck="false" autocomplete="off"
            aria-label="Codice colore ${esc(label)}" />
          <input type="color" id="pz-c-${k}" data-color="${k}"
            aria-label="Selettore colore ${esc(label)}" />
          <button type="button" class="pz-mini" data-reset-color="${k}" title="Ripristina">↺</button>
        </div>`;
    const coloriHtml = COLORI_TEMA_UI.map(rigaColore).join("");
    const statoHtml = COLORI_STATO_UI.map(rigaColore).join("");

    const sliderRiga = ([k, label]) => `
        <div class="pz-row pz-row-range">
          <label for="pz-m-${k}">${esc(label)}</label>
          <output id="pz-o-${k}"></output>
          <input type="range" id="pz-m-${k}" data-misura="${k}"
            min="${MISURE_RANGE[k][0]}" max="${MISURE_RANGE[k][1]}"
            step="${ALL_SLIDERS.find((x) => x[0] === k)[3]}" />
        </div>`;
    const slidersHtml = SLIDERS_UI.map(sliderRiga).join("");
    const slidersTabHtml = SLIDERS_TAB_UI.map(sliderRiga).join("");

    const fontHtml = Object.entries(FONTS)
      .map(([id, f]) => `<option value="${id}">${esc(f.label)}</option>`)
      .join("");
    const mixOpt = `<option value="">— nessuno (resta com'è) —</option>` +
      Object.entries(PRESETS)
        .map(([id, p]) => `<option value="${id}">${esc(p.label)}</option>`)
        .join("");

    panel.innerHTML = `
      <header class="pz-head">
        <h2>🎨 Personalizza aspetto</h2>
        <span class="pz-head-btns">
          <button type="button" class="pz-close" data-pz="home" title="Torna alla Home (h)" aria-label="Torna alla Home">🏠</button>
          <button type="button" class="pz-close" data-pz="chiudi" aria-label="Chiudi">✕</button>
        </span>
      </header>
      <nav class="pz-nav" aria-label="Sezioni del pannello">
        <button type="button" data-vai="temi">Temi</button>
        <button type="button" data-vai="mix">Mescola</button>
        <button type="button" data-vai="colori">Colori</button>
        <button type="button" data-vai="stato">Stato</button>
        <button type="button" data-vai="misure">Misure</button>
        <button type="button" data-vai="tabelle">Tabelle</button>
        <button type="button" data-vai="font">Font</button>
        <button type="button" data-vai="effetti">Effetti</button>
      </nav>
      <div class="pz-body">
        <section class="pz-sec" id="pz-sec-temi">
          <h3>Temi pronti <span class="pz-modo">· ${PRESET_IDS.length} temi, ognuno con versione chiara e scura</span></h3>
          <div class="pz-presets">${presetsHtml}</div>
        </section>

        <section class="pz-sec" id="pz-sec-mix">
          <h3>🧪 Mescola temi</h3>
          <p class="pz-hint">Prendi l'accento da un tema e lo sfondo con il testo da un altro. Il carattere si sceglie a parte (sezione Font) e non cambia con i temi.</p>
          <div class="pz-row"><label for="pz-mix-acc">Accento da</label><select id="pz-mix-acc">${mixOpt}</select></div>
          <div class="pz-row"><label for="pz-mix-sfo">Sfondo e testo da</label><select id="pz-mix-sfo">${mixOpt}</select></div>
        </section>

        <section class="pz-sec" id="pz-sec-colori">
          <h3>Colori del tema <span class="pz-modo" id="pz-modo"></span></h3>
          <p class="pz-hint">Scrivi il codice (es. <b>#1e3a5f</b>) oppure usa il selettore: si applica subito a tutta l'app. Valgono per il tema attivo; per l'altro usa il pulsante.</p>
          <button type="button" class="pz-btn" data-pz="cambia-tema">🌓 Passa a tema <span id="pz-altro"></span></button>
          ${coloriHtml}
        </section>

        <section class="pz-sec" id="pz-sec-stato">
          <h3>Colori di stato</h3>
          <p class="pz-hint">Verde, rosso, blu… <b>restano uguali in ogni tema</b>: cambiando tema non si confondono mai. Puoi comunque cambiarli qui.</p>
          ${statoHtml}
        </section>

        <section class="pz-sec" id="pz-sec-misure">
          <h3>Misure dell'interfaccia</h3>
          ${slidersHtml}
        </section>

        <section class="pz-sec" id="pz-sec-tabelle">
          <h3>Tabelle e spazi</h3>
          <div class="pz-row pz-row-seg">
            <span class="pz-lbl">Densità rapida</span>
            <span class="pz-seg">
              <button type="button" data-densita="compatta">Compatta</button>
              <button type="button" data-densita="normale">Normale</button>
              <button type="button" data-densita="comoda">Comoda</button>
            </span>
          </div>
          ${slidersTabHtml}
          <label class="pz-check"><input type="checkbox" id="pz-zebra" /> Righe a strisce (zebra)</label>
          <label class="pz-check"><input type="checkbox" id="pz-griglia" /> Griglia completa tra le celle</label>
        </section>

        <section class="pz-sec" id="pz-sec-font">
          <h3>Carattere</h3>
          <div class="pz-row">
            <label for="pz-font">Font dell'interfaccia</label>
            <select id="pz-font">${fontHtml}</select>
          </div>
          <div class="pz-row"><button type="button" class="pz-btn" data-pz="font-tema" id="pz-font-tema">🔤 Usa il font consigliato dal tema</button></div>
        </section>

        <section class="pz-sec" id="pz-sec-effetti">
          <h3>Effetti e leggibilità</h3>
          <label class="pz-check"><input type="checkbox" id="pz-aurora" /> Sfondo sfumato (aurora)</label>
          <label class="pz-check"><input type="checkbox" id="pz-anim" /> Animazioni e transizioni</label>
          <label class="pz-check"><input type="checkbox" id="pz-leggibile" /> Correggi in automatico i colori poco leggibili</label>
        </section>
      </div>
      <details class="pz-keys">
        <summary>⌨️ Comandi da tastiera</summary>
        <table>${TASTI.ovunque
          .concat(TASTI.pannello)
          .map(
            (t) =>
              `<tr><td>${kbdHtml(t.key)}</td><td>${esc(t.label)}</td></tr>`,
          )
          .join("")}</table>
        <button type="button" class="pz-btn" data-pz="guida">Guida tasti (?)</button>
        <button type="button" class="pz-btn" data-pz="manuale">📖 Guida completa</button>
      </details>
      <div class="pz-status" id="pz-status" role="status" aria-live="polite"></div>
      <footer class="pz-foot">
        <button type="button" class="pz-btn pz-danger" data-pz="reset">Ripristina tutto</button>
        <button type="button" class="pz-btn" data-pz="leggenda">Leggenda</button>
        <button type="button" class="pz-btn" data-pz="paletta">Paletta</button>
        <button type="button" class="pz-btn" data-pz="esporta">Esporta</button>
        <button type="button" class="pz-btn" data-pz="importa">Importa</button>
        <input type="file" id="pz-file" accept="application/json,.json" hidden />
      </footer>`;
    document.body.appendChild(panel);

    // ── Eventi ──
    panel.addEventListener("input", onInput);
    panel.addEventListener("change", onChange);
    panel.addEventListener("click", onClick);
    // Se cambia il tema chiaro/scuro, aggiorna colori e pannello
    new MutationObserver(() => {
      applica();
      sincronizza();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  function sincronizza() {
    if (!panel) return;
    const mo = modo();
    const d = DEF[mo];
    const c = state[mo];

    panel.querySelector("#pz-modo").textContent =
      mo === "dark" ? "· tema scuro" : "· tema chiaro";
    panel.querySelector("#pz-altro").textContent =
      mo === "dark" ? "chiaro" : "scuro";

    COLORI_UI.forEach(([k]) => {
      const inp = panel.querySelector(`#pz-c-${k}`);
      inp.value = c[k] || d[k];
      const hx = panel.querySelector(`#pz-h-${k}`);
      if (hx && document.activeElement !== hx) {
        hx.value = c[k] || d[k];
        hx.classList.remove("pz-bad");
      }
      panel.querySelector(`[data-reset-color="${k}"]`).style.visibility = c[k]
        ? "visible"
        : "hidden";
    });

    ALL_SLIDERS.forEach(([k]) => {
      panel.querySelector(`#pz-m-${k}`).value = state.misure[k];
      panel.querySelector(`#pz-o-${k}`).textContent = fmtMis(k, state.misure[k]);
    });

    // Contrasto di ogni colore (lettura: ≥ 4.5 ottimo, ≥ 3 sufficiente per elementi grandi)
    const eff = (k) => c[k] || d[k];
    const fondoS = eff("s0");
    COLORI_UI.forEach(([k]) => {
      const el = panel.querySelector(`#pz-cr-${k}`);
      if (!el) return;
      if (k === "bg" || k === "s0") {
        el.textContent = "";
        return;
      }
      const rif = k === "accent2" ? 3 : STATO_KEYS.includes(k) ? 3.2 : 4.5;
      const r = contrasto(eff(k), k === "t0" ? fondoS : fondoS);
      const ok = r >= rif;
      el.className = "pz-cr " + (ok ? "ok" : "bad");
      el.textContent = ok
        ? `leggibilità ${r.toFixed(1)}:1 ✓`
        : `⚠ poco leggibile ${r.toFixed(1)}:1` +
          (state.effetti.leggibile ? " · corretto in automatico" : "");
    });
    const tema = PRESETS[state.preset];
    const bf = panel.querySelector("#pz-font-tema");
    if (bf) {
      bf.disabled = !(tema && tema.font);
      bf.textContent =
        tema && tema.font
          ? `🔤 Usa il font del tema: ${FONTS[tema.font].label}`
          : "🔤 Questo tema non ha un font consigliato";
    }
    const set = (id, v) => {
      const e = panel.querySelector(id);
      if (e) e.checked = v;
    };
    set("#pz-zebra", state.effetti.zebra);
    set("#pz-griglia", state.effetti.griglia);
    set("#pz-leggibile", state.effetti.leggibile);

    panel.querySelectorAll("[data-densita]").forEach((b) => {
      const on = b.dataset.densita === state.misure.densita;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });

    panel.querySelector("#pz-font").value = state.font;
    panel.querySelector("#pz-aurora").checked = state.effetti.aurora;
    panel.querySelector("#pz-anim").checked = state.effetti.animazioni;

    panel.querySelectorAll(".pz-preset").forEach((b) => {
      const id = b.dataset.preset;
      const p = PRESETS[id];
      const col = p[mo] || DEF[mo];
      const sw = b.querySelector(".pz-sw");
      sw.style.background = `linear-gradient(135deg, ${col.accent} 0 50%, ${col.accent2 || col.accent} 50% 100%)`;
      sw.style.borderColor = col.bg || DEF[mo].bg;
      sw.style.boxShadow = `0 0 0 3px ${col.bg || DEF[mo].bg}`;
      b.classList.toggle("on", state.preset === id);
    });
  }

  function aggiorna() {
    applica();
    sincronizza();
    salva();
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.hex) {
      const k = t.dataset.hex;
      let v = t.value.trim().toLowerCase();
      if (v && v[0] !== "#") v = "#" + v;
      if (/^#[0-9a-f]{3}$/.test(v))
        v = "#" + v.slice(1).replace(/./g, (c) => c + c);
      if (isHex(v)) {
        t.classList.remove("pz-bad");
        state[modo()][k] = v;
        state.preset = "custom";
        panel.querySelector(`#pz-c-${k}`).value = v;
        panel.querySelector(`[data-reset-color="${k}"]`).style.visibility =
          "visible";
        panel
          .querySelectorAll(".pz-preset.on")
          .forEach((b) => b.classList.remove("on"));
        applica();
        salva();
      } else {
        t.classList.add("pz-bad");
      }
    } else if (t.dataset.color) {
      const hx = panel.querySelector(`#pz-h-${t.dataset.color}`);
      if (hx) {
        hx.value = t.value.toLowerCase();
        hx.classList.remove("pz-bad");
      }
      state[modo()][t.dataset.color] = t.value.toLowerCase();
      state.preset = "custom";
      applica();
      // aggiorno solo i pulsanti reset/preset senza toccare il color picker in uso
      panel.querySelector(
        `[data-reset-color="${t.dataset.color}"]`,
      ).style.visibility = "visible";
      panel
        .querySelectorAll(".pz-preset.on")
        .forEach((b) => b.classList.remove("on"));
      salva();
    } else if (t.dataset.misura) {
      state.misure[t.dataset.misura] = Number(t.value);
      if (["cellY", "cellX", "tFont", "headFont"].includes(t.dataset.misura)) {
        state.misure.densita = "custom";
        panel
          .querySelectorAll("[data-densita]")
          .forEach((b) => b.classList.remove("on"));
      }
      panel.querySelector(`#pz-o-${t.dataset.misura}`).textContent = fmtMis(
        t.dataset.misura,
        Number(t.value),
      );
      applica();
      salva();
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.dataset && t.dataset.hex) {
      sincronizza(); // se il codice è incompleto/non valido torna al valore attivo
      return;
    }
    if (t.id === "pz-font") {
      state.font = t.value in FONTS ? t.value : "default";
      aggiorna();
    } else if (t.id === "pz-aurora") {
      state.effetti.aurora = t.checked;
      aggiorna();
    } else if (t.id === "pz-anim") {
      state.effetti.animazioni = t.checked;
      aggiorna();
    } else if (t.id === "pz-zebra") {
      state.effetti.zebra = t.checked;
      aggiorna();
    } else if (t.id === "pz-griglia") {
      state.effetti.griglia = t.checked;
      aggiorna();
    } else if (t.id === "pz-leggibile") {
      state.effetti.leggibile = t.checked;
      aggiorna();
    } else if (t.id === "pz-mix-acc" || t.id === "pz-mix-sfo") {
      applicaMix(
        panel.querySelector("#pz-mix-acc").value,
        panel.querySelector("#pz-mix-sfo").value,
      );
    } else if (t.id === "pz-file") {
      importaFile(t.files && t.files[0]);
      t.value = "";
    }
  }

  function onClick(e) {
    const b = e.target.closest("button");
    if (!b || !panel.contains(b)) return;

    if (b.dataset.preset) return applicaPreset(b.dataset.preset);

    if (b.dataset.resetColor) {
      state[modo()][b.dataset.resetColor] = null;
      state.preset = "custom";
      return aggiorna();
    }
    if (b.dataset.densita) {
      Object.assign(state.misure, DENS_VAL[b.dataset.densita], {
        densita: b.dataset.densita,
      });
      return aggiorna();
    }
    if (b.dataset.vai) return vaiSezione(b.dataset.vai);
    switch (b.dataset.pz) {
      case "chiudi":
        return chiudi();
      case "cambia-tema":
        if (window.toggleTheme) window.toggleTheme();
        return;
      case "reset":
        return ripristinaTutto();
      case "guida":
        return window.apriGuidaTastiera && window.apriGuidaTastiera();
      case "manuale":
        return window.open("guida.html", "_blank", "noopener");
      case "home":
        chiudi();
        return window.GF_AZIONI && window.GF_AZIONI.home();
      case "leggenda":
        return window.GF_AZIONI && window.GF_AZIONI.leggenda();
      case "paletta":
        return window.GF_AZIONI && window.GF_AZIONI.paletta();
      case "font-tema": {
        const t = PRESETS[state.preset];
        if (t && t.font) {
          state.font = t.font;
          aggiorna();
          annuncia(`Font: ${FONTS[t.font].label}`);
        }
        return;
      }
      case "esporta":
        return esporta();
      case "importa":
        return panel.querySelector("#pz-file").click();
    }
  }

  function ripristinaTutto() {
    if (confirm("Ripristinare colori, misure e font ai valori originali?")) {
      state = stato0();
      aggiorna();
      annuncia("Tutto ripristinato ai valori originali");
    }
  }

  function applicaPreset(id) {
    const p = PRESETS[id];
    if (!p) return;
    ["light", "dark"].forEach((m) => {
      TEMA_KEYS.forEach((k) => (state[m][k] = null));
      if (p[m]) TEMA_KEYS.forEach((k) => p[m][k] && (state[m][k] = p[m][k]));
    });
    state.preset = id;
    aggiorna();
    annuncia(`Tema: ${p.label}`);
  }

  // Mescola: accento da un tema, sfondo + testo da un altro
  function applicaMix(accId, sfoId) {
    if (!accId && !sfoId) return;
    ["light", "dark"].forEach((m) => {
      const val = (id) => (PRESETS[id] && PRESETS[id][m]) || DEF[m];
      if (accId) {
        const a = val(accId);
        state[m].accent = a.accent;
        state[m].accent2 = a.accent2;
      }
      if (sfoId) {
        const b = val(sfoId);
        state[m].bg = b.bg;
        state[m].s0 = b.s0;
        state[m].t0 = b.t0;
      }
    });
    state.preset = "custom";
    aggiorna();
    annuncia("Temi mescolati");
  }

  function vaiSezione(id) {
    const sec = panel && panel.querySelector(`#pz-sec-${id}`);
    if (!sec) return;
    sec.scrollIntoView({ block: "start", behavior: "smooth" });
    const f = sec.querySelector("input:not([type=hidden]),select,button");
    if (f) f.focus({ preventScroll: true });
  }

  function temaRelativo(delta) {
    const i = PRESET_IDS.indexOf(state.preset);
    const n = PRESET_IDS.length;
    const next = i < 0 ? (delta > 0 ? 0 : n - 1) : (i + delta + n) % n;
    applicaPreset(PRESET_IDS[next]);
  }

  // ─── ESPORTA / IMPORTA ───────────────────────────────────────
  function esporta() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gestionale-tema.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importaFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        state = sanifica(JSON.parse(String(r.result)));
        aggiorna();
      } catch (_) {
        alert("File non valido: impossibile importare il tema.");
      }
    };
    r.readAsText(file);
  }

  // ─── APRI / CHIUDI ───────────────────────────────────────────
  function apri() {
    if (!panel) costruisciPannello();
    sincronizza();
    aperto = true;
    panel.hidden = false;
    requestAnimationFrame(() => aperto && panel.classList.add("open"));
    const first = panel.querySelector(".pz-preset");
    if (first) first.focus({ preventScroll: true });
  }
  function chiudi() {
    if (!panel) return;
    aperto = false;
    panel.classList.remove("open");
    setTimeout(() => {
      if (!aperto) panel.hidden = true;
    }, 220);
  }
  function toggle() {
    if (aperto) chiudi();
    else apri();
  }

  // ─── TASTIERA (attiva solo a pannello aperto) ────────────────
  // Registrato all'avvio, prima di shortcuts.js: con il pannello aperto i
  // suoi tasti hanno la precedenza su quelli delle pagine (es. "e", "r").
  function scrivendo(t) {
    if (!t) return false;
    if (
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable
    )
      return true;
    return (
      t.tagName === "INPUT" &&
      /^(text|search|number|email|url|tel|password)$/.test(t.type || "text")
    );
  }
  const vai = (sel) => {
    const el = panel && panel.querySelector(sel);
    if (!el) return;
    el.focus();
    if (el.select) el.select();
    el.scrollIntoView({ block: "center" });
  };

  document.addEventListener("keydown", (e) => {
    if (!panel || !aperto) return;
    if (e.defaultPrevented || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const digitando = scrivendo(t);
    const fatto = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    if (e.key === "Escape") {
      fatto();
      if (digitando) t.blur();
      else chiudi();
      return;
    }
    if (digitando) return; // niente tasti "lettera" mentre si scrive

    const n = Number(e.key);
    if (!e.shiftKey && n >= 1 && n <= NUM_MAX && /^\d$/.test(e.key)) {
      fatto();
      return applicaPreset(PRESET_IDS[n - 1]);
    }
    // ← / → cambiano tema, tranne sugli slider dove regolano il valore
    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      !(t && t.type === "range")
    ) {
      fatto();
      return temaRelativo(e.key === "ArrowRight" ? 1 : -1);
    }
    if (e.shiftKey) return;
    switch (e.key.toLowerCase()) {
      case "d":
        fatto();
        return chiudi();
      case "t":
        fatto();
        return window.toggleTheme && window.toggleTheme();
      case "c":
        fatto();
        return vai("#pz-h-accent");
      case "m":
        fatto();
        return vai("#pz-m-zoom");
      case "f":
        fatto();
        return vai("#pz-font");
      case "x":
        fatto();
        return vai("#pz-mix-acc");
      case "b":
        fatto();
        return vai("#pz-m-cellY");
      case "s":
        fatto();
        return vai("#pz-h-green");
      case "h":
        fatto();
        chiudi();
        return window.GF_AZIONI && window.GF_AZIONI.home();
      case "l":
        fatto();
        return window.GF_AZIONI && window.GF_AZIONI.leggenda();
      case "o":
        fatto();
        return window.GF_AZIONI && window.GF_AZIONI.paletta();
      case "r":
        fatto();
        return ripristinaTutto();
      case "e":
        fatto();
        return esporta();
      case "i":
        fatto();
        return panel.querySelector("#pz-file").click();
    }
  });

  // API per Leggenda / Paletta / guida
  Object.assign(window.GF_PERSONALIZZA, {
    stato: () => state,
    applica, // riapplica i colori (usato da guida.html quando cambia il tema)
    // Colore effettivo di ogni chiave nel tema attivo (scelto da te oppure di default)
    effettivi: () => {
      const o = {};
      COLOR_KEYS.forEach((k) => (o[k] = state[modo()][k] || DEF[modo()][k]));
      return o;
    },
    modo,
    contrasto,
    apriColore: (k) => {
      apri();
      requestAnimationFrame(() => vai(`#pz-h-${k}`));
    },
    apriSezione: (id) => {
      apri();
      requestAnimationFrame(() => vaiSezione(id));
    },
  });
  window.apriPersonalizza = apri;
  window.chiudiPersonalizza = chiudi;
  window.togglePersonalizza = toggle;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-personalizza");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
        if (
          window.mobileSidebar &&
          window.mobileSidebar.isOpen &&
          window.mobileSidebar.isOpen()
        )
          window.mobileSidebar.close();
      });
    }
    applica(); // ora data-theme e <meta theme-color> esistono
  });
})();
