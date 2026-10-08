[CmdletBinding(DefaultParameterSetName = 'Read')]
param(
    [Parameter(Mandatory = $true, ParameterSetName = 'Read')][string]$InputPath,
    [Parameter(Mandatory = $true, ParameterSetName = 'Read')][string]$OutputPath,
    [Parameter(Mandatory = $true, ParameterSetName = 'Read')][string]$OwnerPath,
    [Parameter(ParameterSetName = 'Read')][string]$CancelPath,
    [Parameter(Mandatory = $true, ParameterSetName = 'Cleanup')][string]$CleanupOwnerPath
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$utf8 = [Text.UTF8Encoding]::new($false)

function Write-OwnerRecord([string]$Path, $Record) {
    $temporary = $Path + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
    [IO.File]::WriteAllText($temporary, ($Record | ConvertTo-Json -Compress -Depth 5), $utf8)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-RegisteredOriginExecutable {
    $paths = @()
    # Some 64-bit Origin releases register their local server in Registry32.
    foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {
        $root = $null; $program = $null; $class = $null; $server = $null
        try {
            $root = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::ClassesRoot, $view)
            $program = $root.OpenSubKey('Origin.Application\CLSID')
            if (!$program) { continue }
            $clsid = [string]$program.GetValue($null)
            if ($clsid -notmatch '^\{[0-9a-fA-F-]{36}\}$') { continue }
            $class = $root.OpenSubKey('CLSID\' + $clsid)
            if (!$class) { continue }
            $server = $class.OpenSubKey('LocalServer32')
            if (!$server) { continue }
            $command = [Environment]::ExpandEnvironmentVariables([string]$server.GetValue($null)).Trim()
            # Do not execute or loosely split registry command text.
            if ($command -match '^"([^"]+\.exe)"(?:\s+-Embedding)?$') { $executable = $Matches[1] }
            elseif ($command -match '^([^"\r\n]+\.exe)(?:\s+-Embedding)?$') { $executable = $Matches[1] }
            else { continue }
            if ([IO.Path]::IsPathRooted($executable) -and [IO.Path]::GetFileName($executable) -in @('Origin64.exe', 'Origin.exe')) { $paths += [IO.Path]::GetFullPath($executable) }
        } finally {
            foreach ($key in @($server, $class, $program, $root)) { if ($null -ne $key) { $key.Dispose() } }
        }
    }
    $paths = @($paths | Sort-Object -Unique)
    if ($paths.Count -ne 1 -or !(Test-Path -LiteralPath $paths[0] -PathType Leaf)) { throw 'ORIGIN_NOT_INSTALLED: 无法唯一确认 Origin 自动化服务路径，请安装并激活本机 Origin。' }
    return $paths[0]
}

function Select-OriginEmbeddingCandidate($Record, [object[]]$Processes) {
    if ($Record.state -ne 'starting' -or $null -eq $Record.beforeIds -or !$Record.startedAt -or !$Record.executablePath) { throw 'OWNER_MISMATCH: 缺少启动基线，不能安全识别本次 Origin 实例。' }
    try {
        $expectedExecutable = [IO.Path]::GetFullPath([string]$Record.executablePath)
        $startedAt = [DateTimeOffset]::Parse($Record.startedAt, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime
        $baseline = @($Record.beforeIds | ForEach-Object { if ([int]$_ -lt 1) { throw 'Invalid PID' }; [int]$_ })
    } catch { throw 'OWNER_MISMATCH: 启动基线格式不正确。' }
    if (![IO.Path]::IsPathRooted($Record.executablePath) -or [IO.Path]::GetFileName($expectedExecutable) -notin @('Origin64.exe', 'Origin.exe')) { throw 'OWNER_MISMATCH: 启动记录不是 Origin 可执行文件。' }
    $candidates = @()
    foreach ($process in $Processes) {
        if (!$process -or $process.Name -notin @('Origin64.exe', 'Origin.exe') -or $baseline -contains [int]$process.ProcessId -or !$process.ExecutablePath -or !$process.CommandLine) { continue }
        try {
            if ([IO.Path]::GetFullPath([string]$process.ExecutablePath) -ne $expectedExecutable) { continue }
            $createdAt = ([DateTimeOffset]$process.CreationDate).UtcDateTime
            if ($createdAt -lt $startedAt) { continue }
        } catch { continue }
        if ($process.CommandLine -notmatch '^\s*(?:"([^"]+)"|([^"\r\n]+?))\s+-Embedding\s*$') { continue }
        $commandExecutable = if ($Matches[1]) { $Matches[1] } else { $Matches[2] }
        try { if ([IO.Path]::GetFullPath($commandExecutable) -ne $expectedExecutable) { continue } } catch { continue }
        $candidates += $process
    }
    if ($candidates.Count -gt 1) { throw 'OWNER_AMBIGUOUS: 检测到多个新 Origin 自动化实例，已拒绝猜测或关闭进程。' }
    return $candidates
}

function Resolve-StartingOrigin($Record) {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name='Origin64.exe' OR Name='Origin.exe'")
    $candidates = @(Select-OriginEmbeddingCandidate $Record $processes)
    if ($candidates.Count -eq 0) { return $null }
    $candidate = $candidates[0]
    $process = Get-Process -Id ([int]$candidate.ProcessId) -ErrorAction SilentlyContinue
    if (!$process) { return $null }
    # WMI creation times have microsecond precision; record the full process time
    # and require agreement before establishing the exact cleanup identity.
    $observedTime = ([DateTimeOffset]$candidate.CreationDate).UtcDateTime
    if ($process.Path -ne $Record.executablePath -or [Math]::Abs(($process.StartTime.ToUniversalTime() - $observedTime).TotalMilliseconds) -gt 1) { throw 'OWNER_MISMATCH: Origin 候选进程身份发生变化。' }
    return $process
}

function Stop-OwnedOrigin([string]$Path, [bool]$WaitForOwner = $false) {
    $deadline = [DateTime]::UtcNow.AddSeconds($(if ($WaitForOwner) { 5 } else { 0 }))
    do {
        $owner = $null
        if (Test-Path -LiteralPath $Path) { $owner = [IO.File]::ReadAllText($Path) | ConvertFrom-Json }
        if ($owner -and $owner.state -eq 'not-started') { return }
        if ($owner -and $owner.pid) { break }
        if ($owner -and $owner.state -eq 'starting') {
            $recovered = Resolve-StartingOrigin $owner
            if ($recovered) {
                $owner = @{ state = 'owned'; stage = 'constructor-recovered'; pid = $recovered.Id; startTime = $recovered.StartTime.ToUniversalTime().ToString('o'); executablePath = $recovered.Path }
                Write-OwnerRecord $Path $owner
                break
            }
        }
        if ([DateTime]::UtcNow -ge $deadline) { throw 'OWNER_UNAVAILABLE: Origin 启动尚未完成，未找到可确认归属的自动化实例。' }
        Start-Sleep -Milliseconds 100
    } while ($true)
    if (!$owner.pid -or !$owner.startTime -or !$owner.executablePath) { throw 'OWNER_MISMATCH: Invalid ownership record.' }
    $owned = Get-Process -Id ([int]$owner.pid) -ErrorAction SilentlyContinue
    if ($null -eq $owned) { return }
    $expectedStart = [DateTime]::Parse($owner.startTime, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
    if ($owned.ProcessName -notin @('Origin64', 'Origin') -or $owned.Path -ne $owner.executablePath -or $owned.StartTime.ToUniversalTime().Ticks -ne $expectedStart.Ticks) {
        throw 'OWNER_MISMATCH: Process identity does not match the owned Origin instance.'
    }
    Stop-Process -Id $owned.Id -ErrorAction Stop
    if (!$owned.WaitForExit(3000)) { throw 'CLEANUP_FAILED: Owned Origin did not exit.' }
}

if ($PSCmdlet.ParameterSetName -eq 'Cleanup') {
    try { Stop-OwnedOrigin $CleanupOwnerPath $true; exit 0 }
    catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
}

$application = $null
$ownedProcess = $null
$failure = $null
$starting = $false
$beforeIds = @()
$startupRecord = $null
$readerStage = 'validating'
$warnings = [Collections.Generic.List[object]]::new()
$xmlDocuments = [Collections.Generic.List[object]]::new()
function Assert-NotCancelled {
    if ($CancelPath -and (Test-Path -LiteralPath $CancelPath)) { throw 'CANCELLED: Native import was cancelled.' }
}
function Write-Owner($Record) {
    Write-OwnerRecord $OwnerPath $Record
}
function Register-OwnedOrigin($Process) {
    Write-Owner @{ state = 'owned'; stage = $readerStage; pid = $Process.Id; startTime = $Process.StartTime.ToUniversalTime().ToString('o'); executablePath = $Process.Path }
}
function Set-ReaderStage([string]$Stage) {
    $script:readerStage = $Stage
    if ($ownedProcess) { Register-OwnedOrigin $ownedProcess }
}
function Get-LTNumber([string]$Name) {
    return $application.GetType().InvokeMember('LTVar', [Reflection.BindingFlags]::GetProperty, $null, $application, @($Name))
}
function Set-LTString([string]$Name, [string]$Value) {
    [void]$application.GetType().InvokeMember('LTStr', [Reflection.BindingFlags]::SetProperty, $null, $application, @($Name, $Value))
}
function Get-LTString([string]$Name) {
    return $application.GetType().InvokeMember('LTStr', [Reflection.BindingFlags]::GetProperty, $null, $application, @($Name))
}
function Read-NativeXml([string]$Name) {
    $path = Join-Path $outputDirectory $Name
    if (!(Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).Length -gt 16777216) { throw 'INVALID_NATIVE_OUTPUT: Missing or oversized XML.' }
    $settings = [Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $settings.MaxCharactersInDocument = 16777216
    $reader = [Xml.XmlReader]::Create($path, $settings)
    try {
        $document = [Xml.XmlDocument]::new()
        $document.XmlResolver = $null
        $document.Load($reader)
        if ($document.DocumentElement.Name -ne 'OriginStorage') { throw 'INVALID_NATIVE_OUTPUT: Missing Origin XML root.' }
        $xmlDocuments.Add($document)
        return ,$document
    } finally { $reader.Dispose() }
}
function Convert-FormatTree($Node, [string]$Path, [int]$Depth = 0) {
    if ($Depth -gt 48) { throw 'INVALID_NATIVE_OUTPUT: XML nesting exceeds the supported limit.' }
    $result = [ordered]@{}
    foreach ($child in $Node.ChildNodes) {
        if ($child.NodeType -ne [Xml.XmlNodeType]::Element) { continue }
        $childPath = $Path + '/' + $child.Name
        # Scripts and external resource references are inert and never exported.
        if ($child.Name -match '(?i)script|function|expression|formula|filename|filepath|external') {
            if ($child.InnerText.Trim()) { $warnings.Add(@{ path = $childPath; message = '已略过 Origin 脚本、公式或外部资源，未对其求值。' }) }
            continue
        }
        $elements = @($child.ChildNodes | Where-Object NodeType -eq ([Xml.XmlNodeType]::Element))
        if ($elements.Count) { $value = Convert-FormatTree $child $childPath ($Depth + 1) }
        else { $value = [string]$child.InnerText }
        if ($result.Contains($child.Name)) { $result[$child.Name] = @($result[$child.Name]) + @($value) }
        else { $result[$child.Name] = $value }
    }
    return $result
}

try {
    if (![IO.Path]::IsPathRooted($InputPath) -or ![IO.Path]::IsPathRooted($OutputPath) -or ![IO.Path]::IsPathRooted($OwnerPath)) { throw 'INVALID_INPUT: Absolute temporary paths are required.' }
    $inputFile = Get-Item -LiteralPath $InputPath -ErrorAction SilentlyContinue
    if (!$inputFile -or $inputFile.PSIsContainer -or $inputFile.Name -notin @('input.otp', 'input.otpu') -or $inputFile.Length -lt 5 -or $inputFile.Length -gt 16777216) { throw 'INVALID_INPUT: Expected an OTP or OTPU template of at most 16 MB.' }
    $outputDirectory = [IO.Path]::GetFullPath((Split-Path -Parent $OutputPath))
    if ($outputDirectory -ne $inputFile.Directory.FullName -or $outputDirectory -ne [IO.Path]::GetFullPath((Split-Path -Parent $OwnerPath))) { throw 'INVALID_INPUT: Input, output and owner must share a temporary directory.' }
    if ($InputPath -eq $OutputPath -or $OwnerPath -eq $InputPath -or $OwnerPath -eq $OutputPath) { throw 'INVALID_INPUT: Paths must be distinct.' }
    Write-Owner @{ state = 'not-started' }
    $stream = [IO.File]::OpenRead($InputPath)
    try { $header = New-Object byte[] 5; [void]$stream.Read($header, 0, 5) } finally { $stream.Dispose() }
    if ([Text.Encoding]::ASCII.GetString($header) -notmatch '^CPYU?A') { throw 'INVALID_INPUT: Origin native template signature is absent.' }
    Assert-NotCancelled
    $registeredExecutable = Get-RegisteredOriginExecutable
    $beforeIds = @(Get-Process -Name Origin64, Origin -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    $readerStage = 'constructing'
    $startupRecord = [pscustomobject]@{ state = 'starting'; stage = $readerStage; beforeIds = @($beforeIds); startedAt = [DateTime]::UtcNow.ToString('o'); executablePath = $registeredExecutable }
    Write-Owner $startupRecord
    $starting = $true
    Assert-NotCancelled
    # Origin.Application (not ApplicationSI) always starts a separate COM session.
    $application = New-Object -ComObject Origin.Application
    $ownedProcess = Resolve-StartingOrigin $startupRecord
    if (!$ownedProcess) { throw 'OWNER_UNAVAILABLE: 无法确认本次新建 Origin 自动化实例的归属。' }
    $readerStage = 'ready'
    Register-OwnedOrigin $ownedProcess
    $application.Visible = 0
    Assert-NotCancelled
    $deadline = [DateTime]::UtcNow.AddSeconds(25)
    do {
        Assert-NotCancelled
        if ((Get-LTNumber '@OCE') -eq 1) { break }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    if ((Get-LTNumber '@OCE') -ne 1) { throw 'ORIGIN_NOT_READY: Origin C did not become ready.' }
    $version = (Get-LTNumber '@V').ToString([Globalization.CultureInfo]::InvariantCulture)
    [void]$application.Execute('@NOE=5;@NOI=5;@NOW=5;')
    Set-LTString 'plotFigSource$' (Join-Path $PSScriptRoot 'origin-reader.c')
    Set-LTString 'plotFigInput$' $InputPath
    Set-LTString 'plotFigOutputDirectory$' ($outputDirectory.TrimEnd('\') + '\')
    Assert-NotCancelled
    Set-ReaderStage 'compiling'
    if (!$application.Execute('plotFigCompileResult=run.LoadOC(plotFigSource$,0);') -or (Get-LTNumber 'plotFigCompileResult') -ne 0) { throw 'ORIGIN_COMPILE_FAILED: Native reader could not be compiled.' }
    Set-ReaderStage 'reading'
    if (!$application.Execute('plotFigReadResult=plot_fig_native_read();')) { throw 'ORIGIN_READ_FAILED: Native reader invocation failed.' }
    $nativeResult = Get-LTNumber 'plotFigReadResult'
    if ($nativeResult -eq 18) { throw 'UNSAFE_TEMPLATE: 模板包含脚本、自定义公式或需要求值的标签，已停止导入且未执行这些内容。' }
    if ($nativeResult -ne 0) {
        $reasons = @{ 10 = '模板路径传递失败'; 11 = 'Origin 无法打开该模板'; 12 = '模板超过 32 个图层上限'; 13 = '无法读取页面格式'; 14 = '模板超过 128 个绘图占位上限'; 15 = '无法读取图层格式'; 16 = '无法建立临时样例数据'; 17 = '无法保存模板结构' }
        $reason = $reasons[[int]$nativeResult]
        if (!$reason) { $reason = 'Origin 未能完整读取模板' }
        throw ('ORIGIN_READ_FAILED: ' + $reason + '（' + $nativeResult + '）。')
    }
    Assert-NotCancelled
    Set-ReaderStage 'serializing'
    $manifest = (Read-NativeXml 'manifest.xml').DocumentElement
    $pageXml = Read-NativeXml 'page.xml'
    $snapshot = [ordered]@{ formatVersion = 1; originVersion = $version; page = (Convert-FormatTree $pageXml.OriginStorage.Root '/page'); layers = @(); fonts = @{}; colors = @{}; warnings = @() }
    $layerCount = [int]$manifest.LayerCount
    if ($layerCount -lt 1 -or $layerCount -gt 32) { throw 'INVALID_NATIVE_OUTPUT: Unsupported layer count.' }
    for ($layerIndex = 0; $layerIndex -lt $layerCount; $layerIndex++) {
        $layerInfo = $manifest.('Layer' + $layerIndex)
        $layerXml = Read-NativeXml ('layer-' + $layerIndex + '.xml')
        $layer = [ordered]@{ name = [string]$layerInfo.Name; format = (Convert-FormatTree $layerXml.OriginStorage.Root ('/layers/' + $layerIndex + '/format')); plots = @(); unsupportedPlotIds = @() }
        for ($styleIndex = 0; $styleIndex -lt [int]$layerInfo.StyleCount; $styleIndex++) {
            $styleInfo = $layerInfo.('Style' + $styleIndex)
            $plotId = [int]$styleInfo.PlotId
            if ([int]$styleInfo.Materialized -ne 1) {
                $layer.unsupportedPlotIds += $plotId
                $warnings.Add(@{ path = '/layers/' + $layerIndex + '/unsupportedPlotIds'; message = 'Origin 绘图类型 ' + $plotId + ' 尚不支持，未将其转换为普通 XY 曲线。' })
                continue
            }
            $plotXml = Read-NativeXml ('plot-' + $layerIndex + '-' + $styleIndex + '.xml')
            $layer.plots += [ordered]@{ plotId = $plotId; designations = [string]$styleInfo.Designations; format = (Convert-FormatTree $plotXml.OriginStorage.Root ('/layers/' + $layerIndex + '/plots/' + $layer.plots.Count + '/format')) }
        }
        $snapshot.layers += $layer
    }
    # Resolve encoded font faces and OCOLOR values using this Origin installation.
    # Only validated integers are sent to these trusted functions; no template code.
    $colorValues = @{}
    $fontValues = @{}
    foreach ($document in $xmlDocuments) {
        foreach ($node in $document.SelectNodes('//*[not(*)]')) {
            $number = 0L
            if (![long]::TryParse($node.InnerText, [ref]$number)) { continue }
            if ($node.Name -match 'Color$' -and (($number -ge 0 -and $number -le 255) -or ($number -ge 16777216 -and $number -le 33554431))) { $colorValues[[string]$number] = $true }
            if ($node.Name -eq 'Face' -and $node.ParentNode.Name -eq 'Font' -and $number -ge 0 -and $number -le 4294967295) { $fontValues[[string]$number] = $true }
        }
    }
    foreach ($number in $colorValues.Keys) {
        Assert-NotCancelled
        if (!$application.Execute('plotFigColor=plot_fig_native_color(' + $number + ');')) { continue }
        $rgb = [int](Get-LTNumber 'plotFigColor')
        if ($rgb -ge 0 -and $rgb -le 16777215) { $snapshot.colors[$number] = '#{0:x2}{1:x2}{2:x2}' -f ($rgb -band 255), (($rgb -shr 8) -band 255), (($rgb -shr 16) -band 255) }
    }
    foreach ($number in $fontValues.Keys) {
        Assert-NotCancelled
        if (!$application.Execute('plotFigFontResult=plot_fig_native_font(' + $number + ');') -or (Get-LTNumber 'plotFigFontResult') -ne 0) { continue }
        $font = [string](Get-LTString 'plotFigFont$')
        # Origin's index zero is localized as "Default: Arial" (or equivalent).
        # Its resolved family follows the colon and is supplied by Origin itself.
        if ($number -eq '0' -and $font.Contains(':')) { $font = $font.Substring($font.IndexOf(':') + 1).Trim() }
        if ($font -and $font -notmatch '^<|^Default$') { $snapshot.fonts[$number] = $font }
    }
    $snapshot.warnings = @($warnings.ToArray())
    $json = $snapshot | ConvertTo-Json -Depth 64
    if ($utf8.GetByteCount($json) -gt 16777216) { throw 'INVALID_NATIVE_OUTPUT: Snapshot exceeds the supported limit.' }
    [IO.File]::WriteAllText($OutputPath, $json, $utf8)
} catch {
    $failure = $_.Exception.Message
    if ($failure -match '80040154|REGDB_E_CLASSNOTREG|未注册类|class not registered') { $failure = 'ORIGIN_NOT_INSTALLED: 请在本机安装并激活 Origin，再导入 OTP 或 OTPU 模板。' }
    $stageNames = @{ validating = '检查模板'; constructing = '启动 Origin 自动化实例'; ready = '等待 Origin 就绪'; compiling = '编译读取器'; reading = '读取原生模板'; serializing = '整理模板格式' }
    $failure += '（阶段：' + $stageNames[$readerStage] + '）'
} finally {
    if ($starting -and $null -eq $ownedProcess) {
        try {
            $ownedProcess = Resolve-StartingOrigin $startupRecord
            if ($ownedProcess) { Register-OwnedOrigin $ownedProcess }
            else { Write-Owner @{ state = 'not-started' } }
        } catch { if (!$failure) { $failure = 'OWNER_UNAVAILABLE: Could not record the Origin lifecycle.' } }
    }
    # Do not dispatch Exit/close events from an untrusted template. Terminate only
    # the process whose PID, creation time and executable were recorded above.
    if ($null -ne $ownedProcess) {
        try { Stop-OwnedOrigin $OwnerPath } catch { if (!$failure) { $failure = $_.Exception.Message } }
    }
    if ($null -ne $application) {
        try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($application) } catch { }
    }
}
if ($failure) { [Console]::Error.WriteLine($failure); exit 1 }
exit 0
