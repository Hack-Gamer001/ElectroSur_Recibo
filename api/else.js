// ── 4. EXTRAER: Gemini lee el PDF y extrae los 6 valores ──
if (action === 'extraer') {
  const { pdfBase64 } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });

  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              text: `Del recibo de luz de Electro Sur Este, extrae EXACTAMENTE estos 6 valores numéricos. Responde SOLO con JSON puro, sin markdown, sin texto adicional:
{"alumbrado_publico": número, "cargo_fijo_ajustado": número, "electrificacion_rural": número, "precio_unitario": número, "afecto_recargo_fose": número, "total_a_pagar": número}`
            }
          ]
        }],
        generationConfig: { temperature: 0 }
      })
    }
  );

  const geminiData = await geminiResp.json();
  const texto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    const limpio = texto.replace(/```json|```/g, '').trim();
    const valores = JSON.parse(limpio);
    return res.status(200).json({ ok: true, valores });
  } catch(e) {
    return res.status(200).json({ ok: false, raw: texto });
  }
}