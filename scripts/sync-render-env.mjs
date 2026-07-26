// 同步本地 .env 到 Render 服务的环境变量（批量，无需在后台一个个加）
//
// 适用场景：
//   - 已在 Render 手动建好 Web Service（非 Blueprint 管控，变量全自由），或
//   - 用 Blueprint 建的服务，仅想批量填那几个 sync:false 的可编辑变量
//   （注意：Blueprint 强管控的变量如 NODE_VERSION 经 API 修改可能被 blueprint 回写还原）
//
// 用法（在你本机，有科学上网）：
//   1) Render 后台 → Account Settings → API Keys → 生成 RENDER_API_KEY
//   2) 打开你的前端服务页面，URL 形如
//        https://dashboard.render.com/web/srv-xxxxxxxxxxxxxxxx
//      其中 srv-xxx 就是 SERVICE_ID
//   3) 设置环境变量并运行：
//        set RENDER_API_KEY=xxxxxxxx      （Windows cmd）
//        set SERVICE_ID=srv-xxxxxxxx
//        node scripts/sync-render-env.mjs
//      （PowerShell 用 $env:RENDER_API_KEY=... ; $env:SERVICE_ID=...）
//
// 安全：
//   - 本脚本只读本地 .env（已被 .gitignore 排除，不会进 GitHub）
//   - 自动跳过值为 localhost / 127.0.0.1 的变量（避免把本地 NEXTAUTH_URL 推上云覆盖云端域名）
//   - 采用「合并模式」：先 GET 现有变量，再用本地值覆盖同名项，不丢失蓝图/后台已有的其他变量

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API = 'https://api.render.com/v1';

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.SERVICE_ID;

if (!apiKey || !serviceId) {
  console.error('❌ 缺少 RENDER_API_KEY 或 SERVICE_ID。请按脚本顶部注释设置后重试。');
  process.exit(1);
}

// 解析本地 .env：KEY=VALUE，忽略注释/空行，去引号
function parseEnv(file) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 找不到 ${file}`);
    process.exit(1);
  }
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    map[k] = v;
  }
  return map;
}

const localEnv = parseEnv(path.join(ROOT, '.env'));

// 跳过本地开发专属变量（避免污染云端）
const skipped = [];
const toSync = {};
for (const [k, v] of Object.entries(localEnv)) {
  if (k === 'NEXTAUTH_URL' && /localhost|127\.0\.0\.1/.test(v)) {
    skipped.push(`${k}=${v}（本地地址，已跳过）`);
    continue;
  }
  if (k === 'PORT' || k === 'NODE_ENV') continue; // 云端由平台注入
  toSync[k] = v;
}

console.log(`本地 .env 待同步变量：${Object.keys(toSync).length} 个`);
if (skipped.length) console.log('已跳过：', skipped.join('；'));

// 拉取现有变量（合并模式，不丢其他变量）
const getRes = await fetch(`${API}/services/${serviceId}/env-vars`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
if (!getRes.ok) {
  console.error('❌ 获取现有变量失败', getRes.status, await getRes.text());
  process.exit(1);
}
const existing = await getRes.json();
const merged = [...existing];
for (const [k, v] of Object.entries(toSync)) {
  const idx = merged.findIndex((e) => e.key === k);
  if (idx >= 0) merged[idx] = { ...merged[idx], value: v };
  else merged.push({ key: k, value: v });
}

const putRes = await fetch(`${API}/services/${serviceId}/env-vars`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(merged),
});
if (!putRes.ok) {
  console.error('❌ 同步失败', putRes.status, await putRes.text());
  process.exit(1);
}
console.log(`✅ 已同步 ${merged.length} 个环境变量到 Render 服务 ${serviceId}`);
console.log('⚠️ 改完变量 Render 会自动重新部署。敏感值勿提交进 git（.env 已被 .gitignore 排除）。');
