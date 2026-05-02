import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const sql = neon(process.env.DATABASE_URL!)

async function getSession() {
  const hdrs = await headers()
  return auth.api.getSession({ headers: hdrs })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const {
      name, date, area, duration, distance, elevation,
      intensity, temperature, weather, foods, notes,
    } = body

    const rows = await sql`
      UPDATE ride_plans SET
        name        = COALESCE(${name ?? null}, name),
        date        = ${date ?? null},
        area        = ${area ?? null},
        duration    = COALESCE(${duration ?? null}, duration),
        distance    = ${distance ?? null},
        elevation   = ${elevation ?? null},
        intensity   = COALESCE(${intensity ?? null}, intensity),
        temperature = ${temperature ?? null},
        weather     = ${weather ? JSON.stringify(weather) : null},
        foods       = ${JSON.stringify(foods ?? [])},
        notes       = ${notes ?? null},
        updated_at  = now()
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING *
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('[plans PATCH]', err)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await sql`DELETE FROM ride_plans WHERE id = ${id} AND user_id = ${session.user.id}`
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[plans DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
