import {
  createSession,
  createUser,
  deleteUser,
  destroySession,
  getUserById,
  listUsers,
  ownerCount,
  readState,
  resetUserPassword,
  sessionUser,
  setUserActive,
  userCount,
  writeState,
  type ServerRole,
  type ServerUser,
} from "../../../lib/dentalab-db";

export const dynamic = "force-dynamic";

const cookieName = "dentalab_session";
const stateKeys = ["jobs", "stocks", "moves", "cash", "extras", "partners", "brand"] as const;
type StateKey = (typeof stateKeys)[number];

function cookieToken(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || null;
}

function sessionCookie(token: string, expires: Date) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function clearCookie() {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function stateFor(user: ServerUser | null) {
  const all = Object.fromEntries(stateKeys.map((key) => [key, readState<unknown>(key)])) as Record<StateKey, unknown>;
  if (!user) return { jobs: [], stocks: [], moves: [], cash: [], extras: [], partners: [], brand: all.brand };
  if (user.role === "Owner") return all;
  if (user.role === "Admin") return { ...all, cash: [] };
  const jobs = (all.jobs as Array<Record<string, unknown>>).filter((job) =>
    user.role === "Teknisi" ? job.tech === user.name : user.role === "Asisten Teknisi" ? job.assistant === user.name : job.courier === user.name,
  );
  const extras = (all.extras as Array<Record<string, unknown>>).filter((entry) => entry.tech === user.name);
  return { jobs, stocks: [], moves: [], cash: [], extras, partners: [], brand: all.brand };
}

function bootstrap(user: ServerUser | null) {
  const users = user && (user.role === "Owner" || user.role === "Admin") ? listUsers() : user ? [user] : [];
  return { initialized: userCount() > 0, user, users, state: stateFor(user) };
}

export async function GET(request: Request) {
  const user = sessionUser(cookieToken(request));
  return json(bootstrap(user));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Permintaan tidak valid." }, 400);
  }
  const action = String(body.action || "");

  if (action === "setup") {
    if (userCount() > 0) return json({ error: "Sistem sudah diaktifkan." }, 409);
    const name = String(body.name || "").trim(), username = String(body.username || "").trim(), password = String(body.password || ""), labName = String(body.labName || "").trim();
    if (!name || username.length < 4 || password.length < 8) return json({ error: "Data Owner belum lengkap." }, 400);
    const owner = createUser(name, username, password, "Owner");
    const brand = readState<Record<string, string>>("brand");
    writeState("brand", { ...brand, name: labName || brand.name }, owner.id);
    const session = createSession(owner.id);
    return json(bootstrap(owner), 200, { "Set-Cookie": sessionCookie(session.token, session.expires) });
  }

  if (action === "login") {
    const { verifyUser } = await import("../../../lib/dentalab-db");
    const user = verifyUser(String(body.username || ""), String(body.password || ""));
    if (!user) return json({ error: "Username atau password tidak sesuai." }, 401);
    const session = createSession(user.id);
    return json(bootstrap(user), 200, { "Set-Cookie": sessionCookie(session.token, session.expires) });
  }

  const token = cookieToken(request);
  const actor = sessionUser(token);
  if (action === "logout") {
    destroySession(token);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }
  if (!actor) return json({ error: "Sesi berakhir. Silakan login kembali." }, 401);

  if (action === "createUser") {
    if (actor.role !== "Owner" && actor.role !== "Admin") return json({ error: "Akses ditolak." }, 403);
    const role = String(body.role || "") as ServerRole;
    if (role === "Owner" && actor.role !== "Owner") return json({ error: "Hanya Owner dapat membuat Owner kedua." }, 403);
    if (role === "Owner" && ownerCount() >= 2) return json({ error: "Maksimal dua akun Owner." }, 409);
    const name = String(body.name || "").trim(), username = String(body.username || "").trim(), password = String(body.password || "");
    if (!name || username.length < 4 || password.length < 8) return json({ error: "Data akun belum lengkap." }, 400);
    try { createUser(name, username, password, role); } catch { return json({ error: "Username sudah digunakan." }, 409); }
    return json(bootstrap(actor));
  }

  if (action === "resetPassword") {
    const target = getUserById(Number(body.userId));
    if (!target) return json({ error: "Akun tidak ditemukan." }, 404);
    const allowed = actor.id === target.id || actor.role === "Owner" || (actor.role === "Admin" && target.role !== "Owner");
    if (!allowed) return json({ error: "Akses ditolak." }, 403);
    const password = String(body.password || "");
    if (password.length < 8) return json({ error: "Password minimal 8 karakter." }, 400);
    resetUserPassword(target.id, password, actor.id);
    return json({ ok: true });
  }

  if (action === "toggleUser" || action === "deleteUser") {
    if (actor.role !== "Owner" && actor.role !== "Admin") return json({ error: "Akses ditolak." }, 403);
    const target = getUserById(Number(body.userId));
    if (!target || target.role === "Owner") return json({ error: "Akun Owner dilindungi." }, 403);
    if (action === "toggleUser") setUserActive(target.id, Boolean(body.active), actor.id); else deleteUser(target.id, actor.id);
    return json(bootstrap(actor));
  }

  if (action === "saveState") {
    const key = String(body.key || "") as StateKey;
    if (!stateKeys.includes(key)) return json({ error: "Jenis data tidak valid." }, 400);
    const ownerAllowed = actor.role === "Owner";
    const adminAllowed = actor.role === "Admin" && ["jobs", "stocks", "moves", "extras", "partners", "brand"].includes(key);
    if (ownerAllowed || adminAllowed) {
      if (actor.role === "Admin" && (key === "jobs" || key === "extras")) {
        const existing = readState<Array<{ id: string | number }>>(key);
        const incoming = Array.isArray(body.value) ? body.value as Array<{ id: string | number }> : [];
        if (existing.some((entry) => !incoming.some((candidate) => candidate.id === entry.id))) {
          return json({ error: key === "jobs" ? "Hanya Owner dapat menghapus pekerjaan." : "Hanya Owner dapat menghapus fee pekerja." }, 403);
        }
      }
      writeState(key, body.value, actor.id);
      return json({ ok: true });
    }
    if (key === "jobs" && ["Teknisi", "Asisten Teknisi", "Kurir"].includes(actor.role)) {
      const existing = readState<Array<Record<string, unknown>>>("jobs");
      const incoming = Array.isArray(body.value) ? body.value as Array<Record<string, unknown>> : [];
      const next = existing.map((job) => {
        const assigned = actor.role === "Teknisi" ? job.tech === actor.name : actor.role === "Asisten Teknisi" ? job.assistant === actor.name : job.courier === actor.name;
        const changed = incoming.find((candidate) => candidate.id === job.id);
        return assigned && changed ? { ...job, status: changed.status } : job;
      });
      writeState("jobs", next, actor.id);
      return json({ ok: true });
    }
    return json({ error: "Akses ditolak." }, 403);
  }

  if (action === "payment") {
    if (actor.role !== "Owner" && actor.role !== "Admin") return json({ error: "Akses ditolak." }, 403);
    const jobs = readState<Array<Record<string, unknown>>>("jobs");
    const cash = readState<Array<Record<string, unknown>>>("cash");
    const jobId = String(body.jobId || ""), amount = Math.max(0, Number(body.amount || 0));
    const job = jobs.find((item) => item.id === jobId);
    if (!job || amount <= 0) return json({ error: "Pembayaran tidak valid." }, 400);
    const price = Number(job.price || 0), previousPaid = Number(job.paid || 0), paid = Math.min(price, previousPaid + amount);
    const paymentStatus = paid <= 0 ? "Pending" : paid < price ? "DP" : "Lunas";
    writeState("jobs", jobs.map((item) => item.id === jobId ? { ...item, paid, paymentStatus } : item), actor.id);
    writeState("cash", [{ id: Date.now(), type: "Masuk", category: paymentStatus === "Lunas" ? "Pelunasan pekerjaan" : "DP pekerjaan", amount: paid - previousPaid, date: new Date().toISOString().slice(0, 10), note: jobId }, ...cash], actor.id);
    return json(bootstrap(actor));
  }

  return json({ error: "Aksi tidak dikenali." }, 400);
}
