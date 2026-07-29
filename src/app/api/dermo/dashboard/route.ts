import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

function calcSkinScore(consultations: number, bookings: number, routines: number, hasRoutine: boolean): { score: number; breakdown: { base: number; routine: number; consultations: number; bookings: number; consistency: number } } {
  let score = 40;
  const bRoutine = hasRoutine ? 15 : 0;
  const bConsultations = Math.min(consultations * 5, 25);
  const bBookings = Math.min(bookings * 5, 10);
  const bConsistency = routines > 0 ? 10 : 0;
  score += bRoutine + bConsultations + bBookings + bConsistency;
  return { score: Math.min(score, 100), breakdown: { base: 40, routine: bRoutine, consultations: bConsultations, bookings: bBookings, consistency: bConsistency } };
}

function calcConsistency(consultations: number, bookings: number, routines: number): number {
  const total = consultations + bookings + routines;
  if (total === 0) return 0;
  return Math.min(50 + total * 8, 100);
}

function calcStreak(consultations: { created_at: string }[]): number {
  if (consultations.length === 0) return 0;
  const days = (consultations as any[]).map(c => c.created_at.split('T')[0]).filter(Boolean);
  const uniqueDays = [...new Set(days)].sort().reverse();
  if (uniqueDays.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const curr = new Date(uniqueDays[i - 1]);
    const prev = new Date(uniqueDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 2) streak++;
    else break;
  }
  return streak;
}

type Milestone = { date: string; text: string; icon: string };

function buildMilestones(data: {
  routineGenerations: { generated_at: string }[]
  consultations: { query: string; created_at: string }[]
  kpiEvents: { event_name: string; created_at: string; event_data: any }[]
  skinScoreHistory: { score: number; recorded_at: string }[]
  routineLogs: { log_date: string; is_completed: boolean }[]
  bookings: { created_at: string; pharmacy_name: string | null; product_name: string | null }[]
  goals: { goal_type: string; created_at: string }[]
  userCreatedAt: string | null
  hasRoutine: boolean
}): Milestone[] {
  const ms: Milestone[] = [];

  // 1. Routine generations
  data.routineGenerations.forEach(r => {
    ms.push({ date: r.generated_at, text: 'Rutina personalizada generada', icon: '📋' });
  });

  // 2. Consultations
  data.consultations.slice(0, 5).forEach(c => {
    ms.push({
      date: c.created_at,
      text: `Consulta: ${c.query.length > 45 ? c.query.slice(0, 45) + '…' : c.query}`,
      icon: '💬',
    });
  });

  // 3. KPI events
  const kpiLabels: Record<string, { text: string; icon: string }> = {
    vacation_mode_enabled: { text: 'Modo vacaciones activado', icon: '✈️' },
    travel_routine_generated: { text: 'Rutina de viaje generada', icon: '🌴' },
    travel_routine_cancelled: { text: 'Modo vacaciones finalizado', icon: '🏠' },
    medication_added: { text: 'Medicamento añadido al perfil', icon: '💊' },
    product_exhaustion_alert_generated: { text: 'Alerta de producto próximo a agotarse', icon: '📦' },
    weekly_report_viewed: { text: 'Informe Skin Coach semanal disponible', icon: '📊' },
    fit_score_analysis: { text: 'Fit Score de producto analizado', icon: '🎯' },
  };
  data.kpiEvents.forEach(e => {
    const label = kpiLabels[e.event_name];
    if (label) {
      const extra = e.event_data?.product_name ? ` (${e.event_data.product_name})` : '';
      ms.push({ date: e.created_at, text: label.text + extra, icon: label.icon });
    }
  });

  // 4. Skin Score threshold crossings
  const sortedScores = [...data.skinScoreHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  [40, 60, 80].forEach(threshold => {
    const crossing = sortedScores.find(s => s.score >= threshold);
    if (crossing) {
      const idx = sortedScores.indexOf(crossing);
      const earlier = sortedScores.slice(0, idx);
      if (!earlier.some(s => s.score >= threshold)) {
        ms.push({ date: crossing.recorded_at, text: `¡Skin Score alcanzó ${threshold} puntos!`, icon: '📈' });
      }
    }
  });

  // 5. Routine completions
  data.routineLogs.forEach(l => {
    if (l.is_completed) {
      ms.push({ date: l.log_date, text: 'Rutina diaria completada al 100%', icon: '✅' });
    }
  });

  // 6. Bookings
  data.bookings.forEach(b => {
    ms.push({
      date: b.created_at,
      text: `Reserva en ${b.pharmacy_name || 'farmacia'}${b.product_name ? ` — ${b.product_name}` : ''}`,
      icon: '🏪',
    });
  });

  // 7. Goals
  data.goals.forEach(g => {
    ms.push({ date: g.created_at, text: `Objetivo "${g.goal_type}" creado`, icon: '🎯' });
  });

  // Sort by date descending
  const sorted = ms
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  // If no milestones at all, fallback
  if (sorted.length === 0) {
    if (data.routineGenerations.length > 0) {
      sorted.push({
        date: data.routineGenerations[0].generated_at,
        text: 'Rutina personalizada generada',
        icon: '📋',
      });
    }
    if (data.userCreatedAt) {
      const date = data.userCreatedAt.split('T')[0];
      sorted.push({ date, text: 'Usuario registrado en Contrial', icon: '🎉' });
    }
    if (!data.hasRoutine) {
      sorted.push({
        date: new Date().toISOString().split('T')[0],
        text: 'Realiza el Test de Piel para obtener tu rutina personalizada',
        icon: '🧪',
      });
    }
  }

  return sorted;
}

export async function GET() {
  try {
    const user = await getDermoSession()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const email = user.email

    const [
      recentConsultations, latestRoutine, recentBookings,
      consultCountResult, bookingCountResult, routineCountResult, weeklyConsultations,
      routineGenerations, routineLogs,
    ] = await Promise.all([
      sql`
        SELECT id, query, created_at::text
        FROM dermo_consultations
        WHERE user_email = ${email}
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT id, skin_type, allergies, goals,
               am_routine::text, pm_routine::text, explanation, is_completed,
               name, status, generated_at::text as created_at
        FROM dermo_user_routines
        WHERE user_email = ${email}
        ORDER BY generated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT b.id, b.status, b.created_at::text,
               p.name as product_name,
               ph.name as pharmacy_name
        FROM dermo_bookings b
        LEFT JOIN dermo_products p ON p.id = b.product_id
        LEFT JOIN dermo_pharmacies ph ON ph.id = b.pharmacy_id
        WHERE b.user_email = ${email}
        ORDER BY b.created_at DESC
        LIMIT 5
      `,
      sql`SELECT COUNT(*)::int as count FROM dermo_consultations WHERE user_email = ${email}`,
      sql`SELECT COUNT(*)::int as count FROM dermo_bookings WHERE user_email = ${email}`,
      sql`SELECT COUNT(*)::int as count FROM dermo_user_routines WHERE user_email = ${email}`,
      sql`
        SELECT DATE(created_at) as day, COUNT(*)::int as count
        FROM dermo_consultations
        WHERE user_email = ${email} AND created_at >= NOW() - INTERVAL '28 days'
        GROUP BY DATE(created_at)
        ORDER BY day
      `,
      // ── New queries for milestones ──
      sql`
        SELECT generated_at::text
        FROM dermo_user_routines
        WHERE user_email = ${email}
        ORDER BY generated_at DESC
        LIMIT 10
      `,
      sql`
        SELECT log_date::text, is_completed
        FROM dermo_routine_logs
        WHERE user_email = ${email} AND is_completed = true
        ORDER BY log_date DESC
        LIMIT 10
      `,
    ])

    // These tables may not exist (migrations pending), fetch gracefully
    let kpiEvents: any[] = [];
    try { kpiEvents = await sql`
      SELECT event_name, created_at::text, event_data::text
      FROM dermo_kpi_events
      WHERE user_email = ${email}
      ORDER BY created_at DESC
      LIMIT 20
    ` as any; } catch { /* table may not exist */ }

    let skinScoreRows: any[] = [];
    try { skinScoreRows = await sql`
      SELECT score, recorded_at::text
      FROM dermo_skin_score_history
      WHERE user_email = ${email}
      ORDER BY recorded_at DESC
      LIMIT 50
    ` as any; } catch { /* table may not exist */ }

    // Goals table may not exist (migration pending), fetch gracefully
    let goals: { goal_type: string; created_at: string }[] = [];
    try { goals = (await sql`SELECT goal_type, created_at::text FROM dermo_user_goals WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 10`) as any; } catch {}

    // Get user created_at for fallback milestones
    let userCreatedAt: string | null = null;
    try {
      const userRows = await sql`SELECT created_at::text FROM dermo_users WHERE email = ${email} LIMIT 1`;
      userCreatedAt = (userRows[0] as any)?.created_at || null;
    } catch {}

    // If latest routine is a travel routine but no active travel, find the real one
    let effectiveRoutine = latestRoutine
    if (effectiveRoutine.length > 0 && effectiveRoutine[0]?.skin_type === 'viaje') {
      try {
        const [activeTravel] = await sql`SELECT 1 FROM dermo_travel_profiles WHERE user_email = ${email} AND is_active = true LIMIT 1`
        if (!activeTravel) {
          const real = await sql`
            SELECT id, skin_type, allergies, goals,
                   am_routine::text, pm_routine::text, explanation, is_completed,
                   name, status, generated_at::text as created_at
            FROM dermo_user_routines
            WHERE user_email = ${email} AND (skin_type IS NULL OR skin_type != 'viaje')
            ORDER BY generated_at DESC
            LIMIT 1
          `
          effectiveRoutine = real.length > 0 ? real : []
        }
      } catch { /* non-critical */ }
    }

    const totalConsultations = consultCountResult[0]?.count ?? 0
    const totalBookings = bookingCountResult[0]?.count ?? 0
    const totalRoutines = routineCountResult[0]?.count ?? 0
    const hasRoutine = effectiveRoutine.length > 0

    const { score: skinScore, breakdown: skinScoreBreakdown } = calcSkinScore(totalConsultations, totalBookings, totalRoutines, hasRoutine)
    const consistency = calcConsistency(totalConsultations, totalBookings, totalRoutines)
    const streak = calcStreak(recentConsultations as { created_at: string }[])

    // Parse KPI event_data safely
    const parsedKpiEvents = (kpiEvents as any[]).map(e => ({
      event_name: e.event_name,
      created_at: e.created_at,
      event_data: typeof e.event_data === 'string' && e.event_data ? (() => { try { return JSON.parse(e.event_data) } catch { return null } })() : e.event_data,
    }));

    const milestones = buildMilestones({
      routineGenerations: routineGenerations as { generated_at: string }[],
      consultations: recentConsultations as { query: string; created_at: string }[],
      kpiEvents: parsedKpiEvents,
      skinScoreHistory: skinScoreRows as { score: number; recorded_at: string }[],
      routineLogs: routineLogs as { log_date: string; is_completed: boolean }[],
      bookings: (recentBookings as any[]).map(b => ({ created_at: b.created_at, pharmacy_name: b.pharmacy_name, product_name: b.product_name })),
      goals: goals as { goal_type: string; created_at: string }[],
      userCreatedAt,
      hasRoutine,
    })

    // Log skin score snapshot (async, non-blocking)
    sql`
      INSERT INTO dermo_skin_score_history (user_email, score, breakdown)
      VALUES (${email}, ${skinScore}, ${JSON.stringify(skinScoreBreakdown)})
    `.catch(() => {});

    // Get real historical skin scores (last 30 days, one per day)
    let skinScoreHistory: { label: string; value: number }[] = [];
    try {
      const historyRows = await sql`
        SELECT DISTINCT ON (DATE(recorded_at)) score, recorded_at::text
        FROM dermo_skin_score_history
        WHERE user_email = ${email}
        ORDER BY DATE(recorded_at) DESC, recorded_at DESC
        LIMIT 12
      `;
      skinScoreHistory = (historyRows as any[]).reverse().map((row: any) => ({
        label: new Date(row.recorded_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        value: row.score,
      }));
    } catch { /* non-critical */ }

    const data = {
      user: {
        name: user.name,
        email: user.email,
        is_premium: user.is_premium,
        consultas_consumidas: user.consultas_consumidas,
      },
      stats: {
        total_consultations: totalConsultations,
        total_bookings: totalBookings,
        total_routines: totalRoutines,
      },
      latest_routine: effectiveRoutine.length > 0 ? {
        ...effectiveRoutine[0],
        am_routine: typeof effectiveRoutine[0].am_routine === 'string' ? JSON.parse(effectiveRoutine[0].am_routine) : effectiveRoutine[0].am_routine,
        pm_routine: typeof effectiveRoutine[0].pm_routine === 'string' ? JSON.parse(effectiveRoutine[0].pm_routine) : effectiveRoutine[0].pm_routine,
      } : null,
      skin_score: skinScore,
      skin_score_breakdown: skinScoreBreakdown,
      consistency,
      streak,
      goal_label: 'Mejorar hidratación',
      goal_progress: Math.min(totalConsultations * 20, 100),
      milestones,
      skin_score_history: skinScoreHistory.length >= 2 ? skinScoreHistory : [],
      recent_consultations: (recentConsultations as any[]).map(c => ({
        id: c.id,
        query: c.query,
        created_at: c.created_at,
      })),
      recent_bookings: (recentBookings as any[]).map(b => ({
        id: b.id,
        product_name: b.product_name,
        pharmacy_name: b.pharmacy_name,
        status: b.status,
        created_at: b.created_at,
      })),
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('dashboard error:', err)
    return NextResponse.json({ error: 'Error al cargar dashboard' }, { status: 500 })
  }
}
