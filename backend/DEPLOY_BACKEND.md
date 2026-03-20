# Déployer le backend (simple) - FastAPI + PostgreSQL

Objectif : que le frontend GitHub Pages puisse appeler l’API publique et que les données des plantes soient persistantes.

## 1) Prérequis
- Un hébergement Docker pour l’API (ex: Render, Fly.io, Railway)
- Un PostgreSQL managé avec persistance (ex: Render Postgres)
- Un domaine public pour l’API (ex: `https://api-secomo.onrender.com`)

## 2) Fichiers fournis dans le repo
- `backend/Dockerfile` : image Docker pour lancer `uvicorn app.main:app`
- `backend/.env.example` : exemple des variables à définir
- `backend/app/config.py` : support de `CORS_ORIGINS` en env (string JSON ou séparée par virgules)

## 3) Variables à configurer sur l’hébergement

### `DATABASE_URL`
Format asyncpg (ex):
`postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME`

### `SECRET_KEY`
Une clé au choix (mais fixe). Exemple :
`SECRET_KEY=...`

### `CORS_ORIGINS`
L’origine de ton frontend GitHub Pages (sans chemin).
Ex pour Pages :
`CORS_ORIGINS=https://<ton-username>.github.io`

Tu peux aussi mettre :
`CORS_ORIGINS=["https://...","https://..."]`

## 4) WebSocket
Le frontend utilise `/api/ws`. Il suffit que le proxy accepte les WebSockets.
Ex:
- `VITE_WS_BASE=wss://<ton-api-domain>`

## 5) Check rapide
Une fois le backend en ligne :
- Ouvre `https://<ton-api-domain>/api/health` (doit répondre `{"status":"ok"...}`)
- Teste depuis le navigateur : la recherche catalogue doit renvoyer des plantes et les “create plant” doivent persister (pas seulement en localStorage).

## 6) Ensuite côté frontend GitHub Pages
Dans GitHub repo, mets les secrets :
- `VITE_API_BASE` = `https://<ton-api-domain>`
- `VITE_WS_BASE` = `wss://<ton-api-domain>`

Puis le workflow Pages re-buildera automatiquement.

