# 🎬 MultiStream ITA — Addon Stremio

Addon per Stremio che aggrega stream in italiano da più sorgenti:
- **VixSRC** — film e serie con IMDb ID diretto
- **StreamingCommunity** — catalogo italiano aggiornato

---

## 🚀 Deploy su Railway (passo per passo)

### 1. Carica il codice su GitHub

1. Vai su [github.com](https://github.com) e crea un account (se non ce l'hai)
2. Clicca **"New repository"** → chiamalo `multistream-ita-addon`
3. Carica tutti i file di questa cartella nel repository

### 2. Deploya su Railway

1. Vai su [railway.app](https://railway.app) e accedi con GitHub
2. Clicca **"New Project"** → **"Deploy from GitHub repo"**
3. Seleziona il repository `multistream-ita-addon`
4. Railway lo avvierà automaticamente! ✅

### 3. Ottieni l'URL pubblico

1. In Railway, clicca sul tuo progetto → tab **"Settings"**
2. Scorri fino a **"Domains"** → clicca **"Generate Domain"**
3. Copia l'URL che ti dà (es. `https://multistream-ita.up.railway.app`)

### 4. Installa su Stremio

1. Apri Stremio sul telefono
2. Vai su **Impostazioni → Addon**
3. Clicca **"Installa addon via URL"**
4. Inserisci: `https://TUO-URL.up.railway.app/manifest.json`
5. Conferma l'installazione ✅

---

## ⚙️ Configurazione avanzata

### Cambiare dominio StreamingCommunity

StreamingCommunity cambia dominio spesso. Se smette di funzionare:
1. Apri `scrapers/streamingcommunity.js`
2. Modifica la prima riga: `const BASE_URL = "https://NUOVO-DOMINIO"`

### Aggiungere un nuovo sito

1. Crea un nuovo file in `scrapers/nomesito.js`
2. Esporta la funzione `getStreams(type, imdbId, season, episode)`
3. Importala in `index.js` e aggiungila all'array `promises`

---

## 🔧 Test in locale (opzionale)

Se hai Node.js installato sul PC:

```bash
npm install
npm start
```

Poi installa su Stremio con: `http://localhost:7000/manifest.json`

---

## ⚠️ Note importanti

- I siti di streaming possono cambiare struttura HTML → potrebbe servire aggiornare i selettori
- VixSRC funziona meglio perché accetta direttamente l'IMDb ID
- Per OMDb API (ricerca titoli): registrati gratis su [omdbapi.com](http://omdbapi.com) e metti la tua API key in `streamingcommunity.js`
