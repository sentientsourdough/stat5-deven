let gameData = [];
let trendChart, distributionChart, disciplineChart, productionChart;
let currentFormStep = 1;
const totalSteps = 13;

// Initial state with updated keys.
let liveGame = { '1B':0, '2B':0, '3B':0, 'HR':0, 'SO':0, 'BB':0, 'HBP':0, 'O':0, 'R':0, 'RBI':0, 'SB':0, 'AB':0, 'H':0 };
let currentABContext = null;

function toggleNav(open) {
    document.getElementById('navSidebar').classList.toggle('active', open);
    document.getElementById('overlay').classList.toggle('active', open);
}

function closeAllMenus() { toggleNav(false); }

function showPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId + 'Page').classList.remove('hidden');
    const titles = { dashboard: "Dashboard", liveGame: "Live Game", addData: "Previous Game", dataManagement: "Site Data", glossary: "Glossary" };
    document.getElementById('pageTitle').textContent = titles[pageId] || "App";
    
    if (pageId === 'liveGame') initLiveGame();
    closeAllMenus();
}

function switchDashTab(tabId) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`dash-section-${tabId}`).classList.remove('hidden');
    document.getElementById(`dash-tab-${tabId}`).classList.add('active');
}

function calculate() {
    if (!gameData.length) {
        ['avgDisplay','obpDisplay','slgDisplay','opsDisplay'].forEach(id => document.getElementById(id).textContent = '.000');
        renderTable(); return;
    }
    const totals = gameData.reduce((a, g) => {
        a.AB += (g.AB || 0); 
        a.H += (g.H || 0); 
        a['1B'] += (g['1B'] || 0); 
        a['2B'] += (g['2B'] || 0); 
        a['3B'] += (g['3B'] || 0); 
        a.HR += (g.HR || 0); 
        a.SO += (g.SO || 0);
        a.BB += (g.BB || 0); 
        a.HBP += (g.HBP || 0);
        a.R += (g.R || 0);
        a.RBI += (g.RBI || 0);
        return a;
    }, { AB:0, H:0, '1B':0, '2B':0, '3B':0, HR:0, SO:0, BB:0, HBP:0, R:0, RBI:0 });
    const tbb = totals.BB + totals.HBP;
    const pa = totals.AB + tbb;
    const tb = totals['1B'] + (totals['2B'] * 2) + (totals['3B'] * 3) + (totals.HR * 4);
    const obp = pa > 0 ? ((totals.H + tbb) / pa) : 0;
    const slg = totals.AB > 0 ? (tb / totals.AB) : 0;
    const fmt = (v) => v.toFixed(3).replace(/^0/, '');

    document.getElementById('avgDisplay').textContent = totals.AB > 0 ? fmt(totals.H / totals.AB) : ".000";
    document.getElementById('obpDisplay').textContent = fmt(obp);
    document.getElementById('slgDisplay').textContent = fmt(slg);
    document.getElementById('opsDisplay').textContent = fmt(obp + slg);

    updateCharts(totals, tbb);
    renderTable();
    localStorage.setItem('deven.stat5.foo_v19', JSON.stringify(gameData));
}

function updateCharts(totals, tbb) {
    const sorted = [...gameData].sort((a,b) => new Date(a.Date) - new Date(b.Date));

    // Trend Chart (AVG + OPS)
    trendChart.data.labels = sorted.map(g => g.Date.split('-').slice(1).join('/'));

    // Calculate rolling stats
    let cAB = 0, cH = 0, cBB = 0, cHBP = 0, cTB = 0;
    const avgData = [];
    const obpData = [];
    const slgData = [];
    const opsData = [];

    sorted.forEach(g => {
        cAB += g.AB; cH += g.H; cBB += g.BB; cHBP += g.HBP;
        const gTB = (g['1B'] + g['2B']*2 + g['3B']*3 + g.HR*4);
        cTB += gTB;

        const rollAvg = cAB > 0 ? cH/cAB : 0;
        const rollObp = (cAB+cBB+cHBP) > 0 ? (cH+cBB+cHBP)/(cAB+cBB+cHBP) : 0;
        const rollSlg = cAB > 0 ? cTB/cAB : 0;

        avgData.push(rollAvg);
        obpData.push(rollObp);
        slgData.push(rollSlg);
        opsData.push(rollObp + rollSlg);
    });

    //backgroundColor: ['#3b82f6','#f43f5e','#eab308','#22c55e'],
    trendChart.data.datasets = [
        {
            label: 'AVG',
            data: avgData,
            borderColor: '#3b82f6', // blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 0,
            yAxisID: 'y'
        },
        {
            label: 'OBP',
            data: obpData,
            borderColor: '#ef4444', // red-500
            tension: 0.3,
            yAxisID: 'y'
        },
        {
            label: 'SLG',
            data: slgData,
            borderColor: '#eab308', // yellow-500
            //borderDash: [5, 5],
            tension: 0.3,
            //pointRadius: 0,
            yAxisID: 'y'
        },
        {
            label: 'OPS',
            data: opsData,
            borderColor: '#22c55e', // green-500
            //borderDash: [5, 5],
            tension: 0.3,
            //pointRadius: 0,
            yAxisID: 'y'
        }
    ];
    trendChart.update();

    // Distribution Chart
    distributionChart.data.datasets[0].data = [totals['1B'], totals['2B'], totals['3B'], totals.HR];
    distributionChart.update();

    // Discipline Chart
    disciplineChart.data.datasets[0].data = [totals.SO, tbb];
    disciplineChart.update();

    // Production Chart
    productionChart.data.datasets[0].data = [totals.R, totals.RBI];
    productionChart.update();
}

function renderTable() {
    const body = document.getElementById('statsTableBody');
    body.innerHTML = [...gameData].sort((a,b) => new Date(b.Date) - new Date(a.Date)).map(g => `
        <tr class="text-[11px] hover:bg-slate-50 transition">
            <td class="px-4 py-4 font-bold text-slate-700">${g.Date}</td>
            <td class="px-4 py-4 text-slate-500">${g.Opponent || '—'}</td>
            <td class="px-2 py-4 text-center">${g.AB}</td>
            <td class="px-2 py-4 text-center font-bold text-blue-600">${g.H}</td>
            <td class="px-2 py-4 text-center">${g.BB}</td>
            <td class="px-2 py-4 text-center text-slate-400 italic">${g.SO}</td>
            <td class="px-2 py-4 text-center font-black">${g.AB > 0 ? (g.H/g.AB).toFixed(3).replace(/^0/,'') : '.000'}</td>
            <td class="px-4 py-3 text-right"><button onclick="deleteGame('${g.ID}')" class="text-red-300 hover:text-red-500">×</button></td>
        </tr>
    `).join('');
}

function deleteGame(id) {
    if (confirm("Delete game?")) {
        gameData = gameData.filter(g => String(g.ID) !== String(id));
        calculate();
    }
}

function clearAllData() {
    if (confirm("Warning: This will delete ALL site data. Before continuing, it's recommended to save your game data 'Site Data' -> 'Backup & Recovery' -> 'Export .CSV'.")) {
        gameData = [];
        calculate();
    }
}

function exportData() {
    if (!gameData.length) return;
    const headers = ["ID", "Date", "Opponent", "AB", "1B", "2B", "3B", "HR", "H", "SO", "BB", "R", "RBI", "SB", "HBP", "O"];
    const rows = gameData.map(g => headers.map(h => JSON.stringify(g[h] || (['Opponent'].includes(h) ? "" : 0))).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deven.stat5.foo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        const headers = lines[0].split(",").map(h => h.replace(/['"]+/g, '').trim());
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map(v => v.replace(/['"]+/g, '').trim());
            const entry = {};
            headers.forEach((h, idx) => {
                let val = values[idx];
                if (!isNaN(val) && val !== "" && h !== 'Date' && h !== 'Opponent') val = Number(val);
                entry[h] = val;
            });
            if (entry.Date) imported.push(entry);
        }
        const existingIds = new Set(gameData.map(g => String(g.ID)));
        imported.forEach(entry => {
            if (!entry.ID || !existingIds.has(String(entry.ID))) {
                entry.ID = entry.ID || Date.now() + Math.random();
                gameData.push(entry);
            }
        });
        calculate(); alert("Import complete");
        event.target.value = '';
    };
    reader.readAsText(file);
}

// Current Game
function initLiveGame() {
    document.getElementById('liveDateDisplay').textContent = new Date().toLocaleDateString();
    updateLiveUI();
}
function updateLiveUI() {
    liveGame.H = liveGame['1B'] + liveGame['2B'] + liveGame['3B'] + liveGame.HR;
    liveGame.AB = liveGame.H + liveGame.SO + liveGame.O;
    document.getElementById('liveABDisplay').textContent = liveGame.AB;
    document.getElementById('liveHDisplay').textContent = liveGame.H;
    document.getElementById('liveRBIDisplay').textContent = liveGame.RBI;
    document.getElementById('liveRDisplay').textContent = liveGame.R;
}
function handleLiveResult(type) {
    currentABContext = { type: type, RBI: 0, SB: 0, R: 0 };
    if (type === 'HR') {
        currentABContext.RBI = 1;
        currentABContext.R = 1;
    }
    document.getElementById('liveKeypad').classList.add('hidden');
    document.getElementById('liveABContext').classList.remove('hidden');
    showLiveStep(1);
}
function showLiveStep(step) {
    document.querySelectorAll('.live-step').forEach(el => el.classList.add('hidden'));
    if (step === 2 && !['1B', '2B', '3B', 'BB', 'HBP'].includes(currentABContext.type)) return showLiveStep(3);
    if (step === 3 && (currentABContext.type === 'HR' || ['SO', 'O'].includes(currentABContext.type))) return showLiveStep(4);
    const stepMap = { 1: 'liveStepRBI', 2: 'liveStepSB', 3: 'liveStepRun', 4: 'liveStepConfirm' };
    document.getElementById(stepMap[step]).classList.remove('hidden');
    if (step === 4) updateLiveSummary();
}
function nextLiveStep(targetStep) { showLiveStep(targetStep); }
function adjustLiveContext(field, delta) { 
    currentABContext[field] = Math.max(0, currentABContext[field] + delta);
    document.getElementById(field === 'RBI' ? 'liveContextRBI' : 'liveContextSB').textContent = currentABContext[field];
}
function setLiveRun(scored) { currentABContext.R = scored ? 1 : 0; }
function updateLiveSummary() {
    document.getElementById('liveSummaryText').innerHTML = `
        <div class="font-bold text-lg mb-2">${currentABContext.type}</div>
        <div class="grid grid-cols-3 gap-2 text-xs font-bold text-slate-500">
            <div>RBI: ${currentABContext.RBI}</div>
            <div>SB: ${currentABContext.SB}</div>
            <div>Run: ${currentABContext.R ? 'YES' : 'NO'}</div>
        </div>
    `;
}
function cancelLiveAB() {
    document.getElementById('liveABContext').classList.add('hidden');
    document.getElementById('liveKeypad').classList.remove('hidden');
}
function confirmLiveAB() {
    const type = currentABContext.type;
    liveGame[type]++;
    liveGame.RBI += currentABContext.RBI;
    liveGame.SB += currentABContext.SB;
    liveGame.R += currentABContext.R;
    updateLiveUI();
    cancelLiveAB();
}
function finalizeLiveGame() {
    if (confirm("Save game data?")) {
        const entry = { 
            ID: Date.now(), 
            Date: new Date().toISOString().split('T')[0], 
            Opponent: document.getElementById('liveOpponent').value, 
            ...liveGame 
        };
        gameData.push(entry);
        calculate();
        liveGame = { '1B':0, '2B':0, '3B':0, 'HR':0, 'SO':0, 'BB':0, 'HBP':0, 'O':0, 'R':0, 'RBI':0, 'SB':0, 'AB':0, 'H':0 };
        showPage('dashboard');
    }
}

// Previous Game
function stepVal(id, delta) {
    const el = document.getElementById(id);
    el.value = Math.max(0, (parseInt(el.value) || 0) + delta);
}
function handleNext() {
    if (currentFormStep < totalSteps) {
        currentFormStep++;
        updateFormUI();
    }
}
function prevStep() {
    if (currentFormStep > 1) {
        currentFormStep--;
        updateFormUI();
    }
}
function updateFormUI() {
    document.getElementById('stepIndicator').textContent = `Step ${currentFormStep} of ${totalSteps}`;
    document.querySelectorAll('.step-content').forEach((el, idx) => el.classList.toggle('hidden', (idx + 1) !== currentFormStep));
    document.getElementById('backBtn').classList.toggle('hidden', currentFormStep === 1);
    document.getElementById('nextBtn').classList.toggle('hidden', currentFormStep === totalSteps);
    document.getElementById('submitBtn').classList.toggle('hidden', currentFormStep !== totalSteps);
    if (currentFormStep === totalSteps) buildFullReview();
}
function buildFullReview() {
    const fields = [
        { l: 'AB', v: 'AB' }, { l: '1B', v: '1B' }, { l: '2B', v: '2B' }, { l: '3B', v: '3B' },
        { l: 'HR', v: 'HR' }, { l: 'SO', v: 'SO' }, { l: 'BB', v: 'BB' }, { l: 'R', v: 'R' },
        { l: 'RBI', v: 'RBI' }, { l: 'SB', v: 'SB' }
    ];
    document.getElementById('fullReviewGrid').innerHTML = fields.map(f => `
        <div class="flex justify-between border-b border-blue-100 pb-1">
            <span class="text-blue-400 font-bold uppercase text-[10px]">${f.l}</span>
            <strong class="text-blue-900">${document.getElementById(f.v).value}</strong>
        </div>
    `).join('');

    // Calculate review avg
    const ab = parseInt(document.getElementById('AB').value) || 0;
    const h = ['1B', '2B', '3B', 'HR'].reduce((s, id) => s + (parseInt(document.getElementById(id).value) || 0), 0);
    const avg = ab > 0 ? (h/ab).toFixed(3).replace(/^0/,'') : '.000';
    document.getElementById('reviewCalculated').innerHTML = `<div class="flex justify-between items-center"><span class="text-xs font-black text-blue-800 uppercase">Game AVG</span><span class="text-2xl font-black text-blue-600">${avg}</span></div>`;
}

document.getElementById('statsForm').onsubmit = (e) => {
    e.preventDefault();
    const getV = (id) => parseInt(document.getElementById(id).value) || 0;
    const entry = {
        ID: Date.now(), Date: document.getElementById('formDate').value, Opponent: document.getElementById('formOpponent').value,
        AB: getV('AB'), '1B': getV('1B'), '2B': getV('2B'), '3B': getV('3B'), HR: getV('HR'),
        H: getV('1B')+getV('2B')+getV('3B')+getV('HR'), SO: getV('SO'), BB: getV('BB'), R: getV('R'), RBI: getV('RBI'), SB: getV('SB'), HBP: getV('HBP'),
        O: getV('AB') - (getV('1B')+getV('2B')+getV('3B')+getV('HR') + getV('SO')) // Derived Outs for manual entry
    };
    gameData.push(entry); calculate(); e.target.reset(); currentFormStep = 1; updateFormUI(); showPage('dashboard');
};

window.onload = () => {
    document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
    // 1. Performance (Line)
    const ctx1 = document.getElementById('performanceChart').getContext('2d');
    trendChart = new Chart(ctx1, {
        type:'line',
        data: { labels:[], datasets:[] },
        options: {
            responsive:true,
            maintainAspectRatio:false,
            plugins: { legend: { display:true, position:'bottom' } },
            scales:{ y: { beginAtZero: true, max: 2 }, x: { grid: { display: false } } } }
    });

    // 2. Distribution (Doughnut)
    const ctx2 = document.getElementById('distributionChart').getContext('2d');
    distributionChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['1B','2B','3B','HR'],
            datasets: [{
                data: [0,0,0,0],
                backgroundColor: ['#3b82f6','#f43f5e','#eab308','#22c55e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });

    // 3. Discipline (Bar)
    const ctx3 = document.getElementById('disciplineChart').getContext('2d');
    disciplineChart = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['SO','BB+HBP'],
            datasets: [{
                data: [0,0],
                backgroundColor: ['#94a3b8','#3b82f6'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
    });

    // 4. Production (Bar)
    const ctx4 = document.getElementById('productionChart').getContext('2d');
    productionChart = new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: ['R','RBI'],
            datasets: [{
                label: 'Total',
                data: [0, 0],
                backgroundColor: ['#10b981','#f59e0b'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    const saved = localStorage.getItem('deven.stat5.foo_v19'); 
    if (saved) gameData = JSON.parse(saved);
    calculate();
};
