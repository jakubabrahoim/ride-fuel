'use client'

import { useState } from 'react'
import { useRideTemplates, useFoodLibrary, useRidePlans, calcNutrition } from '@/lib/store'
import type { RideIntensity, RideTemplate, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Clock,
  Ruler,
  Mountain,
  Zap,
  Flame,
  ChevronRight,
  Copy,
} from 'lucide-react'

const INTENSITIES: { value: RideIntensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'hard', label: 'Hard' },
  { value: 'race', label: 'Race' },
  { value: 'freestyle', label: "Don't know" },
]

const INTENSITY_COLORS: Record<RideIntensity, string> = {
  easy: 'bg-success/20 text-success border-success/30',
  endurance: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  hard: 'bg-warning/20 text-warning border-warning/30',
  race: 'bg-orange/20 text-orange border-orange/30',
  freestyle: 'bg-muted text-muted-foreground border-border',
}

const TEMPLATE_ICONS = ['🚴', '🏆', '🔄', '⛰️', '🌅', '🌙', '💨', '🔥', '🧊', '🎯']

interface TemplatesProps {
  onNavigate: (view: AppView) => void
  onUseTemplate: (template: RideTemplate) => void
}

export function RideTemplates({ onNavigate, onUseTemplate }: TemplatesProps) {
  const { templates, hydrated: templatesHydrated, addTemplate, deleteTemplate } = useRideTemplates()
  const { foods } = useFoodLibrary()
  const { plans, hydrated: plansHydrated } = useRidePlans()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('🚴')
  const [newIntensity, setNewIntensity] = useState<RideIntensity>('endurance')
  const [newDuration, setNewDuration] = useState(120)
  const [saveFromPlanId, setSaveFromPlanId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    addTemplate({
      name: newName,
      description: newDesc || undefined,
      icon: newIcon,
      intensity: newIntensity,
      duration: newDuration,
      foods: [],
    })
    setCreateOpen(false)
    setNewName('')
    setNewDesc('')
  }

  const handleSaveFromPlan = () => {
    const plan = plans.find((p) => p.id === saveFromPlanId)
    if (!plan) return
    addTemplate({
      name: plan.name,
      description: `Saved from ride plan`,
      icon: '🚴',
      intensity: plan.intensity,
      duration: plan.duration,
      distance: plan.distance,
      elevation: plan.elevation,
      temperature: plan.temperature,
      foods: plan.foods,
    })
    setSaveFromPlanId(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ride Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable nutrition plans for your regular rides
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-orange hover:bg-orange-dim text-white gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Save from plan banner */}
      {plansHydrated && plans.length > 0 && (
        <div className="bg-secondary border border-border rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-foreground mb-2">Save an existing plan as a template</p>
          <div className="flex items-center gap-2">
            <select
              value={saveFromPlanId ?? ''}
              onChange={(e) => setSaveFromPlanId(e.target.value || null)}
              className="flex-1 h-9 px-3 rounded-md bg-background border border-border text-foreground text-sm"
            >
              <option value="">Select a plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button
              disabled={!saveFromPlanId}
              onClick={handleSaveFromPlan}
              size="sm"
              className="bg-orange hover:bg-orange-dim text-white"
            >
              Save as Template
            </Button>
          </div>
        </div>
      )}

      {/* Templates grid */}
      {!templatesHydrated ? null : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium text-foreground">No templates yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create templates for your regular ride types
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tmpl) => {
            const summary = calcNutrition(tmpl.foods, foods, tmpl.duration)
            return (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                summary={summary}
                foodCount={tmpl.foods.reduce((sum, e) => sum + e.quantity, 0)}
                onUse={() => onUseTemplate(tmpl)}
                onDelete={() => deleteTemplate(tmpl.id)}
              />
            )
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Template</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {/* Icon picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors',
                      newIcon === icon ? 'bg-orange/30 ring-2 ring-orange' : 'bg-secondary hover:bg-muted',
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Weekend Long Ride"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. 4-5 hour endurance ride"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Intensity</label>
              <div className="grid grid-cols-3 gap-1.5">
                {INTENSITIES.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setNewIntensity(i.value)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                      newIntensity === i.value ? INTENSITY_COLORS[i.value] : 'bg-secondary border-border text-muted-foreground hover:border-border/60',
                    )}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Duration (min)
              </label>
              <Input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
              className="bg-background border-border text-foreground"
            />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="bg-orange hover:bg-orange-dim text-white"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  summary,
  foodCount,
  onUse,
  onDelete,
}: {
  template: RideTemplate
  summary: ReturnType<typeof calcNutrition>
  foodCount: number
  onUse: () => void
  onDelete: () => void
}) {
  const intensity = INTENSITY_COLORS[template.intensity]

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-orange/40 transition-colors group overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-base leading-none overflow-hidden', intensity)}>
            <span className="block w-full h-full flex items-center justify-center text-base leading-none">
              {template.icon}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate">{template.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors cursor-pointer"
          aria-label="Delete template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(template.duration)}
        </span>
        {template.distance && (
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            {template.distance}km
          </span>
        )}
        <span className={cn('capitalize text-xs font-medium px-2 py-0.5 rounded-full border', intensity)}>
          {template.intensity}
        </span>
      </div>

      {/* Nutrition strip */}
      {foodCount > 0 ? (
        <div className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-warning">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{summary.totalCarbs}g</span>
            <span className="text-xs text-muted-foreground">carbs</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1 text-orange">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{summary.totalCalories}</span>
            <span className="text-xs text-muted-foreground">kcal</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <span className="text-xs text-muted-foreground">{foodCount} item{foodCount !== 1 ? 's' : ''}</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">No food items — food will be added in planner</div>
      )}

      {/* Use button */}
      <Button
        onClick={onUse}
        size="sm"
        className="w-full bg-orange hover:bg-orange-dim text-white gap-1.5 mt-auto"
      >
        <Copy className="w-3.5 h-3.5" />
        Use Template
        <ChevronRight className="w-3.5 h-3.5 ml-auto" />
      </Button>
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
