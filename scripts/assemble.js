#!/usr/bin/env node
// 模拟 CI 的 "Assemble deploy directory" 步骤，用于本地预览
const fs   = require('fs');
const path = require('path');

const root   = path.resolve(__dirname, '..');
const deploy = path.join(root, 'deploy');

// 递归复制目录
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 清空并重建 deploy/
fs.rmSync(deploy, { recursive: true, force: true });
fs.mkdirSync(deploy);

// 平台首页
fs.copyFileSync(path.join(root, 'index.html'), path.join(deploy, 'index.html'));

// 各游戏
for (const game of ['block-puzzle', 'hungry-loong', 'brick-breaker', '2048', 'sokoban']) {
  const src = path.join(root, game, 'dist');
  const dst = path.join(deploy, game);
  if (fs.existsSync(src)) {
    copyDir(src, dst);
    console.log(`✓ ${game}`);
  } else {
    console.warn(`⚠ ${game}/dist not found, skipping`);
  }
}

console.log('\nAssembled → deploy/  (serve with: npx serve deploy)');
