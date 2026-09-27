# Updating Versions of Java and/or Node

## Updating the Java version

When updating the version of Java used, the following places need to be adjusted:

- `Versions` section of the README.md
- `pom.xml` file (the `java.version` property)
- `Dockerfile` used for deploying on Dokku (the `openjdk-NN-jdk` apt package and `JAVA_HOME`)

In addition, any Maven plugin that **reads compiled `.class` files** must support the
new Java class-file format, or it fails at run time even though the code compiles.
Check these versions in `pom.xml` and bump them if needed:

- `jacoco-maven-plugin` (test coverage)
- `pitest-maven` and `pitest-junit5-plugin` (mutation testing)
- `git-code-format-maven-plugin` and the `google-java-format` it bundles (formatting)

When the Spring Boot version changes, also check libraries tied to the Boot line,
such as `springdoc-openapi-starter-webmvc-ui`.

## Updating the Node version

When updating the version of Node used, the following places need to be adjusted:

- `Versions` section of the README.md
- `engines` section in `frontend/package.json` — this is what CI actually reads: the
  shared workflows in `ucsb-cs156/workflows` (frontend coverage, lint, and PR mutation
  testing) all use `actions/setup-node` with `node-version-file: frontend/package.json`,
  so no per-repo workflow edit is needed.
- `frontend/.nvmrc`
- `Dockerfile` used for deploying on Dokku (`NODE_VERSION`)
- `pom.xml`, in the `app.frontend.nodeVersion` property (read by `frontend-maven-plugin`
  in both the `integration` and `production` profiles)

`grep -rIn "<old-version>" --exclude-dir=node_modules --exclude-dir=target .` from the
repo root is a good way to catch anything missed above.

### Updating frontend dependencies at the same time

A Node bump is a good time to also bring `frontend/package.json` dependencies up to the
latest versions compatible with the new Node version, so deprecation and audit warnings
stay minimal. Notes from doing this for the v22 → v24.21.0 LTS bump (2026-09), most of
which came from the same upgrade already done in `ucsb-cs156/proj-courses`
(issue #355 / PR #356) and `ucsb-cs156/proj-citelines` issue #142:

- **react-router 7 adds `data-discover="true"` to `<Link>` anchors.** If the repo has
  react-router `<Link>` snapshot tests, they'll need `-u` to update. (citelines had none.)
- **Storybook 9 → 10 + `msw-storybook-addon` 2 → 3**: `msw-storybook-addon` 3 removed
  `initialize()` and the root `mswLoader` export. In `.storybook/preview.jsx`, use
  `import { mswLoader } from "msw-storybook-addon/csf3"` and `loaders: [mswLoader()]`;
  drop the `initialize()` call. Make sure `"msw-storybook-addon"` is listed in `addons`
  in `.storybook/main.js`. **Always verify with `npm run build-storybook`** — unit tests
  don't catch this.
- **Vite 7 → 8 (Rolldown)**: a CJS `vite.config.js` fails to load if the repo uses
  `rollup-plugin-visualizer` (ESM-only in its current major) — rename to `vite.config.mjs`
  and update every reference (`stryker.config.mjs`'s `vitest.configFile`, and any
  up-to-date check in `pom.xml`). A `vite.config.ts` file is unaffected by this specific
  trap. Use `import.meta.dirname` instead of `__dirname`, and `rolldownOptions` instead of
  `rollupOptions`, if present.
- **`@vitejs/plugin-react` must move to its 6.x line together with Vite 8** — its
  `peerDependencies` require `vite: ^8.0.0`.
- **Vitest must stay on the 4.x line if the repo uses Stryker for mutation testing.**
  With Vitest 5 (paired with Stryker 10's `@stryker-mutator/vitest-runner`), Stryker's dry
  run maps no tests to mutants, so *every* mutant silently survives. Vitest 4.1.x's own
  `peerDependencies` already allow Vite 8, so there's no need to take Vitest 5 just to get
  Vite 8. Fast local check after any Stryker/Vitest bump:
  `npx stryker run --mutate <any small src/main file>` should report at least 1 killed
  mutant, not 0 covered.
- **ESLint 10**: only a blocker if the repo depends on `eslint-plugin-react` directly —
  that plugin's 7.37.5 crashes on ESLint 10 (`context.getFilename is not a function`).
  If the repo only uses `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` +
  `typescript-eslint` (no `eslint-plugin-react`), check their current `peerDependencies`
  first: as of `eslint-plugin-react-hooks@7.1.1`, ESLint 10 is supported.
- **`eslint-plugin-react-hooks` 7's flat config** is `configs.flat.recommended` (not
  `configs["recommended-latest"]`). It also carries React-Compiler-derived rules
  (`set-state-in-effect`, `incompatible-library`) that may flag existing code; disable
  them (with a comment explaining why) if a refactor isn't worth it — or leave them on if
  `npm run lint` comes back clean.
- **`@testing-library/jest-dom` 6+/7+** has no `extend-expect` entrypoint; remove those
  imports if present.
- **`@testing-library/user-event` 14 is async**: `await` every call, and make sure the
  enclosing `test(...)` callback is `async`. Watch for tests asserting transient state
  right after a click — a mock's `resetHistory()` needs to run *before* the click, and a
  "Loading…" assertion may need a delayed mock response.
- **`npm install-scripts` (npm 11+)**: dependency install/postinstall scripts are blocked
  by default; you'll see `npm warn install-scripts ... not yet covered by allowScripts`.
  After confirming the packages listed are expected (native build tools like
  `esbuild`/`fsevents`, or `msw`'s worker-file generator), run
  `npm install-scripts approve --all` inside `frontend/` and commit the resulting
  `allowScripts` block in `package.json`.
- **Bumping `msw` regenerates `frontend/public/mockServiceWorker.js`** via its postinstall
  script — commit that change along with the dependency bump.
- **Local `mvn` gotcha**: after bumping the Node version, a local `mvn` build can fail
  inside `npm ci` with `Class extends value undefined is not a constructor or null` — this
  is stale npm left in `target/node` from the previous Node version
  (`frontend-maven-plugin`'s install dir). `rm -rf target/node target/node_modules` fixes
  it. CI is unaffected since it always starts clean.
- **Verification recipe**: `npm ci`, `npm audit`, `npm outdated`, `npm run lint`,
  `npm run check-format`, `npm test` (repeat 2-3× to catch flakiness), `npm run build`,
  `npm run build-storybook` (if Storybook is present), and Stryker on a couple of changed
  files reproducing the CI mutation-testing command exactly (see
  `33-frontend-pr-mutation-testing.yml` in `ucsb-cs156/workflows`) — a green `npm test`
  does *not* guarantee the CI mutation job will pass: Stryker runs the suite in many
  parallel instrumented workers, so timing-sensitive tests that are fine in `npm test`
  can fail there (see the `ucsb-cs156/proj-courses` #355 issue thread for a case where
  `recharts` 3's bar-chart animation caused exactly this).
- **Deliberately-deferred majors are a valid outcome.** Not every "latest" needs taking in
  the same PR — a major that's brand new, changes toolchain internals (e.g. TypeScript 7's
  Go-native compiler), or touches a widely-used component (e.g. a routing or table
  library) with no security or Node-compatibility driver forcing the jump is reasonable to
  defer. Document what was deferred and why, here or in the PR description, so the next
  upgrade pass doesn't have to re-investigate from scratch.
