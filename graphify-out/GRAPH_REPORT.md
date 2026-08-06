# Graph Report - .  (2026-08-06)

## Corpus Check
- Corpus is ~41,685 words - fits in a single context window. You may not need a graph.

## Summary
- 486 nodes · 794 edges · 34 communities (24 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.82)
- Token cost: 0 input · 43,982 output

## Community Hubs (Navigation)
- Project Domain Model & Store
- Project Docs & Milestone Specs
- Project Management UI & Dialogs
- IndexedDB Persistence Layer
- Runtime Dependencies (package.json)
- Dev Dependencies & Tooling
- TypeScript App Config
- TypeScript Node Config
- Biome Lint/Format Config
- Toolbar & Icon Components
- App Shell & Layout
- Autosave & Save Status
- Graphify Skill Commands
- Graphify Extraction Pipeline
- UI Preferences & Console Panel
- Project Schema Migrations
- External Resource Model
- ID Generation
- Graphify GitHub Clone & Merge
- Glacier Favicon Mark
- Root TS Config
- Graphify Video/Audio Transcription
- Base Path Verification Script
- Graphify FalkorDB Export
- Graphify MCP Server
- Graphify Neo4j Export
- Graphify Token Benchmark
- Graphify Install Step
- Graphify Detect Step
- Glacier Brand Identity

## God Nodes (most connected - your core abstractions)
1. `useProjectStore()` - 21 edges
2. `compilerOptions` - 21 edges
3. `PlaygroundProject` - 18 edges
4. `compilerOptions` - 18 edges
5. `ProjectStoreProvider()` - 17 edges
6. `ProjectId` - 12 edges
7. `ProjectRepository` - 12 edges
8. `scripts` - 10 edges
9. `TemplateId` - 9 edges
10. `projectReducer()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Glacier DEV Playground project overview (README.md)` --semantically_similar_to--> `Glacier DEV Playground project overview (CLAUDE.md)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `src/store project store architecture` --conceptually_related_to--> `Milestone 2 - Domain Model, Project Store, and Templates`  [INFERRED]
  CLAUDE.md → specification/glacier-dev-playground-implementation-milestones.md
- `index.html application entry point` --conceptually_related_to--> `src/models domain layer`  [AMBIGUOUS]
  index.html → CLAUDE.md
- `Native CLAUDE.md integration (graphify claude install)` --conceptually_related_to--> `Project graphify usage rules`  [INFERRED]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md
- `Agent operating rules` --conceptually_related_to--> `Coding-agent operating rules (milestones doc)`  [INFERRED]
  CLAUDE.md → specification/glacier-dev-playground-implementation-milestones.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **M0-M12 Milestone Dependency Chain** — specification_glacier_dev_playground_implementation_milestones_m0_repository_foundation, specification_glacier_dev_playground_implementation_milestones_m1_design_system_shell, specification_glacier_dev_playground_implementation_milestones_m2_domain_model_project_store, specification_glacier_dev_playground_implementation_milestones_m3_indexeddb_persistence, specification_glacier_dev_playground_implementation_milestones_m4_codemirror_editor, specification_glacier_dev_playground_implementation_milestones_m5_secure_preview_runtime, specification_glacier_dev_playground_implementation_milestones_m6_console_bridge, specification_glacier_dev_playground_implementation_milestones_m7_scss_compilation_worker, specification_glacier_dev_playground_implementation_milestones_m8_typescript_compilation_worker, specification_glacier_dev_playground_implementation_milestones_m9_external_resources, specification_glacier_dev_playground_implementation_milestones_m10_import_export, specification_glacier_dev_playground_implementation_milestones_m11_responsive_accessibility, specification_glacier_dev_playground_implementation_milestones_m12_security_performance_release [EXTRACTED 1.00]
- **Graphify Full-Build Pipeline (Steps 0-9)** — claude_skills_graphify_skill_step0_github_clone, claude_skills_graphify_skill_step1_ensure_installed, claude_skills_graphify_skill_step2_detect_files, claude_skills_graphify_skill_step3_extract, claude_skills_graphify_skill_step4_build_cluster_analyze, claude_skills_graphify_skill_step5_label_communities, claude_skills_graphify_skill_step6_obsidian_html, claude_skills_graphify_skill_step9_manifest_cost_cleanup [EXTRACTED 1.00]
- **GitHub Actions CI/CD Pipeline (PR validation + main deploy)** — github_workflows_ci_validate_job, github_workflows_ci_e2e_job, github_workflows_deploy_build_job, github_workflows_deploy_deploy_job [EXTRACTED 1.00]

## Communities (34 total, 10 thin omitted)

### Community 0 - "Project Domain Model & Store"
Cohesion: 0.07
Nodes (45): Popover(), PopoverProps, ProjectSwitcherPopoverProps, RenameRowProps, ExecutionMode, nowIso(), PlaygroundProject, PROJECT_SCHEMA_VERSION (+37 more)

### Community 1 - "Project Docs & Milestone Specs"
Cohesion: 0.05
Nodes (46): Agent operating rules, src/models domain layer, src/persistence IndexedDB architecture, src/store project store architecture, Conventions and gotchas, Glacier DEV Playground project overview (CLAUDE.md), CI e2e job (Playwright), CI validate job (check/test/build/verify-base-path) (+38 more)

### Community 2 - "Project Management UI & Dialogs"
Cohesion: 0.09
Nodes (21): PersistenceNotice(), RenameOnMount(), Toolbar(), ConfirmDialog(), ConfirmDialogProps, Dialog(), DialogProps, NewProjectDialog() (+13 more)

### Community 3 - "IndexedDB Persistence Layer"
Cohesion: 0.10
Nodes (20): openDatabase(), createIndexedDbProjectRepository(), createUnavailableProjectRepository(), LoadResult, ProjectRepository, ProjectSnapshot, StorageUnavailableError, DATABASE_NAME (+12 more)

### Community 4 - "Runtime Dependencies (package.json)"
Cohesion: 0.06
Nodes (30): @fontsource/chakra-petch, @fontsource/ibm-plex-sans, @fontsource/jetbrains-mono, idb, dependencies, @fontsource/chakra-petch, @fontsource/ibm-plex-sans, @fontsource/jetbrains-mono (+22 more)

### Community 5 - "Dev Dependencies & Tooling"
Cohesion: 0.07
Nodes (29): @biomejs/biome, fake-indexeddb, jsdom, devDependencies, @biomejs/biome, fake-indexeddb, jsdom, @playwright/test (+21 more)

### Community 6 - "TypeScript App Config"
Cohesion: 0.07
Nodes (26): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames (+18 more)

### Community 7 - "TypeScript Node Config"
Cohesion: 0.08
Nodes (25): e2e, node, playwright.config.ts, vite.config.ts, vitest.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly (+17 more)

### Community 8 - "Biome Lint/Format Config"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, files, ignoreUnknown, formatter, enabled (+16 more)

### Community 9 - "Toolbar & Icon Components"
Cohesion: 0.16
Nodes (18): MIDDLE_DISABLED_ACTIONS, SAVE_STATUS_LABEL, ToolbarAction, GlacierMark(), GlacierMarkProps, AutoRunIcon(), ExportIcon(), IconBaseProps (+10 more)

### Community 10 - "App Shell & Layout"
Cohesion: 0.13
Nodes (13): App(), AppShell(), DISABLED_TOOLBAR_ACTION_NAMES, ENABLED_TOOLBAR_ACTION_NAMES, WORKSPACE_PANEL_IDS, ResizeHandle(), ResizeHandleProps, EditorLanguage (+5 more)

### Community 11 - "Autosave & Save Status"
Cohesion: 0.17
Nodes (7): SaveStatus, createDebouncer(), Debouncer, useHarness(), useAutosave(), UseAutosaveResult, useBeforeUnloadWarning()

### Community 12 - "Graphify Skill Commands"
Cohesion: 0.12
Nodes (17): Graphify Integration Rule, Project graphify usage rules, /graphify add <url>, --watch background watcher, Native CLAUDE.md integration (graphify claude install), Git post-commit auto-rebuild hook, BFS/DFS graph traversal, /graphify explain (+9 more)

### Community 13 - "Graphify Extraction Pipeline"
Cohesion: 0.12
Nodes (17): --wiki export, Node ID format rule, Extraction subagent prompt spec, Honesty Rules, Part A - Structural (AST) extraction, Part B - Semantic extraction (subagents), Part C - Merge AST + semantic, Step 3 - Extract entities and relationships (+9 more)

### Community 14 - "UI Preferences & Console Panel"
Cohesion: 0.29
Nodes (9): useConsoleVisibility(), UseConsoleVisibilityResult, ChevronIcon(), ConsolePanel(), DEFAULT_SHELL_PREFERENCES, isShellPreferences(), loadShellPreferences(), saveShellPreferences() (+1 more)

### Community 15 - "Project Schema Migrations"
Cohesion: 0.36
Nodes (6): hasValidShape(), isPlainObject(), PROJECT_MIGRATIONS, ProjectMigrationStep, ProjectRecoveryResult, recoverProjectRecord()

### Community 16 - "External Resource Model"
Cohesion: 0.32
Nodes (5): ExternalResource, ExternalResourceType, ResourceCrossOrigin, ResourceId, sortResourcesByOrder()

### Community 17 - "ID Generation"
Cohesion: 0.47
Nodes (4): CompilationId, createCompilationId(), createExecutionId(), ExecutionId

### Community 18 - "Graphify GitHub Clone & Merge"
Cohesion: 0.67
Nodes (3): Clone GitHub repo(s), Cross-repo / monorepo graph merge, Step 0 - GitHub repos and multi-path merge

### Community 20 - "Glacier Favicon Mark"
Cohesion: 0.67
Nodes (3): glacier-favicon-arm (reusable snowflake arm group), glacierFaviconGradient (cyan-to-teal linear gradient), Glacier Favicon Snowflake Mark

## Ambiguous Edges - Review These
- `src/models domain layer` → `index.html application entry point`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **157 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `ignoreUnknown` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `src/models domain layer` and `index.html application entry point`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `PlaygroundProject` connect `Project Domain Model & Store` to `External Resource Model`, `IndexedDB Persistence Layer`, `Project Schema Migrations`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies & Tooling` to `Runtime Dependencies (package.json)`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useProjectStore()` connect `Project Management UI & Dialogs` to `Project Domain Model & Store`, `Toolbar & Icon Components`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ProjectStoreProvider()` (e.g. with `createInitialProjectStoreState()` and `projectReducer()`) actually correct?**
  _`ProjectStoreProvider()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Domain Model & Store` be split into smaller, more focused modules?**
  _Cohesion score 0.0744047619047619 - nodes in this community are weakly interconnected._