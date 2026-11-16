// Freedom calculator: all math runs in the browser, nothing is sent anywhere.
(function () {
  const $ = (id) => document.getElementById(id);
  const num = (id) => { const v = parseFloat(String($(id).value).replace(/[^0-9.\-]/g, "")); return Number.isFinite(v) ? v : 0; };
  const money = (v) => (v < 0 ? "-" : "") + "$" + Math.round(Math.abs(v)).toLocaleString("en-US");
  const compact = (v) => Math.abs(v) >= 1e6 ? "$" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : Math.abs(v) >= 1e3 ? "$" + Math.round(v / 1e3) + "k" : money(v);

  let period = "month";
  let planEdited = false; // step 04 follows step 03 until the user types their own pace

  function rates() {
    const nominal = num("ret") / 100, infl = num("infl") / 100;
    const yearly = $("real").checked ? (1 + nominal) / (1 + infl) - 1 : nominal;
    return { yearly, monthly: Math.pow(1 + yearly, 1 / 12) - 1 };
  }
  const grow = (start, monthlyAdd, m, months) => {
    let b = start;
    for (let i = 0; i < months; i++) b = b * (1 + m) + monthlyAdd;
    return b;
  };

  function compute() {
    const start = Math.max(0, num("start"));
    const { yearly, monthly: m } = rates();
    const annualSpend = Math.max(0, num("spend")) * (period === "month" ? 12 : 1);
    const wr = Math.max(0.1, num("wr")) / 100;
    const freedom = annualSpend / wr;

    $("o-freedom").textContent = money(freedom);
    $("o-freedom-why").textContent = annualSpend
      ? `${money(annualSpend)} a year ÷ ${(wr * 100).toFixed(wr * 100 % 1 ? 1 : 0)}% = about ${Math.round(1 / wr)}× your yearly spending.`
      : "Enter what you'd spend.";

    // Step 3: monthly contribution needed to hit the freedom number by the target age.
    const age = Math.round(num("age")), target = Math.round(num("target"));
    const years = Math.max(0, target - age), N = years * 12;
    let need = 0;
    if (N > 0) {
      const fvStart = start * Math.pow(1 + m, N);
      const gap = freedom - fvStart;
      if (gap > 0) need = Math.abs(m) < 1e-9 ? gap / N : (gap * m) / (Math.pow(1 + m, N) - 1);
    }
    $("o-years").textContent = years;
    need = Math.ceil(need); // round up so the plan reaches the number, not just short of it
    $("o-need-m").textContent = N === 0 ? "—" : need === 0 ? "$0 ✓" : money(need);
    $("o-need-y").textContent = N === 0 ? "—" : money(need * 12);

    if (!planEdited) {
      $("contrib").value = need.toLocaleString("en-US");
      $("years").value = years;
    }

    // Step 4: projection at the chosen pace.
    const contrib = Math.max(0, num("contrib"));
    const yrs = Math.min(80, Math.max(0, Math.round(num("years"))));
    const balance = grow(start, contrib, m, yrs * 12);
    const putIn = start + contrib * 12 * yrs;
    const growth = balance - putIn;
    $("o-balance").textContent = money(balance);
    $("o-contributed").textContent = money(putIn);
    $("o-growth").textContent = money(growth);
    const total = Math.max(1, putIn + Math.max(0, growth));
    $("bar-c").style.width = (putIn / total) * 100 + "%";
    $("bar-g").style.width = (Math.max(0, growth) / total) * 100 + "%";

    // When is the freedom number reached at this pace? (search up to 80 years)
    let hitYear = null, b = start;
    if (freedom > 0 && start >= freedom) hitYear = 0;
    else for (let y = 1; y <= 80; y++) { b = grow(b, contrib, m, 12); if (b >= freedom) { hitYear = y; break; } }
    $("o-when").innerHTML = freedom <= 0 ? "" : hitYear === 0
      ? "🎉 You're already past your freedom number."
      : hitYear
        ? `At this pace you cross your freedom number in <b>${hitYear} year${hitYear === 1 ? "" : "s"}</b>, around age <b>${age + hitYear}</b>.`
        : "At this pace you don't reach your freedom number within 80 years. Try investing more or spending less.";

    // Step 5: table + chart, at least as long as step 4 and through the crossing year.
    const span = Math.min(80, Math.max(yrs, hitYear ?? 0, 1));
    const rows = [];
    let bal = start, put = start, marked = false;
    for (let y = 1; y <= span; y++) {
      bal = grow(bal, contrib, m, 12);
      put += contrib * 12;
      const hit = !marked && bal >= freedom && freedom > 0;
      if (hit) marked = true;
      rows.push({ y, age: age + y, put, growth: bal - put, bal, hit });
    }
    $("rows").innerHTML = rows.map((r) =>
      `<tr class="${r.hit ? "hit" : ""}"><td>${r.y}</td><td>${r.age}</td><td>${money(r.put)}</td><td>${money(r.growth)}</td><td>${money(r.bal)}</td></tr>`).join("");
    drawChart(rows, freedom, start);
    $("real").closest("label").title = `Using a ${(yearly * 100).toFixed(1)}% yearly return`;
  }

  function drawChart(rows, freedom, start) {
    const W = 640, H = 240, L = 56, R = 12, T = 14, B = 28;
    const pts = [{ y: 0, bal: start, put: start }, ...rows];
    const maxV = Math.max(freedom, ...pts.map((p) => p.bal), 1) * 1.08;
    const x = (i) => L + (i / Math.max(1, pts.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - v / maxV) * (H - T - B);
    const line = (key) => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
    const area = `${line("bal")} L${x(pts.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV / 1.08);
    const fy = y(freedom);
    const step = Math.max(1, Math.ceil((pts.length - 1) / 8));
    $("chart").innerHTML = `
      ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${compact(v)}</text>`).join("")}
      ${pts.map((p, i) => (i % step === 0 || i === pts.length - 1) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${p.y}</text>` : "").join("")}
      <path d="${area}" fill="var(--accent)" opacity=".12"/>
      <path d="${line("put")}" fill="none" stroke="var(--chart-2)" stroke-width="2" stroke-dasharray="4 4"/>
      <path d="${line("bal")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${freedom > 0 ? `<line x1="${L}" x2="${W - R}" y1="${fy}" y2="${fy}" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${W - R}" y="${fy - 6}" text-anchor="end" font-size="11.5" font-weight="600" fill="var(--good)">Freedom ${compact(freedom)}</text>` : ""}`;
  }

  // Format money inputs with thousands separators when the user leaves the field.
  for (const id of ["start", "spend", "contrib"]) {
    $(id).addEventListener("blur", () => { const v = num(id); $(id).value = v ? Math.round(v).toLocaleString("en-US") : "0"; });
  }
  document.addEventListener("input", (e) => {
    if (e.target.id === "contrib" || e.target.id === "years") planEdited = true;
    compute();
  });
  document.addEventListener("change", compute);
  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-period]");
    if (p) {
      period = p.dataset.period;
      for (const b of document.querySelectorAll("[data-period]")) b.setAttribute("aria-pressed", String(b === p));
      const v = num("spend");
      $("spend").value = Math.round(period === "year" ? v * 12 : v / 12).toLocaleString("en-US");
      compute();
    }
    if (e.target.id === "reset-plan") { planEdited = false; compute(); }
  });
  compute();
})();
