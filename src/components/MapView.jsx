import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { TOKEN } from '../mapbox.js'

const EMPTY = { type: 'FeatureCollection', features: [] }

// Skapar en rund markör med given färg (CSS-klass styr utseendet)
function makeMarker(cls, onDragEnd) {
  const el = document.createElement('div')
  el.className = `pin ${cls}`
  const m = new mapboxgl.Marker({ element: el, draggable: true })
  m.on('dragend', () => onDragEnd(m.getLngLat()))
  return m
}

// Kartan: ritar markörer + rutt, rapporterar klick uppåt
export default function MapView({ from, to, route, onMapClick, onPinMoved, onKeyError, padding }) {
  const box = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const cb = useRef({})
  cb.current = { onMapClick, onPinMoved, onKeyError }

  // Starta kartan en gång
  useEffect(() => {
    if (!TOKEN) return // utan nyckel visar appen ett felmeddelande i stället för karta
    mapboxgl.accessToken = TOKEN
    const m = new mapboxgl.Map({
      container: box.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [18.07, 59.33], // Stockholm som startvy
      zoom: 11,
    })
    map.current = m
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('load', () => {
      // Källa + två lager: bred glöd under, tunn kärna ovanpå
      m.addSource('route', { type: 'geojson', data: EMPTY })
      m.addLayer({
        id: 'route-glow', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#7c5cff', 'line-width': 14, 'line-blur': 10, 'line-opacity': 0.7 },
      })
      m.addLayer({
        id: 'route-core', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#4de1ff', 'line-width': 4 },
      })
      m.fire('route-ready')
    })
    m.on('click', (e) => cb.current.onMapClick(e.lngLat))
    // 401/403 från Mapbox = ogiltig nyckel
    m.on('error', (e) => {
      const s = e && e.error && e.error.status
      if (s === 401 || s === 403) cb.current.onKeyError()
    })
    return () => m.remove()
  }, [])

  // Uppdatera markörer när start/mål ändras
  useEffect(() => {
    const m = map.current
    if (!m) return
    ;[['from', from, 'pin-from'], ['to', to, 'pin-to']].forEach(([key, pt, cls]) => {
      const cur = markers.current[key]
      if (!pt) {
        if (cur) { cur.remove(); delete markers.current[key] }
        return
      }
      // Ny markör: sätt position FÖRE addTo, annars kraschar Mapbox
      const mk = cur || makeMarker(cls, (ll) => cb.current.onPinMoved(key, ll)).setLngLat([pt.lng, pt.lat]).addTo(m)
      mk.setLngLat([pt.lng, pt.lat])
      markers.current[key] = mk
    })
  }, [from, to])

  // Rita rutten och zooma till den
  useEffect(() => {
    const m = map.current
    if (!m) return
    const draw = () => {
      const src = m.getSource('route')
      if (!src) return
      src.setData(route ? { type: 'Feature', geometry: route.geometry } : EMPTY)
      if (route) {
        const b = new mapboxgl.LngLatBounds()
        route.geometry.coordinates.forEach((c) => b.extend(c))
        m.fitBounds(b, { padding, duration: 900 })
      }
    }
    if (m.getSource('route')) draw()
    else m.once('route-ready', draw)
  }, [route, padding])

  // Bara en start- eller slutpunkt: flyg dit
  useEffect(() => {
    const m = map.current
    if (!m) return
    const pt = to || from
    if (pt && !(from && to)) m.flyTo({ center: [pt.lng, pt.lat], zoom: Math.max(m.getZoom(), 13) })
  }, [from, to])

  return <div ref={box} className="map" />
}
