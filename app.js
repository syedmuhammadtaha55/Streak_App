(() => {
  "use strict";

  const STORAGE_KEY = "streak.v1";
  let memoryFallback = null;

  // ---- Dates (local calendar days, never UTC) ----
  const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => new Date();

  // ---- Storage ----
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.habits)) return data;
      }
    } catch (_) {
      if (memoryFallback) return memoryFallback;
    }
    return { habits: [] };
  }

  function save() {
    memoryFallback = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* storage unavailable; keep in memory */ }
  }

  let state = load();

  // ---- Streak math ----
  function currentStreak(habit, now = today()) {
    const done = new Set(habit.done);
    // If today isn't checked yet, the streak still stands from yesterday.
    let cursor = done.has(dayKey(now)) ? now : addDays(now, -1);
    let count = 0;
    while (done.has(dayKey(cursor))) {
      count++;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function bestStreak(habit) {
    const days = [...new Set(habit.done)].sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const key of days) {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
      best = Math.max(best, run);
      prev = date;
    }
    return best;
  }

  // ---- Actions ----
  function addHabit(name) {
    state.habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      createdAt: dayKey(today()),
      done: [],
    });
    save();
    render();
  }

  function toggleToday(id) {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return false;
    const key = dayKey(today());
    const i = habit.done.indexOf(key);
    if (i === -1) habit.done.push(key);
    else habit.done.splice(i, 1);
    save();
    return i === -1;
  }

  // ---- Rendering ----
  const $ = (id) => document.getElementById(id);
  const list = $("habits");
  const tmpl = $("habit-template");

  function render(bumpId) {
    const now = today();
    const todayKey = dayKey(now);
    $("today").textContent = now.toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric",
    });

    list.replaceChildren();
    $("empty").hidden = state.habits.length > 0;

    for (const habit of state.habits) {
      const node = tmpl.content.firstElementChild.cloneNode(true);
      const doneToday = habit.done.includes(todayKey);
      const streak = currentStreak(habit, now);

      node.dataset.id = habit.id;
      node.classList.toggle("lit", streak > 0);
      if (habit.id === bumpId) node.classList.add("bump");

      const check = node.querySelector(".check");
      check.setAttribute("aria-pressed", String(doneToday));
      check.setAttribute("aria-label", `${doneToday ? "Uncheck" : "Check off"} ${habit.name} for today`);

      node.querySelector(".name").textContent = habit.name;
      node.querySelector(".count").textContent = streak;
      node.querySelector(".label").textContent = streak === 1 ? "day" : "days";

      const week = node.querySelector(".week");
      const done = new Set(habit.done);
      for (let i = 6; i >= 0; i--) {
        const dot = document.createElement("span");
        dot.className = "dot" + (done.has(dayKey(addDays(now, -i))) ? " on" : "");
        week.appendChild(dot);
      }

      list.appendChild(node);
    }
  }

  // ---- Events ----
  $("add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("add-input");
    const name = input.value.trim();
    if (!name) return;
    addHabit(name);
    input.value = "";
    input.focus();
  });

  list.addEventListener("click", (e) => {
    const row = e.target.closest(".habit");
    if (!row) return;
    if (e.target.closest(".check")) {
      const nowDone = toggleToday(row.dataset.id);
      render(nowDone ? row.dataset.id : undefined);
    } else if (e.target.closest(".more")) {
      openEditor(row.dataset.id);
    }
  });

  // ---- Edit dialog ----
  const dialog = $("edit-dialog");
  const editInput = $("edit-input");
  let editingId = null;

  function openEditor(id) {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return;
    editingId = id;
    editInput.value = habit.name;
    const best = bestStreak(habit);
    $("edit-best").textContent = best > 0
      ? `Best streak: ${best} ${best === 1 ? "day" : "days"}`
      : "";
    dialog.showModal();
  }

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "save" && editingId) {
      const habit = state.habits.find((h) => h.id === editingId);
      const name = editInput.value.trim();
      if (habit && name) {
        habit.name = name;
        save();
        render();
      }
    }
    editingId = null;
  });

  $("delete-btn").addEventListener("click", () => {
    const habit = state.habits.find((h) => h.id === editingId);
    if (habit && confirm(`Delete “${habit.name}”?`)) {
      state.habits = state.habits.filter((h) => h.id !== editingId);
      save();
      dialog.close("delete");
      render();
    }
  });

  // ---- Day rollover (quietly refresh, no alerts) ----
  let lastDay = dayKey(today());
  function refreshIfNewDay() {
    const key = dayKey(today());
    if (key !== lastDay) {
      lastDay = key;
      render();
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshIfNewDay();
  });
  setInterval(refreshIfNewDay, 60 * 1000);

  // Keep other tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      render();
    }
  });

  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
