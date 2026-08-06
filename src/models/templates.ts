import {
  type ExecutionMode,
  nowIso,
  type PlaygroundProject,
  PROJECT_SCHEMA_VERSION,
  type ProjectSettings,
  type ProjectSource,
  type ScriptLanguage,
  type StylesheetLanguage,
} from "./project";

export type TemplateId =
  | "empty"
  | "basic-html"
  | "scss-example"
  | "js-interaction"
  | "typescript-example";

export interface ProjectTemplate {
  id: TemplateId;
  label: string;
  create: () => PlaygroundProject;
}

/** Used both for the app's initial bootstrap project and as the fallback when the last project is deleted. */
export const DEFAULT_STARTER_TEMPLATE_ID: TemplateId = "basic-html";

function defaultSettings(): ProjectSettings {
  return {
    autoRun: true,
    previewDebounceMs: 400,
    preserveConsole: false,
  };
}

interface BuildProjectInput {
  title: string;
  html?: string;
  stylesheet?: string;
  stylesheetLanguage?: StylesheetLanguage;
  script?: string;
  scriptLanguage?: ScriptLanguage;
  executionMode?: ExecutionMode;
  headContent?: string;
}

function buildProject(input: BuildProjectInput): PlaygroundProject {
  const timestamp = nowIso();
  const source: ProjectSource = {
    html: input.html ?? "",
    stylesheet: input.stylesheet ?? "",
    stylesheetLanguage: input.stylesheetLanguage ?? "css",
    script: input.script ?? "",
    scriptLanguage: input.scriptLanguage ?? "javascript",
    executionMode: input.executionMode ?? "classic",
    headContent: input.headContent ?? "",
  };

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title: input.title,
    createdAt: timestamp,
    updatedAt: timestamp,
    source,
    resources: [],
    settings: defaultSettings(),
  };
}

function createEmptyProject(): PlaygroundProject {
  return buildProject({ title: "Empty Project" });
}

function createBasicHtmlProject(): PlaygroundProject {
  return buildProject({
    title: "Basic HTML Example",
    html: "<main>\n  <h1>Hello, Glacier</h1>\n  <p>Edit the HTML, CSS, and JavaScript panels to get started.</p>\n</main>",
    stylesheet:
      "body {\n  font-family: sans-serif;\n  margin: 2rem;\n}\n\nh1 {\n  color: #4fd8f2;\n}",
    stylesheetLanguage: "css",
    scriptLanguage: "javascript",
    executionMode: "classic",
  });
}

function createScssExampleProject(): PlaygroundProject {
  return buildProject({
    title: "SCSS Example",
    html: '<main class="card">\n  <h1>SCSS Example</h1>\n  <p>Nesting and variables, compiled in your browser.</p>\n</main>',
    stylesheet:
      "$accent: #9b8cf2;\n\n.card {\n  font-family: sans-serif;\n  margin: 2rem;\n\n  h1 {\n    color: $accent;\n  }\n}",
    stylesheetLanguage: "scss",
    scriptLanguage: "javascript",
    executionMode: "classic",
  });
}

function createJavaScriptInteractionProject(): PlaygroundProject {
  return buildProject({
    title: "JavaScript Interaction Example",
    html: '<button id="counter" type="button">Clicked 0 times</button>',
    stylesheet:
      "button {\n  font-family: sans-serif;\n  font-size: 1rem;\n  padding: 0.5rem 1rem;\n}",
    stylesheetLanguage: "css",
    script:
      'let count = 0;\nconst button = document.getElementById("counter");\n\nbutton.addEventListener("click", () => {\n  count += 1;\n  button.textContent = `Clicked \\u0024{count} times`;\n});',
    scriptLanguage: "javascript",
    executionMode: "classic",
  });
}

function createTypeScriptExampleProject(): PlaygroundProject {
  return buildProject({
    title: "TypeScript Example",
    html: '<p id="greeting"></p>',
    stylesheet: "body {\n  font-family: sans-serif;\n  margin: 2rem;\n}",
    stylesheetLanguage: "css",
    script:
      'interface Greeting {\n  name: string;\n}\n\nfunction formatGreeting({ name }: Greeting): string {\n  return `Hello, \\u0024{name}!`;\n}\n\nconst greeting = document.getElementById("greeting");\nif (greeting) {\n  greeting.textContent = formatGreeting({ name: "Glacier" });\n}',
    scriptLanguage: "typescript",
    executionMode: "classic",
  });
}

export const PROJECT_TEMPLATES: Record<TemplateId, ProjectTemplate> = {
  empty: {
    id: "empty",
    label: "Empty Project",
    create: createEmptyProject,
  },
  "basic-html": {
    id: "basic-html",
    label: "Basic HTML Example",
    create: createBasicHtmlProject,
  },
  "scss-example": {
    id: "scss-example",
    label: "SCSS Example",
    create: createScssExampleProject,
  },
  "js-interaction": {
    id: "js-interaction",
    label: "JavaScript Interaction Example",
    create: createJavaScriptInteractionProject,
  },
  "typescript-example": {
    id: "typescript-example",
    label: "TypeScript Example",
    create: createTypeScriptExampleProject,
  },
};
