import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData } from '@/lib/types'

const WIND_DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

function degToCompass(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16
  return WIND_DIRS[idx]
}

export async function GET(req: NextRequest) {
  const area = req.nextUrl.searchParams.get('area')
  if (!area) {
    return NextResponse.json({ error: 'area is required' }, { status: 400 })
  }

  // Use Open-Meteo geocoding + weather (no API key required)
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(area)}&count=1&language=en&format=json`,
      { next: { revalidate: 3600 } },
    )
    const geoData = await geoRes.json()

    if (!geoData.results?.length) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { latitude, longitude } = geoData.results[0]

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m` +
      `&wind_speed_unit=kmh&timezone=auto`,
      { next: { revalidate: 1800 } },
    )
    const weatherJson = await weatherRes.json()

    const c = weatherJson.current
    const weatherData: WeatherData = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      windSpeed: Math.round(c.wind_speed_10m),
      windDir: c.wind_direction_10m,
      windDirLabel: degToCompass(c.wind_direction_10m),
      description: wmoDescription(c.weather_code),
      humidity: c.relative_humidity_2m,
    }

    return NextResponse.json(weatherData)
  } catch (err) {
    console.error('[weather] fetch error', err)
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}

/** WMO weather interpretation codes → human readable */
function wmoDescription(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 84) return 'Snow showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Severe thunderstorm'
}
