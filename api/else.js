export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {

    // ── 1. SESION ──────────────────────────────────────────────
    if (action === 'sesion') {
      const { recaptchaToken, suministro } = req.body;

      // Verificar el token con nuestra secret key
      const verifyResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`
      });
      const verify = await verifyResp.json();
      if (!verify.success) {
        return res.status(400).json({ exito: false, mensaje: 'CAPTCHA inválido' });
      }

      // Llamar a ELSE con un token de reCAPTCHA de ELSE
      // Necesitamos obtener un token válido para ELSE desde el servidor
      // Usamos el token verificado para hacer la petición directa
      const sesResp = await fetch('https://appsrv.else.com.pe/wApiPagoVisa/SesionELSE/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://app.else.com.pe',
          'Referer': 'https://app.else.com.pe/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          buscarPor: 'sum',
          nroDocumento: suministro || '0010512230',
          recaptchaToken: recaptchaToken
        })
      });

      const data = await sesResp.json();
      return res.status(200).json(data);
    }

    // ── 2. PDF ─────────────────────────────────────────────────
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

    // ── 3. EXTRAER — Gemini lee el PDF ─────────────────────────
    if (action === 'extraer') {
      const { pdfBase64 } = req.body;
      const GEMINI_KEY = process.env.GEMINI_API_KEY;

      if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });
      }

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
                  text: `Del recibo de luz de Electro Sur Este extrae EXACTAMENTE estos 6 valores numericos. Responde SOLO con JSON puro sin markdown ni texto adicional:
{"alumbrado_publico": numero, "cargo_fijo_ajustado": numero, "electrificacion_rural": numero, "precio_unitario": numero, "afecto_recargo_fose": numero, "total_a_pagar": numero}`
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
        return res.status(200).json({ ok: false, raw: texto, error: e.message });
      }
    }

    return res.status(400).json({ error: 'Acción no válida: ' + action });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
