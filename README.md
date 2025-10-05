# City Explorer

City Explorer is a full-stack TypeScript project that renders a Cesium-powered globe, streams Geoapify landmarks, and now ships with a floating OpenAI assistant. It is composed of a Vite + React front end and an Express + Redis back end.

## Features
- **Interactive 3D globe** – Fly between destinations and highlight landmarks with animated Cesium entities.
- **Geoapify integration** – Radius and place searches backed by Zod validation and cached per user session.
- **Floating AI assistant** – Minimal glassmorphism chat window that streams GPT responses over Server-Sent Events.
- **Redis caching** – Landmark results and chat conversations cached for rapid rehydration.
- **Modern UI** – Gen Z-inspired sidebar, neon accents, and adaptive glass panels tied together with Material UI + TSS.

## Project structure
```
my-app/
├── client/            # Vite + React front end
│   ├── src/
│   │   ├── components/
│   │   │   ├── Assistant/          # Floating assistant UI
│   │   │   ├── GlobeViewer/        # Cesium globe + entities
│   │   │   └── Sidebar/            # Landmark, routes, guides UI
│   │   ├── context/                # CityExplorer context/state
│   │   ├── styles/                 # TSS theme overrides
│   │   └── data/                   # Static catalog data
│   └── scripts/                    # Vite wrapper (crypto polyfill)
├── server/            # Express + Redis backend
│   ├── routes/                     # chat, marker, places
│   └── index.ts
└── shared/            # Schema definitions shared by both sides
```

## Prerequisites
- Node.js 20+
- pnpm 10+
- Redis server (local or remote)
- OpenAI API key (GPT-4o or GPT-4o-mini recommended)

## Environment variables
Create two files at the project root.

```
# .env
OPEN_AI_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GEOAPIFY_KEY=...
VITE_CESIUM_ION_TOKEN=...
```

```
# server/.env (optional override)
PORT=4000
```

> The chat route resolves the OpenAI key from `OPENAI_API_KEY` _or_ `OPEN_AI_KEY`, so either name is accepted.

## Installation
```bash
pnpm --dir server install
pnpm --dir client install
```

## Development
Run the client and server in parallel:
```bash
pnpm dev:all
```
This launches Vite on port 5173 and the Express API on port 4000. The client is configured to proxy `/api/*` to the server during development.

## Building
```bash
pnpm --dir client build
pnpm --dir server build # optional – compile TS where applicable
```

## Linting / type checking
```bash
pnpm --dir client lint
pnpm --dir server lint   # if you add a lint script in the server
```

## Redis usage
- Landmark fetches (`/api/places`) and chat session handshakes are cached in Redis.
- Conversations are stored under `chat:conversation:<id>` for 1 hour.
- Temporary SSE sessions live under `chat:session:<sessionId>` for 5 minutes.

## Floating assistant workflow
1. User message is posted to `/api/chat`. The server trims the last 20 conversation turns, stores a session in Redis, and returns a `sessionId`.
2. The client opens an `EventSource` on `/api/chat/events/:sessionId`.
3. Tokens stream as `{ event: "token", data: { content } }`; `done` closes the stream. Errors are emitted as `{ event: "error", data: { message } }`.
4. The entire conversation is cached, so reopening the assistant resumes the prior context.

## Landmark & camera interactions
- Selecting a landmark in the sidebar stores the `selectedLandmarkId`, scrolls the list, and highlights the associated marker.
- Clicking a marker on the globe focuses the camera with landmark-specific zoom options and syncs the selection back to the sidebar.
- Searches reset selection and invoke a wider, slower camera move.

## Scripts
- `pnpm dev:all` – run Vite + Express + Redis (spawns Redis if docker/podman available, otherwise uses `redis-server`).
- `pnpm build` – compile the React app (`client`).
- `pnpm --dir server dev` – start the Express server with `ts-node` and `nodemon`.

## Troubleshooting
- **Redis not available** – chat routes fall back gracefully, but streaming will fail; ensure Redis is running (use `pnpm redis:start`).
- **OpenAI key missing** – `/api/chat/events/:sessionId` streams an `error` event if the key isn’t set.
- **build warnings** – run `pnpm approve-builds` if pnpm reports ignored build scripts (e.g., `protobufjs`).

## License
MIT – feel free to adapt for personal or commercial projects.
