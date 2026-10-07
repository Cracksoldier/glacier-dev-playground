# Graph Report - glacier-dev-playground  (2026-10-07)

## Corpus Check
- 255 files · ~119,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1231 nodes · 2377 edges · 83 communities (66 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `836cf0b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useProjectHydration.test.ts
- Milestone 5 - Secure Preview Runtime and Build Coordinator
- useProjectStore
- ResizeObserverStub
- dependencies
- devDependencies
- compilerOptions
- compilerOptions
- biome.json
- Toolbar.tsx
- previewMessage.ts
- ExternalResource
- /graphify Command
- Part B - Semantic extraction (subagents)
- tsWorkerProtocol.ts
- importValidation.ts
- tsCompiler.ts
- CodeMirrorEditor.tsx
- Clone GitHub repo(s)
- Glacier Favicon Snowflake Mark
- tsconfig.json
- Whisper transcription with domain-hint prompt
- verify-base-path.mjs
- FalkorDB export
- MCP stdio server
- Neo4j export
- Token reduction benchmark
- Step 1 - Ensure graphify is installed
- Step 2 - Detect files
- Glacier branding and visual identity
- previewDocument.ts
- editorPreferences.ts
- projectRepository.ts
- ProjectStoreContext.tsx
- PreviewFrame.tsx
- ResetProjectDialog.tsx
- buildCoordinator.ts
- PreviewFrame.test.tsx
- scssWorkerProtocol.ts
- ProjectSwitcherPopover.tsx
- templates.ts
- PreviewPanel.tsx
- project.ts
- previewResourceLoader.ts
- PreviewPanel.consoleWiring.test.tsx
- IndexedDB
- Glacier DEV Playground project overview (CLAUDE.md)
- resources.spec.ts
- Milestone 2 - Domain Model, Project Store, and Templates
- ConfirmDialog.tsx
- Milestone 10 - Import and Export
- PlaygroundProject
- relativeUrlWarning.ts
- standaloneHtmlDocument.ts
- PlaygroundProject data model
- BFS/DFS graph traversal
- CI validate job (check/test/build/verify-base-path)
- useAutosave.ts
- project.ts
- ResourcePresetsSection.tsx
- previewResourceLoader.ts
- architecture.md
- Architecture
- Browser support
- browser-support.md
- performance.spec.ts
- PreviewPanel.consoleWiring.test.tsx
- PlaygroundProject
- Debouncer
- ProjectSwitcherDialog.tsx

## God Nodes (most connected - your core abstractions)
1. `useProjectStore()` - 50 edges
2. `PlaygroundProject` - 33 edges
3. `ExternalResource` - 33 edges
4. `ProjectSource` - 26 edges
5. `ProjectStoreProvider()` - 26 edges
6. `compilerOptions` - 21 edges
7. `compilerOptions` - 18 edges
8. `createInMemoryProjectRepository()` - 15 edges
9. `ProjectRepository` - 14 edges
10. `TsDiagnostic` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Glacier DEV Playground project overview (README.md)` --semantically_similar_to--> `Glacier DEV Playground project overview (CLAUDE.md)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `src/store project store architecture` --conceptually_related_to--> `Milestone 2 - Domain Model, Project Store, and Templates`  [INFERRED]
  CLAUDE.md → specification/glacier-dev-playground-implementation-milestones.md
- `index.html application entry point` --conceptually_related_to--> `src/models domain layer`  [AMBIGUOUS]
  index.html → CLAUDE.md
- `mapRuntimeErrorLine()` --indirect_call--> `panel()`  [INFERRED]
  src/preview/mapErrorToSource.ts → e2e/workspace-layout.spec.ts
- `Native CLAUDE.md integration (graphify claude install)` --conceptually_related_to--> `Project graphify usage rules`  [INFERRED]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **M0-M12 Milestone Dependency Chain** — specification_glacier_dev_playground_implementation_milestones_m0_repository_foundation, specification_glacier_dev_playground_implementation_milestones_m1_design_system_shell, specification_glacier_dev_playground_implementation_milestones_m2_domain_model_project_store, specification_glacier_dev_playground_implementation_milestones_m3_indexeddb_persistence, specification_glacier_dev_playground_implementation_milestones_m4_codemirror_editor, specification_glacier_dev_playground_implementation_milestones_m5_secure_preview_runtime, specification_glacier_dev_playground_implementation_milestones_m6_console_bridge, specification_glacier_dev_playground_implementation_milestones_m7_scss_compilation_worker, specification_glacier_dev_playground_implementation_milestones_m8_typescript_compilation_worker, specification_glacier_dev_playground_implementation_milestones_m9_external_resources, specification_glacier_dev_playground_implementation_milestones_m10_import_export, specification_glacier_dev_playground_implementation_milestones_m11_responsive_accessibility, specification_glacier_dev_playground_implementation_milestones_m12_security_performance_release [EXTRACTED 1.00]
- **Graphify Full-Build Pipeline (Steps 0-9)** — claude_skills_graphify_skill_step0_github_clone, claude_skills_graphify_skill_step1_ensure_installed, claude_skills_graphify_skill_step2_detect_files, claude_skills_graphify_skill_step3_extract, claude_skills_graphify_skill_step4_build_cluster_analyze, claude_skills_graphify_skill_step5_label_communities, claude_skills_graphify_skill_step6_obsidian_html, claude_skills_graphify_skill_step9_manifest_cost_cleanup [EXTRACTED 1.00]
- **GitHub Actions CI/CD Pipeline (PR validation + main deploy)** — github_workflows_ci_validate_job, github_workflows_ci_e2e_job, github_workflows_deploy_build_job, github_workflows_deploy_deploy_job [EXTRACTED 1.00]

## Communities (83 total, 17 thin omitted)

### Community 0 - "useProjectHydration.test.ts"
Cohesion: 0.33
Nodes (3): ProjectExportDocument, serializeProjectForExport(), PlaygroundProject

### Community 1 - "Milestone 5 - Secure Preview Runtime and Build Coordinator"
Cohesion: 0.18
Nodes (12): Candidate-and-promotion preview architecture, Milestone 5 - Secure Preview Runtime and Build Coordinator, Milestone 6 - Console Bridge and Runtime Diagnostics, PreviewMessage protocol (milestones M6), Milestone 7 - SCSS Compilation Worker, Milestone 8 - TypeScript Compilation Worker and Execution Modes, Milestone 9 - External Resources and Trusted Execution, PreviewMessage protocol (specification v2) (+4 more)

### Community 2 - "useProjectStore"
Cohesion: 0.16
Nodes (10): escapeClosingSequence(), buildDocumentSegments(), buildPreviewDocument(), computePreviewLineOffsets(), DocumentSegment, PreviewLineOffsets, PreviewLineRange, resourceDescriptor() (+2 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (45): @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-css, @codemirror/lang-html, @codemirror/lang-javascript, @codemirror/lang-sass, @codemirror/language, @codemirror/lint (+37 more)

### Community 5 - "devDependencies"
Cohesion: 0.04
Nodes (44): @axe-core/playwright, @biomejs/biome, fake-indexeddb, jsdom, devDependencies, @axe-core/playwright, @biomejs/biome, fake-indexeddb (+36 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (26): src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, jsx (+18 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (26): e2e, node, playwright.config.ts, vite.config.ts, vitest.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 8 - "biome.json"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, files, ignoreUnknown, formatter, enabled (+16 more)

### Community 9 - "Toolbar.tsx"
Cohesion: 0.13
Nodes (23): ExportDialog, ImportDialog, ResourceManagerDialog, SAVE_STATUS_LABEL, WORKSPACE_LAYOUT_OPTIONS, AutoRunIcon(), EditorPreferencesIcon(), ExportIcon() (+15 more)

### Community 10 - "previewMessage.ts"
Cohesion: 0.05
Nodes (46): panel(), ConsoleEntriesAction, ConsoleEntriesState, ConsoleEntry, ConsoleEntryInput, createInitialState(), reducer(), useConsoleEntries() (+38 more)

### Community 11 - "ExternalResource"
Cohesion: 0.50
Nodes (3): KeyboardHelpDialog(), KeyboardHelpDialogProps, SHORTCUTS

### Community 12 - "/graphify Command"
Cohesion: 0.18
Nodes (12): Graphify Integration Rule, Project graphify usage rules, /graphify add <url>, --watch background watcher, Native CLAUDE.md integration (graphify claude install), Git post-commit auto-rebuild hook, build_merge() edge-direction preservation, --cluster-only reclustering (+4 more)

### Community 13 - "Part B - Semantic extraction (subagents)"
Cohesion: 0.12
Nodes (17): --wiki export, Node ID format rule, Extraction subagent prompt spec, Honesty Rules, Part A - Structural (AST) extraction, Part B - Semantic extraction (subagents), Part C - Merge AST + semantic, Step 3 - Extract entities and relationships (+9 more)

### Community 14 - "tsWorkerProtocol.ts"
Cohesion: 0.10
Nodes (19): SecretsWarning(), SecretsWarningProps, ActionStatus, ClipboardActionStatus, ExportDialog(), ExportDialogProps, CompileForExportDependencies, CompileForExportResult (+11 more)

### Community 15 - "importValidation.ts"
Cohesion: 0.12
Nodes (21): invalid(), parseImportedProjectJson(), isPlainObject(), PROJECT_MIGRATIONS, ProjectMigrationStep, ProjectRecoveryResult, recoverProjectRecord(), validateProjectRecordShape() (+13 more)

### Community 16 - "tsCompiler.ts"
Cohesion: 0.05
Nodes (38): useTsCompileStatus(), UseTsCompileStatusResult, base64Value(), decodeOutputLineToSourceLine(), decodeVlq(), transpileWithMap(), compileScript(), convertTsDiagnostic() (+30 more)

### Community 17 - "CodeMirrorEditor.tsx"
Cohesion: 0.05
Nodes (37): scssCompileMock, scssDisposeMock, triggerBlobDownloadMock, tsCompileMock, tsDisposeMock, beginBuildMock, buildDocumentMock, compileMock (+29 more)

### Community 18 - "Clone GitHub repo(s)"
Cohesion: 0.67
Nodes (3): Clone GitHub repo(s), Cross-repo / monorepo graph merge, Step 0 - GitHub repos and multi-path merge

### Community 20 - "Glacier Favicon Snowflake Mark"
Cohesion: 0.67
Nodes (3): glacier-favicon-arm (reusable snowflake arm group), glacierFaviconGradient (cyan-to-teal linear gradient), Glacier Favicon Snowflake Mark

### Community 34 - "previewDocument.ts"
Cohesion: 0.17
Nodes (12): Document assembly, External resources, Imported data, Known limitations, Limitations of external resources, Messages from the preview, Secrets, Security model (+4 more)

### Community 35 - "editorPreferences.ts"
Cohesion: 0.16
Nodes (16): ResetProjectDialog(), ResetProjectDialogProps, Step, TemplatePickerProps, nowIso(), buildProject(), createBasicHtmlProject(), createEmptyProject() (+8 more)

### Community 36 - "projectRepository.ts"
Cohesion: 0.19
Nodes (8): source(), buildPreviewBridgeScript(), AnyMock, ConsoleMock, Harness, message(), runBridge(), WindowMock

### Community 39 - "ProjectStoreContext.tsx"
Cohesion: 0.12
Nodes (24): CROSS_ORIGIN_OPTIONS, RESOURCE_TYPE_OPTIONS, ResourceFormProps, ResourceFormValues, FormState, ResourceManagerDialog(), ResourceManagerDialogProps, TYPE_LABEL (+16 more)

### Community 41 - "PreviewFrame.tsx"
Cohesion: 0.05
Nodes (58): EditorPreferencesDialog(), EditorPreferencesDialogProps, FocusableHandle, PreviewOnlyOptions, TAB_FOR_CODE, useEditorFocusShortcuts(), useEditorPreferences(), UseEditorPreferencesResult (+50 more)

### Community 42 - "ResetProjectDialog.tsx"
Cohesion: 0.33
Nodes (6): Copy HTML, Download HTML, Download JSON, Download ZIP, Export and import, Import

### Community 43 - "buildCoordinator.ts"
Cohesion: 0.19
Nodes (6): CompilationId, createCompilationId(), createExecutionId(), ExecutionId, PreviewBuild, PreviewBuildCoordinator

### Community 44 - "PreviewFrame.test.tsx"
Cohesion: 0.20
Nodes (10): ImportedProjectDraft, ProjectSettings, SaveStatus, ProjectStoreActions, ProjectStoreContext, ProjectStoreContextValue, UseAutosaveResult, useBeforeUnloadWarning() (+2 more)

### Community 45 - "scssWorkerProtocol.ts"
Cohesion: 0.25
Nodes (8): 1. Automated gate, 2. Cross-browser journey, 3. Bundle review, 4. Repository hygiene, 5. Documentation, 6. Deploy, Manual verification, Release checklist

### Community 47 - "templates.ts"
Cohesion: 0.12
Nodes (15): LoadResult, ProjectRepository, ProjectSnapshot, ProjectStoreAction, ActiveTitleProbe(), FIRST_RUN, renderStore(), FakeRepository (+7 more)

### Community 48 - "PreviewPanel.tsx"
Cohesion: 0.17
Nodes (11): EXISTING, buildDocument(), buildStandaloneHtmlDocument(), buildZipIndexHtmlDocument(), DocumentOptions, resourceScriptTagSegment(), stylesheetLinkSegment(), buildZipFileEntries() (+3 more)

### Community 49 - "project.ts"
Cohesion: 0.10
Nodes (9): App(), WorkerStub, UnsupportedBrowserNotice(), UnsupportedBrowserNoticeProps, detectUnsupportedBrowser(), REQUIRED_FEATURES, RequiredFeature, WorkerStub (+1 more)

### Community 50 - "previewResourceLoader.ts"
Cohesion: 0.26
Nodes (10): buildPreviewResourceLoaderScript(), descriptorLiteral(), LoaderResourceDescriptor, PreviewResourceLoaderOptions, resourceArrayLiteral(), scriptSafeJson(), AnyMock, Harness (+2 more)

### Community 51 - "PreviewPanel.consoleWiring.test.tsx"
Cohesion: 0.17
Nodes (11): DISABLED_TOOLBAR_ACTION_NAMES, ENABLED_TOOLBAR_ACTION_NAMES, PreviewFrameMockProps, { previewFrameProps }, INITIAL_STATE, ScssCompileStatusState, useScssCompileStatus(), UseScssCompileStatusResult (+3 more)

### Community 53 - "IndexedDB"
Cohesion: 0.40
Nodes (5): IndexedDB, Reading: recovery, not trust, Two independent version numbers, When IndexedDB is unavailable, Writing

### Community 54 - "Glacier DEV Playground project overview (CLAUDE.md)"
Cohesion: 0.33
Nodes (9): Agent operating rules, Conventions and gotchas, Glacier DEV Playground project overview (CLAUDE.md), Glacier DEV Playground project overview (README.md), Coding-agent operating rules (milestones doc), Milestone dependency map (M0-M12), Global definition of done, Non-goals (+1 more)

### Community 56 - "Milestone 2 - Domain Model, Project Store, and Templates"
Cohesion: 0.25
Nodes (8): src/persistence IndexedDB architecture, src/store project store architecture, Milestone 0 - Repository Foundation and Delivery Pipeline, Milestone 1 - Glacier Design System and Application Shell, Milestone 2 - Domain Model, Project Store, and Templates, Milestone 3 - IndexedDB Persistence and Project Management, Milestone 4 - CodeMirror Editor Subsystem, IndexedDB persistence requirements

### Community 57 - "ConfirmDialog.tsx"
Cohesion: 0.12
Nodes (12): RenameOnMount(), Toolbar(), Harness(), StatefulHarness(), AddRelativeImageOnMount(), MakeUntrustedWithScriptResourceOnMount(), NewProjectDialog(), NewProjectDialogProps (+4 more)

### Community 58 - "Milestone 10 - Import and Export"
Cohesion: 0.29
Nodes (7): Milestone 10 - Import and Export, Milestone 11 - Responsive UX and Accessibility Completion, Milestone 12 - Security, Performance, Compatibility, and Release, Version 1 acceptance criteria, Accessibility requirements (WCAG 2.2 AA), GitHub Pages deployment requirements, Import and export requirements

### Community 60 - "PlaygroundProject"
Cohesion: 0.14
Nodes (9): Dialog(), DialogProps, useFocusTrap(), ClipboardFallbackDialogProps, ImportDialog(), ImportDialogProps, ImportMode, Step (+1 more)

### Community 62 - "standaloneHtmlDocument.ts"
Cohesion: 0.22
Nodes (13): UseConsoleEntriesResult, FullWindowIcon(), createPreviewIframe(), PendingCandidate, PreviewFrame(), PreviewRunHandle, PreviewPanel(), PreviewPanelProps (+5 more)

### Community 63 - "PlaygroundProject data model"
Cohesion: 0.40
Nodes (5): src/models domain layer, index.html application entry point, ExternalResource data model, Suggested internal architecture / source structure, PlaygroundProject data model

### Community 64 - "BFS/DFS graph traversal"
Cohesion: 0.40
Nodes (5): BFS/DFS graph traversal, /graphify explain, /graphify path, save-result work-memory feedback loop, Constrained query vocabulary expansion

### Community 67 - "CI validate job (check/test/build/verify-base-path)"
Cohesion: 0.40
Nodes (5): CI e2e job (Playwright), CI validate job (check/test/build/verify-base-path), Deploy build job (check/test/build), Deploy to GitHub Pages job, README deployment instructions

### Community 68 - "useAutosave.ts"
Cohesion: 0.20
Nodes (12): cloneProject(), createInitialProjectStoreState(), createStarterProject(), projectReducer(), ProjectStoreState, regenerateResourceIds(), replaceWithSnapshot(), initialState() (+4 more)

### Community 69 - "project.ts"
Cohesion: 0.07
Nodes (31): AppFooter(), AppShellContent(), ARRANGEMENTS, EDITOR_PANEL_IDS, EDITOR_SIZES, layoutStorageId(), OUTER_PANEL_IDS, TabPanel() (+23 more)

### Community 71 - "previewResourceLoader.ts"
Cohesion: 0.24
Nodes (13): ToolbarProps, toArrangement(), useWorkspaceLayout(), UseWorkspaceLayoutResult, WorkspaceArrangement, DEFAULT_WORKSPACE_LAYOUT_PREFERENCES, isWorkspaceLayout(), isWorkspaceLayoutPreferences() (+5 more)

### Community 73 - "architecture.md"
Cohesion: 0.40
Nodes (5): Main thread ↔ SCSS worker (`src/preview/scssWorkerProtocol.ts`), Main thread ↔ TypeScript worker (`src/preview/tsWorkerProtocol.ts`), Message protocols, Preview → parent (`src/preview/previewMessage.ts`), `SerializedValue`

### Community 74 - "Architecture"
Cohesion: 0.29
Nodes (7): Architecture, Build and preview data flow, Bundle composition, Module map, Routing and hosting, Why the TypeScript worker is fetched for JavaScript projects too, Why there is no `manualChunks` vendor split

### Community 75 - "Browser support"
Cohesion: 0.29
Nodes (7): Browser support, Cross-browser test strategy, Documented, unavoidable differences, Local WebKit limitation, Manual verification, Required capabilities, Supported matrix

### Community 77 - "browser-support.md"
Cohesion: 0.23
Nodes (4): Acceptance criteria evidence, Summary of manual items, localStorage, Storage

### Community 82 - "PreviewPanel.consoleWiring.test.tsx"
Cohesion: 0.17
Nodes (10): ResolvedPreviewBuild, PreviewFrameMockProps, { previewFrameProps }, renderPreviewPanel(), resolvedBuild, resolvedSource, ProjectSource, extractUrls() (+2 more)

### Community 83 - "PlaygroundProject"
Cohesion: 0.21
Nodes (9): createRecoveringRepository(), createRepository(), ProjectId, openDatabase(), createIndexedDbProjectRepository(), createUnavailableProjectRepository(), StorageUnavailableError, GlacierDBSchema (+1 more)

### Community 90 - "ProjectSwitcherDialog.tsx"
Cohesion: 0.24
Nodes (6): PersistenceNotice(), ConfirmDialog(), ConfirmDialogProps, ProjectSwitcherDialog(), ProjectSwitcherDialogProps, RenameRowProps

## Ambiguous Edges - Review These
- `src/models domain layer` → `index.html application entry point`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **299 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `ignoreUnknown` (+294 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `src/models domain layer` and `index.html application entry point`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useProjectStore()` connect `ConfirmDialog.tsx` to `editorPreferences.ts`, `project.ts`, `ProjectStoreContext.tsx`, `Toolbar.tsx`, `previewMessage.ts`, `PreviewFrame.tsx`, `PreviewFrame.test.tsx`, `templates.ts`, `ProjectSwitcherDialog.tsx`, `PlaygroundProject`, `standaloneHtmlDocument.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `ExternalResource` connect `PreviewPanel.tsx` to `useProjectHydration.test.ts`, `useProjectStore`, `useAutosave.ts`, `ProjectStoreContext.tsx`, `buildCoordinator.ts`, `PreviewFrame.test.tsx`, `importValidation.ts`, `CodeMirrorEditor.tsx`, `PreviewPanel.consoleWiring.test.tsx`, `previewResourceLoader.ts`, `standaloneHtmlDocument.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `PlaygroundProject` connect `useProjectHydration.test.ts` to `editorPreferences.ts`, `useAutosave.ts`, `buildCoordinator.ts`, `PreviewFrame.test.tsx`, `tsWorkerProtocol.ts`, `importValidation.ts`, `PreviewPanel.tsx`, `CodeMirrorEditor.tsx`, `templates.ts`, `PreviewPanel.consoleWiring.test.tsx`, `PlaygroundProject`, `ProjectSwitcherDialog.tsx`, `standaloneHtmlDocument.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ProjectStoreProvider()` (e.g. with `createInitialProjectStoreState()` and `projectReducer()`) actually correct?**
  _`ProjectStoreProvider()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _299 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._