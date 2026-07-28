# Requires: gh CLI authenticated to ChrisDc777
# Usage: pwsh scripts/publish-github-backlog.ps1

$ErrorActionPreference = "Stop"
$repo = "ChrisDc777/VimTex"

# Ensure issues enabled
gh api "repos/$repo" -X PATCH -f has_issues=true | Out-Null

# Fix/create milestones
$milestoneDefs = @(
  @{ title = "M0 - Foundation and UI convergence"; desc = "Governance, room semantics, shared workspace, Classic default, CI/E2E."; due = "2026-09-15" },
  @{ title = "M1 - Core editing and activation"; desc = "Format, non-Vim mode, onboarding, templates, palette."; due = "2026-10-31" },
  @{ title = "M2 - Collaboration and persistence"; desc = "Permissions, reconnect, snapshots, history."; due = "2026-12-15" },
  @{ title = "M3 - AI mathematical workflows"; desc = "Diff accept/reject, scoped AI, streaming."; due = "2027-02-01" },
  @{ title = "M4 - Import, export, and polish"; desc = "PDF, import, delight UX."; due = "2027-03-15" },
  @{ title = "M5 - Production and SaaS readiness"; desc = "Auth, observability, billing - gated."; due = "2027-06-01" }
)

$milestoneMap = @{}
$existing = gh api "repos/$repo/milestones?state=all" | ConvertFrom-Json
foreach ($m in $existing) {
  if ($m.title -match "^M\d") { $milestoneMap[$m.title] = $m.number }
}
# Fix broken milestone #1 if needed
if ($existing.Count -eq 1 -and $existing[0].title -notmatch "^M0") {
  gh api "repos/$repo/milestones/1" -X PATCH `
    -f title="M0 - Foundation and UI convergence" `
    -f description="Governance, room semantics, shared workspace, Classic default, CI/E2E." `
    -f due_on="2026-09-15T23:59:59Z" | Out-Null
  $milestoneMap["M0 - Foundation and UI convergence"] = 1
}
foreach ($def in $milestoneDefs) {
  if (-not $milestoneMap.ContainsKey($def.title)) {
    $num = gh api "repos/$repo/milestones" `
      -f title=$def.title -f description=$def.desc `
      -f due_on="$($def.due)T23:59:59Z" -f state=open --jq .number
    $milestoneMap[$def.title] = [int]$num
    Write-Host "Created milestone: $($def.title) (#$num)"
  } else {
    Write-Host "Milestone exists: $($def.title) (#$($milestoneMap[$def.title]))"
  }
}

$backlog = Get-Content "$PSScriptRoot/issue-backlog.json" -Raw | ConvertFrom-Json
$created = @()

foreach ($item in $backlog) {
  $existingIssues = gh issue list -R $repo --search $item.title --json title --jq ".[].title" 2>$null
  if ($existingIssues -contains $item.title) {
    Write-Host "Skip existing: $($item.title)"
    continue
  }
  $bodyFile = New-TemporaryFile
  Set-Content -Path $bodyFile -Value $item.body -Encoding utf8
  $labelArg = ($item.labels -join ",")
  $milestoneNum = $milestoneMap[$item.milestone]
  $url = gh issue create -R $repo `
    --title $item.title `
    --body-file $bodyFile `
    --label $labelArg `
    --milestone $milestoneNum
  Remove-Item $bodyFile -Force
  $num = ($url -split '/')[-1]
  $created += [pscustomobject]@{ number = [int]$num; title = $item.title; url = $url; milestone = $item.milestone }
  Write-Host "Created #$num : $($item.title)"
  Start-Sleep -Milliseconds 300
}

$created | ConvertTo-Json -Depth 3 | Set-Content "$PSScriptRoot/created-issues.json" -Encoding utf8
Write-Host "`nCreated $($created.Count) issues. Index written to scripts/created-issues.json"
