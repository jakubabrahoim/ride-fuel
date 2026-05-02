'use client'

import type { NutritionSummary, RideIntensity } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Info, Zap, Flame, Droplets, Coffee, Clock } from 'lucide-react'

interface Props {
  summary: NutritionSummary
  intensity: RideIntensity
  compact?: boolean
}

const INTENSITY_TARGETS: Record<RideIntensity, { carbsMin: number; carbsMax: number; label: string }> = {
  easy: { carbsMin: 30, carbsMax: 60, label: 'Easy' },
  endurance: { carbsMin: 60, carbsMax: 90, label: 'Endurance' },
  hard: { carbsMin: 80, carbsMax: 120, label: 'Hard' },
  race: { carbsMin: 90, carbsMax: 120, label: 'Race' },
  freestyle: { carbsMin: 30, carbsMax: 120, label: 'Freestyle' },
}

export function NutritionSummary({ summary, intensity, compact = false }: Props) {
  const target = INTENSITY_TARGETS[intensity]
  const { carbsPerHour, totalCarbs, totalCalories, totalSodium, totalCaffeine, durationHours } = summary

  const carbStatus: 'low' | 'ok' | 'high' =
    carbsPerHour < target.carbsMin ? 'low' : carbsPerHour > target.carbsMax ? 'high' : 'ok'

  const warnings: string[] = []
  const tips: string[] = []

  if (carbStatus === 'low') {
    warnings.push(
      `Only ${carbsPerHour}g carbs/hr — target is ${target.carbsMin}–${target.carbsMax}g for a ${target.label} ride.`,
    )
    tips.push('Consider adding gels or a carb-mix bottle to hit your fueling goals.')
  }
  if (carbStatus === 'high') {
    tips.push(
      `${carbsPerHour}g carbs/hr is above target — only feasible if you train gut tolerance.`,
    )
  }
  if (durationHours >= 3 && totalSodium < 500) {
    warnings.push('Low sodium for a long ride — consider electrolyte tabs or a salty snack.')
  }
  if (durationHours >= 2 && totalCarbs === 0) {
    warnings.push('No carbohydrates planned — performance will suffer significantly.')
  }
  if (intensity === 'race' && totalCaffeine === 0) {
    tips.push('Caffeine (100–300mg) can improve race performance — consider a caffeine gel.')
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniStat label="Total Carbs" value={`${totalCarbs}g`} icon={<Zap className="w-3.5 h-3.5" />} color="text-warning" />
        <MiniStat label="Carbs/hr" value={`${carbsPerHour}g`} icon={<Clock className="w-3.5 h-3.5" />} color={carbStatus === 'ok' ? 'text-success' : 'text-destructive-foreground'} />
        <MiniStat label="Calories" value={`${totalCalories}`} icon={<Flame className="w-3.5 h-3.5" />} color="text-orange" />
        <MiniStat label="Sodium" value={`${totalSodium}mg`} icon={<Droplets className="w-3.5 h-3.5" />} color="text-chart-3" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Calories"
          value={totalCalories}
          unit="kcal"
          icon={<Flame className="w-5 h-5" />}
          color="text-orange"
          bg="bg-orange/10"
        />
        <StatCard
          label="Total Carbs"
          value={`${totalCarbs}`}
          unit="g"
          icon={<Zap className="w-5 h-5" />}
          color="text-warning"
          bg="bg-warning/10"
        />
        <StatCard
          label="Carbs / Hour"
          value={`${carbsPerHour}`}
          unit="g/hr"
          icon={<Clock className="w-5 h-5" />}
          color={carbStatus === 'ok' ? 'text-success' : carbStatus === 'low' ? 'text-destructive-foreground' : 'text-warning'}
          bg={carbStatus === 'ok' ? 'bg-success/10' : carbStatus === 'low' ? 'bg-destructive/10' : 'bg-warning/10'}
          badge={carbStatus === 'ok' ? 'On target' : carbStatus === 'low' ? 'Too low' : 'High'}
          badgeColor={carbStatus === 'ok' ? 'bg-success/20 text-success' : carbStatus === 'low' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-warning/20 text-warning'}
        />
        <StatCard
          label="Calories / Hour"
          value={`${summary.caloriesPerHour}`}
          unit="kcal/hr"
          icon={<Flame className="w-5 h-5" />}
          color="text-chart-4"
          bg="bg-chart-4/10"
        />
        <StatCard
          label="Total Sodium"
          value={`${totalSodium}`}
          unit="mg"
          icon={<Droplets className="w-5 h-5" />}
          color="text-chart-3"
          bg="bg-chart-3/10"
        />
        {totalCaffeine > 0 && (
          <StatCard
            label="Total Caffeine"
            value={`${totalCaffeine}`}
            unit="mg"
            icon={<Coffee className="w-5 h-5" />}
            color="text-chart-2"
            bg="bg-chart-2/10"
          />
        )}
      </div>

      {/* Target bar */}
      <div className="bg-secondary rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Carbs/hr vs. {target.label} target ({target.carbsMin}–{target.carbsMax}g)
          </span>
          <span className={cn('text-xs font-bold', carbStatus === 'ok' ? 'text-success' : carbStatus === 'low' ? 'text-destructive-foreground' : 'text-warning')}>
            {carbsPerHour}g/hr
          </span>
        </div>
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          {/* Target zone */}
          <div
            className="absolute top-0 h-full bg-success/20 rounded-full"
            style={{
              left: `${Math.min((target.carbsMin / 140) * 100, 100)}%`,
              width: `${Math.min(((target.carbsMax - target.carbsMin) / 140) * 100, 100)}%`,
            }}
          />
          {/* Actual */}
          <div
            className={cn(
              'absolute top-0 left-0 h-full rounded-full transition-all',
              carbStatus === 'ok' ? 'bg-success' : carbStatus === 'low' ? 'bg-destructive-foreground' : 'bg-warning',
            )}
            style={{ width: `${Math.min((carbsPerHour / 140) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">0g</span>
          <span className="text-xs text-muted-foreground">140g+</span>
        </div>
      </div>

      {/* Warnings & tips */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-destructive-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{w}</p>
            </div>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="flex flex-col gap-2">
          {tips.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-orange/10 border border-orange/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-orange shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{t}</p>
            </div>
          ))}
        </div>
      )}

      {carbStatus === 'ok' && warnings.length === 0 && (
        <div className="flex items-center gap-2.5 bg-success/10 border border-success/20 rounded-xl p-3">
          <CheckCircle className="w-4 h-4 text-success shrink-0" />
          <p className="text-sm text-foreground">
            Fueling looks great! You&apos;re in the optimal range for a {target.label.toLowerCase()} ride.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  icon,
  color,
  bg,
  badge,
  badgeColor,
}: {
  label: string
  value: string | number
  unit: string
  icon: React.ReactNode
  color: string
  bg: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg, color)}>
          {icon}
        </div>
        {badge && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-2xl font-bold', color)}>{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
      <span className={color}>{icon}</span>
      <div>
        <p className={cn('text-sm font-bold', color)}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
