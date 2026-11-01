import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { capturePages } from './capture-pages.mjs';
import { buildReport, renderReport, catalogSha256 } from './coverage-report.mjs';
import { scenarios } from './coverage-catalog.mjs';
import { loadThemeBundle, bundleIdentity, findInstalledTheme, inspectInstallation, fingerprintSteam } from './theme-assets.mjs';
import { mergeReports, strictFailure, compareReports } from './scenario-coverage.mjs';

try {
  const { values } = parseArgs({ options: {
    endpoint: { type: 'string', default: 'http://127.0.0.1:8080' },
    out: { type: 'string' },
    target: { type: 'string' }, state: { type: 'string', default: 'current' },
    strict: { type: 'boolean', default: false }, preview: { type: 'boolean', default: false },
    scenario: { type: 'string', multiple: true, default: [] },
    'installed-theme': { type: 'string' }, 'list-scenarios': { type: 'boolean', default: false },
    'check-installation': { type: 'boolean', default: false },
    merge: { type: 'string', multiple: true, default: [] }, baseline: { type: 'string' },
  } });
  for (const id of values.scenario) if (!scenarios.some(s => s.id === id)) throw new Error(`Unknown scenario: ${id}`);
  if (values.preview && (values.merge.length || values['check-installation'])) throw new Error('Preview requires a live capture');
  if (values.merge.length && values['check-installation']) throw new Error('Choose report merging or installation checking');
  if (values['list-scenarios']) {
    console.table(scenarios.map(({ id, label, state }) => ({ id, label, state })));
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const palette = JSON.parse(await readFile(resolve(root, 'palette.json'), 'utf8')).dawn;
    const bundle = await loadThemeBundle(root), repository = bundleIdentity(bundle);
    const installed = values['installed-theme'] ? resolve(values['installed-theme']) : await findInstalledTheme();
    const installation = await inspectInstallation(bundle, installed), upstream = await fingerprintSteam(installed);
    let pages = [], priorObservations = [], previewCssSha256 = null;
    if (values.merge.length) {
      const reports = await Promise.all(values.merge.map(path => readFile(resolve(path), 'utf8').then(JSON.parse)));
      ({ pages, observations: priorObservations } = mergeReports(reports, { repository, catalogSha256, upstream }));
    } else if (!values['check-installation']) {
      ({ pages, previewCssSha256 } = await capturePages(values));
    }
    const { report } = buildReport(pages, { palette, state: values.state, previewCssSha256, repository, installation, upstream,
      selected: values.scenario, priorObservations });
    if (values.baseline) report.comparison = compareReports(JSON.parse(await readFile(resolve(values.baseline), 'utf8')), report);
    const output = resolve(values.out ?? (values['check-installation'] ? 'reports/installation-audit' : values.merge.length ? 'reports/theme-coverage-merged' : 'reports/theme-coverage'));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(`${output}.json`, JSON.stringify(report, null, 2) + '\n');
    await writeFile(`${output}.md`, renderReport(report));
    console.log(`Installation: ${installation.status}`);
    if (values['check-installation']) console.table(installation.files.map(({ path, status }) => ({ path, status })));
    else console.table(report.scenarios.filter(s => !values.scenario.length || values.scenario.includes(s.id))
      .map(({ id, status, issues }) => ({ id, status, issues: issues.length })));
    console.log(`Report: ${output}.md`);
    if (values.strict && (values['check-installation'] ? installation.status !== '一致' : strictFailure(report, values.scenario))) process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 2; }
