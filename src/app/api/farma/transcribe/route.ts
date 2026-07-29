import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY no configurada. Añádela en .env.local para activar la transcripción por voz.' },
      { status: 501 },
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió archivo de audio' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: audioFile.type }), 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('language', 'es');
    form.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Whisper error:', err);
      return NextResponse.json({ error: 'Error al transcribir el audio' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
