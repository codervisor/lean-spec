# Demo Recording Guide - Quick Start

## You Are Here

✅ **Scripts complete** - Full AI-assisted demo script with timing and voiceover  
📍 **Next step** - Record the actual demo video  
🎯 **Goal** - Show LeanSpec's AI-native workflow (not just CLI)

---

## What's Ready

### 1. Main Demo Script: `DEMO-AI-ASSISTED.md`
- **Duration**: 3-5 minutes
- **Format**: Split-screen (AI chat + terminal)
- **6 scenes** with complete dialogue and timing
- **Voiceover script** included
- **Key moments** identified for post-production

### 2. Recording Strategy
**Show, don't tell**: AI creating/reading/managing specs through conversation

**Core differentiator**: MCP integration = specs as semantic memory

---

## Recording Options

### Option A: Full Production (Recommended)
**What**: Split-screen recording with AI chat + terminal  
**Tools**: OBS Studio (free) or Loom  
**Time**: 2-3 hours (setup + recording + editing)  
**Impact**: ⭐⭐⭐⭐⭐ Maximum impact

**Setup**:
1. Install OBS Studio or open Loom
2. Configure split layout (60% AI chat, 40% terminal)
3. Prepare clean demo-project directory
4. Test MCP integration works
5. Practice script 2-3 times
6. Record with voiceover or add later

### Option B: Screen + Terminal Only (Simpler)
**What**: Single screen showing terminal + editor, typed AI prompts  
**Tools**: OBS Studio / QuickTime  
**Time**: 1 hour  
**Impact**: ⭐⭐⭐⭐ Good, but less "magic"

**Setup**:
1. Terminal + VS Code side-by-side
2. Type AI prompts as comments or in text file
3. Show commands AI would run via MCP
4. Simulate the workflow manually

### Option C: Slides + Narration (Fastest)
**What**: Slides showing conversation + results  
**Tools**: Google Slides / Keynote + Loom narration  
**Time**: 30 minutes  
**Impact**: ⭐⭐⭐ OK for initial version

---

## Immediate Next Steps (Choose Your Path)

### Path 1: Record This Week (Option A)
```bash
# Day 1: Setup (30 min)
- Install OBS Studio or sign up for Loom
- Create fresh demo-project directory
- Verify MCP integration works
- Practice script once

# Day 2: Record (2 hours)
- Practice script 2-3 times
- Record full walkthrough
- Watch back, note issues
- Re-record problem sections

# Day 3: Edit (1-2 hours)
- Trim dead space
- Add captions/highlights
- Add intro/outro
- Export and upload to YouTube (unlisted)
```

### Path 2: Delegate/Postpone
- **Delegate**: Share `DEMO-AI-ASSISTED.md` with someone to record
- **Postpone**: Focus on other launch prep, revisit demos later

---

## Technical Checklist

### Before Recording
- [ ] Clean terminal (clear history, simple prompt: `user@machine:~/demo-project$`)
- [ ] Fresh directory: `mkdir ~/demo-project && cd ~/demo-project`
- [ ] MCP configured in Claude Desktop or GitHub Copilot
- [ ] Test: Ask AI "list specs in this project" (should work via MCP)
- [ ] VS Code with readable theme (high contrast)
- [ ] Screen resolution: 1920x1080 minimum
- [ ] Close distracting apps (notifications off)

### During Recording
- [ ] Slow, deliberate typing (150-200ms between characters)
- [ ] Pause 2-3 seconds after each AI response
- [ ] Keep cursor visible
- [ ] Speak clearly if doing voiceover live
- [ ] If you mess up, pause 5 seconds and restart that scene

### After Recording
- [ ] Watch full video for issues
- [ ] Note timestamps for key moments
- [ ] Add captions at key points
- [ ] Add intro (0-5s): "LeanSpec + AI Demo"
- [ ] Add outro (last 5s): "npm install lean-spec" + website

---

## Quick Test: Is MCP Working?

```bash
# Terminal
cd ~/demo-project
npm init -y
npm install --save-dev lean-spec
npx lean-spec init  # Choose minimal

# AI Chat (Claude Desktop or Copilot)
Ask: "What specs exist in this project?"

Expected response:
✅ AI uses MCP tool (you might see tool call in UI)
✅ AI responds: "No specs exist yet. Would you like to create one?"

If this works, you're ready to record!
```

---

## Fallback Plan

If MCP setup is complex or buggy:

1. **Record terminal-only demo** showing CLI commands
2. **Add narration**: "Imagine asking AI to do this..."
3. **Show the RESULT**: "AI would create this spec via MCP"
4. **Promise**: "Full MCP demo coming soon"

This still shows the workflow, just less "magical".

---

## Questions to Resolve Before Recording

1. **Which AI tool to use?**
   - Claude Desktop (cleaner UI, easier to show MCP)
   - GitHub Copilot (more users have it)
   - **Recommendation**: Claude Desktop for demo purity

2. **Live voiceover or post-production?**
   - Live: Faster, more natural
   - Post: More polished, easier to fix mistakes
   - **Recommendation**: Live if comfortable, post otherwise

3. **How much editing?**
   - Minimal: Just trim start/end
   - Moderate: Add captions, zoom on key moments
   - Heavy: Animations, transitions, music
   - **Recommendation**: Moderate (captions + zoom sufficient)

---

## Success Criteria

**Demo is successful if a viewer can:**
- ✅ Understand that AI manages specs through conversation
- ✅ See the value of semantic memory ("what did we decide?")
- ✅ Recognize this is different from traditional CLI tools
- ✅ Want to try it themselves

**Demo has failed if:**
- ❌ Looks like "just another CLI tool with AI wrapper"
- ❌ MCP integration isn't clear or seems buggy
- ❌ Too complex to follow
- ❌ No clear "wow" moment

---

## Timeline Suggestion

**Option 1: Full quality (1 week)**
- Day 1: Setup and practice
- Day 2: Record main video
- Day 3: Edit and polish
- Day 4: Create GIF excerpts
- Day 5: Upload and embed

**Option 2: Quick version (2-3 days)**
- Day 1: Setup and record (Option B - terminal only)
- Day 2: Quick edit, upload
- Day 3: Create GIFs

**Option 3: Defer to later phase**
- Focus on Product Hunt text, social posts
- Record demo after launch based on feedback
- Use screenshots/terminal commands for now

---

## Where to Get Help

**Recording issues:**
- OBS Studio tutorials: YouTube "OBS screen recording setup"
- Loom is simpler: Just click record

**MCP setup issues:**
- Check docs: https://modelcontextprotocol.io/
- Test with: `npx lean-spec mcp` (should start server)
- Claude Desktop config: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Script questions:**
- Full script is in `DEMO-AI-ASSISTED.md`
- Voiceover timing provided
- Feel free to adapt/improvise

---

## Ready to Record?

**If yes:**
1. Read through `DEMO-AI-ASSISTED.md` completely
2. Choose your recording tool (OBS / Loom / QuickTime)
3. Set up demo-project directory
4. Practice script once
5. Hit record!

**If not yet:**
- What's blocking? (Technical setup? Time? Uncertainty?)
- Can I help with setup, or should we defer?

---

**You've got this!** The hard part (scripting) is done. Recording is just execution.
