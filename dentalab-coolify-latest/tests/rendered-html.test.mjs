import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("akun dan sesi memakai database server lintas perangkat", async () => {
  const [client, route, database, docker] = await Promise.all([
    source("app/DentalabClient.tsx"), source("app/api/dentalab/route.ts"),
    source("lib/dentalab-db.ts"), source("Dockerfile"),
  ]);
  assert.doesNotMatch(client, /localStorage|sessionStorage|passwordHash/);
  assert.match(client, /Sesi server aktif/);
  assert.match(route, /HttpOnly; SameSite=Lax/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS sessions/);
  assert.match(database, /scryptSync/);
  assert.match(docker, /DATABASE_PATH=\/data\/dentalab.sqlite/);
  assert.match(docker, /VOLUME \["\/data"\]/);
});

test("maksimal dua Owner dan laporan hanya tampil untuk Owner", async () => {
  const [client, route] = await Promise.all([source("app/DentalabClient.tsx"), source("app/api/dentalab/route.ts")]);
  assert.match(route, /ownerCount\(\) >= 2/);
  assert.match(route, /Admin"\) return \{ \.\.\.all, cash: \[\] \}/);
  assert.match(client, /owner \? menus : manager \? menus\.filter/);
  assert.match(client, /active === "Keuangan" && owner/);
  assert.match(client, /active === "Laporan" && owner/);
  assert.match(client, /Owner maksimal dua akun/);
});

test("pekerjaan memiliki status Pending, DP, dan Lunas", async () => {
  const [client, route, css] = await Promise.all([source("app/DentalabClient.tsx"), source("app/api/dentalab/route.ts"), source("app/globals.css")]);
  for (const status of ["Pending", "DP", "Lunas"]) assert.match(client, new RegExp(status));
  assert.match(route, /paymentStatus/);
  assert.match(route, /DP pekerjaan/);
  assert.match(client, /Catat DP/);
  assert.match(css, /\.pay-pending/);
  assert.match(css, /\.pay-dp/);
  assert.match(css, /\.pay-lunas/);
});

test("stok dan stok opname dapat diedit atau dihapus", async () => {
  const client = await source("app/DentalabClient.tsx");
  assert.match(client, /deleteStock/);
  assert.match(client, /adjustMove/);
  assert.match(client, /deleteMove/);
  assert.match(client, /previousQty/);
  assert.match(client, /Koreksi stok opname/);
});
