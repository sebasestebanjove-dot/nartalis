import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getNartalisSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/circuit-breaker', () => ({
  cimaBreaker: {
    shouldAttemptCima: vi.fn().mockReturnValue(true),
    onCimaFailure: vi.fn(),
    onCimaSuccess: vi.fn(),
    getState: vi.fn().mockReturnValue('closed'),
    setOpenTimeoutMs: vi.fn(),
  },
}))

vi.mock('@/lib/pa-principle', () => ({
  ingestPrinciplesBatch: vi.fn().mockResolvedValue(undefined),
  collectPaPairs: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/search-tracking', () => ({
  getTrackingIds: vi.fn().mockResolvedValue({ anonymousId: 'anon-1', sessionId: 'sess-1' }),
  isTestRequest: vi.fn().mockReturnValue(false),
}))

import { sql } from '@/lib/db'
const mockSql = vi.mocked(sql)

describe('GET /api/farma/search — modo log_only (selección del autocompletado)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resultados: [] }) }))
  })

  it('registra la búsqueda en farma_search_log y NO llama a CIMA', async () => {
    const req = new NextRequest(
      new Request('http://localhost/api/farma/search?q=paracetamol&type=text&source=home&source_page=/&log_only=1'),
    )
    const { GET } = await import('../route')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.logged).toBe(true)

    // El INSERT en farma_search_log ocurre (1 llamada a sql).
    expect(mockSql).toHaveBeenCalledTimes(1)

    // No se debe llamar a CIMA (ni a ninguna otra fuente externa).
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('mantiene la validación de longitud mínima también en log_only', async () => {
    const req = new NextRequest(new Request('http://localhost/api/farma/search?q=a&log_only=1'))
    const { GET } = await import('../route')
    const response = await GET(req)

    expect(response.status).toBe(400)
    expect(mockSql).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('normaliza la query a minúsculas al registrar', async () => {
    const req = new NextRequest(
      new Request('http://localhost/api/farma/search?q=Frenadol%20Forte&type=text&log_only=1'),
    )
    const { GET } = await import('../route')
    await GET(req)

    // El tagged template recibe (strings, ...valores). El primer valor
    // interpolado del INSERT es la query normalizada.
    const callArgs = mockSql.mock.calls[0] as unknown[]
    const values = callArgs.slice(1)
    expect(values).toContain('frenadol forte')
  })
})
