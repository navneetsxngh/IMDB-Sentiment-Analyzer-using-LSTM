/* ============================================================
   CineAI — Single Prediction
   ============================================================ */

const MAX_CHARS = 2000

const SAMPLES = [
    'This movie was absolutely breathtaking! Every scene was crafted with incredible precision and the performances were nothing short of phenomenal.',
    'Worst film I have ever seen in my entire life. Terrible acting, completely pointless plot, and a waste of two hours I will never get back.',
    'An average film with some good moments but ultimately forgettable. The story was predictable and the pacing felt off throughout.',
    'A masterpiece of modern cinema. The director has created something truly special that will stand the test of time for generations.',
    'Incredibly dull and painfully slow. I had to fight the urge to walk out halfway through. Just awful in every way.',
    'One of the most emotionally powerful films I have experienced. The storytelling was raw, honest, and deeply moving.',
    'The special effects were decent but the story fell completely flat. Average at best, disappointing at worst.',
    'A heartfelt gem of a movie. Beautifully shot, wonderfully acted, and genuinely touching from start to finish.',
]

/* ── Character counter ───────────────────────────────────── */
function initCharCounter() {
    const ta      = document.getElementById('reviewInput')
    const counter = document.getElementById('charCounter')
    if (!ta || !counter) return

    ta.addEventListener('input', () => {
        const len = ta.value.length
        counter.textContent = `${len} / ${MAX_CHARS}`
        counter.className = 'char-count'
        if (len > MAX_CHARS * .85) counter.classList.add('warn')
        if (len >= MAX_CHARS)      counter.classList.add('limit')
    })
}

/* ── Sample buttons ──────────────────────────────────────── */
function fillSample(btn) {
    const ta = document.getElementById('reviewInput')
    if (!ta) return
    ta.value = btn.dataset.text
    ta.dispatchEvent(new Event('input'))
    ta.focus()
}
window.fillSample = fillSample

function randomSample() {
    const ta = document.getElementById('reviewInput')
    if (!ta) return
    const idx = Math.floor(Math.random() * SAMPLES.length)
    ta.value = SAMPLES[idx]
    ta.dispatchEvent(new Event('input'))
    ta.focus()
}
window.randomSample = randomSample

function clearPredict() {
    const ta = document.getElementById('reviewInput')
    if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input')); ta.focus() }
    document.getElementById('resultPanel').innerHTML = `
        <div class="result-empty" role="presentation">
            <div class="result-empty-icon" aria-hidden="true">🎬</div>
            <p class="result-empty-text">Your sentiment analysis result will appear here</p>
        </div>`
}
window.clearPredict = clearPredict

/* ── Main predict ────────────────────────────────────────── */
async function predict() {
    const ta      = document.getElementById('reviewInput')
    const btn     = document.getElementById('predictBtn')
    const panel   = document.getElementById('resultPanel')
    const review  = ta?.value?.trim()

    if (!review || review.length < 10) {
        toast('warning', 'Too Short', 'Please enter at least 10 characters.')
        ta?.focus()
        return
    }

    // Loading state
    setBtn(btn, true)
    panel.innerHTML = buildThinking()

    try {
        const res = await fetch(`${API}/predict`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ review }),
            signal:  AbortSignal.timeout(30000),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()
        panel.innerHTML = buildResultCard(data)
        animateResultCard(data)

        // Save to analytics history
        if (typeof addToHistory === 'function') addToHistory(data)

        toast('success', 'Analysis Complete', `Sentiment: ${data.sentiment}`)

    } catch (err) {
        panel.innerHTML = buildErrorCard(err.message)
        toast('error', 'Prediction Failed', err.message)
    } finally {
        setBtn(btn, false)
    }
}
window.predict = predict

/* ── UI builders ─────────────────────────────────────────── */
function buildThinking() {
    return `
    <div class="thinking-card" role="status" aria-label="Analyzing…">
        <span class="thinking-brain" aria-hidden="true">🧠</span>
        <p class="thinking-text">Analyzing sentiment…</p>
        <div class="thinking-dots" aria-hidden="true">
            <span></span><span></span><span></span>
        </div>
        <p style="font-size:12px;color:var(--text-3);margin-top:14px">
            Bi-LSTM model is processing your review
        </p>
    </div>`
}

function buildResultCard(d) {
    const isPos = d.sentiment?.toLowerCase().includes('positive')
    const cls   = isPos ? 'positive' : 'negative'
    const emoji = isPos ? '😊' : '😞'
    const circ  = 2 * Math.PI * 52   // circumference for r=52
    const offset = circ - (d.confidence / 100) * circ

    return `
    <div class="result-card ${cls}" role="region" aria-label="Sentiment result">
        <div class="result-hdr">
            <span class="result-hdr-label">Analysis Result</span>
            <span class="s-badge ${cls}" aria-label="Sentiment: ${d.sentiment}">
                <span class="s-badge-dot" aria-hidden="true"></span>
                ${d.sentiment}
            </span>
        </div>

        <div class="result-stats-row">
            <div class="stat-box">
                <div class="stat-box-label">Confidence</div>
                <div class="stat-box-val" id="confVal">0%</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-label">Probability</div>
                <div class="stat-box-val" id="probVal">0.0000</div>
            </div>
        </div>

        <!-- SVG Gauge -->
        <div class="gauge-wrap" aria-hidden="true">
            <svg class="gauge-svg" width="130" height="130" viewBox="0 0 130 130">
                <circle class="gauge-track" cx="65" cy="65" r="52"/>
                <circle class="gauge-fill ${cls}" id="gaugeFill" cx="65" cy="65" r="52"
                    stroke-dasharray="${circ.toFixed(2)}"
                    stroke-dashoffset="${circ.toFixed(2)}"/>
                <text x="65" y="60" text-anchor="middle" class="gauge-pct" id="gaugePct">0%</text>
                <text x="65" y="76" text-anchor="middle" class="gauge-sub">Confidence</text>
            </svg>
        </div>

        <!-- Progress bar -->
        <div class="prog-wrap" aria-label="Confidence ${d.confidence}%">
            <div class="prog-meta">
                <span>Model confidence</span>
                <span>${d.confidence}%</span>
            </div>
            <div class="prog-track">
                <div class="prog-fill ${cls}" id="progFill" style="width:0%" role="progressbar"
                     aria-valuenow="${d.confidence}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        </div>

        <!-- Quote -->
        <div class="result-quote" aria-label="Reviewed text">
            ${escapeHtml(d.review.length > 200 ? d.review.slice(0, 200) + '…' : d.review)}
        </div>

        <!-- Emoji reaction -->
        <div style="text-align:center;font-size:36px;margin-top:14px;animation:starPop .5s .3s ease both both;opacity:0"
             id="resultEmoji" aria-hidden="true">${emoji}</div>
    </div>

    <!-- Hidden data for animation -->
    <script>
        window._lastResult = ${JSON.stringify({ confidence: d.confidence, probability: d.probability })}
    <\/script>`
}

function buildErrorCard(msg) {
    return `
    <div class="result-card" style="border-color:var(--negative-bd)">
        <div style="text-align:center;padding:20px">
            <div style="font-size:40px;margin-bottom:12px">❌</div>
            <p style="font-size:15px;font-weight:600;color:var(--negative);margin-bottom:8px">Prediction Failed</p>
            <p style="font-size:13px;color:var(--text-3)">${escapeHtml(msg)}</p>
            <button class="btn btn-ghost btn-sm mt-4" onclick="predict()">↺ Retry</button>
        </div>
    </div>`
}

function animateResultCard(d) {
    // Animate confidence value
    animateNumber('confVal', 0, d.confidence, 1200, v => v.toFixed(2) + '%')
    animateNumber('probVal', 0, d.probability, 1200, v => v.toFixed(4))

    // Animate gauge
    const circ   = 2 * Math.PI * 52
    const target = circ - (d.confidence / 100) * circ
    const fill   = document.getElementById('gaugeFill')
    const pct    = document.getElementById('gaugePct')
    const prog   = document.getElementById('progFill')
    const emoji  = document.getElementById('resultEmoji')

    requestAnimationFrame(() => {
        setTimeout(() => {
            if (fill) fill.style.strokeDashoffset = target
            if (prog) prog.style.width = d.confidence + '%'
        }, 80)
    })

    // Gauge text counter
    let start = null
    function stepGauge(ts) {
        if (!start) start = ts
        const p    = Math.min((ts - start) / 1200, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        if (pct) pct.textContent = (ease * d.confidence).toFixed(1) + '%'
        if (p < 1) requestAnimationFrame(stepGauge)
    }
    requestAnimationFrame(stepGauge)

    // Emoji pop
    if (emoji) { emoji.style.opacity = '1'; emoji.style.animation = 'starPop .5s .3s ease both' }
}

/* ── Utility ─────────────────────────────────────────────── */
function animateNumber(id, from, to, duration, fmt) {
    const el = document.getElementById(id)
    if (!el) return
    let start = null
    function step(ts) {
        if (!start) start = ts
        const p    = Math.min((ts - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        el.textContent = fmt(from + ease * (to - from))
        if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
}

function setBtn(btn, loading) {
    if (!btn) return
    btn.disabled = loading
    const label   = btn.querySelector('.btn-label')
    const spinner = btn.querySelector('.spinner')
    if (label)   label.textContent = loading ? 'Analyzing…' : '⚡ Analyze Sentiment'
    if (spinner) spinner.classList.toggle('hidden', !loading)
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
window.escapeHtml = escapeHtml

/* ── Keyboard shortcut (Ctrl+Enter) ─────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initCharCounter()

    document.getElementById('reviewInput')?.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') predict()
    })
})
