// ============================================
// SHOPEE MUSIC CALCULATOR — 3 MODES
//
// RUMUS DASAR:
//   potongan  = hargaJual × totalPct% + biayaProses
//   diterima  = hargaJual - potongan
//   profit    = diterima - hpp
//
// MODE 1 — CARI HARGA JUAL (HPP + Margin %):
//   margin% = profit / hpp × 100
//   profit  = hpp × margin% / 100
//   diterima = hpp + profit = hpp × (1 + margin/100)
//   hargaJual = (diterima + biayaProses) / (1 - totalPct/100)
//
// MODE 2 — CARI NET PROFIT (HPP + Target Profit Rp):
//   profit  = targetProfit
//   diterima = hpp + targetProfit
//   hargaJual = (diterima + biayaProses) / (1 - totalPct/100)
//
// MODE 3 — DANA DITERIMA (HPP + Target Diterima Rp):
//   diterima = targetDiterima
//   hargaJual = (targetDiterima + biayaProses) / (1 - totalPct/100)
//   profit = targetDiterima - hpp
// ============================================

let currentMode = 'harga';
let currentTier = 'non-star';
const TIER_ADMIN = { 'non-star': 9.50, 'mall': 7.70 };

// --- Utilities ---
function parseRp(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtRp(num) {
    const r = Math.round(num);
    if (isNaN(r)) return 'Rp 0';
    return (r < 0 ? '-Rp ' : 'Rp ') + Math.abs(r).toLocaleString('id-ID');
}

function fmtThousands(val) {
    let digits = val.replace(/[^\d]/g, '');
    if (!digits) return '';
    digits = digits.replace(/^0+/, '') || '0';
    return parseInt(digits, 10).toLocaleString('id-ID');
}

function formatAndRecalculate(el) {
    const pos = el.selectionStart;
    const oldLen = el.value.length;
    el.value = fmtThousands(el.value);
    const diff = el.value.length - oldLen;
    el.setSelectionRange(Math.max(0, pos + diff), Math.max(0, pos + diff));
    recalculate();
}

// --- Fees ---
function getFees() {
    return {
        admin:   parseRp(document.getElementById('biayaAdmin').value),
        layanan: parseRp(document.getElementById('biayaLayanan').value),
        ams:     parseRp(document.getElementById('biayaAMS').value),
        gox:     parseRp(document.getElementById('biayaGOX').value),
        proses:  parseRp(document.getElementById('biayaProses').value)
    };
}

function totalPct(f) { return f.admin + f.layanan + f.ams + f.gox; }

function calcBreakdown(hargaJual, fees) {
    const bAdmin   = hargaJual * fees.admin / 100;
    const bLayanan = hargaJual * fees.layanan / 100;
    const bAMS     = hargaJual * fees.ams / 100;
    const bGOX     = hargaJual * fees.gox / 100;
    const bProses  = fees.proses;
    const totalPot = bAdmin + bLayanan + bAMS + bGOX + bProses;
    const diterima = hargaJual - totalPot;
    return { hargaJual, bAdmin, bLayanan, bAMS, bGOX, bProses, totalPot, diterima };
}

// Dari target diterima → harga jual
function hargaJualDari(targetDiterima, fees) {
    const denom = 1 - totalPct(fees) / 100;
    if (denom <= 0) return null;
    return Math.ceil((targetDiterima + fees.proses) / denom);
}

// --- Tier ---
function setTier(tier) {
    currentTier = tier;
    document.querySelectorAll('.tier-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tier === tier));
    document.getElementById('biayaAdmin').value = TIER_ADMIN[tier].toFixed(2).replace('.', ',');
    recalculate();
}

// --- Mode ---
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.mode === mode));

    document.getElementById('inputsHarga').classList.toggle('hidden', mode !== 'harga');
    document.getElementById('inputsProfit').classList.toggle('hidden', mode !== 'profit');
    document.getElementById('inputsTerima').classList.toggle('hidden', mode !== 'terima');

    const t = document.getElementById('cardTitle');
    const d = document.getElementById('cardDesc');
    if (mode === 'harga') {
        t.textContent = 'Cari Harga Jual Aman';
        d.textContent = 'Masukkan HPP dan target margin (%). Margin = profit / HPP. Contoh: 100% artinya profit = HPP.';
    } else if (mode === 'profit') {
        t.textContent = 'Cari Harga Jual dari Target Profit';
        d.textContent = 'Masukkan HPP dan target net profit (Rp). Kalkulator menghitung harga jual yang diperlukan.';
    } else {
        t.textContent = 'Cari Harga Jual dari Target Dana Diterima';
        d.textContent = 'Masukkan HPP dan target dana yang ingin diterima (Rp). Kalkulator menghitung harga jual yang diperlukan.';
    }

    document.getElementById('resultCard').style.display = 'none';
    recalculate();
}

// --- Main ---
function recalculate() {
    const fees = getFees();
    const tp = totalPct(fees);

    document.getElementById('totalFeePercent').textContent = tp.toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');

    let hpp, profit, hargaJual, diterima, bd;

    // ===== MODE 1: HPP + MARGIN % =====
    if (currentMode === 'harga') {
        hpp = parseRp(document.getElementById('hppForHarga').value);
        const margin = parseFloat(document.getElementById('marginPct').value) || 0;
        if (hpp <= 0) { hide(); return; }

        // profit = hpp × margin / 100
        profit = hpp * margin / 100;
        // diterima harus = hpp + profit
        diterima = hpp + profit;
        hargaJual = hargaJualDari(diterima, fees);
        if (!hargaJual) { hide(); return; }

        bd = calcBreakdown(hargaJual, fees);
        profit = bd.diterima - hpp; // recalc exact dari rounding

        show();
        setResult('Harga Jual Aman', 'Harga Jual Minimum', fmtRp(hargaJual),
            `Margin ${margin}% → Profit ${fmtRp(profit)} dari HPP ${fmtRp(hpp)}`, '');

        setSummary('HPP', fmtRp(hpp), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima', fmtRp(bd.diterima), '',
            'Net Profit', fmtRp(profit), 'profit', true);

    // ===== MODE 2: HPP + TARGET PROFIT Rp =====
    } else if (currentMode === 'profit') {
        hpp = parseRp(document.getElementById('hppForProfit').value);
        const targetProfit = parseRp(document.getElementById('profitTarget').value);
        if (hpp <= 0 && targetProfit <= 0) { hide(); return; }

        // diterima = hpp + targetProfit
        diterima = hpp + targetProfit;
        hargaJual = hargaJualDari(diterima, fees);
        if (!hargaJual) { hide(); return; }

        bd = calcBreakdown(hargaJual, fees);
        profit = bd.diterima - hpp;
        const pctMarkup = hpp > 0 ? ((profit / hpp) * 100).toFixed(1).replace('.', ',') + '%' : '-';

        show();
        setResult('Harga Jual yang Diperlukan', 'Harga Jual Minimum', fmtRp(hargaJual),
            `Profit ${fmtRp(profit)} (markup ${pctMarkup})`, '');

        setSummary('HPP', fmtRp(hpp), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima', fmtRp(bd.diterima), '',
            'Net Profit', fmtRp(profit), 'profit', true);

    // ===== MODE 3: HPP + TARGET DANA DITERIMA Rp =====
    } else {
        hpp = parseRp(document.getElementById('hppForTerima').value);
        const targetDiterima = parseRp(document.getElementById('targetDiterima').value);
        if (targetDiterima <= 0) { hide(); return; }

        hargaJual = hargaJualDari(targetDiterima, fees);
        if (!hargaJual) { hide(); return; }

        bd = calcBreakdown(hargaJual, fees);
        diterima = bd.diterima;
        profit = diterima - hpp;

        show();
        setResult('Harga Jual yang Diperlukan', 'Harga Jual Minimum', fmtRp(hargaJual),
            `Dana diterima ${fmtRp(diterima)}, profit ${fmtRp(profit)}`, '');

        setSummary('HPP', fmtRp(hpp), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima', fmtRp(diterima), 'profit',
            'Net Profit', fmtRp(profit), profit >= 0 ? 'profit' : 'deduction', true);
    }

    // --- Breakdown ---
    fillBreakdown(bd, fees);

    // --- Visual bar ---
    if (bd && bd.hargaJual > 0 && hpp > 0) {
        const hj = bd.hargaJual;
        const p = Math.max(0, hj - hpp - bd.totalPot);
        document.getElementById('barHPP').style.width = (hpp / hj * 100) + '%';
        document.getElementById('barFee').style.width = (bd.totalPot / hj * 100) + '%';
        document.getElementById('barProfit').style.width = (p / hj * 100) + '%';
        document.getElementById('visualSection').style.display = '';
    } else {
        document.getElementById('visualSection').style.display = 'none';
    }
}

// --- UI Helpers ---
function show() { document.getElementById('resultCard').style.display = 'block'; }
function hide() { document.getElementById('resultCard').style.display = 'none'; }

function setResult(title, label, value, note, negClass) {
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('bigLabel').textContent = label;
    document.getElementById('bigValue').textContent = value;
    document.getElementById('bigValue').className = 'big-value ' + (negClass || '');
    document.getElementById('bigNote').textContent = note;
    document.getElementById('bigResult').className = 'big-result' + (negClass === 'negative' ? ' big-negative' : '');
}

function setSummary(l1, v1, c1, l2, v2, c2, l3, v3, c3, l4, v4, c4, hl4) {
    for (let i = 0; i < 4; i++) {
        document.getElementById('sumLabel' + (i + 1)).textContent = arguments[i * 3];
        document.getElementById('sumValue' + (i + 1)).textContent = arguments[i * 3 + 1];
        document.getElementById('sumValue' + (i + 1)).className = 'summary-value ' + (arguments[i * 3 + 2] || '');
    }
    document.getElementById('sumItem4').className = 'summary-item' + (hl4 ? ' highlight-item' : '');
}

function fillBreakdown(bd, fees) {
    if (!bd) return;
    document.getElementById('brkAdminPct').textContent = `(${fees.admin.toFixed(2).replace('.', ',')}%)`;
    document.getElementById('brkLayananPct').textContent = `(${fees.layanan.toFixed(2).replace('.', ',')}%)`;
    document.getElementById('brkAMSPct').textContent = `(${fees.ams.toFixed(2).replace('.', ',')}%)`;
    document.getElementById('brkGOXPct').textContent = `(${fees.gox.toFixed(2).replace('.', ',')}%)`;
    document.getElementById('brkAdmin').textContent = fmtRp(bd.bAdmin);
    document.getElementById('brkLayanan').textContent = fmtRp(bd.bLayanan);
    document.getElementById('brkAMS').textContent = fmtRp(bd.bAMS);
    document.getElementById('brkGOX').textContent = fmtRp(bd.bGOX);
    document.getElementById('brkProses').textContent = fmtRp(bd.bProses);
    document.getElementById('brkTotal').textContent = fmtRp(bd.totalPot);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    const fees = getFees();
    document.getElementById('totalFeePercent').textContent = totalPct(fees).toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');
});
