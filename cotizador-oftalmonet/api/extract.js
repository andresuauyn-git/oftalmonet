// /api/extract.js
// Endpoint serverless de Vercel que recibe un archivo (PDF o imagen)
// y lo procesa con Claude para extraer items de cotización.
//
// La API key vive como variable de entorno en Vercel (ANTHROPIC_API_KEY),
// nunca se expone al navegador.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '32mb',
    },
  },
};

const SYSTEM_PROMPT = `Eres un asistente que extrae items/productos de cotizaciones, facturas, listas de precios y documentos comerciales.

Tu única tarea es identificar TODOS los productos/items listados en el documento y devolverlos en formato JSON estricto, sin texto adicional, sin markdown, sin explicaciones.

Estructura exacta:
{
  "provider": "Nombre del proveedor o emisor (si aparece, sino null)",
  "documentNumber": "Número del documento (si aparece, sino null)",
  "currency": "Código de moneda detectado (USD, CLP, EUR, COP, etc.) o null",
  "items": [
    {
      "code": "Código de producto/SKU del proveedor o cadena vacía si no hay",
      "description": "Descripción completa del producto",
      "qty": número (cantidad, default 1 si no se indica),
      "price": número (precio unitario; si solo aparece el total y la cantidad, divide; usa punto decimal)
    }
  ]
}

Reglas críticas:
- Extrae TODOS los items, incluso si son muchos. No resumas.
- "price" es SIEMPRE el precio unitario, no el total.
- Si un item aparece con cantidad 2 y total $200, el price es 100.
- Limpia formato de números: "USD 1.914,99" → 1914.99; "$1,234.50" → 1234.50.
- No incluyas líneas de subtotal, IVA, descuento, total general — solo productos.
- Si no estás seguro de un campo, usa cadena vacía o número 0, pero NUNCA omitas el item.
- Responde ÚNICAMENTE el JSON, nada antes ni después.`;

export default async function handler(req, res) {
  // CORS — permitir que el HTML llame al endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel',
    });
  }

  try {
    const { base64Data, mediaType, isPDF } = req.body || {};

    if (!base64Data || !mediaType) {
      return res.status(400).json({ error: 'Faltan datos del archivo' });
    }

    const userContent = [
      {
        type: isPDF ? 'document' : 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: 'Extrae todos los items/productos de este documento siguiendo el formato JSON especificado.',
      },
    ];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errBody);
      return res.status(anthropicRes.status).json({
        error: `Error de Anthropic API (${anthropicRes.status})`,
        detail: errBody.slice(0, 500),
      });
    }

    const data = await anthropicRes.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      return res.status(500).json({ error: 'Respuesta vacía del modelo' });
    }

    // Limpiar markdown si vino envuelto
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          return res.status(500).json({
            error: 'No se pudo interpretar la respuesta del modelo',
            raw: text.slice(0, 500),
          });
        }
      } else {
        return res.status(500).json({
          error: 'Respuesta no contiene JSON válido',
          raw: text.slice(0, 500),
        });
      }
    }

    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return res.status(422).json({
        error: 'No se encontraron items/productos en el documento',
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({
      error: 'Error interno del servidor',
      detail: err.message,
    });
  }
}
