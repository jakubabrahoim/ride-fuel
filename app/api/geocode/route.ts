import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RideFuel/1.0' },
    })
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const results = (data as Array<{ display_name: string; address?: { city?: string; town?: string; village?: string; country?: string } }>)
      .map((item) => ({
        label: item.display_name,
        short: [
          item.address?.city ?? item.address?.town ?? item.address?.village,
          item.address?.country,
        ]
          .filter(Boolean)
          .join(', '),
      }))
    return NextResponse.json(results)
  } catch (err) {
    console.error('[geocode GET]', err)
    return NextResponse.json([])
  }
}
