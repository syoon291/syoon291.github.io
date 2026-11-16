// Liftlog UI. State lives in localStorage; all math is in core.js (window.Lift).
(function () {
  "use strict";
  const L = window.Lift;
  const KEY = "liftlog.v1";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAY = L.DAY;

  // ---------- state ----------
  const fresh = () => ({ v: 1, unit: "kg", plan: null, next: 0, sessions: [], draft: null, form: { goal: "hypertrophy", days: 4, equip: "gym", level: "intermediate" }, focus: null });
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return { ...fresh(), ...s }; } catch (e) { /* private mode or bad JSON */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }
  let tab = S.plan ? "train" : "plan";
  let lastSaved = null; // summary card after finishing a session

  // ---------- units ----------
  const LB = 2.20462;
  const disp = (kg) => (S.unit === "lb" ? kg * LB : kg);
  const toKg = (v) => (S.unit === "lb" ? v / LB : v);
  const unit = () => S.unit;
  function fmtW(kg, ex) {
    if (kg == null) return "";
    let v = disp(kg);
    const step = S.unit === "lb" ? (ex && ex.inc && ex.inc < 2.5 ? 2.5 : 5) : 0.5;
    v = Math.round(v / step) * step;
    return String(+v.toFixed(1));
  }
  const fmtBig = (kg) => { const v = disp(kg); return v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? Math.round(v / 1e3) + "k" : Math.round(v).toLocaleString("en-US"); };
  const date = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const exName = (id) => (L.BY_ID[id] ? L.BY_ID[id].name : id);

  // ---------- render ----------
  function render() {
    for (const b of document.querySelectorAll("[data-tab]")) { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); }
    const v = $("#view");
    v.innerHTML = { plan: viewPlan, train: viewTrain, insights: viewInsights, data: viewData }[tab]();
  }

  // ---------- PLAN ----------
  function seg(name, value, opts) {
    return `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-form="${name}" data-val="${v}" aria-pressed="${String(v) === String(value)}">${l}</button>`).join("")}</div>`;
  }
  function viewPlan() {
    const f = S.form;
    const preview = L.generatePlan(f);
    const same = S.plan && ["goal", "days", "equip", "level"].every((k) => String(S.plan[k]) === String(f[k]));
    const shown = same ? S.plan : preview;
    return `
      <section class="panel">
        <h2>Build a plan</h2>
        <p class="muted">Pick your goal and schedule. The split, exercises, sets, rep ranges and rest times follow from it.</p>
        <div class="form-grid">
          <div><span class="lbl">Goal</span>${seg("goal", f.goal, [["strength", "Strength"], ["hypertrophy", "Muscle"], ["general", "General fitness"]])}</div>
          <div><span class="lbl">Days per week</span>${seg("days", f.days, [[2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"]])}</div>
          <div><span class="lbl">Equipment</span>${seg("equip", f.equip, [["gym", "Full gym"], ["db", "Dumbbells"], ["bw", "Bodyweight"]])}</div>
          <div><span class="lbl">Experience</span>${seg("level", f.level, [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]])}</div>
        </div>
        <div class="cta">
          ${same ? `<span class="pill good">✓ This is your current plan</span>` : `<button class="btn primary" data-act="use-plan">${S.plan ? "Replace my plan with this" : "Use this plan"}</button>`}
          ${S.plan && !same ? `<span class="muted small">Your logged sessions are kept.</span>` : ""}
        </div>
      </section>

      <section class="panel">
        <p class="eyebrow">${esc(shown.split)}</p>
        <div class="days">${shown.schedule.map((d, i) => `
          <article class="day">
            <h3>${i + 1}. ${esc(d.name)}</h3>
            <ol>${d.slots.map((s) => `<li><span>${esc(exName(s.exId))}${s.main ? ` <span class="pill">main</span>` : ""}</span><span class="rx">${s.sets} × ${s.lo}–${s.hi} · RIR ${s.rir} · ${dur(s.rest)}</span></li>`).join("")}</ol>
          </article>`).join("")}
        </div>
      </section>

      <section class="panel">
        <h2>Volume check</h2>
        <p class="muted">Planned hard sets per muscle per week. A set counts once for each muscle it mainly trains and half for a muscle that assists. Research supports roughly <b>10–20 weekly sets</b> for growth (shaded).</p>
        ${muscleChart(L.plannedSets(shown), null)}
        ${volumeNote(L.plannedSets(shown))}
      </section>`;
  }
  function volumeNote(sets) {
    const under = L.MUSCLES.filter((m) => sets[m] < 10 && m !== "core");
    const over = L.MUSCLES.filter((m) => sets[m] > 20);
    if (!under.length && !over.length) return `<div class="note">Every muscle lands in the 10–20 range.</div>`;
    return `<div class="note">${under.length ? `Under 10 sets: <b>${under.join(", ")}</b>. Fine for maintenance, add a set or two where you want growth. ` : ""}${over.length ? `Over 20 sets: <b>${over.join(", ")}</b>. Watch recovery.` : ""}</div>`;
  }

  // Horizontal bars: value per muscle, the 10–20 band, and an optional target tick.
  function muscleChart(vals, ticks) {
    const W = 640, rowH = 26, L0 = 96, R = 40, max = Math.max(24, ...Object.values(vals), ...(ticks ? Object.values(ticks) : [0]));
    const H = L.MUSCLES.length * rowH + 26;
    const x = (v) => L0 + (v / max) * (W - L0 - R);
    const rows = L.MUSCLES.map((m, i) => {
      const y = 8 + i * rowH, v = vals[m] || 0;
      const inBand = v >= 10 && v <= 20;
      const t = ticks ? ticks[m] : null;
      return `<text x="${L0 - 10}" y="${y + 15}" text-anchor="end" font-size="12.5" fill="var(--ink)">${m}</text>
        <rect x="${L0}" y="${y + 4}" width="${Math.max(0, x(v) - L0)}" height="14" rx="4" fill="${inBand ? "var(--accent)" : "var(--chart-2)"}"/>
        ${t ? `<line x1="${x(t)}" x2="${x(t)}" y1="${y + 1}" y2="${y + 21}" stroke="var(--ink)" stroke-width="2"/>` : ""}
        <text x="${x(v) + 6}" y="${y + 15}" font-size="12" fill="var(--muted)">${+v.toFixed(1)}</text>`;
    }).join("");
    const axis = [0, 5, 10, 15, 20].filter((v) => v <= max).map((v) => `<text x="${x(v)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--muted)">${v}</text>`).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly sets per muscle">
      <rect x="${x(10)}" y="4" width="${x(20) - x(10)}" height="${H - 26}" fill="var(--good)" opacity=".1"/>
      <line x1="${x(10)}" x2="${x(10)}" y1="4" y2="${H - 22}" stroke="var(--good)" stroke-dasharray="3 4"/>
      <line x1="${x(20)}" x2="${x(20)}" y1="4" y2="${H - 22}" stroke="var(--good)" stroke-dasharray="3 4"/>
      ${rows}${axis}</svg>
      <div class="legend"><span><i style="background:var(--accent)"></i>In the 10–20 range</span><span><i style="background:var(--chart-2)"></i>Outside it</span>${ticks ? `<span><i style="background:var(--ink);width:3px"></i>Plan target</span>` : ""}</div>`;
  }

  // ---------- TRAIN ----------
  function viewTrain() {
    if (!S.plan) return `<section class="panel empty"><h2>No plan yet</h2><p class="muted">Build one first: it takes about ten seconds.</p><button class="btn primary" data-goto="plan">Build a plan</button></section>`;
    const saved = lastSaved ? savedCard(lastSaved) : "";
    if (!S.draft) {
      return saved + `<section class="panel">
        <h2>Today's session</h2>
        <p class="muted">Next up in your rotation is highlighted. Pick any day if you're switching things around.</p>
        <div class="pick">${S.plan.schedule.map((d, i) => `
          <button class="pick-day ${i === S.next ? "next" : ""}" data-act="start" data-day="${i}">
            <b>${esc(d.name)}</b><span>${d.slots.length} exercises · ~${Math.round(estMinutes(d))} min</span>${i === S.next ? `<span class="pill">Next up</span>` : ""}
          </button>`).join("")}
        </div></section>`;
    }
    const d = S.draft;
    const done = d.entries.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
    const total = d.entries.reduce((a, e) => a + e.sets.length, 0);
    return `<section class="panel">
      <div class="row-between"><h2>${esc(d.day)}</h2><span class="muted small">Started ${new Date(d.started).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${done}/${total} sets</span></div>
      <div class="progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
    </section>
    ${d.entries.map((e, ei) => entryCard(e, ei)).join("")}
    <div class="cta sticky-cta">
      <button class="btn primary" data-act="finish">Finish &amp; save</button>
      <button class="btn" data-act="discard">Discard</button>
    </div>`;
  }
  const estMinutes = (d) => d.slots.reduce((a, s) => a + s.sets * (s.rest + 40) / 60, 0) + 5;

  function entryCard(e, ei) {
    const ex = L.BY_ID[e.exId];
    const slot = e.slot;
    const h = L.history(S.sessions, e.exId);
    const last = h[h.length - 1];
    const sug = L.suggest(e.exId, slot, S.sessions);
    const alts = L.candidates(ex.p, S.plan.equip);
    const u = unit();
    return `<section class="panel entry" data-entry="${ei}">
      <div class="row-between">
        <div><h3>${esc(ex.name)}</h3><span class="muted small">${slot.sets} × ${slot.lo}–${slot.hi} reps · leave ${slot.rir} in the tank · rest ${dur(slot.rest)}</span></div>
        ${alts.length > 1 ? `<select class="swap" data-swap="${ei}" aria-label="Swap exercise">${alts.map((a) => `<option value="${a.id}" ${a.id === e.exId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>` : ""}
      </div>
      <div class="hint">
        ${last ? `<span><b>Last (${date(last.date)}):</b> ${last.sets.map((x) => `${ex.inc || x.w ? fmtW(x.w, ex) + "×" : ""}${x.reps}`).join(", ")}</span>` : ""}
        <span><b>Try:</b> ${sug.w != null && ex.inc ? `${fmtW(sug.w, ex)} ${u} × ${sug.reps}` : `${sug.reps} reps`}. ${esc(sug.why)}</span>
      </div>
      <div class="sets">
        <div class="set head"><span>Set</span><span>${ex.inc ? u : `+${u}`}</span><span>Reps</span><span>RIR</span><span></span></div>
        ${e.sets.map((x, si) => `<div class="set ${x.done ? "done" : ""}" data-set="${si}">
          <span class="n">${si + 1}</span>
          <input inputmode="decimal" aria-label="Weight" data-f="w" value="${esc(x.w)}" placeholder="${sug.w != null ? fmtW(sug.w, ex) : "0"}">
          <input inputmode="numeric" aria-label="Reps" data-f="reps" value="${esc(x.reps)}" placeholder="${sug.reps}">
          <input inputmode="numeric" aria-label="Reps in reserve" data-f="rir" value="${esc(x.rir)}" placeholder="${slot.rir}">
          <button class="check-btn" data-act="done" aria-label="Mark set ${si + 1} done" aria-pressed="${!!x.done}">✓</button>
        </div>`).join("")}
      </div>
      <div class="row-between" style="margin-top:8px"><button class="linkish" data-act="add-set">+ Add set</button>${e.sets.length > 1 ? `<button class="linkish muted" data-act="remove-set">Remove last set</button>` : ""}</div>
    </section>`;
  }

  function startSession(i) {
    const day = S.plan.schedule[i];
    S.draft = {
      dayIdx: i, day: day.name, started: Date.now(),
      entries: day.slots.map((slot) => {
        const sug = L.suggest(slot.exId, slot, S.sessions);
        const ex = L.BY_ID[slot.exId];
        const w = sug.w != null && ex.inc ? fmtW(sug.w, ex) : "";
        return { exId: slot.exId, slot, sets: Array.from({ length: slot.sets }, () => ({ w, reps: "", rir: "", done: false })) };
      }),
    };
    lastSaved = null;
    save(); render(); window.scrollTo({ top: $(".tabs").offsetTop - 70, behavior: "smooth" });
  }

  function finish() {
    const d = S.draft;
    const sets = [];
    for (const e of d.entries) for (const x of e.sets) {
      const reps = parseInt(x.reps, 10);
      if (!(reps > 0)) continue;
      const w = parseFloat(x.w);
      const rir = x.rir === "" ? e.slot.rir : parseInt(x.rir, 10);
      sets.push({ exId: e.exId, w: Number.isFinite(w) ? +toKg(w).toFixed(2) : 0, reps, rir: Number.isFinite(rir) ? rir : null });
    }
    if (!sets.length) { alert("No sets with reps yet. Log at least one set, or discard the session."); return; }
    const before = new Set(L.records(S.sessions).map((p) => p.exId + p.date));
    const session = { id: "s" + Date.now(), date: new Date().toISOString(), day: d.day, sets, minutes: Math.round((Date.now() - d.started) / 60000) };
    S.sessions.push(session);
    const prs = L.records(S.sessions).filter((p) => p.date === session.date && !before.has(p.exId + p.date));
    lastSaved = { session, prs };
    S.next = (d.dayIdx + 1) % S.plan.schedule.length;
    S.draft = null;
    stopTimer();
    save(); render(); window.scrollTo({ top: $(".tabs").offsetTop - 70, behavior: "smooth" });
  }

  function savedCard({ session, prs }) {
    const kg = session.sets.reduce((a, x) => a + x.w * x.reps, 0);
    return `<section class="panel saved">
      <h2>Saved ✓</h2>
      <div class="kpis">
        <div><b>${session.sets.length}</b><span>sets</span></div>
        <div><b>${fmtBig(kg)}</b><span>${unit()} moved</span></div>
        <div><b>${session.minutes}</b><span>minutes</span></div>
        <div><b>${prs.length}</b><span>new PR${prs.length === 1 ? "" : "s"}</span></div>
      </div>
      ${prs.length ? `<ul class="prs">${prs.map((p) => `<li>🏆 <b>${esc(exName(p.exId))}</b>: estimated 1RM ${fmtW(p.prev)} → <b>${fmtW(p.best)} ${unit()}</b></li>`).join("")}</ul>` : ""}
      <button class="linkish" data-goto="insights">See your insights →</button>
    </section>`;
  }

  // ---------- rest timer ----------
  let timer = null;
  function startTimer(sec) {
    stopTimer();
    timer = { end: Date.now() + sec * 1000, total: sec, id: setInterval(tick, 250) };
    $("#timer").hidden = false; tick();
  }
  function tick() {
    if (!timer) return;
    const left = Math.max(0, (timer.end - Date.now()) / 1000);
    $("#timer-left").textContent = dur(Math.ceil(left));
    $("#timer-fill").style.width = (100 * left) / timer.total + "%";
    if (left <= 0) { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); stopTimer(); }
  }
  function stopTimer() { if (timer) clearInterval(timer.id); timer = null; $("#timer").hidden = true; }

  // ---------- INSIGHTS ----------
  function viewInsights() {
    const ss = S.sessions;
    if (!ss.length) return `<section class="panel empty"><h2>Nothing to chart yet</h2><p class="muted">Log a session, or load ten weeks of sample data to see what the insights look like.</p><button class="btn primary" data-act="demo">Load sample data</button></section>`;
    const now = Date.now();
    const in28 = ss.filter((s) => now - new Date(s.date) < 28 * DAY);
    const weeks = L.weeklyTonnage(ss, 12, now);
    const vol = (from, to) => ss.filter((s) => { const t = new Date(s.date).getTime(); return t >= from && t < to; }).reduce((a, s) => a + s.sets.reduce((b, x) => b + x.w * x.reps, 0), 0);
    const thisW = { kg: vol(now - 7 * DAY, now + 1) }, lastW = { kg: vol(now - 14 * DAY, now - 7 * DAY) };
    const prs = L.records(ss);
    const pr28 = prs.filter((p) => now - new Date(p.date) < 28 * DAY);
    const delta = lastW.kg ? Math.round(((thisW.kg - lastW.kg) / lastW.kg) * 100) : null;
    const exIds = [...new Set(ss.flatMap((s) => s.sets.map((x) => x.exId)))]
      .filter((id) => L.BY_ID[id] && L.BY_ID[id].inc)
      .sort((a, b) => (L.BY_ID[b].c - L.BY_ID[a].c) || (L.history(ss, b).length - L.history(ss, a).length));
    const focus = exIds.includes(S.focus) ? S.focus : exIds[0];
    const last7 = L.loggedSets(ss, now - 7 * DAY, now + 1);
    return `
      <section class="panel">
        <div class="kpis">
          <div><b>${in28.length}</b><span>sessions, last 28 days</span></div>
          <div><b>${(in28.length / 4).toFixed(1)}</b><span>per week${S.plan ? ` (plan: ${S.plan.days})` : ""}</span></div>
          <div><b>${fmtBig(thisW.kg)}</b><span>${unit()}, last 7 days${delta != null ? ` <em class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%</em>` : ""}</span></div>
          <div><b>${pr28.length}</b><span>PRs, last 28 days</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>Strength trend</h2>
        <p class="muted">Best estimated one-rep max per session (Epley formula, adjusted for reps in reserve), with a least-squares trend line.</p>
        ${exIds.length ? `<select class="swap" data-focus aria-label="Exercise">${exIds.map((id) => `<option value="${id}" ${id === focus ? "selected" : ""}>${esc(exName(id))}</option>`).join("")}</select>${trendChart(focus)}` : `<p class="muted">Log a weighted exercise to see a trend.</p>`}
      </section>

      <section class="panel">
        <h2>Sets per muscle, last 7 days</h2>
        <p class="muted">Fractional counting: 1 for each muscle a set mainly trains, ½ for each that assists.</p>
        ${muscleChart(last7, S.plan ? L.plannedSets(S.plan) : null)}
      </section>

      <section class="panel">
        <h2>Weekly volume</h2>
        <p class="muted">Total load moved (weight × reps) per week, last 12 weeks.</p>
        ${tonnageChart(weeks)}
      </section>

      <section class="panel">
        <h2>Consistency</h2>
        <p class="muted">Each square is a day over the last 16 weeks. Darker means more sets.</p>
        ${heatmap(ss, now)}
      </section>

      <section class="panel">
        <h2>Recent PRs</h2>
        ${prs.length ? `<ul class="prs">${prs.slice(0, 8).map((p) => `<li><span class="muted small">${date(p.date)}</span> <b>${esc(exName(p.exId))}</b>: ${fmtW(p.prev)} → <b>${fmtW(p.best)} ${unit()}</b> <span class="muted small">(+${(((p.best - p.prev) / p.prev) * 100).toFixed(1)}%)</span></li>`).join("")}</ul>` : `<p class="muted">PRs show up from your second session of an exercise.</p>`}
      </section>

      <section class="panel">
        <h2>History</h2>
        <ul class="hist">${[...ss].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12).map((s) => `<li>
          <span><b>${esc(s.day)}</b> <span class="muted small">${date(s.date)} · ${s.sets.length} sets · ${fmtBig(s.sets.reduce((a, x) => a + x.w * x.reps, 0))} ${unit()}</span></span>
          <button class="linkish muted" data-act="delete-session" data-id="${esc(s.id)}" aria-label="Delete session">Delete</button></li>`).join("")}</ul>
      </section>

      <details class="panel method">
        <summary><b>How the numbers work</b></summary>
        <ul>
          <li><b>Progression</b> is double progression: stay at a weight until every set reaches the top of the rep range, then add the smallest jump. If most sets miss the bottom of the range, drop about 10%.</li>
          <li><b>Estimated 1RM</b> uses Epley, weight × (1 + reps ÷ 30), counting reps in reserve as reps you could have done, capped at 15.</li>
          <li><b>Trend</b> is an ordinary least-squares fit of e1RM against time; R² says how steady the progress is.</li>
          <li><b>Volume targets</b>: a 2017 meta-analysis (Schoenfeld, Ogborn &amp; Krieger) found growth rising with weekly sets, with 10+ sets per muscle doing best, and later work suggests diminishing returns past roughly 20. The band is a guide, not a rule.</li>
        </ul>
      </details>`;
  }

  function trendChart(id) {
    const pts = L.history(S.sessions, id);
    const ex = L.BY_ID[id];
    if (pts.length < 2) return `<p class="muted">Two sessions of ${esc(ex.name)} are needed for a trend.</p>`;
    const W = 640, H = 230, Lm = 48, R = 14, T = 14, B = 28;
    const t0 = new Date(pts[0].date).getTime(), t1 = new Date(pts[pts.length - 1].date).getTime();
    const vals = pts.map((p) => disp(p.best));
    const lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.04;
    const x = (t) => Lm + ((t - t0) / Math.max(1, t1 - t0)) * (W - Lm - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
    const fit = L.slopePerWeek(pts);
    const path = pts.map((p, i) => `${i ? "L" : "M"}${x(new Date(p.date).getTime()).toFixed(1)},${y(disp(p.best)).toFixed(1)}`).join(" ");
    let fitLine = "";
    if (fit) {
      const at = (t) => disp(fit.intercept + fit.slope * (t / (7 * DAY)));
      fitLine = `<line x1="${x(t0)}" y1="${y(at(t0))}" x2="${x(t1)}" y2="${y(at(t1))}" stroke="var(--good)" stroke-width="2" stroke-dasharray="6 5"/>`;
    }
    const ticks = [0, 0.5, 1].map((f) => lo + f * (hi - lo));
    const best = pts.reduce((a, p) => (p.best > a.best ? p : a), pts[0]);
    const slopeTxt = fit ? `${fit.slope >= 0 ? "+" : ""}${disp(fit.slope).toFixed(2)} ${unit()}/week · R² ${fit.r2.toFixed(2)}` : "";
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated one-rep max over time for ${esc(ex.name)}">
      ${ticks.map((v) => `<line x1="${Lm}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${Lm - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${Math.round(v)}</text>`).join("")}
      <text x="${Lm}" y="${H - 8}" font-size="11" fill="var(--muted)">${date(t0)}</text>
      <text x="${W - R}" y="${H - 8}" text-anchor="end" font-size="11" fill="var(--muted)">${date(t1)}</text>
      ${fitLine}
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${pts.map((p) => `<circle cx="${x(new Date(p.date).getTime())}" cy="${y(disp(p.best))}" r="3.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"><title>${date(p.date)}: ${fmtW(p.best)} ${unit()}</title></circle>`).join("")}
    </svg>
    <div class="kpis small-kpis">
      <div><b>${fmtW(pts[pts.length - 1].best)} ${unit()}</b><span>latest e1RM</span></div>
      <div><b>${fmtW(best.best)} ${unit()}</b><span>best, ${date(best.date)}</span></div>
      <div><b>${slopeTxt.split(" · ")[0] || "—"}</b><span>${fit ? "trend, R² " + fit.r2.toFixed(2) : "trend needs 3 sessions"}</span></div>
    </div>`;
  }

  function tonnageChart(weeks) {
    const W = 640, H = 200, Lm = 48, R = 10, T = 10, B = 26;
    const max = Math.max(1, ...weeks.map((w) => disp(w.kg))) * 1.1;
    const bw = (W - Lm - R) / weeks.length;
    const y = (v) => T + (1 - v / max) * (H - T - B);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly volume">
      ${[0, 0.5, 1].map((f) => `<line x1="${Lm}" x2="${W - R}" y1="${y(f * max / 1.1)}" y2="${y(f * max / 1.1)}" stroke="var(--line)"/><text x="${Lm - 8}" y="${y(f * max / 1.1) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${fmtBig((f * max / 1.1) / (S.unit === "lb" ? LB : 1))}</text>`).join("")}
      ${weeks.map((w, i) => { const v = disp(w.kg); return `<rect x="${Lm + i * bw + 4}" y="${y(v)}" width="${bw - 8}" height="${Math.max(0, H - B - y(v))}" rx="4" fill="${i === weeks.length - 1 ? "var(--accent)" : "var(--chart-2)"}"><title>Week of ${date(w.from)}: ${Math.round(v).toLocaleString("en-US")} ${unit()}, ${w.sessions} sessions</title></rect>${i % 2 === 1 || i === weeks.length - 1 ? `<text x="${Lm + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${date(w.from)}</text>` : ""}`; }).join("")}
    </svg>`;
  }

  function heatmap(ss, now) {
    const byDay = {};
    for (const s of ss) { const d = new Date(s.date); d.setHours(0, 0, 0, 0); byDay[d.getTime()] = (byDay[d.getTime()] || 0) + s.sets.length; }
    const max = Math.max(1, ...Object.values(byDay));
    const start = L.weekStart(now) - 15 * 7 * DAY;
    const c = 13, g = 3;
    let cells = "";
    for (let w = 0; w < 16; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(day.getDate() + w * 7 + d); day.setHours(0, 0, 0, 0);
      const t = day.getTime();
      if (t > now) continue;
      const v = byDay[t] || 0;
      cells += `<rect x="${24 + w * (c + g)}" y="${d * (c + g)}" width="${c}" height="${c}" rx="3" fill="${v ? "var(--accent)" : "var(--surface-2)"}" opacity="${v ? 0.35 + 0.65 * (v / max) : 1}"><title>${date(t)}: ${v ? v + " sets" : "rest"}</title></rect>`;
    }
    const labels = ["M", "", "W", "", "F", "", ""].map((l, d) => l ? `<text x="0" y="${d * (c + g) + 10}" font-size="10" fill="var(--muted)">${l}</text>` : "").join("");
    return `<svg class="chart heat" viewBox="0 0 ${24 + 16 * (c + g)} ${7 * (c + g)}" role="img" aria-label="Training days, last 16 weeks">${labels}${cells}</svg>`;
  }

  // ---------- DATA ----------
  function viewData() {
    const n = S.sessions.length, sets = S.sessions.reduce((a, s) => a + s.sets.length, 0);
    return `
      <section class="panel">
        <h2>Units</h2>
        ${seg("unit", S.unit, [["kg", "Kilograms"], ["lb", "Pounds"]])}
        <p class="muted small">Stored in kg, shown in your unit. Switching never changes your data.</p>
      </section>
      <section class="panel">
        <h2>Your data</h2>
        <p class="muted">${n} session${n === 1 ? "" : "s"}, ${sets} sets. It lives only in this browser, so back it up now and then.</p>
        <div class="cta">
          <button class="btn primary" data-act="csv" ${n ? "" : "disabled"}>Export CSV</button>
          <button class="btn" data-act="backup">Back up (JSON)</button>
          <label class="btn">Restore backup<input type="file" accept="application/json,.json" data-act="restore" hidden></label>
        </div>
        <div class="cta">
          <button class="btn" data-act="demo">Load sample data</button>
          <button class="btn danger" data-act="wipe">Erase everything</button>
        </div>
      </section>
      <section class="panel">
        <h2>Analyze it yourself</h2>
        <p class="muted">The CSV is tidy: one row per set, ready for pandas, R, Excel or SQL.</p>
        <table class="schema"><tbody>
          <tr><td><code>date</code></td><td>Session date (YYYY-MM-DD)</td></tr>
          <tr><td><code>session</code></td><td>Plan day, e.g. Upper A</td></tr>
          <tr><td><code>exercise</code>, <code>pattern</code></td><td>Exercise name and movement pattern</td></tr>
          <tr><td><code>set</code></td><td>Set number within that exercise</td></tr>
          <tr><td><code>weight_${unit()}</code>, <code>reps</code>, <code>rir</code></td><td>What you logged</td></tr>
          <tr><td><code>e1rm_${unit()}</code></td><td>Estimated one-rep max for the set</td></tr>
          <tr><td><code>primary_muscles</code></td><td>Pipe-separated, e.g. quads|glutes</td></tr>
        </tbody></table>
        <pre class="code"><code>import pandas as pd
df = pd.read_csv("liftlog.csv", parse_dates=["date"])
df["volume"] = df.weight_${unit()} * df.reps
best = df.groupby(["exercise", "date"]).e1rm_${unit()}.max().unstack(0)
weekly = df.resample("W-SUN", on="date").volume.sum()</code></pre>
      </section>`;
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  // ---------- events ----------
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("button, [data-goto]");
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; render(); return; }
    if (t.dataset.goto) { tab = t.dataset.goto; render(); return; }
    if (t.dataset.form) {
      const k = t.dataset.form, v = t.dataset.val;
      if (k === "unit") S.unit = v; else S.form[k] = k === "days" ? +v : v;
      save(); render(); return;
    }
    const act = t.dataset.act;
    const entryEl = t.closest("[data-entry]");
    const e = entryEl && S.draft ? S.draft.entries[+entryEl.dataset.entry] : null;
    switch (act) {
      case "use-plan":
        S.plan = L.generatePlan(S.form); S.next = 0; S.draft = null;
        save(); tab = "train"; render(); break;
      case "start": startSession(+t.dataset.day); break;
      case "done": {
        const si = +t.closest("[data-set]").dataset.set, x = e.sets[si];
        if (!x.done && !(parseInt(x.reps, 10) > 0)) {
          // Accept the placeholder target as the logged value, like most trackers do.
          const row = t.closest("[data-set]");
          x.reps = row.querySelector('[data-f="reps"]').placeholder;
          if (x.w === "") x.w = row.querySelector('[data-f="w"]').placeholder;
        }
        x.done = !x.done; save(); render();
        if (x.done) startTimer(e.slot.rest);
        break;
      }
      case "add-set": { const prev = e.sets[e.sets.length - 1]; e.sets.push({ w: prev ? prev.w : "", reps: "", rir: "", done: false }); save(); render(); break; }
      case "remove-set": e.sets.pop(); save(); render(); break;
      case "finish": finish(); break;
      case "discard": if (confirm("Discard this session? Nothing will be saved.")) { S.draft = null; stopTimer(); save(); render(); } break;
      case "timer-add": if (timer) { timer.end += 30000; timer.total += 30; tick(); } break;
      case "timer-stop": stopTimer(); break;
      case "delete-session": if (confirm("Delete this session?")) { S.sessions = S.sessions.filter((s) => s.id !== t.dataset.id); save(); render(); } break;
      case "csv": download(`liftlog-${stamp()}.csv`, L.toCSV(S.sessions, S.unit), "text/csv"); break;
      case "backup": download(`liftlog-backup-${stamp()}.json`, JSON.stringify({ ...S, draft: null }, null, 1), "application/json"); break;
      case "demo":
        if (S.sessions.length && !confirm("Replace your plan and sessions with sample data?")) break;
        { const d = L.demo(10); S.plan = d.plan; S.sessions = d.sessions; S.next = d.next; S.draft = null; S.form = { goal: d.plan.goal, days: d.plan.days, equip: d.plan.equip, level: d.plan.level }; }
        save(); tab = "insights"; render(); break;
      case "wipe":
        if (confirm("Erase your plan and every logged session from this browser? This can't be undone.")) { S = fresh(); save(); tab = "plan"; lastSaved = null; stopTimer(); render(); }
        break;
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.f && S.draft) {
      const e = S.draft.entries[+t.closest("[data-entry]").dataset.entry];
      e.sets[+t.closest("[data-set]").dataset.set][t.dataset.f] = t.value.replace(/[^0-9.]/g, "");
      save();
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.dataset.swap != null && S.draft) {
      const e = S.draft.entries[+t.dataset.swap];
      e.exId = t.value;
      const sug = L.suggest(e.exId, e.slot, S.sessions), ex = L.BY_ID[e.exId];
      for (const x of e.sets) if (!x.done) x.w = sug.w != null && ex.inc ? fmtW(sug.w, ex) : "";
      save(); render();
    }
    if (t.hasAttribute("data-focus")) { S.focus = t.value; save(); render(); }
    if (t.dataset.act === "restore" && t.files[0]) {
      t.files[0].text().then((txt) => {
        const d = JSON.parse(txt);
        if (!d || d.v !== 1 || !Array.isArray(d.sessions)) throw new Error("not a Liftlog backup");
        S = { ...fresh(), ...d, draft: null }; save(); tab = "insights"; render();
      }).catch((err) => alert("Couldn't restore that file: " + err.message));
    }
  });

  render();
})();
