'use client'

import { useState } from 'react'
import type { AppView, RidePlan, RideTemplate } from '@/lib/types'
import { AppShell } from '@/components/app-shell'
import { Dashboard } from '@/components/dashboard'
import { FoodLibrary } from '@/components/food-library'
import { RidePlanner } from '@/components/ride-planner'
import { RideTemplates } from '@/components/ride-templates'
import { useRidePlans } from '@/lib/store'

export default function Home() {
  const [view, setView] = useState<AppView>('dashboard')
  const [editingPlan, setEditingPlan] = useState<RidePlan | null>(null)
  const [templateDraft, setTemplateDraft] = useState<Partial<RidePlan> | null>(null)
  const { addPlan } = useRidePlans()

  const handleNavigate = (v: AppView) => {
    setView(v)
    if (v !== 'planner') {
      setEditingPlan(null)
      setTemplateDraft(null)
    }
  }

  const handleEditPlan = (plan: RidePlan) => {
    setEditingPlan(plan)
    setView('planner')
  }

  const handleUseTemplate = (template: RideTemplate) => {
    // Convert template to a draft plan
    setTemplateDraft({
      name: template.name,
      duration: template.duration,
      distance: template.distance,
      elevation: template.elevation,
      intensity: template.intensity,
      temperature: template.temperature,
      foods: template.foods,
    })
    setView('planner')
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onEditPlan={handleEditPlan} />
      case 'library':
        return <FoodLibrary />
      case 'planner':
        return (
          <RidePlanner
            key={editingPlan?.id ?? templateDraft ? 'template-draft' : 'new'}
            initialPlan={
              editingPlan ??
              (templateDraft
                ? ({
                    ...templateDraft,
                    id: '',
                    createdAt: '',
                    updatedAt: '',
                  } as RidePlan)
                : undefined)
            }
            onSaved={() => {
              setEditingPlan(null)
              setTemplateDraft(null)
              setView('dashboard')
            }}
          />
        )
      case 'templates':
        return (
          <RideTemplates
            onNavigate={handleNavigate}
            onUseTemplate={handleUseTemplate}
          />
        )
    }
  }

  return (
    <AppShell view={view} onNavigate={handleNavigate}>
      {renderView()}
    </AppShell>
  )
}
