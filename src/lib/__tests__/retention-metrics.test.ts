import { describe, it, expect } from 'vitest'
import { computeRetentionMetrics, type PersonDayActivity } from '../retention-metrics'

const T = '2026-10-16'

function rows(list: [string, string, PersonDayActivity['kind']][]): PersonDayActivity[] {
  return list.map(([person, day, kind]) => ({ person, day, kind }))
}

describe('retention-metrics (nueva metodología)', () => {
  it('1. persona con actividad significativa en varios días cuenta una vez', () => {
    const m = computeRetentionMetrics(
      rows([['p1', '2026-10-10', 'other'], ['p1', '2026-10-12', 'significant'], ['p1', '2026-10-14', 'significant']]),
      T,
    )
    expect(m).toMatchObject({ cohort: 1, eligible: 1, recurrent: 1 })
  })

  it('2. muchos eventos solo el día inicial: no es recurrente', () => {
    const m = computeRetentionMetrics(
      rows([['p1', '2026-10-10', 'other'], ['p1', '2026-10-10', 'significant'], ['p1', '2026-10-10', 'session']]),
      T,
    )
    expect(m).toMatchObject({ cohort: 1, eligible: 1, recurrent: 0, elig_d1: 1, ret_d1: 0 })
  })

  it('3. retorno en D2 no cuenta como D1 ni D7', () => {
    const m = computeRetentionMetrics(
      rows([['p1', '2026-10-01', 'other'], ['p1', '2026-10-03', 'significant']]),
      T,
    )
    expect(m).toMatchObject({ elig_d1: 1, ret_d1: 0, elig_d7: 1, ret_d7: 0 })
  })

  it('4. retorno exacto cuenta solo en su ventana', () => {
    const m = computeRetentionMetrics(
      rows([
        ['a', '2026-10-01', 'other'], ['a', '2026-10-02', 'significant'],
        ['b', '2026-10-01', 'other'], ['b', '2026-10-08', 'significant'],
        ['c', '2026-09-01', 'other'], ['c', '2026-10-01', 'significant'],
      ]),
      T,
    )
    expect(m).toMatchObject({ ret_d1: 1, ret_d7: 1, ret_d30: 1, recurrent: 3 })
  })

  it('5. sin tiempo suficiente: fuera del denominador inmaduro', () => {
    const m = computeRetentionMetrics(rows([['p1', '2026-10-16', 'other']]), T)
    expect(m).toMatchObject({ cohort: 1, eligible: 0, recurrent: 0, elig_d1: 0, elig_d7: 0, elig_d30: 0 })
  })

  it('6. cero elegibles no es 0 % (los estados los decide la UI con estos ceros)', () => {
    const m = computeRetentionMetrics(rows([['p1', '2026-10-16', 'other']]), T)
    expect(m.elig_d30).toBe(0)
    expect(m.ret_d30).toBe(0)
  })

  it('7. cero retornos con muestra suficiente queda registrado', () => {
    const many = Array.from({ length: 6 }, (_, i) => [`p${i}`, '2026-10-01', 'other'] as [string, string, PersonDayActivity['kind']])
    const m = computeRetentionMetrics(rows(many), T)
    expect(m).toMatchObject({ cohort: 6, eligible: 6, recurrent: 0 })
  })

  it('8. denominador elegible < 5: la UI debe mostrar muestra insuficiente', () => {
    const m = computeRetentionMetrics(rows([['p1', '2026-10-01', 'other']]), T)
    expect(m.eligible).toBe(1)
    expect(m.eligible).toBeLessThan(5)
  })

  it('9. persona sin identidad no entra', () => {
    const m = computeRetentionMetrics(rows([['', '2026-10-01', 'significant']]), T)
    expect(m.cohort).toBe(0)
  })

  it('10. duplicados y joins 1:N no inflan', () => {
    const dup = rows([
      ['p1', '2026-10-01', 'other'], ['p1', '2026-10-01', 'other'],
      ['p1', '2026-10-03', 'significant'], ['p1', '2026-10-03', 'significant'], ['p1', '2026-10-03', 'session'],
    ])
    const m = computeRetentionMetrics(dup, T)
    expect(m).toMatchObject({ cohort: 1, recurrent: 1 })
  })

  it('11. anónimo vinculado a registrado no duplica (misma person_key)', () => {
    const m = computeRetentionMetrics(
      rows([['user:u1', '2026-10-01', 'other'], ['user:u1', '2026-10-05', 'significant']]),
      T,
    )
    expect(m).toMatchObject({ cohort: 1, recurrent: 1 })
  })

  it('12. admin/test y límites temporales los aplica la capa SQL (aquí solo importan filas dadas)', () => {
    const m = computeRetentionMetrics(rows([['p1', '2026-10-20', 'significant']]), T)
    expect(m.cohort).toBe(0)
  })

  it('cta_click aislado no produce retorno (la capa SQL ya no lo mapea a significant)', () => {
    // Un día posterior con un único cta_click llega aquí como kind 'other':
    // no es búsqueda, consulta, botiquín, ficha ni sesión distinta.
    const m = computeRetentionMetrics(
      rows([['p1', '2026-10-01', 'other'], ['p1', '2026-10-05', 'other']]),
      T,
    )
    expect(m).toMatchObject({ cohort: 1, eligible: 1, recurrent: 0, elig_d1: 1, ret_d1: 0 })
  })

  it('fallback legacy pre-2026-10-06 cuenta en día distinto; session cubre el resto', () => {
    const m = computeRetentionMetrics(
      rows([['old', '2026-09-20', 'other'], ['old', '2026-09-22', 'legacy']]),
      T,
    )
    expect(m.recurrent).toBe(1)
    const m2 = computeRetentionMetrics(
      rows([['nw', '2026-10-10', 'other'], ['nw', '2026-10-12', 'session']]),
      T,
    )
    expect(m2.recurrent).toBe(1)
    const m3 = computeRetentionMetrics(
      rows([['bare', '2026-10-10', 'other'], ['bare', '2026-10-12', 'other']]),
      T,
    )
    expect(m3.recurrent).toBe(0)
  })
})
