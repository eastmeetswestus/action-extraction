/* Action Extraction concept — demo interactions only. Nothing is stored or sent. */
(function () {
  "use strict";

  var CITIES = ["Sandy", "Alpine", "Bluffdale", "Bountiful", "Cottonwood Heights", "Draper", "Herriman", "Holladay", "Lehi", "Midvale", "Murray", "Riverton", "Salt Lake City", "South Jordan", "West Jordan", "West Valley"];
  var MIN_VISIT = 125;
  var state = { type: "home", total: 0, day: null, slot: null, city: "Sandy" };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  /* ---------- Quote calculator (sample pricing) ---------- */
  var rows = $$(".q-row[data-key]");
  var tileRange = $("#tileRange");
  var protect = $("#protect");
  var qtNum = $("#qtNum");
  var qtPrice = $(".qt-price");
  var qtLines = $("#qtLines");
  var qtMin = $("#qtMin");

  function qty(row) {
    if (row.dataset.key === "tile") return Number(tileRange.value);
    return Number($("output", row).textContent);
  }

  function calc() {
    var lines = [], carpet = 0, sum = 0;
    rows.forEach(function (row) {
      var q = qty(row), p = Number(row.dataset.price), sub = q * p;
      if (!q) return;
      if (["rooms", "halls", "stairs"].indexOf(row.dataset.key) > -1) carpet += sub;
      sum += sub;
      var label = row.dataset.key === "tile" ? q + " sq ft tile & grout" : q + " " + row.dataset.unit + (q > 1 ? "s" : "");
      lines.push([label, sub]);
    });
    if (protect.checked && carpet > 0) {
      var g = carpet * 0.15; sum += g; lines.push(["Stain-guard protector", g]);
    }
    var minApplied = sum > 0 && sum < MIN_VISIT;
    var total = sum === 0 ? 0 : Math.max(sum, MIN_VISIT);
    qtLines.innerHTML = lines.length ? lines.map(function (l) {
      return "<li><span>" + l[0] + "</span><span>" + money(l[1]) + "</span></li>";
    }).join("") : "<li><span>Add rooms or items to see a price</span></li>";
    qtMin.textContent = minApplied ? "Minimum visit " + money(MIN_VISIT) + " applied." : "Minimum visit " + money(MIN_VISIT) + " applies to small jobs.";
    animateTo(total);
    state.total = total;
    updateSummary();
  }

  var shown = 0, raf = null;
  function animateTo(target) {
    if (raf) cancelAnimationFrame(raf);
    var start = shown, t0 = null, dur = 380;
    qtPrice.classList.remove("bump"); void qtPrice.offsetWidth; qtPrice.classList.add("bump");
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = start + (target - start) * e;
      qtNum.textContent = Math.round(shown).toLocaleString("en-US");
      if (k < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  rows.forEach(function (row) {
    var out = $("output", row);
    if (!out) return;
    $(".minus", row).addEventListener("click", function () { out.textContent = Math.max(0, Number(out.textContent) - 1); calc(); });
    $(".plus", row).addEventListener("click", function () { out.textContent = Math.min(20, Number(out.textContent) + 1); calc(); });
  });
  tileRange.addEventListener("input", function () { $("#tileVal").textContent = tileRange.value; calc(); });
  protect.addEventListener("change", calc);

  function setType(type) {
    state.type = type;
    $$(".seg-btn").forEach(function (b) {
      var on = b.dataset.type === type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("#qRows").hidden = type !== "home";
    $("#qCommercial").hidden = type === "home";
    $(".quote-total").style.display = type === "home" ? "" : "none";
    updateSummary();
  }
  $$(".seg-btn").forEach(function (b) { b.addEventListener("click", function () { setType(b.dataset.type); }); });

  /* service card presets */
  function setCount(key, n) { var r = $('.q-row[data-key="' + key + '"] output'); if (r) r.textContent = n; }
  $$("[data-preset]").forEach(function (a) {
    a.addEventListener("click", function () {
      var p = a.dataset.preset;
      if (p === "commercial") { setType("commercial"); return; }
      setType("home");
      if (p === "rug") setCount("rugs", Math.max(1, qty($('.q-row[data-key="rugs"]'))));
      if (p === "sofa") setCount("sofas", Math.max(1, qty($('.q-row[data-key="sofas"]'))));
      if (p === "tile" && Number(tileRange.value) === 0) { tileRange.value = 200; $("#tileVal").textContent = "200"; }
      calc();
    });
  });

  /* ---------- Booking widget (in-browser only) ---------- */
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SLOTS = [["8:00", "8–9 a.m."], ["10:30", "10:30–11:30"], ["1:00", "1–2 p.m."], ["3:30", "3:30–4:30"]];
  var daysEl = $("#days"), slotsEl = $("#slots"), cityEl = $("#cityPick");
  var confirmBtn = $("#confirmBtn");

  // deterministic "booked" pattern so the demo looks like a real schedule
  function taken(dayIndex, slotIndex) { return ((dayIndex * 7 + slotIndex * 3) % 5) === 0; }

  var dayList = [];
  var today = new Date();
  for (var i = 1; dayList.length < 12; i++) {
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    dayList.push(d);
  }

  dayList.forEach(function (d, idx) {
    var closed = d.getDay() === 0;
    var open = closed ? 0 : SLOTS.filter(function (_, s) { return !taken(idx, s); }).length;
    var b = document.createElement("button");
    b.type = "button"; b.className = "day"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", "false");
    b.disabled = closed || open === 0;
    b.innerHTML = "<small>" + DAYS[d.getDay()] + "</small><b>" + d.getDate() + "</b><em>" + (closed ? "Closed" : open + " open") + "</em>";
    b.addEventListener("click", function () {
      state.day = idx; state.slot = null;
      $$(".day").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
      b.setAttribute("aria-selected", "true");
      renderSlots(); updateSummary();
    });
    daysEl.appendChild(b);
  });

  function renderSlots() {
    slotsEl.innerHTML = "";
    if (state.day === null) { slotsEl.innerHTML = '<p class="empty">Pick a day to see open arrival windows.</p>'; return; }
    SLOTS.forEach(function (s, si) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "slot"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", "false");
      b.disabled = taken(state.day, si);
      b.innerHTML = s[0] + "<small>" + (b.disabled ? "Booked" : s[1]) + "</small>";
      b.addEventListener("click", function () {
        state.slot = si;
        $$(".slot").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true");
        updateSummary();
      });
      slotsEl.appendChild(b);
    });
  }
  renderSlots();

  CITIES.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = c;
    b.setAttribute("aria-pressed", c === state.city ? "true" : "false");
    b.addEventListener("click", function () {
      state.city = c;
      $$(".chip", cityEl).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      updateSummary();
    });
    cityEl.appendChild(b);
  });

  function whenText() {
    var d = dayList[state.day];
    return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + " · " + SLOTS[state.slot][1];
  }

  function updateSummary() {
    var line = $("#bsLine"), sub = $("#bsSub");
    if (!line) return;
    var ready = state.day !== null && state.slot !== null;
    line.textContent = ready ? whenText() + " · " + state.city : (state.day === null ? "Select a day and time" : "Now pick an arrival window");
    sub.textContent = state.type === "commercial" ? "Commercial walk-through (custom quote)" : "Quote: " + money(state.total) + " (sample)";
    confirmBtn.disabled = !ready;
  }

  confirmBtn.addEventListener("click", function () {
    if (state.day === null || state.slot === null) return;
    var d = dayList[state.day];
    $("#doneSub").textContent = whenText() + " · " + state.city + (state.type === "commercial" ? " · walk-through" : " · " + money(state.total) + " sample quote");
    $("#smsText").textContent = "Action Extraction: You're booked for " + DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate() + ", arrival " + SLOTS[state.slot][1] + ". We'll text a reminder the day before. Reply R to reschedule.";
    $(".book-summary").hidden = true;
    $("#bookDone").hidden = false;
  });

  $("#resetBook").addEventListener("click", function () {
    $("#bookDone").hidden = true;
    $(".book-summary").hidden = false;
    state.slot = null;
    $$(".slot").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
    updateSummary();
  });

  /* ---------- Owner dashboard tabs ---------- */
  var dd = $("#dashDate");
  if (dd) dd.textContent = DAYS[today.getDay()] + ", " + MONTHS[today.getMonth()] + " " + today.getDate();
  $$(".dt").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".dt").forEach(function (x) { x.classList.toggle("active", x === t); });
      $$(".dash-view").forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.view; });
    });
  });

  /* ---------- Service area ---------- */
  var cl = $("#cityList");
  CITIES.forEach(function (c) {
    var li = document.createElement("li");
    li.textContent = c;
    if (c === "Sandy") li.className = "home";
    cl.appendChild(li);
  });

  /* FAQ: keep one open at a time */
  $$(".faq details").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) $$(".faq details").forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  calc();
})();
