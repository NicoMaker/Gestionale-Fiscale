# Studio Fiscale — Gestionale

Gestionale moderno per studi fiscali e commercialisti: clienti, adempimenti, scadenzario, sintesi annuale, note e cestino con ripristino — in tempo reale su tutti i dispositivi dello studio.

## Perché sceglierlo

- **Interfaccia premium "Aurora"** — design curato con tema chiaro e scuro, animazioni fluide, effetto vetro e KPI in evidenza. Fa bella figura davanti al cliente.
- **Tempo reale** — ogni modifica si sincronizza istantaneamente su tutte le postazioni via WebSocket: niente refresh, niente conflitti.
- **100% responsive** — desktop, tablet (sidebar compatta) e smartphone (menu a scomparsa, target touch da 44px, safe-area per notch).
- **Funziona anche offline / in LAN** — icone e librerie self-hosted: basta il server dello studio, nessuna dipendenza da internet.
- **Zero installazioni client** — gira nel browser; il server è un unico processo Node.js con database SQLite in un solo file (backup = copia di un file, o click su "Scarica DB").
- **Cestino intelligente** — eliminazioni recuperabili, pulizia automatica notturna programmata.
- **Accessibile** — focus visibili da tastiera, rispetto di `prefers-reduced-motion`, stampa pulita.

## Avvio rapido

```bash
cd backend
npm install
npm start          # → http://localhost:3000
```

Altri comandi utili:

```bash
npm run dev              # avvio con riavvio automatico (nodemon)
npm run seed:test        # popola il DB con dati di prova realistici
npm run start:with-seed  # dati di prova + avvio
```

Il server stampa anche l'IP locale: le altre postazioni dello studio si collegano da browser a `http://IP-DEL-SERVER:3000`.

## Architettura a componenti

Ogni parte ha il suo modulo, riusabile e sostituibile:

```
shared/                     ← CODICE CONDIVISO backend + frontend
  date-core.js              ← logica date italiana UNICA (UMD): il backend
                              la importa con require(), il browser la carica
                              come script. Una sola fonte di verità.

backend/
  server.js                 ← bootstrap (Express + Socket.IO + cron)
  modules/
    database/               ← accesso SQLite + seed
    models/                 ← un modello per dominio (clienti, adempimenti,
                              scadenzario, appunti, cestino, stats, …)
    sockets/                ← eventi realtime
    routes/                 ← route HTTP (download DB, avvio)
    utils/                  ← re-export del codice condiviso + rete

frontend/
  css/
    tokens.css              ← design tokens (colori, ombre, raggi, temi)
    layout/                 ← struttura (sidebar, topbar, responsive)
    components/             ← componenti (bottoni, form, tabelle, modali…)
    premium.css             ← identità visiva "Aurora" (layer finale)
  js/modules/
    core/                   ← stato, costanti, utilità, tema
    components/             ← renderer riusabili
    network/                ← socket, navigazione, mobile
    pages/                  ← un pacchetto per pagina (dashboard, clienti,
                              scadenzario, sintesi, note, cestino, …)
```

### Codice riusato backend ↔ frontend

`shared/date-core.js` è scritto in formato UMD: la **stessa identica** funzione `formattaDataItaliana()` che il server usa per i report è quella che il browser usa nelle tabelle. Modifichi un file, sei coerente ovunque. Il pattern è pronto per estendere la cartella `shared/` con validazioni, costanti fiscali, ecc.

## Novità di questa versione

- Nuovo layer visivo **premium.css**: sidebar con bagliore aurora, topbar in vetro con filo gradiente, KPI con valori in gradiente, modali animate, scrollbar sottili, shimmer di caricamento.
- **Modulo condiviso** `shared/date-core.js` servito su `/shared`: eliminata la duplicazione della logica date tra backend e frontend.
- **Icone Lucide self-hosted** (`frontend/js/vendor/`) con fallback CDN: l'app funziona anche senza internet.
- **Responsive rinforzato**: corretto il layout mobile della sidebar, target touch 44px, font ≥16px negli input (niente zoom iOS), bottom-nav in vetro, safe-area.
- **Accessibilità**: anelli di focus coerenti, `prefers-reduced-motion`, stampa senza decorazioni.

## Requisiti

- Node.js 18+ (consigliato 20+)
- Un browser moderno (Chrome, Edge, Firefox, Safari)
