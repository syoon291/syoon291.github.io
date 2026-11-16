// Liftlog core: exercise library, plan generator, progression rules and analytics.
// Pure functions only (no DOM), so the same file runs in the browser and in Node tests.
(function (root) {
  "use strict";

  const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core"];

  // p = movement pattern, eq = equipment it needs, pri/sec = primary and secondary muscles,
  // c = compound, inc = smallest sensible load jump in kg (0 = progress with reps instead).
  const EX = [
    { id: "back-squat", name: "Back squat", p: "squat", eq: ["gym"], pri: ["quads", "glutes"], sec: ["core"], c: 1, inc: 2.5 },
    { id: "front-squat", name: "Front squat", p: "squat", eq: ["gym"], pri: ["quads"], sec: ["glutes", "core"], c: 1, inc: 2.5 },
    { id: "goblet-squat", name: "Goblet squat", p: "squat", eq: ["db"], pri: ["quads", "glutes"], sec: ["core"], c: 1, inc: 2 },
    { id: "bw-squat", name: "Tempo bodyweight squat", p: "squat", eq: ["bw"], pri: ["quads", "glutes"], sec: [], c: 1, inc: 0 },

    { id: "deadlift", name: "Deadlift", p: "hinge", eq: ["gym"], pri: ["hamstrings", "glutes"], sec: ["back", "core"], c: 1, inc: 5 },
    { id: "rdl", name: "Romanian deadlift", p: "hinge", eq: ["gym"], pri: ["hamstrings", "glutes"], sec: ["back"], c: 1, inc: 2.5 },
    { id: "db-rdl", name: "Dumbbell Romanian deadlift", p: "hinge", eq: ["db"], pri: ["hamstrings", "glutes"], sec: ["back"], c: 1, inc: 2 },
    { id: "hip-thrust", name: "Hip thrust", p: "hinge", eq: ["gym", "db"], pri: ["glutes"], sec: ["hamstrings"], c: 1, inc: 2.5 },
    { id: "sl-rdl", name: "Single-leg RDL", p: "hinge", eq: ["bw"], pri: ["hamstrings", "glutes"], sec: ["core"], c: 1, inc: 0 },
    { id: "sl-bridge", name: "Single-leg glute bridge", p: "hinge", eq: ["bw"], pri: ["glutes"], sec: ["hamstrings"], c: 0, inc: 0 },

    { id: "bss", name: "Bulgarian split squat", p: "lunge", eq: ["db", "bw"], pri: ["quads", "glutes"], sec: [], c: 1, inc: 2 },
    { id: "walking-lunge", name: "Walking lunge", p: "lunge", eq: ["db", "bw"], pri: ["quads", "glutes"], sec: ["hamstrings"], c: 1, inc: 2 },

    { id: "leg-press", name: "Leg press", p: "quad", eq: ["gym"], pri: ["quads"], sec: ["glutes"], c: 1, inc: 5 },
    { id: "leg-ext", name: "Leg extension", p: "quad", eq: ["gym"], pri: ["quads"], sec: [], c: 0, inc: 2.5 },
    { id: "step-up", name: "Step-up", p: "quad", eq: ["db", "bw"], pri: ["quads"], sec: ["glutes"], c: 1, inc: 2 },

    { id: "leg-curl", name: "Seated leg curl", p: "ham", eq: ["gym"], pri: ["hamstrings"], sec: [], c: 0, inc: 2.5 },
    { id: "nordic", name: "Assisted Nordic curl", p: "ham", eq: ["bw"], pri: ["hamstrings"], sec: [], c: 0, inc: 0 },
    { id: "slide-curl", name: "Sliding leg curl", p: "ham", eq: ["bw"], pri: ["hamstrings"], sec: ["glutes"], c: 0, inc: 0 },

    { id: "bench", name: "Bench press", p: "hpush", eq: ["gym"], pri: ["chest"], sec: ["triceps", "shoulders"], c: 1, inc: 2.5 },
    { id: "incline-db", name: "Incline dumbbell press", p: "hpush", eq: ["db"], pri: ["chest"], sec: ["shoulders", "triceps"], c: 1, inc: 2 },
    { id: "db-bench", name: "Dumbbell bench press", p: "hpush", eq: ["db"], pri: ["chest"], sec: ["triceps", "shoulders"], c: 1, inc: 2 },
    { id: "push-up", name: "Push-up", p: "hpush", eq: ["bw"], pri: ["chest"], sec: ["triceps", "shoulders"], c: 1, inc: 0 },
    { id: "deficit-push-up", name: "Deficit push-up", p: "hpush", eq: ["bw"], pri: ["chest"], sec: ["triceps", "shoulders"], c: 1, inc: 0 },

    { id: "ohp", name: "Overhead press", p: "vpush", eq: ["gym"], pri: ["shoulders"], sec: ["triceps", "core"], c: 1, inc: 2.5 },
    { id: "db-shoulder", name: "Seated dumbbell shoulder press", p: "vpush", eq: ["db"], pri: ["shoulders"], sec: ["triceps"], c: 1, inc: 2 },
    { id: "pike", name: "Pike push-up", p: "vpush", eq: ["bw"], pri: ["shoulders"], sec: ["triceps"], c: 1, inc: 0 },

    { id: "bb-row", name: "Barbell row", p: "hpull", eq: ["gym"], pri: ["back"], sec: ["biceps"], c: 1, inc: 2.5 },
    { id: "cable-row", name: "Seated cable row", p: "hpull", eq: ["gym"], pri: ["back"], sec: ["biceps"], c: 1, inc: 2.5 },
    { id: "db-row", name: "One-arm dumbbell row", p: "hpull", eq: ["db"], pri: ["back"], sec: ["biceps"], c: 1, inc: 2 },
    { id: "inverted-row", name: "Inverted row", p: "hpull", eq: ["bw"], pri: ["back"], sec: ["biceps"], c: 1, inc: 0 },

    { id: "pulldown", name: "Lat pulldown", p: "vpull", eq: ["gym"], pri: ["back"], sec: ["biceps"], c: 1, inc: 2.5 },
    { id: "pull-up", name: "Pull-up", p: "vpull", eq: ["gym", "bw"], pri: ["back"], sec: ["biceps"], c: 1, inc: 0 },
    { id: "db-pullover", name: "Dumbbell pullover", p: "vpull", eq: ["db"], pri: ["back"], sec: ["chest"], c: 0, inc: 2 },

    { id: "cable-fly", name: "Cable fly", p: "fly", eq: ["gym"], pri: ["chest"], sec: [], c: 0, inc: 2.5 },
    { id: "db-fly", name: "Dumbbell fly", p: "fly", eq: ["db"], pri: ["chest"], sec: [], c: 0, inc: 1 },
    { id: "slow-push-up", name: "Slow-eccentric push-up", p: "fly", eq: ["bw"], pri: ["chest"], sec: ["triceps"], c: 0, inc: 0 },

    { id: "lateral", name: "Dumbbell lateral raise", p: "lateral", eq: ["db"], pri: ["shoulders"], sec: [], c: 0, inc: 1 },
    { id: "cable-lateral", name: "Cable lateral raise", p: "lateral", eq: ["gym"], pri: ["shoulders"], sec: [], c: 0, inc: 1 },
    { id: "y-raise", name: "Prone Y-raise", p: "lateral", eq: ["bw"], pri: ["shoulders"], sec: ["back"], c: 0, inc: 0 },

    { id: "ez-curl", name: "EZ-bar curl", p: "biceps", eq: ["gym"], pri: ["biceps"], sec: [], c: 0, inc: 2.5 },
    { id: "db-curl", name: "Dumbbell curl", p: "biceps", eq: ["db"], pri: ["biceps"], sec: [], c: 0, inc: 1 },
    { id: "chin-up", name: "Chin-up", p: "biceps", eq: ["bw"], pri: ["biceps", "back"], sec: [], c: 1, inc: 0 },

    { id: "pushdown", name: "Cable pushdown", p: "triceps", eq: ["gym"], pri: ["triceps"], sec: [], c: 0, inc: 2.5 },
    { id: "oh-ext", name: "Overhead dumbbell extension", p: "triceps", eq: ["db"], pri: ["triceps"], sec: [], c: 0, inc: 1 },
    { id: "bench-dip", name: "Bench dip", p: "triceps", eq: ["bw"], pri: ["triceps"], sec: ["chest"], c: 0, inc: 0 },

    { id: "calf-raise", name: "Standing calf raise", p: "calves", eq: ["gym", "db"], pri: ["calves"], sec: [], c: 0, inc: 2.5 },
    { id: "sl-calf", name: "Single-leg calf raise", p: "calves", eq: ["bw"], pri: ["calves"], sec: [], c: 0, inc: 0 },

    { id: "cable-crunch", name: "Cable crunch", p: "core", eq: ["gym"], pri: ["core"], sec: [], c: 0, inc: 2.5 },
    { id: "knee-raise", name: "Hanging knee raise", p: "core", eq: ["gym", "bw"], pri: ["core"], sec: [], c: 0, inc: 0 },
    { id: "dead-bug", name: "Dead bug", p: "core", eq: ["bw"], pri: ["core"], sec: [], c: 0, inc: 0 },
  ];
  const BY_ID = Object.fromEntries(EX.map((e) => [e.id, e]));

  // A gym has dumbbells and a floor; a dumbbell setup has a floor.
  const ALLOWED = { gym: ["gym", "db", "bw"], db: ["db", "bw"], bw: ["bw"] };

  function candidates(pattern, equip) {
    const allowed = ALLOWED[equip] || ALLOWED.gym;
    // Prefer exercises that use the best equipment available, then fall back.
    return EX.filter((e) => e.p === pattern && e.eq.some((q) => allowed.includes(q)))
      .sort((a, b) => rank(a) - rank(b));
    function rank(e) { return Math.min(...e.eq.map((q) => { const i = allowed.indexOf(q); return i < 0 ? 9 : i; })); }
  }

  // Day templates: [pattern, variant offset, main lift?]
  const T = {
    fbA: ["Full body A", [["squat", 0, 1], ["hpush", 0, 1], ["hpull", 0, 1], ["ham", 0], ["lateral", 0], ["biceps", 0], ["core", 0]]],
    fbB: ["Full body B", [["hinge", 0, 1], ["vpush", 0, 1], ["vpull", 0, 1], ["lunge", 0], ["fly", 0], ["triceps", 0], ["calves", 0]]],
    fbC: ["Full body C", [["squat", 1, 1], ["hpush", 1, 1], ["vpull", 1], ["hinge", 1], ["lateral", 0], ["biceps", 0], ["triceps", 0]]],
    upA: ["Upper A", [["hpush", 0, 1], ["hpull", 0, 1], ["vpush", 0], ["vpull", 0], ["fly", 0], ["lateral", 0], ["triceps", 0]]],
    loA: ["Lower A", [["squat", 0, 1], ["hinge", 1], ["quad", 0], ["ham", 0], ["calves", 0], ["core", 0]]],
    upB: ["Upper B", [["vpush", 0, 1], ["vpull", 0, 1], ["hpush", 1], ["hpull", 1], ["fly", 0], ["biceps", 0], ["triceps", 0]]],
    loB: ["Lower B", [["hinge", 0, 1], ["lunge", 0], ["quad", 1], ["ham", 0], ["calves", 0], ["core", 1]]],
    push: ["Push", [["hpush", 0, 1], ["vpush", 0], ["hpush", 1], ["fly", 0], ["lateral", 0], ["triceps", 0]]],
    pull: ["Pull", [["vpull", 0, 1], ["hpull", 0], ["hpull", 1], ["lateral", 1], ["biceps", 0], ["core", 0]]],
    legs: ["Legs", [["squat", 0, 1], ["hinge", 1], ["lunge", 0], ["quad", 1], ["ham", 0], ["calves", 0]]],
  };
  const SPLITS = {
    2: { name: "Full body, twice a week", days: ["fbA", "fbB"] },
    3: { name: "Full body, three times a week", days: ["fbA", "fbB", "fbC"] },
    4: { name: "Upper / lower", days: ["upA", "loA", "upB", "loB"] },
    5: { name: "Push / pull / legs + upper / lower", days: ["push", "pull", "legs", "upA", "loA"] },
    6: { name: "Push / pull / legs, twice", days: ["push", "pull", "legs", "push", "pull", "legs"] },
  };

  // Prescriptions by goal: main lifts and accessories.
  const SCHEME = {
    strength: { main: { sets: 4, lo: 3, hi: 5, rir: 2, rest: 180 }, acc: { sets: 3, lo: 6, hi: 10, rir: 2, rest: 90 } },
    hypertrophy: { main: { sets: 3, lo: 6, hi: 10, rir: 2, rest: 120 }, acc: { sets: 3, lo: 10, hi: 15, rir: 1, rest: 75 } },
    general: { main: { sets: 3, lo: 8, hi: 12, rir: 3, rest: 90 }, acc: { sets: 2, lo: 10, hi: 15, rir: 2, rest: 60 } },
  };

  function generatePlan({ goal = "hypertrophy", days = 4, equip = "gym", level = "intermediate" } = {}) {
    days = Math.min(6, Math.max(2, Math.round(days)));
    const split = SPLITS[days];
    const scheme = SCHEME[goal] || SCHEME.hypertrophy;
    const planDays = split.days.map((key, di) => {
      const [name, slots] = T[key];
      // The second pass of a repeated day (PPL x2) rotates exercise variants.
      const repeat = split.days.slice(0, di).filter((k) => k === key).length;
      const used = new Set();
      const out = [];
      for (const [p, v, main] of slots) {
        const list = candidates(p, equip).filter((e) => !used.has(e.id));
        if (!list.length) continue;
        const ex = list[(v + repeat) % list.length];
        used.add(ex.id);
        const s = { ...(main ? scheme.main : scheme.acc) };
        if (level === "beginner") s.sets = Math.max(2, s.sets - 1);
        if (level === "advanced" && !main) s.sets += 1;
        if (ex.inc === 0) { s.lo = Math.max(s.lo, 8); s.hi = Math.max(s.hi, 20); }
        out.push({ exId: ex.id, main: !!main, ...s });
      }
      return { name: repeat ? name + " (2)" : name, slots: out };
    });
    return { goal, days, equip, level, split: split.name, created: new Date().toISOString(), schedule: planDays };
  }

  // Fractional set counting: a set counts 1 for each primary muscle and 0.5 for each secondary.
  function addSets(acc, exId, n) {
    const ex = BY_ID[exId];
    if (!ex) return acc;
    for (const m of ex.pri) acc[m] = (acc[m] || 0) + n;
    for (const m of ex.sec) acc[m] = (acc[m] || 0) + n * 0.5;
    return acc;
  }
  function plannedSets(plan) {
    const acc = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
    for (const d of plan.schedule) for (const s of d.slots) addSets(acc, s.exId, s.sets);
    return acc;
  }
  function loggedSets(sessions, from, to) {
    const acc = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
    for (const s of sessions) {
      const t = new Date(s.date).getTime();
      if (t < from || t >= to) continue;
      for (const set of s.sets) addSets(acc, set.exId, 1);
    }
    return acc;
  }

  // Estimated one-rep max, Epley formula, adjusted for reps in reserve:
  // 100 kg x 8 with 2 left in the tank is treated like a 10-rep max.
  function e1rm(w, reps, rir) {
    const r = Math.min(15, (+reps || 0) + (+rir || 0));
    if (!w || !reps) return 0;
    return r <= 1 ? w : w * (1 + r / 30);
  }

  const DAY = 864e5;
  function weekStart(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
    return x.getTime();
  }

  function history(sessions, exId) {
    // Per session: best e1RM, top weight, and the sets, oldest first.
    return sessions
      .filter((s) => s.sets.some((x) => x.exId === exId))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((s) => {
        const sets = s.sets.filter((x) => x.exId === exId);
        return { date: s.date, sets, best: Math.max(...sets.map((x) => e1rm(x.w, x.reps, x.rir))), top: Math.max(...sets.map((x) => x.w || 0)) };
      });
  }

  // Double progression: work up to the top of the rep range on every set, then add load.
  function suggest(exId, slot, sessions) {
    const ex = BY_ID[exId];
    const h = history(sessions, exId);
    if (!h.length) return { w: null, reps: slot.hi, why: "First time: pick a weight you could lift for a few more reps than the target." };
    const last = h[h.length - 1];
    const w = last.top;
    const work = last.sets.filter((x) => (x.w || 0) === w);
    const below = work.filter((x) => x.reps < slot.lo).length;
    if (work.length && work.every((x) => x.reps >= slot.hi)) {
      if (!ex.inc) return { w, reps: slot.hi + 1, why: "Top of the range on every set: add a rep or slow the tempo." };
      return { w: w + ex.inc, reps: slot.lo, why: `Top of the range on every set last time: add ${ex.inc} kg.` };
    }
    if (below > work.length / 2 && ex.inc) return { w: round(w * 0.9, ex.inc), reps: slot.lo, why: "Missed the range on most sets: drop about 10% and build back." };
    const bestReps = Math.max(...work.map((x) => x.reps));
    return { w, reps: Math.min(slot.hi, bestReps + 1), why: "Same weight: beat last time by a rep on at least one set." };
  }
  const round = (v, step) => step ? Math.max(step, Math.round(v / step) * step) : v;

  // Least-squares slope of e1RM over time, in kg per week.
  function slopePerWeek(points) {
    if (points.length < 3) return null;
    const xs = points.map((p) => new Date(p.date).getTime() / (7 * DAY));
    const ys = points.map((p) => p.best);
    const mx = mean(xs), my = mean(ys);
    let num = 0, den = 0;
    for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    if (!den) return null;
    const slope = num / den;
    const ss = ys.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0);
    const st = ys.reduce((a, y) => a + (y - my) ** 2, 0);
    return { slope, r2: st ? 1 - ss / st : 0, intercept: my - slope * mx };
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

  function weeklyTonnage(sessions, weeks, now = Date.now()) {
    const end = weekStart(now) + 7 * DAY;
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const from = end - (i + 1) * 7 * DAY, to = from + 7 * DAY;
      let kg = 0, sets = 0, n = 0;
      for (const s of sessions) {
        const t = new Date(s.date).getTime();
        if (t < from || t >= to) continue;
        n++;
        for (const x of s.sets) { kg += (x.w || 0) * (x.reps || 0); sets++; }
      }
      out.push({ from, kg, sets, sessions: n });
    }
    return out;
  }

  // Personal records: a session's best e1RM that beats every earlier session.
  function records(sessions) {
    const prs = [];
    const byEx = new Set(sessions.flatMap((s) => s.sets.map((x) => x.exId)));
    for (const id of byEx) {
      let best = 0;
      for (const p of history(sessions, id)) {
        if (p.best > best * 1.0001) { if (best > 0) prs.push({ exId: id, date: p.date, best: p.best, prev: best }); best = p.best; }
      }
    }
    return prs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function toCSV(sessions, unit) {
    const f = unit === "lb" ? 2.20462 : 1;
    const q = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const rows = [["date", "session", "exercise", "pattern", "set", `weight_${unit}`, "reps", "rir", `e1rm_${unit}`, "primary_muscles"]];
    for (const s of [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))) {
      const count = {};
      for (const x of s.sets) {
        const ex = BY_ID[x.exId] || { name: x.exId, p: "", pri: [] };
        count[x.exId] = (count[x.exId] || 0) + 1;
        rows.push([s.date.slice(0, 10), s.day, ex.name, ex.p, count[x.exId], +(x.w * f).toFixed(1), x.reps, x.rir ?? "", +(e1rm(x.w, x.reps, x.rir) * f).toFixed(1), ex.pri.join("|")]);
      }
    }
    return rows.map((r) => r.map(q).join(",")).join("\n") + "\n";
  }

  // Demo data: simulates a lifter following the generated plan, with the app's own progression rule
  // choosing each weight, so the charts show what real use would look like.
  function demo(weeks = 10, now = Date.now()) {
    let seed = 42;
    const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const plan = generatePlan({ goal: "hypertrophy", days: 4, equip: "gym", level: "intermediate" });
    const base = { squat: 110, hinge: 130, hpush: 85, vpush: 52, hpull: 80, vpull: 70, quad: 120, ham: 55, lunge: 45, fly: 30, lateral: 12, biceps: 35, triceps: 40, calves: 90, core: 40 };
    const oneRM = {};
    const sessions = [];
    const dayOffsets = [0, 1, 3, 4]; // Mon, Tue, Thu, Fri
    const start = weekStart(now) - (weeks - 1) * 7 * DAY;
    let k = 0;
    for (let wk = 0; wk < weeks; wk++) {
      for (let d = 0; d < plan.schedule.length; d++) {
        const t = start + wk * 7 * DAY + dayOffsets[d] * DAY + 18 * 3600e3;
        if (t > now || rnd() < 0.1) continue; // skip ~10% of sessions, like real life
        const day = plan.schedule[k++ % plan.schedule.length];
        const sets = [];
        for (const slot of day.slots) {
          const ex = BY_ID[slot.exId];
          if (!oneRM[ex.id]) oneRM[ex.id] = (base[ex.p] || 50) * (0.85 + rnd() * 0.3);
          oneRM[ex.id] *= 1 + 0.004 + rnd() * 0.006; // slow, noisy strength gains
          const sug = suggest(ex.id, slot, sessions);
          let w = ex.inc ? (sug.w ?? round(oneRM[ex.id] * 0.62, ex.inc)) : 0;
          for (let i = 0; i < slot.sets; i++) {
            let reps;
            if (ex.inc) {
              const max = 30 * (oneRM[ex.id] / w - 1);
              reps = Math.floor(max - slot.rir - i * 0.8 + (rnd() - 0.5) * 2);
            } else reps = Math.floor(slot.lo + wk * 0.8 + rnd() * 3 - i);
            reps = Math.max(slot.lo - 2, Math.min(slot.hi + 1, reps));
            sets.push({ exId: ex.id, w, reps, rir: slot.rir });
          }
        }
        sessions.push({ id: "demo-" + t, date: new Date(t).toISOString(), day: day.name, sets });
      }
    }
    return { plan, sessions, next: k % plan.schedule.length };
  }

  const api = { MUSCLES, EX, BY_ID, SPLITS, SCHEME, candidates, generatePlan, plannedSets, loggedSets, e1rm, weekStart, history, suggest, slopePerWeek, weeklyTonnage, records, toCSV, demo, DAY };
  if (typeof module !== "undefined") module.exports = api;
  else root.Lift = api;
})(this);
