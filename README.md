# OHS Website - Reviews DB Migration

This project serves static pages and a small JSON-backed API using Express. Reviews were originally stored in `data/reviews.json`. You can now use:
- **MongoDB Atlas** (free tier, recommended for simplicity)
- Supabase (Postgres, free tier)
- JSON file fallback (original behavior)

## What changed

- Added `lib/reviewsStore.js`: data access layer with three providers (MongoDB, Supabase, JSON)
- MongoDB provider: connects to Atlas, uses `reviews` and `review_replies` collections
- Supabase provider: Postgres tables for `reviews` and `review_replies`
- Server routes in `server.js` call the store abstraction, no frontend changes required

---

## Option 1: MongoDB Atlas (Recommended)

### 1. Create a free MongoDB Atlas cluster

- Go to https://www.mongodb.com/cloud/atlas
- Sign up/log in
- Create a new project (or use existing)
- Build a Database → Free Shared (M0) tier
- Choose a cloud provider + region near you
- Create cluster (takes ~5 minutes)

### 2. Configure database access & network

- Database Access → Add New Database User
  - Choose password auth
  - Username: `ohs_user` (or your choice)
  - Password: generate a strong password
  - Database User Privileges: Atlas admin (or Read/Write any database)
- Network Access → Add IP Address
  - Allow access from anywhere: `0.0.0.0/0` (for development; restrict later)
  - Or add your current IP

### 3. Get connection string

- In Clusters view, click **Connect** on your cluster
- Choose **Connect your application**
- Driver: Node.js, Version: 6.3 or later
- Copy the connection string (looks like):
  ```
  mongodb+srv://ohs_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
  ```
- Replace `<password>` with your actual user password
- Optionally add `/ohs_reviews` before the `?` to specify the database name

### 4. Configure environment

Update your `.env`:
```
MONGODB_URI=mongodb+srv://ohs_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/ohs_reviews?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=ohs_reviews

# Remove or comment out Supabase vars to disable it
# SUPABASE_URL=
# SUPABASE_SERVICE_KEY=
```

### 5. Install dependencies

```powershell
npm install
```

### 6. Migrate data

```powershell
npm run migrate:mongo
```

This imports all reviews and replies from `data/reviews.json` into MongoDB collections. Safe to re-run (upserts by id).

### 7. Verify

```powershell
npm run db:verify:mongo
```

Should print review counts per course.

### 8. Run the server

```powershell
npm start
```

Server automatically uses MongoDB when `MONGODB_URI` is set. Try creating a review—it should now appear immediately.

---

## Option 2: Supabase (Postgres)

(If you prefer Supabase over MongoDB)

1. Create a Supabase project at https://supabase.com
2. Copy Project URL and Service Role key (Settings → API)
3. Run SQL schema in `scripts/supabase_schema.sql` via SQL Editor
4. Add to `.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
5. Remove or comment out `MONGODB_URI` to disable MongoDB
6. Run:
   ```powershell
   npm install
   npm run migrate:reviews
   npm run db:verify
   npm start
   ```

---

## Option 3: JSON file fallback

If no DB env vars are set, the API continues using `data/reviews.json` (original behavior). No migration needed.

---

## Priority order

The store checks providers in this order:
1. MongoDB (if `MONGODB_URI` is set)
2. Supabase (if `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are set)
3. JSON file (if neither DB is configured)

---

## Alternative free databases

- **Neon** (serverless Postgres): similar to Supabase, would need a `pg` adapter
- **Railway** (Postgres): same as Neon
- **Render** (Postgres): same as Neon
- **MongoDB Atlas**: already supported (above)

---

## Security notes

- `.env` is gitignored; keep DB credentials server-side only
- MongoDB: restrict Network Access IPs in production
- Supabase: Service Role key is for server use; enable RLS policies for client access if needed

---

## Troubleshooting

**Reviews don't appear after submit:**
- Check server console for errors
- Verify DB connection: `npm run db:verify:mongo` or `npm run db:verify`
- Ensure `.env` has correct `MONGODB_URI` (and password)
- Restart server after `.env` changes

**Migration fails:**
- MongoDB: check username/password in connection string; ensure Network Access allows your IP
- Supabase: ensure schema SQL ran; check service key

**Server won't start:**
- Run `npm install` to ensure `mongodb` driver is installed
- Check for syntax errors: `node --check server.js`

---

## Files changed

- `lib/reviewsStore.js` — added MongoDB provider
- `scripts/migrate_reviews_to_mongodb.js` — importer from JSON
- `scripts/verify_mongodb_reviews.js` — sanity check
- `package.json` — added `mongodb` dependency + scripts
- `.env` — add `MONGODB_URI` (not committed)
- `README.md` — this doc

