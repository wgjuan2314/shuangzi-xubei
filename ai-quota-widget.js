// AI 额度小组件 — Scriptable
// 在 iPhone 桌面/负一屏显示 Claude Code + Codex 的 5小时/本周 剩余额度与重置倒计时
// 纯手机本地运行，token 存 Keychain，Mac 关机也能用
//
// 首次使用：见 SETUP.md。简述——
//   1) 在 Mac 跑 export-tokens.sh，复制输出的 JSON
//   2) 把 JSON 拷到 iPhone 剪贴板
//   3) 在 Scriptable 里运行本脚本一次，自动导入 Keychain
//   4) 桌面添加「中号」Scriptable 组件，选本脚本

// ============ 配置 ============
const KC_CLAUDE = "aiquota.claude"; // Keychain key：{accessToken, refreshToken, expiresAt}
const KC_CODEX = "aiquota.codex";   // Keychain key：{accessToken, refreshToken, accountId}
const CACHE_FILE = "aiquota-cache.json"; // 拉取失败时回退用的本地缓存

// 社区已知的 OAuth client_id 与刷新端点（token 过期时用 refresh_token 续期）
// 注：非官方，若刷新失败请按 SETUP.md 重新导入 token
const CLAUDE_REFRESH_URL = "https://console.anthropic.com/v1/oauth/token";
const CLAUDE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CODEX_REFRESH_URL = "https://auth.openai.com/oauth/token";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

// ============ Keychain 读写 ============
function kcGet(key) {
  if (!Keychain.contains(key)) return null;
  try { return JSON.parse(Keychain.get(key)); } catch (e) { return null; }
}
function kcSet(key, obj) { Keychain.set(key, JSON.stringify(obj)); }

// ============ 首次引导：从剪贴板导入 token ============
// 期望剪贴板里是 export-tokens.sh 输出的 JSON：
// { "claude": {accessToken, refreshToken, expiresAt}, "codex": {accessToken, refreshToken, accountId} }
async function bootstrapIfNeeded() {
  // 至少配置了一个平台就放行（支持只用 Claude 或只用 Codex）
  if (kcGet(KC_CLAUDE)?.accessToken || kcGet(KC_CODEX)?.accessToken) return true;
  let raw = Pasteboard.paste();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
  let imported = [];
  if (parsed?.claude?.accessToken) { kcSet(KC_CLAUDE, parsed.claude); imported.push("Claude"); }
  if (parsed?.codex?.accessToken) { kcSet(KC_CODEX, parsed.codex); imported.push("Codex"); }
  if (imported.length > 0) {
    let a = new Alert();
    a.title = "导入成功";
    a.message = `已导入：${imported.join(" + ")}。现在可以添加桌面组件了。`;
    a.addAction("好");
    await a.present();
    return true;
  }
  let a = new Alert();
  a.title = "需要先导入 token";
  a.message = "请在 Mac 运行 export-tokens.sh，复制输出的 JSON 到本机剪贴板，再运行本脚本一次。";
  a.addAction("好");
  await a.present();
  return false;
}

// ============ token 刷新 ============
async function refreshClaude(tok) {
  let req = new Request(CLAUDE_REFRESH_URL);
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: tok.refreshToken,
    client_id: CLAUDE_CLIENT_ID,
  });
  let r = await req.loadJSON();
  if (!r || !r.access_token) throw new Error("Claude 刷新失败");
  let updated = {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || tok.refreshToken,
    expiresAt: Date.now() + (r.expires_in || 3600) * 1000,
  };
  kcSet(KC_CLAUDE, updated);
  return updated;
}
async function refreshCodex(tok) {
  let req = new Request(CODEX_REFRESH_URL);
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: tok.refreshToken,
    client_id: CODEX_CLIENT_ID,
  });
  let r = await req.loadJSON();
  if (!r || !r.access_token) throw new Error("Codex 刷新失败");
  let updated = {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || tok.refreshToken,
    accountId: tok.accountId,
  };
  kcSet(KC_CODEX, updated);
  return updated;
}

// ============ 拉取额度 ============
// 返回统一结构：{ fiveHour:{remain, resetAt}, sevenDay:{remain, resetAt} }
// remain 为剩余百分比(0-100)，resetAt 为毫秒时间戳
// 包装：未配置返回 null（不显示该列），失败返回 {error:true}（回退缓存），成功返回数据
async function getClaude() {
  if (!kcGet(KC_CLAUDE)?.accessToken) return null;
  try { return await fetchClaude(); } catch (e) { return { error: true }; }
}
async function getCodex() {
  if (!kcGet(KC_CODEX)?.accessToken) return null;
  try { return await fetchCodex(); } catch (e) { return { error: true }; }
}

async function fetchClaude() {
  let tok = kcGet(KC_CLAUDE);
  if (!tok) throw new Error("无 Claude token");
  // 过期则先刷新
  if (tok.expiresAt && Date.now() > tok.expiresAt - 60000) {
    try { tok = await refreshClaude(tok); } catch (e) { /* 用旧 token 试一次 */ }
  }
  const call = async (t) => {
    let req = new Request("https://api.anthropic.com/api/oauth/usage");
    req.headers = {
      "Authorization": "Bearer " + t.accessToken,
      "anthropic-beta": "oauth-2025-04-20",
      "User-Agent": "claude-cli",
    };
    let resp = await req.loadJSON();
    let status = req.response ? req.response.statusCode : 200;
    return { resp, status };
  };
  let { resp, status } = await call(tok);
  if (status === 401) { tok = await refreshClaude(tok); ({ resp, status } = await call(tok)); }
  return {
    fiveHour: { remain: 100 - (resp.five_hour?.utilization ?? 0), resetAt: Date.parse(resp.five_hour?.resets_at) },
    sevenDay: { remain: 100 - (resp.seven_day?.utilization ?? 0), resetAt: Date.parse(resp.seven_day?.resets_at) },
  };
}
async function fetchCodex() {
  let tok = kcGet(KC_CODEX);
  if (!tok) throw new Error("无 Codex token");
  const call = async (t) => {
    let req = new Request("https://chatgpt.com/backend-api/wham/usage");
    req.headers = {
      "Authorization": "Bearer " + t.accessToken,
      "chatgpt-account-id": t.accountId,
      "User-Agent": "codex-cli",
    };
    let resp = await req.loadJSON();
    let status = req.response ? req.response.statusCode : 200;
    return { resp, status };
  };
  let { resp, status } = await call(tok);
  if (status === 401) { tok = await refreshCodex(tok); ({ resp, status } = await call(tok)); }
  let rl = resp.rate_limit || {};
  return {
    fiveHour: { remain: 100 - (rl.primary_window?.used_percent ?? 0), resetAt: (rl.primary_window?.reset_at ?? 0) * 1000 },
    sevenDay: { remain: 100 - (rl.secondary_window?.used_percent ?? 0), resetAt: (rl.secondary_window?.reset_at ?? 0) * 1000 },
  };
}

// ============ 本地缓存（拉取失败时回退） ============
function cachePath() {
  let fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}
function saveCache(data) {
  try { FileManager.local().writeString(cachePath(), JSON.stringify(data)); } catch (e) {}
}
function loadCache() {
  try {
    let fm = FileManager.local();
    if (fm.fileExists(cachePath())) return JSON.parse(fm.readString(cachePath()));
  } catch (e) {}
  return null;
}

// ============ 工具：颜色 / 倒计时文案 ============
function colorFor(remain) {
  if (remain > 50) return new Color("#34c759"); // 绿
  if (remain > 20) return new Color("#ff9f0a"); // 橙
  return new Color("#ff3b30");                  // 红
}
function resetText(resetAt, isWeekly) {
  // 5小时显示「几点恢复」，周显示「哪天恢复」，最直接
  if (!resetAt || isNaN(resetAt)) return "";
  if (resetAt - Date.now() <= 0) return "即将恢复";
  let d = new Date(resetAt);
  if (isWeekly) {
    return `${d.getMonth() + 1}月${d.getDate()}日 恢复`;
  }
  let hh = String(d.getHours()).padStart(2, "0");
  let mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} 恢复`;
}
function agoText(ts) {
  let m = Math.floor((Date.now() - ts) / 60000);
  if (m <= 0) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  return `${Math.floor(m / 60)}小时前`;
}

// ============ 渲染：进度条图片 ============
function barImage(remain, w, h) {
  let ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  // 底槽
  let track = new Path();
  track.addRoundedRect(new Rect(0, 0, w, h), h / 2, h / 2);
  ctx.addPath(track);
  ctx.setFillColor(new Color("#ffffff", 0.18));
  ctx.fillPath();
  // 填充（剩余比例）
  let fw = Math.max(h, w * Math.max(0, Math.min(100, remain)) / 100);
  let fill = new Path();
  fill.addRoundedRect(new Rect(0, 0, fw, h), h / 2, h / 2);
  ctx.addPath(fill);
  ctx.setFillColor(colorFor(remain));
  ctx.fillPath();
  return ctx.getImage();
}

// ============ 渲染：单个 Agent 列 ============
function renderColumn(stack, title, accent, data, barW) {
  let col = stack.addStack();
  col.layoutVertically();
  col.spacing = 4;

  let t = col.addText(title);
  t.font = Font.semiboldSystemFont(14);
  t.textColor = accent;

  const row = (label, d, isWeekly) => {
    let line = col.addStack();
    line.layoutHorizontally();
    line.centerAlignContent();
    line.spacing = 5;
    let lb = line.addText(label);
    lb.font = Font.systemFont(11);
    lb.textColor = new Color("#ffffff", 0.8);
    lb.size = new Size(20, 0);
    let img = line.addImage(barImage(d.remain, barW, 8));
    img.imageSize = new Size(barW, 8);
    let pct = line.addText(`${Math.round(d.remain)}%`);
    pct.font = Font.semiboldSystemFont(12);
    pct.textColor = Color.white();
    // 重置文案
    let rt = col.addText("   " + resetText(d.resetAt, isWeekly));
    rt.font = Font.systemFont(9);
    rt.textColor = new Color("#ffffff", 0.5);
  };
  row("5h", data.fiveHour, false);
  row("周", data.sevenDay, true);
}

// ============ 渲染：组件 ============
// platforms: [{title, accent, data}]，按数量自适应单列/双列
function buildWidget(platforms, updatedAt, offline) {
  let w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1e");
  w.setPadding(12, 14, 12, 14);

  // 顶部：标题 + 时间戳
  let header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  let title = header.addText("AI 额度");
  title.font = Font.boldSystemFont(13);
  title.textColor = Color.white();
  header.addSpacer();
  let ts = header.addText((offline ? "⚠ " : "⟳ ") + agoText(updatedAt));
  ts.font = Font.systemFont(10);
  ts.textColor = new Color("#ffffff", 0.5);

  w.addSpacer(8);

  let body = w.addStack();
  body.layoutHorizontally();
  body.topAlignContent();

  if (platforms.length === 1) {
    // 单列：居中、进度条更宽占满
    body.addSpacer();
    renderColumn(body, platforms[0].title, platforms[0].accent, platforms[0].data, 130);
    body.addSpacer();
  } else {
    // 双列：中间竖分隔
    renderColumn(body, platforms[0].title, platforms[0].accent, platforms[0].data, 70);
    body.addSpacer();
    let divider = body.addStack();
    divider.size = new Size(1, 60);
    divider.backgroundColor = new Color("#ffffff", 0.12);
    body.addSpacer();
    renderColumn(body, platforms[1].title, platforms[1].accent, platforms[1].data, 70);
  }

  return w;
}

// ============ 主流程 ============
async function main() {
  let ok = await bootstrapIfNeeded();
  if (!ok) { Script.complete(); return; }

  // 各拉各的：null=未配置(不显示)，{error}=失败(回退缓存)，否则=成功
  let [claudeRes, codexRes] = await Promise.all([getClaude(), getCodex()]);
  let cache = loadCache() || {};
  let offline = false;

  // 解析：成功用新数据，失败回退该平台缓存并标记离线
  const resolve = (res, cached) => {
    if (res === null) return null;
    if (res.error) { offline = true; return cached || null; }
    return res;
  };
  let claude = resolve(claudeRes, cache.claude);
  let codex = resolve(codexRes, cache.codex);

  // 写缓存：成功的平台更新，失败的保留旧值
  let claudeOk = claudeRes && !claudeRes.error;
  let codexOk = codexRes && !codexRes.error;
  let newCache = {
    claude: claudeOk ? claudeRes : cache.claude,
    codex: codexOk ? codexRes : cache.codex,
    updatedAt: (claudeOk || codexOk) ? Date.now() : (cache.updatedAt || Date.now()),
  };
  saveCache(newCache);

  // 收集可显示的平台
  let platforms = [];
  if (claude) platforms.push({ title: "Claude", accent: new Color("#d97757"), data: claude });
  if (codex) platforms.push({ title: "Codex", accent: new Color("#10a37f"), data: codex });

  if (platforms.length === 0) {
    let w = new ListWidget();
    w.backgroundColor = new Color("#1c1c1e");
    let t = w.addText("未配置 token 或暂无数据\n运行脚本导入 token");
    t.font = Font.systemFont(11); t.textColor = Color.white();
    Script.setWidget(w); Script.complete(); return;
  }

  let updatedAt = newCache.updatedAt;
  let widget = buildWidget(platforms, updatedAt, offline);
  widget.refreshAfterDate = new Date(Date.now() + 12 * 60 * 1000); // 12 分钟后刷新

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium(); // 在 App 内运行时预览
  }
  Script.complete();
}

await main();
