// Anrop mot Mapbox Geocoding och Directions. Nyckeln läses från miljön, aldrig hårdkodad.
export const TOKEN = import.meta.env.MAPBOX_API_KEY || ''

// Eget felobjekt så UI kan skilja nyckelfel från nätverksfel
export class MapboxError extends Error {
  constructor(kind) {
    super(kind)
    this.kind = kind // 'key' | 'network'
  }
}

async function getJson(url) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new MapboxError('network')
  }
  if (res.status === 401 || res.status === 403) throw new MapboxError('key')
  if (!res.ok) throw new MapboxError('network')
  return res.json()
}

// Adressförslag medan man skriver
export async function searchAddress(query, lang, near) {
  const prox = near ? `&proximity=${near.lng},${near.lat}` : ''
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=5&language=${lang}${prox}&access_token=${TOKEN}`
  const data = await getJson(url)
  return data.features.map((f) => ({
    label: f.properties.full_address || f.properties.name,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }))
}

// Koordinat -> adress (när man klickar på kartan)
export async function reverseGeocode(lng, lat, lang) {
  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&limit=1&language=${lang}&access_token=${TOKEN}`
  const data = await getJson(url)
  const f = data.features[0]
  return f ? f.properties.full_address || f.properties.name : null
}

// Rutt för valt färdsätt: driving | cycling | walking
export async function getRoute(mode, from, to) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`
  const data = await getJson(url)
  const r = data.routes && data.routes[0]
  if (!r) return null
  return { geometry: r.geometry, distance: r.distance, duration: r.duration }
}
