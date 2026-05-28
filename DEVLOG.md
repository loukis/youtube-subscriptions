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

## Βήμα 11 — Auto-sync (24h stale detection)

**Τι:** Αυτόματο sync όταν ο cache είναι παλιότερος από 24 ώρες.

**Γιατί:** Αν κάνεις unsubscribe από ένα κανάλι στο YouTube, ο local cache δεν το ξέρει μέχρι το επόμενο sync. Με auto-sync, κάθε μέρα τα δεδομένα ανανεώνονται αυτόματα.

**Πώς λειτουργεί:**
1. `GET /api/subscriptions` επιστρέφει `{ ...cache, stale: boolean }`
2. `stale = true` αν `Date.now() - syncedAt > 24 * 60 * 60 * 1000`
3. Το Dashboard ελέγχει `subData.stale` και αν `true`, τρέχει `POST /api/sync` στο background
4. Ο χρήστης βλέπει τα παλιά δεδομένα αμέσως, το Sync button δείχνει "Syncing..." ενώ τρέχει

```typescript
// app/api/subscriptions/route.ts
const STALE_AFTER_HOURS = 24;
const age = Date.now() - new Date(cache.syncedAt).getTime();
const stale = age > STALE_AFTER_HOURS * 60 * 60 * 1000;
return NextResponse.json({ ...cache, stale });
```

**Σημείωση:** Το threshold αλλάζει εύκολα — απλώς άλλαξε την `STALE_AFTER_HOURS` constant.

---

## Βήμα 12 — Channel Search + Category Manager improvements

### Channel Search (Dashboard)

**Τι:** Search input που φιλτράρει κανάλια real-time.

**Πώς λειτουργεί:**
- `searchQuery` state → lowercase trim → `searchedChannelIds: Set<string>`
- Φιλτράρει τα channel pills ΚΑΙ τα videos ταυτόχρονα
- Κατά τη διάρκεια search τα category tabs κρύβονται (απλοποιεί το UI)
- Εμφανίζει "X κανάλια, Y videos" για το query

```typescript
const searchedChannelIds = q
  ? new Set(channels.filter((ch) => ch.title.toLowerCase().includes(q)).map((ch) => ch.id))
  : null;

// null = no search active = δεν φιλτράρει
const inSearch = searchedChannelIds ? searchedChannelIds.has(v.channelId) : true;
```

### Category Manager — Search + Unassigned filter

**Νέα features στο modal:**
- **Search input** — φιλτράρει κανάλια real-time μέσα στο modal
- **"Χωρίς κατηγορία (N)"** pill — δείχνει μόνο τα unassigned κανάλια
- **Sorting** — unassigned κανάλια εμφανίζονται πρώτα (πορτοκαλί dropdown)
- **Footer counter** — "X από Y κανάλια"

```typescript
// Unassigned κανάλια πρώτα, μετά αλφαβητικά
.sort((a, b) => {
  const aAssigned = !!local[a.id];
  const bAssigned = !!local[b.id];
  if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
  return a.title.localeCompare(b.title);
})
```

---

## Βήμα 13 — Sort, Date Filter & Total Unwatched Time

### Sort

**3 επιλογές** (segmented control):
- `Νεότερα` — publishedAt DESC (default)
- `Παλιότερα` — publishedAt ASC
- `Views` — viewCount DESC

### Date Range Filter

**4 επιλογές:**
- `Όλα` — κανένα φίλτρο
- `7d` — τελευταίες 7 μέρες
- `30d` — τελευταίες 30 μέρες
- `90d` — τελευταίες 90 μέρες

```typescript
const dateThreshold = useMemo(() => {
  if (dateRange === "all") return null;
  const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86400_000).toISOString();
}, [dateRange]);
```

### Total Unwatched Time

Αθροίζει τη διάρκεια όλων των unwatched videos:

```typescript
function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return parseInt(m[1]??'0')*3600 + parseInt(m[2]??'0')*60 + parseInt(m[3]??'0');
}

const unwatchedSeconds = useMemo(() =>
  videos.filter((v) => !watched[v.id])
        .reduce((sum, v) => sum + parseDurationSeconds(v.duration), 0),
  [videos, watched]
);
// → "19ω 45λ unwatched"
```

---

## Βήμα 14 — "New Since Last Visit" Badge

**Τι:** Κόκκινο "NEW" badge σε videos που ανέβηκαν από την τελευταία επίσκεψη.

**Αρχεία:**
- `lib/lastvisit.ts` + `data/lastvisit.json` — αποθηκεύει timestamp τελευταίας επίσκεψης
- `app/api/lastvisit/route.ts` — GET (διάβασε) / POST (ενημέρωσε)

**Flow:**
1. Dashboard φορτώνει → `GET /api/lastvisit` → παίρνει `lastVisitAt` (προηγούμενης επίσκεψης)
2. Αμέσως μετά → `POST /api/lastvisit` → αποθηκεύει `now` ως νέο lastVisitAt
3. Κάθε video ελέγχεται: `isNew = video.publishedAt > lastVisitAt`
4. Επόμενη επίσκεψη: τα τωρινά "new" δεν είναι πια new

```typescript
// VideoCard
{isNew && !watched && (
  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
    NEW
  </span>
)}
```

**Γιατί ενημερώνουμε αμέσως και όχι αργότερα:**
Αν περιμέναμε να φύγει ο χρήστης, δεν θα γνωρίζαμε πότε "είδε" τα new videos. Η απλούστερη προσέγγιση: κάθε επίσκεψη = νέο baseline.

---

## Βήμα 15 — Watch Later

**Τι:** Ξεχωριστή λίστα "αποθήκευσε για αργότερα" — διαφορετικό από το watched.

| Feature | Watched | Watch Later |
|---------|---------|-------------|
| Σκοπός | "Το είδα" | "Θέλω να το δω" |
| Default view | Κρύβεται | Εμφανίζεται |
| View mode | Feed | "Watch Later" tab |

**Αρχεία:**
- `lib/watchlater.ts` + `data/watchlater.json`
- `app/api/watchlater/route.ts` — GET / POST toggle

**UI:**
- Bookmark icon σε κάθε VideoCard (γεμάτο = saved, άδειο = unsaved)
- "Watch Later (N)" toggle button πάνω στο dashboard
- Όταν είναι ενεργό: εμφανίζονται μόνο τα saved videos, κρύβονται category tabs/filters

---

## Βήμα 16 — Sticky Controls Bar

**Τι:** Το search bar, tabs, sort/filter και channel pills μένουν ορατά κατά το scroll.

**Γιατί `top-[52px]` και όχι `top-0`:**
Ο header (`sticky top-0`) έχει ύψος 52px (`py-3` = 24px padding + 28px content). Το sticky controls block πρέπει να αρχίζει εκεί που τελειώνει ο header.

```tsx
<div className="sticky top-[52px] z-10 bg-gray-50 pt-2 pb-3 space-y-3">
  {/* search, tabs, sort, channel pills */}
</div>
```

**Σημείωση:** Αν αλλάξει το ύψος του header, πρέπει να ενημερωθεί και το `top-[52px]`.

---

## Βήμα 17 — Pagination (Performance Fix)

**Πρόβλημα:** Με 51.000+ videos, το browser render-άριζε εκατοντάδες χιλιάδες DOM elements ταυτόχρονα → freeze.

**Λύση:** Render-άρισε μόνο τα πρώτα 48 videos. "Φόρτωσε περισσότερα" για άλλα 48.

```typescript
const [visibleCount, setVisibleCount] = useState(48);

// Reset σε κάθε filter change
useEffect(() => {
  setVisibleCount(48);
}, [q, selectedCategory, selectedChannel, sortBy, dateRange, showWatched, viewMode]);

// Render μόνο τα πρώτα N
filtered.slice(0, visibleCount).map(...)
```

**Γιατί 48 και όχι 50:**
48 = 4 × 12 = διαιρείται τέλεια σε grids 2, 3, και 4 στηλών — κανένα "μισοάδειο" τελευταίο row.

**Αποτέλεσμα:** Από ~500ms render lag → instant. Ο χρήστης βλέπει τα πρώτα 48 αμέσως και φορτώνει περισσότερα on-demand.

---

## Τρέχουσα Δομή Project

```
youtube-subscriptions/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   ← OAuth endpoint
│   │   ├── subscriptions/route.ts        ← Serve from cache + stale check
│   │   ├── sync/route.ts                 ← Full YouTube sync
│   │   ├── categories/route.ts           ← Read/write categories
│   │   ├── watched/route.ts              ← Toggle watched state
│   │   ├── watchlater/route.ts           ← Toggle watch later
│   │   └── lastvisit/route.ts            ← Get/update last visit timestamp
│   ├── dashboard/page.tsx                ← Protected dashboard page
│   ├── page.tsx                          ← Login page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx                     ← Main orchestrator (search, sort, filter, pagination)
│   ├── VideoCard.tsx                     ← Video card + watched + watch later + NEW badge
│   ├── ChannelFilter.tsx                 ← Channel pills
│   ├── CategoryTabs.tsx                  ← Category tab bar με counts
│   └── CategoryManager.tsx              ← Category modal (search + unassigned filter)
├── lib/
│   ├── youtube.ts                        ← YouTube API wrapper (full pagination, batch processing)
│   ├── cache.ts                          ← Cache read/write (server-only)
│   ├── watched.ts                        ← Watched read/write (server-only)
│   ├── watchlater.ts                     ← Watch later read/write (server-only)
│   ├── lastvisit.ts                      ← Last visit read/write (server-only)
│   ├── categories.ts                     ← Categories read/write (server-only)
│   └── category-config.ts               ← Constants + types (client-safe)
├── data/
│   ├── cache.json                        ← Cached videos + channels (μεγάλο αρχείο!)
│   ├── watched.json                      ← Watched video IDs
│   ├── watchlater.json                   ← Watch later video IDs
│   ├── lastvisit.json                    ← Timestamp τελευταίας επίσκεψης
│   └── categories.json                   ← Channel → category mapping
├── types/
│   └── next-auth.d.ts                    ← Session type extension
├── auth.ts                               ← NextAuth config
├── next.config.ts                        ← Image domains (YouTube + Google)
├── .env.local                            ← Secrets (gitignored)
├── .env.local.example                    ← Template
└── DEVLOG.md                             ← Αυτό το αρχείο
```

---

## Roadmap (μελλοντικά βήματα)

- [ ] Deploy σε Vercel με Vercel KV για persistence (το `data/` folder δεν λειτουργεί σε serverless)
- [ ] Mobile PWA (εγκατάσταση στο κινητό σαν app)
- [ ] Infinite scroll αντί για "Φόρτωσε περισσότερα" (Intersection Observer API)
