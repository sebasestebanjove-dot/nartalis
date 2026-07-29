import { neon } from '@neondatabase/serverless'

let _sql: any

function getSql(): any {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no configurada')
    _sql = neon(url)
  }
  return _sql
}

// Lazy wrapper: sql`...` calls neon() only at first use
function sql(strings: TemplateStringsArray, ...params: any[]) {
  return getSql()(strings, ...params)
}

sql.unsafe = function unsafe(query: string) {
  return getSql().unsafe(query)
}

sql.query = function query(text: string, params?: any[], options?: any) {
  return getSql().query(text, params, options)
}

sql.transaction = function transaction(queriesOrFn: any, opts?: any) {
  return getSql().transaction(queriesOrFn, opts)
}

export { sql }
