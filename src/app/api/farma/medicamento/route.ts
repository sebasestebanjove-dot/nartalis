import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const nregistro = request.nextUrl.searchParams.get('nregistro')?.trim();
  if (!nregistro) {
    return NextResponse.json({ error: 'Falta nregistro' }, { status: 400 });
  }

  const cimaUrl = `https://cima.aemps.es/cima/rest/medicamento?nregistro=${encodeURIComponent(nregistro)}`;

  try {
    const res = await fetch(cimaUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al consultar CIMA' }, { status: 502 });
    }
    const r = await res.json();

    const resultado = {
      nombre: r.nombre || '',
      registro: r.nregistro || '',
      laboratorio: r.labtitular || '',
      laboratorioComercializador: r.labcomercializador || '',
      receta: r.receta || false,
      conduc: r.conduc || false,
      cpresc: r.cpresc || '',
      vias: (r.viasAdministracion || []).map((v: any) => v.nombre),
      imagenUrl: r.fotos?.[0]?.url || null,
      prospectoUrl: (r.docs || []).find((d: any) => d.tipo === 2)?.url || null,
      fichaTecnicaUrl: (r.docs || []).find((d: any) => d.tipo === 1)?.url || null,
      generico: r.generico || false,
      triangulo: r.triangulo || false,
      psum: r.psum || false,
      notas: r.notas || false,
      biosimilar: r.biosimilar || false,
      huerfano: r.huerfano || false,
      ema: r.ema || false,
      materialesInf: r.materialesInf || false,
      comerc: r.comerc ?? true,
      dosis: r.dosis || null,
      formaFarmaceutica: r.formaFarmaceuticaSimplificada?.nombre || null,
      pactivos: r.pactivos || null,
      principiosActivos: (r.principiosActivos || []).map((pa: any) => ({
        id: pa.id,
        codigo: pa.codigo,
        nombre: pa.nombre,
        cantidad: pa.cantidad,
        unidad: pa.unidad,
        orden: pa.orden,
      })),
      excipientes: (r.excipientes || []).map((ex: any) => ({
        id: ex.id,
        nombre: ex.nombre,
        cantidad: ex.cantidad,
        unidad: ex.unidad,
        orden: ex.orden,
      })),
      atcs: (r.atcs || []).map((a: any) => ({
        codigo: a.codigo,
        nombre: a.nombre,
        nivel: a.nivel,
      })),
      presentaciones: (r.presentaciones || []).map((p: any) => ({
        cn: p.cn,
        nombre: p.nombre,
        estado: p.estado || null,
        comerc: p.comerc ?? true,
        psum: p.psum || false,
      })),
      estado: r.estado || null,
    };

    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: 'Error de conexión con CIMA' }, { status: 502 });
  }
}
