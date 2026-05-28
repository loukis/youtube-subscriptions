# YouTube Subscriptions Dashboard — DEVLOG

Αναλυτικός οδηγός ανάπτυξης. Κάθε βήμα εξηγεί **τι**, **γιατί** και **πώς**.

---

## Βήμα 1 — Δημιουργία Next.js project

**Τι:** Scaffold νέου Next.js project με TypeScript, Tailwind CSS και App Router.

**Γιατί Next.js:**
- Full-stack framework: API routes (backend) + React (frontend) σε ένα project
- App Router (Next.js 13+): νέο σύστημα routing με Server Components για καλύτερη απόδοση
- TypeScript: type safety — σε βοηθά να πιάνεις λάθη πριν τρέξεις τον κώδικα
- Tailwind CSS: utility-first CSS — γράφεις styles απευθείας στο HTML χωρίς ξεχωριστό CSS αρχείο

**Εντολή που εκτελέστηκε:**
```bash
npx create-next-app@latest youtube-subscriptions \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Δομή που δημιουργήθηκε:**
```
youtube-subscriptions/
├── app/                  ← Το App Router directory
│   ├── layout.tsx        ← Root layout (HTML shell)
│   ├── page.tsx          ← Αρχική σελίδα (/)
│   └── globals.css       ← Global styles
├── public/               ← Static files (εικόνες κτλ)
├── next.config.ts        ← Next.js configuration
├── tailwind.config.ts    ← Tailwind configuration
├── tsconfig.json         ← TypeScript configuration
└── package.json          ← Dependencies
```

---

## Βήμα 2 — Εγκατάσταση Dependencies

**Τι:** Προσθήκη δύο βιβλιοθηκών.

**Εντολή:**
```bash
npm install next-auth@beta googleapis
```

**Τι κάνει το καθένα:**

| Package | Ρόλος |
|---------|-------|
| `next-auth@beta` (v5) | Handles OAuth authentication. Εδώ χρησιμοποιείται για Google login με YouTube scope |
| `googleapis` | Official Google API client για Node.js. Μας δίνει πρόσβαση στο YouTube Data API v3 |

**Γιατί next-auth@beta (v5) και όχι v4:**
- Το v5 είναι σχεδιασμένο για το App Router του Next.js 13+
- Πιο απλό setup — ένα `auth.ts` αρχείο αντί για πολλά separate files

---

## Βήμα 3 — Google Cloud Console Setup

**Τι:** Δημιουργία OAuth 2.0 credentials για να μπορεί η εφαρμογή να κάνει login με Google.

**Γιατί χρειάζεται:**
Το YouTube Data API δεν είναι ανοιχτό — χρειάζεσαι να πεις στην Google "η εφαρμογή Χ θέλει να διαβάσει τα subscriptions του χρήστη Υ". Αυτό γίνεται μέσω OAuth.

**Βήματα:**

1. Πήγαινε στο [Google Cloud Console](https://console.cloud.google.com/)
2. Δημιούργησε νέο project: **"youtube-subscriptions"**
3. Ενεργοποίησε το **YouTube Data API v3**:
   - APIs & Services → Library → αναζήτησε "YouTube Data API v3" → Enable
4. Δημιούργησε OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth Client ID
   - Application type: **Web application**
   - Name: `youtube-subscriptions-dev`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Κατέβασε το JSON ή αντέγραψε τα:
   - **Client ID** (μοιάζει με: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (μοιάζει με: `GOCSPX-...`)
6. OAuth Consent Screen:
   - User Type: **External**
   - App name: `YouTube Subscriptions Dashboard`
   - Scopes: προσθήκη του `https://www.googleapis.com/auth/youtube.readonly`
   - Test users: πρόσθεσε το δικό σου Gmail

> **Σημείωση:** Το app παραμένει σε "Testing" mode για προσωπική χρήση — δεν χρειάζεται Google verification.

**Αυτά τα δύο values θα μπουν στο `.env.local`** (βλέπε Βήμα 4).

---

## Βήμα 4 — Environment Variables

**Τι:** Αρχείο `.env.local` με τα secrets — ΔΕΝ ανεβαίνει στο GitHub (βλέπε `.gitignore`).

**Αντέγραψε το `.env.local.example` σε `.env.local` και συμπλήρωσε:**
```env
# Google OAuth (από το Google Cloud Console — Βήμα 3)
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-your-secret

# NextAuth secret — παράγεται αυτόματα (βλέπε παρακάτω)
AUTH_SECRET=your-random-secret-here
```

**Πώς παράγεις το AUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Βήμα 5 — NextAuth Configuration (`auth.ts`)

**Τι:** Setup του Google OAuth provider με YouTube readonly scope.

**Αρχεία:**
- `auth.ts` — κεντρική config του NextAuth
- `app/api/auth/[...nextauth]/route.ts` — API endpoint που χειρίζεται το OAuth flow
- `types/next-auth.d.ts` — TypeScript declaration για να "ξέρει" το session ότι έχει `accessToken`

**Τι κάνει το OAuth flow βήμα-βήμα:**
1. Ο χρήστης κλικάρει "Σύνδεση με Google"
2. Ανακατευθύνεται στη Google με τα scopes που ζητάμε (`openid`, `profile`, `email`, `youtube.readonly`)
3. Η Google επιστρέφει ένα `access_token` (βραχύβιο, ~1 ώρα) και `refresh_token`
4. Το NextAuth αποθηκεύει το token κρυπτογραφημένο στο session cookie
5. Κάθε API route παίρνει το token από το session και το χρησιμοποιεί για YouTube API calls

**Γιατί `access_type: "offline"` και `prompt: "consent"`:**
- `offline` → παίρνουμε refresh_token για να ανανεώνουμε το access_token αυτόματα
- `consent` → αναγκάζουμε τη Google να δείξει πάντα την οθόνη συγκατάθεσης (χωρίς αυτό, μετά τον πρώτο login δεν δίνει πάντα refresh_token)

```typescript
// auth.ts — τα κρίσιμα σημεία
callbacks: {
  async jwt({ token, account }) {
    if (account) {
      token.accessToken = account.access_token;  // αποθηκεύουμε στο JWT
    }
    return token;
  },
  async session({ session, token }) {
    session.accessToken = token.accessToken;  // περνάμε στο session
    return session;
  },
}
```

---

## Βήμα 6 — YouTube API Wrapper (`lib/youtube.ts`)

**Τι:** Η λογική που καλεί το YouTube Data API v3 με σωστό quota management και πλήρη pagination.

**Γιατί δεν χρησιμοποιούμε `search.list`:**
Το `search.list` κοστίζει **100 quota units** ανά κλήση. Με 100 κανάλια = 10.000 units = ξεπερνάμε το ημερήσιο όριο σε μία μόνο αναζήτηση. Αντ' αυτού χρησιμοποιούμε το uploads playlist κάθε καναλιού που κοστίζει **1 unit** ανά κλήση.

**Η quota-safe ροή:**

```
subscriptions.list (mine=true, paginated)
        ↓ ~2 units
    [channel IDs]
        ↓
channels.list (batch 50 IDs)
        ↓ ~2 units
    [uploads playlist IDs per channel]
        ↓
playlistItems.list (ΟΛΑ τα pages, για κάθε κανάλι)
        ↓ ~1 unit/page × pages × channels
    [video IDs]
        ↓
videos.list (batch 50 IDs)
        ↓ ~1 unit/batch
    [τελικά video data με snippet, statistics, contentDetails]
```

**Batch processing για αποφυγή rate limiting:**
```typescript
async function runInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));  // 10 κανάλια παράλληλα, όχι 100+
  }
}
```

Χωρίς batching, το `Promise.all` για 100+ κανάλια στέλνει εκατοντάδες ταυτόχρονα requests → YouTube API rate limiting → timeout.

**Κάθε Video object περιέχει:**
| Field | Πηγή | Περιγραφή |
|-------|------|-----------|
| `id` | snippet | YouTube video ID |
| `title` | snippet | Τίτλος |
| `description` | snippet | Πρώτοι 300 χαρακτήρες περιγραφής |
| `thumbnail` | snippet | Medium thumbnail URL |
| `channelId` | snippet | ID καναλιού |
| `channelTitle` | snippet | Όνομα καναλιού |
| `publishedAt` | snippet | Ημερομηνία δημοσίευσης (ISO 8601) |
| `categoryId` | snippet | YouTube κατηγορία (αριθμός) |
| `viewCount` | statistics | Αριθμός προβολών |
| `duration` | contentDetails | Διάρκεια (ISO 8601, π.χ. `PT1H23M45S`) |

---

## Βήμα 7 — Cache System (`lib/cache.ts` + `data/cache.json`)

**Τι:** Τοπικό JSON cache για τα videos και κανάλια.

**Γιατί χρειάζεται cache:**
Το full sync (όλα τα videos από όλα τα κανάλια) μπορεί να πάρει 2-5 λεπτά. Χωρίς cache, κάθε φόρτωση του dashboard θα έκανε εκατοντάδες API calls. Με cache:
- Πρώτη φόρτωση: instant (διαβάζει από `data/cache.json`)
- Sync: on-demand, όταν ο χρήστης το ζητήσει

**Δομή του `data/cache.json`:**
```json
{
  "channels": [ { "id": "...", "title": "...", "thumbnail": "...", "uploadsPlaylistId": "..." } ],
  "videos": [ { "id": "...", "title": "...", "publishedAt": "...", ... } ],
  "syncedAt": "2026-05-28T14:30:00.000Z"
}
```

**API Routes:**
- `GET /api/subscriptions` → διαβάζει από cache (instant)
- `POST /api/sync` → τρέχει το full sync, γράφει στο cache

**Σημείωση για production:** Το JSON file αποθηκεύεται στο filesystem του server. Για deploy σε Vercel (serverless) χρειάζεται βάση δεδομένων (π.χ. Vercel KV ή Postgres) γιατί το filesystem είναι read-only.

---

## Βήμα 8 — Watched System (`lib/watched.ts` + `data/watched.json`)

**Τι:** Σύστημα παρακολούθησης ποια videos έχεις δει.

**Δομή του `data/watched.json`:**
```json
{
  "dQw4w9WgXcQ": true,
  "oHg5SJYRHA0": true
}
```

Απλό key-value: `videoId → true`. Αν το key δεν υπάρχει, το video δεν έχει δει.

**API Route (`/api/watched`):**
- `GET` → επιστρέφει ολόκληρο το watched object
- `POST { videoId }` → toggle: αν watched → unwatch, αν unwatched → watch. Επιστρέφει `{ videoId, watched: boolean }`

**Toggle λογική:**
```typescript
export function toggleWatched(videoId: string): boolean {
  const watched = readWatched();
  if (watched[videoId]) {
    delete watched[videoId];   // unwatch
    return false;
  } else {
    watched[videoId] = true;   // watch
    return true;
  }
}
```

**UI Behavior:**
- Default: τα watched videos κρύβονται
- "Mark as watched" κουμπί σε κάθε VideoCard → optimistic UI update (αλλάζει αμέσως χωρίς reload)
- "Show watched (N)" toggle button στο header → εμφανίζει/κρύβει όλα τα watched
- Όταν τα δεις όλα: εμφανίζεται "Τα έχεις δει όλα!" με link να δεις τα watched

---

## Βήμα 9 — Category System (`lib/category-config.ts` + `data/categories.json`)

**Τι:** Χειροκίνητη ανάθεση κατηγορίας σε κάθε κανάλι.

**Γιατί χειροκίνητο και όχι AI:**
- Δωρεάν — μηδέν κόστος API
- Σταθερό — δεν αλλάζει κατηγορία ξαφνικά
- Ένα κανάλι ανήκει πάντα στην ίδια κατηγορία

**Διαχωρισμός αρχείων (σημαντικό για Next.js):**

| Αρχείο | Χρήση | Γιατί |
|--------|-------|-------|
| `lib/category-config.ts` | Constants + types | Χωρίς `fs` — μπορεί να εισαχθεί σε client components |
| `lib/categories.ts` | File I/O (`fs`) | Μόνο server-side — API routes |

Αν βάλουμε `import fs from "fs"` σε αρχείο που εισάγεται σε client component, το Next.js εμφανίζει `Module not found: Can't resolve 'fs'` — γιατί το `fs` δεν υπάρχει στον browser.

**Διαθέσιμες κατηγορίες:**
`Code | Economy | Music | Sports | News | Gaming | Construction | Ecology | Energy | Other`

**Δομή του `data/categories.json`:**
```json
{
  "UCLbKt4FZKk41HwZ2A3Mnz4Q": "Code",
  "UCVHFbw7woebKtffS8Tna4Ag": "Economy"
}
```

**UI — Category Manager Modal:**
- Κουμπί "Categories" → ανοίγει modal
- Λίστα όλων των καναλιών (αλφαβητικά) με thumbnail + dropdown
- Αποθήκευση → `POST /api/categories`
- Τα tabs φιλτράρουν βάσει της ανάθεσης: πατάς "Code" → βλέπεις μόνο videos από Code κανάλια

---

## Βήμα 10 — Dashboard UI Components

### `components/VideoCard.tsx`

Κάρτα που εμφανίζει ένα video. Κάθε κάρτα έχει:
- Thumbnail (Next.js `<Image>` με lazy loading)
- Channel name (κόκκινο, truncated)
- Τίτλος (2 γραμμές max)
- Περιγραφή (2 γραμμές max, πρώτοι 300 χαρακτήρες)
- Metadata: ημερομηνία · views · διάρκεια
- "Mark as watched" / "Watched — undo" κουμπί

**Διάρκεια parsing (ISO 8601 → human-readable):**
```typescript
function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
  // PT1H23M45S → "1:23:45"
  // PT12M34S   → "12:34"
}
```

**Watched state visual feedback:**
- Unwatched: κανονική εμφάνιση
- Watched: `opacity-50` + πράσινο "Watched" badge πάνω στο thumbnail

### `components/ChannelFilter.tsx`

Οριζόντια λίστα pills για φιλτράρισμα ανά κανάλι. Εμφανίζει μόνο τα κανάλια της επιλεγμένης κατηγορίας.

### `components/CategoryTabs.tsx`

Tab bar πάνω από το dashboard: `Όλα | Code | Economy | ...`. Κάθε tab δείχνει τον αριθμό των unwatched videos (ή όλων αν το "Show watched" είναι ενεργό).

### `components/CategoryManager.tsx`

Modal component για ανάθεση κατηγοριών. Χρησιμοποιεί `useState` για optimistic local state — οι αλλαγές φαίνονται αμέσως, αποθηκεύονται όταν πατήσεις "Αποθήκευση".

### `components/Dashboard.tsx`

Κεντρικός orchestrator. Φορτώνει παράλληλα:
```typescript
Promise.all([
  fetch("/api/subscriptions"),  // από cache
  fetch("/api/categories"),     // κατηγορίες
  fetch("/api/watched"),        // watched state
])
```

State που διαχειρίζεται:
| State | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `cache` | `{channels, videos, syncedAt}` | Δεδομένα από YouTube |
| `assignments` | `Record<channelId, Category>` | Κατηγορίες καναλιών |
| `watched` | `Record<videoId, true>` | Watched videos |
| `selectedCategory` | `Category \| null` | Ενεργό tab |
| `selectedChannel` | `string \| null` | Ενεργό channel pill |
| `showWatched` | `boolean` | Toggle για watched |
| `syncing` | `boolean` | Sync loading state |

---

## Τρέχουσα Δομή Project

```
youtube-subscriptions/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   ← OAuth endpoint
│   │   ├── subscriptions/route.ts        ← Serve from cache
│   │   ├── sync/route.ts                 ← Full YouTube sync
│   │   ├── categories/route.ts           ← Read/write categories
│   │   └── watched/route.ts              ← Toggle watched state
│   ├── dashboard/page.tsx                ← Protected dashboard page
│   ├── page.tsx                          ← Login page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx                     ← Main orchestrator
│   ├── VideoCard.tsx                     ← Video card + watched button
│   ├── ChannelFilter.tsx                 ← Channel pills
│   ├── CategoryTabs.tsx                  ← Category tab bar
│   └── CategoryManager.tsx              ← Category assignment modal
├── lib/
│   ├── youtube.ts                        ← YouTube API wrapper (full pagination)
│   ├── cache.ts                          ← Cache read/write (server-only)
│   ├── watched.ts                        ← Watched read/write (server-only)
│   ├── categories.ts                     ← Categories read/write (server-only)
│   └── category-config.ts               ← Constants + types (client-safe)
├── data/
│   ├── cache.json                        ← Cached videos + channels
│   ├── watched.json                      ← Watched video IDs
│   └── categories.json                   ← Channel → category mapping
├── types/
│   └── next-auth.d.ts                    ← Session type extension
├── auth.ts                               ← NextAuth config
├── next.config.ts                        ← Image domains
├── .env.local                            ← Secrets (gitignored)
├── .env.local.example                    ← Template
└── DEVLOG.md                             ← Αυτό το αρχείο
```

---

## Roadmap (μελλοντικά βήματα)

- [ ] Scheduled auto-sync (π.χ. κάθε πρωί με cron)
- [ ] Search bar μέσα στο dashboard
- [ ] Ταξινόμηση: νεότερα / παλιότερα / περισσότερα views
- [ ] Deploy σε Vercel με Vercel KV για persistence
- [ ] Mobile PWA (εγκατάσταση στο κινητό σαν app)
