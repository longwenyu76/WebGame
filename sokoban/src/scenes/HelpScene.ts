import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY, COLOR_BG, SCENE_KEYS,
} from '../constants/GameConstants';

const CX  = CANVAS_WIDTH / 2;
const PAD = 24;          // 左右内边距
const TOP = 66;          // 固定标题栏高度
const IC  = 30;          // 元素图标显示尺寸
const IC_SC = IC / 64;   // 精灵缩放比例

export class HelpScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.HELP }); }

  create(): void {
    // 大背景，足够覆盖所有内容
    this.add.rectangle(CX, 5000, CANVAS_WIDTH, 10000, COLOR_BG);

    let y = TOP + 16;

    y = this.drawSection('游戏元素', y);
    y = this.drawElements(y);

    y = this.drawSection('规则', y + 18);
    y = this.drawRules(y);

    y = this.drawSection('胜利条件', y + 18);
    y = this.drawLine('将所有箱子都推到目标点上，即可过关。', y);

    y = this.drawSection('操作说明', y + 18);
    y = this.drawControls(y);

    y = this.drawSection('星级评定', y + 18);
    y = this.drawStars(y);

    y = this.drawSection('鸣谢', y + 18);
    y = this.drawCredits(y);

    y = this.drawSection('免责声明', y + 18);
    y = this.drawDisclaimer(y);

    y += 32;

    const maxScrollY = Math.max(0, y - CANVAS_HEIGHT + TOP);

    // ── 固定标题栏 ────────────────────────────────────────────────────────
    this.add.rectangle(CX, TOP / 2, CANVAS_WIDTH, TOP, COLOR_BG)
      .setScrollFactor(0).setDepth(10);
    // 底部分隔线
    this.add.rectangle(CX, TOP - 1, CANVAS_WIDTH, 2, 0x2a2a4a)
      .setScrollFactor(0).setDepth(10);

    this.add.text(CX, TOP / 2, '游 戏 说 明', {
      fontSize: '24px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

    const backBtn = this.add.text(PAD, TOP / 2, '← 返回', {
      fontSize: '15px', color: '#7f8c8d', fontFamily: FONT_FAMILY,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(11)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerover',  () => backBtn.setColor('#aabbcc'));
    backBtn.on('pointerout',   () => backBtn.setColor('#7f8c8d'));
    backBtn.on('pointerdown',  () => this.scene.start(SCENE_KEYS.MENU));

    // ── 触摸拖拽 ─────────────────────────────────────────────────────────
    let dragY0 = 0, dragSY0 = 0, dragging = false;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragY0 = p.y; dragSY0 = this.cameras.main.scrollY; dragging = true;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      this.cameras.main.scrollY =
        Phaser.Math.Clamp(dragSY0 + (dragY0 - p.y), 0, maxScrollY);
    });
    this.input.on('pointerup', () => { dragging = false; });

    // ── 鼠标滚轮 ─────────────────────────────────────────────────────────
    this.input.on('wheel',
      (_p: Phaser.Input.Pointer, _g: unknown, _dx: number, dy: number) => {
        this.cameras.main.scrollY =
          Phaser.Math.Clamp(this.cameras.main.scrollY + dy, 0, maxScrollY);
      });
  }

  // ── 分节标题（橙色竖条 + 文字）──────────────────────────────────────────

  private drawSection(title: string, y: number): number {
    this.add.rectangle(PAD, y + 13, 4, 22, 0xf39c12).setOrigin(0, 0.5);
    this.add.text(PAD + 10, y, title, {
      fontSize: '19px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    });
    return y + 34;
  }

  // ── 普通文本行（支持自动换行，返回下一行 y）────────────────────────────

  private drawLine(
    text: string, y: number,
    color = '#c8ccd4', size = '15px', indent = 0,
  ): number {
    const obj = this.add.text(PAD + indent, y, text, {
      fontSize: size, color, fontFamily: FONT_FAMILY,
      wordWrap: { width: CANVAS_WIDTH - PAD * 2 - indent },
    });
    return y + obj.height + 4;
  }

  // ── 游戏元素（图标 + 名称 + 描述）────────────────────────────────────

  private drawElements(y: number): number {
    const ICON_W = IC + 10;
    const items: [string, string, string][] = [
      ['player_05.png',      '工人',   '玩家控制的可以移动的角色'],
      ['crate_02.png',       '箱子',   '需要推到目标点的物体，箱子之间没有区别'],
      ['ground_03.png',      '地板',   '可以行走的空地，工人和箱子都可以通过'],
      ['block_05.png',       '墙壁',   '无法通过的障碍物'],
      ['environment_01.png', '目标点', '特殊的地板，箱子需要到达的位置'],
    ];

    for (const [frame, name, desc] of items) {
      // 图标（先铺地板再叠元素）
      this.add.image(PAD + IC / 2, y + IC / 2, 'sokoban', 'ground_03.png')
        .setScale(IC_SC).setOrigin(0.5);
      this.add.image(PAD + IC / 2, y + IC / 2, 'sokoban', frame)
        .setScale(IC_SC).setOrigin(0.5);

      // 名称
      const nameObj = this.add.text(PAD + ICON_W, y, name, {
        fontSize: '15px', color: '#f39c12', fontFamily: FONT_FAMILY,
      });
      // 描述
      const descObj = this.add.text(PAD + ICON_W, y + nameObj.height + 2, desc, {
        fontSize: '13px', color: '#9a9ab8', fontFamily: FONT_FAMILY,
        wordWrap: { width: CANVAS_WIDTH - PAD * 2 - ICON_W },
      });

      const rowH = Math.max(IC, nameObj.height + 2 + descObj.height);
      y += rowH + 10;
    }
    return y;
  }

  // ── 规则 ────────────────────────────────────────────────────────────────

  private drawRules(y: number): number {
    const rules = [
      '工人可以向上、下、左、右四个方向移动',
      '当箱子前面没有障碍物时，工人可以推动箱子',
      '工人一次只能推动一只箱子，推不动两只',
      '箱子只能推，不能拉',
      '工人只能在地板上行走，不能穿过墙壁或跳过箱子',
      '箱子可以从目标点上推走（可以重新规划路线）',
    ];
    for (let i = 0; i < rules.length; i++) {
      y = this.drawLine(`${i + 1}．${rules[i]}`, y);
      y += 2;
    }
    return y;
  }

  // ── 操作说明 ─────────────────────────────────────────────────────────────

  private drawControls(y: number): number {
    const groups: [string, string[]][] = [
      ['移动工人',
        ['PC：方向键 / W A S D',
         '移动设备：滑动屏幕 / 方向键按钮']],
      ['推错了？不要紧，支持无限撤销！',
        ['Z / U  或  撤销按钮']],
      ['一开始就错了？没关系，重新开始就好。',
        ['R  或  重开按钮']],
      ['关卡太难，过不去？无所谓，跳过就行。',
        ['N  或  关卡选择按钮']],
    ];

    for (const [label, subs] of groups) {
      y = this.drawLine(label, y, '#e0e0e8', '15px');
      for (const s of subs) {
        y = this.drawLine(s, y, '#9a9ab8', '14px', 16);
      }
      y += 6;
    }
    return y;
  }

  // ── 星级评定 ─────────────────────────────────────────────────────────────

  private drawStars(y: number): number {
    const rows: [string, string][] = [
      ['⭐⭐⭐', '步数 ≤ 最优解 × 1.2'],
      ['⭐⭐',   '步数 ≤ 最优解 × 1.5'],
      ['⭐',     '完成关卡即可'],
    ];
    for (const [stars, desc] of rows) {
      this.add.text(PAD, y, stars, { fontSize: '16px', fontFamily: FONT_FAMILY });
      this.add.text(PAD + 68, y + 1, desc, {
        fontSize: '15px', color: '#c8ccd4', fontFamily: FONT_FAMILY,
      });
      y += 28;
    }
    y += 4;
    y = this.drawLine('每关的个人最佳步数会记录在本地，不会上传。', y, '#9a9ab8', '13px');
    return y;
  }

  // ── 鸣谢 ─────────────────────────────────────────────────────────────────

  private drawCredits(y: number): number {
    y = this.drawLine(
      '本游戏的灵感来自 今林宏行（Hiroyuki Imabayashi）先生 1982 年设计发布的经典游戏《仓库番人》。', y);
    y += 4;
    y = this.drawLine(
      '关卡设计来自推箱子公开社区，目前收录的关卡由 Alberto García 先生设计。', y);
    y += 4;
    y = this.drawLine('游戏画面素材来自素材网站 Kenney.nl（CC0 授权）。', y);
    y += 4;
    y = this.drawLine('衷心感谢所有设计者的杰出贡献！', y, '#f39c12');
    return y;
  }

  // ── 免责声明 ─────────────────────────────────────────────────────────────

  private drawDisclaimer(y: number): number {
    y = this.drawLine('本游戏为个人学习项目，仅用于学习和娱乐目的。', y, '#6a6a88', '13px');
    y = this.drawLine('如果您是某个关卡的作者且希望移除，请联系我。', y, '#6a6a88', '13px');
    return y;
  }
}
