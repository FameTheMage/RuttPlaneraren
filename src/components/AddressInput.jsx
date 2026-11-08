import { useEffect, useRef, useState } from 'react'
import { searchAddress } from '../mapbox.js'

// Adressfält med förslag. Stjärnan sparar/tar bort favorit.
export default function AddressInput({ id, label, placeholder, value, lang, active, onActivate, isFav, onToggleFav, onPick, onError, t }) {
  const [text, setText] = useState(value ? value.label : '')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  // Håll texten i synk när punkten sätts utifrån (kartklick, byt plats, favorit)
  useEffect(() => { setText(value ? value.label : '') }, [value])

  // Vänta 300 ms efter sista tangenttryckningen innan vi söker
  function onChange(e) {
    const q = e.target.value
    setText(q)
    clearTimeout(timer.current)
    if (q.trim().length < 3) { setItems([]); return }
    timer.current = setTimeout(async () => {
      try {
        setItems(await searchAddress(q, lang))
        setOpen(true)
      } catch (err) { onError(err) }
    }, 300)
  }

  function pick(it) {
    setOpen(false)
    setItems([])
    onPick(it)
  }

  return (
    <div className={`field ${active ? 'active' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <input
          id={id} value={text} placeholder={placeholder} autoComplete="off"
          onChange={onChange} onClick={onActivate}
          onFocus={() => { onActivate(); if (items.length) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {value && (
          <button type="button" className={`star ${isFav ? 'on' : ''}`} onClick={() => onToggleFav(value)}
            aria-pressed={isFav} aria-label={isFav ? t.removeFav : t.addFav} title={isFav ? t.removeFav : t.addFav}>
            {isFav ? '★' : '☆'}
          </button>
        )}
      </div>
      {open && items.length > 0 && (
        <ul className="suggest">
          {items.map((it, i) => (
            <li key={i}><button type="button" onMouseDown={() => pick(it)}>{it.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  )
}
