// Nartalis — Métricas de retención: uso recurrente + D1/D7/D30 exactas.
// Módulo PURO (sin E/S, sin fechas implícitas): toda la lógica de negocio
// aquí para poder probarla sin base de datos. La capa SQL solo aporta filas
// { person, day, kind } ya filtradas por rango y exclusión.
//
// SEMÁNTICA (ver revisión forense de retención):
//   - Cohorte: personas identificables (person_key no nulo) con primera
//     actividad dentro del rango seleccionado.
//   - Día en formato 'YYYY-MM-DD' (días naturales UTC, coherente con C1).
//   - kind por persona+día: 'significant' (búsqueda, consulta, botiquín,
//     medicine_view; nunca cta_click: no demuestra uso del producto),
//     'legacy' (page/medicine_view sin session_id anterior al corte),
//     'other' (resto: mantiene a la persona en cohorte, nunca es retorno).
//   - Día de retorno válido: día > primer día CON kind 'significant', o con
//     'session' (visita posterior con sesión), o con 'legacy' anterior al
//     corte (fallback pre-2026-10-06, era sin session_id).
//   - Elegible: primer día < hoy (existe al menos un día observable después).
//     Dk elegible: primer día + k <= hoy. Sin maduración no hay abandono:
//     los no elegibles no entran en ningún denominador.

export type RetentionActivityKind = 'significant' | 'session' | 'legacy' | 'other'

export interface PersonDayActivity {
  person: string
  day: string
  kind: RetentionActivityKind
}

export interface RetentionMetrics {
  cohort: number
  eligible: number
  recurrent: number
  elig_d1: number
  ret_d1: number
  elig_d7: number
  ret_d7: number
  elig_d30: number
  ret_d30: number
}

// Corte de instrumentación: antes de esta fecha casi no existe session_id.
export const RETENTION_LEGACY_CUTOFF = '2026-10-06'
// Umbral de muestra (denominador elegible), coherente con el dashboard.
export const RETENTION_MIN_SAMPLE = 5

function addDays(day: string, n: number): string {
  const ms = Date.parse(day + 'T00:00:00Z')
  return new Date(ms + n * 86400000).toISOString().slice(0, 10)
}

export function computeRetentionMetrics(rows: PersonDayActivity[], today: string): RetentionMetrics {
  const byPerson = new Map<string, Map<string, Set<RetentionActivityKind>>>()
  for (const r of rows) {
    if (!r.person || !r.day || r.day > today) continue
    let days = byPerson.get(r.person)
    if (!days) {
      days = new Map()
      byPerson.set(r.person, days)
    }
    let kinds = days.get(r.day)
    if (!kinds) {
      kinds = new Set()
      days.set(r.day, kinds)
    }
    kinds.add(r.kind)
  }

  const isReturnDay = (first: string, day: string, kinds: Set<RetentionActivityKind>): boolean => {
    if (day <= first) return false
    if (kinds.has('significant')) return true
    if (kinds.has('session')) return true
    if (kinds.has('legacy') && day < RETENTION_LEGACY_CUTOFF) return true
    return false
  }

  let eligible = 0
  let recurrent = 0
  let elig_d1 = 0, ret_d1 = 0
  let elig_d7 = 0, ret_d7 = 0
  let elig_d30 = 0, ret_d30 = 0

  for (const days of byPerson.values()) {
    const first = [...days.keys()].sort()[0]
    const sigDays = new Set<string>()
    for (const [day, kinds] of days) {
      if (isReturnDay(first, day, kinds)) sigDays.add(day)
    }
    if (first < today) {
      eligible++
      if (sigDays.size > 0) recurrent++
    }
    const wins: [number, (e: number, r: number) => void][] = [
      [1, (e, r) => { elig_d1 += e; ret_d1 += r }],
      [7, (e, r) => { elig_d7 += e; ret_d7 += r }],
      [30, (e, r) => { elig_d30 += e; ret_d30 += r }],
    ]
    for (const [k, acc] of wins) {
      if (addDays(first, k) <= today) {
        acc(1, sigDays.has(addDays(first, k)) ? 1 : 0)
      }
    }
  }

  return { cohort: byPerson.size, eligible, recurrent, elig_d1, ret_d1, elig_d7, ret_d7, elig_d30, ret_d30 }
}
