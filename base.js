/* Small CDN loader with progressive UI and init callbacks */
window.addEventListener('DOMContentLoaded', () => {
  const scripts = [
    'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
  ]
  
  // Configuration
  const showSpinnerAfter = 300 // ms before showing spinner/details
  const perScriptTimeout = 15000 // ms
  
  // State
  let loadedScripts = []
  let erroredScripts = []
  let isReady = false
  const readyCallbacks = []
  
  // Expose a small API for registering init callbacks
  window.onCdnReady = function (cb) {
    if (typeof cb !== 'function') return
    if (isReady) cb()
    else readyCallbacks.push(cb)
  }
  
  // Allow inspecting loader state (optional)
  window._cdnLoaderState = () => ({
    scripts: scripts.slice(),
    loaded: loadedScripts.slice(),
    errors: erroredScripts.slice(),
    isReady
  })
  
  // Create overlay (starts minimal — just text). We progressively enhance it.
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
    'background:rgba(255,255,255,0.9)',
    'color:#111',
    'z-index:99999',
    'backdrop-filter:blur(2px)',
    'transition:opacity 200ms ease'
  ].join(';')
  
  // Minimal content shown immediately
  const content = document.createElement('div')
  content.style.cssText = 'font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; font-size:14px; color:inherit; padding:12px;'
  content.textContent = 'Loading...'
  overlay.appendChild(content)
  
  document.body.appendChild(overlay)
  const originalOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  
  // Create enhanced UI (spinner + status). Initially hidden; will be inserted after timeout if needed.
  function createDetailedUI() {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;max-width:420px;text-align:center'
  
    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    spinner.setAttribute('width', '48')
    spinner.setAttribute('height', '48')
    spinner.setAttribute('viewBox', '0 0 50 50')
    spinner.setAttribute('aria-hidden', 'true')
    spinner.innerHTML = `
      <circle cx="25" cy="25" r="20" fill="none" stroke="#e5e7eb" stroke-width="5"></circle>
      <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
      </path>
    `
  
    const status = document.createElement('div')
    status.style.cssText = 'font-size:13px;color:#374151;'
    status.textContent = `Loaded ${loadedScripts.length} of ${scripts.length} resources...`
  
    const details = document.createElement('div')
    details.style.cssText = 'font-size:12px;color:#6b7280;max-height:160px;overflow:auto;padding-top:6px;width:100%'
    details.id = 'cdn-loader-details'
    details.textContent = loadedScripts.concat(erroredScripts).length === 0 ? 'Starting…' : generateDetailsText()
  
    wrapper.appendChild(spinner)
    wrapper.appendChild(status)
    wrapper.appendChild(details)
  
    return { wrapper, status, details }
  }
  
  function generateDetailsText() {
    return scripts.map(s => {
      if (loadedScripts.includes(s)) return `✓ ${s}`
      if (erroredScripts.includes(s)) return `✗ ${s}`
      return `• ${s}`
    }).join('\n')
  }
  
  let detailedUI = null
  const detailedTimer = setTimeout(() => {
    detailedUI = createDetailedUI()
  
    // Replace minimal content with detailed UI
    overlay.replaceChild(detailedUI.wrapper, content)
  }, showSpinnerAfter)
  
  function updateDetailedStatus() {
    if (!detailedUI) return
    detailedUI.status.textContent = `Loaded ${loadedScripts.length} of ${scripts.length} resources...`
    detailedUI.details.textContent = generateDetailsText()
  }
  
  function loadScript(src, timeout = perScriptTimeout) {
    return new Promise((resolve, reject) => {
      if (Array.from(document.scripts).some(s => s.src === src)) {
        // already present
        if (!loadedScripts.includes(src)) loadedScripts.push(src)
        updateDetailedStatus()
        resolve(src)
        return
      }
  
      const script = document.createElement('script')
      script.src = src
      script.async = true
  
      let didFinish = false
  
      script.onload = () => {
        if (didFinish) return
        didFinish = true
        loadedScripts.push(src)
        updateDetailedStatus()
        resolve(src)
      }
  
      script.onerror = () => {
        if (didFinish) return
        didFinish = true
        erroredScripts.push(src)
        updateDetailedStatus()
        reject(new Error('Failed to load ' + src))
      }
  
      document.head.appendChild(script)
  
      if (timeout > 0) {
        setTimeout(() => {
          if (didFinish) return
          didFinish = true
          erroredScripts.push(src)
          updateDetailedStatus()
          reject(new Error('Timeout loading ' + src))
        }, timeout)
      }
    })
  }
  
  // Start loading all scripts in parallel. Use Promise.all so we fail fast if any script fails.
  Promise.all(scripts.map(src => loadScript(src)))
    .then(() => {
      // All scripts loaded
      isReady = true
  
      // Give a tiny delay so UI changes are visible
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 200)
      document.body.style.overflow = originalOverflow
  
      // Run registered callbacks
      try {
        readyCallbacks.forEach(cb => {
          try { cb() } catch (e) { console.error('onCdnReady callback error', e) }
        })
      } finally {
        // clear callbacks reference
        readyCallbacks.length = 0
      }
    })
    .catch((err) => {
      console.error(err)
      clearTimeout(detailedTimer)
  
      // Show friendly error with retry
      overlay.innerHTML = `\n        <div style="text-align:center;max-width:360px;">\n          <div style="color:#b91c1c;font-weight:600;margin-bottom:6px;">Failed to load resources</div>\n          <div style="font-size:13px;color:#374151;margin-bottom:12px;">Some external resources failed to load. This may be a network issue.</div>\n          <div style=\"font-size:12px;color:#6b7280;white-space:pre-wrap;text-align:left;margin-bottom:12px;\">${generateDetailsText()}</div>\n          <div>\n            <button id=\"cdn-retry\" style=\"padding:8px 12px;border-radius:6px;border:1px solid #111;background:#111;color:#fff;cursor:pointer\">Retry</button>\n          </div>\n        </div>\n      `
  
      const retry = overlay.querySelector('#cdn-retry')
      if (retry) {
        retry.addEventListener('click', () => {
          overlay.remove()
          location.reload()
        })
      }
  
      document.body.style.overflow = originalOverflow
    })
  
  // Keep original dark classes (Tailwind enhances them once loaded)
  document.body.classList.add('dark:bg-black', 'dark:text-white')
})
