# Monolog + Copilot setup

Instructions for integrating Copilot with [Monolog research logging](https://monolog.work/research.html#researchers):


## Local key setup

Store your Monolog participant key locally instead of committing it to the repo.

- macOS/Linux: `~/.ai-research-api-key`
- Windows: `%USERPROFILE%\.ai-research-api-key`

The file should contain your participant key.

## MCP setup

The repo-local MCP server config is in:

- `.vscode/mcp.json`

It sets:

- `MONOLOG_PROJECT=proj-scaffold`

## Copilot instructions

The file .github/copilot-instructions.md contains instructions for monolog logging.

## Final step

Reload/restart VS Code after setup.