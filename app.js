// ============================================
// SHOPEE MUSIC CALCULATOR — SIMPLE FLOW
// Input HPP + Target Margin → Harga Jual Aman
// ============================================

const TIER_ADMIN = {
    'non-star': 9.50,
    'mall': 7.70
};

let currentTier = 'non-star';

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

// --- Tier ---
function setTier(tier) {
    currentTier = tier;
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.toggle('active', b.dataset.tier === tier));
    document.getElementById('biayaAdmin').value = TIER_ADMIN[tier].toFixed(2).replace('.', ',');
    const note = document.querySelector('.setting-note');
    if (note) note.textContent = `Alat Musik — ${tier === 'mall' ? 'Shopee Mall' : 'Non-Star/Star+'}`;
    recalculate();
}

// --- Get Fees ---
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

// --- Core Calculation ---
// Given HPP and target margin%, find harga jual
// margin = profit / hargaJual * 100
// profit = diterima - hpp
// diterima = hargaJual * (1 - totalPct/100) - biayaProses
// So: margin/100 = (hargaJual * (1 - tp) - bp - hpp) / hargaJual
// margin/100 * hargaJual = hargaJual * (1-tp) - bp - hpp
// hargaJual * (margin/100 - 1 + tp) = -bp - hpp
// hargaJual = (hpp + bp) / (1 - tp - margin/100)
function calcHargaJual(hpp, marginPct, fees) {
    const tp = totalPct(fees) / 100;
    const mp = marginPct / 100;
    const denominator = 1 - tp - mp;
    
    if (denominator <= 0) {
        return null; // Impossible — fees + margin >= 100%
    }
    
    const hargaJual = Math.ceil((hpp + fees.proses) / denominator);
    
    // Verify
    const biayaAdmin = hargaJual * (fees.admin / 100);
    const biayaLayanan = hargaJual * (fees.layanan / 100);
    const biayaAMS = hargaJual * (fees.ams / 100);
    const biayaGOX = hargaJual * (fees.gox / 100);
    const biayaProses = fees.proses;
    const totalPotongan = biayaAdmin + biayaLayanan + biayaAMS + biayaGOX + biayaProses;
    const diterima = hargaJual - totalPotongan;
    const profit = diterima - hpp;
    
    return {
        hargaJual,
        hpp,
        biayaAdmin,
        biayaLayanan,
        biayaAMS,
        biayaGOX,
        biayaProses,
        totalPotongan,
        diterima,
        profit,
        actualMargin: (profit / hargaJual) * 100
    };
}

// --- Main ---
function recalculate() {
    const fees = getFees();
    const tp = totalPct(fees);
    
    // Update fee total display
    document.getElementById('totalFeePercent').textContent = tp.toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');
    
    const hpp = parseNum(document.getElementById('inputHPP').value);
    const margin = parseFloat(document.getElementById('inputMargin').value) || 0;
    
    if (hpp <= 0) {
        document.getElementById('resultCard').style.display = 'none';
        document.getElementById('errorCard').style.display = 'none';
        return;
    }
    
    const result = calcHargaJual(hpp, margin, fees);
    
    if (!result) {
        document.getElementById('resultCard').style.display = 'none';
        const maxMargin = ((1 - tp / 100) * 100).toFixed(1).replace('.', ',');
        document.getElementById('errorTitle').textContent = 'Margin terlalu besar';
        document.getElementById('errorText').textContent = 
            `Total potongan Shopee (${tp.toFixed(2).replace('.', ',')}%) + margin ${margin}% = ${(tp + margin).toFixed(1).replace('.', ',')}% — melebihi 100%. Margin maksimal: ${maxMargin}%.`;
        document.getElementById('errorCard').style.display = 'block';
        return;
    }
    
    document.getElementById('errorCard').style.display = 'none';
    
    // Show results
    const card = document.getElementById('resultCard');
    card.style.display = 'block';
    
    document.getElementById('resHargaJual').textContent = fmtRp(result.hargaJual);
    document.getElementById('resNote').textContent = `Dengan margin ${margin}% setelah semua potongan Shopee`;
    document.getElementById('resHPP').textContent = fmtRp(result.hpp);
    document.getElementById('resTotalPotong').textContent = '- ' + fmtRp(result.totalPotongan);
    document.getElementById('resDiterima').textContent = fmtRp(result.diterima);
    document.getElementById('resProfit').textContent = fmtRp(result.profit);
    
    // Breakdown
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
    if (result.hargaJual > 0) {
        const pHPP = (result.hpp / result.hargaJual) * 100;
        const pFee = (result.totalPotongan / result.hargaJual) * 100;
        const pProfit = Math.max(0, 100 - pHPP - pFee);
        
        document.getElementById('barHPP').style.width = pHPP + '%';
        document.getElementById('barFee').style.width = pFee + '%';
        document.getElementById('barProfit').style.width = pProfit + '%';
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    const fees = getFees();
    const tp = totalPct(fees);
    document.getElementById('totalFeePercent').textContent = tp.toFixed(2).replace('.', ',') + '%';
    document.getElementById('totalFeeFlat').textContent = fees.proses.toLocaleString('id-ID');
});
