import {
  database,
  authReady
} from "./firebase.js";

import {
  ref,
  onValue,
  set,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

/*
  注意：
  このPINは、一般参加者の誤操作を防ぐための簡易機能です。
  GitHubがPublicの場合、ソースを見れば確認できるため、
  本格的なセキュリティ機能ではありません。
*/


const countNumber = document.getElementById("countNumber");
const storyTitle = document.getElementById("storyTitle");
const hostMessage = document.getElementById("hostMessage");
const eventStatus = document.getElementById("eventStatus");
const participantCount = document.getElementById("participantCount");

const startButton = document.getElementById("startButton");
const endButton = document.getElementById("endButton");
const saveButton = document.getElementById("saveButton");
const resetButton = document.getElementById("resetButton");
const csvButton = document.getElementById("csvButton");
const deleteResultsButton = document.getElementById("deleteResultsButton");

const rankingList = document.getElementById("rankingList");
const timelineChart = document.getElementById("timelineChart");

const scaryOverlay = document.getElementById("scaryOverlay");
const enableEffectsButton = document.getElementById("enableEffectsButton");
const effectStatus = document.getElementById("effectStatus");

const countRef = ref(database, "currentCount");
const resultsRef = ref(database, "results");
const eventRef = ref(database, "event");
const participantsRef = ref(database, "participants");
const currentClicksRef = ref(database, "currentClicks");

let currentCount = 0;
let currentResults = [];
let currentClicks = [];
let hasReceivedInitialCount = false;
let effectsEnabled = false;
let audioContext = null;
let eventIsActive = false;


const participantUrl = new URL("index.html", window.location.href).href;
document.getElementById("participantUrl").textContent = participantUrl;

if (window.QRCode) {
  new window.QRCode(document.getElementById("qrcode"), {
    text: participantUrl,
    width: 190,
    height: 190,
    correctLevel: window.QRCode.CorrectLevel.H
  });
}

enableEffectsButton.addEventListener("click", async () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      effectStatus.textContent = "このブラウザは効果音に対応していません";
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    effectsEnabled = true;
    enableEffectsButton.textContent = "音と「怖」演出：有効";
    enableEffectsButton.disabled = true;
    effectStatus.textContent = "参加者が押すと演出が表示されます";

    playScarySound();
  } catch (error) {
    console.error("演出有効化エラー:", error);
    effectStatus.textContent = "演出を有効にできませんでした";
  }
});

function playScarySound() {
  if (!effectsEnabled || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(210, now);
  oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.7);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.24, now + 0.025);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.74);
}

function showScaryOverlay(increase = 1) {
  if (!effectsEnabled) {
    return;
  }

  scaryOverlay.textContent = increase > 1 ? `怖 ×${increase}` : "怖";
  scaryOverlay.classList.remove("is-visible");
  void scaryOverlay.offsetWidth;
  scaryOverlay.classList.add("is-visible");

  window.setTimeout(() => {
    scaryOverlay.classList.remove("is-visible");
  }, 1200);
}

onValue(countRef, (snapshot) => {
  const value = snapshot.val();
  const newCount = typeof value === "number" ? value : 0;

  if (hasReceivedInitialCount && newCount > currentCount) {
    const increase = newCount - currentCount;
    playScarySound();
    showScaryOverlay(increase);
  }

  currentCount = newCount;
  countNumber.textContent = currentCount;
  hostMessage.textContent = "リアルタイム集計中";
  hostMessage.classList.remove("error");

  countNumber.classList.remove("count-up");
  void countNumber.offsetWidth;
  countNumber.classList.add("count-up");

  hasReceivedInitialCount = true;
});

onValue(eventRef, (snapshot) => {
  const event = snapshot.val() || {};
  eventIsActive = event.isActive === true;

  if (eventIsActive) {
    eventStatus.textContent = `進行中：${event.title || "タイトルなし"}`;
    eventStatus.classList.add("is-active");
    storyTitle.value = event.title || storyTitle.value;
  } else {
    eventStatus.textContent = "待機中";
    eventStatus.classList.remove("is-active");
  }

  startButton.disabled = eventIsActive;
  endButton.disabled = !eventIsActive;
});

onValue(participantsRef, (snapshot) => {
  const participants = snapshot.val() || {};
  participantCount.textContent = Object.keys(participants).length;
});

onValue(currentClicksRef, (snapshot) => {
  const data = snapshot.val() || {};

  currentClicks = Object.values(data)
    .map((item) => Number(item.timestamp) || 0)
    .filter((timestamp) => timestamp > 0);

  renderTimeline();
});

window.setInterval(renderTimeline, 5000);

function renderTimeline() {
  const now = Date.now();
  const bucketMilliseconds = 10000;
  const bucketCount = 6;
  const buckets = new Array(bucketCount).fill(0);

  currentClicks.forEach((timestamp) => {
    const age = now - timestamp;

    if (age < 0 || age >= bucketMilliseconds * bucketCount) {
      return;
    }

    const reverseIndex = Math.floor(age / bucketMilliseconds);
    const index = bucketCount - 1 - reverseIndex;
    buckets[index] += 1;
  });

  const max = Math.max(...buckets, 1);
  timelineChart.innerHTML = "";

  buckets.forEach((count, index) => {
    const barGroup = document.createElement("div");
    barGroup.className = "timeline-bar-group";

    const value = document.createElement("span");
    value.className = "timeline-value";
    value.textContent = String(count);

    const bar = document.createElement("div");
    bar.className = "timeline-bar";
    bar.style.height = `${Math.max(5, (count / max) * 100)}%`;

    const label = document.createElement("span");
    label.className = "timeline-label";
    label.textContent = index === bucketCount - 1
      ? "現在"
      : `-${(bucketCount - 1 - index) * 10}秒`;

    barGroup.append(value, bar, label);
    timelineChart.appendChild(barGroup);
  });
}

startButton.addEventListener("click", async () => {
  const title = storyTitle.value.trim();

  if (!title) {
    window.alert("怖い話のタイトルを入力してください。");
    storyTitle.focus();
    return;
  }

  if (!window.confirm(`「${title}」を開始しますか？`)) {
    return;
  }

  setButtonsDisabled(true);

  try {
    await update(ref(database), {
      currentCount: 0,
      currentClicks: null,
      event: {
        isActive: true,
        title,
        startedAt: Date.now()
      }
    });

    hostMessage.textContent = "話を開始しました";
  } catch (error) {
    showError("話を開始できませんでした", error);
  } finally {
    setButtonsDisabled(false);
  }
});

endButton.addEventListener("click", async () => {
  if (!window.confirm("参加者の「怖い！」ボタンを停止しますか？")) {
    return;
  }

  try {
    await update(eventRef, {
      isActive: false,
      endedAt: Date.now()
    });

    hostMessage.textContent = "話を終了しました";
  } catch (error) {
    showError("話を終了できませんでした", error);
  }
});

onValue(resultsRef, (snapshot) => {
  const resultsData = snapshot.val();
  rankingList.innerHTML = "";

  if (!resultsData) {
    currentResults = [];
    showEmptyRanking();
    return;
  }

  currentResults = Object.entries(resultsData).map(([id, result]) => ({
    id,
    title: result.title || "タイトルなし",
    count: typeof result.count === "number" ? result.count : 0,
    createdAt: result.createdAt || 0
  }));

  currentResults.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.createdAt - b.createdAt;
  });

  currentResults.forEach((result, index) => {
    rankingList.appendChild(createRankingItem(result, index));
  });
});

function createRankingItem(result, index) {
  const item = document.createElement("li");
  item.className = "ranking-item";

  const position = document.createElement("span");
  position.className = "ranking-position";
  position.textContent = getRankingMark(index);

  const information = document.createElement("div");
  information.className = "ranking-information";

  const title = document.createElement("span");
  title.className = "ranking-story-title";
  title.textContent = result.title;

  const count = document.createElement("span");
  count.className = "ranking-count";
  count.textContent = `${result.count}回`;

  information.append(title, count);
  item.append(position, information);

  return item;
}

function getRankingMark(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}位`;
}

function showEmptyRanking() {
  const item = document.createElement("li");
  item.className = "ranking-empty";
  item.textContent = "まだ保存された結果はありません";
  rankingList.appendChild(item);
}

saveButton.addEventListener("click", async () => {
  const title = storyTitle.value.trim();

  if (!title) {
    window.alert("怖い話のタイトルを入力してください。");
    storyTitle.focus();
    return;
  }

  if (!window.confirm(`「${title}」を${currentCount}回で保存しますか？`)) {
    return;
  }

  setButtonsDisabled(true);
  saveButton.textContent = "保存中…";

  try {
    const newResultRef = push(resultsRef);

    await update(ref(database), {
      [`results/${newResultRef.key}`]: {
        title,
        count: currentCount,
        createdAt: Date.now()
      },
      currentCount: 0,
      currentClicks: null,
      event: {
        isActive: false,
        title: "",
        endedAt: Date.now()
      }
    });

    storyTitle.value = "";
    hostMessage.textContent = "結果を保存し、待機状態に戻しました";
  } catch (error) {
    showError("結果を保存できませんでした", error);
  } finally {
    setButtonsDisabled(false);
    saveButton.textContent = "この話の結果を保存";
  }
});

resetButton.addEventListener("click", async () => {
  if (!window.confirm("結果を保存せず、カウントとタイムラインを0に戻しますか？")) {
    return;
  }

  try {
    await update(ref(database), {
      currentCount: 0,
      currentClicks: null
    });

    hostMessage.textContent = "カウントを0に戻しました";
  } catch (error) {
    showError("リセットできませんでした", error);
  }
});

csvButton.addEventListener("click", () => {
  if (currentResults.length === 0) {
    window.alert("保存された結果がありません。");
    return;
  }

  const rows = [
    ["順位", "タイトル", "怖い回数", "保存日時"],
    ...currentResults.map((result, index) => [
      index + 1,
      result.title,
      result.count,
      new Date(result.createdAt).toLocaleString("ja-JP")
    ])
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `kowai-ranking-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
});

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

deleteResultsButton.addEventListener("click", async () => {
  if (!window.confirm("保存済みのランキングをすべて削除しますか？")) {
    return;
  }

  if (!window.confirm("本当にすべて削除しますか？")) {
    return;
  }

  try {
    await remove(resultsRef);
    hostMessage.textContent = "ランキングの履歴を削除しました";
  } catch (error) {
    showError("ランキングを削除できませんでした", error);
  }
});

function setButtonsDisabled(disabled) {
  startButton.disabled = disabled || eventIsActive;
  endButton.disabled = disabled || !eventIsActive;
  saveButton.disabled = disabled;
  resetButton.disabled = disabled;
  csvButton.disabled = disabled;
  deleteResultsButton.disabled = disabled;
}

function showError(message, error) {
  console.error(message, error);
  hostMessage.textContent = message;
  hostMessage.classList.add("error");
}
