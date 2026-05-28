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
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Κατέβασε το JSON ή αντέγραψε τα:
   - **Client ID** (μοιάζει με: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (μοιάζει με: `GOCSPX-...`)
6. OAuth Consent Screen:
   - User Type: **External**
   - App name: `YouTube Subscriptions Dashboard`
   - Scopes: προσθήκη του `https://www.googleapis.com/auth/youtube.readonly`
   - Test users: πρόσθεσε το δικό σου Gmail

**Αυτά τα δύο values θα μπουν στο `.env.local`** (βλέπε Βήμα 4).

---

## Βήμα 4 — Environment Variables

**Τι:** Αρχείο `.env.local` με τα secrets — ΔΕΝ ανεβαίνει στο GitHub (βλέπε `.gitignore`).

**Περιεχόμενο του `.env.local`:**
```env
# Google OAuth (από το Google Cloud Console — Βήμα 3)
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-your-secret

# NextAuth secret (τυχαίο string — τρέξε: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-here

# YouTube API Key (από το Google Cloud Console → Credentials → API Key)
YOUTUBE_API_KEY=AIza...
```

**Πώς παράγεις το AUTH_SECRET:**
```bash
# Στο terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Βήμα 5 — NextAuth Configuration

**Τι:** Setup του Google OAuth provider με YouTube readonly scope.

**Αρχεία που δημιουργήθηκαν:**
- `auth.ts` — κεντρική config του NextAuth
- `app/api/auth/[...nextauth]/route.ts` — API endpoint που χειρίζεται το OAuth flow

**Τι κάνει το OAuth flow:**
1. Ο χρήστης κλικάρει "Sign in with Google"
2. Ανακατευθύνεται στη Google (με τους scopes που ζητάμε)
3. Η Google επιστρέφει ένα `access_token`
4. Το NextAuth αποθηκεύει το token στο session
5. Χρησιμοποιούμε το token για κλήσεις στο YouTube API

**Το `youtube.readonly` scope** επιτρέπει:
- Ανάγνωση subscriptions
- Ανάγνωση playlists
- Ανάγνωση video metadata
- ΔΕΝ επιτρέπει εγγραφή, like, comment κτλ.

---

## Βήμα 6 — YouTube API Wrapper

**Τι:** Η λογική που καλεί το YouTube Data API v3 με σωστό quota management.

**Η quota-safe ροή (χωρίς search!):**

```
subscriptions.list (mine=true)
        ↓
    [channel IDs]
        ↓
channels.list (batch 50 IDs)
        ↓
    [uploads playlist IDs]
        ↓
playlistItems.list (για κάθε κανάλι)
        ↓
    [video IDs]
        ↓
videos.list (batch 50 IDs)
        ↓
    [τελικά video data]
```

**Κόστος quota ανά refresh (~100 subscriptions):**
| Κλήση | Units |
|-------|-------|
| subscriptions.list | ~2 |
| channels.list | ~2 |
| playlistItems.list × 100 | ~100 |
| videos.list (batched) | ~10 |
| **Σύνολο** | **~114 / 10.000** |

---

## Βήμα 7 — Dashboard UI

**Τι:** Η κεντρική σελίδα που δείχνει τα πρόσφατα videos ανά κανάλι.

**Features:**
- Grid view με thumbnail, τίτλο, κανάλι, ημερομηνία
- Φιλτράρισμα ανά κανάλι
- Ταξινόμηση ανά ημερομηνία (νεότερα πρώτα)
- Responsive layout (Tailwind)

---

## Βήμα 8 — GitHub Repository

**Τι:** Push του κώδικα στο GitHub για version control.

**Εντολές:**
```bash
gh repo create youtube-subscriptions --public --source=. --remote=origin --push
```

**Σημαντικό:** Το `.env.local` ΔΕΝ ανεβαίνει — το Next.js το έχει ήδη στο `.gitignore` by default.

---

## Roadmap (μελλοντικά βήματα)

- [ ] Caching στο SQLite/Postgres (να μην καίμε quota σε κάθε refresh)
- [ ] Scheduled refresh (1x/ημέρα με cron)
- [ ] Φιλτράρισμα ανά κατηγορία YouTube
- [ ] "Unread" marking (mark video ως διαβασμένο)
- [ ] Deploy σε Vercel (δωρεάν για personal projects)