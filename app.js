// ============================================
// SHOPEE MUSIC CALCULATOR — 3 MODES
//
// RUMUS DASAR SHOPEE:
//   totalPct    = admin% + layanan% + ams% + gox%
//   potonganPct = hargaJual × (totalPct / 100)
//   potonganAll = potonganPct + biayaProses
//   diterima    = hargaJual - potonganAll
//   profit      = diterima - hpp
//
// MODE 1 — CARI HARGA JUAL:
//   Input:  HPP, targetProfit
//   Cari:   hargaJual
//   profit = diterima - hpp = targetProfit
//   diterima = hpp + targetProfit
//   diterima = hargaJual × (1 - totalPct/100) - biayaProses
//   hargaJual = (diterima + biayaProses) / (1 - totalPct/100)
//   hargaJual = (hpp + targetProfit + biayaProses) / (1 - totalPct/100)
//
// MODE 2 — CARI NET PROFIT:
//   Input:  hargaJual, HPP
//   Cari:   profit
//   diterima = hargaJual × (1 - totalPct/100) - biayaProses
//   profit = diterima - hpp
//
// MODE 3 — DANA DITERIMA:
//   Input:  HPP, targetDiterima
//   Cari:   hargaJual (supaya diterima = targetDiterima)
//   diterima = hargaJual × (1 - totalPct/100) - biayaProses = targetDiterima
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

// --- Fee helpers ---
function getFees() {
    return {
        admin:   parseRp(document.getElementById('biayaAdmin').value),
        layanan: parseRp(document.getElementById('biayaLayanan').value),
        ams:     parseRp(document.getElementById('biayaAMS').value),
        gox:     parseRp(document.getElementById('biayaGOX').value),
        proses:  parseRp(document.getElementById('biayaProses').value)
    };
}

function totalPct(f) {
    return f.admin + f.layanan + f.ams + f.gox;
}

// Hitung semua potongan dari hargaJual
function breakdown(hargaJual, fees) {
    const bAdmin   = hargaJual * fees.admin / 100;
    const bLayanan = hargaJual * fees.layanan / 100;
    const bAMS     = hargaJual * fees.ams / 100;
    const bGOX     = hargaJual * fees.gox / 100;
    const bProses  = fees.proses;
    const totalPot = bAdmin + bLayanan + bAMS + bGOX + bProses;
    const diterima = hargaJual - totalPot;
    return { hargaJual, bAdmin, bLayanan, bAMS, bGOX, bProses, totalPot, diterima };
}

// --- Tier ---
function setTier(tier) {
    currentTier = tier;
    document.querySelectorAll('.tier-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tier === tier));
    document.getElementById('biayaAdmin').value =
        TIER_ADMIN[tier].toFixed(2).replace('.', ',');
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
        d.textContent = 'Masukkan HPP dan target profit (Rp). Kalkulator menghitung harga jual minimum agar profit tercapai.';
    } else if (mode === 'profit') {
        t.textContent = 'Cari Net Profit';
        d.textContent = 'Masukkan harga jual dan HPP. Kalkulator menghitung profit bersih setelah semua potongan Shopee.';
    } else {
        t.textContent = 'Target Dana Diterima';
        d.textContent = 'Masukkan HPP dan dana yang ingin diterima. Kalkulator menghitung harga jual yang diperlukan.';
    }

    document.getElementById('resultCard').style.display = 'none';
    recalculate();
}

// --- Main Recalculate ---
function recalculate() {
    const fees = getFees();
    const tp = totalPct(fees);
    const tpFrac = tp / 100; // 0.2175

    // Update fee display
    document.getElementById('totalFeePercent').textContent =
        tp.toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent =
        fees.proses.toLocaleString('id-ID');

    let bd, hpp, profit, hargaJual, diterima;

    // ========== MODE 1: CARI HARGA JUAL ==========
    if (currentMode === 'harga') {
        hpp = parseRp(document.getElementById('hppForHarga').value);
        const targetProfit = parseRp(document.getElementById('profitTarget').value);
        if (hpp <= 0 && targetProfit <= 0) { hide(); return; }

        // hargaJual = (hpp + targetProfit + biayaProses) / (1 - totalPct/100)
        const denom = 1 - tpFrac;
        if (denom <= 0) { hide(); return; }
        hargaJual = Math.ceil((hpp + targetProfit + fees.proses) / denom);

        bd = breakdown(hargaJual, fees);
        diterima = bd.diterima;
        profit = diterima - hpp;

        show();
        setResult('Harga Jual Aman', 'Harga Jual Minimum', fmtRp(hargaJual),
            `Profit ${fmtRp(profit)} dari HPP ${fmtRp(hpp)}`, '');

        setSummary(
            'HPP',            fmtRp(hpp), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima',  fmtRp(diterima), '',
            'Net Profit',     fmtRp(profit), 'profit',
            true
        );

    // ========== MODE 2: CARI NET PROFIT ==========
    } else if (currentMode === 'profit') {
        hargaJual = parseRp(document.getElementById('hargaForProfit').value);
        hpp = parseRp(document.getElementById('hppForProfit').value);
        if (hargaJual <= 0) { hide(); return; }

        bd = breakdown(hargaJual, fees);
        diterima = bd.diterima;
        profit = diterima - hpp;

        const pctMarkup = hpp > 0
            ? ((profit / hpp) * 100).toFixed(1).replace('.', ',') + '%'
            : '-';

        show();
        setResult('Net Profit', 'Net Profit Anda',
            fmtRp(profit),
            hpp > 0 ? `Markup ${pctMarkup} dari HPP` : '',
            profit >= 0 ? '' : 'negative'
        );

        setSummary(
            'Harga Jual',     fmtRp(hargaJual), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima',  fmtRp(diterima), '',
            'HPP',            '- ' + fmtRp(hpp), '',
            false
        );

    // ========== MODE 3: DANA DITERIMA ==========
    } else {
        hpp = parseRp(document.getElementById('hppForTerima').value);
        const targetDiterima = parseRp(document.getElementById('targetDiterima').value);
        if (targetDiterima <= 0) { hide(); return; }

        // hargaJual = (targetDiterima + biayaProses) / (1 - totalPct/100)
        const denom = 1 - tpFrac;
        if (denom <= 0) { hide(); return; }
        hargaJual = Math.ceil((targetDiterima + fees.proses) / denom);

        bd = breakdown(hargaJual, fees);
        diterima = bd.diterima;
        profit = diterima - hpp;

        show();
        setResult('Harga Jual yang Diperlukan', 'Harga Jual Minimum',
            fmtRp(hargaJual),
            `Dana diterima ${fmtRp(diterima)}, profit ${fmtRp(profit)}`, '');

        setSummary(
            'HPP',            fmtRp(hpp), '',
            'Total Potongan', '- ' + fmtRp(bd.totalPot), 'deduction',
            'Dana Diterima',  fmtRp(diterima), 'profit',
            'Net Profit',     fmtRp(profit), profit >= 0 ? 'profit' : 'deduction',
            true
        );
    }

    // --- Fill Breakdown ---
    fillBreakdown(bd, fees);

    // --- Visual Bar ---
    if (bd && bd.hargaJual > 0) {
        const hj = bd.hargaJual;
        const h = hpp || 0;
        const f = bd.totalPot;
        const p = Math.max(0, hj - h - f);
        document.getElementById('barHPP').style.width = (h / hj * 100) + '%';
        document.getElementById('barFee').style.width = (f / hj * 100) + '%';
        document.getElementById('barProfit').style.width = (p / hj * 100) + '%';
        document.getElementById('visualSection').style.display = h > 0 ? '' : 'none';
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
    document.getElementById('bigResult').className =
        'big-result' + (negClass === 'negative' ? ' big-negative' : '');
}

function setSummary(l1, v1, c1, l2, v2, c2, l3, v3, c3, l4, v4, c4, highlight4) {
    for (let i = 1; i <= 4; i++) {
        const l = arguments[(i - 1) * 3];
        const v = arguments[(i - 1) * 3 + 1];
        const c = arguments[(i - 1) * 3 + 2];
        document.getElementById('sumLabel' + i).textContent = l;
        document.getElementById('sumValue' + i).textContent = v;
        document.getElementById('sumValue' + i).className = 'summary-value ' + (c || '');
    }
    document.getElementById('sumItem4').className =
        'summary-item' + (highlight4 ? ' highlight-item' : '');
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
    document.getElementById('totalFeePercent').textContent =
        totalPct(fees).toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent =
        fees.proses.toLocaleString('id-ID');
});
