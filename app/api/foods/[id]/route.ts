import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
      UPDATE food_items SET
        name = COALESCE(${name ?? null}, name),
        brand = ${brand !== undefined ? brand : null},
        category = COALESCE(${category ?? null}, category),
        serving_size = COALESCE(${serving_size ?? null}, serving_size),
        calories = COALESCE(${calories ?? null}, calories),
        carbs_g = COALESCE(${carbs_g ?? null}, carbs_g),
        sugar_g = ${sugar_g !== undefined ? sugar_g : null},
        sodium_mg = ${sodium_mg !== undefined ? sodium_mg : null},
        caffeine_mg = ${caffeine_mg !== undefined ? caffeine_mg : null},
        protein_g = ${protein_g !== undefined ? protein_g : null},
        fat_g = ${fat_g !== undefined ? fat_g : null},
        notes = ${notes !== undefined ? notes : null},
        is_favorite = COALESCE(${is_favorite !== undefined ? is_favorite : null}, is_favorite)
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('[foods PATCH]', err)
    return NextResponse.json({ error: 'Failed to update food' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM food_items WHERE id = ${id}`
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[foods DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete food' }, { status: 500 })
  }
}
