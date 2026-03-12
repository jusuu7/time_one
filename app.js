const STORAGE_KEY = "time_log_entries_v1";

const voiceText = document.getElementById("voiceText");
const parseBtn = document.getElementById("parseBtn");
const entriesList = document.getElementById("entriesList");
const recommendationBox = document.getElementById("recommendationBox");
const aiChatLog = document.getElementById("aiChatLog");
const aiChatInput = document.getElementById("aiChatInput");
const aiChatSend = document.getElementById("aiChatSend");
const currentJoyEl = document.getElementById("currentJoy");
const currentAchievementEl = document.getElementById("currentAchievement");
const currentHintEl = document.getElementById("currentHint");
const listToggleBtn = document.getElementById("listToggleBtn");
const listCard = document.querySelector(".list-card");
const categoryBtn = document.getElementById("categoryBtn");
const categoryModal = document.getElementById("categoryModal");
const closeCategoryModal = document.getElementById("closeCategoryModal");
const categoryRulesList = document.getElementById("categoryRulesList");
const addCategoryRuleBtn = document.getElementById("addCategoryRule");
const saveCategoryRulesBtn = document.getElementById("saveCategoryRules");
const resetCategoryRulesBtn = document.getElementById("resetCategoryRules");
const moreBtn = document.getElementById("moreBtn");
const toolsModal = document.getElementById("toolsModal");
const closeToolsModal = document.getElementById("closeToolsModal");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const aiSettingsBtn = document.getElementById("aiSettingsBtn");
const aiModal = document.getElementById("aiModal");
const closeAiModal = document.getElementById("closeAiModal");
const aiEnabled = document.getElementById("aiEnabled");
const aiBaseUrl = document.getElementById("aiBaseUrl");
const aiModel = document.getElementById("aiModel");
const aiApiKey = document.getElementById("aiApiKey");
const saveAiSettingsBtn = document.getElementById("saveAiSettings");

let entries = [];
let editingId = null;
let listCollapsed = false;

const MAX_ENTRIES_DISPLAY = 20;
const LIST_COLLAPSE_KEY = "time_log_list_collapsed_v1";

const RULES_KEY = "time_log_category_rules_v1";
const AI_SETTINGS_KEY = "time_log_ai_settings_v1";
const AI_CHAT_KEY = "time_log_ai_chat_v1";
const DEFAULT_AI_SETTINGS = {
  enabled: false,
  baseUrl: "",
  model: "",
  apiKey: "",
};

let aiSettings = { ...DEFAULT_AI_SETTINGS };
let aiRecommendRequestId = 0;
let aiChatHistory = [];

const CATEGORY_COLORS = {
  学习: "#2f7a6d",
  工作: "#d06a57",
  运动: "#5683b3",
  社交: "#c082a6",
  休息: "#8aa07c",
  娱乐: "#e0b452",
  生活: "#8b6f5b",
  其他: "#a39a92",
};

const DEFAULT_RULES = [
  {
    name: "学习",
    keywords: ["学习", "编程", "写代码", "代码", "课程", "复习", "练习", "阅读", "看书", "研究", "笔记", "AI"],
  },
  {
    name: "工作",
    keywords: ["工作", "会议", "项目", "客户", "汇报", "报告", "需求", "设计", "交付", "出差"],
  },
  {
    name: "运动",
    keywords: ["运动", "跑步", "健身", "瑜伽", "游泳", "球", "骑行", "徒步", "拉伸"],
  },
  {
    name: "社交",
    keywords: ["朋友", "聚会", "聊天", "约会", "家人", "见面", "交流", "同事"],
  },
  {
    name: "休息",
    keywords: ["午休", "休息", "放松", "发呆", "冥想", "躺", "补觉"],
  },
  {
    name: "生活",
    keywords: ["吃饭", "用餐", "早餐", "午餐", "晚餐", "夜宵", "看电视", "睡觉", "吃维生素", "家务", "收拾", "打扫", "洗澡", "购物", "买菜", "通勤", "做饭", "洗衣"],
  },
  {
    name: "娱乐",
    keywords: ["看体育频道", "看新闻", "刷短视频", "美食", "下午茶", "咖啡", "奶茶", "电影", "游戏", "追剧", "音乐"],
  },
  {
    name: "其他",
    keywords: [],
  },
];

let categoryRules = [];

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function computeDuration(start, end) {
  if (!start || !end) return null;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function buildDateTime(dateStr, timeStr, addDays = 0) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d + addDays, h, min, 0, 0);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(entries)) entries = [];
  } catch (err) {
    entries = [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function deepCopyRules(rules) {
  return rules.map((rule) => ({
    name: rule.name,
    keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : [],
  }));
}

function sanitizeRules(rules) {
  const cleaned = [];
  const seen = new Set();
  rules.forEach((rule) => {
    if (!rule) return;
    const name = String(rule.name || "").trim();
    if (!name || seen.has(name)) return;
    const keywords = Array.isArray(rule.keywords)
      ? rule.keywords.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    cleaned.push({ name, keywords });
    seen.add(name);
  });
  const fallback = cleaned.find((rule) => rule.name === "其他");
  const withoutFallback = cleaned.filter((rule) => rule.name !== "其他");
  return [
    ...withoutFallback,
    fallback || { name: "其他", keywords: [] },
  ];
}

function loadCategoryRules() {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) {
      categoryRules = deepCopyRules(DEFAULT_RULES);
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid rules");
    categoryRules = sanitizeRules(parsed);
  } catch (err) {
    categoryRules = deepCopyRules(DEFAULT_RULES);
  }
}

function saveCategoryRules() {
  localStorage.setItem(RULES_KEY, JSON.stringify(categoryRules));
}

function normalizeAiSettings(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: Boolean(payload.enabled),
    baseUrl: String(payload.baseUrl || "").trim(),
    model: String(payload.model || "").trim(),
    apiKey: String(payload.apiKey || "").trim(),
  };
}

function loadAiSettings() {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) {
      aiSettings = { ...DEFAULT_AI_SETTINGS };
      return;
    }
    const parsed = JSON.parse(raw);
    aiSettings = normalizeAiSettings(parsed);
  } catch (err) {
    aiSettings = { ...DEFAULT_AI_SETTINGS };
  }
}

function saveAiSettings() {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
}

function loadAiChatHistory() {
  try {
    const raw = localStorage.getItem(AI_CHAT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      aiChatHistory = [];
      return;
    }
    aiChatHistory = parsed
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .map((item) => ({
        role: item.role,
        content: String(item.content || "").trim(),
        ts: Number(item.ts || Date.now()),
      }))
      .filter((item) => item.content);
  } catch (err) {
    aiChatHistory = [];
  }
}

function saveAiChatHistory() {
  localStorage.setItem(AI_CHAT_KEY, JSON.stringify(aiChatHistory.slice(-40)));
}

function resetCategoryRules() {
  categoryRules = deepCopyRules(DEFAULT_RULES);
  saveCategoryRules();
  renderCategoryRulesEditor();
  renderEntries();
  renderSummary();
}

function resetInput() {
  editingId = null;
  if (voiceText) voiceText.value = "";
}

function normalizeText(text) {
  return text
    .replace(/～/g, "~")
    .replace(/－|—|–/g, "-")
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .trim();
}

function chineseToNumber(token) {
  const map = {
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
  };
  if (map[token]) return map[token];
  if (token.length === 2 && token[0] === "十") {
    return 10 + (map[token[1]] || 0);
  }
  if (token.length === 2 && token[1] === "十") {
    return (map[token[0]] || 0) * 10;
  }
  return null;
}

function parseScore(normalized, keyword) {
  const regex = new RegExp(
    `${keyword}值?\\s*([0-9]{1,2}|[一二三四五六七八九十])`
  );
  const match = normalized.match(regex);
  if (!match) return null;
  const token = match[1];
  let value = null;
  if (/^[0-9]{1,2}$/.test(token)) {
    value = Number(token);
  } else {
    value = chineseToNumber(token);
  }
  if (value == null) return null;
  return Math.min(10, Math.max(1, value));
}

function inferCategory(text) {
  if (!text) return "其他";
  const normalized = String(text).trim();
  for (const rule of categoryRules) {
    if (!rule.keywords || !rule.keywords.length) continue;
    for (const keyword of rule.keywords) {
      if (!keyword) continue;
      if (normalized.includes(keyword)) return rule.name;
    }
  }
  return "其他";
}

function parseTimeRange(normalized) {
  const colonRegex = /(\d{1,2})[:：](\d{1,2})\s*[~\-到至]\s*(\d{1,2})[:：](\d{1,2})/;
  const colonMatch = normalized.match(colonRegex);
  if (colonMatch) {
    return {
      start: `${pad(Number(colonMatch[1]))}:${pad(Number(colonMatch[2]))}`,
      end: `${pad(Number(colonMatch[3]))}:${pad(Number(colonMatch[4]))}`,
      rawRegex: colonRegex,
    };
  }

  const tokenPattern =
    "(\\d{1,2}:\\d{1,2}|\\d{1,2}点半|\\d{1,2}点\\d{1,2}分?|\\d{1,2}\\.\\d{1,2}分?|\\d{1,2}点)";
  const relaxedRegex = new RegExp(
    `${tokenPattern}\\s*[~\\-到至]\\s*${tokenPattern}`
  );
  const relaxedMatch = normalized.match(relaxedRegex);
  if (relaxedMatch) {
    const start = parseTimeToken(relaxedMatch[1]);
    const end = parseTimeToken(relaxedMatch[2]);
    if (start && end) {
      return {
        start,
        end,
        rawText: relaxedMatch[0],
      };
    }
  }

  return null;
}

function parseTimeToken(token) {
  if (!token) return null;
  let raw = String(token).trim();
  raw = raw.replace(/：/g, ":");
  raw = raw.replace(/\s+/g, "");
  raw = raw.replace(/点半/g, "点30分");

  if (/^\d{1,2}:\d{1,2}$/.test(raw)) {
    const [h, m] = raw.split(":").map(Number);
    if (m >= 0 && m < 60) {
      return `${pad(h)}:${pad(m)}`;
    }
    return null;
  }

  if (raw.includes("点")) {
    const [hourPart, restPart = ""] = raw.split("点");
    const hour = Number(hourPart);
    if (!Number.isFinite(hour)) return null;
    let minute = 0;
    let rest = restPart.replace("分", "");
    if (rest.includes(".")) {
      const parts = rest.split(".");
      rest = parts[1] || parts[0] || "0";
    }
    if (rest) {
      minute = Number(rest);
    }
    if (minute >= 0 && minute < 60) {
      return `${pad(hour)}:${pad(minute)}`;
    }
    return null;
  }

  if (/^\d{1,2}\.\d{1,2}分?$/.test(raw)) {
    const [h, mRaw] = raw.replace("分", "").split(".");
    const hour = Number(h);
    const minute = Number(mRaw);
    if (Number.isFinite(hour) && minute >= 0 && minute < 60) {
      return `${pad(hour)}:${pad(minute)}`;
    }
  }

  if (/^\d{1,2}$/.test(raw)) {
    const hour = Number(raw);
    return `${pad(hour)}:00`;
  }

  return null;
}

function parseEntryFromText(text) {
  if (!text) return { errors: ["请输入内容"] };
  const normalized = normalizeText(text);

  const parsedTime = parseTimeRange(normalized);
  const joyValue = parseScore(normalized, "快乐");
  const achievementValue =
    parseScore(normalized, "价值") ??
    parseScore(normalized, "成就") ??
    parseScore(normalized, "意义");

  const scorePattern =
    /(快乐|价值|成就|意义)值?\s*([0-9]{1,2}|[一二三四五六七八九十])/g;
  let activityText = normalized;
  if (parsedTime?.rawRegex) {
    activityText = activityText.replace(parsedTime.rawRegex, "");
  } else if (parsedTime?.rawText) {
    activityText = activityText.replace(parsedTime.rawText, "");
  }
  activityText = activityText
    .replace(scorePattern, "")
    .replace(/然后|接着|之后|再|并且|就是/g, "")
    .replace(/[,.，。;；]/g, " ")
    .trim();

  const errors = [];
  if (!parsedTime) errors.push("缺少时间段（例如 16:50~17:40）");
  if (!activityText) errors.push("缺少活动内容");
  if (joyValue == null) errors.push("缺少快乐");
  if (achievementValue == null) errors.push("缺少价值");

  if (errors.length) {
    return { errors };
  }

  return {
    start: parsedTime.start,
    end: parsedTime.end,
    activity: activityText,
    joy: joyValue,
    meaning: achievementValue,
  };
}

function getEntryCategory(entry) {
  if (!entry) return "其他";
  return inferCategory(entry.activity || "") || entry.category || "其他";
}

function colorForCategory(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

function keywordsToString(keywords) {
  return (keywords || []).join("，");
}

function parseKeywordsInput(value) {
  return String(value || "")
    .split(/[,\n，、;；]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function renderCategoryRulesEditor() {
  if (!categoryRulesList) return;
  categoryRulesList.innerHTML = "";

  categoryRules.forEach((rule, index) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.dataset.index = String(index);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = rule.name;
    nameInput.placeholder = "类别名称";
    nameInput.dataset.field = "name";

    const keywordsInput = document.createElement("input");
    keywordsInput.type = "text";
    keywordsInput.value = keywordsToString(rule.keywords);
    keywordsInput.placeholder = "关键词，用逗号分隔";
    keywordsInput.dataset.field = "keywords";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost";
    deleteBtn.textContent = "删除";
    deleteBtn.dataset.action = "delete-rule";

    if (rule.name === "其他") {
      nameInput.disabled = true;
      keywordsInput.disabled = true;
      keywordsInput.placeholder = "默认兜底";
      deleteBtn.disabled = true;
    }

    row.append(nameInput, keywordsInput, deleteBtn);
    categoryRulesList.appendChild(row);
  });

  const hint = document.createElement("div");
  hint.className = "rule-hint";
  hint.textContent = "关键词支持中文短语，按顺序匹配；命中即归类。";
  categoryRulesList.appendChild(hint);
}

function collectRulesFromEditor() {
  const rows = [...categoryRulesList.querySelectorAll(".rule-row")];
  const rules = rows
    .map((row) => {
      const nameInput = row.querySelector('input[data-field="name"]');
      const keywordsInput = row.querySelector('input[data-field="keywords"]');
      if (!nameInput || !keywordsInput) return null;
      const name = nameInput.value.trim();
      const keywords = parseKeywordsInput(keywordsInput.value);
      return { name, keywords };
    })
    .filter(Boolean);
  return sanitizeRules(rules);
}

function makeSummary(entries7) {
  if (!entries7.length) {
    return [
      "近 7 天暂无记录。",
      "先录入 1-2 条活动，系统会开始给出建议。",
    ];
  }
  const totalMinutes = entries7.reduce((sum, e) => sum + e.durationMin, 0);
  const avgJoy =
    entries7.reduce((sum, e) => sum + e.joy, 0) / entries7.length;
  const avgMeaning =
    entries7.reduce((sum, e) => sum + e.meaning, 0) / entries7.length;

  const categoryCount = {};
  entries7.forEach((e) => {
    const category = getEntryCategory(e);
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

  return [
    `近 7 天共记录 ${entries7.length} 次，总时长 ${(
      totalMinutes / 60
    ).toFixed(1)} 小时。`,
    `平均当下快乐 ${avgJoy.toFixed(1)}，平均长期价值 ${avgMeaning.toFixed(1)}。`,
    topCategory
      ? `最常出现的类别是「${topCategory[0]}」，出现 ${topCategory[1]} 次。`
      : "暂未形成明显类别偏好。",
  ];
}

function getEntryWeightByRecency(endTs, nowTs) {
  const ageHours = Math.max(0, (nowTs - Number(endTs || 0)) / (60 * 60 * 1000));
  const ageDays = ageHours / 24;
  if (ageDays <= 7) {
    return 5 + ((7 - ageDays) / 7) * 5;
  }
  return Math.max(0.3, 2.8 / (ageDays + 1));
}

function getActivityRecencyBoost(lastTime, nowTs) {
  const ageHours = Math.max(0, (nowTs - Number(lastTime || 0)) / (60 * 60 * 1000));
  return Math.max(0, 1.2 - ageHours / 72);
}

function groupByActivityWeighted(allEntries, nowTs = Date.now()) {
  const weekCutoff = nowTs - 7 * 24 * 60 * 60 * 1000;
  const map = new Map();
  allEntries.forEach((entry) => {
    const category = getEntryCategory(entry);
    const key = `${entry.activity}::${category}`;
    if (!map.has(key)) {
      map.set(key, {
        activity: entry.activity,
        category,
        totalJoy: 0,
        totalMeaning: 0,
        totalDuration: 0,
        count: 0,
        weekWeight: 0,
        totalWeight: 0,
        lastTime: 0,
      });
    }
    const item = map.get(key);
    const weight = getEntryWeightByRecency(entry.endTs, nowTs);
    item.totalJoy += entry.joy * weight;
    item.totalMeaning += entry.meaning * weight;
    item.totalDuration += entry.durationMin * weight;
    item.count += weight;
    item.totalWeight += weight;
    if (entry.endTs >= weekCutoff) item.weekWeight += weight;
    item.lastTime = Math.max(item.lastTime, entry.endTs);
  });
  return Array.from(map.values()).map((item) => ({
    ...item,
    avgJoy: item.totalJoy / item.count,
    avgMeaning: item.totalMeaning / item.count,
    avgDuration: item.totalDuration / item.count,
    recencyBoost: getActivityRecencyBoost(item.lastTime, nowTs),
    score:
      (item.totalJoy / item.count) * 0.6 +
      (item.totalMeaning / item.count) * 0.4 +
      Math.min(item.weekWeight / 16, 1.2) +
      Math.min(item.totalWeight / 20, 0.8) +
      getActivityRecencyBoost(item.lastTime, nowTs),
  }));
}

function buildRecommendations(allEntries, entries7) {
  if (!allEntries.length) {
    return [
      {
        title: "从一次简单活动开始",
        detail: "先记录一个 30-60 分钟的轻松活动，系统会开始建立偏好画像。",
      },
    ];
  }

  const avgJoy7 =
    entries7.reduce((sum, e) => sum + e.joy, 0) / (entries7.length || 1);
  const avgMeaning7 =
    entries7.reduce((sum, e) => sum + e.meaning, 0) / (entries7.length || 1);

  const now = Date.now();
  const groups = groupByActivityWeighted(allEntries, now);
  const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const preferredGroups = groups.some((item) => item.lastTime >= weekCutoff)
    ? groups.filter((item) => item.lastTime >= weekCutoff)
    : groups;

  function pick(list) {
    return list[0];
  }

  const sortedByJoy = [...preferredGroups].sort(
    (a, b) => b.avgJoy - a.avgJoy || b.score - a.score
  );
  const sortedByMeaning = [...preferredGroups].sort(
    (a, b) => b.avgMeaning - a.avgMeaning || b.score - a.score
  );
  const sortedByScore = [...preferredGroups].sort((a, b) => b.score - a.score);

  const shortHighJoy = sortedByJoy.filter(
    (item) => item.avgJoy >= 7 && item.avgDuration <= 60
  );

  const recommendations = [];

  const { recent24, prev24, deltaJoy, deltaAchievement } = getComparisonStats();
  const compareHint = buildComparisonHint(recent24, prev24, deltaJoy, deltaAchievement);

  if (deltaJoy <= -3) {
    const topJoy = pick(sortedByJoy);
    if (topJoy) {
      recommendations.push({
        title: `补充快乐：${topJoy.activity}`,
        detail: `${compareHint} 历史平均快乐 ${topJoy.avgJoy.toFixed(
          1
        )}，建议时长约 ${Math.round(topJoy.avgDuration)} 分钟。`,
      });
    }
  } else if (deltaAchievement <= -3) {
    const topMeaning = pick(sortedByMeaning);
    if (topMeaning) {
      recommendations.push({
        title: `补一点价值：${topMeaning.activity}`,
        detail: `${compareHint} 历史平均价值 ${topMeaning.avgMeaning.toFixed(
          1
        )}，建议时长约 ${Math.round(topMeaning.avgDuration)} 分钟。`,
      });
    }
  } else if (avgJoy7 < 6) {
    const topJoy = pick(sortedByJoy);
    if (topJoy) {
      recommendations.push({
        title: `补充快乐：${topJoy.activity}`,
        detail: `${compareHint} 历史平均快乐 ${topJoy.avgJoy.toFixed(
          1
        )}，建议时长约 ${Math.round(topJoy.avgDuration)} 分钟。`,
      });
    }
  } else if (avgMeaning7 < 6) {
    const topMeaning = pick(sortedByMeaning);
    if (topMeaning) {
      recommendations.push({
        title: `补一点价值：${topMeaning.activity}`,
        detail: `${compareHint} 历史平均价值 ${topMeaning.avgMeaning.toFixed(
          1
        )}，建议时长约 ${Math.round(topMeaning.avgDuration)} 分钟。`,
      });
    }
  } else {
    const balanced = pick(sortedByScore);
    if (balanced) {
      recommendations.push({
        title: `保持平衡：${balanced.activity}`,
        detail: `${compareHint} 综合表现优秀，建议时长约 ${Math.round(
          balanced.avgDuration
        )} 分钟。`,
      });
    }
  }

  if (shortHighJoy.length) {
    const quick = pick(shortHighJoy);
    recommendations.push({
      title: `快速提升：${quick.activity}`,
      detail: `高快乐且短时，适合插入 20-60 分钟的空档。`,
    });
  }

  const topMeaning = pick(sortedByMeaning);
  if (topMeaning) {
    recommendations.push({
      title: `长期收益：${topMeaning.activity}`,
      detail: `历史价值高，适合安排在精力较好的时段。`,
    });
  }

  return recommendations.slice(0, 3);
}

function renderSummary() {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const entries7 = entries.filter((e) => e.endTs >= sevenDaysAgo);

  const recommendations = buildRecommendations(entries, entries7);
  recommendationBox.innerHTML = "";
  recommendations.forEach((rec) => {
    const card = document.createElement("div");
    card.className = "recommendation-card";
    card.innerHTML = `<strong>${rec.title}</strong><p>${rec.detail}</p>`;
    recommendationBox.appendChild(card);
  });

  renderAiRecommendation(entries7, recommendations);

  renderCurrentStats();
}

function renderCurrentStats() {
  if (!currentJoyEl || !currentAchievementEl) return;
  const { recent24, prev24, deltaJoy, deltaAchievement } = getComparisonStats();
  currentJoyEl.textContent = Math.round(recent24.joy);
  currentAchievementEl.textContent = Math.round(recent24.achievement);
  if (currentHintEl) {
    currentHintEl.textContent = buildComparisonHint(
      recent24,
      prev24,
      deltaJoy,
      deltaAchievement
    );
  }
}

function getWindowStats(startTs, endTs) {
  const filtered = entries.filter(
    (entry) => entry.endTs >= startTs && entry.endTs < endTs
  );
  const joy = filtered.reduce((sum, entry) => sum + Number(entry.joy || 0), 0);
  const achievement = filtered.reduce(
    (sum, entry) => sum + Number(entry.meaning || 0),
    0
  );
  return { joy, achievement, count: filtered.length };
}

function getComparisonStats() {
  const now = Date.now();
  const recent24 = getWindowStats(now - 24 * 60 * 60 * 1000, now);
  const prev24 = getWindowStats(now - 48 * 60 * 60 * 1000, now - 24 * 60 * 60 * 1000);
  const deltaJoy = recent24.joy - prev24.joy;
  const deltaAchievement = recent24.achievement - prev24.achievement;
  return { recent24, prev24, deltaJoy, deltaAchievement };
}

function buildComparisonHint(recent24, prev24, deltaJoy, deltaAchievement) {
  if (recent24.count === 0 && prev24.count === 0) {
    return "近 24 小时暂无记录。";
  }
  if (prev24.count === 0) {
    return "这是过去 24 小时的首次统计。";
  }
  const joyLabel =
    deltaJoy >= 0 ? `当下快乐 +${deltaJoy}` : `当下快乐 ${deltaJoy}`;
  const achLabel =
    deltaAchievement >= 0
      ? `长期价值 +${deltaAchievement}`
      : `长期价值 ${deltaAchievement}`;
  return `较昨日同时间：${joyLabel}，${achLabel}。`;
}

function isAiConfigured() {
  return (
    aiSettings.enabled &&
    Boolean(aiSettings.baseUrl) &&
    Boolean(aiSettings.model) &&
    Boolean(aiSettings.apiKey)
  );
}

function fillAiSettingsForm() {
  if (!aiEnabled || !aiBaseUrl || !aiModel || !aiApiKey) return;
  aiEnabled.value = aiSettings.enabled ? "true" : "false";
  aiBaseUrl.value = aiSettings.baseUrl;
  aiModel.value = aiSettings.model;
  aiApiKey.value = aiSettings.apiKey;
}

function collectAiSettingsFromForm() {
  return normalizeAiSettings({
    enabled: aiEnabled?.value === "true",
    baseUrl: aiBaseUrl?.value || "",
    model: aiModel?.value || "",
    apiKey: aiApiKey?.value || "",
  });
}

function parseAiResponse(content) {
  const raw = String(content || "").trim();
  if (!raw) return null;

  let candidate = raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) candidate = fenced[1].trim();

  const attempts = [candidate];
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (objectMatch) attempts.push(objectMatch[0]);

  for (const item of attempts) {
    try {
      const parsed = JSON.parse(item);
      const title = String(parsed.title || "").trim();
      const detail = String(parsed.detail || "").trim();
      if (title && detail) return { title, detail };
    } catch (err) {
      continue;
    }
  }

  return {
    title: "AI 推荐",
    detail: raw.replace(/\s+/g, " ").slice(0, 120),
  };
}

function pushAiChatMessage(role, content) {
  const text = String(content || "").trim();
  if (!text) return;
  aiChatHistory.push({ role, content: text, ts: Date.now() });
  aiChatHistory = aiChatHistory.slice(-40);
  saveAiChatHistory();
}

function renderAiChat() {
  if (!aiChatLog) return;
  aiChatLog.innerHTML = "";

  if (!aiChatHistory.length) {
    const empty = document.createElement("div");
    empty.className = "ai-chat-item assistant";
    empty.innerHTML =
      `<div class="ai-chat-meta">AI助手</div><div>你好，我会基于你的记录提供建议。可以问我“现在做什么更合适？”</div>`;
    aiChatLog.appendChild(empty);
    return;
  }

  aiChatHistory.forEach((item) => {
    const bubble = document.createElement("div");
    bubble.className = `ai-chat-item ${item.role}`;
    const roleName = item.role === "user" ? "你" : "AI助手";
    bubble.innerHTML = `<div class="ai-chat-meta">${roleName}</div><div>${item.content}</div>`;
    aiChatLog.appendChild(bubble);
  });

  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

function buildAiRecordContext() {
  const sortedEntries = [...entries].sort((a, b) => b.endTs - a.endTs).slice(0, 30);
  const lines = sortedEntries.map((entry) => {
    const category = getEntryCategory(entry);
    return `${entry.date} ${entry.start}-${entry.end} ${entry.activity} 类别:${category} 快乐:${entry.joy} 价值:${entry.meaning} 时长:${entry.durationMin}`;
  });
  const { recent24, prev24 } = getComparisonStats();
  const weekCount = entries.filter(
    (entry) => entry.endTs >= Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;
  return {
    lines,
    weekCount,
    recent24,
    prev24,
  };
}

async function requestAiChatReply(userMessage) {
  if (!isAiConfigured()) {
    return "请先在“更多设置 -> AI 设置”中配置接口地址、模型和 API Key。";
  }
  const endpoint = `${aiSettings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const context = buildAiRecordContext();
  const recentHistory = aiChatHistory.slice(-12).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const contextPrompt = [
    `最近7天记录数:${context.weekCount}`,
    `近24小时快乐:${context.recent24.joy} 价值:${context.recent24.achievement}`,
    `较前24小时快乐变化:${context.recent24.joy - context.prev24.joy} 价值变化:${
      context.recent24.achievement - context.prev24.achievement
    }`,
    "最近记录：",
    ...context.lines,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是时间记录助手，回答简洁、具体，优先基于用户最近一周记录与最近24小时状态给建议。",
        },
        { role: "system", content: contextPrompt },
        ...recentHistory,
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI 请求失败(${response.status})`);
  }
  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  return content || "我暂时没有得到有效回复，你可以换个问法再试。";
}

async function requestAiRecommendation(entries7, localRecommendations) {
  if (!isAiConfigured()) return null;
  const endpoint = `${aiSettings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const sortedEntries = [...entries].sort((a, b) => b.endTs - a.endTs).slice(0, 24);
  const historyLines = sortedEntries.map((entry) => {
    const category = getEntryCategory(entry);
    return `${entry.date} ${entry.start}-${entry.end} ${entry.activity} 类别:${category} 快乐:${entry.joy} 价值:${entry.meaning} 时长:${entry.durationMin}`;
  });
  const { recent24, prev24 } = getComparisonStats();
  const localTop = localRecommendations?.[0]
    ? `${localRecommendations[0].title} | ${localRecommendations[0].detail}`
    : "无";
  const weekCount = entries7.length;

  const prompt = [
    "你是一个时间管理教练，请只返回 JSON，不要返回其它文字。",
    "JSON格式: {\"title\":\"推荐活动标题\",\"detail\":\"一句话理由和建议时长\"}",
    `最近7天记录数: ${weekCount}`,
    `近24小时快乐:${recent24.joy} 价值:${recent24.achievement}`,
    `较前24小时快乐变化:${recent24.joy - prev24.joy} 价值变化:${recent24.achievement - prev24.achievement}`,
    `本地算法推荐: ${localTop}`,
    "最近记录如下：",
    ...historyLines,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "你只输出JSON对象，字段固定为title和detail，语言使用简体中文，detail不要超过40字。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI 请求失败(${response.status})`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return parseAiResponse(content);
}

function renderAiRecommendation(entries7, localRecommendations) {
  if (!recommendationBox) return;
  const previous = recommendationBox.querySelector(".ai-recommendation");
  if (previous) previous.remove();
  if (!isAiConfigured()) return;

  const card = document.createElement("div");
  card.className = "recommendation-card ai-recommendation";
  const loadingTitle = document.createElement("strong");
  loadingTitle.textContent = "AI 推荐生成中";
  const loadingDetail = document.createElement("p");
  loadingDetail.textContent = "正在根据近一周记录和最新趋势分析。";
  card.append(loadingTitle, loadingDetail);
  recommendationBox.appendChild(card);

  const requestId = ++aiRecommendRequestId;
  requestAiRecommendation(entries7, localRecommendations)
    .then((result) => {
      if (requestId !== aiRecommendRequestId) return;
      if (!result) return;
      card.innerHTML = "";
      const titleEl = document.createElement("strong");
      titleEl.textContent = result.title;
      const detailEl = document.createElement("p");
      detailEl.textContent = result.detail;
      card.append(titleEl, detailEl);
    })
    .catch((err) => {
      if (requestId !== aiRecommendRequestId) return;
      card.innerHTML = "";
      const titleEl = document.createElement("strong");
      titleEl.textContent = "AI 推荐不可用";
      const detailEl = document.createElement("p");
      detailEl.textContent = "请检查 AI 设置、API Key 或接口跨域权限。";
      card.append(titleEl, detailEl);
    });
}

function renderEntries() {
  entriesList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "summary-item";
    empty.textContent = "暂无记录，先写下一条记录吧。";
    entriesList.appendChild(empty);
    return;
  }

  const sorted = [...entries].sort((a, b) => b.startTs - a.startTs);
  sorted.slice(0, MAX_ENTRIES_DISPLAY).forEach((entry) => {
    const category = getEntryCategory(entry);
    const item = document.createElement("div");
    item.className = "entry-item";
    item.innerHTML = `
      <div class="entry-head">
        <div>
          <strong>${entry.activity}</strong>
          <span class="badge">${category}</span>
        </div>
        <div class="entry-actions">
          <button class="ghost" data-action="edit" data-id="${entry.id}">编辑</button>
          <button class="ghost" data-action="delete" data-id="${entry.id}">删除</button>
        </div>
      </div>
      <div class="entry-tags">
        <span>${entry.date}</span>
        <span>${entry.start} - ${entry.end}</span>
        <span>用时 ${entry.durationMin} 分钟</span>
        <span>快乐 ${entry.joy}</span>
        <span>价值 ${entry.meaning}</span>
      </div>
    `;
    entriesList.appendChild(item);
  });
}

function setEditorFromEntry(entry) {
  if (!entry) return;
  voiceText.value = `${entry.start}~${entry.end} ${entry.activity} 快乐${entry.joy} 价值${entry.meaning}`;
}

function handleParseAndSave() {
  const parsed = parseEntryFromText(voiceText.value);
  if (parsed.errors && parsed.errors.length) {
    alert(parsed.errors.join("\n"));
    return;
  }

  const existing = editingId
    ? entries.find((entry) => entry.id === editingId)
    : null;
  const date = existing?.date || todayString();
  const durationMin = computeDuration(parsed.start, parsed.end);
  if (!durationMin || durationMin <= 0) {
    alert("结束时间必须晚于开始时间（或跨天）。");
    return;
  }

  const startDate = buildDateTime(date, parsed.start);
  const endDate =
    timeToMinutes(parsed.end) >= timeToMinutes(parsed.start)
      ? buildDateTime(date, parsed.end)
      : buildDateTime(date, parsed.end, 1);

  const payload = {
    id: editingId || generateId(),
    date,
    start: parsed.start,
    end: parsed.end,
    activity: parsed.activity,
    category: inferCategory(parsed.activity) || "其他",
    joy: parsed.joy,
    meaning: parsed.meaning,
    durationMin,
    startTs: startDate.getTime(),
    endTs: endDate.getTime(),
    updatedAt: Date.now(),
  };

  if (editingId) {
    entries = entries.map((entry) => (entry.id === editingId ? payload : entry));
  } else {
    entries.push(payload);
  }

  saveEntries();
  renderEntries();
  renderSummary();
  resetInput();
}

entriesList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute("data-action");
  const id = target.getAttribute("data-id");
  if (!action || !id) return;

  if (action === "delete") {
    if (!confirm("确定要删除这条记录吗？")) return;
    entries = entries.filter((entry) => entry.id !== id);
    saveEntries();
    renderEntries();
    renderSummary();
    return;
  }

  if (action === "edit") {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    editingId = id;
    setEditorFromEntry(entry);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

parseBtn.addEventListener("click", () => {
  handleParseAndSave();
});

categoryBtn.addEventListener("click", () => {
  renderCategoryRulesEditor();
  categoryModal.classList.remove("hidden");
  if (toolsModal) toolsModal.classList.add("hidden");
});

closeCategoryModal.addEventListener("click", () => {
  categoryModal.classList.add("hidden");
});

categoryModal.addEventListener("click", (event) => {
  if (event.target === categoryModal) {
    categoryModal.classList.add("hidden");
  }
});

moreBtn.addEventListener("click", () => {
  toolsModal.classList.remove("hidden");
});

closeToolsModal.addEventListener("click", () => {
  toolsModal.classList.add("hidden");
});

toolsModal.addEventListener("click", (event) => {
  if (event.target === toolsModal) {
    toolsModal.classList.add("hidden");
  }
});

aiSettingsBtn?.addEventListener("click", () => {
  if (toolsModal) toolsModal.classList.add("hidden");
  fillAiSettingsForm();
  aiModal?.classList.remove("hidden");
});

closeAiModal?.addEventListener("click", () => {
  aiModal?.classList.add("hidden");
});

aiModal?.addEventListener("click", (event) => {
  if (event.target === aiModal) {
    aiModal.classList.add("hidden");
  }
});

saveAiSettingsBtn?.addEventListener("click", () => {
  aiSettings = collectAiSettingsFromForm();
  saveAiSettings();
  aiModal?.classList.add("hidden");
  renderSummary();
  alert("AI 设置已保存。");
});

async function handleAiChatSend() {
  const question = String(aiChatInput?.value || "").trim();
  if (!question) return;
  aiChatInput.value = "";
  pushAiChatMessage("user", question);
  renderAiChat();

  const loadingText = "正在思考中...";
  pushAiChatMessage("assistant", loadingText);
  renderAiChat();

  try {
    const answer = await requestAiChatReply(question);
    if (aiChatHistory.length && aiChatHistory[aiChatHistory.length - 1].content === loadingText) {
      aiChatHistory.pop();
    }
    pushAiChatMessage("assistant", answer);
  } catch (err) {
    if (aiChatHistory.length && aiChatHistory[aiChatHistory.length - 1].content === loadingText) {
      aiChatHistory.pop();
    }
    pushAiChatMessage("assistant", "连接失败，请检查 AI 设置或稍后重试。");
  }

  renderAiChat();
}

aiChatSend?.addEventListener("click", () => {
  handleAiChatSend();
});

aiChatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleAiChatSend();
  }
});

categoryRulesList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "delete-rule") return;
  const row = target.closest(".rule-row");
  if (!row) return;
  const index = Number(row.dataset.index);
  if (Number.isNaN(index)) return;
  categoryRules.splice(index, 1);
  renderCategoryRulesEditor();
});

addCategoryRuleBtn.addEventListener("click", () => {
  const newRule = { name: "新类别", keywords: [] };
  const fallbackIndex = categoryRules.findIndex((rule) => rule.name === "其他");
  let newIndex = categoryRules.length;
  if (fallbackIndex === -1) {
    categoryRules.push(newRule);
    newIndex = categoryRules.length - 1;
  } else {
    categoryRules.splice(fallbackIndex, 0, newRule);
    newIndex = fallbackIndex;
  }
  renderCategoryRulesEditor();
  const rows = categoryRulesList.querySelectorAll(".rule-row");
  const targetRow = rows[newIndex];
  if (targetRow) {
    const input = targetRow.querySelector('input[data-field="name"]');
    if (input) input.focus();
  }
});

saveCategoryRulesBtn.addEventListener("click", () => {
  categoryRules = collectRulesFromEditor();
  saveCategoryRules();
  renderEntries();
  renderSummary();
  categoryModal.classList.add("hidden");
});

resetCategoryRulesBtn.addEventListener("click", () => {
  if (!confirm("确定要恢复默认规则吗？")) return;
  resetCategoryRules();
});

exportBtn.addEventListener("click", () => {
  if (toolsModal) toolsModal.classList.add("hidden");
  const exportEntries = entries.map((entry) => ({
    ...entry,
    category: getEntryCategory(entry),
  }));
  const blob = new Blob([JSON.stringify(exportEntries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `time-log-${todayString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => {
  if (toolsModal) toolsModal.classList.add("hidden");
  if (importFile) importFile.click();
});

function parseChineseDate(dateStr) {
  const raw = String(dateStr || "").trim();
  if (!raw) return null;
  const now = new Date();
  const year = now.getFullYear();
  const match = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*号?/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split("/").map(Number);
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  return null;
}

function normalizeTimeString(timeStr) {
  if (!timeStr) return "";
  let raw = String(timeStr).trim();
  raw = raw.replace(/：/g, ":");
  raw = raw.replace(/^:+/, "");
  if (/^:\d{2}:\d{2}$/.test(raw)) {
    raw = raw.slice(1);
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    const parts = raw.split(":");
    raw = `${parts[0]}:${parts[1]}`;
  }
  const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${pad(hour)}:${pad(minute)}`;
}

function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function parseDateTimeTokenFromImport(token, fallbackDate) {
  if (!token) return null;
  let raw = String(token).trim();
  let hasDate = false;
  let date = fallbackDate || todayString();
  const now = new Date();
  const md = raw.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*号?\s*(.*)$/);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = `${now.getFullYear()}-${pad(month)}-${pad(day)}`;
      hasDate = true;
      raw = md[3] || "";
    }
  }
  const time = normalizeTimeString(raw);
  if (!time) return null;
  return { date, time, hasDate };
}

function parseImportedTimeRange(timeText, fallbackDate) {
  if (!timeText) return null;
  const normalized = String(timeText)
    .replace(/[～~\-－—–至]/g, "到")
    .replace(/\s+/g, "")
    .trim();
  const parts = normalized.split("到");
  if (parts.length < 2) return null;
  const startToken = parts[0];
  const endToken = parts.slice(1).join("到");
  const startParsed = parseDateTimeTokenFromImport(startToken, fallbackDate);
  if (!startParsed) return null;
  const endParsed = parseDateTimeTokenFromImport(endToken, startParsed.date);
  if (!endParsed) return null;

  let endDate = endParsed.date;
  if (!endParsed.hasDate && timeToMinutes(endParsed.time) < timeToMinutes(startParsed.time)) {
    endDate = addDaysToDateString(startParsed.date, 1);
  }

  return {
    start: startParsed.time,
    end: endParsed.time,
    startDate: startParsed.date,
    endDate,
    nextContextDate: endDate,
  };
}

function normalizeImportedEntry(item, contextDate) {
  if (!item || typeof item !== "object") {
    return { entry: null, nextContextDate: contextDate };
  }

  const parsedItemDate =
    parseChineseDate(item.date) ||
    parseChineseDate(item.day) ||
    parseChineseDate(item.date_str) ||
    contextDate ||
    todayString();

  let start = normalizeTimeString(item.start || item.start_time || "");
  let end = normalizeTimeString(item.end || item.end_time || "");
  let startDateStr = parsedItemDate;
  let endDateStr = parsedItemDate;
  let nextContextDate = contextDate || parsedItemDate;

  if ((!start || !end) && item.time) {
    const parsedRange = parseImportedTimeRange(item.time, parsedItemDate);
    if (parsedRange) {
      start = parsedRange.start;
      end = parsedRange.end;
      startDateStr = parsedRange.startDate;
      endDateStr = parsedRange.endDate;
      nextContextDate = parsedRange.nextContextDate;
    }
  }

  const activity = String(item.activity || item.content || item.event || "").trim();
  const joyRaw =
    item.joy ?? item.happy ?? item.happiness ?? item.快乐 ?? item["快乐"];
  const meaningRaw =
    item.meaning ??
    item.value ??
    item.long_term_value ??
    item.longTermValue ??
    item.longtermvalue ??
    item.achievement ??
    item.成就 ??
    item["成就"] ??
    item.价值 ??
    item["价值"];
  const joy = Number(joyRaw);
  const meaning = Number(meaningRaw);

  if (!activity || !start || !end || !Number.isFinite(joy) || !Number.isFinite(meaning)) {
    return { entry: null, nextContextDate };
  }

  const durationMin = computeDuration(start, end);
  if (!durationMin || durationMin <= 0) {
    return { entry: null, nextContextDate };
  }

  const startDate = buildDateTime(startDateStr, start);
  let endDate = buildDateTime(endDateStr, end);
  if (endDate.getTime() <= startDate.getTime()) {
    endDate = buildDateTime(endDateStr, end, 1);
    endDateStr = addDaysToDateString(endDateStr, 1);
  }

  const entry = {
    id: item.id || generateId(),
    date: startDateStr,
    start,
    end,
    activity,
    category: inferCategory(activity) || item.category || "其他",
    joy,
    meaning,
    durationMin,
    startTs: item.startTs || startDate.getTime(),
    endTs: item.endTs || endDate.getTime(),
    updatedAt: Date.now(),
  };

  return {
    entry,
    nextContextDate: endDateStr || startDateStr || nextContextDate,
  };
}

function extractImportItems(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const candidates = [parsed.records, parsed.entries, parsed.data, parsed.items, parsed.list];
  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }
  return null;
}

function normalizeImportedEntries(items) {
  const normalized = [];
  let contextDate = todayString();
  let skipped = 0;
  items.forEach((item) => {
    const result = normalizeImportedEntry(item, contextDate);
    if (result?.entry) {
      normalized.push(result.entry);
    } else {
      skipped += 1;
    }
    if (result?.nextContextDate) {
      contextDate = result.nextContextDate;
    }
  });
  return { normalized, skipped };
}

function sortEntriesByStart(entriesList) {
  return [...entriesList].sort((a, b) => a.startTs - b.startTs);
}

function normalizeImportedPayload(parsed) {
  const items = extractImportItems(parsed);
  if (!items) return { normalized: [], skipped: 0 };
  const { normalized, skipped } = normalizeImportedEntries(items);
  return { normalized: sortEntriesByStart(normalized), skipped };
}

importFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      const { normalized, skipped } = normalizeImportedPayload(parsed);

      if (!normalized.length) {
        alert("导入失败：没有可用记录。");
        return;
      }

      const overwrite = confirm("是否覆盖当前记录？点击取消将合并导入。");
      if (overwrite) {
        entries = normalized;
      } else {
        const existingIds = new Set(entries.map((e) => e.id));
        const merged = [...entries];
        normalized.forEach((item) => {
          if (existingIds.has(item.id)) {
            merged.push({ ...item, id: generateId() });
          } else {
            merged.push(item);
          }
        });
        entries = merged;
      }

      saveEntries();
      renderEntries();
      renderSummary();
      const total = normalized.length + skipped;
      alert(`导入完成：成功 ${normalized.length} 条，跳过 ${skipped} 条（共 ${total} 条）。`);
    } catch (err) {
      alert("导入失败：文件格式不正确。");
    } finally {
      importFile.value = "";
    }
  };
  reader.readAsText(file);
});

clearBtn.addEventListener("click", () => {
  if (toolsModal) toolsModal.classList.add("hidden");
  if (!confirm("确定要清空所有记录吗？此操作不可撤销。")) return;
  entries = [];
  saveEntries();
  renderEntries();
  renderSummary();
});

function init() {
  loadCategoryRules();
  loadAiSettings();
  loadAiChatHistory();
  loadEntries();
  listCollapsed = localStorage.getItem(LIST_COLLAPSE_KEY) === "1";
  applyListCollapse();
  fillAiSettingsForm();
  renderAiChat();
  renderEntries();
  renderSummary();
}

init();

function applyListCollapse() {
  if (!listCard || !listToggleBtn) return;
  listCard.classList.toggle("list-collapsed", listCollapsed);
  listToggleBtn.textContent = listCollapsed ? "展开" : "收起";
}

if (listToggleBtn) {
  listToggleBtn.addEventListener("click", () => {
    listCollapsed = !listCollapsed;
    localStorage.setItem(LIST_COLLAPSE_KEY, listCollapsed ? "1" : "0");
    applyListCollapse();
  });
}
