window.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script')
  script.src = `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`
  document.head.append(script)

  document.body.className = 'dark:bg-black dark:text-white'
})
