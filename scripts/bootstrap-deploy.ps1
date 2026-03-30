param(
  [string]$VercelScope = "carloscesarcarabajal-2880s-projects",
  [string]$VercelOrgId = "team_i42rN3KV1SquH6DFcBBddHSY",
  [string]$VercelProjectName = "gastropos",
  [string]$SupabaseProjectRef = "",
  [string]$SupabaseAccessToken = "",
  [string]$SupabaseUrl = "",
  [string]$SupabaseAnonKey = "",
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

function Confirm-Step {
  param([string]$Message)
  if ($NonInteractive) { return $true }
  $answer = Read-Host "$Message [s/N]"
  return $answer -match "^(s|si|y|yes)$"
}

function Run-Step {
  param(
    [string]$Title,
    [scriptblock]$Command
  )
  if (-not (Confirm-Step "Deseas ejecutar: $Title ?")) {
    Write-Host "Omitido: $Title" -ForegroundColor Yellow
    return
  }
  Write-Host "Ejecutando: $Title" -ForegroundColor Cyan
  & $Command
  Write-Host "OK: $Title" -ForegroundColor Green
}

function Ensure-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro el comando requerido: $Name"
  }
}

Ensure-Command "vercel.cmd"
Ensure-Command "npm.cmd"
Ensure-Command "npx.cmd"

Run-Step "Instalar dependencias (npm install)" {
  npm.cmd install
}

Run-Step "Validar TypeScript (tsc --noEmit)" {
  node node_modules\typescript\bin\tsc --noEmit
}

Run-Step "Ejecutar lint (npm run lint)" {
  npm.cmd run lint
}

if (-not $SupabaseAccessToken) {
  $SupabaseAccessToken = Read-Host "SUPABASE_ACCESS_TOKEN (opcional, Enter para omitir bloque Supabase)"
}

if ($SupabaseAccessToken) {
  $env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken

  Run-Step "Link de Supabase (si ya existe project-ref)" {
    if (-not $SupabaseProjectRef) {
      $SupabaseProjectRef = Read-Host "Project ref de Supabase (ej: rfcyezizdcetobqnonhg)"
    }
    if (-not $SupabaseProjectRef) { throw "No se ingreso Supabase project ref." }
    npx.cmd supabase link --project-ref $SupabaseProjectRef
  }

  Run-Step "Aplicar migraciones a Supabase (db push)" {
    npx.cmd supabase db push --include-all --yes
  }
}
else {
  Write-Host "Bloque Supabase omitido (sin token)." -ForegroundColor Yellow
}

Run-Step "Crear proyecto en Vercel (si no existe)" {
  try {
    vercel.cmd projects add $VercelProjectName --scope $VercelScope | Out-Host
  }
  catch {
    Write-Host "Aviso: puede que el proyecto ya exista, continuo." -ForegroundColor Yellow
  }
}

Run-Step "Inspeccionar proyecto en Vercel para obtener projectId" {
  if (Test-Path ".vercel\project.json") {
    $existing = Get-Content ".vercel\project.json" -Raw | ConvertFrom-Json
    if ($existing.projectId -and $existing.orgId) {
      Write-Host "Usando .vercel/project.json existente." -ForegroundColor Yellow
      return
    }
  }

  $inspect = vercel.cmd project inspect $VercelProjectName --scope $VercelScope 2>&1
  $inspectText = ($inspect | Out-String)
  $projectIdMatch = [regex]::Match($inspectText, "prj_[A-Za-z0-9]+")
  if (-not $projectIdMatch.Success) { throw "No se pudo detectar projectId desde 'vercel project inspect'." }
  $projectId = $projectIdMatch.Value
  New-Item -ItemType Directory -Force ".vercel" | Out-Null
  $json = "{`"orgId`":`"$VercelOrgId`",`"projectId`":`"$projectId`"}"
  Set-Content ".vercel\project.json" $json
}

if (-not $SupabaseUrl) {
  $SupabaseUrl = Read-Host "NEXT_PUBLIC_SUPABASE_URL (opcional, Enter para no setear en Vercel)"
}
if (-not $SupabaseAnonKey) {
  $SupabaseAnonKey = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY (opcional, Enter para no setear en Vercel)"
}

if ($SupabaseUrl -and $SupabaseAnonKey) {
  Run-Step "Setear env NEXT_PUBLIC_SUPABASE_URL en Vercel (production)" {
    try {
      $SupabaseUrl | vercel.cmd env add NEXT_PUBLIC_SUPABASE_URL production
    }
    catch {
      vercel.cmd env rm NEXT_PUBLIC_SUPABASE_URL production --yes
      $SupabaseUrl | vercel.cmd env add NEXT_PUBLIC_SUPABASE_URL production
    }
  }
  Run-Step "Setear env NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel (production)" {
    try {
      $SupabaseAnonKey | vercel.cmd env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    }
    catch {
      vercel.cmd env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes
      $SupabaseAnonKey | vercel.cmd env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    }
  }

  Run-Step "Guardar .env.local para desarrollo local" {
    Set-Content ".env.local" "NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey"
  }
}
else {
  Write-Host "Bloque de variables Vercel/.env.local omitido (faltan valores)." -ForegroundColor Yellow
}

Run-Step "Deploy a Vercel production" {
  vercel.cmd --prod --yes
}

Write-Host "Bootstrap finalizado." -ForegroundColor Green
