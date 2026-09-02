# FASE A5 — Diseño del sistema analítico de Nartalis

> Fase **READ-ONLY / DISEÑO**. Sin implementación. Documento de diseño para revisión.
> Datos verificados en vivo contra Neon (2026-09-02).

---

## 0. Contexto de datos real (verificado en vivo)

| Fuente | Realidad verificada |
|---|---|
| `nartalis_users` | 2 filas: ADMIN (Sebastián, `sebasestebanjove@gmail.com`) + `prova@prova.com`. Ambas creadas 2026-07-31. **Usuarios reales de producto registrados = 0**. |
| `farma_search_log` | 322 filas (296 `source='home'`, 26 `source='medicine_page'`). 23 con `user_id` (el admin, 1 usuario distinto). Resto anónimas. |
| `nartalis_user_medicamentos` | 6 filas, todas del admin. |
| `nartalis_user_consultas` | 10 filas: 9 del admin, 1 de prova. |
| `dermo_users`, `ia_module_users` | 0 filas (sistemas independientes, vacíos). |

**Implicación:** toda la actividad persistida en Neon pertenece al admin o a la cuenta de prueba. Las métricas de producto (registro, activación, retención, botiquín) **no tienen datos reales** hoy. Deben mostrarse como «Sin datos suficientes», nunca como `0`.

---

## 1. Modelo de métricas

Leyenda de clasificación:
- **DISPONIBLE AHORA** — calculable hoy con Neon.
- **DISPONIBLE CON CONFIGURACIÓN** — calculable tras configurar un informe/dimensión en GA4 (no requiere código).
- **DISPONIBLE SOLO EN GA4** — solo en GA4, inaccesible desde el código Admin.
- **DISPONIBLE SOLO EN NEON** — solo en DB.
- **NO DISPONIBLE** — imposible con los datos existentes.
- **FUTURA** — requiere nuevo tracking/schema.

### 1.1 Acquisition (GA4)

| KPI | Definición | Clasificación | Disponible hoy | Requiere cambio | Prioridad |
|---|---|---|---|---|---|
| Usuarios | Usuarios activos (GA4) | SOLO EN GA4 | ✔ panel web | Configurar para mostrar | Alta |
| Sesiones | Sesiones GA4 | SOLO EN GA4 | ✔ panel web | Configurar | Alta |
| Sesiones por fuente (organic/contextual/internal) | Dimensión source/medium | DISPONIBLE CON CONFIGURACIÓN | ✔ (source param existe) | Configurar dimensión/detalle en GA4 | Alta |
| Fichas vistas (total) | `medicine_view` | SOLO EN GA4 | ✔ | — | Alta |

### 1.2 Engagement (GA4)

| KPI | Definición | Clasificación | Requiere cambio | Prioridad |
|---|---|---|---|---|
| Usuarios con ≥1 ficha | Usuarios que dispararon `medicine_view` | SOLO EN GA4 | — | Alta |
| Usuarios con ≥2 fichas distintas | Usuarios con `medicine_second_view` | SOLO EN GA4 | — | Alta |
| `medicine_second_view` (eventos) | Evento R3 | SOLO EN GA4 | — | Alta |
| Ratio de profundidad | `medicine_second_view` ÷ `medicine_view` | SOLO EN GA4 | — | Alta |

### 1.3 Product (saved/search — Neon)

| KPI | Definición | Clasificación | Disponible hoy | Prioridad |
|---|---|---|---|---|
| Búsquedas (total) | `COUNT(*) FROM farma_search_log` | DISPONIBLE AHORA | ✔ 322 | Alta |
| Búsquedas exitosas | `COUNT(*) WHERE was_successful` | DISPONIBLE AHORA | ✔ | Alta |
| Búsquedas sin resultados | `COUNT(*) WHERE NOT was_successful` | DISPONIBLE AHORA | ✔ | Alta |
| Búsquedas identificadas | `COUNT(*) WHERE user_id IS NOT NULL` | DISPONIBLE AHORA | ✔ 23 | Media |
| Búsquedas anónimas | `COUNT(*) WHERE user_id IS NULL` | DISPONIBLE AHORA | ✔ 299 | Media |
| Búsquedas por source | GROUP BY `source` | DISPONIBLE AHORA | ✔ home/medicine_page | Media |
| Evolución temporal | GROUP BY día `created_at` | DISPONIBLE AHORA | ✔ | Media |
| Medicamentos guardados | `COUNT(*) nartalis_user_medicamentos` | DISPONIBLE AHORA | ✔ 6 | Alta |
| Usuarios con botiquín | `COUNT(DISTINCT user_id)` | DISPONIBLE AHORA | ✔ 1 | Alta |
| Evolución del botiquín | GROUP BY día `created_at` | DISPONIBLE AHORA | ✔ | Media |

### 1.4 Conversion / Activation (Neon + eventos)

| KPI | Definición | Clasificación | Estado real | Prioridad |
|---|---|---|---|---|
| Registros GA4 | `sign_up` / `REGISTRATION_*` events | SOLO EN GA4 | Sin datos reales | Media |
| Usuarios Neon | `COUNT(*) nartalis_users` | DISPONIBLE AHORA | 2 (0 reales) | Alta |
| Registros reales (excl. admin/test) | count con exclusión | DISPONIBLE AHORA (con filtro) | 0 | Alta |

### 1.5 Retention (Neon)

| KPI | Definición | Clasificación | Estado real | Prioridad |
|---|---|---|---|---|
| D1 / D7 / D30 | Cohortes sobre `created_at` | DISPONIBLE AHORA (SQL) | Sin datos reales | Alta |

---

## 2. Funnel oficial

### NIVEL 1 — ADQUISICIÓN
- **Definición:** usuario llega a Nartalis.
- **Fuente:** GA4 (usuarios/sesiones, por source).
- **Métrica cuantificable desde Admin (GA4):** sesiones. En Neon: no hay equivalente.

### NIVEL 2 — MEDICINE VIEW
- **Definición:** usuario consulta una ficha de medicamento.
- **Evento:** `medicine_view`.
- **Fuente:** GA4.
- **Métrica:** eventos `medicine_view` y usuarios con ≥1.

### NIVEL 3 — DEEP ENGAGEMENT
- **Definición:** usuario consulta una segunda ficha **distinta**.
- **Evento:** `medicine_second_view`.
- **Fuente:** GA4.
- **Ratio de profundidad:**
  - **Numerador:** usuarios con ≥1 `medicine_second_view` (1 por sesión según semántica R3).
  - **Denominador:** usuarios con ≥1 `medicine_view`.
  - Ratio = numerador ÷ denominador.
  - ⚠️ `medicine_second_view` ≠ «usuarios únicos que vieron 2 fichas»: el evento se dispara una vez la primera vez que se pasa de 1→2 fichas distintas en la misma sesión, con límite de 1 por sesión (memoria de 30 min). No captura la profundidad completa ni sesiones posteriores.

### NIVEL 4 — SEARCH
- **Definición:** el usuario realiza una búsqueda.
- **Fuente:** Neon (`farma_search_log`) + GA4 (`MEDICINE_SEARCH_*`).
- **En Admin:** usar Neon (preciso, persistido). GA4 como complemento.

### NIVEL 5 — PRODUCT INTENT
- **Definición:** el usuario interactúa con el botiquín (guarda un medicamento en su espacio).
- **Fuente:** Neon (`nartalis_user_medicamentos`). No hay necesidad de evento GA4 para contar guardados.
- **Métrica:** medicamentos guardados + usuarios con botiquín.

### NIVEL 6 — REGISTRATION
- **Definición:** el usuario crea cuenta y queda con `role=USER`.
- **Fuente:** Neon (`nartalis_users`).
- **Nota:** excluir admin y test del análisis de adquisición.

### NIVEL 7 — ACTIVATION
- **Definición (recomendada):** usuario registrado que guarda su **primer** medicamento en el botiquín.
- **Fuente:** Neon — un usuario pasa a «activado» cuando existe `≥1` fila en `nartalis_user_medicamentos` para su `user_id`.
- Ver candidatos en §13.

### NIVEL 8 — RETENTION
- **Definición:** usuario registrado que vuelve a realizar actividad de producto dentro de D1/D7/D30.
- **Fuente:** Neon (identidad conocida).
- Ver §14.

---

## 3. Fuente de verdad (GA4 vs Neon)

| Dominio | Fuente de verdad |
|---|---|
| Comportamiento anónimo (adquisición, medicine_view, medicine_second_view, navegación, engagement pre-registro) | **GA4** |
| Usuarios registrados, búsquedas persistidas, medicamentos guardados, consultas, login, retención de identificados, datos de producto | **Neon** |
| SEARCH | Neon (preciso) + GA4 (complemento) |

**Decisión:** NO duplicar automáticamente eventos GA4 en Neon. NO crear tabla de eventos anónimos sin justificación fuerte.

---

## 4. Limitaciones

### 4.1 Identidad anónima → registrada (limitación fundamental)
- GA4 mide comportamiento anónimo sin identidad persistente atribuible.
- Neon conoce usuarios registrados.
- **Hoy no existe unión fiable** entre la actividad anónima pre-registro y el usuario registrado (aunque existe `setUserId` para el admin, no hay consistencia productiva general).
- Por tanto, en Admin se **segregarán**:
  1. **Funnel de comportamiento anónimo** → GA4 (1→2→3).
  2. **Funnel de producto identificado** → Neon (4→5→6→7→8).
  3. **Métricas combinadas** → solo donde exista unión metodológicamente válida (p. ej. no mezclar usuarios GA4 con usuarios Neon en un mismo numerador).

### 4.2 Otras limitaciones
- `medicine_second_view`: no mide profundidad total ni sesiones múltiples (1/sesión, 30-min memoria).
- Cardinalidad de MEDICA MEMMENTOS: sin tracking de fichas más vistas en Neon; GA4 tiene riesgo de cardinalidad Alta sin configuración específica.
- GA4 no accesible programáticamente desde el entorno/código (sin credenciales Data API).

---

## 5. Diseño del Admin

### 5.1 Estructura
- **Integración en el Admin existente** (no app paralela): nuevo tab **«Analytics»** en `AdminLayout` (`AdminTab = 'analytics'`).
- Nueva vista `AdminAnalyticsView.tsx` con sub-pestañas internas.
- **Ruta:** mantenemos el SPA actual (`/admin`); no se crea `/admin/analytics` como ruta separada para no duplicar la navegación. (Alternativa opcional: ruta `/admin/analytics`; se decide en implementación.)

### 5.2 Sub-pestañas de Analytics
1. **Overview** — resumen unificado.
2. **Acquisition** — GA4 (source/medium).
3. **Medicine Engagement** — GA4.
4. **Search** — Neon.
5. **Botiquín** — Neon.
6. **Conversion** — Registro + Activación (Neon).
7. **Retention** — Neon (D1/D7/D30).
8. **Fuentes** — comparativa organic/contextual/internal.
9. **Medicamentos** — (fase posterior, ver §15).

### 5.3 Filtros comunes
- Periodo (7d / 30d / 90d / intervalo).
- Excluir admin/test (toggle, ver §17).

### 5.4 Disposición de fuentes por tab
| Tab | Fuente | ¿Alcanzable desde código? |
|---|---|---|
| Overview | Mixto | Parcial (Neon sí; GA4 no) |
| Acquisition | GA4 | No → enlace/instrucciones al panel GA4 |
| Medicine Engagement | GA4 | No → enlace/instrucciones al panel GA4 |
| Search | Neon | Sí |
| Botiquín | Neon | Sí |
| Conversion | Neon | Sí |
| Retention | Neon | Sí |
| Fuentes | GA4 | No → enlace panel GA4 |

> Para las secciones GA4 que no son alcanzables desde el código, el Admin mostrará un **bloque informativo con el cálculo ya resuelto en la definición** y un **enlace directo a la exploración GA4 pertinente** (con filtro por evento), más la **instrucción para leerlo en el panel**. No se fabricará el dato.

---

## 6. Activación — definición

Candidatos (orden de utilidad):
1. **A1 (recomendada):** registrar usuario con **≥1 medicamento guardado** en botiquín. Métrica reproducible en Neon (`EXISTS` en `nartalis_user_medicamentos`). Es un momento real de valor (el usuario construye su espacio).
2. **A2:** registrar usuario con **≥1 consulta** (`nartalis_user_consultas`). Menos distintivo (la consulta puede ser pasiva).
3. **A3:** registrar usuario con **≥1 búsqueda exitosa identificada** (`farma_search_log` con `was_successful` y `user_id`). Requiere comportamiento activo pero el umbral es bajo.

**Recomendación: A1** — objetiva, reproducible, usa datos existentes, representa el momento en que el usuario adopta el producto (crea su botiquín) y no lo contamina el simple registro/login.

**Estado real hoy:** 0 usuarios activos (solo admin, excluido).

---

## 7. Retención — definición

Antes de fijar: auditamos señales de actividad disponibles.
- `nartalis_users.last_login_at` — señal de login, pero no es señal de uso de producto.
- `farma_search_log.created_at` (+`user_id`) — búsqueda (actividad real).
- `nartalis_user_consultas.consulted_at` — consulta de ficha (actividad de producto).
- `nartalis_user_medicamentos.created_at` / `updated_at` — guardado/modificación de botiquín.

**Definición de «actividad de retorno» (orden de preferencia):**
1. Búsqueda (`farma_search_log` con `user_id`).
2. Consulta de ficha (`nartalis_user_consultas`).
3. Guardado/modificación de medicamento (`nartalis_user_medicamentos`).

**Cohorte:** usuarios registrados (`nartalis_users`) con `role=USER`, excluyendo admin/test, agrupados por mes/semana de `created_at`.

**D1/D7/D30:**
- **D1:** usuario de la cohorte con ≥1 actividad de retorno en (created_at, created_at + 1 día].
- **D7:** …en (created_at, created_at + 7 días].
- **D30:** …en (created_at, created_at + 30 días].

**Limitaciones:**
- Hoy solo existe el admin → sin datos reales de retención; se muestra «Sin datos suficientes».
- La actividad depende de qué se considere «válida» (ver lista). No usar solo `last_login_at` como señal.
- Retención solo válida para usuarios identificados (Neon), no aplica a anónimos.

---

## 8. Exclusión admin/test — propuesta

### 8.1 Identificación
Partir de un conjunto de reglas resolubles:
- `role = 'ADMIN'` → excluir.
- Correo de prueba conocido (`prova@prova.com` y patrones `test`, `prueba`, `@example.com`, `+test`, `email_verified=false` y sin verificación de dominio) → excluir o marcar.
- Flag futuro `is_internal BOOLEAN` / `is_test BOOLEAN` en `nartalis_users` (schema de estilo existente tiene `is_test` en `farma_search_log`) → **diseño, no implementado**.

### 8.2 Mecanismo en Admin
- Definir una **constante de exclusión** (lista de emails/IDs + regla `role='ADMIN'`) reutilizable por todas las queries de Analytics.
- Unica vía: helper de filtro en las queries SQL (p. ej. `user_id NOT IN (SELECT id FROM nartalis_users WHERE role='ADMIN' OR email ILIKE …)`).
- Toggle en UI para incluir/excluir (default: excluir).

### 8.3 Nota
- No modificar código ni schema en esta fase. Solo diseño.

---

## 9. Arquitectura técnica (sin implementación)

- Nuevo tab `analytics` en `AdminLayout` + `AdminAnalyticsView` con sub-tabs.
- Nuevo endpoint (1 o varios) bajo `/api/admin/analytics/*`:
  - `search` (Neon) — agrupaciones de `farma_search_log`.
  - `product` (Neon) — botiquín, consultas, activación, retención, registros.
  - `GA4` no se expone desde código; se provee como bloque informativo + enlace al panel.
- Cada endpoint reutiliza `requireAdmin` / `adminUnauthorized`.
- Queries Neon read-only, agrupadas por periodo, con filtro de exclusión.

### Consideraciones de N+1 y coste
- Evitar subqueries por fila. Usar `GROUP BY` agregados + `COUNT(DISTINCT)`.
- Retención: 1 query con `CASE WHEN` sobre fechas de actividad por cohorte (un solo paso).
- Cache sugerida: a nivel de endpoint (p. ej. `fetch` con `next: { revalidate: 300 }` o cache en memoria), dado que son métricas no time-críticas.
- Volumen actual diminuto (322 búsquedas, 6 meds, 2 usuarios) → coste Neon insignificante. Escalará bien.

---

## 10. Coste y riesgos

| Ítem | Riesgo | Mitigación |
|---|---|---|
| Queries Neon por visita | Coste no nulo | Cache 5 min, endpoints read-only agregados |
| N+1 en retención (por usuario) | Inflar coste | Query agregada con CASE WHEN, 1 round-trip |
| Filtro exclusión olvidado | Contaminar métricas | Helper central de exclusión usado por todos los endpoints |
| Mostrar `0` sin datos | Engaño al usuario | Regla de estados (§16) |
| Cardinalidad GA4 (medicamentos) | Datos inexactos/no disponibles | Sección GA4 como fase posterior con panel dedicado |
| Sin credenciales GA4 | No alcanzar datos GA4 desde código | Presentar como bloque informativo + enlace al panel GA4 |

---

## 11. Gaps pendientes tras A5

1. **Datos GA4 desde código:** inaccesibles sin credenciales Data API. Actualmente solo panel web.
2. **Unión anónimo→registrado:** no existe identidad persistente fiable. Bloque enfoque (futuro: user-id pragmático o analytics user_id en Neon al registrar).
3. **`medicine_second_view`:** sin profundidad completa ni sesiones múltiples.
4. **Activación real:** 0 usuarios → sin datos suficientes hasta que haya tráfico real.
5. **Retención real:** sin datos suficientes.
6. **Cardinalidad de medicamentos (fichas más vistas):** fase posterior.
7. **Flag `is_internal`/`is_test` en schema:** no aprobado aún.

---

## 12. Plan de implementación recomendado (orden)

| Fase | Contenido |
|---|---|
| **A6a** | Diseñar plan de cambios por archivo (OBLIGATORIO/OPCIONAL/NO HACER) y **ESPEREAR aprobación**. |
| **B1** | Tab `Analytics` + `AdminAnalyticsView` + skeleton Overview (Neon listo; GA4 como bloques informativos + enlaces). |
| **B2** | Secciones Neon: Search (§10), Botiquín (§11), Conversion/Activación (§12-13), Retention (§14). |
| **B3** | Filtro de exclusión admin/test central + toggle. |
| **B4** | Secciones GA4: Acquisition, Medicine Engagement, Fuentes (bloques informativos + enlaces al panel GA4). |
| **B5** | Estados «Sin datos» / «Datos insuficientes» en toda la UI. |
| **B6** | (Opcional/futuro) Credenciales GA4 Data API → datos reales en Admin. |
| **B7** | (Futuro) Sustituir `is_test` por flags formales; cardinalidad de medicamentos. |

> Cada fase se implementa solo tras aprobación explícita.

---

## 13. Proyecto: detalle de prioridad de KPI

Agrupación por prioridad para la implementación de las secciones Neon (máximo retorno con mínimo coste):
- **Alta:** búsquedas (éxito/sin resultados), botiquín (guardados/usuarios), registros reales, activación (A1), retención D1/D7/D30.
- **Media:** evolución temporal, origen de búsqueda, búsquedas identificadas vs anónimas.
- **Baja/futura:** GA4 profundo (cardinalidad, fuentes por source) sin credenciales.
