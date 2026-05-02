import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id,
        name,
        brand,
        category,
        serving_size,
        calories,
        carbs_g,
        sugar_g,
        sodium_mg,
        caffeine_mg,
        protein_g,
        fat_g,
        notes,
        is_favorite,
        created_at
      FROM food_items
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[foods GET]', err)
    return NextResponse.json({ error: 'Failed to fetch foods' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name,
      brand,
      category,
      serving_size,
      calories,
      carbs_g,
      sugar_g,
      sodium_mg,
      caffeine_mg,
      protein_g,
      fat_g,
      notes,
      is_favorite,
    } = body

    const rows = await sql`
      INSERT INTO food_items
        (name, brand, category, serving_size, calories, carbs_g, sugar_g, sodium_mg, caffeine_mg, protein_g, fat_g, notes, is_favorite)
      VALUES
        (${name}, ${brand ?? null}, ${category}, ${serving_size}, ${calories ?? 0},
         ${carbs_g ?? 0}, ${sugar_g ?? null}, ${sodium_mg ?? null}, ${caffeine_mg ?? null},
         ${protein_g ?? null}, ${fat_g ?? null}, ${notes ?? null}, ${is_favorite ?? false})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('[foods POST]', err)
    return NextResponse.json({ error: 'Failed to create food' }, { status: 500 })
  }
}
