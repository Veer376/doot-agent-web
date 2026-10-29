<div align="center">
  <h1>Doot web</h1>
  <p><strong>The conversation, tool activity, and approval interface for Doot.</strong></p>
  <p><a href="https://github.com/Veer376/doot-agent">Main project & demos</a> · <a href="https://www.dootagent.com">Website</a> · <a href="https://github.com/Veer376/doot-agent/blob/main/docs/ARCHITECTURE.md">Architecture</a></p>

[![Web checks](https://github.com/Veer376/doot-agent-web/actions/workflows/release-checks.yml/badge.svg)](https://github.com/Veer376/doot-agent-web/actions/workflows/release-checks.yml)

</div>

A React/Next.js client for streamed conversations, model/tool presentation, human approval and resume, and persisted thread history. **[doot-agent](https://github.com/Veer376/doot-agent) is the canonical home for demos, engineering notes, backend setup, and contribution guidance.**

Built on LangChain's [Open Agent Platform](https://github.com/langchain-ai/open-agent-platform). Aryaveer's extensions include conversation/tool presentation, previews and annotations, model controls, run activity and reconnection, approval interfaces, and local-runtime integration. See [NOTICE](NOTICE.md) for the ownership boundary.

## Run locally

Start the [backend quickstart](https://github.com/Veer376/doot-agent#run-it-locally), then use Node.js 22 and pnpm 9.15.4:

```sh
git clone https://github.com/Veer376/doot-agent-web.git
cd doot-agent-web
cp .env.local.example .env.local
corepack pnpm install --frozen-lockfile
corepack pnpm dev --hostname 127.0.0.1
```

Open **http://127.0.0.1:3000**. Ask Doot to inspect the support tickets and save a triage report, review the proposed content, then approve or reject it. Reload the conversation to inspect persisted state. The canonical [demo gallery](https://github.com/Veer376/doot-agent#demos) includes both the original browser/desktop recordings and the current approval/resume verification.

## Connection and configuration

```text
Browser → /api/langgraph → Next.js server proxy → FastAPI → graph/runtime
```

The example environment selects the custom backend with `NEXT_PUBLIC_PLATFORM_MODE=true` and a local demo session with `NEXT_PUBLIC_LOCAL_MODE=true`. `LANGGRAPH_API_URL` is server-side; provider keys belong in the backend environment. Use `127.0.0.1` consistently with the defaults.

The profile exposes conversation and approval controls. Experimental local-workspace/Electron features remain in the source and use a different runtime contract; they are outside the supported quickstart. A separately configured gateway can supply server-only `DOOT_GATEWAY_TOKEN`; this does not turn the local demo identity into multi-user authentication.

## Build and contribute

```sh
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start:local
```

`start:local` binds Next's compiled server to localhost. Rebuild after source changes. CI checks TypeScript and the production build; the historical lint backlog is separate.

Follow the main project's [contribution guide](https://github.com/Veer376/doot-agent/blob/main/CONTRIBUTING.md). Open UI issues/PRs here with reproduction steps, expected/observed behavior, and before/after captures for visible changes. Link a companion backend change when needed. The backend [setup guide](https://github.com/Veer376/doot-agent/blob/main/docs/DEVELOPMENT.md) covers proxy, origin, and port troubleshooting.

The recordings retained under `public/` support existing URLs. New demo documentation and canonical copies are maintained in `doot-agent`.

## License

MIT, preserving Open Agent Platform's original notice and credit. The backend has separate licensing; see its [NOTICE](https://github.com/Veer376/doot-agent/blob/main/NOTICE.md).
