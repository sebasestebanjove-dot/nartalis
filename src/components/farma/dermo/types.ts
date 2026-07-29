export type SkinType = 'seca' | 'grasa' | 'mixta' | 'sensible' | 'normal'

export interface DermoBrand {
  id: string
  name: string
  logo_url: string | null
  created_at: string
}

export interface DermoIngredient {
  id: string
  name: string
  inci_name: string | null
  description: string | null
  benefits: string | null
  warnings: string | null
  skin_types: string[] | null
  created_at: string
}

export interface DermoProduct {
  id: string
  name: string
  brand_id: string | null
  brand?: DermoBrand | null
  image_url: string | null
  description: string | null
  ingredients: string[] | null
  analysis: any | null
  skin_types: string[] | null
  indications: string | null
  contraindications: string | null
  is_active: boolean
  created_at: string
  // Frontend-only fields
  has_more?: boolean
  premium_required?: boolean
  message?: string
}

export interface DermoPharmacy {
  id: string
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  is_subscribed: boolean
}

export interface DermoStock {
  id: string
  product_id: string
  pharmacy_id: string
  pharmacy?: DermoPharmacy
  stock: number
  available: boolean
  reservation_enabled: boolean
  price: number | null
}

export interface DermoBooking {
  id: string
  user_email: string
  product_id: string
  pharmacy_id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  pickup_code: string | null
  created_at: string
}

export interface DermoConsultation {
  id: string
  user_email: string
  query: string
  response: string | null
  products_referenced: string[] | null
  model_used: string | null
  created_at: string
}

export type UserType = 'anonymous' | 'free' | 'premium'

export type DermoView = 'home' | 'dashboard' | 'search' | 'results' | 'detail' | 'quiz' | 'routine' | 'analyze' | 'advancedQuiz'

export interface AnalyzeResult {
  productName: string;
  ingredients: { name: string; verdict: string; note: string }[];
  total: number;
  safe: number;
  caution: number;
  avoid: number;
  fit_score?: number;
  recommendation?: string;
  image_front_url?: string | null;
  image_url?: string | null;
  image_ingredients_url?: string | null;
}

export interface DashboardData {
  user: {
    name: string
    email: string
    is_premium: boolean
    consultas_consumidas: number
  }
  stats: {
    total_consultations: number
    total_bookings: number
    total_routines: number
  }
  latest_routine: DermoUserRoutine | null
  skin_score: number
  skin_score_breakdown: { base: number; routine: number; consultations: number; bookings: number; consistency: number }
  consistency: number
  streak: number
  goal_label: string
  goal_progress: number
  milestones: { date: string; text: string; icon: string }[]
  skin_score_history: { label: string; value: number }[]
  recent_consultations: {
    id: string
    query: string
    created_at: string
  }[]
  recent_bookings: {
    id: string
    product_name: string | null
    pharmacy_name: string | null
    status: string
    created_at: string
  }[]
}

export interface DermoQuizQuestion {
  id: string
  step: number
  question: string
  type: 'single' | 'multiple' | 'text'
  options: { label: string; value: string; icon?: string }[] | null
  field_key: string
  is_active: boolean
}

export interface DermoQuizAnswer {
  field_key: string
  value: string | string[]
}

export type RoutineStatus = 'active' | 'archived'

export interface DermoUserRoutine {
  id: string
  user_email: string
  skin_type: string | null
  allergies: string[] | null
  goals: string[] | null
  am_routine: { productId: string; productName: string; step: string; order: number }[] | null
  pm_routine: { productId: string; productName: string; step: string; order: number }[] | null
  explanation: string | null
  is_completed: boolean
  name?: string | null
  status?: RoutineStatus | null
  created_at?: string | null
}

export interface ActivateRoutineResponse {
  ok: boolean
  routine: DermoUserRoutine
  error?: string
}

export interface RoutineHistoryResponse {
  active: DermoUserRoutine | null
  history: DermoUserRoutine[]
}

export interface AdvancedQuizAnswers {
  // Paso 1
  edad: number | null
  sexo: string
  fototipo: string
  motivoConsulta: string
  diagnosticosPrevios: string
  tratamientosActuales: string
  antecedentes: string
  cirugiasMedicacion: string
  alergias: string
  eventosDesencadenantes: string
  objetivoPaciente: string
  // Paso 2
  alimentacion: string[]
  suplementacion: string
  pescadoAzul: string
  agua: string
  alcohol: string
  tabaco: string
  actividadFisica: string
  problemasSueno: string
  pantallas: string
  // Paso 3
  distension: string
  dolorAbdominal: string
  gases: string
  reflujo: string
  alimentosReflujo: string[]
  histamina: string
  antibioticos: string
  // Paso 4
  estres: number
  ansiedad: number
  animo: number
  energia: number
  calidadSueno: number
  despertares: string
  descanso: string
  circunstanciasEstresoras: string
  regulacion: string[]
  // Paso 5
  preocupacionPrincipal: string[]
  limpiezaActual: string
  hidratanteActual: string
  antioxidantes: string[]
  activosActuales: string[]
  productOjos: string
  cremaReparadora: string
  fotoproteccionDiaria: string
  tratamientoNoche: string
  reaccionCosmeticos: string
  empeoraAlcohol: string
  reaccionJoyas: string
  dificultadLimpiador: string
  // Paso 6
  email: string
  consentPrivacidad: boolean
  consentIA: boolean
  consentDerivacion: boolean
}

export const DEFAULT_ADVANCED_ANSWERS: AdvancedQuizAnswers = {
  edad: null, sexo: '', fototipo: '',
  motivoConsulta: '', diagnosticosPrevios: '', tratamientosActuales: '',
  antecedentes: '', cirugiasMedicacion: '', alergias: '',
  eventosDesencadenantes: '', objetivoPaciente: '',
  alimentacion: [], suplementacion: '', pescadoAzul: '', agua: '',
  alcohol: '', tabaco: '', actividadFisica: '', problemasSueno: '', pantallas: '',
  distension: '', dolorAbdominal: '', gases: '', reflujo: '', alimentosReflujo: [],
  histamina: '', antibioticos: '',
  estres: 5, ansiedad: 5, animo: 5, energia: 5, calidadSueno: 5,
  despertares: '', descanso: '', circunstanciasEstresoras: '', regulacion: [],
  preocupacionPrincipal: [], limpiezaActual: '', hidratanteActual: '',
  antioxidantes: [], activosActuales: [], productOjos: '', cremaReparadora: '',
  fotoproteccionDiaria: '', tratamientoNoche: '',
  reaccionCosmeticos: '', empeoraAlcohol: '', reaccionJoyas: '',
  dificultadLimpiador: '',
  email: '', consentPrivacidad: false, consentIA: false, consentDerivacion: false,
}

// ── Premium V2 types ──

export interface TravelProfile {
  id: string
  destination: string
  travel_type: string
  start_date: string
  end_date: string
  generated_routine: {
    am_routine: { productName: string; step: string; order: number }[]
    pm_routine: { productName: string; step: string; order: number }[]
    explanation: string
  } | null
  days_left: number
}

export interface UserMedication {
  id: string
  medicine_name: string
  active_ingredient: string | null
  atc_code: string | null
  compatibility_result: {
    fotosensibilidad: boolean
    irritacion: boolean
    sequedad: boolean
    compatible: boolean
    details: string[]
  } | null
  started_date: string
  is_active: boolean
  created_at: string
}

export interface ProductUsage {
  id: string
  product_name: string
  product_id: string | null
  size_ml: number
  unit?: string
  use_frequency: string
  daily_usage_ml: number
  estimated_finish_date: string | null
  days_left: number
  status: 'ok' | 'warning' | 'critical'
}

export interface WeeklyReport {
  id: string
  week_number: number
  year: number
  report_json: {
    summary: string
    insights: string[]
    recommendations: string[]
    highlights: string[]
  }
  score_before: number
  score_after: number
  completion_rate: number
  created_at: string
}
