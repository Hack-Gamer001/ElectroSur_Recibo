# Gestor de Luz — Inmueble R-8

## Deploy en Vercel

1. Sube este proyecto a GitHub
2. Importa en vercel.com
3. Agrega variable de entorno:
   - `CLAUDE_API_KEY` = tu API key de Anthropic

## Cómo funciona

1. Entras a la página
2. Haces clic en "Obtener de ELSE"
3. El reCAPTCHA se resuelve automáticamente
4. La función serverless descarga el PDF de ELSE
5. Claude lee el PDF y extrae los 6 valores
6. Los campos se llenan solos
7. La tabla se recalcula automáticamente
8. Vas a Tickets y imprimes

## Estructura

```
/api/else.js     → proxy serverless (evita restricciones CORS)
/index.html      → app completa
/vercel.json     → config
```

## Variables de entorno necesarias

- `CLAUDE_API_KEY` → en Vercel Dashboard > Settings > Environment Variables
