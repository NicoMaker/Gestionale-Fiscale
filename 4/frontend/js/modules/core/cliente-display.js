// ═══════════════════════════════════════════════════════════════
// CLIENTE-DISPLAY.JS — Avatar, colori tipologia, classificazione sottotipo e periodo
// ═══════════════════════════════════════════════════════════════

// ─── AVATAR ADATTIVO ──────────────────────────────────────────
function getAvatar(nome) {
  if (!nome || nome.trim() === "") return "??";
  const words = nome
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;
  if (wordCount === 1) return words[0][0].toUpperCase();
  if (wordCount === 2) return (words[0][0] + words[1][0]).toUpperCase();
  const maxLetters = Math.min(wordCount, 3);
  let result = "";
  for (let i = 0; i < maxLetters; i++) result += words[i][0];
  return result.toUpperCase();
}

// ─── FONT SIZE AVATAR ─────────────────────────────────────────
function avatarFontSize(avatar, base) {
  const b = base || 13;
  const len = (avatar || "").length;
  if (len <= 2) return b + "px";
  if (len === 3) return Math.round(b * 0.78) + "px";
  return Math.round(b * 0.62) + "px";
}

// ─── TIPOLOGIA COLOR ──────────────────────────────────────────
function getTipologiaColor(tipCodice) {
  return (TIPOLOGIE_INFO[tipCodice] || {}).color || "var(--accent)";
}

// ─── SOTTOTIPO HELPERS ────────────────────────────────────────
function getCol3Options(tipCodice, col2Value) {
  // Try to get data from JSON configuration first
  if (typeof window !== "undefined" && window.TIPOLOGIE_CONFIG) {
    return _getCol3OptionsFromJson(tipCodice, col2Value);
  }

  // Fallback to hardcoded values for backward compatibility
  if (tipCodice === "SP" || tipCodice === "ASS")
    return [
      { value: "ordinaria", label: "Ordinaria" },
      { value: "semplificata", label: "Semplificata" },
    ];
  if (tipCodice === "SC") return [{ value: "ordinaria", label: "Ordinaria" }];
  if (tipCodice === "PF") {
    if (!col2Value || col2Value === "privato" || col2Value === "socio")
      return null;
    return [
      { value: "ordinario", label: "Ordinario" },
      { value: "semplificato", label: "Semplificato" },
      { value: "forfettario", label: "Forfettario" },
    ];
  }
  return null;
}

// Helper function to generate col3 options from JSON
function _getCol3OptionsFromJson(tipCodice, col2Value) {
  const cfg = window.TIPOLOGIE_CONFIG || {};
  const percorsi = cfg.percorsi?.[tipCodice] || [];
  const uniqueCol3 = new Map();

  percorsi.forEach((p) => {
    if (p.col3Label) {
      const col2Match =
        !col2Value ||
        (p.col2Label === "Ditta Individuale" && col2Value === "ditta") ||
        (p.col2Label && p.col2Label.toLowerCase() === col2Value);

      if (col2Match) {
        uniqueCol3.set(p.col3Label.toLowerCase(), p.col3Label);
      }
    }
  });

  if (uniqueCol3.size === 0) return null;

  return Array.from(uniqueCol3.entries()).map(([value, label]) => ({
    value,
    label,
  }));
}

function getSottotipoCode(tipCodice, col2, col3) {
  const key = `${tipCodice}|${col2 || ""}|${col3 || ""}`;
  return SOTTOTIPO_MAP[key] || null;
}

function getLabelSottotipologia(cliente) {
  if (
    cliente.sottotipologia_codice &&
    SOTTOTIPO_LABEL_MAP[cliente.sottotipologia_codice]
  )
    return SOTTOTIPO_LABEL_MAP[cliente.sottotipologia_codice];
  return cliente.sottotipologia_nome || null;
}

function getClassificazioneCompleta(c) {
  const parts = [];
  if (c.tipologia_codice) parts.push(c.tipologia_codice);
  if (c.col2_value) {
    const labels = {
      privato: "Privato",
      ditta: "Ditta Ind.",
      socio: "Socio",
      professionista: "Professionista",
    };
    parts.push(labels[c.col2_value] || c.col2_value);
  }
  if (c.col3_value) {
    const labels = {
      ordinario: "Ord.",
      semplificato: "Sempl.",
      forfettario: "Forf.",
      ordinaria: "Ord.",
      semplificata: "Sempl.",
    };
    parts.push(labels[c.col3_value] || c.col3_value);
  }
  if (c.periodicita)
    parts.push(
      c.periodicita === "mensile"
        ? "Mensile"
        : c.periodicita === "annuale"
          ? "Annuale"
          : "Trimestrale",
    );
  return parts.join(" · ");
}

// ─── PERIODO HELPERS ──────────────────────────────────────────
function getPeriodoLabel(r) {
  if (r.scadenza_tipo === "trimestrale") {
    const m = { 1: "Gen-Mar", 2: "Apr-Giu", 3: "Lug-Set", 4: "Ott-Dic" };
    return `${r.trimestre}° Trim. (${m[r.trimestre] || ""})`;
  }
  if (r.scadenza_tipo === "semestrale")
    return r.semestre === 1 ? "1° Sem. (Gen-Giu)" : "2° Sem. (Lug-Dic)";
  if (r.scadenza_tipo === "mensile") return MESI[(r.mese || 1) - 1] || "-";
  return "Annuale";
}

function getPeriodoShort(r) {
  if (r.scadenza_tipo === "trimestrale") return `T${r.trimestre}`;
  if (r.scadenza_tipo === "semestrale") return r.semestre === 1 ? "S1" : "S2";
  if (r.scadenza_tipo === "mensile") return MESI_SHORT[(r.mese || 1) - 1];
  return "Ann.";
}
