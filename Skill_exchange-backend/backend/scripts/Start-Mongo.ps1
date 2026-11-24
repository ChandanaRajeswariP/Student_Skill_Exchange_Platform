$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
function MongoListening { $socket=[Net.Sockets.TcpClient]::new();try{$socket.Connect('127.0.0.1',27018);return $true}catch{return $false}finally{$socket.Dispose()} }
if(!(MongoListening)){
  $binary=Join-Path $projectRoot 'work\mongodb\bin\mongod.exe'
  if(!(Test-Path -LiteralPath $binary)){throw 'MongoDB binary missing. Run scripts/Install-Mongo.ps1 first.'}
  $data=Join-Path $projectRoot 'work\mongo-data'
  $logs=Join-Path $projectRoot 'work\logs'
  New-Item -ItemType Directory -Path $data,$logs -Force | Out-Null
  $log=Join-Path $logs 'mongodb.log'
  $mongoProcess=Start-Process -FilePath $binary -ArgumentList '--auth','--bind_ip','127.0.0.1','--port','27018','--dbpath',"`"$data`"",'--logpath',"`"$log`"",'--logappend' -WindowStyle Hidden -PassThru
  $mongoProcess.Id | Set-Content -LiteralPath (Join-Path $projectRoot 'work\mongo.pid')
}
for($attempt=0;$attempt -lt 40;$attempt++){if(MongoListening){break};Start-Sleep -Milliseconds 500}
if(!(MongoListening)){throw 'MongoDB startup failed. See work/logs/mongodb.log.'}
& node --env-file=.env scripts/setup-mongo.mjs
if($LASTEXITCODE -ne 0){throw 'MongoDB initialization failed.'}
Write-Host 'Authenticated MongoDB ready at 127.0.0.1:27018.'
