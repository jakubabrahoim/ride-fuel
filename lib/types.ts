export type FoodCategory = 'gel' | 'bar' | 'chew' | 'drink' | 'real_food' | 'supplement'

/** Shape returned from the Neon API — column names match the DB schema */
export interface FoodItem {
  id: string
  name: string
  brand: string | null
  category: FoodCategory
  serving_size: string
  calories: number
  carbs_g: number
  sugar_g: number | null
  sodium_mg: number | null
  caffeine_mg: number | null
  protein_g: number | null
  fat_g: number | null
  notes: string | null
  is_favorite: boolean
  created_at: string
}

export type RideIntensity = 'easy' | 'endurance' | 'hard' | 'race' | 'freestyle'

export interface RideFoodEntry {
  id: string
  foodItemId: string
  quantity: number
}

export interface WeatherData {
  temp: number
  feelsLike: number
  windSpeed: number
  windDir: number
  windDirLabel: string
  description: string
  humidity: number
}

export interface RidePlan {
  id: string
  name: string
  date?: string // ISO date string YYYY-MM-DD
  area?: string  // location / city for weather
  duration: number // minutes
  distance?: number // km
  elevation?: number // meters
  intensity: RideIntensity
  temperature?: number // celsius
  weather?: WeatherData
  foods: RideFoodEntry[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface RideTemplate {
  id: string
  name: string
  description?: string
  icon: string
  duration: number
  distance?: number
  elevation?: number
  intensity: RideIntensity
  temperature?: number
  foods: RideFoodEntry[]
  createdAt: string
  updatedAt: string
}

export interface NutritionSummary {
  totalCalories: number
  totalCarbs: number
  totalSugars: number
  totalSodium: number
  totalCaffeine: number
  carbsPerHour: number
  caloriesPerHour: number
  durationHours: number
}

export type AppView = 'dashboard' | 'library' | 'planner' | 'templates'
