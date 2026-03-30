# Deploy Bootstrap

Script interactivo para despliegue y sincronizacion de base:

- Instala dependencias.
- Ejecuta validaciones (`tsc`, `lint`).
- Hace `supabase link` + `supabase db push` (si hay token).
- Crea/inspecciona proyecto en Vercel.
- Configura env vars publicas en Vercel.
- Ejecuta deploy a produccion.

## Ejecutar

```powershell
npm run bootstrap:deploy
```

El script pregunta antes de cada bloque (`Deseas ejecutar ... [s/N]`).

## Parametros opcionales

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-deploy.ps1 `
  -VercelScope "carloscesarcarabajal-2880s-projects" `
  -VercelOrgId "team_i42rN3KV1SquH6DFcBBddHSY" `
  -VercelProjectName "gastropos" `
  -SupabaseProjectRef "rfcyezizdcetobqnonhg"
```
