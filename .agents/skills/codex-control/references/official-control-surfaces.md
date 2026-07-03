# Official Codex Control Surfaces

This reference summarizes official Codex manual guidance fetched on 2026-06-18 from `https://developers.openai.com/codex/codex-manual.md`. Refresh the manual before relying on version-sensitive details.

## Source Map

- Config basics: `/codex/config-basic`
- Advanced config: `/codex/config-advanced`
- Configuration reference: `/codex/config-reference`
- Agent approvals and security: `/codex/agent-approvals-security`
- Sandbox: `/codex/concepts/sandboxing`
- Permissions: `/codex/permissions`
- Managed configuration: `/codex/enterprise/managed-configuration`
- Agent skills: `/codex/skills`
- AGENTS.md: `/codex/guides/agents-md`
- MCP: `/codex/mcp`
- Hooks: `/codex/hooks`
- Rules: `/codex/rules`
- Plugins: `/codex/plugins`

## Configuration Layers

Codex reads user config from `~/.codex/config.toml` unless `CODEX_HOME` changes that base. Project overrides live in `.codex/config.toml` inside trusted projects. Precedence is: CLI flags and `--config`, project config from root to current directory with closest winning, selected profile file, user config, system config, built-in defaults.

Profile files are separate top-level TOML files named `~/.codex/<profile-name>.config.toml` and selected with `--profile <profile-name>`. Do not use legacy `[profiles.<name>]` tables or a top-level `profile` selector for current clients.

Project `.codex/config.toml` layers load only when the project is trusted. Relative paths inside a project config resolve relative to the containing `.codex/` folder. Project config cannot override provider/auth redirection, host-owned app metadata, profile selection, notification, provider, or telemetry settings such as `openai_base_url`, `model_provider`, `model_providers`, `notify`, `profile`, `profiles`, and `otel`.

Use `--config key=value` for one-off overrides. Values are parsed as TOML, and dot notation can set nested keys such as `sandbox_workspace_write.network_access=true`.

## Permissions, Sandbox, and Approvals

Sandboxing defines the technical boundary for spawned commands. Approval policy controls when Codex pauses to ask before crossing a boundary. Network access is separate from filesystem write access.

Conservative local defaults are workspace-limited editing with interactive approvals, commonly `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"`. Use `danger-full-access` and `approval_policy = "never"` only when the environment already isolates processes and the user intentionally wants broad autonomy.

For newer reusable access models, prefer permission profiles when available. Built-ins include `:read-only`, `:workspace`, and `:danger-full-access`; custom profiles use `[permissions.<name>]` tables plus `default_permissions`. Filesystem permissions are `read`, `write`, and `deny`, with more specific entries overriding broader ones and `deny` taking precedence. Use deny rules for secrets such as `.env` files. Enable network per profile and add domain rules for ordinary workflows.

`approvals_reviewer = "auto_review"` changes who reviews eligible approval prompts; it does not change the sandbox boundary.

## Managed Configuration

Admins can enforce `requirements.toml` constraints or managed cloud requirements. Requirements can constrain approval policies, approval reviewers, automatic review policy, sandbox modes, permission profiles, web search, managed hooks, feature pins, and optionally MCP servers. If local config conflicts with an enforced rule, Codex falls back to a compatible value and notifies the user.

Managed requirements precedence starts with cloud-managed requirements, then macOS MDM managed preferences, then system `requirements.toml`. Earlier sources win for the same setting. For Codex 0.138.0 or later, prefer `allowed_permission_profiles` and `default_permissions`; use `allowed_sandbox_modes` mainly for legacy deployments.

Do not try to bypass managed requirements in user or project config. Adjust local config to match the allowed set.

## AGENTS.md

Codex reads instruction files once per launched run or TUI session. Global guidance comes from `CODEX_HOME` or `~/.codex`, using `AGENTS.override.md` when present, otherwise `AGENTS.md`.

For projects, Codex walks from the project root to the current working directory and includes at most one instruction file per directory, checking `AGENTS.override.md`, then `AGENTS.md`, then configured fallback filenames. Later, closer files override earlier guidance. Codex skips empty files and stops when the combined instruction size reaches `project_doc_max_bytes`.

Use `AGENTS.md` for durable working agreements, repo commands, review expectations, and local conventions. Use nested files for subdirectory-specific rules. Restart Codex or start a new command/session after changing instruction discovery behavior.

## Skills and Plugins

Skills are directories containing `SKILL.md` with required `name` and `description` frontmatter plus optional `scripts/`, `references/`, `assets/`, and `agents/openai.yaml`. The description is the implicit trigger surface, so front-load the task scope and file types.

Official discovery locations include repo `.agents/skills` from the working directory up to the repo root, user `$HOME/.agents/skills`, admin `/etc/codex/skills`, and system bundled skills. Some environments also expose skills from `~/.codex/skills`; verify current-session behavior before depending on that non-primary path.

Use `[[skills.config]]` in `~/.codex/config.toml` to disable a skill by path without deleting it. Restart Codex after config changes if the skill state does not update.

Use plugins when the deliverable should be installable or bundle multiple skills, MCP servers, app mappings, hooks, or presentation assets.

## MCP

MCP connects Codex to tools and context. Configure MCP servers in `config.toml`, either user-level or project-scoped for trusted projects. The CLI and IDE extension share this configuration.

Use `codex mcp` for common add/list/login flows, or edit `[mcp_servers.<name>]` tables directly. STDIO servers use `command`, optional `args`, `env`, `env_vars`, and `cwd`. Streamable HTTP servers use `url`, optional bearer-token env vars, static headers, and env-backed headers. Server-level and per-tool approval modes can be configured with `default_tools_approval_mode` and `[mcp_servers.<name>.tools.<tool>]`.

Use connectors or MCP for authorized private data and actions instead of web search or model memory.

## Hooks

Hooks inject command handlers into Codex lifecycle events. They can live in `hooks.json` or inline `[hooks]` tables beside active config layers. User hooks load independently; project-local hooks load only when the project `.codex/` layer is trusted.

Hooks are enabled by default with `[features].hooks = true`. Set `[features].hooks = false` in config or managed requirements to disable them.

Multiple matching hooks run; hook sources are not replaced by higher-precedence config layers. Non-managed command hooks must be reviewed and trusted before they run. Use `/hooks` to inspect, trust, or disable them. Prefer git-root-based paths in repo hooks because Codex may start from a subdirectory.

Common events include `SessionStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, and `Stop`.

## Rules

Rules control which commands Codex can run outside the sandbox. Place `.rules` files under a `rules/` directory next to an active config layer, such as `~/.codex/rules/default.rules` or project `.codex/rules/*.rules` in trusted projects. Restart Codex after adding or changing rules.

Use `prefix_rule(pattern=[...], decision="allow"|"prompt"|"forbidden", justification="...")`. More restrictive matching decisions win: `forbidden`, then `prompt`, then `allow`. Add `match` and `not_match` examples as inline tests.

For shell wrappers such as `bash -lc`, Codex splits simple linear command chains into individual commands before applying rules. If advanced shell features such as redirects, substitutions, variables, wildcards, or control flow appear, Codex treats the whole shell invocation conservatively.

Test rules with `codex execpolicy check --pretty --rules <file> -- <command...>`.
