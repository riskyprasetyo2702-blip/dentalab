"use client";

import { useMemo, useState } from "react";

const jobs = [
  { id: "LG-260714-028", patient: "Ny. Rina A.", clinic: "Klinik Senyum", work: "Crown Zirconia", teeth: "11, 12", tech: "Andi", due: "Hari ini, 16:00", status: "Finishing", bonus: 150000, urgent: true },
  { id: "LG-260714-027", patient: "Tn. Budi S.", clinic: "drg. Maya", work: "Flexible Denture", teeth: "34–37", tech: "Rizal", due: "Besok, 10:00", status: "Produksi", bonus: 180000 },
  { id: "LG-260714-026", patient: "Ny. Siska P.", clinic: "Dentalia", work: "PFM Bridge", teeth: "21–23", tech: "Dimas", due: "16 Jul, 13:00", status: "QC", bonus: 210000 },
  { id: "LG-260714-025", patient: "Tn. Anton W.", clinic: "Klinik Ceria", work: "Acrylic Denture", teeth: "Full rahang atas", tech: "Andi", due: "17 Jul, 09:00", status: "Model", bonus: 130000 },
];

const stock = [
  { name: "Zirconia Block A2", unit: "disc", qty: 2, min: 3, color: "red" },
  { name: "Cold Mould Seal", unit: "botol", qty: 1, min: 2, color: "red" },
  { name: "Acrylic Powder Pink", unit: "kg", qty: 3.5, min: 2, color: "amber" },
];

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Juli 2026");
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(() => jobs.filter((j) => `${j.id} ${j.patient} ${j.clinic} ${j.work}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const menus = ["Dashboard", "Pekerjaan", "Barang Masuk", "Barang Keluar", "Stok Bahan", "Keuangan", "Bonus Teknisi", "Laporan"];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">DL</span><div><b>DentaLab</b><small>Manajemen Laboratorium</small></div></div>
        <nav aria-label="Menu utama">
          {menus.map((menu, i) => <button key={menu} onClick={() => setActive(menu)} className={active === menu ? "active" : ""}><span className="nav-icon">{["⌂","◈","↓","↑","▣","◒","★","▤"][i]}</span>{menu}{menu === "Stok Bahan" && <em>3</em>}</button>)}
        </nav>
        <div className="side-card"><span>●</span><div><b>Database tersimpan</b><small>Pencadangan otomatis aktif</small></div></div>
        <button className="profile"><span>SA</span><div><b>Siti Aminah</b><small>Administrator</small></div><i>⌄</i></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <label className="search">⌕<input aria-label="Cari pekerjaan" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari no. order, pasien, atau klinik..."/><kbd>⌘ K</kbd></label>
          <button className="icon-btn" aria-label="Notifikasi">♢<span /></button>
          <button className="primary" onClick={() => setShowForm(true)}>＋ Pekerjaan Baru</button>
        </header>

        <div className="content">
          <div className="heading"><div><p className="eyebrow">SELASA, 14 JULI 2026</p><h1>{active}</h1><p>Selamat siang, Siti. Berikut kondisi lab Anda hari ini.</p></div><select aria-label="Periode" value={period} onChange={(e) => setPeriod(e.target.value)}><option>Juli 2026</option><option>Juni 2026</option><option>Mei 2026</option></select></div>

          <div className="metrics">
            <article><div className="metric-top"><span className="mint">◈</span><b>+12,5%</b></div><strong>28</strong><p>Pekerjaan aktif</p><small>7 jatuh tempo minggu ini</small></article>
            <article><div className="metric-top"><span className="blue">✓</span><b>+8,2%</b></div><strong>94</strong><p>Selesai bulan ini</p><small>89 dikirim tepat waktu</small></article>
            <article><div className="metric-top"><span className="orange">▣</span><b className="warn">Perlu tindakan</b></div><strong>3</strong><p>Stok menipis</p><small>2 bahan sudah di bawah minimum</small></article>
            <article><div className="metric-top"><span className="violet">Rp</span><b>+18,4%</b></div><strong>47,8 jt</strong><p>Pendapatan bulan ini</p><small>Laba bersih Rp 18,6 jt</small></article>
          </div>

          <div className="main-grid">
            <section className="panel jobs-panel">
              <div className="panel-head"><div><h2>Pekerjaan berjalan</h2><p>Urut berdasarkan tenggat terdekat</p></div><button onClick={() => setActive("Pekerjaan")}>Lihat semua →</button></div>
              <div className="table-wrap"><table><thead><tr><th>ORDER & PASIEN</th><th>JENIS PEKERJAAN</th><th>TEKNISI</th><th>TENGGAT</th><th>STATUS</th></tr></thead><tbody>{filtered.map(job => <tr key={job.id}><td><b>{job.id}</b><span>{job.patient} · {job.clinic}</span></td><td><b>{job.work}</b><span>Gigi {job.teeth}</span></td><td><span className="avatar">{job.tech.slice(0,2).toUpperCase()}</span>{job.tech}</td><td className={job.urgent ? "urgent" : ""}><b>{job.due}</b>{job.urgent && <span>Segera dikirim</span>}</td><td><span className={`status ${job.status.toLowerCase()}`}>{job.status}</span></td></tr>)}</tbody></table></div>
            </section>

            <aside className="right-stack">
              <section className="panel stock-panel"><div className="panel-head"><div><h2>Perlu restok</h2><p>Bahan mendekati batas minimum</p></div><button onClick={() => setActive("Stok Bahan")}>Kelola →</button></div>{stock.map(item => <div className="stock-row" key={item.name}><span className={`stock-icon ${item.color}`}>▣</span><div><b>{item.name}</b><small>Minimum {item.min} {item.unit}</small></div><strong>{item.qty} <small>{item.unit}</small></strong></div>)}</section>
              <section className="panel bonus"><div className="panel-head"><div><h2>Bonus teknisi · Juli</h2><p>Dari pekerjaan yang telah selesai</p></div><button onClick={() => setActive("Bonus Teknisi")}>Rincian →</button></div><div className="bonus-total"><span>Total sementara</span><strong>{money(4825000)}</strong></div><div className="bonus-bars"><div><span>Andi</span><i><b style={{width:"88%"}} /></i><strong>1,64 jt</strong></div><div><span>Dimas</span><i><b style={{width:"72%"}} /></i><strong>1,35 jt</strong></div><div><span>Rizal</span><i><b style={{width:"63%"}} /></i><strong>1,18 jt</strong></div><div><span>Lina</span><i><b style={{width:"35%"}} /></i><strong>655 rb</strong></div></div></section>
            </aside>
          </div>

          <section className="panel finance"><div className="panel-head"><div><h2>Ringkasan keuangan</h2><p>Arus kas {period}</p></div><button onClick={() => setActive("Keuangan")}>Buka laporan lengkap →</button></div><div className="finance-grid"><div><span>Pendapatan</span><strong>{money(47850000)}</strong><small>↑ 18,4% dari bulan lalu</small></div><div><span>Pengeluaran</span><strong>{money(24390000)}</strong><small>↓ 3,2% lebih hemat</small></div><div><span>Bonus teknisi</span><strong>{money(4825000)}</strong><small>20 teknisi / pekerjaan selesai</small></div><div className="profit"><span>Estimasi laba bersih</span><strong>{money(18635000)}</strong><small>Margin bersih 38,9%</small></div></div></section>
        </div>
      </section>

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="Pekerjaan baru" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setShowForm(false)}>×</button><p className="eyebrow">ORDER BARU</p><h2>Catat pekerjaan masuk</h2><div className="form-grid"><label>Nama pasien<input placeholder="Contoh: Budi Santoso"/></label><label>Klinik / dokter<input placeholder="Nama pengirim"/></label><label>Jenis pekerjaan<select><option>Crown Zirconia</option><option>Flexible Denture</option><option>PFM Bridge</option><option>Acrylic Denture</option></select></label><label>Nomor gigi<input placeholder="Contoh: 11, 12"/></label><label>Teknisi<select><option>Andi</option><option>Dimas</option><option>Rizal</option><option>Lina</option></select></label><label>Tanggal selesai<input type="date"/></label></div><button className="primary save" onClick={() => setShowForm(false)}>Simpan pekerjaan</button></section></div>}
    </main>
  );
}
