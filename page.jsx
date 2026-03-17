# H-TIC Launcher

Interface interne de génération de contenu automatisée — Next.js + Vercel + Make.

---

## Déploiement en 5 minutes

### 1. Prérequis
- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [GitHub](https://github.com) (gratuit)
- Vos URLs webhook Make

### 2. Mettre le projet sur GitHub

```bash
cd htic-launcher
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE-COMPTE/htic-launcher.git
git push -u origin main
```

### 3. Importer sur Vercel

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Importez le repo GitHub
3. Framework : **Next.js** (détecté automatiquement)
4. Cliquez **Deploy** — sans rien configurer d'autre pour l'instant

### 4. Configurer les variables d'environnement

Dans votre projet Vercel → **Settings → Environment Variables**, ajoutez :

| Variable | Valeur | Description |
|---|---|---|
| `APP_PASSWORD` | `VotreMotDePasse` | Mot de passe d'accès |
| `JWT_SECRET` | `chaine-aleatoire-longue` | Secret pour les sessions |
| `WEBHOOK_VITRINE` | `https://hook.eu1.make.com/...` | Webhook Make — branche Vitrine |
| `WEBHOOK_ECOMMERCE` | `https://hook.eu1.make.com/...` | Webhook Make — branche E-commerce |
| `WEBHOOK_CATALOGUE` | `https://hook.eu1.make.com/...` | Webhook Make — branche Catalogue |

### 5. Redéployer

Deployments → cliquez les **3 points** à droite du dernier déploiement → **Redeploy**.

### 6. Tester

1. Ouvrez votre URL Vercel (ex: `htic-launcher.vercel.app`)
2. Connectez-vous avec votre `APP_PASSWORD`
3. Allez dans **Paramètres** → testez chaque webhook
4. Lancez votre première génération !

---

## Structure du projet

```
htic-launcher/
├── app/
│   ├── page.jsx              # Page de login
│   ├── layout.jsx            # Layout racine
│   ├── globals.css           # Styles globaux
│   ├── dashboard/page.jsx    # Formulaire de lancement
│   ├── history/page.jsx      # Historique des lancements
│   ├── settings/page.jsx     # Configuration webhooks
│   └── api/
│       ├── auth/route.js     # Login / Logout
│       ├── launch/route.js   # Déclenchement Make
│       ├── history/route.js  # CRUD historique
│       └── test-webhook/route.js  # Test webhook
├── components/
│   └── Nav.jsx               # Navigation latérale
├── lib/
│   ├── auth.js               # Sessions JWT (sans dépendances)
│   ├── db.js                 # Stockage historique (remplaçable)
│   └── webhooks.js           # Résolution des URLs Make
├── middleware.js             # Protection des routes
├── .env.example              # Template variables d'environnement
└── README.md
```

---

## Payload envoyé à Make

Pour chaque lancement, Make reçoit un JSON de ce format :

```json
{
  "branch": "vitrine",
  "company": "Pierre Carrelage",
  "url": "pierrecarrelage.com/pose-carrelage",
  "city": "Pau, Morlaàs",
  "sector": "Carrelage",
  "description": "...",
  "keyword_main": "pose de carrelage",
  "keywords_secondary": "carreleur, pose carrelage sol",
  "intent": "Rassurer et convertir...",
  "h1": "Pose de carrelage à Pau",
  "word_count": "1200",
  "tone": "expert",
  "language": "fr",
  "extra_instructions": "...",
  "source": "H-TIC-Launcher",
  "sentAt": "2025-03-17T10:30:00.000Z"
}
```

Dans Make, utilisez ces variables dans votre scénario via `{{body.company}}`, `{{body.keyword_main}}`, etc.

---

## Persistance de l'historique (optionnel)

Par défaut, l'historique est en `/tmp` — il se réinitialise aux redéploiements.

Pour une persistance permanente, remplacez `lib/db.js` par une implémentation Vercel KV :

```bash
npm i @vercel/kv
```

```js
// lib/db.js — version Vercel KV
import { kv } from '@vercel/kv'

export async function getHistory() {
  return await kv.lrange('htic:history', 0, 199)
}

export async function addHistoryEntry(entry) {
  const e = { id: crypto.randomUUID(), ...entry, createdAt: new Date().toISOString() }
  await kv.lpush('htic:history', e)
  await kv.ltrim('htic:history', 0, 199)
  return e
}

export async function clearHistory() {
  await kv.del('htic:history')
}
```

---

## Développement local

```bash
cp .env.example .env.local
# Éditez .env.local avec vos valeurs

npm install
npm run dev
# → http://localhost:3000
```
