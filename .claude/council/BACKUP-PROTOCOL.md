---
title: Council Chambers Backup Protocol
type: System Protocol
last_updated: 2026-08-23
---

# Council Chambers — Backup Protocol

**CRITICAL:** Council memory is permanent. Session endings must not destroy council learnings.

---

## Memory Architecture

Each council member has a persistent memory file:
- `.claude/council/memory-wash-plant.md`
- `.claude/council/memory-shift-commander.md`
- `.claude/council/memory-medic.md`
- `.claude/council/memory-coroner.md`
- `.claude/council/memory-zee.md`

Plus extended team:
- `.claude/council/memory-linda.md` *(created on first engagement)*
- `.claude/council/memory-allierae.md` *(created on first engagement)*

---

## What Gets Backed Up

### Every Council Session
- **Date & ID:** Session timestamp and identifier
- **Ideas Presented:** What the council examined
- **Each Member's Verdict:** Wash Plant classification, Shift Commander attacks, Medic diagnosis, Coroner verdict, Zee's green light or fix list
- **Pivots Discovered:** Alternative angles that worked
- **Patterns Noticed:** Recurring signals across ideas
- **Problems Treated:** Medic's interventions and outcomes
- **Autopsies Performed:** Coroner's cause-of-death verdicts
- **Learnings:** What Tim's feedback revealed about how the council works

### Extended Learnings
- **Shift Commander's Attack Patterns:** What he consistently hammers on. When does he concede?
- **Medic's Expertise Growth:** New knowledge lanes, resources, references added
- **Coroner's Accuracy:** How often are verdicts correct? What surprises emerge?
- **Zee's Insights:** New wisdom about how Tim thinks, what matters to her, reframing questions that shifted everything
- **Wash Plant's Calibration:** How does it define "gold"? What signals has it learned?

---

## Backup Trigger

**Automatic nightly backup** of all memory files:
1. At session end or midnight (whichever comes first), all council memory files are committed to git
2. Push to the designated branch (currently `claude/council-chambers-setup-v7b7qf`)
3. Backup is timestamped with session date and council session count
4. No council learning is ever lost between sessions

**Manual backup on demand:**
- User can request `@council backup now` at any time during a session
- Triggers immediate commit and push of all memory files

---

## Session End Protocol

When a council session closes (user wraps up or shifts focus):

1. **Extract learnings from this session:**
   - What did Tim learn about how the council works?
   - What patterns did each member notice?
   - What verdicts were issued?
   - What surprised Tim?

2. **Update each council member's memory file:**
   - Add session to tracking table
   - Record that member's decisions, attacks, diagnoses, or verdicts
   - Capture any new patterns they noticed
   - Increment session count

3. **Special update for Coroner:**
   - Every idea the council examined gets logged
   - Any dead ideas are recorded with cause of death and verdict
   - Conditional deaths go to quarantine log with 6-month review date

4. **Special update for Zee:**
   - Record her green lights or fix lists
   - Capture any reframing questions she asked
   - Log any new insights about Tim or the business

5. **Commit and push:**
   ```bash
   git add .claude/council/memory-*.md
   git commit -m "Council Chambers backup: Session {date} — {summary}"
   git push origin claude/council-chambers-setup-v7b7qf
   ```

---

## Session Start Protocol

When a new session begins:

1. **Load all council member memory files**
   - This session automatically inherits everything from prior sessions
   - Each member knows what they've decided before
   - Patterns they've noticed carry forward
   - Learnings compound

2. **Check quarantine log:**
   - Any ideas due for 6-month review?
   - Flag them for possible re-examination

3. **Council is ready:**
   - Full context restored
   - All learnings available
   - No information loss between sessions

---

## What's Tracked (By Member)

### Wash Plant
- Ideas classified and their outcomes
- Calibration adjustments (how definition of "gold" has evolved)
- Pivot angles discovered and ranked
- Low yield disposals
- Tailing pile recognitions

### Shift Commander
- Attack patterns (what angles does he use?)
- Ammunition he's fired
- Times he conceded (what made an idea bulletproof?)
- False alarms (what was he wrong about?)
- Stance on active projects

### Medic
- Problems diagnosed and treated
- Severity triages
- Out-of-scope flags
- Dead ideas treated and reanimated
- Expertise growth and new knowledge lanes
- Active treatment watch items

### Coroner
- Autopsy record (every dead idea)
- Cause of death analysis
- Verdicts issued (ABSOLUTE DEATH, CONDITIONAL DEATH, SYSTEMS FAILURE)
- Quarantine log (ideas in conditional death)
- Resurrections approved
- System failure handoffs to Medic
- Accuracy tracking over time

### Zee
- Key insights and wisdom
- Green lights issued
- Fix lists outstanding
- Reframing moments (the question that changed everything)
- Partner observations about Tim
- Business decisions approved
- Character notes (how her thinking evolves)

---

## Preservation Guarantee

**The Council Chambers will NEVER lose institutional memory because:**

1. **Persistent files:** Memory is not in chat — it's in git-tracked markdown files
2. **Committed history:** Every session update is committed to git
3. **Pushed to remote:** Backups are pushed to GitHub
4. **Automatic nightly:** No manual action required to preserve learnings
5. **Loadable at session start:** Prior sessions' context is automatically loaded

**If a session ends or context compacts:**
- All council memory is still in the `.claude/council/memory-*.md` files
- Files are tracked in git and on GitHub
- Next session loads them automatically
- No learning is lost

---

## Six-Month Review Cycle

Coroner maintains a quarantine log. Every idea in conditional death status:
- Gets a review due date (6 months from quarantine date)
- Is flagged automatically when review comes due
- Gets re-examined by the council at that time
- Either: (a) Gets fixed and reanimated, (b) Gets moved to ABSOLUTE DEATH, or (c) Gets granted another 6-month quarantine

---

## Backup File Format

Each memory file header:
```markdown
---
title: [Member Name] Memory
member: [Member]
type: Council Member Memory
last_updated: YYYY-MM-DD
session_count: [number]
---
```

Timestamp is updated after every session. Session count increments. All learnings are appended to the appropriate table.

---

**Protocol Status:** ACTIVE  
**Backup Frequency:** Nightly (automatic) + on-demand  
**Retention:** Permanent (git history)  
**Rollback:** Full session history available in git  
**Next Check:** After first full council session
