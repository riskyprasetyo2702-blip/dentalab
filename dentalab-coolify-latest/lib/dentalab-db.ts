import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export type ServerRole = "Owner" | "Admin" | "Teknisi" | "Asisten Teknisi" | "Kurir";
export type ServerUser = { id: number; name: string; username: string; role: ServerRole; active: boolean };

const databasePath = process.env.DATABASE_PATH || resolve(process.cwd(), ".data/dentalab.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);
db.exec(`CREATE TABLE IF NOT EXISTS app_state (
  state_key TEXT PRIMARY KEY,
  state_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const defaults: Record<string, unknown> = {
  jobs: [],
  stocks: [],
  moves: [],
  cash: [],
  extras: [],
  partners: [],
  brand: { name: "DentaLab Pro", subtitle: "Laboratory ERP", logo: "" },
};

for (const [key, value] of Object.entries(defaults)) {
  db.prepare("INSERT OR IGNORE INTO app_state (state_key, state_value) VALUES (?, ?)").run(key, JSON.stringify(value));
}

const userColumns = "id, name, username, role, active";

export function userCount() {
  return Number((db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count);
}

export function ownerCount() {
  return Number((db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Owner'").get() as { count: number }).count);
}

export function listUsers(): ServerUser[] {
  return (db.prepare(`SELECT ${userColumns} FROM users ORDER BY CASE role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END, name`).all() as Array<Record<string, unknown>>).map(toUser);
}

export function getUserById(id: number): ServerUser | null {
  const row = db.prepare(`SELECT ${userColumns} FROM users WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

function toUser(row: Record<string, unknown>): ServerUser {
  return { id: Number(row.id), name: String(row.name), username: String(row.username), role: String(row.role) as ServerRole, active: Boolean(row.active) };
}

function passwordDigest(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function createUser(name: string, username: string, password: string, role: ServerRole) {
  const salt = randomBytes(16).toString("hex");
  const result = db.prepare("INSERT INTO users (name, username, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)").run(name.trim(), username.trim().toLowerCase(), passwordDigest(password, salt), salt, role);
  audit(Number(result.lastInsertRowid), "USER_CREATED", `${role}:${username.trim().toLowerCase()}`);
  return getUserById(Number(result.lastInsertRowid))!;
}

export function verifyUser(username: string, password: string): ServerUser | null {
  const row = db.prepare("SELECT id, name, username, role, active, password_hash, salt FROM users WHERE username = ?").get(username.trim().toLowerCase()) as Record<string, unknown> | undefined;
  if (!row || !Boolean(row.active)) return null;
  const actual = Buffer.from(passwordDigest(password, String(row.salt)), "hex");
  const expected = Buffer.from(String(row.password_hash), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? toUser(row) : null;
}

export function resetUserPassword(id: number, password: string, actorId: number) {
  const salt = randomBytes(16).toString("hex");
  db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(passwordDigest(password, salt), salt, id);
  audit(actorId, "PASSWORD_RESET", String(id));
}

export function setUserActive(id: number, active: boolean, actorId: number) {
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  audit(actorId, active ? "USER_ENABLED" : "USER_DISABLED", String(id));
}

export function deleteUser(id: number, actorId: number) {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  audit(actorId, "USER_DELETED", String(id));
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(tokenHash(token), userId, expires.toISOString());
  return { token, expires };
}

export function sessionUser(token?: string | null) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.${userColumns.split(", ").join(", u.")} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).get(tokenHash(token), new Date().toISOString()) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function destroySession(token?: string | null) {
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
}

export function readState<T>(key: string): T {
  const row = db.prepare("SELECT state_value FROM app_state WHERE state_key = ?").get(key) as { state_value: string } | undefined;
  return JSON.parse(row?.state_value || JSON.stringify(defaults[key] ?? null)) as T;
}

export function writeState(key: string, value: unknown, actorId: number) {
  db.prepare("INSERT INTO app_state (state_key, state_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = CURRENT_TIMESTAMP").run(key, JSON.stringify(value));
  audit(actorId, "STATE_UPDATED", key);
}

export function audit(userId: number | null, action: string, detail: string) {
  db.prepare("INSERT INTO audit_log (user_id, action, detail) VALUES (?, ?, ?)").run(userId, action, detail.slice(0, 500));
}

