import { useEffect, useMemo, useRef, useState } from 'react'
import MapView from './components/MapView.jsx'
import AddressInput from './components/AddressInput.jsx'
import Flag from './components/Flag.jsx'
import { TEXTS } from './i18n.js'
import { load, save } from './storage.js'
import { TOKEN, MapboxError, getRoute, reverseGeocode } from './mapbox.js'

const MODES = ['driving', 'cycling', 'walking']
const MODE_ICON = { driving: '🚗', cycling: '🚲', walking: '🚶' }

// Formatera avstånd och tid för visning
const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)
function fmtTime(s) {
  const min = Math.max(1, Math.round(s / 60))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}
const sameSpot = (a, b) => a && b && a.lng === b.lng && a.lat === b.lat

export default function App() {
  // Allt som sparas mellan besök läses från localStorage
  const [lang, setLang] = useState(() => load('lang', 'sv'))
  const [mode, setMode] = useState(() => load('mode', 'driving'))
  const [from, setFrom] = useState(() => load('from', null))
  const [to, setTo] = useState(() => load('to', null))
  const [favs, setFavs] = useState(() => load('favs', []))
  const [route, setRoute] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(TOKEN ? '' : 'keyMissing')
  const [panelOpen, setPanelOpen] = useState(true)
  // Vilket fält som är aktivt: dit hamnar nästa favorit
  const [activeField, setActiveField] = useState('from')
  const t = TEXTS[lang]

  useEffect(() => { save('lang', lang); document.documentElement.lang = lang }, [lang])
  useEffect(() => save('mode', mode), [mode])
  useEffect(() => save('from', from), [from])
  useEffect(() => save('to', to), [to])
  useEffect(() => save('favs', favs), [favs])

  // Hämta ny rutt när start, mål eller färdsätt ändras
  useEffect(() => {
    if (!TOKEN || !from || !to) { setRoute(null); return }
    let cancelled = false
    setBusy(true)
    getRoute(mode, from, to)
      .then((r) => { if (!cancelled) { setRoute(r); setError(r ? '' : 'noRoute') } })
      .catch((e) => { if (!cancelled) handleError(e) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [from, to, mode])

  function handleError(e) {
    if (e instanceof MapboxError) setError(e.kind === 'key' ? 'keyInvalid' : 'networkError')
    else setError('networkError')
  }

  // Klick på kartan: fyll först start, sedan mål, därefter börja om
  async function onMapClick(ll) {
    if (!TOKEN) return
    const pt = { lng: ll.lng, lat: ll.lat, label: t.pickedOnMap }
    try {
      const addr = await reverseGeocode(ll.lng, ll.lat, lang)
      if (addr) pt.label = addr
    } catch (e) { handleError(e) }
    if (!from) { setFrom(pt); setActiveField('to') }
    else if (!to) { setTo(pt); setActiveField('to') }
    else { setFrom(pt); setTo(null); setActiveField('to') }
  }

  // Fyll ett fält och flytta markeringen till nästa tomma (annars ligger den kvar)
  // alwaysSwitch (favorit): byt alltid till det andra fältet
  function fill(field, pt, alwaysSwitch = false) {
    if (field === 'from') {
      setFrom(pt)
      setActiveField(alwaysSwitch || !to ? 'to' : 'from')
    } else {
      setTo(pt)
      setActiveField(alwaysSwitch || !from ? 'from' : 'to')
    }
  }

  // Dragen markör: hämta ny adress och uppdatera
  async function onPinMoved(key, ll) {
    const pt = { lng: ll.lng, lat: ll.lat, label: t.pickedOnMap }
    try { const a = await reverseGeocode(ll.lng, ll.lat, lang); if (a) pt.label = a } catch { /* behåll standardtext */ }
    if (key === 'from') setFrom(pt)
    else setTo(pt)
  }

  const isFav = (p) => !!p && favs.some((f) => sameSpot(f, p))
  const toggleFav = (p) =>
    setFavs((fs) => (fs.some((f) => sameSpot(f, p)) ? fs.filter((f) => !sameSpot(f, p)) : [...fs, p]))
  // Flytta en favorit från index a till index b (pilar och dra-och-släpp)
  const moveFav = (a, b) =>
    setFavs((fs) => {
      if (a === b || b < 0 || b >= fs.length) return fs
      const next = [...fs]
      next.splice(b, 0, next.splice(a, 1)[0])
      return next
    })
  // Efter en pilflytt: ge fokus till samma rad, så man kan trycka igen
  const pendingFocus = useRef(null)
  const [dragIdx, setDragIdx] = useState(null) // rad som dras
  const [overIdx, setOverIdx] = useState(null) // rad man släpper över
  useEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    pendingFocus.current = null
    const el = document.querySelector(`[data-fav="${p.idx}-${p.kind}"]:not(:disabled)`)
      || document.querySelector(`[data-fav="${p.idx}-${p.kind === 'up' ? 'down' : 'up'}"]:not(:disabled)`)
    if (el) el.focus()
  }, [favs])
  const arrowMove = (i, d) => {
    pendingFocus.current = { idx: i + d, kind: d < 0 ? 'up' : 'down' }
    moveFav(i, i + d)
  }
  const swap = () => { setFrom(to); setTo(from) }
  const clear = () => { setFrom(null); setTo(null); setRoute(null); setError(TOKEN ? '' : 'keyMissing') }

  // Marginal runt rutten så den inte hamnar bakom panelen
  const padding = useMemo(
    () => (window.innerWidth < 760
      ? { top: 60, bottom: Math.round(window.innerHeight * 0.5), left: 30, right: 30 }
      : { top: 80, bottom: 80, left: 460, right: 80 }),
    [],
  )

  return (
    <div className="app">
      <MapView from={from} to={to} route={route} padding={padding}
        onMapClick={onMapClick} onPinMoved={onPinMoved} onKeyError={() => setError('keyInvalid')} />

      {/* Överkant: titel, färdsätt och språkflaggor */}
      <header className="topbar">
        <h1>{t.title}</h1>
        <div className="top-controls">
          <select className="mode-select" aria-label={t.mode} value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_ICON[m]} {t[m]}</option>)}
          </select>
          <div className="flags" role="group" aria-label={t.language}>
            <button type="button" className={lang === 'sv' ? 'active' : ''} onClick={() => setLang('sv')} aria-label="Svenska" aria-pressed={lang === 'sv'}><Flag code="sv" /></button>
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-label="English" aria-pressed={lang === 'en'}><Flag code="en" /></button>
          </div>
        </div>
      </header>

      {/* Panel: sidopanel på dator, bottenark på mobil */}
      <section className={`panel ${panelOpen ? '' : 'collapsed'}`}>
        <button type="button" className="grab" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} aria-label={t.title}><span /></button>

        {error && <p className="alert" role="alert">{t[error]}</p>}

        <AddressInput id="from" label={t.from} placeholder={t.fromPh} value={from} lang={lang} t={t}
          active={activeField === 'from'} onActivate={() => setActiveField('from')}
          isFav={isFav(from)} onToggleFav={toggleFav} onPick={(p) => fill('from', p)} onError={handleError} />
        <button type="button" className="swap" onClick={swap} aria-label={t.swap} title={t.swap}>⇅</button>
        <AddressInput id="to" label={t.to} placeholder={t.toPh} value={to} lang={lang} t={t}
          active={activeField === 'to'} onActivate={() => setActiveField('to')}
          isFav={isFav(to)} onToggleFav={toggleFav} onPick={(p) => fill('to', p)} onError={handleError} />

        {/* Resultat: avstånd och tid */}
        {busy && <p className="muted">{t.routing}</p>}
        {route && !busy && (
          <div className="readout">
            <div><span className="num">{fmtDist(route.distance)}</span><span className="cap">{t.distance}</span></div>
            <div><span className="num">{fmtTime(route.duration)}</span><span className="cap">{t.time}</span></div>
            <button type="button" className="ghost" onClick={clear}>{t.clear}</button>
          </div>
        )}
        {!route && !busy && !error && <p className="muted">{t.hint}</p>}

        {/* Favoriter: välj som från eller till */}
        <h2>{t.favorites}</h2>
        {favs.length > 0 && <p className="muted fills">{t.filling}: <strong>{activeField === 'from' ? t.from : t.to}</strong></p>}
        {favs.length === 0 && <p className="muted">{t.noFavorites}</p>}
        <ul className="favs">
          {favs.map((f, i) => (
            <li key={`${f.lng},${f.lat}`}
              className={`${dragIdx === i ? 'dragging' : ''} ${overIdx === i && dragIdx !== i ? (dragIdx < i ? 'over-below' : 'over-above') : ''}`}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
              onDragOver={(e) => { e.preventDefault(); if (overIdx !== i) setOverIdx(i) }}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) moveFav(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}>
              <span className="fav-grip" title={t.dragHint} aria-hidden="true">⠿</span>
              {/* Hela adressen är en knapp som fyller det aktiva fältet */}
              <button type="button" className="fav-main" onClick={() => fill(activeField, f, true)}>{f.label}</button>
              <span className="fav-move">
                <button type="button" data-fav={`${i}-up`} disabled={i === 0} onClick={() => arrowMove(i, -1)}
                  aria-label={`${t.moveUp}: ${f.label}`} title={t.moveUp}>▲</button>
                <button type="button" data-fav={`${i}-down`} disabled={i === favs.length - 1} onClick={() => arrowMove(i, 1)}
                  aria-label={`${t.moveDown}: ${f.label}`} title={t.moveDown}>▼</button>
              </span>
              <button type="button" className="fav-del" onClick={() => toggleFav(f)} aria-label={t.removeFav} title={t.removeFav}>✕</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
