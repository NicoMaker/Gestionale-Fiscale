// ═══════════════════════════════════════════════════════════════
// CLIENTE-BOX.JS — Box informazioni cliente e dati di riferimento
// ═══════════════════════════════════════════════════════════════

// ─── CLIENTE INFO BOX ─────────────────────────────────────────
function renderClienteInfoBox(cliente) {
  if (!cliente) return "";
  const avatar = getAvatar(cliente.nome);
  const tipColor = getTipologiaColor(cliente.tipologia_codice);
  const tipBadge = cliente.tipologia_codice
    ? `<span class="badge b-${(cliente.tipologia_codice || "").toLowerCase()}" title="${TIPOLOGIE_INFO[cliente.tipologia_codice]?.desc || cliente.tipologia_codice}">${cliente.tipologia_codice}</span>`
    : "";
  const sottotipoLabel = getLabelSottotipologia(cliente);
  const subBadge = sottotipoLabel
    ? `<span class="badge b-categoria" title="Sottotipologia: ${sottotipoLabel}">📋 ${sottotipoLabel}</span>`
    : "";
  let classCols = "";
  if (cliente.col2_value || cliente.col3_value || cliente.periodicita) {
    classCols = `<div class="cliente-class-pills">`;
    const col2Map = {
      privato: "Privato",
      ditta: "Ditta Ind.",
      socio: "Socio",
      professionista: "Professionista",
    };
    const col3Map = {
      ordinario: "Ordinario",
      semplificato: "Semplificato",
      forfettario: "Forfettario",
      ordinaria: "Ordinaria",
      semplificata: "Semplificata",
    };
    if (cliente.col2_value)
      classCols += `<span class="class-pill" title="Sottocategoria"><span class="cp-num">2</span>${col2Map[cliente.col2_value] || cliente.col2_value}</span>`;
    if (cliente.col3_value)
      classCols += `<span class="class-pill" title="Regime fiscale"><span class="cp-num">3</span>${col3Map[cliente.col3_value] || cliente.col3_value}</span>`;
    if (cliente.periodicita)
      classCols += `<span class="class-pill per-pill" title="Periodicità contabile"><span class="cp-num">4</span>${cliente.periodicita === "mensile" ? "📅 Mensile" : cliente.periodicita === "annuale" ? "📅 Annuale" : "📆 Trimestrale"}</span>`;
    classCols += `</div>`;
  }
  let metaChips = [];
  if (cliente.codice_fiscale)
    metaChips.push(
      `<span class="meta-chip" title="Codice Fiscale">CF: <strong>${cliente.codice_fiscale}</strong></span>`,
    );
  if (cliente.partita_iva)
    metaChips.push(
      `<span class="meta-chip" title="Partita IVA">P.IVA: <strong>${cliente.partita_iva}</strong></span>`,
    );
  if (cliente.email)
    metaChips.push(
      `<span class="meta-chip" title="Indirizzo email">📧 ${cliente.email}</span>`,
    );
  if (cliente.telefono)
    metaChips.push(
      `<span class="meta-chip" title="Numero di telefono">📞 ${cliente.telefono}</span>`,
    );
  return `<div class="cliente-info-header">
      <div class="cliente-info-avatar" style="border-color:${tipColor};color:${tipColor};background:${tipColor}22;font-size:${avatarFontSize(avatar, 15)}">${avatar}</div>
      <div style="flex:1">
        <div class="cliente-info-nome">${escAttr(cliente.nome)}</div>
        <div class="cliente-info-badges">${tipBadge} ${subBadge}</div>
        ${classCols}
      </div>
    </div>
    ${metaChips.length ? `<div class="cliente-info-meta">${metaChips.join("")}</div>` : ""}`;
}

// ─── CLIENTE DATI RIFERIMENTO ─────────────────────────────────
function renderClienteDatiRiferimento(cliente) {
  if (!cliente) return "";
  const items = [];
  const add = (icon, label, val, title) =>
    items.push(
      `<div class="dati-ref-item" title="${title || label + " " + val}"><span class="ref-icon">${icon}</span><span class="ref-label">${label}</span><span class="ref-value">${val}</span></div>`,
    );
  if (cliente.codice_fiscale)
    add("🆔", "CF:", cliente.codice_fiscale, "Codice Fiscale");
  if (cliente.partita_iva)
    add(
      "🏢",
      "P.IVA:",
      cliente.partita_iva.replace(/[^0-9]/g, ""),
      "Partita IVA",
    );
  if (cliente.email) add("📧", "Email:", cliente.email, "Indirizzo email");
  if (cliente.telefono)
    add(
      "📞",
      "Tel:",
      cliente.telefono.replace(/[^0-9]/g, ""),
      "Numero di telefono",
    );
  if (cliente.pec)
    add("📨", "PEC:", cliente.pec, "Posta Elettronica Certificata");
  if (cliente.sdi)
    add("📋", "SDI:", cliente.sdi, "Codice SDI per fatturazione elettronica");
  if (cliente.referente)
    add("👤", "Ref.:", cliente.referente, "Referente / Contatto");
  if (cliente.iban) add("🏦", "IBAN:", cliente.iban, "Coordinate bancarie");
  if (cliente.cap)
    add(
      "📮",
      "CAP:",
      cliente.cap.replace(/[^0-9]/g, ""),
      "Codice di Avviamento Postale",
    );
  if (cliente.indirizzo)
    add(
      "📍",
      "Indirizzo:",
      `${cliente.indirizzo}${cliente.citta ? `, ${cliente.citta}` : ""}${cliente.cap ? ` (${cliente.cap.replace(/[^0-9]/g, "")})` : ""}`,
      "Indirizzo completo",
    );
  if (cliente.note)
    add(
      "📝",
      "Note:",
      cliente.note.length > 50
        ? cliente.note.substring(0, 50) + "..."
        : cliente.note,
      cliente.note,
    );
  if (!items.length) return "";
  return `<div class="cpc-dati-riferimento"><div class="dati-ref-title">📋 Dati di Riferimento</div><div class="dati-ref-grid">${items.join("")}</div></div>`;
}
