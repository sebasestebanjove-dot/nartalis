// Exclusión central de cuentas internas (admin/test) de las métricas de producto.
// Reglas únicas para todo /admin (no duplicar role='ADMIN' ni patrones en cada query).
//
// Semántica:
//  - role = 'ADMIN' → cuentas administrativas, nunca usuarios de producto.
//  - patrones de email → cuentas de prueba/desarrollo (prova, test, example.com).
//  - Si filterAnonymous=false, los eventos anónimos (user_id NULL) se INCLUYEN
//    (no son imputables a una cuenta interna).

// Patrones de email de prueba (minúsculas, ILIKE, coincidencia parcial).
// Constantes server-side: se embeben como literales SQL (sin riesgo de inyección).
export const TEST_EMAIL_LIKE = [
  'prova@prova.com',
  '%@example.com',
  '%test%',
  '%prueba%',
]

function emailLiteral(): string {
  return TEST_EMAIL_LIKE.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ')
}

// Devuelve una condición SQL reutilizable que excluye a los usuarios internos.
// `idColumn` es la columna que referencia nartalis_users.id (p. ej. `u.id`, `s.user_id`).
export function excludeInternalClause(idColumn: string): string {
  return (
    `NOT EXISTS (` +
    `  SELECT 1 FROM nartalis_users _nrtl_ex ` +
    `  WHERE _nrtl_ex.id = ${idColumn} ` +
    `    AND (_nrtl_ex.role = 'ADMIN' OR LOWER(_nrtl_ex.email) ILIKE ANY (ARRAY[${emailLiteral()}]))` +
    `)`
  )
}

// Filtrar eventos anónimos (sin user_id) según direccionalidad.
// excludeInternal=true → se excluye todo lo imputable a cuentas internas.
// Al ser anónimos se mantienen en la métrica de comportamiento agregado.
export function anonymousFilter(): string {
  return `user_id IS NOT NULL`
}

// Sección WHERE que combina la exclusión según el flag.
// Devuelve string vacío si no se debe filtrar (toggle desactivado).
export function internalExclusion(idColumn: string, excludeInternal: boolean): string {
  if (!excludeInternal) return ''
  return excludeInternalClause(idColumn)
}
