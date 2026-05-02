'use client'

import { useState } from 'react'
import { useFoodLibrary } from '@/lib/store'
import type { FoodCategory, FoodItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Star,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  Zap,
  Droplets,
  Coffee,
  Flame,
  AlertCircle,
} from 'lucide-react'

const CATEGORIES: { value: FoodCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gel', label: 'Gels' },
  { value: 'bar', label: 'Bars' },
  { value: 'chew', label: 'Chews' },
  { value: 'drink', label: 'Drinks' },
  { value: 'real_food', label: 'Real Food' },
  { value: 'supplement', label: 'Supplements' },
]

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  gel: 'Gel',
  bar: 'Bar',
  chew: 'Chew',
  drink: 'Drink',
  real_food: 'Real Food',
  supplement: 'Supplement',
}

type FormState = {
  name: string
  brand: string
  category: FoodCategory
  serving_size: string
  calories: number
  carbs_g: number
  sugar_g: string
  sodium_mg: string
  caffeine_mg: string
  protein_g: string
  fat_g: string
  notes: string
  is_favorite: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  brand: '',
  category: 'gel',
  serving_size: '',
  calories: 0,
  carbs_g: 0,
  sugar_g: '',
  sodium_mg: '',
  caffeine_mg: '',
  protein_g: '',
  fat_g: '',
  notes: '',
  is_favorite: false,
}

function toForm(food: FoodItem): FormState {
  return {
    name: food.name,
    brand: food.brand ?? '',
    category: food.category,
    serving_size: food.serving_size,
    calories: food.calories,
    carbs_g: Number(food.carbs_g),
    sugar_g: food.sugar_g != null ? String(food.sugar_g) : '',
    sodium_mg: food.sodium_mg != null ? String(food.sodium_mg) : '',
    caffeine_mg: food.caffeine_mg != null ? String(food.caffeine_mg) : '',
    protein_g: food.protein_g != null ? String(food.protein_g) : '',
    fat_g: food.fat_g != null ? String(food.fat_g) : '',
    notes: food.notes ?? '',
    is_favorite: food.is_favorite,
  }
}

export function FoodLibrary() {
  const { foods, isLoading, error, addFood, updateFood, deleteFood, duplicateFood, toggleFavorite } =
    useFoodLibrary()

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<FoodCategory | 'all'>('all')
  const [filterFav, setFilterFav] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const filtered = foods.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.brand ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || f.category === filterCat
    const matchFav = !filterFav || f.is_favorite
    return matchSearch && matchCat && matchFav
  })

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (food: FoodItem) => {
    setEditingId(food.id)
    setForm(toForm(food))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.serving_size.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        serving_size: form.serving_size.trim(),
        calories: form.calories,
        carbs_g: form.carbs_g,
        sugar_g: form.sugar_g !== '' ? Number(form.sugar_g) : null,
        sodium_mg: form.sodium_mg !== '' ? Number(form.sodium_mg) : null,
        caffeine_mg: form.caffeine_mg !== '' ? Number(form.caffeine_mg) : null,
        protein_g: form.protein_g !== '' ? Number(form.protein_g) : null,
        fat_g: form.fat_g !== '' ? Number(form.fat_g) : null,
        notes: form.notes.trim() || null,
        is_favorite: form.is_favorite,
      }
      if (editingId) {
        await updateFood(editingId, payload)
      } else {
        await addFood(payload as Omit<FoodItem, 'id' | 'created_at'>)
      }
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Food Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Loading...' : `${foods.length} items`}
          </p>
        </div>
        <Button onClick={openAdd} className="bg-orange hover:bg-orange-dim text-white gap-1.5">
          <Plus className="w-4 h-4" />
          Add Food
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load food library. Please refresh.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCat(cat.value)}
              className={cn(
                'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                filterCat === cat.value
                  ? 'border-orange bg-orange text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setFilterFav(!filterFav)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              filterFav
                ? 'border-orange bg-orange text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Star className="w-3 h-3" />
            Favorites
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-orange" />
        </div>
      )}

      {/* Food grid */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange/10 flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-orange" />
          </div>
          <p className="text-foreground font-medium">No foods found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Add your first food item'}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              onEdit={() => openEdit(food)}
              onDuplicate={() => duplicateFood(food.id)}
              onDelete={() => deleteFood(food.id)}
              onToggleFavorite={() => toggleFavorite(food.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? 'Edit Food' : 'Add Food'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Name */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Name <span className="text-orange">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. SiS Go Gel"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Brand */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Science in Sport"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as FoodCategory })}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-foreground text-sm"
              >
                {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Serving size */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Serving size <span className="text-orange">*</span>
              </label>
              <Input
                value={form.serving_size}
                onChange={(e) => setForm({ ...form, serving_size: e.target.value })}
                placeholder="e.g. 32g packet"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Calories */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Calories (kcal)
              </label>
              <Input
                type="number"
                min={0}
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })}
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Carbs */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Carbs (g) <span className="text-orange">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.carbs_g}
                onChange={(e) => setForm({ ...form, carbs_g: Number(e.target.value) })}
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Sugars */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sugars (g)
              </label>
              <Input
                type="number"
                min={0}
                value={form.sugar_g}
                onChange={(e) => setForm({ ...form, sugar_g: e.target.value })}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Sodium */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sodium (mg)
              </label>
              <Input
                type="number"
                min={0}
                value={form.sodium_mg}
                onChange={(e) => setForm({ ...form, sodium_mg: e.target.value })}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Caffeine */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Caffeine (mg)
              </label>
              <Input
                type="number"
                min={0}
                value={form.caffeine_mg}
                onChange={(e) => setForm({ ...form, caffeine_mg: e.target.value })}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Protein */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Protein (g)
              </label>
              <Input
                type="number"
                min={0}
                value={form.protein_g}
                onChange={(e) => setForm({ ...form, protein_g: e.target.value })}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Fat */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fat (g)</label>
              <Input
                type="number"
                min={0}
                value={form.fat_g}
                onChange={(e) => setForm({ ...form, fat_g: e.target.value })}
                placeholder="Optional"
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Good for hot weather, tastes great..."
                rows={2}
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm resize-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.serving_size.trim() || saving}
              className="bg-orange hover:bg-orange-dim text-white gap-1.5"
            >
              {saving && <Spinner className="w-3.5 h-3.5" />}
              {editingId ? 'Save Changes' : 'Add Food'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── FoodCard ─────────────────────────────────────────────────────────────────

function FoodCard({
  food,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: {
  food: FoodItem
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-orange/40 hover:shadow-sm transition-all group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-orange/10 text-orange">
            {CATEGORY_LABELS[food.category]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className={cn(
              'p-1 rounded transition-colors',
              food.is_favorite ? 'text-orange' : 'text-muted-foreground hover:text-orange',
            )}
            aria-label={food.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn('w-4 h-4', food.is_favorite && 'fill-orange')} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer">
                <Copy className="w-3.5 h-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Name & brand */}
      <div>
        <p className="font-semibold text-foreground text-sm leading-tight">{food.name}</p>
        {food.brand && <p className="text-xs text-muted-foreground mt-0.5">{food.brand}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">per {food.serving_size}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatPill
          icon={<Flame className="w-3 h-3" />}
          label="kcal"
          value={food.calories}
          color="text-orange"
        />
        <StatPill
          icon={<Zap className="w-3 h-3" />}
          label="carbs"
          value={`${food.carbs_g}g`}
          color="text-warning"
        />
        {food.sodium_mg != null && food.sodium_mg > 0 && (
          <StatPill
            icon={<Droplets className="w-3 h-3" />}
            label="sodium"
            value={`${food.sodium_mg}mg`}
            color="text-chart-3"
          />
        )}
        {food.caffeine_mg != null && food.caffeine_mg > 0 && (
          <StatPill
            icon={<Coffee className="w-3 h-3" />}
            label="caffeine"
            value={`${food.caffeine_mg}mg`}
            color="text-chart-5"
          />
        )}
      </div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
