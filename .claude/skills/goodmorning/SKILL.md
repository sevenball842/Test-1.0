---
title: Good Morning Initialization
description: Jarvis AI morning greeting with weapons systems initialization sequence
trigger: /goodmorning
environment: windows
---

# Good Morning Initialization Skill

**Command:** `/goodmorning`

Plays a Jarvis (Iron Man) audio greeting and displays console initialization sequence.

## What It Does

When triggered:
1. Displays animated console text: "Weapons navigation systems check..." through "Welcome Tim, how may I serve you..."
2. Plays Jarvis audio clip simultaneously (Windows desktop only; web app shows text only)
3. Timing synchronized so text appears while audio plays

## Setup Required

### 1. Get the Audio File

Download a Jarvis greeting clip (5-8 seconds). Options:
- **YouTube:** Search "Jarvis good morning sir" — download using youtube-dl or similar
- **Audio Library:** Epidemic Sound, Soundly, or similar stock audio sites
- **Generated:** Use text-to-speech with Jarvis voice (if available)

Example clips to search:
- "Jarvis good morning sir all systems nominal"
- "Jarvis initializing systems good morning"

### 2. Store in Repo

1. Save audio as: `assets/audio/goodmorning.mp3`
2. Commit to git: `git add assets/audio/goodmorning.mp3 && git commit -m "Add Jarvis goodmorning audio"`

### 3. Run the Skill

Type: `/goodmorning`

## Technical Details

**Platform:** Windows PowerShell  
**Audio Format:** `.mp3` (compatible with Windows Media Foundation)  
**Display:** Console output (stdout)  
**Duration:** ~8 seconds

**Console Output Sequence:**
```
Weapons navigation systems check....
initializing ....
Alpha protocol approved....
Weapons hot.....
Welcome Tim, how may I serve you...
```

## Script Location

`scripts/goodmorning.ps1` — PowerShell script that:
- Plays audio via `[System.Media.SoundPlayer]`
- Displays text with timing
- Works on desktop app; web app shows text only (no audio)

## Limitations

- **Web App:** Audio doesn't play (remote session); console text displays only
- **Desktop App:** Full audio + text on Windows only
- **Audio File Required:** Must have `assets/audio/goodmorning.mp3` in repo

---

**Ready to use once audio file is added to repo.**
