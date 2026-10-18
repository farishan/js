window.addEventListener('DOMContentLoaded', () => {
  const scripts = [
    'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
  ]

  const overlay = document.createElement('div')
  overlay.id = 'cdn-loader'
  overlay.setAttribute('role', 'status')
  overlay.setAttribute('aria-live', 'polite')
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(255,255,255,0.92)',
    'color:#111',
    'z-index:99999',
    'backdrop-filter:blur(2px)',
    'transition:opacity 200ms ease'
  ].join(';')

  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <svg width="48" height="48" viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" stroke-width="5" />
        <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
        </path>
      </svg>
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; font-size:14px; color:inherit;">Loading resources…</div>
    </div>
  `

  document.body.appendChild(overlay)
  const originalOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  function loadScript(src, timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (Array.from(document.scripts).some(s => s.src === src)) {
        resolve(src)
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve(src)
      script.onerror = () => reject(new Error('Failed to load ' + src))
      document.head.appendChild(script)

      if (timeout > 0) {
        setTimeout(() => reject(new Error('Timeout loading ' + src)), timeout)
      }
    })
  }

  Promise.all(scripts.map(src => loadScript(src)))
    .then(() => {
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 250)
      document.body.style.overflow = originalOverflow
    })
    .catch((err) => {
      console.error(err)
      overlay.innerHTML = `
        <div style="text-align:center;max-width:320px;">
          <div style="color:#b91c1c;font-weight:600;margin-bottom:6px;">Failed to load resources</div>
          <div style="font-size:13px;color:#374151;margin-bottom:12px;">Some external resources failed to load. This may be a network issue.</div>
          <div>
            <button id="cdn-retry" style="padding:8px 12px;border-radius:6px;border:1px solid #111;background:#111;color:#fff;cursor:pointer">Retry</button>
          </div>
        </div>
      `

      const retry = overlay.querySelector('#cdn-retry')
      if (retry) {
        retry.addEventListener('click', () => {
          overlay.remove()
          location.reload()
        })
      }

      document.body.style.overflow = originalOverflow
    })

  document.body.className = 'dark:bg-black dark:text-white'
})
