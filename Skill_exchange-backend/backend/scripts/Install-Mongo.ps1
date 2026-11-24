$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$destination=Join-Path $projectRoot 'work\mongodb\bin'
if(Test-Path -LiteralPath (Join-Path $destination 'mongod.exe')){Write-Host 'MongoDB is already installed for this project.';exit}
$archive=Join-Path $projectRoot 'work\mongodb-windows.zip'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
& curl.exe --fail --location --retry 1 --output $archive 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.17.zip'
if($LASTEXITCODE -ne 0){throw 'MongoDB download failed.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($archive)
try{
  $entry=$zip.Entries | Where-Object FullName -Match '/bin/mongod.exe$'
  if(!$entry){throw 'MongoDB executable not found in official archive.'}
  [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $destination 'mongod.exe'),$false)
}finally{$zip.Dispose()}
Write-Host 'Portable MongoDB installed. No Windows service or system-wide installation was added.'
