import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browserTest = { skip: !process.env.STEAM_CDP_TEST };
const style = (evaluate, selector, property) =>
  evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);

// LaunchOptionDialog from Steam's desktop popup, including its native radio
// buttons, custom checkbox, and actions that do not use DialogButton.
test('launch options use Dawn colors for the panel, choices and actions', browserTest, async () => {
  const html = `<body class="DesktopUI"><div class="PopupFullWindow">
    <div class="ModalPosition_TopBar"></div>
    <div class="title-area-icon closeButton"><svg class="SVGIcon_X_Line"><line x2="10" y2="10"/></svg></div>
    <main class="LclHwcOfHFpwObYMD1HLa">
    <h1 class="DialogSubHeader _3T-1PliI6PkKE-bE-o3bV0">Example Game</h1>
    <div class="_2aHnQT0gTQ5KIsi5omK93w">
      <div class="DialogSubHeader EvZ7kwlROeKkDzxBu2TfH">选择启动选项</div>
      <div class="_134yW7SKfZYwmvwlUElGx-" id="options">
        <div class="_3DEhfTvEKwgLd4smd6QdaU" id="selected"><input type="radio" name="LaunchOption" id="first" checked><label for="first">默认模式</label></div>
        <div class="_3DEhfTvEKwgLd4smd6QdaU" id="other"><input type="radio" name="LaunchOption" id="second"><label for="second">安全模式</label></div>
      </div>
      <div class="DialogCheckbox_Container" tabindex="0" role="checkbox" aria-checked="false">
        <div class="DialogCheckbox"><svg class="SVGIcon_DialogCheck"><path d="M0 0L5 5L10 0"/></svg></div>
        <div class="DialogToggle_Label">始终使用此选项</div>
      </div>
      <div class="DialogSubHeader HSQN4Dc7pEbtuyr1LP-5v" id="hint">可在游戏属性中更改选择。</div>
    </div>
    <div class="_3H2GezG50hog8gSDj-qbx1">
      <div class="_3EWVuoln1WAvpEaPNfpift" id="play">开始游戏</div>
      <div class="_1d8CbcBnA6t3lsxYdnMv1h" id="cancel">取消</div>
    </div>
  </main></div></body>`;
  const nativeCss = `
    .LclHwcOfHFpwObYMD1HLa { background: radial-gradient(#4a515c, transparent), #25282e; color: #fff; }
    .DesktopUI .LclHwcOfHFpwObYMD1HLa ._3T-1PliI6PkKE-bE-o3bV0 { color: #fff; }
    .DesktopUI .LclHwcOfHFpwObYMD1HLa .DialogToggle_Label { color: #dcdedf; }
    .LclHwcOfHFpwObYMD1HLa ._134yW7SKfZYwmvwlUElGx- { background: #23262e; box-shadow: inset 0 0 6px #0005; }
    .LclHwcOfHFpwObYMD1HLa ._134yW7SKfZYwmvwlUElGx- ._3DEhfTvEKwgLd4smd6QdaU { background: #3d445080; }
    .LclHwcOfHFpwObYMD1HLa ._134yW7SKfZYwmvwlUElGx- ._3DEhfTvEKwgLd4smd6QdaU:hover { background: #3d4450cc; }
    .DialogCheckbox { background: #0004; box-shadow: inset 1px .5px 3px #01010166; }
    .DialogCheckbox .SVGIcon_DialogCheck path { stroke: white; }
    ._3H2GezG50hog8gSDj-qbx1 ._3EWVuoln1WAvpEaPNfpift { background: #1a9fff; color: #fff; }
    ._3H2GezG50hog8gSDj-qbx1 ._3EWVuoln1WAvpEaPNfpift:hover { background: #0bf; }
    ._3H2GezG50hog8gSDj-qbx1 ._1d8CbcBnA6t3lsxYdnMv1h { background: #3d4450; color: #fff; }
    .ModalPosition_TopBar { background: linear-gradient(to right, #00ccff, #3366ff); }
    .title-area-icon .SVGIcon_X_Line line { stroke: #788a92; }
    .DesktopUI .title-area-icon.closeButton:hover { background: #e22a27; }
  `;
  await withBrowserFixture({ html, nativeCss }, async ({ evaluate, forcePseudoState }) => {
    const expectStyle = async (selector, property, expected) =>
      assert.equal(await style(evaluate, selector, property), expected, `${selector} ${property}`);
    await expectStyle('main', 'backgroundColor', 'rgb(255, 250, 243)');
    await expectStyle('main', 'backgroundImage', 'none');
    await expectStyle('h1', 'color', 'rgb(70, 66, 97)');
    await expectStyle('#hint', 'color', 'rgb(86, 82, 106)');
    await expectStyle('#options', 'backgroundColor', 'rgb(250, 244, 237)');
    await expectStyle('#other', 'backgroundColor', 'rgb(242, 233, 225)');
    await expectStyle('#selected', 'backgroundColor', 'rgb(223, 218, 217)');
    await expectStyle('#selected label', 'color', 'rgb(70, 66, 97)');
    await expectStyle('#first', 'accentColor', 'rgb(40, 105, 131)');
    await expectStyle('.DialogToggle_Label', 'color', 'rgb(70, 66, 97)');
    await expectStyle('.DialogCheckbox', 'backgroundColor', 'rgb(250, 244, 237)');
    await expectStyle('#play', 'backgroundColor', 'rgb(40, 105, 131)');
    await expectStyle('#play', 'color', 'rgb(255, 250, 243)');
    await expectStyle('#cancel', 'backgroundColor', 'rgb(242, 233, 225)');
    await expectStyle('.ModalPosition_TopBar', 'backgroundColor', 'rgb(40, 105, 131)');
    await expectStyle('.closeButton line', 'stroke', 'rgb(86, 82, 106)');
    await forcePseudoState('#second', ['focus', 'focus-visible']);
    await expectStyle('#other', 'backgroundColor', 'rgb(223, 218, 217)');
    await forcePseudoState('#play', ['hover']);
    await expectStyle('#play', 'backgroundColor', 'rgb(32, 87, 109)');
    await forcePseudoState('.closeButton', ['hover']);
    await expectStyle('.closeButton', 'backgroundColor', 'rgb(223, 218, 217)');
    await evaluate(`document.querySelector('.DialogCheckbox').classList.add('Active')`);
    await expectStyle('.DialogCheckbox', 'backgroundColor', 'rgb(40, 105, 131)');
    await expectStyle('.DialogCheckbox path', 'stroke', 'rgb(255, 250, 243)');
  });
});

// GameLaunchingDialog shares a status component with the library play bar.
test('the launch wait popup themes status and progress without touching its artwork or other progress bars', browserTest, async () => {
  const html = `<body class="DesktopUI PopupFullWindow">
    <main class="DialogContent _2KQRlxOL0nH2Mx4tAGxQQr">
      <div class="_1ONMa3won-P2Oau-Pa97x8">
        <div class="_3_yzjqgSqhrEs9sL3hOHTq"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt=""></div>
        <div class="_33mJBJCDyePXKN8r7nj9ln">
          <div class="_2Ylu2Lki0Y2s452Fh--tiE" id="starting">正在启动</div>
          <div class="_20PFwr9na9AT4Lz00IdtVQ" id="game">Example Game</div>
          <div class="_2FC4Z3YksGBXT7NA421gI8">
            <div class="_1dg8hJMsAYISbeQUxcCJcv _2GoT7avzz1A1UJB8cj9teR">
              <div class="_34lrt5-Fc3usZU6trA1P0- _1sKdg4-6_xRyPxMt0eRvaf" id="status">正在运行</div>
              <div class="_2TYVGoD27ZMfjRirKQNLfk _2pGX3XXztz624QfCJElgkR" id="detail">正在等待游戏窗口
                <div class="_25YVDTaClw6Y2COPsU0UaV" id="track" role="progressbar">
                  <div class="_1FnTqlsi2_-TJf1d5apoS6" id="progress" style="width:50%"></div>
                </div>
              </div>
            </div>
          </div>
          <button class="DialogButton _1_1gXneI2QlOdyXMqiCZJx">打开 Steam</button>
        </div>
      </div>
    </main>
    <div class="_25YVDTaClw6Y2COPsU0UaV" id="unrelated"></div>
  </body>`;
  const nativeCss = `
    .DialogContent { background: #25282e; color: #dcdedf; }
    ._20PFwr9na9AT4Lz00IdtVQ, ._34lrt5-Fc3usZU6trA1P0-, ._2TYVGoD27ZMfjRirKQNLfk { color: #fff; }
    ._25YVDTaClw6Y2COPsU0UaV { background-color: #151619; }
    ._25YVDTaClw6Y2COPsU0UaV ._1FnTqlsi2_-TJf1d5apoS6 { background-color: #2d73ff; }
  `;
  await withBrowserFixture({ html, nativeCss }, async ({ evaluate }) => {
    const expectStyle = async (selector, property, expected) =>
      assert.equal(await style(evaluate, selector, property), expected, `${selector} ${property}`);
    await expectStyle('main', 'backgroundColor', 'rgb(255, 250, 243)');
    await expectStyle('#game', 'color', 'rgb(70, 66, 97)');
    await expectStyle('#starting', 'color', 'rgb(86, 82, 106)');
    await expectStyle('#status', 'color', 'rgb(70, 66, 97)');
    await expectStyle('#detail', 'color', 'rgb(86, 82, 106)');
    await expectStyle('#track', 'backgroundColor', 'rgb(223, 218, 217)');
    await expectStyle('#progress', 'backgroundColor', 'rgb(40, 105, 131)');
    await expectStyle('button', 'backgroundColor', 'rgb(242, 233, 225)');
    await expectStyle('img', 'filter', 'none');
    await expectStyle('#unrelated', 'backgroundColor', 'rgb(21, 22, 25)');
  });
});
