# Good Morning Initialization Script
# Plays Jarvis audio + displays console initialization sequence
# Windows PowerShell

$audioPath = "$PSScriptRoot\..\assets\audio\goodmorning.mp3"
$displayText = @(
    "Weapons navigation systems check....",
    "initializing ....",
    "Alpha protocol approved....",
    "Weapons hot.....",
    "Welcome Tim, how may I serve you..."
)

# Check if audio file exists
if (-not (Test-Path $audioPath)) {
    Write-Host "Warning: Audio file not found at $audioPath"
    Write-Host "Displaying text only..."
} else {
    # Start audio playback in background
    $audioPlayer = New-Object System.Media.SoundPlayer($audioPath)
    $audioPlayer.Play()
}

# Display initialization sequence
# Timing: roughly synchronized with audio playback (~8 seconds total)
$delayPerLine = 1600  # milliseconds between lines

foreach ($line in $displayText) {
    Write-Host $line
    Start-Sleep -Milliseconds $delayPerLine
}

# Final message
Write-Host ""
Write-Host "Systems online. Standing by for commands."
