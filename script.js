/* =============================================
   FINANSAL PUSULA — script.js
   ============================================= */

// ─── STATE ────────────────────────────────────────
let veri = {};
let rasyolar = {};
let chartInstances = {};
let analizYapildi = false;
let saglikSkoru = null;

// ─── NAV ──────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById('section-' + id);
    if (sec) sec.classList.add('active');

    const nav = document.querySelector(`[data-section="${id}"]`);
    if (nav) nav.classList.add('active');

    const titles = {
        dashboard: 'Gösterge Paneli',
        input: 'Veri Girişi',
        ratios: 'Rasyo Analizi',
        charts: 'Grafikler',
        report: 'Rapor',
        glossary: 'Terimler Sözlüğü'
    };
    document.getElementById('pageTitle').textContent = titles[id] || id;

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        showSection(item.dataset.section);
    });
});

document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ─── TABS ──────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parent = tab.closest('.tabs');
        parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => {
            tc.classList.toggle('active', tc.id === 'tab-' + tabId);
        });
    });
});

// ─── FILE UPLOAD ───────────────────────────────────
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) isleDosya(f);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) isleDosya(fileInput.files[0]);
});

function isleDosya(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            if (ext === 'json') {
                const json = JSON.parse(e.target.result);
                veriUygula(json);
            } else if (ext === 'csv') {
                const result = Papa.parse(e.target.result.trim(), { header: false, skipEmptyLines: true });
                const obj = {};
                result.data.forEach(row => {
                    if (row.length >= 2) {
                        const key = row[0].trim();
                        const val = parseFloat(row[1]);
                        if (key && !isNaN(val)) obj[key] = val;
                    }
                });
                veriUygula(obj);
            } else {
                showToast('Desteklenmeyen dosya formatı', 'error');
            }
        } catch (err) {
            showToast('Dosya okuma hatası: ' + err.message, 'error');
        }
    };
    reader.readAsText(f);
}

function veriUygula(obj) {
    veri = obj;
    const preview = document.getElementById('csvPreview');
    preview.classList.remove('hidden');
    const keys = Object.keys(obj);
    preview.innerHTML = `✓ ${keys.length} alan yüklendi: ${keys.join(', ')}`;

    // Fill form fields
    const fields = ['donenVarliklar','stoklar','nakit','toplamAktif','kisaVadeliBorclar',
        'uzunVadeliBorclar','toplamBorclar','ozkaynak','netSatislar','brutKar',
        'faaliyetKari','netKar','alacaklar','faizGiderleri','eps','hisseFiyati'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el && obj[f] !== undefined) el.value = obj[f];
    });

    showToast(`${Object.keys(obj).length} alan başarıyla yüklendi ✓`, 'success');
    hesapla();
}

// ─── ÖRNEK VERİ ────────────────────────────────────
function ornekVeriYukle() {
    const ornek = {
        donenVarliklar: 850000,
        stoklar: 220000,
        nakit: 180000,
        toplamAktif: 2100000,
        kisaVadeliBorclar: 420000,
        uzunVadeliBorclar: 380000,
        toplamBorclar: 800000,
        ozkaynak: 1300000,
        netSatislar: 3200000,
        brutKar: 960000,
        faaliyetKari: 480000,
        netKar: 340000,
        alacaklar: 310000,
        faizGiderleri: 52000,
        eps: 3.4,
        hisseFiyati: 42
    };
    veriUygula(ornek);
    showSection('ratios');
}

function formuSifirla() {
    const fields = ['donenVarliklar','stoklar','nakit','toplamAktif','kisaVadeliBorclar',
        'uzunVadeliBorclar','toplamBorclar','ozkaynak','netSatislar','brutKar',
        'faaliyetKari','netKar','alacaklar','faizGiderleri','eps','hisseFiyati'];
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    veri = {}; rasyolar = {}; analizYapildi = false; saglikSkoru = null;
    document.getElementById('noDataMsg').classList.remove('hidden');
    document.getElementById('ratioResults').classList.add('hidden');
    document.getElementById('noDataMsgChart').classList.remove('hidden');
    document.getElementById('chartResults').classList.add('hidden');
    document.getElementById('noDataMsgReport').classList.remove('hidden');
    document.getElementById('reportContent').classList.add('hidden');
    document.getElementById('alertsBox').classList.add('hidden');
    updateKPIs(null);
    updateStatus(null);
    renderHealthScore();
    showToast('Veriler temizlendi', 'success');
}

// ─── VERİ OKUMA ────────────────────────────────────
function g(id) {
    const v = veri[id] !== undefined ? veri[id] : parseFloat(document.getElementById(id)?.value || '0');
    return isNaN(v) ? 0 : v;
}

function safe(num, den) {
    if (!den || den === 0) return null;
    return num / den;
}

// ─── HESAPLA ───────────────────────────────────────
function hesapla() {
    const dv = g('donenVarliklar');
    const stok = g('stoklar');
    const nakit = g('nakit');
    const ta = g('toplamAktif');
    const kvb = g('kisaVadeliBorclar');
    const uvb = g('uzunVadeliBorclar');
    const tb = g('toplamBorclar');
    const oz = g('ozkaynak');
    const ns = g('netSatislar');
    const bk = g('brutKar');
    const fk = g('faaliyetKari');
    const nk = g('netKar');
    const al = g('alacaklar');
    const faiz = g('faizGiderleri');
    const eps = g('eps');
    const hp = g('hisseFiyati');

    if (!dv && !ta && !ns) {
        showToast('Lütfen önce veri girin', 'error');
        return;
    }

    rasyolar = {
        // Likidite
        cariOran: safe(dv, kvb),
        asitTest: safe(dv - stok, kvb),
        nakitOrani: safe(nakit, kvb),

        // Kaldıraç
        borcOzkaynak: safe(tb, oz),
        finansalKaldirac: safe(ta, oz),
        borcAktif: safe(tb, ta),
        faizKarsilama: faiz ? safe(fk, faiz) : null,

        // Karlılık
        brutKarMarji: safe(bk, ns),
        faaliyetKarMarji: safe(fk, ns),
        netKarMarji: safe(nk, ns),
        roe: safe(nk, oz),
        roa: safe(nk, ta),

        // Faaliyet
        aktifDevir: safe(ns, ta),
        alacakDevir: al ? safe(ns, al) : null,
        stokDevir: stok ? safe(ns, stok) : null,

        // Piyasa
        fd: (eps && hp) ? safe(hp, eps) : null,
        hisseFiyati: hp,
        eps: eps,
    };

    analizYapildi = true;

    const skorBilesenleri = [
        normalize(rasyolar.cariOran, 0, 3),
        normalize(rasyolar.asitTest, 0, 2),
        normalize(rasyolar.netKarMarji, 0, 0.3),
        normalize(rasyolar.roe, 0, 0.3),
        normalize(rasyolar.aktifDevir, 0, 3),
        normalize(2 - (rasyolar.borcOzkaynak !== null ? rasyolar.borcOzkaynak : 2), 0, 2),
    ];
    saglikSkoru = Math.round(skorBilesenleri.reduce((a, b) => a + b, 0) / skorBilesenleri.length * 100);

    renderRatios();
    renderKPIs();
    renderCharts();
    renderHealthScore();
    renderReport();
    updateStatus();
    showToast('Analiz tamamlandı ✓', 'success');
}

// ─── SAĞLIK SKORU ──────────────────────────────────
function normalize(v, min, max) {
    if (v === null || v === undefined) return 0;
    return Math.min(1, Math.max(0, (v - min) / (max - min)));
}

function saglikDurumu(skor) {
    if (skor >= 80) return { durum: 'ok', etiket: 'Mükemmel' };
    if (skor >= 60) return { durum: 'ok', etiket: 'İyi' };
    if (skor >= 40) return { durum: 'warn', etiket: 'Orta' };
    if (skor >= 20) return { durum: 'warn', etiket: 'Zayıf' };
    return { durum: 'danger', etiket: 'Kritik' };
}

function renderHealthScore() {
    const numberEl = document.getElementById('scoreNumber');
    const labelEl = document.getElementById('scoreLabel');
    destroyChart('chartHealthScore');
    const ctx = document.getElementById('chartHealthScore').getContext('2d');

    if (saglikSkoru === null) {
        numberEl.textContent = '—';
        numberEl.style.color = 'var(--text)';
        labelEl.textContent = 'Veri bekleniyor';
        chartInstances.chartHealthScore = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [100], backgroundColor: ['#2e3347'], borderWidth: 0 }] },
            options: {
                rotation: -90, circumference: 180, cutout: '78%', maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: false,
            }
        });
        return;
    }

    const { durum, etiket } = saglikDurumu(saglikSkoru);
    const colorMap = { ok: CHART_COLORS.ok, warn: CHART_COLORS.warn, danger: CHART_COLORS.danger };

    numberEl.textContent = saglikSkoru;
    numberEl.style.color = colorMap[durum];
    labelEl.textContent = etiket;

    chartInstances.chartHealthScore = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [saglikSkoru, 100 - saglikSkoru],
                backgroundColor: [colorMap[durum], '#252a38'],
                borderWidth: 0,
            }]
        },
        options: {
            rotation: -90, circumference: 180, cutout: '78%', maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 700, easing: 'easeOutQuart' },
        }
    });
}

// ─── RASYO YORUMLARI ───────────────────────────────
const rasyoMeta = {
    cariOran: {
        ad: 'Cari Oran',
        kategori: 'likidite',
        formul: 'Dönen Varlıklar / Kısa Vadeli Borçlar',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 2) return { durum: 'ok', mesaj: 'Mükemmel likidite. Kısa vadeli borçları rahatlıkla karşılayabilir.' };
            if (v >= 1.5) return { durum: 'ok', mesaj: 'İyi likidite. Kısa vadeli yükümlülükler güvende.' };
            if (v >= 1) return { durum: 'warn', mesaj: 'Yeterli ancak sınırda. Nakit akışına dikkat.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Cari oran 1\'in altında! Likidite riski yüksek.' };
        }
    },
    asitTest: {
        ad: 'Asit Test Oranı',
        kategori: 'likidite',
        formul: '(Dönen Varlıklar − Stoklar) / Kısa Vadeli Borçlar',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 1) return { durum: 'ok', mesaj: 'Stoklar hariç likidite yeterli.' };
            if (v >= 0.8) return { durum: 'warn', mesaj: 'Dikkat: Stok nakde çevrilmeden kısa vadeli borç ödemesi zor.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Asit test oranı çok düşük, acil likidite riski.' };
        }
    },
    nakitOrani: {
        ad: 'Nakit Oranı',
        kategori: 'likidite',
        formul: 'Nakit / Kısa Vadeli Borçlar',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.5) return { durum: 'ok', mesaj: 'Nakit rezervleri güçlü.' };
            if (v >= 0.2) return { durum: 'warn', mesaj: 'Nakit rezervleri orta düzey.' };
            return { durum: 'danger', mesaj: 'Nakit rezervleri yetersiz. Acil ödeme kapasitesi zayıf.' };
        }
    },
    borcOzkaynak: {
        ad: 'Borç / Özkaynak',
        kategori: 'kaldirac',
        formul: 'Toplam Borçlar / Özkaynak',
        yorum: (v) => {
            if (v === null) return null;
            if (v <= 0.5) return { durum: 'ok', mesaj: 'Düşük finansal risk. Güçlü özkaynak yapısı.' };
            if (v <= 1) return { durum: 'ok', mesaj: 'Kabul edilebilir borçlanma seviyesi.' };
            if (v <= 2) return { durum: 'warn', mesaj: 'Orta düzey kaldıraç. Takip gerekli.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Yüksek borçluluk! Finansal kırılganlık riski.' };
        }
    },
    finansalKaldirac: {
        ad: 'Finansal Kaldıraç',
        kategori: 'kaldirac',
        formul: 'Toplam Aktif / Özkaynak',
        yorum: (v) => {
            if (v === null) return null;
            if (v <= 1.5) return { durum: 'ok', mesaj: 'Düşük kaldıraç, güvenli finansman.' };
            if (v <= 2.5) return { durum: 'ok', mesaj: 'Makul kaldıraç oranı.' };
            if (v <= 4) return { durum: 'warn', mesaj: 'Yüksek kaldıraç, dikkatli izleme önerilir.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Çok yüksek kaldıraç, iflas riski artar.' };
        }
    },
    borcAktif: {
        ad: 'Borç / Aktif',
        kategori: 'kaldirac',
        formul: 'Toplam Borçlar / Toplam Aktifler',
        yorum: (v) => {
            if (v === null) return null;
            if (v <= 0.4) return { durum: 'ok', mesaj: 'Varlıkların büyük çoğunluğu özkaynak ile finanse ediliyor.' };
            if (v <= 0.6) return { durum: 'warn', mesaj: 'Borç oranı yüksek, takip edin.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Varlıkların çoğu borçla finanse ediliyor.' };
        }
    },
    faizKarsilama: {
        ad: 'Faiz Karşılama',
        kategori: 'kaldirac',
        formul: 'EBIT / Faiz Giderleri',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 5) return { durum: 'ok', mesaj: 'Faiz yükümlülükleri çok rahat karşılanıyor.' };
            if (v >= 3) return { durum: 'ok', mesaj: 'Faiz ödemeleri güvende.' };
            if (v >= 1.5) return { durum: 'warn', mesaj: 'Faiz ödemeleri karşılanıyor ancak marj dar.' };
            return { durum: 'danger', mesaj: 'KRİTİK: Faiz ödemeleri risk altında!' };
        }
    },
    brutKarMarji: {
        ad: 'Brüt Kar Marjı',
        kategori: 'karlilik',
        formul: 'Brüt Kar / Net Satışlar',
        format: 'percent',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.5) return { durum: 'ok', mesaj: 'Çok yüksek brüt kar marjı.' };
            if (v >= 0.3) return { durum: 'ok', mesaj: 'Sağlıklı brüt kar marjı.' };
            if (v >= 0.15) return { durum: 'warn', mesaj: 'Orta düzey marj, sektöre göre değerlendirin.' };
            return { durum: 'danger', mesaj: 'Düşük brüt kar marjı. Maliyet baskısı var.' };
        }
    },
    faaliyetKarMarji: {
        ad: 'Faaliyet Kar Marjı',
        kategori: 'karlilik',
        formul: 'EBIT / Net Satışlar',
        format: 'percent',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.2) return { durum: 'ok', mesaj: 'Güçlü operasyonel karlılık.' };
            if (v >= 0.1) return { durum: 'ok', mesaj: 'Yeterli faaliyet karlılığı.' };
            if (v >= 0.05) return { durum: 'warn', mesaj: 'Zayıf faaliyet marjı.' };
            return { durum: 'danger', mesaj: 'Faaliyet zararı veya çok düşük karlılık.' };
        }
    },
    netKarMarji: {
        ad: 'Net Kar Marjı',
        kategori: 'karlilik',
        formul: 'Net Kar / Net Satışlar',
        format: 'percent',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.15) return { durum: 'ok', mesaj: 'Mükemmel net karlılık.' };
            if (v >= 0.08) return { durum: 'ok', mesaj: 'İyi net kar marjı.' };
            if (v >= 0.03) return { durum: 'warn', mesaj: 'Düşük net kar marjı.' };
            return { durum: 'danger', mesaj: 'Net zarar veya marj kritik düzeyde düşük.' };
        }
    },
    roe: {
        ad: 'ROE (Özkaynak Karlılığı)',
        kategori: 'karlilik',
        formul: 'Net Kar / Özkaynak',
        format: 'percent',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.2) return { durum: 'ok', mesaj: 'Özkaynak çok verimli kullanılıyor.' };
            if (v >= 0.1) return { durum: 'ok', mesaj: 'Yeterli özkaynak getirisi.' };
            if (v >= 0.05) return { durum: 'warn', mesaj: 'Düşük özkaynak getirisi.' };
            return { durum: 'danger', mesaj: 'Özkaynak getirisi yetersiz.' };
        }
    },
    roa: {
        ad: 'ROA (Aktif Karlılığı)',
        kategori: 'karlilik',
        formul: 'Net Kar / Toplam Aktif',
        format: 'percent',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 0.1) return { durum: 'ok', mesaj: 'Varlıklar çok verimli kullanılıyor.' };
            if (v >= 0.05) return { durum: 'ok', mesaj: 'İyi aktif karlılığı.' };
            if (v >= 0.02) return { durum: 'warn', mesaj: 'Düşük aktif verimliliği.' };
            return { durum: 'danger', mesaj: 'Varlıklar karlı kullanılamıyor.' };
        }
    },
    aktifDevir: {
        ad: 'Aktif Devir Hızı',
        kategori: 'faaliyet',
        formul: 'Net Satışlar / Toplam Aktif',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 2) return { durum: 'ok', mesaj: 'Varlıklar hızla satışa dönüşüyor.' };
            if (v >= 1) return { durum: 'ok', mesaj: 'Yeterli aktif kullanımı.' };
            if (v >= 0.5) return { durum: 'warn', mesaj: 'Aktif devir hızı düşük.' };
            return { durum: 'danger', mesaj: 'Varlıklar satışa çevrilemiyor.' };
        }
    },
    alacakDevir: {
        ad: 'Alacak Devir Hızı',
        kategori: 'faaliyet',
        formul: 'Net Satışlar / Ticari Alacaklar',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 10) return { durum: 'ok', mesaj: 'Alacaklar hızla tahsil ediliyor.' };
            if (v >= 6) return { durum: 'ok', mesaj: 'Makul alacak tahsil süresi.' };
            if (v >= 4) return { durum: 'warn', mesaj: 'Alacak tahsilatı yavaşlıyor.' };
            return { durum: 'danger', mesaj: 'Yavaş alacak tahsilatı, nakit akışı riski.' };
        }
    },
    stokDevir: {
        ad: 'Stok Devir Hızı',
        kategori: 'faaliyet',
        formul: 'Net Satışlar / Stoklar',
        yorum: (v) => {
            if (v === null) return null;
            if (v >= 8) return { durum: 'ok', mesaj: 'Stoklar hızla satışa dönüşüyor.' };
            if (v >= 4) return { durum: 'ok', mesaj: 'Stok yönetimi verimli.' };
            if (v >= 2) return { durum: 'warn', mesaj: 'Stok devri yavaşlıyor.' };
            return { durum: 'danger', mesaj: 'Stoklar satılamıyor, depolama maliyeti yüksek.' };
        }
    },
    fd: {
        ad: 'F/K Oranı',
        kategori: 'piyasa',
        formul: 'Hisse Fiyatı / EPS',
        yorum: (v) => {
            if (v === null) return null;
            if (v <= 10) return { durum: 'ok', mesaj: 'Düşük F/K, hisse ucuz görünüyor.' };
            if (v <= 20) return { durum: 'ok', mesaj: 'Makul değerleme.' };
            if (v <= 30) return { durum: 'warn', mesaj: 'Görece yüksek değerleme.' };
            return { durum: 'danger', mesaj: 'Çok yüksek F/K, aşırı değerleme riski.' };
        }
    },
};

// ─── FORMAT ────────────────────────────────────────
function formatVal(v, meta) {
    if (v === null || isNaN(v)) return 'N/A';
    if (meta.format === 'percent') return (v * 100).toFixed(1) + '%';
    return v.toFixed(2);
}

// ─── RENDER RASYOLAR ───────────────────────────────
function renderRatios() {
    document.getElementById('noDataMsg').classList.add('hidden');
    document.getElementById('ratioResults').classList.remove('hidden');

    const containers = {
        likidite: document.getElementById('rLikidite'),
        kaldirac: document.getElementById('rKaldirac'),
        karlilik: document.getElementById('rKarlilik'),
        faaliyet: document.getElementById('rFaaliyet'),
        piyasa: document.getElementById('rPiyasa'),
    };

    Object.values(containers).forEach(c => c.innerHTML = '');

    Object.entries(rasyoMeta).forEach(([key, meta]) => {
        const v = rasyolar[key];
        if (v === undefined) return;
        const yorum = meta.yorum(v);
        if (!yorum) return;

        const badgeMap = { ok: 'badge-ok', warn: 'badge-warn', danger: 'badge-danger' };
        const labelMap = { ok: 'İyi', warn: 'Dikkat', danger: 'Kritik' };
        const fv = formatVal(v, meta);

        const card = document.createElement('div');
        card.className = `ratio-card ${yorum.durum}`;
        card.innerHTML = `
            <div class="ratio-name">${meta.ad}</div>
            <div class="ratio-value">${fv}</div>
            <div class="ratio-formula">${meta.formul}</div>
            <div class="ratio-comment">${yorum.mesaj}</div>
            <span class="ratio-badge ${badgeMap[yorum.durum]}">${labelMap[yorum.durum]}</span>
        `;
        containers[meta.kategori]?.appendChild(card);
    });
}

// ─── RENDER KPIs ───────────────────────────────────
function renderKPIs() {
    const kpiDef = [
        { key: 'cariOran', icon: '💧', label: 'Likidite Oranı', format: null },
        { key: 'asitTest', icon: '⚗️', label: 'Asit Test Oranı', format: null },
        { key: 'borcOzkaynak', icon: '⚖️', label: 'Borç/Özkaynak', format: null },
        { key: 'netKarMarji', icon: '📈', label: 'Net Kar Marjı', format: 'percent' },
        { key: 'aktifDevir', icon: '🔄', label: 'Aktif Devir Hızı', format: null },
        { key: 'roe', icon: '💰', label: 'ROE', format: 'percent' },
    ];

    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = '';

    const alerts = [];

    kpiDef.forEach(def => {
        const v = rasyolar[def.key];
        const meta = rasyoMeta[def.key];
        const yorum = meta ? meta.yorum(v) : null;
        const fv = v !== null && v !== undefined ? formatVal(v, { format: def.format }) : '—';
        const status = yorum ? yorum.durum : 'empty';

        const card = document.createElement('div');
        card.className = `kpi-card ${status !== 'empty' ? 'status-' + status : 'kpi-empty'}`;
        card.innerHTML = `
            <div class="kpi-icon">${def.icon}</div>
            <div class="kpi-label">${def.label}</div>
            <div class="kpi-value">${fv}</div>
        `;
        grid.appendChild(card);

        if (yorum && yorum.durum === 'danger') {
            alerts.push({ label: def.label, mesaj: yorum.mesaj });
        }
    });

    const alertsBox = document.getElementById('alertsBox');
    const alertsList = document.getElementById('alertsList');

    if (alerts.length > 0) {
        alertsBox.classList.remove('hidden');
        alertsList.innerHTML = alerts.map(a =>
            `<div class="alert-item"><span class="alert-icon">🔴</span><div><strong>${a.label}:</strong> ${a.mesaj}</div></div>`
        ).join('');
    } else {
        alertsBox.classList.add('hidden');
    }
}

function updateKPIs(data) {
    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = `
        <div class="kpi-card kpi-empty"><div class="kpi-icon">💧</div><div class="kpi-label">Likidite Oranı</div><div class="kpi-value">—</div></div>
        <div class="kpi-card kpi-empty"><div class="kpi-icon">⚗️</div><div class="kpi-label">Asit Test Oranı</div><div class="kpi-value">—</div></div>
        <div class="kpi-card kpi-empty"><div class="kpi-icon">⚖️</div><div class="kpi-label">Borç/Özkaynak</div><div class="kpi-value">—</div></div>
        <div class="kpi-card kpi-empty"><div class="kpi-icon">📈</div><div class="kpi-label">Net Kar Marjı</div><div class="kpi-value">—</div></div>
        <div class="kpi-card kpi-empty"><div class="kpi-icon">🔄</div><div class="kpi-label">Aktif Devir Hızı</div><div class="kpi-value">—</div></div>
        <div class="kpi-card kpi-empty"><div class="kpi-icon">💰</div><div class="kpi-label">ROE</div><div class="kpi-value">—</div></div>
    `;
}

function updateStatus(s) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (!s) { dot.className = 'status-dot'; txt.textContent = 'Veri Bekleniyor'; return; }

    const alerts = Object.entries(rasyoMeta).filter(([k, m]) => {
        const v = rasyolar[k];
        const y = m.yorum(v);
        return y && y.durum === 'danger';
    });

    if (alerts.length >= 2) {
        dot.className = 'status-dot danger';
        txt.textContent = `${alerts.length} Kritik Uyarı`;
    } else if (alerts.length === 1) {
        dot.className = 'status-dot warn';
        txt.textContent = '1 Kritik Uyarı';
    } else {
        dot.className = 'status-dot ok';
        txt.textContent = 'Analiz Tamamlandı';
    }
}

// ─── CHARTS ────────────────────────────────────────
const CHART_COLORS = {
    ok: '#4ade80',
    warn: '#f59e0b',
    danger: '#ef4444',
    neutral: '#6b7280',
    bg: '#1e2332',
};

Chart.defaults.color = '#9ba3b8';
Chart.defaults.borderColor = '#2e3347';
Chart.defaults.font.family = 'DM Sans';

function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderCharts() {
    document.getElementById('noDataMsgChart').classList.add('hidden');
    document.getElementById('chartResults').classList.remove('hidden');

    // Likidite bar chart
    destroyChart('chartLikidite');
    const ctxL = document.getElementById('chartLikidite').getContext('2d');
    const likvars = [rasyolar.cariOran, rasyolar.asitTest, rasyolar.nakitOrani];
    const limitsL = [1.5, 1, 0.3];
    chartInstances.chartLikidite = new Chart(ctxL, {
        type: 'bar',
        data: {
            labels: ['Cari Oran', 'Asit Test', 'Nakit Oranı'],
            datasets: [
                {
                    label: 'Değer',
                    data: likvars.map(v => v !== null ? parseFloat(v.toFixed(3)) : 0),
                    backgroundColor: likvars.map((v, i) => v !== null && v >= limitsL[i] ? '#4ade8066' : '#ef444466'),
                    borderColor: likvars.map((v, i) => v !== null && v >= limitsL[i] ? '#4ade80' : '#ef4444'),
                    borderWidth: 2,
                    borderRadius: 6,
                },
                {
                    label: 'Min. Eşik',
                    data: limitsL,
                    type: 'line',
                    borderColor: '#f59e0b',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Karlılık bar chart (percentages)
    destroyChart('chartKarlilik');
    const ctxK = document.getElementById('chartKarlilik').getContext('2d');
    const kvals = [rasyolar.brutKarMarji, rasyolar.faaliyetKarMarji, rasyolar.netKarMarji, rasyolar.roe, rasyolar.roa];
    chartInstances.chartKarlilik = new Chart(ctxK, {
        type: 'bar',
        data: {
            labels: ['Brüt Kar', 'Faaliyet Kar', 'Net Kar', 'ROE', 'ROA'],
            datasets: [{
                label: '%',
                data: kvals.map(v => v !== null ? parseFloat((v * 100).toFixed(1)) : 0),
                backgroundColor: kvals.map(v => v !== null && v > 0.05 ? '#4ade8055' : '#ef444455'),
                borderColor: kvals.map(v => v !== null && v > 0.05 ? '#4ade80' : '#ef4444'),
                borderWidth: 2,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } }
        }
    });

    // Varlık dağılımı doughnut
    destroyChart('chartVarlik');
    const ctxV = document.getElementById('chartVarlik').getContext('2d');
    const dv2 = g('donenVarliklar');
    const ta2 = g('toplamAktif');
    const dv_d = dv2 || 0;
    const ud_d = (ta2 - dv_d > 0) ? ta2 - dv_d : 0;
    chartInstances.chartVarlik = new Chart(ctxV, {
        type: 'doughnut',
        data: {
            labels: ['Dönen Varlıklar', 'Duran Varlıklar'],
            datasets: [{
                data: [dv_d, ud_d],
                backgroundColor: ['#4ade8066', '#3b82f666'],
                borderColor: ['#4ade80', '#3b82f6'],
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatTL(ctx.raw) } }
            }
        }
    });

    // Borç yapısı doughnut
    destroyChart('chartBorc');
    const ctxB = document.getElementById('chartBorc').getContext('2d');
    const kvb2 = g('kisaVadeliBorclar');
    const uvb2 = g('uzunVadeliBorclar');
    const oz2 = g('ozkaynak');
    chartInstances.chartBorc = new Chart(ctxB, {
        type: 'doughnut',
        data: {
            labels: ['Kısa Vadeli Borç', 'Uzun Vadeli Borç', 'Özkaynak'],
            datasets: [{
                data: [kvb2 || 0, uvb2 || 0, oz2 || 0],
                backgroundColor: ['#ef444466', '#f59e0b66', '#4ade8066'],
                borderColor: ['#ef4444', '#f59e0b', '#4ade80'],
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatTL(ctx.raw) } }
            }
        }
    });

    // Radar
    destroyChart('chartRadar');
    const ctxR = document.getElementById('chartRadar').getContext('2d');

    const radarVals = [
        normalize(rasyolar.cariOran, 0, 3) * 100,
        normalize(rasyolar.asitTest, 0, 2) * 100,
        normalize(rasyolar.netKarMarji, 0, 0.3) * 100,
        normalize(rasyolar.roe, 0, 0.3) * 100,
        normalize(rasyolar.aktifDevir, 0, 3) * 100,
        normalize(2 - (rasyolar.borcOzkaynak || 2), 0, 2) * 100,
    ];

    chartInstances.chartRadar = new Chart(ctxR, {
        type: 'radar',
        data: {
            labels: ['Cari Oran', 'Asit Test', 'Net Kar Marjı', 'ROE', 'Aktif Devir', 'Borç Güvenliği'],
            datasets: [{
                label: 'Şirket',
                data: radarVals,
                backgroundColor: 'rgba(74,222,128,0.15)',
                borderColor: '#4ade80',
                pointBackgroundColor: '#4ade80',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: { display: false },
                    grid: { color: '#2e3347' },
                    pointLabels: { color: '#9ba3b8', font: { size: 12 } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function formatTL(v) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
}

// ─── REPORT ────────────────────────────────────────
function renderReport() {
    document.getElementById('noDataMsgReport').classList.add('hidden');
    document.getElementById('reportContent').classList.remove('hidden');

    const body = document.getElementById('reportBody');

    const rows = Object.entries(rasyoMeta).map(([key, meta]) => {
        const v = rasyolar[key];
        if (v === undefined || v === null) return '';
        const fv = formatVal(v, meta);
        const yorum = meta.yorum(v);
        if (!yorum) return '';
        const cls = yorum.durum;
        return `<tr>
            <td>${meta.ad}</td>
            <td class="${cls}">${fv}</td>
            <td>${meta.formul}</td>
            <td class="${cls}">${yorum.mesaj}</td>
        </tr>`;
    }).join('');

    const date = new Date().toLocaleDateString('tr-TR');

    body.innerHTML = `
        <div class="report-section">
            <h3>Finansal Analiz Raporu</h3>
            <p style="color:var(--text2);font-size:13px;">Tarih: ${date} &nbsp;|&nbsp; Analiz: Finansal Pusula</p>
        </div>
        <div class="report-section">
            <h3>Tüm Rasyo Sonuçları</h3>
            <table class="report-table">
                <thead><tr><th>Rasyo</th><th>Değer</th><th>Formül</th><th>Yorum</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="report-section">
            <h3>Finansal Özet</h3>
            <table class="report-table">
                <thead><tr><th>Kalem</th><th>Değer</th></tr></thead>
                <tbody>
                    ${[
                        ['Toplam Aktifler', formatTL(g('toplamAktif'))],
                        ['Net Satışlar', formatTL(g('netSatislar'))],
                        ['Net Kar', formatTL(g('netKar'))],
                        ['Toplam Borçlar', formatTL(g('toplamBorclar'))],
                        ['Özkaynak', formatTL(g('ozkaynak'))],
                    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function raporuYazdir() {
    window.print();
}

function raporuCSVIndir() {
    const rows = [['Rasyo', 'Değer', 'Durum', 'Yorum']];
    Object.entries(rasyoMeta).forEach(([key, meta]) => {
        const v = rasyolar[key];
        if (v === null || v === undefined) return;
        const yorum = meta.yorum(v);
        if (!yorum) return;
        rows.push([meta.ad, formatVal(v, meta), yorum.durum, yorum.mesaj]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'finansal_analiz.csv'; a.click();
    showToast('CSV indirildi ✓', 'success');
}

function sablonIndir() {
    const alanlar = ['donenVarliklar','stoklar','nakit','toplamAktif','kisaVadeliBorclar',
        'uzunVadeliBorclar','toplamBorclar','ozkaynak','netSatislar','brutKar',
        'faaliyetKari','netKar','alacaklar','faizGiderleri','eps','hisseFiyati'];
    const csv = 'alan,deger\n' + alanlar.map(a => `${a},0`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'finansal_pusula_sablon.csv'; a.click();
    showToast('Şablon indirildi ✓', 'success');
}

// ─── SÖZLÜK ────────────────────────────────────────
const sozluk = [
    { terim: 'Cari Oran', aciklama: 'Dönen varlıkların kısa vadeli borçlara oranı. Şirketin kısa vadeli yükümlülüklerini karşılama kapasitesini gösterir. Genel kabul 1.5–2 arasıdır.' },
    { terim: 'Asit Test Oranı (Hızlı Oran)', aciklama: 'Stoklar çıkarıldıktan sonra kalan dönen varlıkların kısa vadeli borçlara oranı. Stokların satılamadığı senaryoda likiditeyi ölçer.' },
    { terim: 'Nakit Oranı', aciklama: 'Sadece nakit ve nakit benzeri varlıkların kısa vadeli borçlara oranı. En katı likidite göstergesidir.' },
    { terim: 'Borç/Özkaynak (Kaldıraç)', aciklama: 'Toplam borçların özsermayeye oranı. Şirketin ne kadar dış kaynak kullandığını gösterir. 1\'in altı genellikle güvenli kabul edilir.' },
    { terim: 'Finansal Kaldıraç', aciklama: 'Toplam aktiflerin özsermayeye oranı. Varlıkların ne kadarının borçla finanse edildiğini gösterir.' },
    { terim: 'Faiz Karşılama Oranı', aciklama: 'EBIT\'in faiz giderlerine oranı. Şirketin faiz ödemelerini ne kadar rahat karşıladığını gösterir. 3 ve üzeri sağlıklı kabul edilir.' },
    { terim: 'Brüt Kar Marjı', aciklama: 'Brüt kârın net satışlara oranı. Üretim/satın alma maliyetleri düşüldükten sonra kalan kâr marjını gösterir.' },
    { terim: 'Net Kar Marjı', aciklama: 'Net kârın net satışlara oranı. Tüm giderler karşılandıktan sonra kalan nihai karlılığı ölçer.' },
    { terim: 'ROE (Özkaynak Kârlılığı)', aciklama: 'Net kârın özkaynağa oranı. Hissedarların yatırdığı sermayenin ne kadar verimli kullanıldığını gösterir.' },
    { terim: 'ROA (Aktif Kârlılığı)', aciklama: 'Net kârın toplam aktiflere oranı. Şirketin tüm varlıklarını ne kadar verimli kullandığını gösterir.' },
    { terim: 'Aktif Devir Hızı', aciklama: 'Net satışların toplam aktiflere oranı. Varlıkların satışa ne hızla dönüştüğünü ölçer. Yüksek olması tercih edilir.' },
    { terim: 'Alacak Devir Hızı', aciklama: 'Net satışların ticari alacaklara oranı. Alacakların ne hızla tahsil edildiğini gösterir.' },
    { terim: 'Stok Devir Hızı', aciklama: 'Net satışların stoklara oranı. Stokların ne kadar hızlı satışa çevrildiğini ölçer.' },
    { terim: 'F/K Oranı (Fiyat/Kazanç)', aciklama: 'Hisse senedi fiyatının hisse başı kazanca oranı. Piyasanın şirketi kaç yıllık kazanç üzerinden değerlediğini gösterir.' },
    { terim: 'EPS (Hisse Başı Kazanç)', aciklama: 'Net kârın toplam hisse senedi sayısına bölümü. Her bir hisse senedine düşen kârı gösterir.' },
    { terim: 'EBIT', aciklama: 'Faiz ve vergi öncesi kâr (Earnings Before Interest and Taxes). Şirketin operasyonel kârlılığını gösterir.' },
    { terim: 'Özkaynak (Özsermaye)', aciklama: 'Toplam varlıklardan toplam borçların çıkarılmasıyla bulunan net değer. Hissedarlara ait gerçek sermayedir.' },
    { terim: 'Likidite', aciklama: 'Bir varlığın hızla nakde çevrilebilme yeteneği. Yüksek likidite, borç ödeme kapasitesinin güçlü olduğunu ifade eder.' },
];

function renderGlossary(filter = '') {
    const list = document.getElementById('glossaryList');
    const filtered = sozluk.filter(s =>
        s.terim.toLowerCase().includes(filter.toLowerCase()) ||
        s.aciklama.toLowerCase().includes(filter.toLowerCase())
    );
    list.innerHTML = filtered.map((s, i) => `
        <div class="glossary-item" id="gi-${i}">
            <h4 onclick="toggleGlossary(${i})">${s.terim} <span>+</span></h4>
            <p>${s.aciklama}</p>
        </div>
    `).join('');
}

function toggleGlossary(i) {
    const el = document.getElementById('gi-' + i);
    el.classList.toggle('open');
    el.querySelector('span').textContent = el.classList.contains('open') ? '−' : '+';
}

function filterGlossary() {
    renderGlossary(document.getElementById('glossarySearch').value);
}

// ─── TOAST ────────────────────────────────────────
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── INIT ──────────────────────────────────────────
renderGlossary();
renderHealthScore();
