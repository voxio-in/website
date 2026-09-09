<#
.SYNOPSIS
    Start voxio-web — the site and its server are one process, so this is the
    only thing to run.

.DESCRIPTION
    Dev is the default. -Prod builds first and then serves the build; nothing
    else changes between them, because TanStack Start is the backend either
    way.

    The database is reported, never required: with no DATABASE_URL every page
    still renders. That is why a missing .env is a warning here and not a stop.

.EXAMPLE
    .\start.ps1
    Dev server on :3000.

.EXAMPLE
    .\start.ps1 -Prod -Port 8080
    Build, then serve the build on :8080.

.EXAMPLE
    .\start.ps1 -Install -Migrate
    Install dependencies, generate the Prisma client, apply migrations, then run dev.
#>

[CmdletBinding()]
param(
    # Build, then serve the build. Without it, the dev server runs.
    [switch] $Prod,

    # Build and exit. Implies the production build; does not serve it.
    [switch] $Build,

    # Port to listen on.
    [int] $Port = 3000,

    # npm install before anything else.
    [switch] $Install,

    # Generate the Prisma client and apply migrations.
    # Dev uses `migrate dev` (creates migrations); -Prod uses `migrate deploy`.
    [switch] $Migrate,

    # Run tsc --noEmit and stop if it fails.
    [switch] $Typecheck,

    # Delete dist/ and the route tree before building.
    [switch] $Clean,

    # Regenerate src/routeTree.gen.ts from src/routes/.
    [switch] $Routes,

    # Print what would run, and run nothing.
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Every path here is relative to the project, not to wherever this was invoked.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root

function Write-Step  ([string] $Text) { Write-Host "→ $Text" -ForegroundColor Cyan }
function Write-Warn  ([string] $Text) { Write-Host "! $Text" -ForegroundColor Yellow }

function Invoke-Step {
    param([string] $Label , [string] $Command)

    Write-Step $Label

    if ($DryRun) {
        Write-Host "  $Command" -ForegroundColor DarkGray
        return
    }

    # npm and npx are shims on Windows; & runs them without a shell in between.
    Invoke-Expression $Command

    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "$Label failed (exit $LASTEXITCODE)"
    }
}

try {
    if (-not (Test-Path 'package.json')) {
        throw "No package.json here — run this from the web/ directory."
    }

    if (-not (Test-Path '.env')) {
        Write-Warn "No .env — the database will report 'unconfigured' and the"
        Write-Warn "  calling and room demos will decline rather than fail."
        Write-Warn "  Copy .env.example to .env to wire them up."
    }

    if ($Install) {
        Invoke-Step 'Installing dependencies' 'npm install'
    }
    elseif (-not (Test-Path 'node_modules')) {
        Write-Warn "node_modules is missing — installing."
        Invoke-Step 'Installing dependencies' 'npm install'
    }

    if ($Migrate) {
        Invoke-Step 'Generating the Prisma client' 'npx prisma generate'

        # migrate dev writes new migrations from schema drift and needs a TTY;
        # migrate deploy only applies what is already committed, which is the
        # only safe thing to do against a production database.
        if ($Prod -or $Build) {
            Invoke-Step 'Applying migrations' 'npx prisma migrate deploy'
        } else {
            Invoke-Step 'Applying migrations' 'npx prisma migrate dev'
        }
    }

    if ($Routes) {
        Invoke-Step 'Regenerating the route tree' 'npx tsr generate'
    }

    if ($Typecheck) {
        Invoke-Step 'Typechecking' 'npx tsc --noEmit'
    }

    if ($Clean) {
        Write-Step 'Cleaning dist/'
        if (-not $DryRun -and (Test-Path 'dist')) {
            Remove-Item -Recurse -Force 'dist'
        }
    }

    if ($Build) {
        Invoke-Step 'Building' 'npm run build'
        Write-Host ''
        Write-Host "Built into dist/. Serve it with: .\start.ps1 -Prod -Port $Port" -ForegroundColor Green
        return
    }

    if ($Prod) {
        Invoke-Step 'Building' 'npm run build'
        Write-Host ''
        Write-Host "Serving the build on http://localhost:$Port" -ForegroundColor Green
        Write-Host "Health: http://localhost:$Port/api/health" -ForegroundColor DarkGray
        Write-Host ''
        Invoke-Step 'Starting' "npx vite preview --port $Port"
    }
    else {
        Write-Host ''
        Write-Host "Dev server on http://localhost:$Port" -ForegroundColor Green
        Write-Host "Health: http://localhost:$Port/api/health" -ForegroundColor DarkGray

        # The gateway posts a call's transcript back to PUBLIC_URL. In dev that
        # is a tunnel, and its host has to be in vite.config.ts's allowedHosts
        # or the posts are 403'd before they arrive.
        if (-not $DryRun) {
            $publicUrl = (Select-String -Path '.env' -Pattern '^\s*PUBLIC_URL\s*=' -ErrorAction SilentlyContinue)
            if (-not $publicUrl) {
                Write-Warn "PUBLIC_URL is not set — webhooks have nowhere to post,"
                Write-Warn "  so transcripts and scene beats will not arrive."
            }
        }

        Write-Host ''
        Invoke-Step 'Starting' "npx vite dev --port $Port"
    }
}
finally {
    Pop-Location
}
