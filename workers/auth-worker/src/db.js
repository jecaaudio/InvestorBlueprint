export async function getUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
}

export async function getUserById(db, id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
}

export async function insertUser(db, user) {
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, subscription_plan, trial_starts_at, trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      user.email,
      user.passwordHash,
      user.passwordSalt,
      user.subscriptionPlan,
      user.trialStartsAt || null,
      user.trialEndsAt || null
    )
    .run();
}

export async function startUserTrial(db, userId, { trialStartsAt, trialEndsAt }) {
  await db
    .prepare(
      `UPDATE users SET subscription_plan = 'trial', trial_starts_at = ?, trial_ends_at = ? WHERE id = ?`
    )
    .bind(trialStartsAt, trialEndsAt, userId)
    .run();
}

export async function insertSession(db, { token, userId, expiresAt }) {
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
}

export async function getSession(db, token) {
  return db.prepare("SELECT * FROM sessions WHERE token = ?").bind(token).first();
}

export async function deleteSession(db, token) {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export async function listSavedCalculations(db, userId) {
  const result = await db
    .prepare("SELECT * FROM saved_calculations WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(userId)
    .all();
  return result.results || [];
}

export async function upsertSavedCalculation(db, { id, userId, tool, name, state }) {
  await db
    .prepare(
      `INSERT INTO saved_calculations (id, user_id, tool, name, state, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, state = excluded.state, updated_at = datetime('now')`
    )
    .bind(id, userId, tool, name, state)
    .run();
}

export async function deleteSavedCalculation(db, id, userId) {
  await db.prepare("DELETE FROM saved_calculations WHERE id = ? AND user_id = ?").bind(id, userId).run();
}
