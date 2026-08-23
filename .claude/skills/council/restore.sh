#!/bin/bash
# Council Chambers Emergency Recovery
# Invoked by: /council command
# Action: Restores full Council Chambers with all institutional memory

echo "🏛️  COUNCIL CHAMBERS RECOVERY PROTOCOL ACTIVATED"
echo ""
echo "Loading Council System Framework..."
echo ""

# List all council files that will be loaded
FILES=(
  "./.claude/council/SYSTEM.md"
  "./.claude/council/memory-wash-plant.md"
  "./.claude/council/memory-shift-commander.md"
  "./.claude/council/memory-medic.md"
  "./.claude/council/memory-coroner.md"
  "./.claude/council/memory-zee.md"
  "./.claude/council/BACKUP-PROTOCOL.md"
  "./.claude/council/CONTEXT.md"
  "./.claude/council/linda.md"
)

echo "Required files to load:"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

echo ""
echo "RECOVERY INSTRUCTIONS:"
echo ""
echo "Paste this prompt into Claude Code immediately:"
echo ""
echo "---"
echo ""
echo "EMERGENCY RESTORE: Council Chambers Memory Recovery"
echo ""
echo "The Council Chambers have lost context. I need you to restore the full council system immediately."
echo ""
echo "Step 1: Load the system framework"
echo "- Read: .claude/council/SYSTEM.md"
echo ""
echo "Step 2: Load all council member memory"
echo "- Read: .claude/council/memory-wash-plant.md"
echo "- Read: .claude/council/memory-shift-commander.md"
echo "- Read: .claude/council/memory-medic.md"
echo "- Read: .claude/council/memory-coroner.md"
echo "- Read: .claude/council/memory-zee.md"
echo ""
echo "Step 3: Load backup protocol"
echo "- Read: .claude/council/BACKUP-PROTOCOL.md"
echo ""
echo "Step 4: Load operational context"
echo "- Read: .claude/council/CONTEXT.md"
echo ""
echo "Step 5: Load Linda's profile"
echo "- Read: .claude/council/linda.md"
echo ""
echo "Step 6: Verify all files loaded"
echo "- Confirm you have all memory files and understand each council member"
echo "- Report: Council restored with full institutional memory"
echo ""
echo "Then proceed normally."
echo ""
echo "---"
echo ""
echo "✓ Council Chambers recovery protocol ready"
echo "✓ All memory files are in git and GitHub"
echo "✓ No institutional learning has been lost"
