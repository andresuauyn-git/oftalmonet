# Cotizador Oftalmonet

Sistema de cotizaciones con importación inteligente desde PDFs e imágenes.

## Estructura

```
.
├── index.html         ← La app (frontend completo)
├── api/
│   └── extract.js     ← Backend: proxy seguro a la API de Anthropic
├── package.json
├── vercel.json
└── README.md
```

## Despliegue en Vercel (10 minutos)

### 1. Obtén tu API key de Anthropic

1. Entra a https://console.anthropic.com
2. Settings → API Keys → Create Key
3. Cópiala (empieza con `sk-ant-...`). **Guárdala bien, no se vuelve a mostrar.**
4. Agrega crédito a tu cuenta. Cada extracción cuesta entre $0.01 y $0.05 USD según el tamaño del documento.

### 2. Sube el proyecto a GitHub

```bash
cd cotizador-oftalmonet
git init
git add .
git commit -m "Cotizador inicial"
```

Crea un repo nuevo en github.com (puede ser privado), luego:

```bash
git remote add origin https://github.com/TU_USUARIO/cotizador-oftalmonet.git
git push -u origin main
```

### 3. Despliega en Vercel

1. Entra a https://vercel.com con tu cuenta de GitHub
2. "Add New" → "Project" → elige tu repo `cotizador-oftalmonet`
3. **NO toques nada en la configuración**, solo agrega esta variable de entorno:
   - Name: `ANTHROPIC_API_KEY`
   - Value: tu API key (`sk-ant-...`)
4. Click en "Deploy"

En ~30 segundos tienes la app online en una URL tipo `https://cotizador-oftalmonet.vercel.app`.

### 4. (Opcional) Dominio propio

Si tienes un dominio (ej. `oftalmonet.cl`):
- En Vercel → tu proyecto → Settings → Domains → Add
- Agrega `cotizador.oftalmonet.cl` y sigue las instrucciones DNS

## Costos

- **Vercel**: gratis (plan Hobby cubre uso personal/pequeña empresa)
- **Anthropic**: ~$0.01-0.05 USD por documento importado
- **Dominio (opcional)**: ~$10 USD/año

## Seguridad

- Tu API key vive solo en las variables de entorno de Vercel
- Nunca se envía al navegador del usuario
- Solo tú (o quien tenga acceso a tu cuenta de Vercel) puede verla
- Si quieres restringir quién usa la app, considera agregar autenticación básica con Vercel Edge Middleware

## Datos del usuario

Los datos de las cotizaciones (productos, configuración, logo) siguen guardándose en el `localStorage` del navegador. El backend solo se usa para procesar PDFs/imágenes en el momento — no guarda nada.

Para sincronización entre dispositivos:
- Usa el botón "Respaldar" para descargar el JSON
- Súbelo a Google Drive / Dropbox / etc.
- En el otro dispositivo, usa "Cargar" para restaurar

## Actualizar la app

Cada vez que cambies algo en el código:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Vercel redespliega automáticamente.

## Troubleshooting

**"Failed to fetch" al importar**: la app está usando localhost o un origen sin backend. Verifica que estés en la URL de Vercel.

**"Falta ANTHROPIC_API_KEY"**: olvidaste agregar la variable de entorno en Vercel. Ve a Settings → Environment Variables.

**"Error de Anthropic API (401)"**: tu API key es inválida o expiró. Regenera una en console.anthropic.com.

**"Error de Anthropic API (429)"**: alcanzaste tu límite de rate. Espera unos minutos o sube tu límite en la consola de Anthropic.
