/* ============================================================
   CineAI — Analytics (localStorage · Chart.js)
   ============================================================ */

const LS_KEY = 'cineai_history'

let pieChartInst = null
let confChartInst = null

/* ── Storage ─────────────────────────────────────────────── */
function getHistory() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function saveHistory(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch(e) { console.warn('LocalStorage full', e) }
}

function addToHistory(result) {
    const hist = getHistory()
    hist.unshift({
        ...result,
        id:        Date.now(),
        timestamp: new Date().toISOString(),
    })
    saveHistory(hist.slice(0, 100))   // keep last 100
    renderAnalytics()
}
window.addToHistory = addToHistory

function clearHistory() {
    if (!confirm('Clear all prediction history?')) return
    localStorage.removeItem(LS_KEY)
    renderAnalytics()
    toast('info', 'History Cleared', 'All prediction records removed.')
}
window.clearHistory = clearHistory

/* ── Stats ───────────────────────────────────────────────── */
function calcStats(hist) {
    if (!hist.length) return { total:0, pos:0, neg:0, avg:'—' }
    const pos = hist.filter(h => h.sentiment?.toLowerCase().includes('positive')).length
    const avg = hist.reduce((a, h) => a + (h.confidence || 0), 0) / hist.length
    return { total: hist.length, pos, neg: hist.length - pos, avg: avg.toFixed(1) + '%' }
}

/* ── Render ──────────────────────────────────────────────── */
function renderAnalytics() {
    const hist = getHistory()
    const s    = calcStats(hist)

    // Stats counters
    animNum('statTotal',    0, s.total,   800)
    animNum('statPositive', 0, s.pos,     800)
    animNum('statNegative', 0, s.neg,     800)
    const avgEl = document.getElementById('statAvgConf')
    if (avgEl) avgEl.textContent = s.avg

    // Charts
    renderPieChart(s)
    renderConfChart(hist)

    // Table
    renderHistoryTable(hist)
}

function animNum(id, from, to, dur) {
    const el = document.getElementById(id)
    if (!el) return
    let start = null
    function step(ts) {
        if (!start) start = ts
        const p = Math.min((ts - start) / dur, 1)
        el.textContent = Math.round(from + (1 - Math.pow(1 - p, 2)) * (to - from))
        if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
}

/* ── Pie Chart ───────────────────────────────────────────── */
function renderPieChart(s) {
    const el = document.getElementById('pieChart')
    if (!el) return

    pieChartInst?.destroy()

    if (s.total === 0) {
        const ctx = el.getContext('2d')
        ctx.clearRect(0, 0, el.width, el.height)
        return
    }

    pieChartInst = new Chart(el, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Negative'],
            datasets: [{
                data:            [s.pos, s.neg],
                backgroundColor: ['rgba(16,185,129,.8)', 'rgba(239,68,68,.8)'],
                borderColor:     ['#10b981', '#ef4444'],
                borderWidth:     2,
                hoverBackgroundColor: ['rgba(16,185,129,1)', 'rgba(239,68,68,1)'],
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16 },
                },
                tooltip: {
                    backgroundColor: '#0f0f1f', borderColor: '#1a1a30', borderWidth: 1,
                    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} (${((ctx.parsed / s.total) * 100).toFixed(1)}%)`,
                    },
                },
            },
            animation: { animateRotate: true, duration: 1000 },
        },
    })
}

/* ── Confidence Bar Chart ────────────────────────────────── */
function renderConfChart(hist) {
    const el = document.getElementById('confChart')
    if (!el) return

    confChartInst?.destroy()

    const recent = hist.slice(0, 20).reverse()
    if (!recent.length) return

    const colors = recent.map(h =>
        h.sentiment?.toLowerCase().includes('positive')
            ? 'rgba(16,185,129,.75)'
            : 'rgba(239,68,68,.75)'
    )
    const borders = recent.map(h =>
        h.sentiment?.toLowerCase().includes('positive') ? '#10b981' : '#ef4444'
    )

    confChartInst = new Chart(el, {
        type: 'bar',
        data: {
            labels: recent.map((_, i) => `#${i + 1}`),
            datasets: [{
                label: 'Confidence %',
                data:            recent.map(h => h.confidence),
                backgroundColor: colors,
                borderColor:     borders,
                borderWidth:     1.5,
                borderRadius:    4,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false, min: 50, max: 100,
                    grid:  { color: 'rgba(255,255,255,.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, callback: v => v + '%' },
                    border: { color: '#1a1a30' },
                },
                x: {
                    grid:  { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
                    border:{ color: '#1a1a30' },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f0f1f', borderColor: '#1a1a30', borderWidth: 1,
                    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    callbacks: { label: ctx => ` Confidence: ${ctx.parsed.y.toFixed(2)}%` },
                },
            },
            animation: { duration: 900 },
        },
    })
}

/* ── History Table ───────────────────────────────────────── */
function renderHistoryTable(hist) {
    const tbody = document.getElementById('historyTableBody')
    if (!tbody) return

    if (!hist.length) {
        tbody.innerHTML = `
        <tr><td colspan="6">
            <div class="empty-state">
                <div class="empty-state-icon" aria-hidden="true">📋</div>
                <p class="empty-state-text">No predictions yet</p>
                <p class="text-muted" style="font-size:12px">Analyze a review to see history here</p>
            </div>
        </td></tr>`
        return
    }

    tbody.innerHTML = hist.slice(0, 50).map((h, i) => {
        const isPos = h.sentiment?.toLowerCase().includes('positive')
        const cls   = isPos ? 'positive' : 'negative'
        const time  = h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : '—'
        return `
        <tr>
            <td style="color:var(--text-3);font-size:11px">${i + 1}</td>
            <td class="cell-review" title="${escapeHtml(h.review)}">${escapeHtml(h.review)}</td>
            <td><span class="cell-badge ${cls}">${h.sentiment}</span></td>
            <td style="font-weight:600;color:var(--${isPos?'positive':'negative'})">${h.confidence}%</td>
            <td class="mono" style="font-size:12px;color:var(--text-3)">${h.probability}</td>
            <td style="font-size:11px;color:var(--text-3)">${time}</td>
        </tr>`
    }).join('')
}

/* ── Export ──────────────────────────────────────────────── */
function exportHistory(format) {
    const hist = getHistory()
    if (!hist.length) { toast('warning', 'Nothing to Export', 'No history to export yet.'); return }

    if (format === 'json') {
        download(JSON.stringify(hist, null, 2), 'cineai_history.json', 'application/json')
        toast('success', 'Exported', 'History saved as JSON.')
    } else {
        const rows = ['Review,Sentiment,Confidence,Probability,Timestamp']
        hist.forEach(h => rows.push(
            `"${(h.review||'').replace(/"/g,'""')}","${h.sentiment}",${h.confidence},${h.probability},"${h.timestamp}"`
        ))
        download(rows.join('\n'), 'cineai_history.csv', 'text/csv')
        toast('success', 'Exported', 'History saved as CSV.')
    }
}
window.exportHistory = exportHistory

function download(content, filename, type) {
    const a   = document.createElement('a')
    a.href    = URL.createObjectURL(new Blob([content], { type }))
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    renderAnalytics()
})
