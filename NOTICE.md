# Upstream foundation and Doot changes

This web client is an extension of LangChain's [Open Agent Platform](https://github.com/langchain-ai/open-agent-platform). Its package metadata and Git history retain that origin. Open Agent Platform is MIT-licensed; its original notice is included in LICENSE and LICENSES/open-agent-platform-MIT.txt.

Doot modifications by Aryaveer include conversation and tool rendering, model controls, persisted run reconnection, approval flows, workspace/runtime connections and startup optimizations. The release profile connects this UI to the custom FastAPI backend. The newly added release demonstration is identified separately in the backend README.

The public release uses system fonts. Previously bundled font binaries had no redistribution notice in this repository and were removed from published history. Installed dependencies retain their own licenses.
