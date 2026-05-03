// ============================================
// SHOPEE MUSIC CALCULATOR — 3 MODES
// 1. Cari Harga Jual (HPP + target profit Rp)
// 2. Cari Net Profit (harga jual + HPP)
// 3. Dana Diterima (harga jual only)
// ============================================

let currentMode = 'harga';
let currentTier = 'non-star';

const TIER_ADMIN = { 'non-star': 9.50, 'mall': 7.70 };

// --- Utilities ---
function parseNum(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtRp(num) {
    if (isNaN(num)) return 'Rp 0';
    const r = Math.round(num);
    return (r < 0 ? '-Rp ' : 'Rp ') + Math.abs(r).toLocaleString('id-ID');
}

function fmtThousands(value) {
    let cleaned = value.replace(/[^\d,]/g, '');
    const parts = cleaned.split(',');
    if (parts[0]) {
        parts[0] = parseInt(parts[0].replace(/^0+/, '') || '0', 10).toLocaleString('id-ID');
    }
    return parts.length > 1 ? parts[0] + ',' + parts[1] : parts[0];
}

function formatAndRecalculate(input) {
    const pos = input.selectionStart;
    const oldLen = input.value.length;
    input.value = fmtThousands(input.value);
    const newLen = input.value.length;
    input.setSelectionRange(Math.max(0, pos + (newLen - oldLen)), Math.max(0, pos + (newLen - oldLen)));
    recalculate();
}

// --- Fees ---
function getFees() {
    return {
        admin: parseNum(document.getElementById('biayaAdmin').value),
        layanan: parseNum(document.getElementById('biayaLayanan').value),
        ams: parseNum(document.getElementById('biayaAMS').value),
        gox: parseNum(document.getElementById('biayaGOX').value),
        proses: parseNum(document.getElementById('biayaProses').value)
    };
}

function totalPct(fees) {
    return fees.admin + fees.layanan + fees.ams + fees.gox;
}

// --- Breakdown from harga jual ---
function calcFromHargaJual(hargaJual, fees) {
    const biayaAdmin = hargaJual * (fees.admin / 100);
    const biayaLayanan = hargaJual * (fees.layanan / 100);
    const biayaAMS = hargaJual * (fees.ams / 100);
    const biayaGOX = hargaJual * (fees.gox / 100);
    const biayaProses = fees.proses;
    const totalPotongan = biayaAdmin + biayaLayanan + biayaAMS + biayaGOX + biayaProses;
    const diterima = hargaJual - totalPotongan;
    return { hargaJual, biayaAdmin, biayaLayanan, biayaAMS, biayaGOX, biayaProses, totalPotongan, diterima };
}

// --- Mode: Cari Harga Jual ---
// User inputs HPP + target profit (Rp)
// diterima = hargaJual * (1 - tp/100) - biayaProses
// profit = diterima - hpp = targetProfit
// hargaJual = (hpp + targetProfit + biayaProses) / (1 - tp/100)
function calcHargaJual(hpp, targetProfit, fees) {
    const tp = totalPct(fees) / 100;
    const denom = 1 - tp;
    if (denom <= 0) return null;
    const hargaJual = Math.ceil((hpp + targetProfit + fees.proses) / denom);
    const breakdown = calcFromHargaJual(hargaJual, fees);
    const profit = breakdown.diterima - hpp;
    return { ...breakdown, hpp, profit };
}

// --- Tier ---
function setTier(tier) {
    currentTier = tier;
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.toggle('active', b.dataset.tier === tier));
    document.getElementById('biayaAdmin').value = TIER_ADMIN[tier].toFixed(2).replace('.', ',');
    recalculate();
}

// --- Mode ---
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    
    document.getElementById('inputsHarga').classList.toggle('hidden', mode !== 'harga');
    document.getElementById('inputsProfit').classList.toggle('hidden', mode !== 'profit');
    document.getElementById('inputsTerima').classList.toggle('hidden', mode !== 'terima');
    
    const title = document.getElementById('cardTitle');
    const desc = document.getElementById('cardDesc');
    
    if (mode === 'harga') {
        title.textContent = 'Cari Harga Jual Aman';
        desc.textContent = 'Masukkan HPP dan target profit (Rp) yang diinginkan. Kalkulator akan menghitung harga jual yang diperlukan.';
    } else if (mode === 'profit') {
        title.textContent = 'Cari Net Profit';
        desc.textContent = 'Masukkan harga jual dan HPP untuk menghitung berapa net profit setelah semua potongan Shopee.';
    } else {
        title.textContent = 'Dana yang Diterima';
        desc.textContent = 'Masukkan harga jual untuk melihat berapa dana yang diterima setelah semua potongan Shopee.';
    }
    
    document.getElementById('resultCard').style.display = 'none';
    recalculate();
}

// --- Main Recalculate ---
function recalculate() {
    const fees = getFees();
    const tp = totalPct(fees);
    document.getElementById('totalFeePercent').textContent = tp.toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');
    
    let result = null;
    let hargaJual, hpp, profit, diterima;
    
    if (currentMode === 'harga') {
        hpp = parseNum(document.getElementById('hppForHarga').value);
        const targetProfit = parseNum(document.getElementById('profitTarget').value);
        if (hpp <= 0 && targetProfit <= 0) { hide(); return; }
        result = calcHargaJual(hpp, targetProfit, fees);
        if (!result) { hide(); return; }
        
        hargaJual = result.hargaJual;
        diterima = result.diterima;
        profit = result.profit;
        
        // Show result
        show();
        document.getElementById('resultTitle').textContent = 'Harga Jual Aman';
        document.getElementById('bigLabel').textContent = 'Harga Jual Minimum';
        document.getElementById('bigValue').textContent = fmtRp(hargaJual);
        document.getElementById('bigValue').className = 'big-value';
        document.getElementById('bigNote').textContent = `Profit ${fmtRp(profit)} dari HPP ${fmtRp(hpp)}`;
        document.getElementById('bigResult').className = 'big-result';
        
        setSummary('HPP', fmtRp(hpp), '', 
                   'Total Potongan', '- ' + fmtRp(result.totalPotongan), 'deduction',
                   'Dana Diterima', fmtRp(diterima), '',
                   'Net Profit', fmtRp(profit), 'profit');
        document.getElementById('sumItem4').className = 'summary-item highlight-item';
        
    } else if (currentMode === 'profit') {
        hargaJual = parseNum(document.getElementById('hargaForProfit').value);
        hpp = parseNum(document.getElementById('hppForProfit').value);
        if (hargaJual <= 0) { hide(); return; }
        
        const breakdown = calcFromHargaJual(hargaJual, fees);
        diterima = breakdown.diterima;
        profit = diterima - hpp;
        result = { ...breakdown, hpp, profit };
        
        show();
        document.getElementById('resultTitle').textContent = 'Net Profit';
        document.getElementById('bigLabel').textContent = 'Net Profit';
        document.getElementById('bigValue').textContent = fmtRp(profit);
        document.getElementById('bigValue').className = 'big-value ' + (profit > 0 ? 'positive' : profit < 0 ? 'negative' : '');
        const pctMarkup = hpp > 0 ? ((profit / hpp) * 100).toFixed(1).replace('.', ',') : '-';
        document.getElementById('bigNote').textContent = hpp > 0 ? `Markup ${pctMarkup}% dari HPP` : '';
        document.getElementById('bigResult').className = 'big-result ' + (profit > 0 ? 'big-positive' : profit < 0 ? 'big-negative' : '');
        
        setSummary('Harga Jual', fmtRp(hargaJual), '',
                   'Total Potongan', '- ' + fmtRp(result.totalPotongan), 'deduction',
                   'Dana Diterima', fmtRp(diterima), '',
                   'HPP', fmtRp(hpp), '');
        document.getElementById('sumItem4').className = 'summary-item';
        
    } else { // terima
        hargaJual = parseNum(document.getElementById('hargaForTerima').value);
        if (hargaJual <= 0) { hide(); return; }
        
        const breakdown = calcFromHargaJual(hargaJual, fees);
        diterima = breakdown.diterima;
        result = { ...breakdown, hpp: 0, profit: 0 };
        
        show();
        document.getElementById('resultTitle').textContent = 'Dana yang Diterima';
        document.getElementById('bigLabel').textContent = 'Dana yang Diterima';
        document.getElementById('bigValue').textContent = fmtRp(diterima);
        document.getElementById('bigValue').className = 'big-value';
        const pctTerima = ((diterima / hargaJual) * 100).toFixed(1).replace('.', ',');
        document.getElementById('bigNote').textContent = `${pctTerima}% dari harga jual`;
        document.getElementById('bigResult').className = 'big-result';
        
        setSummary('Harga Jual', fmtRp(hargaJual), '',
                   'Biaya Admin', '- ' + fmtRp(breakdown.biayaAdmin), 'deduction',
                   'Biaya Lainnya', '- ' + fmtRp(result.totalPotongan - breakdown.biayaAdmin), 'deduction',
                   'Dana Diterima', fmtRp(diterima), 'profit');
        document.getElementById('sumItem4').className = 'summary-item highlight-item';
    }
    
    // Breakdown
    if (result) {
        document.getElementById('brkAdminPct').textContent = `(${fees.admin.toFixed(2).replace('.', ',')}%)`;
        document.getElementById('brkLayananPct').textContent = `(${fees.layanan.toFixed(2).replace('.', ',')}%)`;
        document.getElementById('brkAMSPct').textContent = `(${fees.ams.toFixed(2).replace('.', ',')}%)`;
        document.getElementById('brkGOXPct').textContent = `(${fees.gox.toFixed(2).replace('.', ',')}%)`;
        document.getElementById('brkAdmin').textContent = fmtRp(result.biayaAdmin);
        document.getElementById('brkLayanan').textContent = fmtRp(result.biayaLayanan);
        document.getElementById('brkAMS').textContent = fmtRp(result.biayaAMS);
        document.getElementById('brkGOX').textContent = fmtRp(result.biayaGOX);
        document.getElementById('brkProses').textContent = fmtRp(result.biayaProses);
        document.getElementById('brkTotal').textContent = fmtRp(result.totalPotongan);
        
        // Visual bar
        const hj = result.hargaJual;
        if (hj > 0) {
            const h = result.hpp || 0;
            const f = result.totalPotongan;
            const p = Math.max(0, hj - h - f);
            document.getElementById('barHPP').style.width = (h / hj * 100) + '%';
            document.getElementById('barFee').style.width = (f / hj * 100) + '%';
            document.getElementById('barProfit').style.width = (p / hj * 100) + '%';
            document.getElementById('visualSection').style.display = h > 0 ? '' : 'none';
        }
    }
}

function setSummary(l1, v1, c1, l2, v2, c2, l3, v3, c3, l4, v4, c4) {
    document.getElementById('sumLabel1').textContent = l1;
    document.getElementById('sumValue1').textContent = v1;
    document.getElementById('sumValue1').className = 'summary-value ' + c1;
    document.getElementById('sumLabel2').textContent = l2;
    document.getElementById('sumValue2').textContent = v2;
    document.getElementById('sumValue2').className = 'summary-value ' + c2;
    document.getElementById('sumLabel3').textContent = l3;
    document.getElementById('sumValue3').textContent = v3;
    document.getElementById('sumValue3').className = 'summary-value ' + c3;
    document.getElementById('sumLabel4').textContent = l4;
    document.getElementById('sumValue4').textContent = v4;
    document.getElementById('sumValue4').className = 'summary-value ' + c4;
}

function show() { document.getElementById('resultCard').style.display = 'block'; }
function hide() { document.getElementById('resultCard').style.display = 'none'; }

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    const fees = getFees();
    document.getElementById('totalFeePercent').textContent = totalPct(fees).toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');
});
