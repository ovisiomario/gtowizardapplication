import { runSimulation as runSimulationCore } from "./simulation.js";
import { buildTournamentModel } from "./payoutStructures.js";
import {
  searchTournaments,
  getTournamentById,
  feePercent,
  minFieldForGuarantee,
  SPEED_LABELS,
  getFieldProfile,
  getSpeedRoiImpact,
} from "./tournaments.js";

const els = {
  search: document.getElementById("search"),
  tournamentList: document.getElementById("tournamentList"),
  tournamentDetail: document.getElementById("tournamentDetail"),
  payoutPreview: document.getElementById("payoutPreview"),
  roi: document.getElementById("roi"),
  roiManual: document.getElementById("roiManual"),
  roiSliderWrap: document.getElementById("roiSliderWrap"),
  roiManualWrap: document.getElementById("roiManualWrap"),
  roiBackToSlider: document.getElementById("roiBackToSlider"),
  tournaments: document.getElementById("tournaments"),
  bankroll: document.getElementById("bankroll"),
  bankrollManual: document.getElementById("bankrollManual"),
  bankrollSliderWrap: document.getElementById("bankrollSliderWrap"),
  bankrollManualWrap: document.getElementById("bankrollManualWrap"),
  bankrollBackToSlider: document.getElementById("bankrollBackToSlider"),
  bankrollHint: document.getElementById("bankrollHint"),
  roiVal: document.getElementById("roiVal"),
  tournamentsVal: document.getElementById("tournamentsVal"),
  tournamentsHint: document.getElementById("tournamentsHint"),
  bankrollVal: document.getElementById("bankrollVal"),
  statDown: document.getElementById("statDown"),
  statEV: document.getElementById("statEV"),
  statRuin: document.getElementById("statRuin"),
  statMinBR: document.getElementById("statMinBR"),
  insight: document.getElementById("insight"),
  resultsBreakdown: document.getElementById("resultsBreakdown"),
  chartDesc: document.getElementById("chartDesc"),
};

let selectedId = "ggmasters-150";
let pathsChart = null;
let debounceTimer = null;

function fmtMoney(n, decimals = 0) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtPct(n) {
  return `${n.toFixed(1)}%`;
}

function fmtGtd(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M GTD`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k GTD`;
  return `${fmtMoney(n)} GTD`;
}

function fmtNum(n) {
  return n.toLocaleString();
}

let roiManualMode = false;
let bankrollManualMode = false;
const ROI_SLIDER_MAX = 50;
const BANKROLL_SLIDER_MAX = 50000;

function fmtBuyIns(dollars, buyInTotal) {
  const count = dollars / buyInTotal;
  const rounded = Math.round(count * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} buy-ins` : `${rounded} buy-ins`;
}

function getBankrollDollars() {
  if (bankrollManualMode) return Number(els.bankrollManual.value) || 50500;
  return Number(els.bankroll.value);
}

function updateBankrollUI() {
  const dollars = bankrollManualMode ? Number(els.bankrollManual.value) : Number(els.bankroll.value);
  els.bankrollVal.textContent = fmtMoney(dollars);

  if (bankrollManualMode) {
    els.bankrollManualWrap.hidden = false;
    return;
  }
  els.bankrollManualWrap.hidden = dollars < BANKROLL_SLIDER_MAX;
}

function onBankrollSliderInput() {
  const val = Number(els.bankroll.value);
  if (val < BANKROLL_SLIDER_MAX) {
    bankrollManualMode = false;
  }
  updateBankrollUI();
  onControlInput();
}

function onBankrollManualInput() {
  bankrollManualMode = true;
  els.bankroll.value = String(BANKROLL_SLIDER_MAX);
  updateBankrollUI();
  onControlInput();
}

function onBankrollBackToSlider() {
  bankrollManualMode = false;
  els.bankroll.value = String(BANKROLL_SLIDER_MAX - 500);
  updateBankrollUI();
  onControlInput();
}

function getRoiPercent() {
  if (roiManualMode) return Number(els.roiManual.value) || 51;
  return Number(els.roi.value);
}

function updateRoiDisplay() {
  const roi = getRoiPercent();
  els.roiVal.textContent = `${roi}%`;
  els.roiVal.classList.toggle("field__value--bad", roi < 0);
  els.roiVal.classList.toggle("field__value--good", roi >= 15);
  if (roi >= 0 && roi < 15) {
    els.roiVal.classList.remove("field__value--bad", "field__value--good");
  }
}

function updateRoiSliderUI() {
  const val = Number(els.roi.value);
  els.roiSliderWrap.classList.toggle("roi-slider-wrap--negative", val < 0);
  els.roiSliderWrap.classList.toggle("roi-slider-wrap--positive", val >= 15);

  if (roiManualMode) {
    els.roiManualWrap.hidden = false;
    return;
  }

  els.roiManualWrap.hidden = val < ROI_SLIDER_MAX;
}

function onRoiSliderInput() {
  const val = Number(els.roi.value);
  if (val < ROI_SLIDER_MAX) {
    roiManualMode = false;
  }
  updateRoiSliderUI();
  onControlInput();
}

function onRoiManualInput() {
  roiManualMode = true;
  els.roi.value = String(ROI_SLIDER_MAX);
  updateRoiSliderUI();
  onControlInput();
}

function onRoiBackToSlider() {
  roiManualMode = false;
  els.roi.value = String(ROI_SLIDER_MAX - 1);
  updateRoiSliderUI();
  onControlInput();
}

function renderTournamentList(query = "") {
  const items = searchTournaments(query);
  els.tournamentList.innerHTML = items
    .map((t) => {
      const profile = getFieldProfile(t.typicalField);
      return `
    <li>
      <button type="button" class="tournament-item ${t.id === selectedId ? "tournament-item--active" : ""}" data-id="${t.id}">
        <span class="tournament-item__main">
          <span class="tournament-item__name">${t.name}</span>
          <span class="tournament-item__meta">
            <span class="speed-tag speed-tag--${t.speed}">${SPEED_LABELS[t.speed]}</span>
            <span class="variance-tag variance-tag--${profile.level}">${profile.shortLabel}</span>
            <span class="tournament-item__gtd">${fmtGtd(t.guarantee)}</span>
          </span>
        </span>
        <span class="tournament-item__price">${fmtMoney(t.buyInTotal)}</span>
      </button>
    </li>`;
    })
    .join("");

  els.tournamentList.querySelectorAll(".tournament-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedId = btn.dataset.id;
      renderTournamentList(els.search.value);
      onControlInput();
    });
  });
}

function renderTournamentDetail(tournament, model) {
  const feePct = feePercent(tournament);
  const minField = minFieldForGuarantee(tournament);
  const profile = getFieldProfile(tournament.typicalField);
  const speedImpact = getSpeedRoiImpact(tournament.speed);

  els.tournamentDetail.innerHTML = `
    <div class="detail-card">
      <div class="detail-card__head">
        <h3>${tournament.name}</h3>
        <div class="detail-badges">
          <span class="badge">Freezeout</span>
          <span class="speed-tag speed-tag--${tournament.speed}">${SPEED_LABELS[tournament.speed]}</span>
          <span class="variance-tag variance-tag--${profile.level}">${profile.label}</span>
        </div>
      </div>
      <p class="detail-variance">${profile.description}</p>
      <div class="detail-speed">
        <strong>${speedImpact.headline}</strong>
        <span class="detail-speed__tag">${speedImpact.roiEffect}</span>
        <p>${speedImpact.description}</p>
      </div>
      <dl class="detail-grid">
        <div><dt>Buy-in</dt><dd>${fmtMoney(tournament.poolEntry)} + ${fmtMoney(tournament.fee)} fee</dd></div>
        <div><dt>Total cost</dt><dd>${fmtMoney(tournament.buyInTotal)}</dd></div>
        <div><dt>Fee</dt><dd>${feePct.toFixed(1)}%</dd></div>
        <div><dt>GTD</dt><dd>${fmtMoney(tournament.guarantee)}</dd></div>
        <div><dt>Typical field</dt><dd>${fmtNum(tournament.typicalField)}</dd></div>
        <div><dt>Min field (GTD)</dt><dd>${fmtNum(minField)}</dd></div>
        <div><dt>ITM</dt><dd>${model.placesPaid} (${tournament.placesPaidPct}%)</dd></div>
        <div><dt>Schedule</dt><dd>${tournament.schedule}</dd></div>
      </dl>
      <p class="detail-note">
        Prize pool (typical field): ${fmtMoney(model.prizePool)} ·
        1st: ${fmtMoney(model.payouts[0])} (${model.firstPlacePct.toFixed(1)}%) ·
        Min-cash: ${fmtMoney(model.minCash)}
      </p>
    </div>
  `;
}

function renderPayoutPreview(model) {
  const top = model.payouts.slice(0, 5);
  const bottom = model.payouts.slice(-3);
  const rows = [
    ...top.map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${fmtMoney(p)}</td><td>${fmtPct((p / model.prizePool) * 100)}</td></tr>`
    ),
    model.payouts.length > 8 ? `<tr><td colspan="3" class="payout-ellipsis">…</td></tr>` : "",
    ...bottom.map((p, i) => {
      const place = model.placesPaid - bottom.length + i + 1;
      return `<tr><td>${place}</td><td>${fmtMoney(p)}</td><td>${fmtPct((p / model.prizePool) * 100)}</td></tr>`;
    }),
  ].join("");

  els.payoutPreview.innerHTML = `
    <table class="payout-table">
      <thead><tr><th>Place</th><th>Prize</th><th>% pool</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function readParams() {
  const tournament = getTournamentById(selectedId);
  const model = buildTournamentModel(tournament);

  return {
    tournament,
    model,
    roiPercent: getRoiPercent(),
    numTournaments: Number(els.tournaments.value),
    numSamples: 5000,
    startingBankroll: getBankrollDollars(),
  };
}

function buildResultsBreakdown(result, params) {
  const { tournament, numTournaments, roiPercent } = params;
  const startingBankroll = getBankrollDollars();
  const buyInsLabel = fmtBuyIns(startingBankroll, tournament.buyInTotal);
  const minBuyInsLabel = fmtBuyIns(result.minBankrollDollars, tournament.buyInTotal);
  const {
    stillDownPct,
    profitablePct,
    expectedProfit,
    medianProfit,
    p10Profit,
    p90Profit,
    bestProfit,
    worstProfit,
    ruinPct,
    numSamples,
  } = result;

  const evGap = expectedProfit - medianProfit;
  const skewNote =
    evGap > expectedProfit * 0.3
      ? `Your median is well below EV because MTT results are skewed — a few deep runs pull the average up, but most sessions feel worse than your true ${roiPercent}% ROI. This doesn't mean you're running bad; it means ${fmtNum(numTournaments)} tournaments isn't enough volume yet. Put in more games over time and your actual results should drift closer to EV.`
      : evGap > 0
        ? `Median below EV is normal in MTTs. Over ${fmtNum(numTournaments)} events, luck still dominates — increase volume if you want results to track closer to your ${roiPercent}% ROI.`
        : "Median close to EV — at this field size and volume, outcomes are relatively stable.";

  return `
    <h3 class="results-breakdown__title">Understanding your results</h3>
    <div class="outcome-grid">
      <div class="outcome-card outcome-card--bad">
        <span class="outcome-card__label">Bad run (10th percentile)</span>
        <span class="outcome-card__value">${fmtMoney(p10Profit)}</span>
        <span class="outcome-card__hint">Only 10% of runs did worse than this</span>
      </div>
      <div class="outcome-card outcome-card--mid">
        <span class="outcome-card__label">Typical run (median)</span>
        <span class="outcome-card__value">${fmtMoney(medianProfit)}</span>
        <span class="outcome-card__hint">Half of all runs finish above, half below</span>
      </div>
      <div class="outcome-card outcome-card--good">
        <span class="outcome-card__label">Good run (90th percentile)</span>
        <span class="outcome-card__value">${fmtMoney(p90Profit)}</span>
        <span class="outcome-card__hint">Only 10% of runs did better than this</span>
      </div>
    </div>
    <ul class="results-list">
      <li>
        <strong>${fmtPct(stillDownPct)} still down</strong> — out of ${fmtNum(numSamples)} simulated samples of ${numTournaments} tournaments,
        ${fmtPct(stillDownPct)} ended losing money. Even at ${roiPercent}% ROI, losing over ${fmtNum(numTournaments)} tournaments is normal — increase volume to get closer to EV.
      </li>
      <li>
        <strong>EV ${fmtMoney(expectedProfit)} vs median ${fmtMoney(medianProfit)}</strong> — ${skewNote}
      </li>
      <li>
        <strong>${fmtPct(profitablePct)} finish in profit</strong> — range observed: ${fmtMoney(worstProfit)} (worst) to ${fmtMoney(bestProfit)} (best).
      </li>
      <li>
        <strong>Bankroll check</strong> — with ${fmtMoney(startingBankroll)} (${buyInsLabel}) in ${tournament.name},
        bust risk is ${fmtPct(ruinPct)}. For &lt;5% bust over this sample, you'd want ~${fmtMoney(result.minBankrollDollars)} (${minBuyInsLabel}).
      </li>
    </ul>
  `;
}

function buildInsight(result, params) {
  const { stillDownPct, ruinPct, minBankrollDollars, expectedProfit, medianProfit } = result;
  const { tournament, model, numTournaments, roiPercent } = params;
  const startingBankroll = getBankrollDollars();
  const buyInsLabel = fmtBuyIns(startingBankroll, tournament.buyInTotal);
  const minBuyInsLabel = fmtBuyIns(minBankrollDollars, tournament.buyInTotal);
  const profile = getFieldProfile(tournament.typicalField);
  const name = `${tournament.name} (${fmtMoney(tournament.buyInTotal)})`;
  const minBrDollars = fmtMoney(minBankrollDollars);

  if (profile.level === "high" && stillDownPct > 40) {
    return `<strong>${name}</strong> has a ${fmtNum(tournament.typicalField)}-player field — extreme variance. Even at ${roiPercent}% ROI, there's a <strong>${fmtPct(stillDownPct)}</strong> chance you're still down after ${numTournaments} tournaments. You need high volume and a large bankroll for this format to make sense.`;
  }

  if (stillDownPct > 25) {
    return `Over ${numTournaments} <strong>${name}</strong> events at ${roiPercent}% ROI, there's still a <strong>${fmtPct(stillDownPct)}</strong> chance of being down. That's normal — ${profile.shortLabel.toLowerCase()}. Increase your sample or drop stakes/field size if you need results sooner.`;
  }

  if (ruinPct > 8) {
    return `With ${fmtMoney(startingBankroll)} (${buyInsLabel}) in <strong>${name}</strong>, your bust risk is <strong>${fmtPct(ruinPct)}</strong>. For &lt;5% bust risk, you need ~${minBuyInsLabel} (${minBrDollars}). ${profile.level === "high" ? "Large fields require a heavy roll." : "Consider smaller fields if your bankroll is tight."}`;
  }

  if (profile.level === "low") {
    return `<strong>${name}</strong> — ~${fmtNum(tournament.typicalField)} players: ${profile.shortLabel.toLowerCase()}. EV ${fmtMoney(expectedProfit)} over ${numTournaments} tournaments, but the actual median could be ${fmtMoney(medianProfit)} — variance still matters.`;
  }

  return `<strong>${name}</strong> · ${fmtNum(model.fieldSize)}-player field · EV ${fmtMoney(expectedProfit)} over ${numTournaments} events. ${profile.description}`;
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: {
        labels: { color: "#8888a0", boxWidth: 12, font: { size: 11 } },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Tournaments", color: "#8888a0", font: { size: 11 } },
        ticks: { color: "#8888a0", maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        title: { display: true, text: "Cumulative profit", color: "#8888a0", font: { size: 11 } },
        ticks: { color: "#8888a0", callback: (v) => `$${v}` },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };
}

function renderPathsChart(result) {
  const labels = Array.from({ length: result.numTournaments + 1 }, (_, i) => i);
  const { bands, expectedProfit, numTournaments } = result;

  const evLine = labels.map((t) => (expectedProfit / numTournaments) * t);
  const upper = bands.map((b) => b.p85);
  const lower = bands.map((b) => b.p15);
  const median = bands.map((b) => b.p50);

  const datasets = [
    {
      label: "70% of runs",
      data: upper,
      borderColor: "rgba(139, 92, 246, 0.4)",
      backgroundColor: "rgba(139, 92, 246, 0.18)",
      fill: "+1",
      pointRadius: 0,
      borderWidth: 1,
      tension: 0.2,
      order: 4,
    },
    {
      label: "_lower",
      data: lower,
      borderColor: "transparent",
      backgroundColor: "transparent",
      pointRadius: 0,
      borderWidth: 0,
      tension: 0.2,
      order: 5,
    },
    {
      label: "Expected EV",
      data: evLine,
      borderColor: "rgba(34, 197, 94, 0.7)",
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
      order: 2,
    },
    {
      label: "Median path",
      data: median,
      borderColor: "#fbbf24",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.2,
      order: 1,
    },
    {
      label: "Best run",
      data: result.bestPath,
      borderColor: "rgba(34, 197, 94, 0.9)",
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.15,
      order: 3,
    },
    {
      label: "Worst run",
      data: result.worstPath,
      borderColor: "rgba(239, 68, 68, 0.9)",
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.15,
      order: 3,
    },
  ];

  if (pathsChart) pathsChart.destroy();
  pathsChart = new Chart(document.getElementById("pathsChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      ...chartDefaults(),
      interaction: { mode: "index", intersect: false },
      plugins: {
        ...chartDefaults().plugins,
        legend: {
          display: true,
          labels: {
            color: "#8888a0",
            filter: (item) => !item.text.startsWith("_"),
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              if (ctx.dataset.label.startsWith("_")) return null;
              return `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}`;
            },
          },
        },
      },
    },
  });
}

function updateControlLabels() {
  updateRoiDisplay();
  updateRoiSliderUI();
  updateBankrollUI();
  const numTournaments = Number(els.tournaments.value);
  els.tournamentsVal.textContent = fmtNum(numTournaments);
  const tournament = getTournamentById(selectedId);
  const roiPercent = getRoiPercent();
  const startingBankroll = getBankrollDollars();
  const buyInsLabel = fmtBuyIns(startingBankroll, tournament.buyInTotal);
  const totalBuyIns = numTournaments * tournament.buyInTotal;
  const expectedEV = (roiPercent / 100) * tournament.buyInTotal * numTournaments;
  els.statEV.textContent = fmtMoney(expectedEV);
  els.statEV.className = `stat__value ${expectedEV >= 0 ? "stat__value--good" : "stat__value--bad"}`;

  els.bankrollHint.textContent = `${buyInsLabel} at ${fmtMoney(tournament.buyInTotal)} per entry`;

  els.tournamentsHint.textContent =
    `Plays ${fmtNum(numTournaments)} × ${fmtMoney(tournament.buyInTotal)} = ${fmtMoney(totalBuyIns)} in buy-ins. ` +
    `At ${roiPercent}% ROI → EV ${fmtMoney(expectedEV)}. ` +
    `More volume = longer chart & higher bust risk if you're losing.`;
}

function runSimulation() {
  const { tournament, model, roiPercent, numTournaments, numSamples, startingBankroll } =
    readParams();

  renderTournamentDetail(tournament, model);
  renderPayoutPreview(model);

  const result = runSimulationCore({
    totalBuyIn: tournament.buyInTotal,
    fee: tournament.fee,
    poolEntry: tournament.poolEntry,
    fieldSize: model.fieldSize,
    placesPaid: model.placesPaid,
    payouts: model.payouts,
    roiPercent,
    numTournaments,
    numSamples,
    startingBankroll,
  });

  els.statDown.textContent = fmtPct(result.stillDownPct);
  els.statDown.className = `stat__value ${result.stillDownPct > 25 ? "stat__value--bad" : ""}`;

  els.statEV.textContent = fmtMoney(result.expectedProfit);
  els.statEV.className = `stat__value ${result.expectedProfit >= 0 ? "stat__value--good" : "stat__value--bad"}`;

  els.statRuin.textContent = fmtPct(result.ruinPct);
  els.statRuin.className = `stat__value ${result.ruinPct > 5 ? "stat__value--bad" : "stat__value--good"}`;

  els.statMinBR.textContent = fmtMoney(result.minBankrollDollars);

  els.insight.innerHTML = buildInsight(result, {
    tournament,
    model,
    numTournaments,
    roiPercent,
  });

  els.resultsBreakdown.innerHTML = buildResultsBreakdown(result, {
    tournament,
    numTournaments,
    roiPercent,
  });

  renderPathsChart(result);
}

function run() {
  updateControlLabels();
  runSimulation();
}

function scheduleSimulation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSimulation, 200);
}

function onControlInput() {
  updateControlLabels();
  scheduleSimulation();
}

els.search.addEventListener("input", () => renderTournamentList(els.search.value));
els.roi.addEventListener("input", onRoiSliderInput);
els.roiManual.addEventListener("input", onRoiManualInput);
els.roiBackToSlider.addEventListener("click", onRoiBackToSlider);
els.bankroll.addEventListener("input", onBankrollSliderInput);
els.bankrollManual.addEventListener("input", onBankrollManualInput);
els.bankrollBackToSlider.addEventListener("click", onBankrollBackToSlider);
els.tournaments.addEventListener("input", onControlInput);

renderTournamentList();
updateRoiSliderUI();
updateBankrollUI();
run();
