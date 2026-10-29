(() => {
  const MAKES = { Ford: ["Escape", "F-150", "Mustang"], Honda: ["Accord", "Civic", "CR-V"], Hyundai: ["Elantra", "Sonata", "Tucson"], Toyota: ["Camry", "Corolla", "RAV4"] };
  const YEARS = Array.from({ length: 19 }, (_, i) => String(2026 - i));
  const STEP_NUM = { postal: 1, car: 2, dob: 3, licence: 4, experience: 5, record: 6 };
  const LEFT = { licence: "3 more questions for your exact price.", experience: "2 more questions for your exact price.", record: "Last question before your exact price." };
  const LICENCES = [["G", "G (full licence)"], ["G2", "G2"], ["G1", "G1"], ["other", "Licence from another country"]];
  const SLOTS = ["Today, 4:30 PM", "Tomorrow, 10:30 AM", "Tomorrow, 2:00 PM"];
  const MAIN = ["start", "postal", "car", "dob", "licence", "experience", "record", "coverage", "price"];
  const FOCUS_ID = { dob: "dob-d", licence: "licence-0", tickets: "tickets-0", accidents: "accidents-0", slot: "slot-0" };
  const NEXT = { start: "postal", postal: "car", car: "dob", dob: "licence", licence: "experience", experience: "record", record: "coverage", coverage: "price", price: "end", broker: "done" };
  const PC = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

  const blank = () => ({ postal: "", carMode: "select", year: "", make: "", model: "", plate: "", plateFound: false, dob: { d: "", m: "", y: "" }, licence: "", years: "", tickets: "", accidents: "", cov: { collision: true, comprehensive: true, extra: false }, deductible: "1000", slot: "", phone: "", email: "" });
  const sample = () => Object.assign(blank(), { postal: "M5V 3L9", year: "2019", make: "Honda", model: "Civic", dob: { d: "14", m: "5", y: "1997" }, licence: "G2", years: "6", tickets: "no", accidents: "no" });

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Math.round(n).toLocaleString("en-CA");

  function ageOf(s) {
    const d = +s.dob.d, m = +s.dob.m, y = +s.dob.y;
    if (!d || !m || !y) return null;
    const now = new Date();
    let a = now.getFullYear() - y;
    const nm = now.getMonth() + 1;
    if (nm < m || (nm === m && now.getDate() < d)) a -= 1;
    return a;
  }
  function basePrice(s, full) {
    let p = 120;
    const a = ageOf(s);
    if (a !== null) { if (a < 25) p += 60; else if (a < 35) p += 20; else if (a >= 65) p += 10; }
    const first = s.postal.trim().charAt(0).toUpperCase();
    if (first === "M") p += 25; else if (first === "L") p += 15;
    if (+s.year >= 2022) p += 15;
    if (full) {
      p += { G: 0, G2: 25, G1: 60, other: 30 }[s.licence] || 0;
      if (s.years !== "") { const y = +s.years; p += y < 3 ? 40 : y < 6 ? 20 : y < 10 ? 5 : -10; }
      if (s.tickets === "yes") p += 35;
      if (s.accidents === "yes") p += 55;
    }
    return p;
  }
  function addons(s, ded) {
    const low = (ded || s.deductible) === "500";
    return { collision: s.cov.collision ? (low ? 48 : 38) : 0, comprehensive: s.cov.comprehensive ? (low ? 18 : 14) : 0, extra: s.cov.extra ? 9 : 0 };
  }
  const sum = (o) => o.collision + o.comprehensive + o.extra;
  const total = (s, ded) => basePrice(s, true) + sum(addons(s, ded));
  function estimate(s) { const b = basePrice(s, false) + 52; return [Math.round((b * 0.85) / 5) * 5, Math.round((b * 1.25) / 5) * 5]; }

  function answers(s) {
    const out = [];
    if (s.postal) out.push("Postal code " + s.postal);
    if (s.year && s.make && s.model) out.push(s.year + " " + s.make + " " + s.model);
    const a = ageOf(s);
    if (a !== null) out.push("Age " + a);
    if (s.licence) out.push(s.licence === "other" ? "Licence from another country" : s.licence + " licence");
    if (s.years !== "") out.push(s.years + " years driving");
    if (s.tickets && s.accidents) out.push(s.tickets === "no" && s.accidents === "no" ? "No tickets or accidents" : "Tickets or accidents to review");
    return out;
  }
  function fmtPhone(v) {
    const d = String(v).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : v;
  }

  function view(step, s, p, err) {
    err = err || {};
    const id = (k) => p + "-" + k;
    const fe = (k) => (err[k] ? `<p class="ph-err" id="${id(k)}-err"><span class="vh">Error: </span>${esc(err[k])}</p>` : "");
    const desc = (k, hint) => {
      const ids = [];
      if (hint) ids.push(id(k) + "-hint");
      if (err[k]) ids.push(id(k) + "-err");
      return (ids.length ? ` aria-describedby="${ids.join(" ")}"` : "") + (err[k] ? ' aria-invalid="true"' : "");
    };
    const fsDesc = (k, hint) => {
      const ids = [];
      if (hint) ids.push(id(k) + "-hint");
      if (err[k]) ids.push(id(k) + "-err");
      return ids.length ? ` aria-describedby="${ids.join(" ")}"` : "";
    };
    const back = `<button type="button" class="ph-back" data-act="back">Back</button>`;
    const n = STEP_NUM[step];
    const prog = n ? `<div class="ph-prog"><p class="ph-step">Step ${n} of 6</p><div class="ph-bar-track" aria-hidden="true"><span style="width:${((n / 6) * 100).toFixed(1)}%"></span></div></div>` : "";
    const keys = Object.keys(err);
    const sumBox = keys.length ? `<div class="ph-errsum" role="alert" tabindex="-1" data-errsum><h3>There is a problem</h3><ul>${keys.map((k) => `<li><a href="#${id(FOCUS_ID[k] || k)}" data-focus="${id(FOCUS_ID[k] || k)}">${esc(err[k])}</a></li>`).join("")}</ul></div>` : "";
    const cont = (label) => `<button class="ph-btn" type="submit">${label || "Continue"}</button><button class="ph-link" type="button" data-act="save">Save and finish later</button>`;
    const est = () => { const r = estimate(s); return `<div class="ph-est"><p class="ph-label">Early estimate</p><p class="ph-est-num">${money(r[0])} to ${money(r[1])} <span>a month</span></p><p class="ph-small">${LEFT[step]}</p></div>`; };
    const radio = (name, value, label, i, checked, bad) => `<label class="ph-opt${bad ? " err" : ""}" for="${id(name)}-${i}"><input type="radio" id="${id(name)}-${i}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}><span>${esc(label)}</span></label>`;
    const chips = (list) => list.length ? `<div><p class="ph-label">Your broker will see</p><ul class="ph-chips">${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";

    switch (step) {
      case "start":
        return {
          main: `<h2 class="ph-h" tabindex="-1">Get a car insurance quote</h2><p class="ph-p">It takes about 5 minutes. You don't need an account.</p><div class="ph-card"><p class="ph-label">Have these ready</p><ul class="ph-list"><li>Your postal code</li><li>Your car's year, make and model, or its licence plate</li><li>Your driving history</li></ul></div><p class="ph-small">You'll see an early estimate after 3 questions.</p>`,
          bar: `<button class="ph-btn" type="submit">Start</button>`
        };
      case "postal":
        return {
          main: `${back}${prog}${sumBox}<h2 class="ph-h" tabindex="-1"><label for="${id("postal")}">What is your postal code?</label></h2><p class="ph-hint" id="${id("postal")}-hint">We use it to check rates in your area. For example, M5V 3L9.</p>${fe("postal")}<input class="ph-input ph-w-short" id="${id("postal")}" name="postal" autocomplete="postal-code" autocapitalize="characters" spellcheck="false" value="${esc(s.postal)}"${desc("postal", true)}>`,
          bar: cont()
        };
      case "car": {
        if (s.carMode === "plate") {
          return {
            main: `${back}${prog}${sumBox}<h2 class="ph-h" tabindex="-1"><label for="${id("plate")}">What is your licence plate?</label></h2><p class="ph-hint" id="${id("plate")}-hint">We'll find your car for you. For example, CABC 123.</p>${fe("plate")}<input class="ph-input ph-w-med" id="${id("plate")}" name="plate" autocapitalize="characters" spellcheck="false" value="${esc(s.plate)}"${desc("plate", true)}>${s.plateFound ? `<div class="ph-found" role="status"><p class="ph-label">We found</p><p class="ph-found-car">2019 Honda Civic LX</p><p class="ph-small">The plate lookup is simulated in this prototype.</p></div>` : ""}<button type="button" class="ph-link" data-act="carmode-select">Choose year, make and model instead</button>`,
            bar: cont(s.plateFound ? "Yes, this is my car" : "Find my car")
          };
        }
        const opt = (list, val, ph) => `<option value="">${ph}</option>` + list.map((v) => `<option${v === val ? " selected" : ""}>${esc(v)}</option>`).join("");
        const models = MAKES[s.make] || [];
        return {
          main: `${back}${prog}${sumBox}<fieldset class="ph-fs"><legend><h2 class="ph-h" tabindex="-1">Which car do you want to insure?</h2></legend>
            <div class="ph-field"><label class="ph-flabel" for="${id("year")}">Year</label>${fe("year")}<select class="ph-input ph-w-short" id="${id("year")}" name="year"${desc("year")}>${opt(YEARS, s.year, "Select")}</select></div>
            <div class="ph-field"><label class="ph-flabel" for="${id("make")}">Make</label>${fe("make")}<select class="ph-input ph-w-med" id="${id("make")}" name="make"${desc("make")}>${opt(Object.keys(MAKES), s.make, "Select")}</select></div>
            <div class="ph-field"><label class="ph-flabel" for="${id("model")}">Model</label>${fe("model")}<select class="ph-input ph-w-med" id="${id("model")}" name="model"${desc("model")}${models.length ? "" : " disabled"}>${opt(models, s.model, models.length ? "Select" : "Choose a make first")}</select></div>
          </fieldset><button type="button" class="ph-link" data-act="carmode-plate">Use my licence plate instead</button>`,
          bar: cont()
        };
      }
      case "dob": {
        const bad = err.dob ? ' aria-invalid="true"' : "";
        const part = (k, label, auto, cls) => `<div class="ph-field ${cls}"><label class="ph-flabel" for="${id("dob")}-${k}">${label}</label><input class="ph-input" id="${id("dob")}-${k}" name="dob-${k}" inputmode="numeric" autocomplete="${auto}" value="${esc(s.dob[k])}"${bad}></div>`;
        return {
          main: `${back}${prog}${sumBox}<fieldset class="ph-fs"${fsDesc("dob", true)}><legend><h2 class="ph-h" tabindex="-1">What is your date of birth?</h2></legend><p class="ph-hint" id="${id("dob")}-hint">For example, 14 5 1997.</p>${fe("dob")}<div class="ph-date">${part("d", "Day", "bday-day", "")}${part("m", "Month", "bday-month", "")}${part("y", "Year", "bday-year", "y")}</div></fieldset>`,
          bar: cont()
        };
      }
      case "licence":
        return {
          main: `${back}${prog}${est()}${sumBox}<fieldset class="ph-fs"${fsDesc("licence", true)}><legend><h2 class="ph-h" tabindex="-1">Which Ontario licence do you have?</h2></legend><p class="ph-hint" id="${id("licence")}-hint">Not sure? Check your driver's licence card.</p>${fe("licence")}<div class="ph-opts">${LICENCES.map((l, i) => radio("licence", l[0], l[1], i, s.licence === l[0], !!err.licence)).join("")}</div></fieldset>`,
          bar: cont()
        };
      case "experience":
        return {
          main: `${back}${prog}${est()}${sumBox}<h2 class="ph-h" tabindex="-1"><label for="${id("years")}">How many years have you been driving?</label></h2><p class="ph-hint" id="${id("years")}-hint">Include years outside Canada. If you drove in another country, ask your previous insurer for a letter of experience. Insurers may count it.</p>${fe("years")}<div class="ph-suffix"><input class="ph-input ph-w-xs" id="${id("years")}" name="years" inputmode="numeric" value="${esc(s.years)}"${desc("years", true)}><span aria-hidden="true">years</span></div>`,
          bar: cont()
        };
      case "record": {
        const yn = (name, q) => `<fieldset class="ph-fs ph-fs-sub"${fsDesc(name)}><legend class="ph-legend">${q}</legend>${fe(name)}<div class="ph-yn">${radio(name, "yes", "Yes", 0, s[name] === "yes", !!err[name])}${radio(name, "no", "No", 1, s[name] === "no", !!err[name])}</div></fieldset>`;
        return {
          main: `${back}${prog}${est()}${sumBox}<h2 class="ph-h" tabindex="-1">Your driving record</h2>${yn("tickets", "Any traffic tickets in the last 3 years?")}${yn("accidents", "Any accidents in the last 10 years?")}`,
          bar: cont("See coverage")
        };
      }
      case "coverage": {
        const low = s.deductible === "500";
        const req = [
          ["Third-party liability", "Pays if you injure someone or damage their property. The legal minimum is $200,000, and you can choose more."],
          ["Accident benefits", "Pays for medical care, rehabilitation and attendant care if you are hurt in a crash. Since July 2026, other accident benefits are optional."],
          ["Direct compensation (DC-PD)", "Pays to repair your car when another driver is at fault. Since 2024 you can opt out, so talk to a broker first."],
          ["Uninsured automobile", "Pays if you are hurt by a driver who has no insurance or can't be identified."]
        ];
        const add = (key, name, text, price) => `<label class="ph-opt ph-addon" for="${id(key)}"><input type="checkbox" id="${id(key)}" name="${key}"${s.cov[key] ? " checked" : ""}><span class="ph-addon-text"><strong>${name}</strong><span>${text}</span></span><span class="ph-addon-price">+${money(price)}</span></label>`;
        return {
          main: `${back}<p class="ph-step">Choose coverage</p><h2 class="ph-h" tabindex="-1">Choose your coverage</h2><p class="ph-p">Coverage required by law is already included.</p>
            <section class="ph-sec" aria-labelledby="${id("req")}"><p class="ph-label" id="${id("req")}">Required by law in Ontario</p>${req.map((r) => `<details class="ph-req"><summary><span>${r[0]}</span><span class="ph-more">What's this?</span></summary><p>${r[1]}</p></details>`).join("")}</section>
            <section class="ph-sec" aria-labelledby="${id("optl")}"><p class="ph-label" id="${id("optl")}">Optional, price a month</p><div class="ph-opts">
              ${add("collision", "Collision", "Repairs your car after a crash, including when you are at fault.", low ? 48 : 38)}
              ${add("comprehensive", "Comprehensive", "Covers theft, fire, vandalism, hail and other damage that isn't a crash.", low ? 18 : 14)}
              ${add("extra", "More accident benefits", "Adds income replacement and other benefits that became optional in July 2026.", 9)}
            </div></section>`,
          bar: `<div class="ph-total"><span>Your price</span><strong data-total aria-live="polite">${money(total(s))}<small> a month</small></strong></div><button class="ph-btn" type="submit">See my price</button>`
        };
      }
      case "price": {
        const o = addons(s), base = basePrice(s, true), t = base + sum(o);
        const hasDed = s.cov.collision || s.cov.comprehensive;
        const diff = total(s, "500") - total(s, "1000");
        const row = (name, v) => `<div><dt>${name}</dt><dd>${v ? money(v) : "Not added"}</dd></div>`;
        const factors = [
          s.postal ? "Area " + s.postal.slice(0, 3) : "",
          s.year ? s.year + " " + s.make + " " + s.model : "",
          s.licence ? (s.licence === "other" ? "Licence from abroad" : s.licence + " licence") : "",
          s.years !== "" ? s.years + " years driving" : "",
          s.tickets === "no" && s.accidents === "no" ? "Clean record" : (s.tickets ? "Tickets or accidents" : "")
        ].filter(Boolean);
        return {
          main: `${back}<p class="ph-step">Your price</p><h2 class="ph-h" tabindex="-1">Your price</h2><div><p class="ph-price">${money(t)} <span>a month</span></p><p class="ph-small">${money(t * 12)} a year. Example price, not a real quote.</p></div>
            <dl class="ph-break"><div><dt>Required coverage</dt><dd>${money(base)}</dd></div>${row("Collision", o.collision)}${row("Comprehensive", o.comprehensive)}${row("More accident benefits", o.extra)}<div class="tot"><dt>Total a month</dt><dd>${money(t)}</dd></div></dl>
            ${hasDed ? `<fieldset class="ph-fs ph-fs-sub"${fsDesc("ded", true)}><legend class="ph-legend">Your deductible</legend><p class="ph-hint" id="${id("ded")}-hint">What you pay yourself before collision or comprehensive pays.</p><div class="ph-opts">${radio("deductible", "500", "$500, adds " + money(diff) + " a month", 0, s.deductible === "500")}${radio("deductible", "1000", "$1,000, lower price", 1, s.deductible === "1000")}</div></fieldset>` : ""}
            ${factors.length ? `<div><p class="ph-label">What shapes your price</p><ul class="ph-chips">${factors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : ""}`,
          bar: `<button class="ph-btn" type="submit">Continue to buy</button><button class="ph-btn secondary" type="button" data-act="broker">Talk to a broker</button><p class="ph-small ph-center">The broker will see your answers.</p>`
        };
      }
      case "broker":
        return {
          help: false,
          main: `${back}${sumBox}<p class="ph-step">Talk to a broker</p><h2 class="ph-h" tabindex="-1">Talk to a licensed broker</h2><p class="ph-p">A broker will call you. They will already have your answers, so you won't need to repeat them.</p>${chips(answers(s))}<fieldset class="ph-fs ph-fs-sub"${fsDesc("slot")}><legend class="ph-legend">When should we call?</legend>${fe("slot")}<div class="ph-opts">${SLOTS.map((t, i) => radio("slot", t, t, i, s.slot === t, !!err.slot)).join("")}</div></fieldset><div class="ph-field"><label class="ph-flabel" for="${id("phone")}">Phone number</label><p class="ph-hint" id="${id("phone")}-hint">We only call about this quote.</p>${fe("phone")}<input class="ph-input ph-w-med" type="tel" id="${id("phone")}" name="phone" autocomplete="tel" value="${esc(s.phone)}"${desc("phone", true)}></div>`,
          bar: `<button class="ph-btn" type="submit">Book the call</button>`
        };
      case "done":
        return {
          help: false,
          main: `<div class="ph-check" aria-hidden="true">&#10003;</div><h2 class="ph-h" tabindex="-1">Your call is booked</h2><p class="ph-p"><strong>${esc(s.slot)}</strong> at ${esc(fmtPhone(s.phone))}</p>${chips(answers(s))}<p class="ph-small">This is a prototype. No call will be made.</p>`,
          bar: `<button class="ph-btn secondary" type="button" data-act="restart">Start a new quote</button>`
        };
      case "save":
        return {
          main: `${back}${sumBox}<h2 class="ph-h" tabindex="-1">Save and finish later</h2><div class="ph-field"><label class="ph-flabel" for="${id("email")}">Email address</label><p class="ph-hint" id="${id("email")}-hint">We'll email you a link that works for 7 days. You won't need a password.</p>${fe("email")}<input class="ph-input" type="email" id="${id("email")}" name="email" autocomplete="email" spellcheck="false" value="${esc(s.email)}"${desc("email", true)}></div>`,
          bar: `<button class="ph-btn" type="submit">Send me the link</button>`
        };
      case "saved":
        return {
          main: `<div class="ph-check" aria-hidden="true">&#10003;</div><h2 class="ph-h" tabindex="-1">Check your email</h2><p class="ph-p">We sent a link to <strong>${esc(s.email)}</strong>. Open it on any device to continue where you stopped.</p><p class="ph-small">This is a prototype. No email is sent.</p>`,
          bar: `<button class="ph-btn" type="button" data-act="resume">Back to my quote</button>`
        };
      default:
        return {
          main: `<h2 class="ph-h" tabindex="-1">End of the prototype</h2><p class="ph-p">In the real product, you would check your details, add your documents and pay here.</p>`,
          bar: `<button class="ph-btn secondary" type="button" data-act="restart">Start again</button>`
        };
    }
  }

  function screen(step, s, p, err) {
    const v = view(step, s, p, err);
    const help = v.help === false ? "" : `<button type="button" class="ph-help" data-act="broker">Talk to a broker</button>`;
    return `<form class="ph-form" novalidate data-step="${step}"><div class="ph-top"><span class="ph-logo">kova</span>${help}</div><div class="ph-main">${v.main}</div><div class="ph-bar">${v.bar}</div></form>`;
  }

  function validate(step, s) {
    const e = {};
    if (step === "postal") {
      const v = s.postal.toUpperCase().replace(/\s+/g, "");
      if (!v) e.postal = "Enter your postal code";
      else if (!PC.test(v)) e.postal = "Enter a postal code like M5V 3L9";
      else if (!/^[KLMNP]/.test(v)) e.postal = "Enter an Ontario postal code. It starts with K, L, M, N or P";
    }
    if (step === "car") {
      if (s.carMode === "plate") {
        const v = s.plate.toUpperCase().replace(/\s+/g, "");
        if (!v) e.plate = "Enter your licence plate";
        else if (!/^[A-Z0-9]{2,8}$/.test(v)) e.plate = "Use letters and numbers only, like CABC 123";
      } else {
        if (!s.year) e.year = "Select the year of your car";
        if (!s.make) e.make = "Select the make of your car";
        if (!s.model) e.model = "Select the model of your car";
      }
    }
    if (step === "dob") {
      const d = s.dob.d, m = s.dob.m, y = s.dob.y;
      if (!d || !m || !y) e.dob = "Enter your date of birth, for example 14 5 1997";
      else {
        const dt = new Date(+y, +m - 1, +d);
        if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y) || dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) e.dob = "Date of birth must be a real date";
        else {
          const a = ageOf(s);
          if (a < 16) e.dob = "You must be 16 or older to get a quote";
          else if (a > 100) e.dob = "Check the year you were born";
        }
      }
    }
    if (step === "licence" && !s.licence) e.licence = "Select the licence you have";
    if (step === "experience") {
      const v = s.years;
      if (!v) e.years = "Enter how many years you have been driving";
      else if (!/^\d{1,2}$/.test(v)) e.years = "Enter a whole number, like 6";
      else { const a = ageOf(s); if (a !== null && +v > a - 14) e.years = "That is more years than your age allows. Check the number"; }
    }
    if (step === "record") {
      if (!s.tickets) e.tickets = "Select yes if you had any tickets in the last 3 years";
      if (!s.accidents) e.accidents = "Select yes if you had any accidents in the last 10 years";
    }
    if (step === "broker") {
      if (!s.slot) e.slot = "Select a time for the call";
      const d = s.phone.replace(/\D/g, "");
      if (!(d.length === 10 || (d.length === 11 && d[0] === "1"))) e.phone = "Enter a phone number like 416 555 0123";
    }
    if (step === "save" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = "Enter an email address like name@example.com";
    return e;
  }

  function read(form, s) {
    const f = new FormData(form);
    const g = (k) => (f.has(k) ? String(f.get(k)) : null);
    const step = form.dataset.step;
    if (step === "postal") s.postal = (g("postal") || "").trim();
    if (step === "car") {
      if (s.carMode === "plate") s.plate = (g("plate") || "").trim();
      else { s.year = g("year") || ""; s.make = g("make") || ""; s.model = g("model") || ""; }
    }
    if (step === "dob") s.dob = { d: (g("dob-d") || "").trim(), m: (g("dob-m") || "").trim(), y: (g("dob-y") || "").trim() };
    if (step === "licence") s.licence = g("licence") || "";
    if (step === "experience") s.years = (g("years") || "").trim();
    if (step === "record") { s.tickets = g("tickets") || ""; s.accidents = g("accidents") || ""; }
    if (step === "coverage") s.cov = { collision: f.has("collision"), comprehensive: f.has("comprehensive"), extra: f.has("extra") };
    if (step === "price" && g("deductible")) s.deductible = g("deductible");
    if (step === "broker") { s.slot = g("slot") || ""; s.phone = (g("phone") || "").trim(); }
    if (step === "save") s.email = (g("email") || "").trim();
  }

  function live(el) {
    const p = "kq";
    let s = blank(), step = "start", err = null, hist = [], ret = "start";
    function draw(focus, keep) {
      const top = el.scrollTop;
      el.innerHTML = screen(step, s, p, err);
      el.scrollTop = keep ? top : 0;
      if (focus) {
        const t = (err && el.querySelector("[data-errsum]")) || el.querySelector(".ph-h");
        if (t) t.focus({ preventScroll: true });
      }
    }
    function go(next) { hist.push(step); step = next; err = null; draw(true); }
    el.addEventListener("submit", (e) => {
      e.preventDefault();
      read(e.target, s);
      const v = validate(step, s);
      if (Object.keys(v).length) { err = v; draw(true); return; }
      err = null;
      if (step === "postal") { const x = s.postal.toUpperCase().replace(/\s+/g, ""); s.postal = x.slice(0, 3) + " " + x.slice(3); }
      if (step === "car" && s.carMode === "plate" && !s.plateFound) {
        s.plate = s.plate.toUpperCase(); s.plateFound = true; s.year = "2019"; s.make = "Honda"; s.model = "Civic";
        draw(false, true);
        const found = el.querySelector(".ph-found");
        if (found) found.scrollIntoView({ block: "nearest" });
        return;
      }
      if (step === "save") { step = "saved"; draw(true); return; }
      go(NEXT[step]);
    });
    el.addEventListener("click", (e) => {
      const f = e.target.closest("[data-focus]");
      if (f) {
        e.preventDefault();
        const target = el.querySelector("#" + CSS.escape(f.dataset.focus));
        if (target) target.focus();
        return;
      }
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const form = el.querySelector("form");
      if (form) read(form, s);
      const act = b.dataset.act;
      if (act === "back") { step = hist.length ? hist.pop() : "start"; err = null; draw(true); }
      else if (act === "broker") { if (step !== "broker") go("broker"); }
      else if (act === "save") { ret = step; go("save"); }
      else if (act === "resume") { hist.pop(); step = ret; err = null; draw(true); }
      else if (act === "restart") { s = blank(); hist = []; step = "start"; err = null; draw(true); }
      else if (act === "carmode-plate" || act === "carmode-select") { s.carMode = act === "carmode-plate" ? "plate" : "select"; s.plateFound = false; err = null; draw(true); }
    });
    el.addEventListener("change", (e) => {
      const t = e.target;
      const form = el.querySelector("form");
      if (!form) return;
      if (step === "car" && t.name === "make") {
        read(form, s); s.model = ""; draw(false, true);
        const m = el.querySelector("#" + p + "-make"); if (m) m.focus();
      } else if (step === "coverage" && t.type === "checkbox") {
        read(form, s);
        const out = el.querySelector("[data-total]");
        if (out) out.innerHTML = money(total(s)) + "<small> a month</small>";
      } else if (step === "price" && t.name === "deductible") {
        read(form, s); const v = t.value; draw(false, true);
        const r = el.querySelector('input[name="deductible"][value="' + v + '"]'); if (r) r.focus();
      }
    });
    function show(target) {
      s = sample(); err = null;
      if (target === "done") { s.slot = SLOTS[1]; s.phone = "4165550123"; hist = MAIN.concat(["broker"]); }
      else if (target === "broker") hist = MAIN.slice();
      else { const i = MAIN.indexOf(target); hist = i > 0 ? MAIN.slice(0, i) : []; }
      step = target;
      draw(false);
      return el.querySelector(".ph-h");
    }
    draw(false);
    return { show };
  }

  window.Kova = { blank, sample, screen, live, SLOTS };
})();
