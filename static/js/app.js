/* ============================================================
   CineAI — Core App  (particles · navbar · health · toast · AOS)
   ============================================================ */

const API = 'http://localhost:8080'

/* ── Toast ───────────────────────────────────────────────── */
function toast(type, title, msg, duration = 4000) {
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' }
    const container = document.getElementById('toast-container')
    const el = document.createElement('div')
    el.className = `toast ${type}`
    el.setAttribute('role', 'alert')
    el.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icons[type]||'💬'}</span>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
        </div>`

    el.addEventListener('click', () => removeToast(el))
    container.appendChild(el)

    if (duration > 0) setTimeout(() => removeToast(el), duration)
    return el
}

function removeToast(el) {
    if (!el || !el.parentNode) return
    el.classList.add('removing')
    el.addEventListener('animationend', () => el.remove(), { once: true })
}

window.toast = toast

/* ── Particle Background ─────────────────────────────────── */
function initParticles() {
    const canvas = document.getElementById('particleCanvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W, H, particles = [], raf

    const COLORS  = ['#f5c518', '#8b5cf6', '#3b82f6', '#10b981']
    const COUNT   = window.innerWidth < 768 ? 45 : 80
    const MAX_DIST = 120

    function resize() {
        W = canvas.width  = window.innerWidth
        H = canvas.height = window.innerHeight
    }

    class Particle {
        constructor() { this.reset(true) }
        reset(rand = false) {
            this.x  = rand ? Math.random() * W : (Math.random() > .5 ? -10 : W + 10)
            this.y  = Math.random() * H
            this.vx = (Math.random() - .5) * .32
            this.vy = (Math.random() - .5) * .32
            this.r  = Math.random() * 1.4 + .5
            this.a  = Math.random() * .45 + .08
            this.c  = COLORS[Math.floor(Math.random() * COLORS.length)]
        }
        update() {
            this.x += this.vx
            this.y += this.vy
            if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) this.reset()
        }
        draw() {
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
            ctx.fillStyle = this.c
            ctx.globalAlpha = this.a
            ctx.fill()
        }
    }

    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < COUNT; i++) particles.push(new Particle())

    function frame() {
        ctx.clearRect(0, 0, W, H)
        ctx.globalAlpha = 1

        // Connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x
                const dy = particles[i].y - particles[j].y
                const d  = Math.sqrt(dx * dx + dy * dy)
                if (d < MAX_DIST) {
                    ctx.beginPath()
                    ctx.moveTo(particles[i].x, particles[i].y)
                    ctx.lineTo(particles[j].x, particles[j].y)
                    ctx.strokeStyle = '#f5c518'
                    ctx.globalAlpha = (1 - d / MAX_DIST) * .06
                    ctx.lineWidth   = .5
                    ctx.stroke()
                }
            }
        }

        ctx.globalAlpha = 1
        particles.forEach(p => { p.update(); p.draw() })
        ctx.globalAlpha = 1

        raf = requestAnimationFrame(frame)
    }

    frame()

    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf)
        else frame()
    })
}

/* ── Navbar ──────────────────────────────────────────────── */
function initNavbar() {
    const navbar = document.getElementById('navbar')
    const hamburger = document.getElementById('hamburger')
    const navLinks  = document.getElementById('navLinks')

    // Scroll class
    window.addEventListener('scroll', () => {
        navbar?.classList.toggle('scrolled', window.scrollY > 40)
        updateActiveLink()
    }, { passive: true })

    // Hamburger
    hamburger?.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open')
        hamburger.classList.toggle('active', open)
        hamburger.setAttribute('aria-expanded', String(open))
    })

    // Close on link click
    navLinks?.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open')
            hamburger?.classList.remove('active')
            hamburger?.setAttribute('aria-expanded', 'false')
        })
    })

    // Active section highlight
    function updateActiveLink() {
        const sections = document.querySelectorAll('section[id]')
        let current = ''
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 100) current = sec.id
        })
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.classList.toggle('active', link.dataset.section === current)
        })
    }
}

/* ── Ripple effect on .btn-ripple buttons ────────────────── */
function initRipple() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn-ripple')
        if (!btn) return
        const rect   = btn.getBoundingClientRect()
        const ripple = document.createElement('span')
        const size   = Math.max(rect.width, rect.height)
        ripple.className = 'ripple'
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`
        btn.appendChild(ripple)
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    })
}

/* ── Health Check ────────────────────────────────────────── */
async function checkHealth() {
    const pill = document.getElementById('navHealth')
    const txt  = document.getElementById('navHealthText')
    const grid = document.getElementById('healthGrid')
    const hint = document.getElementById('healthLastChecked')

    try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        // Navbar pill
        if (pill) { pill.className = 'health-pill online'; if(txt) txt.textContent = 'Online' }

        // Health cards
        if (grid) {
            grid.innerHTML = `
            <div class="hcard online" data-aos="fade-up" data-aos-delay="0">
                <div class="hcard-pulse" aria-hidden="true"></div>
                <div class="hcard-icon" aria-hidden="true">🌐</div>
                <div class="hcard-body">
                    <div class="hcard-label">API Status</div>
                    <div class="hcard-value">Running</div>
                    <div class="hcard-meta">FastAPI · Uvicorn</div>
                </div>
            </div>
            <div class="hcard online" data-aos="fade-up" data-aos-delay="80">
                <div class="hcard-pulse" aria-hidden="true"></div>
                <div class="hcard-icon" aria-hidden="true">🤖</div>
                <div class="hcard-body">
                    <div class="hcard-label">Model</div>
                    <div class="hcard-value" title="${data.model}">${data.model || 'Bi-LSTM Classifier'}</div>
                    <div class="hcard-meta">Deep Learning · NLP</div>
                </div>
            </div>
            <div class="hcard online" data-aos="fade-up" data-aos-delay="160">
                <div class="hcard-pulse" aria-hidden="true"></div>
                <div class="hcard-icon" aria-hidden="true">📌</div>
                <div class="hcard-body">
                    <div class="hcard-label">Version</div>
                    <div class="hcard-value">${data.version || '1.0.0'}</div>
                    <div class="hcard-meta">Endpoint: /health</div>
                </div>
            </div>`
            AOS.refresh()
        }

        if (hint) hint.textContent = `Last checked: ${new Date().toLocaleTimeString()}`

    } catch (err) {
        if (pill) { pill.className = 'health-pill offline'; if(txt) txt.textContent = 'Offline' }

        if (grid) {
            grid.innerHTML = `
            <div class="hcard offline">
                <div class="hcard-icon" aria-hidden="true">🔴</div>
                <div class="hcard-body">
                    <div class="hcard-label">API Status</div>
                    <div class="hcard-value">Unreachable</div>
                    <div class="hcard-meta">Is the server running?</div>
                </div>
            </div>
            <div class="hcard offline">
                <div class="hcard-icon" aria-hidden="true">🤖</div>
                <div class="hcard-body">
                    <div class="hcard-label">Model</div>
                    <div class="hcard-value">Unknown</div>
                    <div class="hcard-meta">Cannot connect</div>
                </div>
            </div>
            <div class="hcard offline">
                <div class="hcard-icon" aria-hidden="true">📌</div>
                <div class="hcard-body">
                    <div class="hcard-label">Version</div>
                    <div class="hcard-value">—</div>
                    <div class="hcard-meta">${err.message}</div>
                </div>
            </div>`
        }

        if (hint) hint.textContent = `Last checked: ${new Date().toLocaleTimeString()} · Failed`
        toast('error', 'API Unavailable', 'Could not reach localhost:8080. Is the server running?')
    }
}

window.checkHealth = checkHealth

/* ── Counter animation ───────────────────────────────────── */
function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count)
        const duration = 1800
        const start = performance.now()

        function step(now) {
            const p = Math.min((now - start) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 3)
            el.textContent = (ease * target).toFixed(2) + '%'
            if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    })
}

/* ── Performance bars animation ──────────────────────────── */
function animatePerfBars() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return
            entry.target.querySelectorAll('.perf-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.target + '%'
            })
            obs.unobserve(entry.target)
        })
    }, { threshold: .3 })

    document.querySelectorAll('#model').forEach(s => obs.observe(s))
}

/* ── Scroll reveal ───────────────────────────────────────── */
function initScrollReveal() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
        })
    }, { threshold: .12 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
}

/* ── Counter reveal (for metric cards) ──────────────────── */
function initCounterReveal() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                animateCounters()
                obs.disconnect()
            }
        })
    }, { threshold: .5 })

    const grid = document.querySelector('.metrics-grid')
    if (grid) obs.observe(grid)
}

/* ── Health auto-refresh every 30s ──────────────────────── */
function initHealthRefresh() {
    checkHealth()
    setInterval(checkHealth, 30000)
}

/* ── AOS init ────────────────────────────────────────────── */
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 700,
            easing: 'ease-out-cubic',
            once: true,
            offset: 60,
        })
    }
}

/* ── Keyboard shortcuts ──────────────────────────────────── */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Ctrl+Enter: trigger analyze (handled per page)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const predictBtn = document.getElementById('predictBtn')
            if (predictBtn && document.activeElement?.id === 'reviewInput') predictBtn.click()

            const batchBtn = document.getElementById('batchAnalyzeBtn')
            if (batchBtn) batchBtn.click()
        }
        // Escape: close mobile menu
        if (e.key === 'Escape') {
            document.getElementById('navLinks')?.classList.remove('open')
            document.getElementById('hamburger')?.classList.remove('active')
        }
    })
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initAOS()
    initParticles()
    initNavbar()
    initRipple()
    initScrollReveal()
    initCounterReveal()
    animatePerfBars()
    initKeyboardShortcuts()
    initHealthRefresh()
})
