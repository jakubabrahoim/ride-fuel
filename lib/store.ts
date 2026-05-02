'use client'

import { useState, useCallback, useEffect } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { FoodItem, RidePlan, RideTemplate, RideFoodEntry } from './types'

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((data) => (Array.isArray(data) ? data : []))

const FOODS_KEY = '/api/foods'

// ─── Food Library (Neon DB via API) ──────────────────────────────────────────

export function useFoodLibrary() {
  const { data: foods = [], isLoading, error } = useSWR<FoodItem[]>(FOODS_KEY, fetcher)

  const addFood = async (body: Omit<FoodItem, 'id' | 'created_at'>) => {
    const res = await fetch(FOODS_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to add food')
    const created: FoodItem = await res.json()
    await globalMutate(FOODS_KEY, (prev: FoodItem[] = []) => [created, ...prev], false)
    return created
  }

  const updateFood = async (id: string, body: Partial<FoodItem>) => {
    const res = await fetch(`${FOODS_KEY}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to update food')
    const updated: FoodItem = await res.json()
    await globalMutate(
      FOODS_KEY,
      (prev: FoodItem[] = []) => prev.map((f) => (f.id === id ? updated : f)),
      false,
    )
    return updated
  }

  const deleteFood = async (id: string) => {
    await fetch(`${FOODS_KEY}/${id}`, { method: 'DELETE' })
    await globalMutate(
      FOODS_KEY,
      (prev: FoodItem[] = []) => prev.filter((f) => f.id !== id),
      false,
    )
  }

  const duplicateFood = async (id: string) => {
    const source = foods.find((f) => f.id === id)
    if (!source) return
    const { id: _id, created_at: _ca, ...rest } = source
    await addFood({ ...rest, name: `${source.name} (copy)` })
  }

  const toggleFavorite = async (id: string) => {
    const food = foods.find((f) => f.id === id)
    if (!food) return
    await updateFood(id, { is_favorite: !food.is_favorite })
  }

  return { foods, isLoading, error, addFood, updateFood, deleteFood, duplicateFood, toggleFavorite }
}

// ─── Generic localStorage hook ───────────────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T) {
  // Always start with `initial` so server and client first render match.
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)

  // After mount, read the real value from localStorage once.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored) as T)
    } catch {
      // corrupted data — keep initial
    }
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // quota exceeded — silently ignore
        }
        return resolved
      })
    },
    [key],
  )

  return [value, set, hydrated] as const
}

// ─── Ride Plans (Neon DB via API) ────────────────────────────────────────────

const PLANS_KEY = '/api/plans'

function mapPlanRow(row: Record<string, unknown>): RidePlan {
  return {
    id: row.id as string,
    name: row.name as string,
    date: (row.date as string | null) ?? undefined,
    area: (row.area as string | null) ?? undefined,
    duration: Number(row.duration),
    distance: row.distance != null ? Number(row.distance) : undefined,
    elevation: row.elevation != null ? Number(row.elevation) : undefined,
    intensity: row.intensity as RidePlan['intensity'],
    temperature: row.temperature != null ? Number(row.temperature) : undefined,
    weather: (row.weather as RidePlan['weather']) ?? undefined,
    foods: (row.foods as RideFoodEntry[]) ?? [],
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useRidePlans() {
  const { data: raw = [], isLoading, error, mutate } = useSWR<Record<string, unknown>[]>(PLANS_KEY, fetcher)
  const plans: RidePlan[] = raw.map(mapPlanRow)
  const hydrated = !isLoading

  const addPlan = async (plan: Omit<RidePlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch(PLANS_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    })
    if (!res.ok) throw new Error('Failed to save plan')
    const created = mapPlanRow(await res.json())
    await mutate((prev = []) => [created as unknown as Record<string, unknown>, ...prev], false)
    return created
  }

  const updatePlan = async (id: string, updates: Partial<RidePlan>) => {
    const res = await fetch(`${PLANS_KEY}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update plan')
    const updated = mapPlanRow(await res.json())
    await mutate(
      (prev = []) => prev.map((p) => (p.id === id ? updated as unknown as Record<string, unknown> : p)),
      false,
    )
    return updated
  }

  const deletePlan = async (id: string) => {
    await fetch(`${PLANS_KEY}/${id}`, { method: 'DELETE' })
    await mutate((prev = []) => prev.filter((p) => p.id !== id), false)
  }

  return { plans, hydrated, isLoading, error, addPlan, updatePlan, deletePlan }
}

// ─── Ride Templates (localStorage) ───────────────────────────────────────────

const SEED_TEMPLATES: RideTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Long Endurance Ride',
    description: '4–6 hour Z2 base ride',
    icon: 'mountain',
    duration: 300,
    distance: 120,
    elevation: 1200,
    intensity: 'endurance',
    temperature: 18,
    foods: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-2',
    name: 'Race Day',
    description: 'Race or max effort event',
    icon: 'trophy',
    duration: 150,
    distance: 80,
    elevation: 800,
    intensity: 'race',
    temperature: 20,
    foods: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-3',
    name: 'Recovery Spin',
    description: 'Easy 1–2 hour recovery',
    icon: 'refresh',
    duration: 75,
    distance: 30,
    intensity: 'easy',
    foods: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function useRideTemplates() {
  const [templates, setTemplates, hydrated] = useLocalStorage<RideTemplate[]>(
    'ridefuel-templates',
    SEED_TEMPLATES,
  )

  const addTemplate = (tmpl: Omit<RideTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const item: RideTemplate = {
      ...tmpl,
      id: `tmpl-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    setTemplates((prev) => [item, ...prev])
    return item
  }

  const updateTemplate = (id: string, updates: Partial<RideTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    )
  }

  const deleteTemplate = (id: string) =>
    setTemplates((prev) => prev.filter((t) => t.id !== id))

  return { templates, hydrated, addTemplate, updateTemplate, deleteTemplate }
}

// ─── Nutrition calculator ─────────────────────────────────────────────────────

export function calcNutrition(
  entries: RideFoodEntry[],
  library: FoodItem[],
  durationMinutes: number,
) {
  let calories = 0, carbs = 0, sugars = 0, sodium = 0, caffeine = 0

  for (const entry of entries) {
    const item = library.find((f) => f.id === entry.foodItemId)
    if (!item) continue
    calories += item.calories * entry.quantity
    carbs += Number(item.carbs_g) * entry.quantity
    sugars += (item.sugar_g ?? 0) * entry.quantity
    sodium += (item.sodium_mg ?? 0) * entry.quantity
    caffeine += (item.caffeine_mg ?? 0) * entry.quantity
  }

  const hours = durationMinutes / 60

  return {
    totalCalories: Math.round(calories),
    totalCarbs: Math.round(carbs),
    totalSugars: Math.round(sugars),
    totalSodium: Math.round(sodium),
    totalCaffeine: Math.round(caffeine),
    carbsPerHour: hours > 0 ? Math.round(carbs / hours) : 0,
    caloriesPerHour: hours > 0 ? Math.round(calories / hours) : 0,
    durationHours: hours,
  }
}
