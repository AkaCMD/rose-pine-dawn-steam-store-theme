# 主题覆盖检查

[采集入口](../scripts/theme-coverage.mjs)按组件和交互状态报告覆盖情况，同时检查安装文件及运行时 CSS 构建标记。[组件清单](../scripts/coverage-catalog.mjs)维护选择器、预期属性和状态组合，`npm run coverage:scenarios` 列出全部场景。

场景的“通过”表示清单中的属性在本次观察到的状态下符合预期。未打开的窗口、未出现的交互状态和清单以外的控件都不能据此视为已覆盖。页面级配色筛查与场景检查分别报告。

## 构建与安装校验

需要 Node.js 22 或更高版本。先生成 CSS，再检查安装副本：

```bash
npm run build
npm run check:installation
```

安装检查默认查找 `~/.steam/steam` 和 `~/.local/share/Steam` 中的 `millennium/themes/rose-pine-dawn`。自定义安装目录通过 `--installed-theme` 指定。检查读取仓库和安装目录的 `skin.json`、manifest 引用的 CSS 文件，比较 SHA-256，不修改安装副本。缺失文件、不同文件或无效构建标记会使严格检查失败。

[构建脚本](../scripts/build-css.mjs)在每份 CSS 末尾写入对应内容的构建标记。`npm run watch` 通过同一个构建脚本生成文件。直接使用 Sass 覆盖生成文件会丢失标记，需要重新运行 `npm run build`。

磁盘文件一致与运行时标记一致是两个结果。前者验证安装副本，后者检查渲染器声明的构建版本。安装后需要让 Steam 重新加载主题，再采集运行时结果。

## 采集真实界面

实时采集需要 Steam 已开启本地 CEF 调试接口，默认地址为 `http://127.0.0.1:8080`。将待检查区域打开并滚动到可见位置，再运行采集。工具不自动导航、滚动、点击控件或安装游戏。

```bash
npm run coverage:scenarios
npm run test:coverage -- --scenario store.controllers.normal --strict --out reports/controllers-normal
```

`--scenario` 指定这次必须观察到的场景，可以重复使用。指定场景的组件不存在或状态没有出现时，报告失败。未指定的场景仍显示在报告中，未观察到的保持“未检查”。不指定场景时，`--strict` 要求整份清单通过。

把鼠标移到控制器行后采集悬停状态。键盘焦点场景需要使用 Tab 键将焦点移到对应控件，再采集 `focus-visible`。展开和选中状态由页面中的实际属性或类名确认。`--state` 仅是备注标签，不会制造交互或将场景改为通过。

```bash
npm run test:coverage -- --scenario store.controllers.hover --state controller-hover --strict --out reports/controllers-hover
```

报告中的状态含义如下：

| 状态 | 触发条件 | 后续操作 |
| --- | --- | --- |
| 通过 | 观察到场景，运行时构建匹配，清单属性符合预期 | 保留报告作为本次证据 |
| 失败 | 选择器失效、属性不符、运行时构建不匹配，或指定场景未出现 | 查看 JSON 中的检查项及差异 |
| 未检查 | 没有观察到该组件或状态 | 打开相应区域并采集 |
| 需人工复核 | 检查目标在视口外、被遮挡、正在动画中、处于禁用状态或超过检查数量限制 | 调整视口，等待动画结束后重试或人工检查 |

同一检查项会读取视口内匹配到的全部元素，每项最多检查 100 个。整个检查项没有可见目标或超过数量限制时会进入人工复核。通过只覆盖当前视口内的匹配元素。

## 合并与基线比较

[合并规则](../scripts/scenario-coverage.mjs)允许合并同一主题构建、组件清单和本机 Steam 资源摘要下的采集结果。本机资源摘要读取 `steamui/sp.js`、`steamui/css/sp.css` 和 `steamui/css/library.css`。这些文件不完整时，版本保持未知，工具拒绝合并。

商店采集还记录公开脚本和样式资源的路径和 `contenthash` 或 `v` 版本值。共同资源出现不同版本时，工具拒绝合并。商店场景缺少带版本的资源记录时也不能合并。资源版本相同不能保证服务端内容和全部行为相同，更新后仍需要重新打开关键场景。

```bash
npm run test:coverage -- --merge reports/controllers-normal.json --merge reports/controllers-hover.json --scenario store.controllers.normal --scenario store.controllers.hover --strict --out reports/controllers-merged
```

同一场景使用时间较新的观察结果，同一时刻有任一失败时保留失败。其他未观察场景保持“未检查”。临时 CSS 预览报告不能合并为安装主题的通过证据。

`--baseline` 比较本次报告与保存的报告，列出主题、清单和资源变化，以及新增失败和本次未观察到的场景。基线中的通过记录不会补进本次覆盖率。

```bash
npm run test:coverage -- --baseline reports/controllers-normal.json --scenario store.controllers.normal --out reports/controllers-after-update
```

旧格式报告可以作为历史资料阅读，合并和基线比较要求 `schemaVersion: 2`。历史测量见 [2026-10-24 可读性报告](../reports/readability-audit.md)。

## 命令参数

每次命令输出 JSON 和 Markdown 报告。`--list-scenarios` 只输出清单。

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `--endpoint` | `http://127.0.0.1:8080` | 指定本地 HTTP CEF 调试接口 |
| `--out` | 采集为 `reports/theme-coverage`，安装检查为 `reports/installation-audit`，合并为 `reports/theme-coverage-merged` | 指定报告文件前缀 |
| `--target` | 所有符合条件的页面 | 限定 CDP target ID |
| `--state` | `current` | 写入备注标签，不改变观察状态 |
| `--scenario` | 无 | 指定必须观察的场景 ID，可重复 |
| `--strict` | 关闭 | 安装检查要求文件一致；采集要求所选场景、运行时标记和视口筛查通过；未选择场景时要求全部场景通过 |
| `--installed-theme` | 自动查找 | 指定已安装主题文件夹，不是 Steam 根目录 |
| `--check-installation` | 关闭 | 只检查安装副本，不连接浏览器 |
| `--list-scenarios` | 关闭 | 列出场景 ID、名称和状态 |
| `--merge` | 无 | 读取并合并 JSON 报告，可重复，不进行实时采集 |
| `--baseline` | 无 | 与指定 JSON 报告比较，不继承其通过结果 |
| `--preview` | 关闭 | 临时注入仓库 CSS，等待短时动画后采集，再移除；不能与安装检查或合并组合 |

`--preview` 报告标记临时注入来源，严格模式不会将它作为安装主题的通过证据。

退出码 0 表示命令完成，未启用严格检查时不能据此判断覆盖通过。退出码 1 表示严格检查未通过，2 表示接口、参数或报告版本错误。接口无法连接时不会生成新的采集报告。

## 检测标准与验证边界

[组件探针](../scripts/component-probe.mjs)读取预期选择器的匹配数量、可见性和计算属性。颜色按主题变量比较，背景图片等属性按清单规定比较。这能发现类名替换和主题外颜色，也会把主动选择其他配色的控件列为差异，需要结合控件用途复核。

[页面扫描器](../scripts/scan-page.mjs)读取当前视口，检查深色表面、主题外颜色和文字对比度。普通文字阈值为 4.5:1，大字为 3:1。禁用文字跳过对比度和前景色检查。这些检查不构成 Steam 整体无障碍合规结论。

页面级筛查跳过图片、视频、SVG 和画布。背景图片、渐变、透明画布、滤镜和混合效果进入人工复核。组件清单中明确要求无渐变的表面，出现渐变会直接报告属性不符。工具没有自动截图差异检查。

可见性采用元素中心点命中近似判断，可能漏掉局部露出的内容。伪元素、Shadow DOM、子框架和原生窗口遮挡没有覆盖。好友聊天、社区、Big Picture 和游戏内覆盖层不在当前组件清单中。

报告不保存页面文字、Cookie、资源查询串或会话值。JSON 保存元素选择器、计算值、坐标、构建标记和资源版本。选择器可能包含 Steam 元素 ID，页面标题和安装目录也会写入报告，分享前应检查这些字段。

## 浏览器回归验证

```bash
npm test
STEAM_CDP_TEST=1 npm test
```

普通测试验证报告判定、安装摘要、版本合并和命令参数。带 `STEAM_CDP_TEST=1` 的测试还通过 CEF 调试接口创建临时页面，验证真实计算样式、鼠标悬停、键盘焦点、类名替换、颜色偏离和旧构建标记检测。自定义接口通过环境变量 `STEAM_CDP_ENDPOINT` 指定。测试串行运行，避免共享浏览器输入状态互相干扰。

[浏览器用例](../tests/live-coverage.test.mjs)和[命令行集成用例](../tests/coverage-cli.test.mjs)验证工具的检测能力，使用的是受控临时页面。它们通过不能证明当前 Steam 的全部真实页面已检查。真实界面覆盖以采集报告的场景状态为准。
