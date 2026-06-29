// Minimal in-memory stand-in for the D1 binding, just enough to exercise the
// fixed queries in src/db.js without spinning up real SQLite/D1.
export function createFakeD1() {
  const users = new Map();
  const sessions = new Map();
  const savedCalculations = new Map();

  function statement(sql) {
    return {
      bind(...args) {
        return { sql, args };
      }
    };
  }

  async function run(query) {
    const { sql, args } = query;

    if (sql.startsWith("INSERT INTO users")) {
      const [id, email, password_hash, password_salt, subscription_plan, trial_starts_at, trial_ends_at] = args;
      users.set(id, { id, email, password_hash, password_salt, subscription_plan, trial_starts_at, trial_ends_at });
      return;
    }

    if (sql.startsWith("UPDATE users SET subscription_plan")) {
      const [trial_starts_at, trial_ends_at, id] = args;
      const user = users.get(id);
      if (user) Object.assign(user, { subscription_plan: "trial", trial_starts_at, trial_ends_at });
      return;
    }

    if (sql.startsWith("INSERT INTO sessions")) {
      const [token, user_id, expires_at] = args;
      sessions.set(token, { token, user_id, expires_at });
      return;
    }

    if (sql.startsWith("DELETE FROM sessions")) {
      sessions.delete(args[0]);
      return;
    }

    if (sql.startsWith("INSERT INTO saved_calculations")) {
      const [id, user_id, tool, name, state] = args;
      savedCalculations.set(id, { id, user_id, tool, name, state, updated_at: new Date().toISOString() });
      return;
    }

    if (sql.startsWith("DELETE FROM saved_calculations")) {
      const [id, user_id] = args;
      const row = savedCalculations.get(id);
      if (row && row.user_id === user_id) savedCalculations.delete(id);
      return;
    }

    throw new Error(`fakeD1: unhandled run() query: ${sql}`);
  }

  async function first(query) {
    const { sql, args } = query;

    if (sql === "SELECT * FROM users WHERE email = ?") {
      return [...users.values()].find((u) => u.email === args[0]) || null;
    }
    if (sql === "SELECT * FROM users WHERE id = ?") {
      return users.get(args[0]) || null;
    }
    if (sql === "SELECT * FROM sessions WHERE token = ?") {
      return sessions.get(args[0]) || null;
    }

    throw new Error(`fakeD1: unhandled first() query: ${sql}`);
  }

  async function all(query) {
    const { sql, args } = query;

    if (sql.startsWith("SELECT * FROM saved_calculations WHERE user_id")) {
      const results = [...savedCalculations.values()]
        .filter((row) => row.user_id === args[0])
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      return { results };
    }

    throw new Error(`fakeD1: unhandled all() query: ${sql}`);
  }

  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          run: () => run({ sql, args }),
          first: () => first({ sql, args }),
          all: () => all({ sql, args })
        })
      };
    },
    _debug: { users, sessions, savedCalculations }
  };
}
