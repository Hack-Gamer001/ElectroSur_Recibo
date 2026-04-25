export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    if (action === 'sesion') {
      const { recaptchaToken, suministro } = req.body;
      const resp = await fetch('https://appsrv.else.com.pe/wApiPagoVisa/SesionELSE/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://app.else.com.pe',
          'Referer': 'https://app.else.com.pe/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ buscarPor: 'sum', nroDocumento: suministro || '0010512230', recaptchaToken })
      });
      return res.status(200).json(await resp.json());
    }

    if (action === 'pdf') {
      const { token } = req.body;
      const resp = await fetch('https://appsrv.else.com.pe/pdf', {
        headers: {
          'Authorization': 'ElsePagoVisa ' + token,
          'Origin': 'https://app.else.com.pe',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const buffer = await resp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return res.status(200).json({ pdf: base64, size: buffer.byteLength });
    }

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
                { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
                { text: `Del recibo de luz de Electro Sur Este extrae EXACTAMENTE estos 6 valores numericos. Responde SOLO con JSON puro sin markdown:\n{"alumbrado_publico": numero, "cargo_fijo_ajustado": numero, "electrificacion_rural": numero, "precio_unitario": numero, "afecto_recargo_fose": numero, "total_a_pagar": numero}` }
              ]
            }],
            generationConfig: { temperature: 0 }
          })
        }
      );

      const geminiData = await geminiResp.json();
      const texto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      try {
        const valores = JSON.parse(texto.replace(/```json|```/g, '').trim());
        return res.status(200).json({ ok: true, valores });
      } catch(e) {
        return res.status(200).json({ ok: false, raw: texto });
      }
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}