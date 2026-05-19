/* ============================================================
   CineAI — Batch Prediction
   ============================================================ */

const BATCH_API    = 'http://localhost:8080'
const MAX_REVIEWS  = 50

let rowCount     = 0
let batchResults = []
let currentView  = 'cards'

let bPieInst  = null
let bBarInst  = null

const SAMPLE_BATCH = [
    'This movie was absolutely breathtaking! The cinematography was stunning and the performances were remarkable.',
    'One of the worst films I have ever seen. Terrible script and completely unwatchable.',
    'A masterpiece of modern cinema that will stand the test of time for generations to come.',
    'Boring and predictable. Nothing special about this film at all. Just average in every way.',
    'Absolutely loved every minute of this film! The director has created something truly magical.',
]

/* ── Row management ──────────────────────────────────────── */
function addRow(text = '') {
    const container = document.getElementById('reviewRows')
    if (!container) return

    const currentRows = container.querySelectorAll('.review-row').length
    if (currentRows >= MAX_REVIEWS) {
        toast('warning', 'Limit Reached', `Max ${MAX_REVIEWS} reviews per batch.`)
        return
    }

    rowCount++
    const rowNum = currentRows + 1

    const row = document.createElement('div')
    row.className = 'review-row'
    row.dataset.id = rowCount
    row.innerHTML = `
        <div class="row-num" aria-hidden="true">${rowNum}</div>
        <textarea
            class="review-row-ta"
            rows="2"
            placeholder="Enter movie review #${rowNum}…"
            aria-label="Review ${rowNum}"
            maxlength="2000"
        >${escapeHtml(text)}</textarea>
        <button class="row-del-btn" onclick="removeRow(this)" aria-label="Remove review ${rowNum}" title="Remove">✕</button>`

    container.appendChild(row)
    updateRowCount()
    row.querySelector('textarea')?.focus()
}
window.addRow = addRow

function removeRow(btn) {
    const row = btn.closest('.review-row')
    row?.remove()
    renumberRows()
    updateRowCount()
}
window.removeRow = removeRow

function renumberRows() {
    document.querySelectorAll('.review-row').forEach((row, i) => {
        const num = row.querySelector('.row-num')
        const ta  = row.querySelector('textarea')
        if (num) num.textContent = i + 1
        if (ta)  { ta.placeholder = `Enter movie review #${i + 1}…`; ta.setAttribute('aria-label', `Review ${i + 1}`) }
    })
}

function updateRowCount() {
    const count = document.querySelectorAll('.review-row').length
    const el    = document.getElementById('reviewCount')
    if (el) el.textContent = count
}

function clearAllRows() {
    const container = document.getElementById('reviewRows')
    if (!container) return
    container.innerHTML = ''
    rowCount = 0
    addRow()
    hideBatchResults()
}
window.clearAllRows = clearAllRows

function getReviews() {
    return [...document.querySelectorAll('.review-row-ta')]
        .map(ta => ta.value.trim())
        .filter(v => v.length >= 5)
}

/* ── Sample loader ───────────────────────────────────────── */
function fillSamples() {
    const container = document.getElementById('reviewRows')
    if (!container) return
    container.innerHTML = ''
    rowCount = 0
    SAMPLE_BATCH.forEach(t => addRow(t))
    hideBatchResults()
}
window.fillSamples = fillSamples

/* ── File Upload ─────────────────────────────────────────── */
function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['txt', 'csv'].includes(ext)) {
        toast('error', 'Unsupported File', 'Please upload a .txt or .csv file.')
        return
    }

    const reader = new FileReader()
    reader.onload = e => {
        const text  = e.target.result
        let reviews = []

        if (ext === 'txt') {
            reviews = text.split('\n').map(l => l.trim()).filter(l => l.length >= 5)
        } else {
            // CSV: try to find a column named "review" or use first column
            const lines  = text.split('\n')
            const header = lines[0].toLowerCase().split(',')
            const col    = header.findIndex(h => h.includes('review'))
            reviews = lines.slice(1).map(line => {
                const parts = line.split(',')
                const val   = col >= 0 ? parts[col] : parts[0]
                return val?.replace(/^"|"$/g, '').trim() || ''
            }).filter(v => v.length >= 5)
        }

        if (!reviews.length) { toast('warning', 'Empty File', 'No valid reviews found.'); return }
        if (reviews.length > MAX_REVIEWS) {
            toast('warning', 'Trimmed', `Loaded first ${MAX_REVIEWS} reviews.`)
            reviews = reviews.slice(0, MAX_REVIEWS)
        }

        const container = document.getElementById('reviewRows')
        container.innerHTML = ''
        rowCount = 0
        reviews.forEach(r => addRow(r))
        hideBatchResults()
        toast('success', 'File Loaded', `${reviews.length} review(s) imported from ${file.name}`)
    }

    reader.onerror = () => toast('error', 'Read Error', 'Could not read the file.')
    reader.readAsText(file)
    event.target.value = ''
}
window.handleFileUpload = handleFileUpload

/* ── Drag & Drop ─────────────────────────────────────────── */
function initDropZone() {
    const zone = document.getElementById('dropZone')
    if (!zone) return

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging') })
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'))
    zone.addEventListener('drop', e => {
        e.preventDefault()
        zone.classList.remove('dragging')
        const file = e.dataTransfer.files?.[0]
        if (file) handleFileUpload({ target: { files: [file], value: '' } })
    })
}

/* ── Analyze ─────────────────────────────────────────────── */
async function analyzeBatch() {
    const reviews = getReviews()
    const btn     = document.getElementById('batchAnalyzeBtn')

    if (!reviews.length) {
        toast('warning', 'No Reviews', 'Please add at least one review (min 5 characters).')
        return
    }

    setBatchBtn(btn, true)
    hideBatchResults()

    try {
        const res = await fetch(`${BATCH_API}/predict/batch`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ reviews }),
            signal:  AbortSignal.timeout(60000),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()
        batchResults = data.results || []
        renderBatchResults(batchResults)
        toast('success', 'Batch Complete', `${data.total} review(s) analyzed.`)

    } catch (err) {
        toast('error', 'Batch Failed', err.message)
    } finally {
        setBatchBtn(btn, false)
    }
}
window.analyzeBatch = analyzeBatch

/* ── Render results ──────────────────────────────────────── */
function renderBatchResults(results) {
    if (!results.length) return

    const pos     = results.filter(r => r.sentiment?.toLowerCase().includes('positive')).length
    const neg     = results.length - pos
    const avgConf = results.reduce((a, r) => a + r.confidence, 0) / results.length

    // Summary
    animBatch('sumTotal', results.length)
    animBatch('sumPos',   pos)
    animBatch('sumNeg',   neg)
    const avgEl = document.getElementById('sumAvg')
    if (avgEl) avgEl.textContent = avgConf.toFixed(1) + '%'
    document.getElementById('resultCount').textContent = results.length

    // Charts
    renderBatchPie(pos, neg)
    renderBatchBar(results)

    // Cards & table
    renderBatchCards(results)
    renderBatchTable(results)

    // Show section
    const section = document.getElementById('batchResults')
    if (section) { section.classList.remove('hidden'); section.scrollIntoView({ behavior:'smooth', block:'start' }) }

    if (typeof AOS !== 'undefined') AOS.refresh()
}

function animBatch(id, to) {
    const el = document.getElementById(id)
    if (!el) return
    let start = null
    function step(ts) {
        if (!start) start = ts
        const p = Math.min((ts - start) / 700, 1)
        el.textContent = Math.round((1 - Math.pow(1 - p, 2)) * to)
        if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
}

function hideBatchResults() {
    document.getElementById('batchResults')?.classList.add('hidden')
    batchResults = []
    bPieInst?.destroy(); bBarInst?.destroy()
    bPieInst = bBarInst = null
}

/* ── Cards view ──────────────────────────────────────────── */
function renderBatchCards(results) {
    const grid = document.getElementById('batchCardsView')
    if (!grid) return

    grid.innerHTML = results.map((r, i) => {
        const isPos = r.sentiment?.toLowerCase().includes('positive')
        const cls   = isPos ? 'positive' : 'negative'
        const trunc = r.review.length > 100 ? r.review.slice(0, 100) + '…' : r.review
        return `
        <div class="bc-card ${cls}" data-aos="fade-up" data-aos-delay="${Math.min(i * 40, 400)}" role="listitem">
            <div class="bc-card-top">
                <span style="font-size:11px;color:var(--text-3)">#${i + 1}</span>
                <span class="cell-badge ${cls}">${r.sentiment}</span>
            </div>
            <p class="bc-review" title="${escapeHtml(r.review)}">${escapeHtml(trunc)}</p>
            <div class="bc-meta">
                <span class="bc-conf">${r.confidence}% confidence</span>
                <span class="bc-prob">p=${r.probability}</span>
            </div>
        </div>`
    }).join('')
}

/* ── Table view ──────────────────────────────────────────── */
function renderBatchTable(results) {
    const tbody = document.getElementById('batchTableBody')
    if (!tbody) return

    tbody.innerHTML = results.map((r, i) => {
        const isPos = r.sentiment?.toLowerCase().includes('positive')
        const cls   = isPos ? 'positive' : 'negative'
        const trunc = r.review.length > 60 ? r.review.slice(0, 60) + '…' : r.review
        return `
        <tr>
            <td style="color:var(--text-3);font-size:11px">${i + 1}</td>
            <td title="${escapeHtml(r.review)}" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(trunc)}</td>
            <td><span class="cell-badge ${cls}">${r.sentiment}</span></td>
            <td style="font-weight:600;color:var(--${isPos?'positive':'negative'})">${r.confidence}%</td>
            <td class="mono" style="font-size:12px;color:var(--text-3)">${r.probability}</td>
        </tr>`
    }).join('')
}

/* ── View toggle ─────────────────────────────────────────── */
function setView(view) {
    currentView = view
    const cards = document.getElementById('batchCardsView')
    const table = document.getElementById('batchTableView')
    const btnC  = document.getElementById('viewCards')
    const btnT  = document.getElementById('viewTable')

    if (view === 'cards') {
        cards?.classList.remove('hidden')
        table?.classList.add('hidden')
        btnC?.classList.add('active')
        btnT?.classList.remove('active')
        btnC?.setAttribute('aria-pressed','true')
        btnT?.setAttribute('aria-pressed','false')
    } else {
        table?.classList.remove('hidden')
        cards?.classList.add('hidden')
        btnT?.classList.add('active')
        btnC?.classList.remove('active')
        btnT?.setAttribute('aria-pressed','true')
        btnC?.setAttribute('aria-pressed','false')
    }
}
window.setView = setView

/* ── Charts ──────────────────────────────────────────────── */
function renderBatchPie(pos, neg) {
    const el = document.getElementById('batchPieChart')
    if (!el) return
    bPieInst?.destroy()

    bPieInst = new Chart(el, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Negative'],
            datasets: [{
                data:            [pos, neg],
                backgroundColor: ['rgba(16,185,129,.8)', 'rgba(239,68,68,.8)'],
                borderColor:     ['#10b981', '#ef4444'],
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: {
                legend: { position:'bottom', labels:{ color:'#94a3b8', font:{ family:'Inter', size:12 }, padding:16 } },
                tooltip: {
                    backgroundColor:'#0f0f1f', borderColor:'#1a1a30', borderWidth:1,
                    titleColor:'#f1f5f9', bodyColor:'#94a3b8',
                    callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${((ctx.parsed/(pos+neg))*100).toFixed(1)}%)` },
                },
            },
            animation: { animateRotate:true, duration:1000 },
        },
    })
}

function renderBatchBar(results) {
    const el = document.getElementById('batchBarChart')
    if (!el) return
    bBarInst?.destroy()

    const labels  = results.map((_, i) => `#${i + 1}`)
    const data    = results.map(r => r.confidence)
    const colors  = results.map(r => r.sentiment?.toLowerCase().includes('positive') ? 'rgba(16,185,129,.75)' : 'rgba(239,68,68,.75)')
    const borders = results.map(r => r.sentiment?.toLowerCase().includes('positive') ? '#10b981' : '#ef4444')

    bBarInst = new Chart(el, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Confidence %',
                data, backgroundColor: colors, borderColor: borders,
                borderWidth: 1.5, borderRadius: 4,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero:false, min:50, max:100,
                     grid:{ color:'rgba(255,255,255,.04)' },
                     ticks:{ color:'#94a3b8', font:{ family:'Inter', size:11 }, callback: v => v + '%' },
                     border:{ color:'#1a1a30' } },
                x: { grid:{ display:false }, ticks:{ color:'#94a3b8', font:{ family:'Inter', size:10 } }, border:{ color:'#1a1a30' } },
            },
            plugins: {
                legend: { display:false },
                tooltip: {
                    backgroundColor:'#0f0f1f', borderColor:'#1a1a30', borderWidth:1,
                    titleColor:'#f1f5f9', bodyColor:'#94a3b8',
                    callbacks: { label: ctx => ` Confidence: ${ctx.parsed.y.toFixed(2)}%` },
                },
            },
            animation: { duration:900 },
        },
    })
}

/* ── Export ──────────────────────────────────────────────── */
function exportBatch(format) {
    if (!batchResults.length) { toast('warning', 'No Results', 'Run batch analysis first.'); return }

    if (format === 'json') {
        const a = document.createElement('a')
        a.href  = URL.createObjectURL(new Blob([JSON.stringify(batchResults, null, 2)], { type:'application/json' }))
        a.download = 'batch_results.json'; a.click(); URL.revokeObjectURL(a.href)
        toast('success', 'Exported', 'Results saved as JSON.')
    } else {
        const rows = ['Review,Sentiment,Confidence,Probability']
        batchResults.forEach(r => rows.push(`"${(r.review||'').replace(/"/g,'""')}","${r.sentiment}",${r.confidence},${r.probability}`))
        const a = document.createElement('a')
        a.href  = URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' }))
        a.download = 'batch_results.csv'; a.click(); URL.revokeObjectURL(a.href)
        toast('success', 'Exported', 'Results saved as CSV.')
    }
}
window.exportBatch = exportBatch

/* ── Utility ─────────────────────────────────────────────── */
function setBatchBtn(btn, loading) {
    if (!btn) return
    btn.disabled = loading
    const label   = btn.querySelector('.btn-label')
    const spinner = btn.querySelector('.spinner')
    if (label)   label.textContent = loading ? `Analyzing…` : '⚡ Analyze All'
    if (spinner) spinner.classList.toggle('hidden', !loading)
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    addRow()
    initDropZone()

    // Ctrl+Enter shortcut
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyzeBatch()
    })
})
