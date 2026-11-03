# IMPROVEMENT-001 continuation: lint remediation

Research checked against the npm registry and upstream sources on
2026-11-03/04. This is a research result, not an installed or verified change.
The root agent owns implementation, fresh audits, and docgen/Swagger work.
No manifests, lockfile, application files, shared notes, or status were edited.

The later user-approved assessment exceptions are recorded in the
[ticket](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions).
The research below is a pre-decision snapshot; technical findings are retained,
while its conditional completion advice is superseded by that decision.

## Result

There is **no currently published, in-range dependency update that clears the
lint ecosystem's minimatch finding**. There are promising narrowly scoped
minimatch 11 adaptations for ESLint/config-array/TypeScript ESLint, but the
existing import-x and React plugins have incompatible APIs. Getting the whole
lint stack clean requires plugin migration or maintained consumer patches,
in addition to validating the scoped overrides. A blanket override is unsafe.

## Registry evidence and exact candidates

Queries used Node 26.13.0 via:

```sh
export PATH=/Users/pawel/.nvm/versions/node/v26.13.0/bin:$PATH
npm view minimatch dist-tags --json --fetch-retries=0
npm view minimatch@10 version dependencies engines --json --fetch-retries=0
npm view '<package>@latest' version dependencies peerDependencies engines --json --fetch-retries=0
```

The sandbox initially returned ENOTFOUND. Read-only registry retries with
network approval succeeded. Versioned registry records below identify exactly
which releases were examined; “latest” means the dist-tag observed during this
research, not a future guarantee.

| Package checked | Latest checked / relevant declaration | Consequence |
| --- | --- | --- |
| [minimatch](https://registry.npmjs.org/minimatch) | Latest `11.0.4`; latest v10 `10.2.6`; legacy-v3 `3.1.5`, legacy-v9 `9.0.9` | No published v10/backport fix found. |
| [eslint 10.14.0](https://registry.npmjs.org/eslint/10.14.0) | minimatch `^10.2.6`; config-array `^0.23.5` | Updating ESLint alone does not clear audit. |
| [config-array 0.23.5](https://registry.npmjs.org/@eslint%2fconfig-array/0.23.5) | minimatch `^10.2.4` | Requires a tested scoped adaptation. |
| [typescript-eslint 8.72.1](https://registry.npmjs.org/typescript-eslint/8.72.1) / [typescript-estree](https://registry.npmjs.org/@typescript-eslint%2ftypescript-estree/8.72.1) | estree minimatch `^10.2.2`; ESLint peers include 10; TypeScript `>=4.8.4 <6.1.0` | Latest release still has finding; current aliased TypeScript 6.0.2 fits. |
| [import-x 4.17.1](https://registry.npmjs.org/eslint-plugin-import-x/4.17.1) | minimatch `^9.0.3 || ^10.1.2`; ESLint peers include 10 | Actual API incompatibility prevents v11 override. |
| [react plugin 7.37.5](https://registry.npmjs.org/eslint-plugin-react/7.37.5) | minimatch `^3.1.2`; ESLint peers `^3 ... || ^9.7` | No ESLint 10 peer support or supported minimatch fix. |
| [@eslint/js 10.0.1](https://registry.npmjs.org/@eslint%2fjs/10.0.1) | ESLint peer `^10.0.0` | Already current. |
| [Babel ESLint parser 8.0.7](https://registry.npmjs.org/@babel%2feslint-parser/8.0.7) | ESLint 9/10; Babel core `^8.0.0` | An upgrade requires Babel 8, but removal may be smaller if unused. |

The [maintainer advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
and [GitHub reviewed record](https://github.com/advisories/GHSA-g3hv-75wg-m249)
still identify `<11.0.1` as affected and `11.0.1` as the patched release.
The documented attack needs attacker-controlled patterns and optimization
level >=2. This project's inspected configuration contains local repository
patterns, which limits demonstrated exposure but does not satisfy zero-audit
acceptance. No claim is made that every old major implements the vulnerable
algorithm merely because the advisory range includes it.

## Why v11 must be evaluated consumer by consumer

The [minimatch v11 changelog](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/changelog.md)
removes `makeRe`, `Minimatch.regexp`, `AST`, and several internal-looking
methods. `Minimatch.set` contains Matcher objects rather than regular
expressions. v9 already removed the default/callable export. v11 also changes
some edge-case matching behavior, including empty path portions and partial
globstar matches. API inspection alone is therefore necessary but insufficient.

| Consumer | Inspected calls | Disposition |
| --- | --- | --- |
| ESLint 10.11.0 installed; [10.14.0 upstream helper](https://raw.githubusercontent.com/eslint/eslint/v10.14.0/lib/eslint/eslint-helpers.js) | `Minimatch` constructor, `.match(path, true)`, `.match(path)`, `.pattern` | API surface retained; scoped 11.0.4 override is a candidate for differential file-discovery/ignore tests. No removed-method usage was found in installed `eslint/lib`. |
| config-array 0.23.5 installed; [upstream implementation](https://raw.githubusercontent.com/eslint/rewrite/main/packages/config-array/src/config-array.js) | `Minimatch` constructor and `.match` | API-compatible candidate; verify ignored files, negations, dotfiles, nested files/ignores and actual lint coverage. Upstream main is context; installed version was independently inspected. |
| TypeScript ESLint estree 8.71.0 installed; [8.72.1 upstream](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/v8.72.1/packages/typescript-estree/src/useProgramFromProjectService.ts) | named `minimatch(filePath, pattern, {dot:true})` for allowDefaultProject | API-compatible candidate; test project-service default-project files and typed lint behavior. |
| [import-x 4.17.1](https://raw.githubusercontent.com/un-ts/eslint-plugin-import-x/v4.17.1/src/rules/no-internal-modules.ts) | Static ESM import of removed `makeRe`; invoked by no-internal-modules | Importing the plugin's ESM entry loads this rule even when only order is enabled. Disabling the rule is insufficient. Replace/adapt consumer before v11. |
| [React 7.37.5 example](https://raw.githubusercontent.com/jsx-eslint/eslint-plugin-react/v7.37.5/lib/rules/no-unstable-nested-components.js) | `require('minimatch')` called as a function | Incompatible export shape. Installed forbid-component-props, jsx-handler-names, no-danger, jsx-pascal-case and no-unstable-nested-components use this pattern. |

Any experimental override should name the precise consuming package/version,
not set root-wide `minimatch: 11.0.4`. Preserve npm's audit metadata; do not
rename vulnerable packages or use aliases intended to conceal findings.

## Peer repair and migration choices

The [React plugin ESLint 10 compatibility issue](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977)
is still open. Runtime `fixupPluginRules` in the repository cannot change npm's
peer contract. A package with supported peers or migration is required for
strict clean installation. ESLint [9.39.5](https://registry.npmjs.org/eslint/9.39.5)
and matching [@eslint/js](https://registry.npmjs.org/@eslint%2fjs/9.39.5) fit the
React plugin peer but reintroduce minimatch 3 and do not solve security acceptance.

`eslint.config.mjs` imports TypeScript ESLint's parser, not Babel's parser.
A tracked non-JSON source search found no references to Babel parser/presets/core.
Removing only the unused direct `@babel/eslint-parser@7.29.9` is a concrete
candidate to eliminate its peer conflict, subject to root verification of
configuration/manifest usage. It does not require migrating all Babel packages
or resolve the React plugin conflict by itself.

Since version-only remediation is unavailable, the following are real
migration candidates, **not yet approved implementations or drop-in equivalents**:

| Candidate | Evidence and work still required |
| --- | --- |
| [eslint-plugin-perfectionist 5.13.0](https://registry.npmjs.org/eslint-plugin-perfectionist/5.13.0) | ESLint peer includes 10; no direct minimatch dependency. Its [sort-imports source](https://raw.githubusercontent.com/azat-io/eslint-plugin-perfectionist/v5.13.0/rules/sort-imports.ts) supports groups and configurable sorting. Map current builtin/external/internal/parent/sibling/index/object/type groups, alphabetic case-insensitive order, and blank lines before replacing import-x/order. Check side-effect import ordering and avoid unrelated mass reformatting. |
| [eslint-plugin-simple-import-sort 14.0.0](https://registry.npmjs.org/eslint-plugin-simple-import-sort/14.0.0) | No runtime dependencies; ESLint peer >=5. Simpler alternative, but its sorting/group semantics require a behavior migration rather than a version substitution. |
| [eslint-plugin-react-x 5.28.8](https://registry.npmjs.org/eslint-plugin-react-x/5.28.8) or [@eslint-react/eslint-plugin 5.28.8](https://registry.npmjs.org/@eslint-react%2feslint-plugin/5.28.8) | ESLint/TypeScript peers `*`; Node >=20.19. The [official README](https://raw.githubusercontent.com/Rel1cx/eslint-react/main/README.md) describes React 19 and TypeScript support and modular React/JSX/DOM plugins. React-x still depends on estree ^8.72.0, so the estree minimatch issue remains. Map every currently enabled React recommended rule plus jsx-no-leaked-render and no-array-index-key; choosing a different recommended preset without comparing coverage would silently change standards. |

Safe next execution: remove the confirmed-unused Babel parser, then either
validate the three scoped consumer overrides and explicitly migrate the two
incompatible plugins, or retain findings with documented upstream blockers.
The former requires lint-policy regression checks and full quality verification;
the latter leaves this ticket open without an accepted exception. No currently
researched one-line version update fixes the entire lint chain.

## Rejected deepmerge CVE cross-check

The [CVE program record](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
still records CVE-2026-93753 as REJECTED, with update/rejection time
2026-11-02T16:33:19.357Z, because it does not describe a security vulnerability.
The [GitHub advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) still
lists deepmerge 4.2.0–4.3.1 and no patched release, last updated October 27.
This confirms the authoritative-record/feed discrepancy remains; it does not
authorize suppression or a misleading downgrade. Fresh npm audit results belong
in the root implementation evidence.
