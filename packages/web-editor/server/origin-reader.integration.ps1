param([Parameter(Mandatory = $true)][string]$OriginDirectory, [Parameter(Mandatory = $true)][string]$WorkDirectory)
$ErrorActionPreference = 'Stop'
$reader = Join-Path $PSScriptRoot 'origin-reader.ps1'
$fixtureSource = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../tests/fixtures/origin-native/script-fixture.c'))
New-Item -ItemType Directory -Force -Path $WorkDirectory | Out-Null
$beforeIds = @(Get-Process -Name Origin64, Origin -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$app = $null
$owned = $null
$ownerFile = Join-Path $WorkDirectory 'maker-owner.json'
function Set-FixtureString([string]$Name, [string]$Value) { [void]$app.GetType().InvokeMember('LTStr', [Reflection.BindingFlags]::SetProperty, $null, $app, @($Name, $Value)) }
function Get-FixtureNumber([string]$Name) { return $app.GetType().InvokeMember('LTVar', [Reflection.BindingFlags]::GetProperty, $null, $app, @($Name)) }
try {
    $app = New-Object -ComObject Origin.Application
    $candidates = @(Get-Process -Name Origin64, Origin -ErrorAction SilentlyContinue | Where-Object { $beforeIds -notcontains $_.Id })
    if ($candidates.Count -ne 1) { throw 'Cannot identify fixture Origin instance.' }
    $owned = $candidates[0]
    @{pid=$owned.Id;startTime=$owned.StartTime.ToUniversalTime().ToString('o');executablePath=$owned.Path} | ConvertTo-Json -Compress | Set-Content -LiteralPath $ownerFile -Encoding UTF8
    $app.Visible = 0
    $deadline = [DateTime]::UtcNow.AddSeconds(25)
    while ((Get-FixtureNumber '@OCE') -ne 1 -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250 }
    if ((Get-FixtureNumber '@OCE') -ne 1) { throw 'Origin C readiness timeout.' }
    Set-FixtureString 'plotFigFixtureCode$' $fixtureSource
    Set-FixtureString 'plotFigFixtureSource$' (Join-Path $OriginDirectory 'LINE.otpu')
    Set-FixtureString 'plotFigFixtureDirectory$' ($WorkDirectory.TrimEnd('\') + '\')
    [void]$app.Execute('plotFigFixtureCompile=run.LoadOC(plotFigFixtureCode$,0);')
    if ((Get-FixtureNumber 'plotFigFixtureCompile') -ne 0) { throw 'Fixture compiler failed.' }
    [void]$app.Execute('plotFigFixtureResult=plot_fig_make_script_fixtures();')
    if ((Get-FixtureNumber 'plotFigFixtureResult') -ne 0) { throw ('Fixture generation failed: ' + (Get-FixtureNumber 'plotFigFixtureResult')) }
} finally {
    if ($owned) { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $reader -CleanupOwnerPath $ownerFile }
    if ($app) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) }
}
foreach ($event in @('create', 'close')) {
    $directory = Join-Path $WorkDirectory $event
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    Copy-Item -LiteralPath (Join-Path $WorkDirectory ($event + '.otpu')) -Destination (Join-Path $directory 'input.otpu')
    $ErrorActionPreference = 'Continue'
    $diagnostic = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $reader -InputPath (Join-Path $directory 'input.otpu') -OutputPath (Join-Path $directory 'snapshot.json') -OwnerPath (Join-Path $directory 'owner.json') 2>&1
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0 -or ($diagnostic -join '') -notmatch 'UNSAFE_TEMPLATE') { throw ('Expected script rejection for ' + $event + ': ' + $diagnostic) }
    if (Test-Path -LiteralPath (Join-Path $WorkDirectory 'marker.txt')) { throw ('Script marker appeared for ' + $event) }
    Write-Output ($event + ': rejected; marker absent')
}
$directory = Join-Path $WorkDirectory 'multiple'
New-Item -ItemType Directory -Force -Path $directory | Out-Null
Copy-Item -LiteralPath (Join-Path $WorkDirectory 'multiple.otpu') -Destination (Join-Path $directory 'input.otpu')
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $reader -InputPath (Join-Path $directory 'input.otpu') -OutputPath (Join-Path $directory 'snapshot.json') -OwnerPath (Join-Path $directory 'owner.json')
if ($LASTEXITCODE -ne 0) { throw 'Multiple plot import failed.' }
$snapshot = [IO.File]::ReadAllText((Join-Path $directory 'snapshot.json')) | ConvertFrom-Json
$plots = @($snapshot.layers[0].plots)
if ($plots.Count -ne 2 -or $snapshot.colors.($plots[0].format.Line.Color) -ne '#ff0000' -or $snapshot.colors.($plots[1].format.Line.Color) -ne '#0000ff' -or $plots[1].format.Line.Style -ne '1') { throw 'Multiple plot styles were not preserved.' }
Write-Output 'multiple: two plots; red solid and blue dashed preserved'
$remaining = @(Get-Process -Name Origin64, Origin -ErrorAction SilentlyContinue | Where-Object { $beforeIds -notcontains $_.Id })
if ($remaining.Count) { throw 'Fixture/import left an Origin process running.' }
Write-Output 'Script import regression passed; prior Origin sessions preserved.'
