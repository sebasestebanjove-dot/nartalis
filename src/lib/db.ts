import { neon, type NeonQueryFunction, type NeonQueryPromise, type QueryRows } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false>

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no configurada')
    _sql = neon(url)
  }
  return _sql
}

const _handler: ProxyHandler<NeonQueryFunction<false, false>> = {
  apply(_target, _thisArg, args) {
    return getSql()(...(args as [TemplateStringsArray, ...any[]]))
  },
  get(_target, prop, _receiver) {
    return Reflect.get(getSql(), prop as keyof NeonQueryFunction<false, false>)
  },
}

export const sql = new Proxy({} as NeonQueryFunction<false, false>, _handler)
