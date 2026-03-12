const STORAGE_KEY = "time_log_entries_v1";

const voiceText = document.getElementById("voiceText");
const parseBtn = document.getElementById("parseBtn");
const entriesList = document.getElementById("entriesList");
const summaryBox = document.getElementById("summaryBox");
const recommendationBox = document.getElementById("recommendationBox");
const chartDateInput = document.getElementById("chartDate");
const chartCanvas = document.getElementById("chartCanvas");
const chartLegend = document.getElementById("chartLegend");
const chartSummary = document.getElementById("chartSummary");
const categoryBtn = document.getElementById("categoryBtn");
const categoryModal = document.getElementById("categoryModal");
const closeCategoryModal = document.getElementById("closeCategoryModal");
const categoryRulesList = document.getElementById("categoryRulesList");
const addCategoryRuleBtn = document.getElementById("addCategoryRule");
const saveCategoryRulesBtn = document.getElementById("saveCategoryRules");
const resetCategoryRulesBtn = document.getElementById("resetCategoryRules");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

let entries = [];
let editingId = null;

const RULES_KEY = "time_log_category_rules_v1";

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
  const colonRegex = /(\d{1,2})[:](\d{2})\s*[~\-到至]\s*(\d{1,2})[:](\d{2})/;
  const colonMatch = normalized.match(colonRegex);
  if (colonMatch) {
    return {
      start: `${pad(Number(colonMatch[1]))}:${colonMatch[2]}`,
      end: `${pad(Number(colonMatch[3]))}:${colonMatch[4]}`,
      rawRegex: colonRegex,
    };
  }

  const dotRegex =
    /(\d{1,2})\s*点\s*(\d{1,2})?\s*分?\s*[~\-到至]\s*(\d{1,2})\s*点\s*(\d{1,2})?\s*分?/;
  const dotMatch = normalized.match(dotRegex);
  if (dotMatch) {
    const startMin = dotMatch[2] ? pad(Number(dotMatch[2])) : "00";
    const endMin = dotMatch[4] ? pad(Number(dotMatch[4])) : "00";
    return {
      start: `${pad(Number(dotMatch[1]))}:${startMin}`,
      end: `${pad(Number(dotMatch[3]))}:${endMin}`,
      rawRegex: dotRegex,
    };
  }

  return null;
}

function parseEntryFromText(text) {
  if (!text) return { errors: ["请输入内容"] };
  const normalized = normalizeText(text);

  const parsedTime = parseTimeRange(normalized);
  const joyValue = parseScore(normalized, "快乐");
  const meaningValue = parseScore(normalized, "意义");

  const scorePattern = /(快乐|意义)值?\s*([0-9]{1,2}|[一二三四五六七八九十])/g;
  let activityText = normalized
    .replace(parsedTime?.rawRegex || /$^/, "")
    .replace(scorePattern, "")
    .replace(/然后|接着|之后|再|并且|就是/g, "")
    .replace(/[,.，。;；]/g, " ")
    .trim();

  const errors = [];
  if (!parsedTime) errors.push("缺少时间段（例如 16:50~17:40）");
  if (!activityText) errors.push("缺少活动内容");
  if (joyValue == null) errors.push("缺少快乐值");
  if (meaningValue == null) errors.push("缺少意义值");

  if (errors.length) {
    return { errors };
  }

  return {
    start: parsedTime.start,
    end: parsedTime.end,
    activity: activityText,
    joy: joyValue,
    meaning: meaningValue,
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
    `平均快乐值 ${avgJoy.toFixed(1)}，平均意义值 ${avgMeaning.toFixed(1)}。`,
    topCategory
      ? `最常出现的类别是「${topCategory[0]}」，出现 ${topCategory[1]} 次。`
      : "暂未形成明显类别偏好。",
  ];
}

function groupByActivity(allEntries) {
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
        lastTime: 0,
      });
    }
    const item = map.get(key);
    item.totalJoy += entry.joy;
    item.totalMeaning += entry.meaning;
    item.totalDuration += entry.durationMin;
    item.count += 1;
    item.lastTime = Math.max(item.lastTime, entry.endTs);
  });
  return Array.from(map.values()).map((item) => ({
    ...item,
    avgJoy: item.totalJoy / item.count,
    avgMeaning: item.totalMeaning / item.count,
    avgDuration: item.totalDuration / item.count,
    score:
      (item.totalJoy / item.count) * 0.6 +
      (item.totalMeaning / item.count) * 0.4 +
      Math.min(item.count / 5, 1) * 0.3,
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

  const groups = groupByActivity(allEntries);
  const now = Date.now();
  const recentLimit = now - 4 * 60 * 60 * 1000;

  function pick(list) {
    const filtered = list.filter((item) => item.lastTime < recentLimit);
    return (filtered.length ? filtered : list)[0];
  }

  const sortedByJoy = [...groups].sort((a, b) => b.avgJoy - a.avgJoy);
  const sortedByMeaning = [...groups].sort((a, b) => b.avgMeaning - a.avgMeaning);
  const sortedByScore = [...groups].sort((a, b) => b.score - a.score);

  const shortHighJoy = sortedByJoy.filter(
    (item) => item.avgJoy >= 7 && item.avgDuration <= 60
  );

  const recommendations = [];

  if (avgJoy7 < 6) {
    const topJoy = pick(sortedByJoy);
    if (topJoy) {
      recommendations.push({
        title: `补一点快乐：${topJoy.activity}`,
        detail: `历史平均快乐 ${topJoy.avgJoy.toFixed(
          1
        )}，建议时长约 ${Math.round(topJoy.avgDuration)} 分钟。`,
      });
    }
  } else if (avgMeaning7 < 6) {
    const topMeaning = pick(sortedByMeaning);
    if (topMeaning) {
      recommendations.push({
        title: `补一点意义：${topMeaning.activity}`,
        detail: `历史平均意义 ${topMeaning.avgMeaning.toFixed(
          1
        )}，建议时长约 ${Math.round(topMeaning.avgDuration)} 分钟。`,
      });
    }
  } else {
    const balanced = pick(sortedByScore);
    if (balanced) {
      recommendations.push({
        title: `保持平衡：${balanced.activity}`,
        detail: `综合表现优秀，建议时长约 ${Math.round(
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
      detail: `历史意义高，适合安排在精力较好的时段。`,
    });
  }

  return recommendations.slice(0, 3);
}

function renderSummary() {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const entries7 = entries.filter((e) => e.endTs >= sevenDaysAgo);

  const summaryLines = makeSummary(entries7);
  summaryBox.innerHTML = "";
  summaryLines.forEach((line) => {
    const item = document.createElement("div");
    item.className = "summary-item";
    item.textContent = line;
    summaryBox.appendChild(item);
  });

  const recommendations = buildRecommendations(entries, entries7);
  recommendationBox.innerHTML = "";
  recommendations.forEach((rec) => {
    const card = document.createElement("div");
    card.className = "recommendation-card";
    card.innerHTML = `<strong>${rec.title}</strong><p>${rec.detail}</p>`;
    recommendationBox.appendChild(card);
  });

  renderDailyChart();
}

function renderDailyChart() {
  if (!chartCanvas) return;
  const dateStr = chartDateInput.value || todayString();
  chartDateInput.value = dateStr;

  const dailyEntries = entries.filter((entry) => entry.date === dateStr);
  const totals = {};
  dailyEntries.forEach((entry) => {
    const category = getEntryCategory(entry);
    totals[category] = (totals[category] || 0) + entry.durationMin;
  });

  const totalMinutes = Object.values(totals).reduce((sum, v) => sum + v, 0);
  chartSummary.textContent = totalMinutes
    ? `共 ${totalMinutes} 分钟`
    : "当天暂无记录";

  const ctx = chartCanvas.getContext("2d");
  const rect = chartCanvas.getBoundingClientRect();
  const size = Math.min(rect.width || 240, rect.height || 240);
  const ratio = window.devicePixelRatio || 1;
  chartCanvas.width = size * ratio;
  chartCanvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size, size);

  if (!totalMinutes) {
    ctx.fillStyle = "#6d6259";
    ctx.font = "14px 'Noto Sans SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("暂无数据", size / 2, size / 2);
    chartLegend.innerHTML = "";
    return;
  }

  const entriesListSorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const center = size / 2;
  const outer = size * 0.45;
  const thickness = size * 0.18;
  const radius = outer - thickness / 2;
  let startAngle = -Math.PI / 2;

  ctx.lineCap = "butt";
  ctx.lineWidth = thickness;

  entriesListSorted.forEach(([category, minutes]) => {
    const angle = (minutes / totalMinutes) * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = colorForCategory(category);
    ctx.arc(center, center, radius, startAngle, startAngle + angle);
    ctx.stroke();
    startAngle += angle;
  });

  ctx.fillStyle = "#1f1b16";
  ctx.font = "600 18px 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${(totalMinutes / 60).toFixed(1)}h`, center, center - 6);
  ctx.fillStyle = "#6d6259";
  ctx.font = "12px 'Noto Sans SC', sans-serif";
  ctx.fillText("总时长", center, center + 12);

  chartLegend.innerHTML = "";
  entriesListSorted.forEach(([category, minutes]) => {
    const percent = Math.round((minutes / totalMinutes) * 100);
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="legend-label">
        <span class="legend-dot" style="background:${colorForCategory(category)}"></span>
        <span>${category}</span>
      </div>
      <span>${minutes} 分钟 · ${percent}%</span>
    `;
    chartLegend.appendChild(item);
  });
}

function renderEntries() {
  entriesList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "summary-item";
    empty.textContent = "暂无记录，先从一次语音输入开始。";
    entriesList.appendChild(empty);
    return;
  }

  const sorted = [...entries].sort((a, b) => b.startTs - a.startTs);
  sorted.forEach((entry) => {
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
        <span>意义 ${entry.meaning}</span>
      </div>
    `;
    entriesList.appendChild(item);
  });
}

function setEditorFromEntry(entry) {
  if (!entry) return;
  voiceText.value = `${entry.start}~${entry.end}，${entry.activity}，快乐${entry.joy}，意义${entry.meaning}`;
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

chartDateInput.addEventListener("change", () => {
  renderDailyChart();
});

categoryBtn.addEventListener("click", () => {
  renderCategoryRulesEditor();
  categoryModal.classList.remove("hidden");
});

closeCategoryModal.addEventListener("click", () => {
  categoryModal.classList.add("hidden");
});

categoryModal.addEventListener("click", (event) => {
  if (event.target === categoryModal) {
    categoryModal.classList.add("hidden");
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

clearBtn.addEventListener("click", () => {
  if (!confirm("确定要清空所有记录吗？此操作不可撤销。")) return;
  entries = [];
  saveEntries();
  renderEntries();
  renderSummary();
});

function init() {
  chartDateInput.value = todayString();
  loadCategoryRules();
  loadEntries();
  renderEntries();
  renderSummary();
}

init();
