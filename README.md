# 5V Data Playground (Vercel, Next.js 14)
Genera **estructurado / semiestructurado / no estructurado** con *prompts*. 100% client-side.

## Despliegue rápido en Vercel
1) Con este repo abierto, ve a vercel.com → **New Project** → importa el repo.
2) Framework: **Next.js**. Build: `next build`. Start: `next start`. Deploy.

## Prompts ejemplo
- ESTRUCTURADO: `Genera un dataset ESTRUCTURADO con 1000 filas; columnas: fecha:date, partner:string, importe:float EUR; Seed=7`
- SEMI: `Genera datos SEMIESTRUCTURADOS (JSON Lines) con 800 eventos de login ...; Seed=11`
- NO ESTRUCTURADO: `Genera texto NO ESTRUCTURADO: 50 registros de 'logs' ...; Seed=99`
