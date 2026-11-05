[CmdletBinding()]
param(
  [string]$BackendPath = '',
  [string]$ConnectionString = $env:AIPMS_TEST_SQL_CONNECTION,
  [string]$OutputDirectory = '',
  [string]$TestPattern = 'live.spec.ts v5-modules.spec.ts'
)
$ErrorActionPreference = 'Stop'
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
if ([string]::IsNullOrWhiteSpace($BackendPath)) { $BackendPath = Join-Path $scriptDir '../../../ai-pms-backend' }
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $OutputDirectory = Join-Path $scriptDir '../../test-results/review-gates-live' }
if ([string]::IsNullOrWhiteSpace($ConnectionString)) { throw 'Supply AIPMS_TEST_SQL_CONNECTION through the process environment.' }
$backend = (Resolve-Path -LiteralPath $BackendPath).Path
$frontend = (Resolve-Path -LiteralPath (Join-Path $scriptDir '../..')).Path
$evidence = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$previousEnvironment = @{}
foreach ($key in @('AIPMS_E2E_PASSWORD','REVIEW_GATES_API_URL','REVIEW_GATES_LIVE_FIXTURE','REVIEW_GATES_E2E_REPORT','REVIEW_GATES_OUTPUT_DIR')) {
  $previousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
$database = 'AI_PMS_E2E_' + [Guid]::NewGuid().ToString('N')
$masterConnection = $ConnectionString
$env:AIPMS_E2E_PASSWORD = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$process = $null
$create = Join-Path $backend 'scripts\new-e2e-database.ps1'
$runRoot = Join-Path $evidence $database
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$connection = [System.Data.SqlClient.SqlConnectionStringBuilder]::new($masterConnection)
$connection['Initial Catalog'] = $database
function Query([string]$Sql) {
  $c = [System.Data.SqlClient.SqlConnection]::new($connection.ConnectionString)
  try {
    $c.Open(); $cmd = $c.CreateCommand(); $cmd.CommandText = $Sql
    $reader = $cmd.ExecuteReader(); $rows = @()
    try {
      while ($reader.Read()) {
        $row = [ordered]@{}
        for ($i=0; $i -lt $reader.FieldCount; $i++) { $row[$reader.GetName($i)] = if ($reader.IsDBNull($i)) { $null } else { $reader.GetValue($i) } }
        $rows += [pscustomobject]$row
      }
    } finally { $reader.Dispose(); $cmd.Dispose() }
    return $rows
  } finally { $c.Dispose() }
}
try {
  & $create -ConnectionString $masterConnection -DatabaseName $database | Out-Null
  & (Join-Path $backend 'scripts\prepare-v5-demo.ps1') -ConnectionString $masterConnection -DatabaseName $database | Out-Null
  $fixture = @{
    projects = @(Query "SELECT p.id, p.code, s.project_period_id AS periodId FROM dbo.projects p JOIN dbo.project_registration_snapshots s ON s.project_id=p.id WHERE p.code IN ('E2E-SINGLE-P','E2E-INTER-P','E2E-EVAL-P','E2E-HIER-P')")
    actors = @(Query "SELECT id,email FROM dbo.users WHERE email IN ('admin@e2e.invalid','single.leader@e2e.invalid','leader@e2e.invalid','member@e2e.invalid','supervisor@e2e.invalid','mentor.ds@e2e.invalid','evaluator@e2e.invalid','staff.cs@e2e.invalid','staff.ds@e2e.invalid','outsider@e2e.invalid','expert.advisor@e2e.invalid')")
    majors = @(Query "SELECT id,code FROM dbo.majors WHERE code IN ('E2E-SE','E2E-DS')")
  }
  $fixturePath = Join-Path $evidence 'live-fixture.json'
  $fixture | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $fixturePath -Encoding UTF8
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
  $url = "http://127.0.0.1:$port"
  $settings = @{
    COMMIT_SHA=(& git -C $backend rev-parse HEAD); ASPNETCORE_ENVIRONMENT='Staging'; DOTNET_ENVIRONMENT='Staging'; ConnectionStrings__DefaultConnection=$connection.ConnectionString
    Cors__AllowedOrigins__0='http://127.0.0.1:5197'
    Jwt__Issuer='AI-PMS.IsolatedAcceptance'; Jwt__Audience='AI-PMS.IsolatedAcceptance'
    Jwt__SigningKey=([Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N'))
    FileStorage__Provider='Local'; FileStorage__RootPath=(Join-Path $runRoot 'files')
    PasswordRecovery__KeyRingPath=(Join-Path $runRoot 'keys'); PasswordRecovery__Enabled='false'
    GoogleAuth__Enabled='false'; NotificationEmail__Enabled='false'; ScheduledNotifications__Enabled='false'
    MeetingReminders__Enabled='false'; VideoMeeting__Enabled='false'
    Chat__Enabled='true'; Chat__RealtimeEnabled='true'
    Appeals__Enabled='true'; Industry__Enabled='true'; WorkingAgreement__Enabled='true'; PeerEvaluation__Enabled='true'
    Observability__LogFilePath=(Join-Path $runRoot 'api-.log')
  }
  foreach ($k in $settings.Keys) { [Environment]::SetEnvironmentVariable($k, [string]$settings[$k], 'Process') }; $process = Start-Process -FilePath 'dotnet' -ArgumentList @((Join-Path $backend 'src\AIPMS.Api\bin\Debug\net8.0\AIPMS.Api.dll'),'--urls',$url,'--contentRoot',$runRoot) -WorkingDirectory $runRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'stdout.log') -RedirectStandardError (Join-Path $runRoot 'stderr.log')
  $ready=$false
  for($i=0; $i -lt 80; $i++) {
    if($process.HasExited) { throw 'Isolated API exited; inspect stdout/stderr.' }
    try { Invoke-WebRequest "$url/api/v1/system" -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready=$true; break }
    catch { Start-Sleep -Milliseconds 400 }
  }
  if(!$ready) { throw 'Isolated API failed readiness.' }
  $env:REVIEW_GATES_API_URL=$url
  $env:REVIEW_GATES_LIVE_FIXTURE=$fixturePath
  $env:REVIEW_GATES_E2E_REPORT=Join-Path $evidence 'playwright-live.json'
  $env:REVIEW_GATES_OUTPUT_DIR=Join-Path $evidence 'browser-live'
  Push-Location $frontend
  try { & cmd.exe /c "npx playwright test --config playwright.review-gates.config.ts $TestPattern" *> (Join-Path $evidence 'playwright-live.log'); $testExit=$LASTEXITCODE }
  finally { Pop-Location }
  @{
    database=$database; backendSha=(& git -C $backend rev-parse HEAD); browserExit=$testExit
    gates=@(Query 'SELECT project_id,code,status,review_eligibility FROM dbo.project_gate_instances ORDER BY project_id,sequence')
    evidence=@(Query 'SELECT project_id,requirement_id,version,artifact_name,size_bytes,sha256,status FROM dbo.review_gate_evidence ORDER BY project_id,requirement_id,version')
    assignments=@(Query 'SELECT gate_instance_id,scope,major_id,student_id,status,latest_decision,revoked_at FROM dbo.review_gate_assignments ORDER BY id')
    chat_messages=@(Query 'SELECT id,conversation_id,sender_id,body,sequence,created_at FROM dbo.chat_messages ORDER BY id')
    appeal_policies=@(Query 'SELECT id,project_id,version,approval_reference,recorded_at FROM dbo.result_appeal_policies ORDER BY id')
    industry_assignments=@(Query 'SELECT id,project_id,expert_id,scope,starts_at,ends_at,revoked_at FROM dbo.industry_assignments ORDER BY id')
    weekly_assessments=@(Query 'SELECT id,project_id,student_id,week_number,status,total_score FROM dbo.weekly_assessments ORDER BY id')
    peer_submissions=@(Query 'SELECT id,round_id,author_id,status,submitted_at FROM dbo.peer_submissions ORDER BY id')
    agreement_acceptances=@(Query 'SELECT agreement_id,user_id,accepted_at FROM dbo.agreement_members WHERE accepted_at IS NOT NULL ORDER BY agreement_id,user_id')
    cold_checklists=@(Query 'SELECT id,project_id,status,deadline,locked_at FROM dbo.cold_packages ORDER BY id')
    defense_sessions=@(Query 'SELECT id,project_id,committee_id,status,start_at,end_at,room FROM dbo.defense_sessions ORDER BY id')
    sprints=@(Query 'SELECT id,project_id,name,status,start_at,end_at FROM dbo.sprints ORDER BY id')
    tasks=@(Query 'SELECT id,milestone_id,title,status,priority,story_points FROM dbo.tasks ORDER BY id')
    meetings=@(Query 'SELECT id,title,start_at,end_at,status FROM dbo.meetings ORDER BY id')
    milestone_templates=@(Query 'SELECT id,name,status FROM dbo.milestone_templates ORDER BY id')
  } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidence 'live-db-readback.json') -Encoding UTF8
  Get-Content -LiteralPath (Join-Path $evidence 'playwright-live.log') -Tail 45
} finally {
  if($process) { if(!$process.HasExited) { Stop-Process -Id $process.Id; $process.WaitForExit(5000) | Out-Null }; $process.Dispose() }
  & $create -ConnectionString $masterConnection -DatabaseName $database -Drop | Out-Null
  foreach ($key in $previousEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key], 'Process') }
  [pscustomobject]@{database=$database; cleanup='Owned API stopped and owned E2E catalog dropped'; sharedDatabaseMutated=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidence 'live-cleanup.json') -Encoding UTF8
}
if ($testExit -ne 0) { throw "Review Gates live acceptance failed; inspect $evidence\playwright-live.log" }
