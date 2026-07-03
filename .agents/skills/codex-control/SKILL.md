---
name: codex-control
description: >-
  Use when Codex needs to configure or govern Codex itself: choosing between prompt context, AGENTS.md, config.toml, requirements.toml, rules, hooks, MCP servers, skills, plugins, automations, permission profiles, sandbox settings, approval policies, managed configuration, or skill enablement. Use for auditing or editing Codex control files such as ~/.codex/config.toml, .codex/config.toml, AGENTS.md, AGENTS.override.md, .agents/skills/**/SKILL.md, agents/openai.yaml, hooks.json, rules/*.rules, and requirements.toml. Prefer official Codex documentation before changing version-sensitive keys.
---

# Codex Control

## Overview

Use this skill to make Codex behavior changes deliberately. Start by choosing the smallest durable control surface, then verify the current official Codex behavior before editing configuration or instruction files.

Read `references/official-control-surfaces.md` when changing or auditing any Codex control file, when the requested setting is version-sensitive, or when deciding between multiple Codex surfaces.

## Source Discipline

Use official Codex sources for product behavior. For broad Codex behavior, run the OpenAI docs skill's Codex manual helper when available, then inspect the relevant manual section. If that route is unavailable, use official OpenAI docs only. Do not rely on memory for current config keys, paths, feature flags, sandbox semantics, managed policy behavior, or product surface availability.

If official documentation and verified current-session behavior differ, state the difference and prefer verified current-session behavior only for this environment. Keep the official behavior visible so the user can decide whether to align with it.

## Control Surface Decision

Choose the narrowest surface that matches the requested persistence and scope:

- One-off prompt or thread context: use for temporary task constraints.
- `AGENTS.md` or `AGENTS.override.md`: use for durable natural-language guidance in a repo, subdirectory, or global Codex home.
- `config.toml`: use for durable local settings such as model defaults, reasoning, permissions, sandbox, approvals, MCP, hooks, feature flags, profiles, logs, and environment policy.
- `requirements.toml`: use for admin-enforced constraints that users should not override.
- Permission profile: use for reusable filesystem and network policies.
- Rules file: use for command-prefix allow, prompt, or forbid behavior outside the sandbox.
- Hook: use for lifecycle enforcement, checks, logging, policy scripts, or turn/session events.
- Skill: use for reusable task workflow instructions, references, and optional scripts.
- Plugin: use to distribute one or more skills with optional MCP/app/hook assets.
- MCP server or app connector: use for external tools, private/workspace data, or authorized actions.
- Automation: use for scheduled, monitor, or background follow-up work.

Do not put the same behavior in multiple surfaces unless one is a policy constraint and the other is a default. Prefer `AGENTS.md` for how to work, `config.toml` for how Codex is configured, and `requirements.toml` for what must be enforced.

## Workflow

1. Classify the request by scope: current turn, repo, subdirectory, user, machine/admin, plugin distribution, or external data/action.
2. Inspect existing files before editing. Use `rg --files` and targeted reads for `AGENTS.md`, `.codex/`, `.agents/skills/`, hooks, rules, and relevant user/system config paths when accessible.
3. Check the official source for the exact surface and key. Load `references/official-control-surfaces.md`; refresh from the official Codex manual when the behavior may have changed.
4. Pick one primary control surface and explain why it is the smallest fit.
5. Edit only the relevant file. Preserve unrelated user changes and avoid broad rewrites of config files.
6. Validate syntax and behavior where practical. Parse TOML/YAML/JSON with available tooling, test rules with `codex execpolicy check` when relevant, and note whether a restart or new Codex session is required.
7. Report the changed files, verification performed, and any remaining operational step such as trusting a project, reviewing hooks with `/hooks`, restarting Codex, or launching from the target directory.

## Safety Defaults

Keep permissions least-privilege by default. Prefer workspace-limited editing with interactive approvals over full access. Treat network access, shell environment forwarding, auth/provider keys, hooks, MCP tools, and app connectors as security-sensitive.

Avoid changing provider/auth, telemetry, or notification settings from project config; official Codex docs reserve those for user-level configuration. Do not weaken managed requirements. If Codex falls back because an admin requirement conflicts with local config, update the local config to a compatible value instead of trying to bypass the requirement.
