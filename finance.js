/**
 * 금융공학 유틸 — Black-Scholes, 채권, NPV/IRR, 선도
 * 연속복리·연속배당 가정 (BSM)
 */

const FinanceMath = (function () {
  const SQRT2PI = Math.sqrt(2 * Math.PI);

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * ax);
    const y =
      1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.SQRT2));
  }

  function normPdf(x) {
    return Math.exp(-0.5 * x * x) / SQRT2PI;
  }

  /**
   * @param {number} S
   * @param {number} K
   * @param {number} T years
   * @param {number} r
   * @param {number} q
   * @param {number} sigma
   * @param {'call'|'put'} type
   */
  function blackScholes(S, K, T, r, q, sigma, type) {
    if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
      throw new Error("S, K, σ, T는 양수여야 합니다.");
    }
    const sigSqrtT = sigma * Math.sqrt(T);
    const d1 =
      (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / sigSqrtT;
    const d2 = d1 - sigSqrtT;
    const discR = Math.exp(-r * T);
    const discQ = Math.exp(-q * T);
    let price;
    if (type === "call") {
      price = S * discQ * normCdf(d1) - K * discR * normCdf(d2);
    } else {
      price = K * discR * normCdf(-d2) - S * discQ * normCdf(-d1);
    }
    const delta =
      type === "call"
        ? discQ * normCdf(d1)
        : discQ * (normCdf(d1) - 1);
    const gamma = (discQ * normPdf(d1)) / (S * sigSqrtT);
    const vega = S * discQ * normPdf(d1) * Math.sqrt(T);
    const thetaPerDay =
      type === "call"
        ? (-(S * discQ * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) -
            r * K * discR * normCdf(d2) +
            q * S * discQ * normCdf(d1)) /
          365
        : (-(S * discQ * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) +
            r * K * discR * normCdf(-d2) -
            q * S * discQ * normCdf(-d1)) /
          365;
    const rho = type === "call" ? K * T * discR * normCdf(d2) : -K * T * discR * normCdf(-d2);
    return { price, delta, gamma, theta: thetaPerDay, vega: vega / 100, rho: rho / 100 };
  }

  /** 연 1회 쿠폰, 액면 상환 */
  function bondPriceFromYield(F, c, n, y) {
    if (n <= 0 || F <= 0) throw new Error("액면·잔존년수를 확인하세요.");
    const coupon = F * c;
    let pv = 0;
    for (let t = 1; t <= n; t++) {
      pv += coupon / Math.pow(1 + y, t);
    }
    pv += F / Math.pow(1 + y, n);
    return pv;
  }

  function bondPriceDerivative(F, c, n, y) {
    const coupon = F * c;
    let d = 0;
    for (let t = 1; t <= n; t++) {
      d -= (t * coupon) / Math.pow(1 + y, t + 1);
    }
    d -= (n * F) / Math.pow(1 + y, n + 1);
    return d;
  }

  function bondYtm(F, c, n, P, y0 = 0.05) {
    if (P <= 0) throw new Error("가격은 양수여야 합니다.");
    let y = y0;
    for (let i = 0; i < 80; i++) {
      const f = bondPriceFromYield(F, c, n, y) - P;
      if (Math.abs(f) < 1e-10) return y;
      const df = bondPriceDerivative(F, c, n, y);
      if (Math.abs(df) < 1e-14) break;
      const step = f / df;
      y -= step;
      if (y < -0.99) y = -0.5;
      if (y > 10) y = 5;
    }
    return y;
  }

  function macaulayDuration(F, c, n, y) {
    const coupon = F * c;
    let weighted = 0;
    let pv = 0;
    for (let t = 1; t <= n; t++) {
      const pvt = coupon / Math.pow(1 + y, t);
      weighted += t * pvt;
      pv += pvt;
    }
    const pvn = F / Math.pow(1 + y, n);
    weighted += n * pvn;
    pv += pvn;
    return weighted / pv;
  }

  function modifiedDuration(F, c, n, y) {
    const d = macaulayDuration(F, c, n, y);
    return d / (1 + y);
  }

  function npv(rate, cfs) {
    if (cfs.length === 0) throw new Error("현금흐름이 없습니다.");
    let v = 0;
    for (let t = 0; t < cfs.length; t++) {
      v += cfs[t] / Math.pow(1 + rate, t);
    }
    return v;
  }

  function npvDerivative(rate, cfs) {
    let d = 0;
    for (let t = 1; t < cfs.length; t++) {
      d -= (t * cfs[t]) / Math.pow(1 + rate, t + 1);
    }
    return d;
  }

  /** IRR: bisection on NPV */
  function irr(cfs, low = -0.9999, high = 10, maxIter = 200) {
    if (cfs.length < 2) throw new Error("IRR 계산을 위해 최소 2기간이 필요합니다.");
    let fLow = npv(low, cfs);
    let fHigh = npv(high, cfs);
    if (fLow * fHigh > 0) {
      high = 100;
      fHigh = npv(high, cfs);
      if (fLow * fHigh > 0) {
        throw new Error("구간 내 IRR을 찾지 못했습니다. 부호 변화를 확인하세요.");
      }
    }
    for (let i = 0; i < maxIter; i++) {
      const mid = (low + high) / 2;
      const fm = npv(mid, cfs);
      if (Math.abs(fm) < 1e-12 || (high - low) < 1e-14) return mid;
      if (fLow * fm <= 0) {
        high = mid;
        fHigh = fm;
      } else {
        low = mid;
        fLow = fm;
      }
    }
    return (low + high) / 2;
  }

  function forwardPrice(S0, T, r, b) {
    if (T < 0 || S0 <= 0) throw new Error("S₀, T를 확인하세요.");
    return S0 * Math.exp((r - b) * T);
  }

  return {
    blackScholes,
    bondPriceFromYield,
    bondYtm,
    macaulayDuration,
    modifiedDuration,
    npv,
    irr,
    forwardPrice,
  };
})();
