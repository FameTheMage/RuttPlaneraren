// Små SVG-flaggor (emoji-flaggor syns som bokstäver på Windows)
export default function Flag({ code }) {
  if (code === 'sv') {
    return (
      <svg viewBox="0 0 24 16" width="26" height="17" aria-hidden="true" className="flag">
        <rect width="24" height="16" fill="#006aa7" />
        <rect x="7" width="3.5" height="16" fill="#fecc00" />
        <rect y="6.25" width="24" height="3.5" fill="#fecc00" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 16" width="26" height="17" aria-hidden="true" className="flag">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.2" />
      <path d="M12 0V16M0 8H24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0V16M0 8H24" stroke="#c8102e" strokeWidth="3" />
    </svg>
  )
}
