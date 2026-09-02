# Feedback de usuario — Nartalis

**Fecha de elaboración:** 27/08/2026
**Estado:** Pendiente de revisión
**Recordatorio:** Revisar el 1/9/2026 al iniciar sesión (ver AGENTS.md)

> Resumen del informe de uso realizado como usuario final: Home → búsqueda → ficha de medicamento → registro → "Mi espacio personal". Solo lectura, sin cambios de código.

---

## ✅ Lo que funciona muy bien (mantener)

- **Marca y confianza**: el nuevo `[LOGO] Nartalis` se ve limpio; el disclaimer médico ("no sustituye el consejo...") aparece en Home, resultados y ficha — clave para un producto de salud. (`ResultsScreen.tsx:187`, `DetailScreen.tsx:292`, `ProspectoView.tsx:299`)
- **Búsqueda tolerante a errores**: varios niveles de recuperación (corrección sugerida, reintento con prefijos, fuzzy con Fuse.js) — por encima de la media. (`api/farma/search/route.ts:345-445`)
- **Ficha rica y clara**: principio activo, dosis, forma, vía, ATC, laboratorio, presentaciones con CN, excipientes, chips con tooltip/leyenda (Receta, Conducción, Embarazo, EFG...). (`ProspectoView.tsx:216-445`)
- **Continuidad de consulta**: buscador contextual dentro de la ficha ("¿Buscas otro medicamento?") sin salir. (`ContextualMedSearch.tsx`)
- **"Espacio personal" con utilidad real**: guardar medicamentos, favoritos (estrella), historial con fechas relativas. (`EspacioDashboard.tsx:134-184`)
- **Accesibilidad cuidada**: modales con gestión de foco/trap, `aria-live`, `aria-label`, estados focus-visible. (`AuthModal.tsx`, `ContextualMedSearch.tsx:134`)
- **Acciones útiles en la ficha**: "Escuchar" (voz), "Prospecto" y "Ficha Téc." (PDFs oficiales). (`ProspectoView.tsx:538-558`)

---

## ⚠️ Lo que frena o confunde

1. **Tras registrar/loguear la página está vacía** — el "welcome" no explica qué hacer ni muestra valor real. Primera impresión post-registro débil. (`EspacioDashboard.tsx:96-117`)
2. **La Home no tiene autocompletado**: hay que pulsar Buscar; un desplegable predictivo aceleraría. El motor ya existe en /espacio (`V2Search.tsx:33`, debounce 300ms). Inconsistencia UX entre superficies.
3. **Sin eliminar/editar desde el grid de "Mis medicamentos"** — solo favorito (estrella); no puedo quitar un medicamento que ya no tomo. (`EspacioDashboard.tsx:159-172`, `V2MedCard.tsx`)
4. **Relaciones entre medicamentos poco claras** — "Otros medicamentos con el mismo principio activo / mismo grupo ATC" confunden sin contexto. (`ProspectoView.tsx:508-532`)
5. **El badge FREE/PREMIUM no se explica** — no queda claro qué implica ni qué gana el usuario. (`V2Header.tsx:46`)

---

## 💡 Qué añadiría (priorizado)

| Prioridad | Idea | Por qué |
|---|---|---|
| Alta | **Alerta / recordatorio de toma** por medicamento guardado | Hook que convierte "guardo" en "vuelvo cada día". El copy ya promete "alertas siempre contigo" pero no existen (`PersonalSpaceCard.tsx:49`). |
| Alta | **Autocompletado en la Home** + sugerencias mientras escribo | El motor ya existe en `V2Search`; solo portarlo. Baja fricción, alto impacto. |
| Alta | **Sincronizar favorito/dosis en calendario o botiquín** ampliado (caducidad, dosis) | Convierte el espacio en botiquín real. |
| Media | **Eliminar/editar desde el grid** de "Mis medicamentos" | Control básica sobre los datos. |
| Media | **Búsqueda por síntoma/indicio visible** (ya existe `/medicamentos/para-que-sirve/[pa-slug]`) | Alto valor informativo. |
| Media | **Explicar mejor el plan PREMIUM** (comparativa) | Los gratuitos entienden por qué registrarse; los premium, qué pagan. |
| Media | **Descargar / imprimir la ficha** | Acción esperada en un buscador médico. |
| Baja | **Modo lectura / tamaño de letra ajustable** en el prospecto | Accesibilidad para mayores (público objetivo típico). |

---

## 🔍 Detalles técnicos observados (informativo, fuera del alcance)

- **Bloque de Dermofarmacia IA comentado** en `DetailScreen.tsx:373-419` (medicamentos ATC clase D) — dead code que podría limpiarse o reactivarse.
- **Cambios locales sin commitear** en `DetailScreen.tsx` y `ProspectoView.tsx` (se dejaron intactos; no forman parte del commit del logo).
