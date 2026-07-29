import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'
import { dermoChat } from '@/lib/ai/dermoChat'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { answers } = body

  // Detect if this is an advanced quiz (has fototipo field)
  const isAdvanced = !!(answers?.fototipo)

  if (!isAdvanced && !answers?.skin_type) {
    return NextResponse.json({ error: 'Falta el tipo de piel' }, { status: 400 })
  }

  try {
    const userEmail = user.email
    const isPremium = !!user.is_premium

    const allergies = (answers.allergies || []).filter(Boolean)
    const goals = (answers.goals || []).filter(Boolean)

    // Compute Skin Score for context
    let skinScore = 50;
    try {
      const [consultCount, bookingCount, routineCount] = await Promise.all([
        sql`SELECT COUNT(*)::int as c FROM dermo_consultations WHERE user_email = ${userEmail}`,
        sql`SELECT COUNT(*)::int as c FROM dermo_bookings WHERE user_email = ${userEmail}`,
        sql`SELECT COUNT(*)::int as c FROM dermo_user_routines WHERE user_email = ${userEmail}`,
      ]);
      const c = consultCount[0]?.c ?? 0;
      const b = bookingCount[0]?.c ?? 0;
      const r = routineCount[0]?.c ?? 0;
      skinScore = Math.min(100, 40 + (r > 0 ? 15 : 0) + Math.min(c * 5, 25) + Math.min(b * 5, 10) + (r > 0 ? 10 : 0));
    } catch { /* non-critical */ }

    if (isPremium) {
      let prompt: string;
      let skinType = '';
      let skinTypeName = 'personalizada';

      if (isAdvanced) {
        skinType = answers.skin_type || answers.fototipo || '';
        skinTypeName = answers.fototipo ? `Fototipo ${answers.fototipo}` : skinType;

        prompt = `Eres un asesor experto en dermofarmacia integrativa. Genera una rutina de cuidado facial personalizada basándote en este análisis completo del exposoma del paciente.

DATOS DEL PACIENTE:
- Edad: ${answers.edad || 'no especificada'}
- Sexo: ${answers.sexo || 'no especificado'}
- Fototipo cutáneo: ${answers.fototipo || 'no especificado'}
- Motivo de consulta: ${answers.motivoConsulta || 'no especificado'}
- Diagnósticos previos: ${answers.diagnosticosPrevios || 'ninguno'}
- Tratamientos actuales: ${answers.tratamientosActuales || 'ninguno'}
- Antecedentes: ${answers.antecedentes || 'ninguno'}
- Cirugías / medicación: ${answers.cirugiasMedicacion || 'ninguna'}
- Alergias: ${answers.alergias || 'ninguna'}
- Eventos desencadenantes: ${answers.eventosDesencadenantes || 'ninguno'}
- Objetivo del paciente: ${answers.objetivoPaciente || 'mejorar calidad de la piel'}

HÁBITOS Y EXPOSOMA:
- Alimentación: ${(answers.alimentacion || []).join(', ') || 'no especificada'}
- Suplementación: ${answers.suplementacion || 'no especificado'}
- Pescado azul/semana: ${answers.pescadoAzul || 'no especificado'}
- Agua/día: ${answers.agua || 'no especificado'}
- Alcohol: ${answers.alcohol || 'no especificado'}
- Tabaco: ${answers.tabaco || 'no especificado'}
- Actividad física: ${answers.actividadFisica || 'no especificado'}
- Problemas de sueño: ${answers.problemasSueno || 'ninguno'}
- Pantallas antes de dormir: ${answers.pantallas || 'no especificado'}

EJE INTESTINO-PIEL:
- Distensión/hinchazón: ${answers.distension || 'no especificado'}
- Dolor abdominal: ${answers.dolorAbdominal || 'no especificado'}
- Gases: ${answers.gases || 'no especificado'}
- Reflujo: ${answers.reflujo || 'no especificado'}
- Alimentos que empeoran reflujo: ${(answers.alimentosReflujo || []).join(', ') || 'ninguno'}
- Signos de histamina: ${answers.histamina || 'no especificado'}
- Antibióticos/gástricos (6 meses): ${answers.antibioticos || 'no especificado'}

ESTADO NEURO-EMOCIONAL (escala 1-10):
- Estrés: ${answers.estres ?? '5'}/10
- Ansiedad: ${answers.ansiedad ?? '5'}/10
- Ánimo bajo: ${answers.animo ?? '5'}/10
- Energía: ${answers.energia ?? '5'}/10
- Calidad del sueño: ${answers.calidadSueno ?? '5'}/10
- Despertares nocturnos: ${answers.despertares || 'no especificado'}
- Descanso al despertar: ${answers.descanso || 'no especificado'}
- Circunstancias estresoras: ${answers.circunstanciasEstresoras || 'ninguna'}
- Estrategias de regulación: ${(answers.regulacion || []).join(', ') || 'ninguna'}

RUTINA DE CUIDADOS:
- Preocupación principal: ${(answers.preocupacionPrincipal || []).join(', ') || 'no especificada'}
- Limpieza actual: ${answers.limpiezaActual || 'no especificado'}
- Hidratante actual: ${answers.hidratanteActual || 'no especificado'}
- Antioxidantes: ${(answers.antioxidantes || []).join(', ') || 'ninguno'}
- Activos actuales: ${(answers.activosActuales || []).join(', ') || 'ninguno'}
- Producto ojos: ${answers.productOjos || 'no especificado'}
- Crema reparadora: ${answers.cremaReparadora || 'no especificado'}
- Fotoprotección diaria: ${answers.fotoproteccionDiaria || 'no especificado'}
- Tratamiento noche: ${answers.tratamientoNoche || 'no especificado'}
- Reacciona a cosméticos: ${answers.reaccionCosmeticos || 'no especificado'}
- Empeora con alcohol/picante: ${answers.empeoraAlcohol || 'no especificado'}
- Reacciona a joyas: ${answers.reaccionJoyas || 'no especificado'}
- Dificultad limpiador: ${answers.dificultadLimpiador || 'no especificado'}

Skin Score actual: ${skinScore}/100

Basándote en TODOS los datos anteriores, diseña una rutina personalizada que aborde:
1. La preocupación principal del paciente
2. Los desequilibrios del eje intestino-piel detectados
3. El estado neuro-emocional y su impacto en la piel
4. El fototipo y las necesidades de fotoprotección
5. Los activos ya en uso (para no duplicar ni antagonizar)

Responde SOLO con un objeto JSON válido (sin markdown, sin explicación extra):
{
      "am_routine": [
    { "step": "Limpieza", "productName": "Marca NombreProducto (máx 45 caracteres, sin descripción)", "order": 1 },
    { "step": "Sérum", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 2 },
    { "step": "Hidratante", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 3 },
    { "step": "Protección solar", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 4 }
  ],
  "pm_routine": [
    { "step": "Desmaquillante", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 1 },
    { "step": "Limpieza", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 2 },
    { "step": "Sérum nocturno", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 3 },
    { "step": "Hidratante nocturna", "productName": "Marca NombreProducto (máx 45 caracteres)", "order": 4 }
  ],
  "explanation": "Texto explicativo en español que conecte los hallazgos del exposoma con las recomendaciones, máximo 4 párrafos.",
  "recommendation": "Recomendaciones accionables específicas sobre alimentación, suplementación, manejo del estrés y ajustes en rutina.",
  "dietary_tips": "Consejos dietéticos personalizados según los hallazgos digestivos.",
  "supplement_suggestions": "Sugerencias de suplementación si procede."
}`;
      } else {
        // Basic quiz — same prompt as before
        skinType = answers.skin_type || '';
        skinTypeName = skinType;

        prompt = `Genera una rutina de cuidado facial personalizada en formato JSON exacto.

Datos del usuario:
- Tipo de piel: ${answers.skin_type}
- Alergias/sensibilidades: ${allergies.length ? allergies.join(', ') : 'ninguna'}
- Objetivos: ${goals.length ? goals.join(', ') : 'ninguno'}
- Protección solar: ${answers.sun_protection || 'no especificado'}
- Skin Score actual: ${skinScore}/100

Basándote en el Skin Score, adapta la rutina para mejorar las áreas más débiles del cuidado actual.

Responde SOLO con un objeto JSON (sin markdown, sin explicación extra):
{
      "am_routine": [
    { "step": "Limpieza", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 1 },
    { "step": "Sérum", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 2 },
    { "step": "Hidratante", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 3 },
    { "step": "Protección solar", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 4 }
  ],
  "pm_routine": [
    { "step": "Desmaquillante", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 1 },
    { "step": "Limpieza", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 2 },
    { "step": "Sérum nocturno", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 3 },
    { "step": "Hidratante nocturna", "productName": "Marca + nombre corto (máx 45 caracteres)", "order": 4 }
  ],
  "explanation": "Texto explicativo en español, máximo 3 párrafos.",
  "recommendation": "Recomendación accionable basada en el skin score y objetivos."
}`;
      }

      const systemContext = `Eres un asesor experto en dermofarmacia ${
        isAdvanced ? 'integrativa especializado en el eje intestino-piel y el exposoma' : ''
      } especializado en crear rutinas faciales personalizadas.`

      const result = await dermoChat(
        { query: prompt, productContext: systemContext },
        userEmail
      )

      // Parse JSON from response — robusta con extracción de {…}
      let routineData
      try {
        let cleaned = result.content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start !== -1 && end > start) {
          cleaned = cleaned.slice(start, end + 1)
        }
        routineData = JSON.parse(cleaned)
      } catch {
        // JSON truncado — intentar reparar cerrando llaves/corchetes/strings
        let fixed = result.content
        try {
          // Extraer contenido entre { } igual que arriba
          const s = fixed.indexOf('{')
          const e = fixed.lastIndexOf('}')
          if (s !== -1 && e > s) fixed = fixed.slice(s, e + 1); else throw ''
          // Cerrar strings y estructuras incompletas
          let openB = (fixed.match(/\{/g) || []).length
          let closeB = (fixed.match(/\}/g) || []).length
          let openSq = (fixed.match(/\[/g) || []).length
          let closeSq = (fixed.match(/\]/g) || []).length
          while (openB > closeB) { fixed += '}'; closeB++ }
          while (openSq > closeSq) { fixed += ']'; closeSq++ }
          // Cerrar string si el último carácter antes de } es parte de un string sin cerrar
          const lastQ = fixed.lastIndexOf('"')
          const lastBr = fixed.lastIndexOf('}')
          if (lastQ > lastBr && !fixed.slice(lastQ + 1).includes('"')) {
            fixed = fixed.slice(0, lastQ + 1) + '"' + fixed.slice(lastQ + 1)
          }
          routineData = JSON.parse(fixed)
        } catch {
          routineData = {
            am_routine: [],
            pm_routine: [],
            explanation: result.content || 'Tu rutina personalizada se ha generado. Puedes ver los detalles en el panel principal.',
          }
        }
      }

      // Strip markdown from explanation text
      if (routineData.explanation) {
        routineData.explanation = routineData.explanation.replace(/\*\*/g, '').replace(/___?/g, '').replace(/`[^`]*`/g, (m: string) => m.slice(1, -1))
      }

      // Generate a smart name
      const goalsStr = goals.length > 0 ? goals[0] : 'cuidado facial'
      const routineName = isAdvanced
        ? `Rutina Avanzada ${answers.fototipo ? 'Fototipo ' + answers.fototipo : ''} — ${answers.objetivoPaciente?.slice(0, 40) || goalsStr}`
        : `Rutina ${skinTypeName} — ${goalsStr}`

      // Archive current active routine before inserting the new one
      await sql`
        UPDATE dermo_user_routines
        SET status = 'archived', updated_at = NOW()
        WHERE user_email = ${userEmail} AND (status = 'active' OR status IS NULL)
      `

      // Save to DB
      const inserts = await sql`
        INSERT INTO dermo_user_routines (user_email, skin_type, allergies, goals, am_routine, pm_routine, explanation, is_completed, name, status)
        VALUES (${userEmail}, ${skinType}, ${allergies}, ${goals},
          ${JSON.stringify(routineData.am_routine || [])},
          ${JSON.stringify(routineData.pm_routine || [])},
          ${routineData.explanation || ''}, true, ${routineName}, 'active')
        RETURNING id
      `
      const inserted = inserts?.[0]

      if (!inserted?.id) {
        console.error('[generate] INSERT returned no id:', { inserts, userEmail, routineName })
      }

      return NextResponse.json({
        id: inserted?.id || null,
        am_routine: routineData.am_routine || [],
        pm_routine: routineData.pm_routine || [],
        explanation: routineData.explanation || '',
        recommendation: routineData.recommendation || `Basado en tu Skin Score (${skinScore}/100), sigue esta rutina de forma constante para maximizar resultados.`,
        skin_score: skinScore,
        is_completed: true,
        name: routineName,
      })
    }

    // FREE user — save basic answers, return premium_required
    await sql`
      INSERT INTO dermo_user_routines (user_email, skin_type, allergies, goals, is_completed)
      VALUES (${userEmail}, ${answers.skin_type}, ${allergies}, ${goals}, false)
      ON CONFLICT DO NOTHING
    `

    return NextResponse.json({
      skin_type: answers.skin_type,
      premium_required: true,
      message: 'Completa tu suscripción premium para ver tu rutina personalizada generada por IA.',
      is_completed: false,
    })
  } catch (err: any) {
    console.error('Routine generate error:', err)
    return NextResponse.json({ error: 'Error al generar rutina: ' + (err.message || 'Error interno') }, { status: 500 })
  }
}
