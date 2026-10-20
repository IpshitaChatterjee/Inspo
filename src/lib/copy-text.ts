// Puts text on the clipboard. Some browsers refuse the modern way (an old
// browser, a page that isn't secure, a denied permission), so it falls back to
// selecting a hidden text box and copying. False only when both are blocked.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Try the old way below.
  }

  // The fallback steals focus; hand it back afterwards.
  const previous = document.activeElement
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  document.body.appendChild(textarea)
  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length) // iOS ignores select()
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    textarea.remove()
    if (previous instanceof HTMLElement) previous.focus()
  }
}
