const EARTH_RADIUS_MILES = 3958.8

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a))
}

export function formatMiles(miles: number): string {
  return miles < 1 ? '<1 mi' : `${Math.round(miles)} mi`
}

export async function geocodeAddress(
  address1: string,
  city: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address1}, ${city}, ${state}, USA`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'User-Agent': 'ElderDoc/1.0' } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}
