'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useFoodLibrary, useRidePlans, calcNutrition } from '@/lib/store'
import type { RideIntensity, RideFoodEntry, RidePlan, WeatherData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NutritionSummary } from './nutrition-summary'
import {
  Plus,
  Minus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Clock,
  Mountain,
  Thermometer,
  Ruler,
  Calendar,
  MapPin,
  Wind,
  Loader2,
  RefreshCw,
} from 'lucide-react'

const INTENSITIES: { value: RideIntensity; label: string; color: string; description: string }[] = [
  { value: 'easy',      label: 'Easy',        color: 'bg-success/20 text-success border-success/40',       description: 'Z1–Z2 recovery' },
  { value: 'endurance', label: 'Endurance',   color: 'bg-chart-3/20 text-chart-3 border-chart-3/40',       description: 'Z2–Z3 base' },
  { value: 'hard',      label: 'Hard',        color: 'bg-warning/20 text-warning border-warning/40',       description: 'Z4–Z5 intervals' },
  { value: 'race',      label: 'Race',        color: 'bg-orange/20 text-orange border-orange/40',           description: 'Max effort' },
  { value: 'freestyle', label: "Don't know",  color: 'bg-muted text-foreground border-border',             description: 'Just riding' },
]

const CATEGORY_LABELS: Record<string, string> = {
  gel: 'Gel', bar: 'Bar', chew: 'Chew', drink: 'Drink', real_food: 'Real Food', supplement: 'Supplement',
}

interface GeoResult { label: string; short: string }

interface PlannerProps {
  initialPlan?: RidePlan
  onSaved?: () => void
}

export function RidePlanner({ initialPlan, onSaved }: PlannerProps) {
  const { foods } = useFoodLibrary()
  const { addPlan, updatePlan } = useRidePlans()

  const [name, setName] = useState(initialPlan?.name ?? '')
  const [date, setDate] = useState<string>(initialPlan?.date ?? '')
  const [area, setArea] = useState<string>(initialPlan?.area ?? '')
  const [duration, setDuration] = useState(initialPlan?.duration ?? 120)
  const [distance, setDistance] = useState<number | undefined>(initialPlan?.distance)
  const [elevation, setElevation] = useState<number | undefined>(initialPlan?.elevation)
  const [intensity, setIntensity] = useState<RideIntensity>(initialPlan?.intensity ?? 'endurance')
  const [temperature, setTemperature] = useState<number | undefined>(initialPlan?.temperature)
  const [weather, setWeather] = useState<WeatherData | undefined>(initialPlan?.weather)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [entries, setEntries] = useState<RideFoodEntry[]>(initialPlan?.foods ?? [])
  const [foodSearch, setFoodSearch] = useState('')
  const [showFoodPicker, setShowFoodPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Geocode dropdown ───────────────────────────────────────────────────────
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [showGeo, setShowGeo] = useState(false)
  const geoRef = useRef<HTMLDivElement>(null)
  const geoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (geoRef.current && !geoRef.current.contains(e.target as Node)) {
        setShowGeo(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const onAreaChange = (val: string) => {
    setArea(val)
    setWeather(undefined)
    setWeatherError(null)
    if (geoDebounce.current) clearTimeout(geoDebounce.current)
    if (val.trim().length < 2) { setGeoResults([]); setShowGeo(false); return }
    geoDebounce.current = setTimeout(async () => {
      setGeoLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}`)
        const data: GeoResult[] = await res.json()
        setGeoResults(data)
        setShowGeo(data.length > 0)
      } catch { /* silent */ }
      finally { setGeoLoading(false) }
    }, 350)
  }

  const selectGeo = (result: GeoResult) => {
    setArea(result.short || result.label)
    setShowGeo(false)
    setGeoResults([])
  }

  // ── Weather ────────────────────────────────────────────────────────────────
  const summary = calcNutrition(entries, foods, duration)

  const fetchWeather = useCallback(async () => {
    if (!area.trim()) return
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(`/api/weather?area=${encodeURIComponent(area.trim())}`)
      if (!res.ok) {
        const data = await res.json()
        setWeatherError(data.error ?? 'Failed to fetch weather')
        return
      }
      const data: WeatherData = await res.json()
      setWeather(data)
      setTemperature(data.temp)
    } catch {
      setWeatherError('Network error — could not fetch weather')
    } finally {
      setWeatherLoading(false)
    }
  }, [area])

  // ── Food picker ────────────────────────────────────────────────────────────
  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
    (f.brand ?? '').toLowerCase().includes(foodSearch.toLowerCase()),
  )

  const addEntry = (foodId: string) => {
    const existing = entries.find((e) => e.foodItemId === foodId)
    if (existing) {
      setEntries((prev) =>
        prev.map((e) => (e.foodItemId === foodId ? { ...e, quantity: e.quantity + 1 } : e)),
      )
    } else {
      setEntries((prev) => [
        ...prev,
        { id: `entry-${Date.now()}`, foodItemId: foodId, quantity: 1 },
      ])
    }
    setFoodSearch('')
    setShowFoodPicker(false)
  }

  const updateQty = (id: string, delta: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, quantity: Math.max(0.5, parseFloat((e.quantity + delta).toFixed(1))) }
          : e,
      ),
    )
  }

  const setQtyDirect = (id: string, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: num } : e)))
  }

  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id))

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const plan = {
        name: name || 'My Ride',
        date: date || undefined,
        area: area || undefined,
        duration,
        distance,
        elevation,
        intensity,
        temperature,
        weather,
        foods: entries,
      }
      if (initialPlan?.id) {
        await updatePlan(initialPlan.id, plan)
      } else {
        await addPlan(plan)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {initialPlan ? 'Edit Ride' : 'Plan a Ride'}
        </h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'gap-1.5 cursor-pointer',
            saved ? 'bg-success hover:bg-success text-white' : 'bg-orange hover:bg-orange-dim text-white',
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Plan'}
        </Button>
      </div>

      {saveError && (
        <p className="text-xs text-destructive-foreground bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* Ride details */}
      <section className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ride Details</h2>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ride name (e.g. Sunday Long Ride)"
          className="bg-background border-border text-foreground placeholder:text-muted-foreground"
        />

        {/* Date + Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date <span className="opacity-60">(optional)</span>
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Area / City <span className="opacity-60">(for weather)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={geoRef}>
                <Input
                  value={area}
                  onChange={(e) => onAreaChange(e.target.value)}
                  placeholder="e.g. London, Paris, NYC"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { setShowGeo(false); fetchWeather() }
                    if (e.key === 'Escape') setShowGeo(false)
                  }}
                  onFocus={() => geoResults.length > 0 && setShowGeo(true)}
                  autoComplete="off"
                />
                {geoLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
                {showGeo && geoResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                    {geoResults.map((r, i) => (
                      <button
                        key={i}
                        onMouseDown={() => selectGeo(r)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex flex-col gap-0.5 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {r.short || r.label}
                        </span>
                        {r.short && (
                          <span className="text-xs text-muted-foreground truncate">{r.label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!area.trim() || weatherLoading}
                onClick={fetchWeather}
                className="shrink-0 border-border cursor-pointer"
                title="Fetch current weather"
              >
                {weatherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Weather result */}
        {weatherError && (
          <p className="text-xs text-destructive-foreground bg-destructive/10 rounded-lg px-3 py-2">{weatherError}</p>
        )}
        {weather && !weatherError && (
          <div className="flex flex-wrap items-center gap-3 bg-chart-3/10 border border-chart-3/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-chart-3" />
              <span className="text-sm font-semibold text-foreground">{weather.temp}°C</span>
              <span className="text-xs text-muted-foreground">feels {weather.feelsLike}°C</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-chart-3" />
              <span className="text-sm font-semibold text-foreground">{weather.windSpeed} km/h</span>
              <span className="text-xs text-muted-foreground">{weather.windDirLabel}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs text-muted-foreground">{weather.description}</span>
            <span className="text-xs text-muted-foreground ml-auto">Humidity {weather.humidity}%</span>
          </div>
        )}

        {/* Intensity */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Intensity</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {INTENSITIES.map((i) => (
              <button
                key={i.value}
                onClick={() => setIntensity(i.value)}
                className={cn(
                  'flex flex-col items-start p-2.5 rounded-lg border text-left transition-colors cursor-pointer',
                  intensity === i.value
                    ? i.color
                    : 'bg-secondary border-border text-muted-foreground hover:border-border/60',
                )}
              >
                <span className="text-xs font-semibold">{i.label}</span>
                <span className="text-[10px] opacity-70">{i.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label="Duration" value={duration} onChange={setDuration} icon={<Clock className="w-3.5 h-3.5" />} unit="min" min={1} />
          <NumberField label="Distance" value={distance} onChange={setDistance} icon={<Ruler className="w-3.5 h-3.5" />} unit="km" placeholder="—" />
          <NumberField label="Elevation" value={elevation} onChange={setElevation} icon={<Mountain className="w-3.5 h-3.5" />} unit="m" placeholder="—" />
          <NumberField label="Temperature" value={temperature} onChange={setTemperature} icon={<Thermometer className="w-3.5 h-3.5" />} unit="°C" placeholder="—" />
        </div>
      </section>

      {/* Food entries */}
      <section className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Food & Drinks
          </h2>
          <button
            onClick={() => setShowFoodPicker(!showFoodPicker)}
            className="flex items-center gap-1 text-orange text-sm font-medium hover:text-orange-dim transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Item
            {showFoodPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Food picker */}
        {showFoodPicker && (
          <div className="bg-secondary rounded-xl p-3 flex flex-col gap-2">
            <Input
              autoFocus
              placeholder="Search food library..."
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {filteredFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No foods found</p>
              ) : (
                filteredFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => addEntry(food.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-orange/10 text-orange">
                        {CATEGORY_LABELS[food.category]}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.brand ? `${food.brand} · ` : ''}
                          {food.serving_size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-warning font-medium">{food.carbs_g}g carbs</p>
                      <p className="text-xs text-muted-foreground">{food.calories} kcal</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Entries list */}
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">No food added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Add Item&quot; to build your nutrition plan</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const food = foods.find((f) => f.id === entry.foodItemId)
              if (!food) return null
              const totalCarbs = (Number(food.carbs_g) * entry.quantity).toFixed(1)
              const totalCals = Math.round(food.calories * entry.quantity)
              return (
                <div key={entry.id} className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-orange/10 text-orange shrink-0">
                    {CATEGORY_LABELS[food.category]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-warning font-medium">{totalCarbs}g carbs</span>
                      {' · '}{totalCals} kcal
                      {' · '}per serving: {food.serving_size}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(entry.id, -0.5)}
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={entry.quantity}
                      min={0.5}
                      step={0.5}
                      onChange={(e) => setQtyDirect(entry.id, e.target.value)}
                      className="w-12 text-center text-sm font-semibold text-foreground bg-background border border-border rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => updateQty(entry.id, 0.5)}
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="w-7 h-7 rounded-lg ml-1 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Summary */}
      {entries.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Fueling Summary
          </h2>
          <NutritionSummary summary={summary} intensity={intensity} />
        </section>
      )}
    </div>
  )
}

// ─── NumberField ──────────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  icon,
  unit,
  min = 0,
  placeholder = '0',
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  icon?: React.ReactNode
  unit: string
  min?: number
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange(e.target.value === '' ? undefined : Math.max(min, v))
          }}
          placeholder={placeholder}
          className="bg-background border-border text-foreground pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  )
}
