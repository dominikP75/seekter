#!/usr/bin/env node
// Builds applications/tracker.html: a dashboard of every application record in
// applications/YYYY-MM/*.md. Read-only over the records; the output file sits in
// the git-ignored applications/ folder, so nothing personal is ever committed.
//
//   node scripts/tracker_html.mjs            # writes applications/tracker.html
//   node scripts/tracker_html.mjs --open     # ...and opens it in the default browser
//
// Follow-up date: a record's own `follow_up: YYYY-MM-DD` wins; otherwise it is the
// applied date plus FOLLOW_UP_BUSINESS_DAYS business days, and only while the
// status is still "applied" (a reply of any kind ends the follow-up).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPS = path.join(ROOT, "applications");
const OUT = path.join(APPS, "tracker.html");
const FOLLOW_UP_BUSINESS_DAYS = 7;

function parseRecord(file) {
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = m[2];
  const section = (name) => {
    const s = body.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"));
    return s ? s[1].trim() : "";
  };
  const log = section("Log").split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
  return { ...meta, why: section("Why it fits"), notes: section("Notes"), log, file: path.relative(APPS, file) };
}

function loadRecords() {
  const out = [];
  for (const dir of fs.readdirSync(APPS).filter((d) => /^\d{4}-\d{2}$/.test(d)).sort()) {
    for (const f of fs.readdirSync(path.join(APPS, dir))) {
      if (!f.endsWith(".md") || f === "README.md" || f === "skipped.md") continue;
      const r = parseRecord(path.join(APPS, dir, f));
      if (r && r.company) out.push(r);
    }
  }
  return out;
}

function countSkipped() {
  let n = 0;
  for (const dir of fs.readdirSync(APPS).filter((d) => /^\d{4}-\d{2}$/.test(d))) {
    const f = path.join(APPS, dir, "skipped.md");
    if (!fs.existsSync(f)) continue;
    n += fs.readFileSync(f, "utf8").split("\n").filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l)).length;
  }
  return n;
}

const iso = (d) => d.toISOString().slice(0, 10);
function addBusinessDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00Z");
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n--;
  }
  return iso(d);
}
const today = (() => { const n = new Date(); return iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))); })();
const fmt = (s) => s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);

function followUp(r) {
  if (r.status !== "applied" || !r.applied) return null;
  const date = r.follow_up || addBusinessDays(r.applied, FOLLOW_UP_BUSINESS_DAYS);
  const diff = daysBetween(today, date);
  return { date, state: diff < 0 ? "overdue" : diff === 0 ? "today" : diff <= 2 ? "soon" : "later", diff };
}

function followUpCell(fu) {
  if (!fu) return `<span class="muted">—</span>`;
  const label = fu.state === "overdue" ? `${-fu.diff}d overdue` : fu.state === "today" ? "today" : `in ${fu.diff}d`;
  return `<span class="fu fu-${fu.state}">${fmt(fu.date)}<em>${label}</em></span>`;
}

const STATUS_LABEL = { pending: "In progress", applied: "Applied", interviewing: "Interviewing", offer: "Offer", rejected: "Rejected", closed: "Closed" };
const SOURCE_LABEL = { freehire: "freehire", employers: "Career site", indeed: "Indeed", glassdoor: "Glassdoor", linkedin: "LinkedIn", manual: "By hand", links: "Your link" };

function build() {
  const recs = loadRecords().sort((a, b) => (b.applied || "").localeCompare(a.applied || "") || a.company.localeCompare(b.company));
  const skipped = countSkipped();
  const c = (s) => recs.filter((r) => r.status === s).length;
  const withFu = recs.map((r) => ({ r, fu: followUp(r) }));
  const due = withFu.filter((x) => x.fu && (x.fu.state === "overdue" || x.fu.state === "today")).sort((a, b) => a.fu.date.localeCompare(b.fu.date));
  const sent = recs.filter((r) => r.status !== "pending").length;
  const replied = recs.filter((r) => ["interviewing", "offer", "rejected"].includes(r.status)).length;
  const rate = sent ? Math.round((replied / sent) * 100) : 0;

  const cards = [
    ["Applied", sent, "violet", "all time"],
    ["Awaiting reply", c("applied"), "blue", "no answer yet"],
    ["Interviewing", c("interviewing"), "teal", "active processes"],
    ["Offers", c("offer"), "gold", "on the table"],
    ["Rejected", c("rejected"), "rose", `${rate}% reply rate`],
    ["Follow-ups due", due.length, "orange", "today or overdue"],
  ].map(([label, n, tone, sub]) => `<div class="card tone-${tone}"><div class="card-label">${label}</div><div class="card-n">${n}</div><div class="card-sub">${sub}</div></div>`).join("");

  const dueHtml = due.length
    ? `<ul class="due">${due.map(({ r, fu }) => `<li><span class="dot"></span><div><strong>${esc(r.company)}</strong> · ${esc(r.role)}<div class="muted">Applied ${fmt(r.applied)} ${r.apply_type === "email" ? "by email" : r.ats ? "via " + esc(r.ats) : ""}</div></div>${followUpCell(fu)}</li>`).join("")}</ul>`
    : `<p class="empty">Nothing due. The next follow-up date appears in the table below.</p>`;

  const rows = withFu.map(({ r, fu }) => {
    const last = r.log.length ? r.log[r.log.length - 1] : "";
    const notes = [r.why, r.notes].filter(Boolean).join(" — ");
    const fit = r.fit ? `<span class="fit fit-${esc(r.fit)}">${esc(r.fit)}/5</span>` : `<span class="muted">—</span>`;
    const where = r.remote_scope || r.location || "";
    return `<tr data-status="${esc(r.status)}" data-search="${esc((r.company + " " + r.role + " " + where).toLowerCase())}">
      <td><div class="co">${esc(r.company)}</div><div class="role">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.role)}</a>` : esc(r.role)}</div></td>
      <td>${fmt(r.applied)}</td>
      <td><span class="pill pill-${esc(r.status)}">${STATUS_LABEL[r.status] || esc(r.status)}</span></td>
      <td>${followUpCell(fu)}</td>
      <td class="where">${esc(where) || `<span class="muted">—</span>`}</td>
      <td>${fit}</td>
      <td>${esc(SOURCE_LABEL[r.source] || r.source || "—")}</td>
      <td>${fmt(r.updated)}${last ? `<div class="muted small">${esc(last.replace(/^\d{4}-\d{2}-\d{2}:\s*/, ""))}</div>` : ""}</td>
      <td class="notes" title="${esc(notes)}">${esc(notes) || `<span class="muted">—</span>`}</td>
    </tr>`;
  }).join("");

  const filters = ["all", "applied", "interviewing", "offer", "rejected", "pending", "closed"]
    .filter((s) => s === "all" || c(s))
    .map((s) => `<button data-f="${s}" class="${s === "all" ? "on" : ""}">${s === "all" ? "All" : STATUS_LABEL[s]} <span>${s === "all" ? recs.length : c(s)}</span></button>`).join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Application tracker</title>
<style>
:root{--ink:#14112b;--muted:#6b6889;--line:#e8e5f6;--bg:#f6f4ff;--card:#fff;
--violet:#6d4aff;--blue:#2f7cf6;--teal:#0fb5a6;--gold:#f2a516;--rose:#ef476f;--orange:#ff7a2f}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 "Inter",-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
header{background:linear-gradient(120deg,#3b1fd1 0%,#6d4aff 38%,#c43dd6 72%,#ff7a2f 100%);color:#fff;padding:56px 0 120px}
.wrap{max-width:1240px;margin:0 auto;padding:0 40px}
.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:600;opacity:.8}
h1{font-size:44px;line-height:1.1;margin:10px 0 8px;font-weight:750;letter-spacing:-.025em}
.sub{opacity:.85;font-size:16px}
.cards{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-top:-76px}
.card{background:var(--card);border-radius:18px;padding:20px 20px 18px;box-shadow:0 1px 2px rgba(20,17,43,.04),0 12px 32px -12px rgba(59,31,209,.22);position:relative;overflow:hidden}
.card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--tone)}
.card-label{font-size:13px;color:var(--muted);font-weight:550}
.card-n{font-size:38px;font-weight:750;letter-spacing:-.03em;color:var(--tone);margin:4px 0 0;line-height:1.1}
.card-sub{font-size:12px;color:var(--muted)}
.tone-violet{--tone:var(--violet)}.tone-blue{--tone:var(--blue)}.tone-teal{--tone:var(--teal)}.tone-gold{--tone:var(--gold)}.tone-rose{--tone:var(--rose)}.tone-orange{--tone:var(--orange)}
section{background:var(--card);border-radius:20px;padding:28px 32px;margin-top:24px;box-shadow:0 1px 2px rgba(20,17,43,.04),0 12px 32px -16px rgba(59,31,209,.16)}
h2{font-size:19px;margin:0 0 4px;letter-spacing:-.01em}
.hint{color:var(--muted);font-size:13px;margin:0 0 18px}
.due{list-style:none;margin:0;padding:0}
.due li{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--line)}
.due li:first-child{border-top:0}
.due li>div{flex:1}
.dot{width:10px;height:10px;border-radius:50%;background:var(--orange);box-shadow:0 0 0 5px rgba(255,122,47,.15)}
.empty{color:var(--muted);margin:0}
.toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px}
.filters{display:flex;gap:8px;flex-wrap:wrap}
.filters button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:550;color:var(--ink);cursor:pointer;transition:.15s}
.filters button span{color:var(--muted);margin-left:4px}
.filters button:hover{border-color:var(--violet)}
.filters button.on{background:var(--violet);border-color:var(--violet);color:#fff}
.filters button.on span{color:rgba(255,255,255,.75)}
input[type=search]{border:1px solid var(--line);border-radius:12px;padding:9px 14px;font:inherit;font-size:14px;min-width:260px;outline:none}
input[type=search]:focus{border-color:var(--violet);box-shadow:0 0 0 4px rgba(109,74,255,.12)}
.table{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:650;padding:0 14px 12px;white-space:nowrap}
td{padding:16px 14px;border-top:1px solid var(--line);vertical-align:top}
tr:hover td{background:#faf9ff}
.co{font-weight:650}
.role a{color:var(--violet);text-decoration:none}
.role a:hover{text-decoration:underline}
.where{max-width:180px;color:#3d3a5c}
.notes{max-width:300px;color:#3d3a5c;font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.muted{color:var(--muted)}.small{font-size:12px}
.pill{display:inline-block;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:650;white-space:nowrap}
.pill-applied{background:#e6efff;color:#1f5fd1}
.pill-interviewing{background:#d9f7f3;color:#08867b}
.pill-offer{background:#fff1d1;color:#a86a00}
.pill-rejected{background:#ffe3ea;color:#c42a52}
.pill-pending{background:#efe9ff;color:#5532e0}
.pill-closed{background:#eeedf3;color:#6b6889}
.fu{display:inline-flex;flex-direction:column;white-space:nowrap;font-weight:600}
.fu em{font-style:normal;font-size:11.5px;font-weight:600}
.fu-later em{color:var(--muted)}.fu-soon em{color:#b7790b}.fu-today em,.fu-overdue em{color:var(--orange)}
.fu-overdue{color:#d4511a}
.fit{display:inline-block;font-weight:700;font-size:12.5px;padding:3px 9px;border-radius:8px}
.fit-5,.fit-4{background:#d9f7f3;color:#08867b}.fit-3{background:#fff1d1;color:#a86a00}.fit-2,.fit-1{background:#ffe3ea;color:#c42a52}
footer{color:var(--muted);font-size:12.5px;text-align:center;padding:28px 0 48px}
@media (max-width:1000px){.cards{grid-template-columns:repeat(3,1fr)}h1{font-size:34px}.wrap{padding:0 20px}}
</style></head><body>
<header><div class="wrap"><div class="eyebrow">Seekter · Job search</div><h1>Application tracker</h1>
<div class="sub">${sent} applications sent · ${skipped} postings screened out · updated ${fmt(today)}</div></div></header>
<main class="wrap">
<div class="cards">${cards}</div>
<section><h2>Follow-ups due</h2><p class="hint">Applications still unanswered ${FOLLOW_UP_BUSINESS_DAYS} business days after you applied. A short, polite check-in to the recruiter or hiring manager works best.</p>${dueHtml}</section>
<section>
<div class="toolbar"><div><h2>All applications</h2><p class="hint" style="margin:0">Click a role to open the posting.</p></div>
<div class="filters">${filters}</div>
<input type="search" id="q" placeholder="Search company, role or location"></div>
<div class="table"><table><thead><tr><th>Company · Role</th><th>Applied</th><th>Status</th><th>Follow up</th><th>Location</th><th>Fit</th><th>Source</th><th>Last update</th><th>Notes</th></tr></thead>
<tbody>${rows || `<tr><td colspan="9" class="empty">No applications yet.</td></tr>`}</tbody></table></div>
</section>
</main>
<footer>Rebuild with <code>node scripts/tracker_html.mjs</code> · Change a status with <code>/seekter-log</code></footer>
<script>
const rows=[...document.querySelectorAll("tbody tr[data-status]")];let f="all";
const apply=()=>{const q=document.getElementById("q").value.trim().toLowerCase();rows.forEach(r=>{r.style.display=(f==="all"||r.dataset.status===f)&&(!q||r.dataset.search.includes(q))?"":"none"})};
document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("on"));b.classList.add("on");f=b.dataset.f;apply()});
document.getElementById("q").oninput=apply;
</script>
</body></html>`;
}

fs.writeFileSync(OUT, build());
console.log(`wrote ${path.relative(ROOT, OUT)}`);
if (process.argv.includes("--open")) {
  try { execFileSync(process.platform === "darwin" ? "open" : "xdg-open", [OUT]); } catch { /* opening is a convenience */ }
}
