import { classify, summarize } from './coverage-rules.mjs';
import { components, scenarios } from './coverage-catalog.mjs';
import { digest } from './theme-assets.mjs';
import { rgba } from './color.mjs';
import { scenarioCoverage, verifyRuntime } from './scenario-coverage.mjs';

export const catalogSha256 = digest(JSON.stringify({ components, scenarios }));
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('`', '\\`').replaceAll('\n', ' ');

export function renderReport(report) {
  const lines = ['# Steam 主题覆盖检查', '', `采集时间：${report.capturedAt}。状态标签：${escape(report.state)}。`, '',
    '通过仅表示清单中的检查点在已观察状态下符合预期。未检查的场景不计为通过。', '',
    `场景：${report.scenarios.filter(s => s.status === '通过').length}/${report.scenarios.length} 通过。安装文件：${report.installation.status}。`, '',
    '## 场景覆盖', '', '| 场景 | 状态 | 结果 |', '| --- | --- | --- |'];
  for (const scenario of report.scenarios) lines.push(`| ${scenario.label} / ${scenario.state} | ${scenario.status} | ${escape(scenario.issues.map(i => `${i.kind}${i.check ? ` (${i.check})` : ''}`).join(', '))} |`);
  lines.push('', '## 主题版本与安装', '', `仓库 CSS/manifest 摘要：\`${report.repository?.sha256 ?? '未记录'}\`。`, '',
    `Steam 本机资源摘要：\`${report.upstream.sha256 ?? '未知'}\`。场景清单摘要：\`${report.catalogSha256}\`。`, '',
    '| 文件 | 安装结果 |', '| --- | --- |');
  for (const file of report.installation.files) lines.push(`| ${escape(file.path)} | ${file.status} |`);
  if (report.previewCssSha256) lines.push('', `本报告使用临时注入的仓库 CSS，采集结束后移除。CSS SHA-256：\`${report.previewCssSha256}\`。不代表主题已安装。`);
  if (report.comparison) lines.push('', '## 基线比较', '',
    `主题变化：${report.comparison.themeChanged ? '是' : '否'}。Steam 资源变化：${report.comparison.steamChanged ? '是' : '否'}。检查清单变化：${report.comparison.catalogChanged ? '是' : '否'}。`, '',
    `新增失败：${report.comparison.regressions.map(escape).join(', ') || '无'}。本次未观察到：${report.comparison.noLongerObserved.map(escape).join(', ') || '无'}。`, '',
    `商店资源变化：${report.comparison.webResourcesChanged.map(escape).join(', ') || '未发现共同资源的版本变化'}。`);
  lines.push('', '## 当前视口筛查', '', '| 区域 | 状态 | 可用页面 | 疑似遗漏 | 人工复核 |', '| --- | --- | ---: | ---: | ---: |');
  for (const region of report.regions) lines.push(`| ${region.label} | ${region.status} | ${region.pages} | ${region.findings} | ${region.manualReview} |`);
  lines.push('', '## 元素证据', '', '| 页面 | 问题 | 元素 | 计算值 |', '| --- | --- | --- | --- |');
  for (const page of report.pages) {
    for (const issue of page.eligible ? page.findings : []) {
      const value = issue.ratio ? `${issue.ratio}:1 < ${issue.minimum}:1` : JSON.stringify(issue.background ?? issue.foreground);
      lines.push(`| ${escape(page.title)} | ${issue.kind} | \`${escape(issue.selector)}\` | ${escape(value)} |`);
    }
    if (page.error) lines.push(`| ${escape(page.title)} | 采集失败 | | ${escape(page.error)} |`);
  }
  lines.push('', '## 页面采集情况', '', '| 页面 | 可见状态 | 运行时构建标记 | 样本数 | 区域识别 |', '| --- | --- | --- | ---: | --- |');
  for (const page of report.pages) lines.push(`| ${escape(page.title)} | ${page.visibility ?? '未知'} | ${page.runtime.status} | ${page.sampleCount ?? 0} | ${page.regions?.join(', ') || '未识别'} |`);
  lines.push('', '## 检查边界', '',
    'JSON 保存选择器、匹配数量、属性差异、资源版本和坐标，不保存页面文字、Cookie、资源查询串或会话值。', '',
    '采集读取已打开页面，不自动导航、滚动、安装游戏或点击控件。交互状态必须实际出现。状态标签仅用于备注。', '',
    '通过只覆盖组件清单中列出的属性。清单以外的控件、好友聊天、社区、Big Picture 和游戏内覆盖层需要另行检查。', '',
    '全页筛查跳过图片、视频、SVG 和画布。背景图片、渐变、滤镜及混合效果列为人工复核。', '',
    '普通文字对比度阈值为 4.5:1，大字为 3:1。配色偏离属于疑似遗漏，需要结合界面用途复核。', '',
    '可见性使用中心点命中近似判断。伪元素、Shadow DOM、子框架和原生窗口遮挡没有覆盖。', '',
    '文件摘要验证磁盘副本；运行时构建标记检查渲染器声明的构建版本，两者不能相互替代。', '',
    '退出码：0 表示命令完成；1 表示 strict 检查未通过；2 表示接口、参数或报告版本错误。', '');
  return lines.join('\n');
}

// Classification and rendering have no filesystem or CDP side effects.
export function buildReport(inputPages, { palette, state = 'current', previewCssSha256 = null,
  repository = null, installation = { status: '未检查', files: [] }, upstream = { status: '未知', sha256: null, files: [] },
  selected = [], priorObservations = [], capturedAt = new Date().toISOString() } = {}) {
  const pages = structuredClone(inputPages);
  const colors = [...new Set([...Object.values(palette), ...(repository?.colors ?? [])])].map(rgba).filter(Boolean);
  const observations = [...priorObservations];
  for (const page of pages) {
    page.capturedAt ??= capturedAt;
    if (page.samples) {
      page.findings = [];
      page.manualReview = [];
      for (const sample of page.samples) for (const issue of classify(sample, colors, { paletteColors: colors })) {
        (issue.kind === 'manual-review' ? page.manualReview : page.findings).push({ ...sample, ...issue });
      }
      page.sampleCount = page.samples.length;
      delete page.samples;
    }
    page.findings ??= [];
    page.manualReview ??= [];
    page.sampleCount ??= 0;
    page.eligible = !page.error && page.visibility === 'visible' && page.sampleCount > 0 && page.themeBase === palette.base;
    page.runtime = verifyRuntime(page.markers, repository);
    for (const observation of page.componentObservations ?? []) {
      if (page.error || page.visibility !== 'visible' || !observation.observed) continue;
      const issues = [...observation.issues];
      if (!page.eligible || page.runtime.status !== '一致') issues.push({ kind: 'runtime-stale' });
      observations.push({ ...observation, issues, capturedAt: page.capturedAt, location: page.location });
    }
  }
  for (const id of selected) if (!observations.some(o => o.id === id && o.observed)) {
    const present = pages.some(page => page.componentObservations?.some(o => o.id === id && o.rootMatches));
    observations.push({ id, observed: true, capturedAt, issues: [{ kind: present ? 'state-not-observed' : 'component-missing' }] });
  }
  const unique = [...new Map(observations.map(o => [JSON.stringify(o), o])).values()];
  const report = { schemaVersion: 2, capturedAt, state, catalogSha256, repository, installation, upstream,
    previewCssSha256, scenarios: scenarioCoverage(unique, scenarios), observations: unique,
    regions: summarize(pages, palette.base), pages };
  return { report, markdown: renderReport(report) };
}
