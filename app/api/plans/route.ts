import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const sql = neon(process.env.DATABASE_URL!)

async function getSession() {
  const hdrs = await headers()
  return auth.api.getSession({ headers: hdrs })
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      SELECT * FROM ride_plans
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[plans GET]', err)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name, date, area, duration, distance, elevation,
      intensity, temperature, weather, foods, notes,
    } = body

    const rows = await sql`
      INSERT INTO ride_plans
        (user_id, name, date, area, duration, distance, elevation, intensity, temperature, weather, foods, notes)
      VALUES
        (${session.user.id}, ${name}, ${date ?? null}, ${area ?? null},
         ${duration}, ${distance ?? null}, ${elevation ?? null},
         ${intensity}, ${temperature ?? null},
         ${weather ? JSON.stringify(weather) : null},
         ${JSON.stringify(foods ?? [])},
         ${notes ?? null})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('[plans POST]', err)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
