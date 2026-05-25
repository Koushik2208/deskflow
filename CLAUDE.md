# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Permanent Rules

These rules are non-negotiable and apply to every change in this repo:

**Database**
- MongoDB + Mongoose only. Never suggest or introduce any other database or ORM.
- Banned: Prisma, Drizzle, Supabase, TypeORM, Sequelize — do not mention or install them.

**Async style**
- Always use `async/await`. Never use callbacks or raw `.then()/.catch()` chains (except in `server.js` boot where the chain gates the `app.listen` call).

**Feature development order**
- When adding any new feature: create the Mongoose **model** first, then the **controller**, then the **route**. Never skip or reorder these steps.
- Model, controller, and route files are independent — create all three in parallel, not sequentially.
- **MANDATORY — server.js wiring is ONE atomic edit, no exceptions.** When mounting a new route, the `require` line and the `app.use(...)` line MUST be added in the same Edit/Write call. This has been broken three times in this project. The failure mode is always the same: add `require` first, IDE flags it as unused, add `app.use` in a second edit. Do not do this. Plan the edit to include both lines before touching the file. If you catch yourself about to add only the `require`, stop and include the `app.use` in the same call. There are no circumstances under which splitting this into two edits is acceptable. If the require and app.use lines are non-contiguous in the file, use a full Write to rewrite server.js rather than two separate edits. A correct result via two edits is still a rule violation.

**Parallelization — fan-out is default, not optional**
- When building any new feature, always create model, controller, and route files simultaneously in parallel using fan-out. Never create them sequentially.
- When building multiple features at once, fan-out all independent modules simultaneously before any integration.
- Sequential file creation is never acceptable unless a file has a hard dependency on another file that doesn't exist yet.
- Integration (wiring into server.js) always happens last, in one single edit, after all parallel files are complete.

**Package discipline**
- Never install a package unless it is strictly required for the feature being built. The current dependency list covers auth, DB, and HTTP — exhaust those before reaching for npm.

**Folder structure — fixed, do not change**
- `src/models/` — Mongoose schemas
- `src/controllers/` — async handler functions
- `src/routes/` — Express routers, thin wrappers around controllers
- `src/middleware/` — auth guards and request-pipeline logic
- `src/config/` — DB connection and env-derived config

**DB connection**
- Mongoose connection logic lives exclusively in `src/config/db.js` as an exported `connectDB` async function. Never put connection logic directly in `server.js`.

**Mongoose post hooks — model reference**
- Never use `this.constructor` or `doc.constructor` inside post hooks to reference the model. In Mongoose 9 these can resolve to the base `Document` class, causing the hook to fail silently. Always use `mongoose.model('ModelName')` directly:
  ```js
  reviewSchema.post('save', async function () {
    await mongoose.model('Review').recalcProductRatings(this.product);
  });
  ```

**Mongoose async pre-hooks (Mongoose 9)**
- Never add a `next` parameter to `async` pre-hook functions — Mongoose 9 resolves them automatically when the promise settles. Calling `next()` throws `TypeError: next is not a function`.
- Correct pattern:
  ```js
  userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
  });
  ```

**Mongoose token generation hooks — use pre('validate') not pre('save')**
- If a field has `required: true` and its value is auto-generated in a hook
  (e.g. crypto token, slug from a missing source field), put the generation
  in a `pre('validate')` hook, not `pre('save')`.
- Reason: Mongoose 9 runs validation before pre('save'). A required field
  that is still empty at validation time will throw a ValidationError before
  the pre('save') hook ever fires.
- Correct pattern:
  ```js
  guestPassSchema.pre('validate', function () {
    if (!this.token) {
      this.token = require('crypto').randomBytes(32).toString('hex');
    }
  });
  ```
- This applies to any auto-generated required field: tokens, slugs derived
  from a field that might not exist yet, UUIDs, etc.

**Derived fields and pre-save hooks**
- Generate derived fields (e.g., `slug` from `name`) in a `pre('save')` hook on the schema, not in controller code. The hook fires on both `Model.create()` and `document.save()`.
- `findByIdAndUpdate` / `findOneAndUpdate` bypass `pre('save')` hooks entirely. When an update must trigger hook logic (e.g., slug regeneration on name change), use `findById` to get the document then `document.save()` instead of `findByIdAndUpdate`.
- Correct pattern for update that must trigger pre-save hook:
  ```js
  const doc = await Model.findById(id);
  doc.name = newName; // pre('save') will regenerate slug
  await doc.save();
  ```

**Date arithmetic — always use UTC methods**
- When constructing Date objects from date + time strings for comparison
  or storage, always use UTC methods (`setUTCHours`, `setUTCMinutes`) not
  local time methods (`setHours`, `setMinutes`).
- Reason: Mongoose stores dates in UTC. Mixing local and UTC arithmetic
  produces wrong results in non-UTC environments.

**Security — JWT_SECRET must be a real secret**
- On every project setup (first `npm run dev`, new clone, new env file), check `.env` and verify `JWT_SECRET` is a crypto-random string, not a placeholder.
- Placeholders to reject: `your_jwt_secret_here`, `secret`, `changeme`, `jwt_secret`, any value under 32 characters, any value that looks like a word or phrase.
- A real secret looks like: 64+ hex characters or a long random base64 string.
- If it looks like a placeholder, **warn immediately before doing anything else**: `WARNING: JWT_SECRET in .env appears to be a placeholder. Replace it with a crypto-random value before proceeding. Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- Never generate or suggest a JWT secret inline in code — always instruct the user to generate one themselves and put it in `.env`.

**Security — input type guards**
- Any controller that uses `req.body` fields directly in a Mongoose query (not just as document data) MUST validate the type first to prevent NoSQL injection. MongoDB operators (`$gt`, `$where`, etc.) in a query object will be executed.
- The established pattern for string fields used in queries:
  ```js
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  ```
- Apply this pattern in every controller that calls `Model.findOne({ field: req.body.field })`.

**Auth controller — shared creation logic**
- When multiple registration paths (or similar creation flows) share the same logic, delegate to a private helper function (e.g. `createUser(req, res, role)`). Do not duplicate the logic across handlers. Any change to the shared flow must happen in the helper only.

**Model indexes — required for every new model**
- Every model whose documents are queried by a non-`_id` field in a list or lookup context MUST have an explicit `schema.index(...)` call before `module.exports`.
- Fields that always need an index: any field used in `Model.find({ field: value })` where the collection could grow beyond a few hundred documents.
- Document all indexes for your project here as they are added.

## Other Conventions

- **Auth pattern:** JWT issued on login (`expiresIn: '7d'`), verified in middleware before protected routes.
- **Password storage:** bcryptjs — hash on save (12 rounds), compare on login; never store plaintext.
- **Test suite:** `node tests/api.test.js` — pure Node.js, no framework. Requires a running server. Uses a unique suffix per run to avoid DB collisions. Exit code 1 on any failure (CI-friendly).

## Known Limitations

Document project-specific deferred issues here as they are discovered during the build.

## Scalability Notes

The current architecture is a single-process Express server with a direct MongoDB connection. It is appropriate for development and low-to-medium traffic. Here are the ceilings and when to revisit:

**When to add pagination:** Once any list endpoint collection exceeds ~500 items, unbounded list queries will start causing noticeable latency. Add pagination before going to production with real data.

**When to cache `protect` middleware:** Every authenticated request does a `User.findById` DB round-trip. At ~100 req/s this is 100 MongoDB reads/s just for auth. At that point, cache the user document in Redis with a TTL matching the JWT expiry.

**When to use transactions:** Any time two or more writes must be atomic. Add MongoDB multi-document transactions before handling real payments.

**When to move to a replica set / Atlas:** The current setup uses a single `mongoose.connect` with no connection pool tuning. For production, use MongoDB Atlas (or a replica set) and set `maxPoolSize` in the connection options. The `connectDB` in `src/config/db.js` is the only place to change this.

**When to split into services:** The current monolith is intentional and appropriate. Consider splitting only if independent scaling is needed. Do not pre-split.

**End of project — always generate these before closing**
- Postman collection: generate postman_collection.json 
  covering all endpoints with sample request bodies
- Test suite: generate tests/api.test.js covering all 
  endpoints including edge cases and auth checks
- Both should be generated after all features are complete, 
  not during development
