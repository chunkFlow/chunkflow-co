<#
PowerShell helper to create a Sentry project and print the public DSN.

USAGE (PowerShell):
  $env:SENTRY_AUTH_TOKEN = Read-Host -AsSecureString -Prompt "Enter Sentry Auth Token" | ConvertFrom-SecureString
  # or set in environment using: $env:SENTRY_AUTH_TOKEN = 'sntrys_xxx'
  .\scripts\create_sentry_project.ps1 -Org "your-org-slug" -Team "your-team-slug" -ProjectName "chunk-flow-frontend"

This script will:
- Create a project under the given org/team using the Sentry API
- Fetch the project's public DSN and print a command you can paste into `.env.local`

IMPORTANT: Do NOT commit your auth token or any secrets. Keep the token in your environment or a secure secrets manager.
#>

param(
    [Parameter(Mandatory = $true)][string]$Org,
    [Parameter(Mandatory = $true)][string]$Team,
    [Parameter(Mandatory = $true)][string]$ProjectName,
    [string]$Platform = 'javascript'
)

function Get-Token {
    if ($env:SENTRY_AUTH_TOKEN -and $env:SENTRY_AUTH_TOKEN.Trim() -ne '') {
        return $env:SENTRY_AUTH_TOKEN
    }
    Write-Host "SENTRY_AUTH_TOKEN not found in environment. Please paste an auth token with project:create permissions (will not be stored):"
    $token = Read-Host -AsSecureString | ConvertFrom-SecureString
    return $token
}

$token = Get-Token

if (-not $token) {
    Write-Error "No Sentry auth token available. Set SENTRY_AUTH_TOKEN environment variable and retry."
    exit 1
}

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$createUrl = "https://sentry.io/api/0/teams/$Org/$Team/projects/"

try {
    $body = @{ name = $ProjectName; platform = $Platform } | ConvertTo-Json
    Write-Host "Creating project '$ProjectName' in org '$Org', team '$Team'..."
    $resp = Invoke-RestMethod -Method Post -Uri $createUrl -Headers $headers -Body $body -ContentType 'application/json'
    $projectSlug = $resp.slug
    if (-not $projectSlug) { $projectSlug = $resp.id }
    Write-Host "Project created. Slug: $projectSlug"
}
catch {
    Write-Warning "Project creation request failed: $($_.Exception.Message)"
    # Try to continue if project exists: attempt to find project slug by name
    try {
        $listUrl = "https://sentry.io/api/0/organizations/$Org/projects/"
        $projects = Invoke-RestMethod -Method Get -Uri $listUrl -Headers $headers
        $found = $projects | Where-Object { $_.name -eq $ProjectName }
        if ($found) {
            $projectSlug = $found.slug
            Write-Host "Found existing project. Slug: $projectSlug"
        }
        else {
            Write-Error "Could not create project and no existing project matched the name. Aborting."
            exit 1
        }
    }
    catch {
        Write-Error "Failed to list projects: $($_.Exception.Message)"
        exit 1
    }
}

# Fetch DSN (keys)
$keysUrl = "https://sentry.io/api/0/projects/$Org/$projectSlug/keys/"
try {
    $keys = Invoke-RestMethod -Method Get -Uri $keysUrl -Headers $headers
    if ($keys -and $keys.Count -gt 0) {
        $publicDsn = $keys[0].dsn.public
        Write-Host "Public DSN: $publicDsn"
        Write-Host "Add this to your .env.local as:"
        Write-Host "VITE_SENTRY_DSN=$publicDsn"
    }
    else {
        Write-Warning "No keys returned for project. You may need to create a key in the Sentry UI."
    }
}
catch {
    Write-Warning "Failed to fetch project keys: $($_.Exception.Message)"
}

Write-Host "Done. Remember to set SENTRY_AUTH_TOKEN in CI as a secret for source-map uploads (do not commit tokens)."
