(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  /** 기본 사칙연산 계산기 */
  function initBasicCalculator() {
    const displayEl = $("#calc-display");
    const keys = document.querySelector(".calc-keys");
    if (!displayEl || !keys) return;

    let display = "0";
    let prev = null;
    let pendingOp = null;
    let fresh = false;

    function formatForShow(n) {
      if (!Number.isFinite(n)) return "오류";
      const abs = Math.abs(n);
      if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
        return n.toExponential(6);
      }
      const rounded = Math.round(n * 1e12) / 1e12;
      let out = String(rounded);
      if (out.length > 16) out = n.toExponential(8);
      return out;
    }

    function render() {
      displayEl.textContent = display;
    }

    function recoverFromError() {
      if (display === "오류") clearAll();
    }

    function inputDigit(d) {
      recoverFromError();
      if (fresh) {
        display = d;
        fresh = false;
      } else if (display === "0" && d !== "0") {
        display = d;
      } else if (display === "0" && d === "0") {
        return;
      } else if (display.replace("-", "").replace(".", "").length >= 15) {
        return;
      } else {
        display += d;
      }
      render();
    }

    function inputDot() {
      recoverFromError();
      if (fresh) {
        display = "0.";
        fresh = false;
      } else if (!display.includes(".")) {
        display += ".";
      }
      render();
    }

    function applyOp(a, b, op) {
      switch (op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b === 0 ? NaN : a / b;
        default:
          return b;
      }
    }

    function commitPending() {
      if (display === "오류") return;
      if (pendingOp == null || prev === null) return;
      const cur = Number(display);
      const next = applyOp(prev, cur, pendingOp);
      display = formatForShow(next);
      prev = null;
      pendingOp = null;
      fresh = true;
      render();
    }

    function setOperator(op) {
      recoverFromError();
      const cur = Number(display);
      if (prev !== null && pendingOp != null && !fresh) {
        prev = applyOp(prev, cur, pendingOp);
        display = formatForShow(prev);
        render();
      } else {
        prev = cur;
      }
      pendingOp = op;
      fresh = true;
    }

    function clearAll() {
      display = "0";
      prev = null;
      pendingOp = null;
      fresh = false;
      render();
    }

    function toggleSign() {
      if (display === "오류") {
        clearAll();
        return;
      }
      if (display === "0") return;
      if (display.startsWith("-")) display = display.slice(1);
      else display = "-" + display;
      render();
    }

    function percent() {
      recoverFromError();
      const n = Number(display);
      if (!Number.isFinite(n)) return;
      display = formatForShow(n / 100);
      fresh = true;
      render();
    }

    function backspace() {
      if (fresh) return;
      if (display.length <= 1 || (display.startsWith("-") && display.length === 2)) {
        display = "0";
      } else {
        display = display.slice(0, -1);
      }
      render();
    }

    keys.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action } = btn.dataset;
      if (action === "digit") inputDigit(btn.dataset.digit);
      else if (action === "dot") inputDot();
      else if (action === "op") setOperator(btn.dataset.op);
      else if (action === "equals") commitPending();
      else if (action === "clear") clearAll();
      else if (action === "sign") toggleSign();
      else if (action === "percent") percent();
    });

    window.addEventListener("keydown", (e) => {
      if ($("#panel-basic") && $("#panel-basic").hidden) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        inputDot();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        e.preventDefault();
        setOperator(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        commitPending();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearAll();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      }
    });

    render();
  }

  function fmt(n, digits = 6) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 1e-4 && n !== 0)) {
      return n.toExponential(4);
    }
    return n.toLocaleString("ko-KR", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  }

  function fmtPct(x, digits = 4) {
    return (100 * x).toLocaleString("ko-KR", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }) + "%";
  }

  function renderRows(sections) {
    const frag = document.createDocumentFragment();
    for (const sec of sections) {
      const wrap = document.createElement("div");
      wrap.className = "result-section";
      if (sec.title) {
        const h = document.createElement("h3");
        h.textContent = sec.title;
        wrap.appendChild(h);
      }
      for (const [label, value] of sec.rows) {
        const dl = document.createElement("dl");
        dl.className = "result-row";
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        dl.appendChild(dt);
        dl.appendChild(dd);
        wrap.appendChild(dl);
      }
      frag.appendChild(wrap);
    }
    return frag;
  }

  /** Tabs */
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".panel").forEach((p) => {
        const on = p.id === `panel-${id}`;
        p.classList.toggle("active", on);
        p.hidden = !on;
      });
    });
  });

  initBasicCalculator();

  /** Black-Scholes */
  $("#form-bsm").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("#out-bsm");
    out.classList.remove("empty");
    out.textContent = "";
    try {
      const fd = new FormData(e.target);
      const S = Number(fd.get("S"));
      const K = Number(fd.get("K"));
      const T = Number(fd.get("T"));
      const r = Number(fd.get("r"));
      const q = Number(fd.get("q"));
      const sigma = Number(fd.get("sigma"));
      const type = fd.get("otype") === "put" ? "put" : "call";
      const r0 = FinanceMath.blackScholes(S, K, T, r, q, sigma, type);
      const sections = [
        {
          title: "가격·그릭스",
          rows: [
            ["이론가", fmt(r0.price, 6)],
            ["Delta (Δ)", fmt(r0.delta, 6)],
            ["Gamma (Γ)", fmt(r0.gamma, 8)],
            ["Vega (ν, /1%vol)", fmt(r0.vega, 6)],
            ["Theta (Θ, /일)", fmt(r0.theta, 8)],
            ["Rho (ρ, /1% 금리)", fmt(r0.rho, 8)],
          ],
        },
      ];
      out.appendChild(renderRows(sections));
    } catch (err) {
      out.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  /** Bond */
  $("#form-bond").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("#out-bond");
    out.classList.remove("empty");
    out.textContent = "";
    try {
      const fd = new FormData(e.target);
      const F = Number(fd.get("F"));
      const c = Number(fd.get("c"));
      const n = Math.floor(Number(fd.get("n")));
      const y = Number(fd.get("y"));
      const Praw = fd.get("P");
      const Pstr = Praw != null ? String(Praw).trim() : "";

      const sections = [];
      if (Pstr !== "") {
        const P = Number(Pstr);
        const ytm = FinanceMath.bondYtm(F, c, n, P);
        const durM = FinanceMath.macaulayDuration(F, c, n, ytm);
        const durMod = FinanceMath.modifiedDuration(F, c, n, ytm);
        sections.push({
          title: "시장가 기준",
          rows: [
            ["YTM (연)", fmtPct(ytm)],
            ["Macaulay Duration (년)", fmt(durM, 6)],
            ["Modified Duration", fmt(durMod, 6)],
            ["재계산 가격 (검증)", fmt(FinanceMath.bondPriceFromYield(F, c, n, ytm), 6)],
          ],
        });
      }
      const priceY = FinanceMath.bondPriceFromYield(F, c, n, y);
      const durMy = FinanceMath.macaulayDuration(F, c, n, y);
      const durMody = FinanceMath.modifiedDuration(F, c, n, y);
      sections.push({
        title: Pstr !== "" ? `할인율 y = ${fmtPct(y, 4)} 기준` : "할인율 기준",
        rows: [
          ["이론가 P(y)", fmt(priceY, 6)],
          ["Macaulay Duration", fmt(durMy, 6)],
          ["Modified Duration", fmt(durMody, 6)],
        ],
      });
      out.appendChild(renderRows(sections));
    } catch (err) {
      out.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  /** NPV IRR */
  $("#form-dcf").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("#out-dcf");
    out.classList.remove("empty");
    out.textContent = "";
    try {
      const fd = new FormData(e.target);
      const rate = Number(fd.get("rate"));
      const text = String(fd.get("cfs") || "");
      const cfs = text
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number);
      if (cfs.some((x) => !Number.isFinite(x))) {
        throw new Error("현금흐름에 숫자가 아닌 항목이 있습니다.");
      }
      const v = FinanceMath.npv(rate, cfs);
      let irrVal;
      try {
        irrVal = FinanceMath.irr(cfs);
      } catch {
        irrVal = null;
      }
      const sections = [
        {
          title: "NPV",
          rows: [
            ["할인율 (연)", fmtPct(rate)],
            ["NPV", fmt(v, 6)],
          ],
        },
      ];
      if (irrVal != null) {
        sections.push({
          title: "IRR",
          rows: [["IRR (연)", fmtPct(irrVal)]],
        });
      } else {
        sections.push({
          title: "IRR",
          rows: [["IRR", "계산 불가"]],
        });
      }
      out.appendChild(renderRows(sections));
    } catch (err) {
      out.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  /** Forward */
  $("#form-fwd").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("#out-fwd");
    out.classList.remove("empty");
    out.textContent = "";
    try {
      const fd = new FormData(e.target);
      const S0 = Number(fd.get("S0"));
      const T = Number(fd.get("T"));
      const r = Number(fd.get("r"));
      const b = Number(fd.get("b"));
      const F0 = FinanceMath.forwardPrice(S0, T, r, b);
      const carry = r - b;
      out.appendChild(
        renderRows([
          {
            title: "선도가",
            rows: [
              ["F₀ = S₀ e^{(r−b)T}", fmt(F0, 6)],
              ["순보유비용 (r − b)", fmtPct(carry)],
              ["현물 대비", fmt(F0 - S0, 6)],
            ],
          },
        ])
      );
    } catch (err) {
      out.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });
})();
