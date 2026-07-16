import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function sources() {
  return Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
}

test("pekerjaan menjadi pusat input jenis, tim, dan fee", async () => {
  const [page] = await sources();

  assert.doesNotMatch(page, /"Jenis & Tarif"/);
  assert.match(page, /name="workName"/);
  assert.match(page, /name="feeTech"/);
  assert.match(page, /name="feeAssistant"/);
  assert.match(page, /name="feeCourier"/);
  assert.match(page, /"Teknisi","Asisten Teknisi","Kurir"/);
  assert.match(page, /active==="Fee Tim"/);
});

test("alur progres dan konfirmasi fee terlihat tegas", async () => {
  const [page, css] = await sources();

  for (const stage of ["MODEL", "PRODUKSI", "FINISHING", "QUALITY CONTROL", "SELESAI & FEE"]) {
    assert.match(page, new RegExp(stage));
  }

  assert.match(page, /Konfirmasi selesai & catat fee tim/);
  assert.match(page, /Total fee tim/);
  assert.match(css, /\.strong-flow/);
  assert.match(css, /\.stage-production/);
  assert.match(css, /\.s-finishing/);
  assert.match(css, /\.s-qc/);
  assert.match(css, /\.s-selesai/);
});
