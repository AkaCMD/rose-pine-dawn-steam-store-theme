import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';
import { contrast, rgba } from '../scripts/color.mjs';

test('achievement toast titles and descriptions remain readable on light surfaces',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    await withBrowserFixture({
      html: `<div class="_1OOQPJx0nCNP9ME9toCmV7">
        <div class="vW8HMuHYS7fdibpUYwTg3">
          <div class="mJ3Nu2ja1CSqf_qU1GD_b"><div class="_2c9nLjVvhFkcj8r8Tf9Scu">
            <div class="_1juF1NbXeVbg06v1506lgi" data-title>成就已解锁</div>
            <div class="_2zm3GcVDieR0YsBNy6jQmX" data-description>完成第一次冒险</div>
          </div></div>
        </div>
        <div class="vW8HMuHYS7fdibpUYwTg3">
          <div class="mJ3Nu2ja1CSqf_qU1GD_b">
            <div class="_1juF1NbXeVbg06v1506lgi _2ghro44p-iyeXJ1MFbHadQ" data-title>成就进度</div>
          </div>
        </div>
        <div class="fntOoeLPSTpmyXGGmgf99">
          <div class="_2axKS7MCnzMBRXRcYLn2Is">
            <div class="_1WuK_iZ6ARkIiptCX5qd7G"><div class="_18PwvOcpWfW3M8j2-bEPPJ" data-title>成就已解锁</div></div>
            <div class="_2jpxEWvo06efD6-NR1cplA"><div class="mJ3Nu2ja1CSqf_qU1GD_b">
              <div class="_35FNy1MhQxGVCALPuR6FH3" data-description>完成第一次冒险</div>
            </div></div>
          </div>
        </div>
      </div>`,
      // Steam's achievement labels declare colors directly, overriding inheritance.
      nativeCss: `
        ._1OOQPJx0nCNP9ME9toCmV7 { background:#0e141b; }
        .mJ3Nu2ja1CSqf_qU1GD_b ._1juF1NbXeVbg06v1506lgi { color:#fff; }
        .mJ3Nu2ja1CSqf_qU1GD_b ._2zm3GcVDieR0YsBNy6jQmX { color:#8b929a; }
        .BasicUI .mJ3Nu2ja1CSqf_qU1GD_b ._2zm3GcVDieR0YsBNy6jQmX { color:#b8bcbf; }
        .fntOoeLPSTpmyXGGmgf99 { background-color:#0e141b; }
        .fntOoeLPSTpmyXGGmgf99:hover { background-color:#23262e; }
        .fntOoeLPSTpmyXGGmgf99 ._18PwvOcpWfW3M8j2-bEPPJ { color:#fff; }
        .fntOoeLPSTpmyXGGmgf99 ._2jpxEWvo06efD6-NR1cplA { color:#b8bcbf; }
      `,
    }, async page => {
      for (const mode of ['', 'BasicUI']) {
        await page.evaluate(`document.body.className=${JSON.stringify(mode)}`);
        for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
          await page.forcePseudoState('body *', state);
          const labels = await page.evaluate(`Array.from(document.querySelectorAll('[data-title],[data-description]'), el => {
            let panel=el.closest('.fntOoeLPSTpmyXGGmgf99, ._1OOQPJx0nCNP9ME9toCmV7');
            return { title:el.hasAttribute('data-title'), color:getComputedStyle(el).color,
              background:getComputedStyle(panel).backgroundColor };
          })`);
          assert.equal(labels.length, 5);
          for (const label of labels) {
            assert.equal(label.color, label.title ? 'rgb(70, 66, 97)' : 'rgb(86, 82, 106)');
            assert.ok(contrast(rgba(label.color), rgba(label.background)) >= 4.5,
              `${mode} / ${state.join(',') || 'normal'}: ${JSON.stringify(label)}`);
          }
        }
      }
    });
  });
