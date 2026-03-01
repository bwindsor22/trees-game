# trees-game Developer Instructions

## ⛔ CRITICAL: NEVER use Bash to run npm commands

**WRONG — triggers a permission prompt and blocks async work:**
```bash
npm run build
/opt/homebrew/bin/npm run build
```

**RIGHT — runs without any permission prompt:**
```bash
python3 /Users/brad/projects/code/game-creation-agent/tools/npm_build.py /Users/brad/projects/code/trees-game
```

This rule is absolute. Every time you reach for `npm run build` in Bash, stop and use the Python tool instead.

## Build & dev server workflow

```python
import sys
sys.path.insert(0, '/Users/brad/projects/code/game-creation-agent')
from tools.npm_build import npm_build
from tools.dev_tools import start_dev_server, kill_dev_server
from tools.screenshot_tool import take_screenshot
from tools.vision_tool import ask_about_screenshot

# Build
result = npm_build('/Users/brad/projects/code/trees-game')
print(result['stderr'])  # errors/warnings

# Dev server
kill_dev_server(3000)
start_dev_server('/Users/brad/projects/code/trees-game', 3000)

# Screenshot + vision
path = take_screenshot('http://localhost:3000', output_path='/tmp/test.png')
analysis = ask_about_screenshot(path, 'Is the button enabled?')
```

Use these via `python3 -c "..."` in Bash — all pre-approved in settings.json.

## Project structure

- `src/AI/ai.js` — AI player logic (minimax-style search)
- `src/view/board/Game.js` — core game state (module-level, observer pattern)
- `src/view/board/GameContext.js` — React context wrapping Game.js
- `src/view/board/Board.jsx` — hex board rendering
- `src/view/StartScreen.jsx` — pre-game setup screen
- `src/view/Tutorial.jsx` — in-game tutorial overlay
- `src/App.js` — root component

## Game rules summary (for implementing features)

- **Setup phase**: each player places 2 small trees on the outer ring (ring 3)
- **Photosynthesis**: runs at each sun position — trees not in shadow earn LP
- **Lifecycle**: spend LP to: plant seeds (1 LP), grow (1/2/3 LP), harvest large tree (4 LP)
- **Newly placed pieces cannot be used same turn** (activatedSquaresThisTurn set in Game.js)
- **Game ends**: after 3 full sun revolutions (18 rounds); LP converts 3:1 to points
- **Scoring**: harvest tokens by ring (center = most, outer = least), diminishing piles
