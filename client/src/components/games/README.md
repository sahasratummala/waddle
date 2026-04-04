# Waddle — Games Section

## Files

| File | Purpose |
|------|---------|
| `GameHub.tsx` | Orchestrates game selection + break UI (import this into FlockPartyRoom) |
| `MazeGame.tsx` | Maze drawing game — same maze for all players via seeded RNG |
| `BreadcrumbGame.tsx` | Tapping game with live leaderboard |
| `PictionaryGame.tsx` | Drawing game with Claude AI guessing via vision API |
| `gameHandlers.ts` | Server-side Socket.io handlers + points awarding |

---

## How to plug in to FlockPartyRoom

In `FlockPartyRoom.tsx`, import and render `GameHub` during break phases:

```tsx
import GameHub from "../components/games/GameHub";

// Inside your break phase render:
{phase === "break" && (
  <GameHub
    socket={socket}
    roomCode={roomCode}
    userId={user.id}
    username={user.username}
    isHost={isHost}
    breakDurationMs={breakDurationMs}
    onBreakEnd={() => setPhase("studying")}
  />
)}
```

On the server, in `server/src/socket/roomHandlers.ts`, register the game handlers:

```ts
import { registerGameHandlers } from "./gameHandlers";

io.on("connection", (socket) => {
  // ...existing handlers...
  registerGameHandlers(io, socket);
});
```

Make sure `socket.data` has `{ userId, username, roomCode }` set when a user joins a room.

---

## Points

| Event | Points |
|-------|--------|
| Maze win | +50 |
| Breadcrumb 1st | +40 |
| Breadcrumb 2nd | +25 |
| Breadcrumb 3rd | +15 |
| Pictionary (drawer wins) | +45 |

These are passed through `pointsService.awardPoints(userId, amount, reason)` — wire that to your Supabase `points` table.

---

## Generating Assets with Gemini (or any image AI)

The games use emoji and CSS shapes as placeholders for goose assets. Here's how to drop in real art:

### 1. Prompts to use

Generate these as **PNG with transparent background**, ideally 256×256 or 512×512:

#### Goose Stages (for GooseAvatar)
| Asset | Gemini prompt |
|-------|--------------|
| Egg | `cute cartoon goose egg, white with small cracks, flat style, transparent background, no shadow` |
| Hatchling | `tiny baby goose hatchling, fluffy yellow, just hatched, cute cartoon, flat style, transparent background` |
| Gosling | `cartoon gosling, small fluffy goose chick, white and grey, friendly face, flat style, transparent background` |
| Goose | `cartoon goose, white feathers, orange beak and feet, friendly expression, flat style, transparent background` |

#### Accessories (overlay on GooseAvatar)
| Asset | Gemini prompt |
|-------|--------------|
| Party hat | `cartoon party hat, colorful, pointy, flat style, transparent background` |
| Baseball cap | `cartoon baseball cap, forward facing, flat style, transparent background` |
| Beanie | `cartoon knit beanie hat, cozy, flat style, transparent background` |
| Cowboy hat | `cartoon cowboy hat, brown, flat style, transparent background` |
| Bow | `cartoon ribbon bow, pink, cute, flat style, transparent background` |
| Tie | `cartoon neck tie, formal, flat style, transparent background` |
| Sunglasses | `cartoon cool sunglasses, round lenses, flat style, transparent background` |
| Headphones | `cartoon over-ear headphones, colorful, flat style, transparent background` |

#### Game Assets
| Asset | Gemini prompt |
|-------|--------------|
| Breadcrumb | `cartoon bread crumb, golden brown, cute, flat style, transparent background` |
| Maze walls | `top-down maze wall tile, simple brick texture, flat style, tileable` |
| Goose cursor (maze) | `tiny cartoon goose top-down view, flat style, transparent background, 64x64` |

### 2. Drop them in

```
client/
└── src/
    └── assets/
        └── goose/
            ├── egg.png
            ├── hatchling.png
            ├── gosling.png
            ├── goose.png
            ├── accessories/
            │   ├── party-hat.png
            │   ├── baseball-cap.png
            │   └── ...
            └── games/
                ├── breadcrumb.png
                └── goose-cursor.png
```

### 3. Swap into components

**BreadcrumbGame** — replace the 🍞 emoji:
```tsx
import breadcrumb from "../../assets/goose/games/breadcrumb.png";
// ...
<img src={breadcrumb} alt="breadcrumb" className="w-16 h-16" />
```

**MazeGame** — replace the purple dot player:
```tsx
import gooseCursor from "../../assets/goose/games/goose-cursor.png";
// In drawMaze():
const img = new Image();
img.src = gooseCursor;
ctx.drawImage(img, x - 16, y - 16, 32, 32);
```

**GooseAvatar** — replace the stage placeholders in `GooseAvatar.tsx` with `<img src={stageAssets[stage]} />` and overlay accessories as absolutely-positioned `<img>` layers.

---

## Environment Variables

The Pictionary AI guess uses the Anthropic API directly from the client (for simplicity during the hackathon). For production, move this call to the server.

Add to `client/.env`:
```
VITE_ANTHROPIC_API_KEY=your_key_here
```

Update `PictionaryGame.tsx` fetch headers:
```ts
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
```
