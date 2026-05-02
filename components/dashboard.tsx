'use client'

import { useRidePlans, useFoodLibrary, calcNutrition } from '@/lib/store'
import type { RidePlan, RideIntensity, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NutritionSummary } from './nutrition-summary'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Bike,
  Clock,
  Ruler,
  Mountain,
  ChevronRight,
  Trash2,
  Pencil,
  Download,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'

const INTENSITY_COLORS: Record<RideIntensity, string> = {
  easy: 'bg-success/20 text-success',
  endurance: 'bg-chart-3/20 text-chart-3',
  hard: 'bg-warning/20 text-warning',
  race: 'bg-orange/20 text-orange',
  freestyle: 'bg-muted text-muted-foreground',
}

interface DashboardProps {
  onNavigate: (view: AppView) => void
  onEditPlan: (plan: RidePlan) => void
}

export function Dashboard({ onNavigate, onEditPlan }: DashboardProps) {
  const { plans, hydrated, deletePlan } = useRidePlans()
  const { foods } = useFoodLibrary()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exportPlan, setExportPlan] = useState<RidePlan | null>(null)
  const [copied, setCopied] = useState(false)

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  const buildExportJson = (plan: RidePlan) => {
    const summary = calcNutrition(plan.foods, foods, plan.duration)
    const foodDetails = plan.foods.map((entry) => {
      const food = foods.find((f) => f.id === entry.foodItemId)
      return {
        name: food?.name ?? 'Unknown',
        brand: food?.brand ?? null,
        category: food?.category ?? null,
        serving_size: food?.serving_size ?? null,
        quantity: entry.quantity,
        total_calories: food ? food.calories * entry.quantity : 0,
        total_carbs_g: food ? Number((Number(food.carbs_g) * entry.quantity).toFixed(1)) : 0,
        total_sodium_mg: food ? (food.sodium_mg ?? 0) * entry.quantity : 0,
        total_caffeine_mg: food ? (food.caffeine_mg ?? 0) * entry.quantity : 0,
      }
    })
    return JSON.stringify({
      ride: {
        name: plan.name,
        date: plan.date ?? null,
        area: plan.area ?? null,
        duration_min: plan.duration,
        distance_km: plan.distance ?? null,
        elevation_m: plan.elevation ?? null,
        intensity: plan.intensity,
        temperature_c: plan.temperature ?? null,
        weather: plan.weather ?? null,
      },
      nutrition_summary: {
        total_calories: summary.totalCalories,
        total_carbs_g: summary.totalCarbs,
        total_sodium_mg: summary.totalSodium,
        total_caffeine_mg: summary.totalCaffeine,
        carbs_per_hour: summary.carbsPerHour,
        calories_per_hour: summary.caloriesPerHour,
      },
      foods: foodDetails,
    }, null, 2)
  }

  const handleCopy = async (json: string) => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">My Ride Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {!hydrated ? '\u00A0' : plans.length === 0 ? 'No rides planned yet' : `${plans.length} plan${plans.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={() => onNavigate('planner')}
          className="bg-orange hover:bg-orange-dim text-white gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </Button>
      </div>

      {/* Empty state */}
      {hydrated && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange/10 flex items-center justify-center mb-4">
            <Bike className="w-8 h-8 text-orange" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No rides planned</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm text-pretty">
            Create your first ride nutrition plan to start calculating carbs, calories, and fueling strategy.
          </p>
          <Button
            onClick={() => onNavigate('planner')}
            className="mt-5 bg-orange hover:bg-orange-dim text-white gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Plan First Ride
          </Button>
        </div>
      )}

      {/* Plan cards */}
      <div className="flex flex-col gap-3">
        {hydrated && plans.map((plan) => {
          const summary = calcNutrition(plan.foods, foods, plan.duration)
          const isExpanded = expandedId === plan.id

          return (
            <div
              key={plan.id}
              className={cn(
                'bg-card border rounded-xl overflow-hidden transition-colors',
                isExpanded ? 'border-orange/50' : 'border-border hover:border-border/80',
              )}
            >
              {/* Card header — always visible */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => toggle(plan.id)}
              >
                {/* Intensity icon */}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', INTENSITY_COLORS[plan.intensity])}>
                  <Bike className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{plan.name}</h3>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', INTENSITY_COLORS[plan.intensity])}>
                      {plan.intensity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(plan.duration)}
                    </span>
                    {plan.distance && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        {plan.distance} km
                      </span>
                    )}
                    {plan.elevation && (
                      <span className="flex items-center gap-1">
                        <Mountain className="w-3 h-3" />
                        {plan.elevation}m
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning">{summary.totalCarbs}g</p>
                    <p className="text-xs text-muted-foreground">carbs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange">{summary.totalCalories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-bold', carbRateColor(summary.carbsPerHour, plan.intensity))}>
                      {summary.carbsPerHour}g/hr
                    </p>
                    <p className="text-xs text-muted-foreground">carbs/hr</p>
                  </div>
                </div>

                <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', isExpanded && 'rotate-90')} />
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-4 flex flex-col gap-4">
                  {/* Food list */}
                  {plan.foods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {plan.foods.map((entry) => {
                        const food = foods.find((f) => f.id === entry.foodItemId)
                        if (!food) return null
                        return (
                          <span
                            key={entry.id}
                            className="flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1 rounded-full"
                          >
                            <span>{entry.quantity}×</span>
                            <span>{food.name}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Summary */}
                  <NutritionSummary summary={summary} intensity={plan.intensity} compact />

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditPlan(plan)}
                      className="gap-1.5 border-border bg-secondary text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportPlan(plan)}
                      className="gap-1.5 border-border bg-secondary text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePlan(plan.id)}
                      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Export JSON modal */}
      <Dialog open={!!exportPlan} onOpenChange={(open) => { if (!open) { setExportPlan(null); setCopied(false) } }}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-orange" />
              Export Ride Data — {exportPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Copy this JSON and paste it into your AI assistant to get nutrition advice and ride coaching.
          </p>
          {exportPlan && (() => {
            const json = buildExportJson(exportPlan)
            return (
              <div className="flex flex-col gap-3">
                <pre className="bg-secondary border border-border rounded-xl p-4 text-xs text-foreground overflow-auto max-h-80 font-mono leading-relaxed">
                  {json}
                </pre>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(json)}
                    className={cn(
                      'flex-1 gap-2 cursor-pointer',
                      copied ? 'bg-success hover:bg-success text-white' : 'bg-orange hover:bg-orange-dim text-white',
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function carbRateColor(rate: number, intensity: RideIntensity) {
  const targets: Record<RideIntensity, [number, number]> = {
    easy: [30, 60],
    endurance: [60, 90],
    hard: [80, 120],
    race: [90, 120],
    freestyle: [30, 120],
  }
  const [min, max] = targets[intensity]
  if (rate < min) return 'text-destructive-foreground'
  if (rate > max) return 'text-warning'
  return 'text-success'
}
