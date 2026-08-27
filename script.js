import {
  auth,
  database,
  signInAnonymously
} from "./firebase.js";

import {
  ref,
  onValue,
  runTransaction,
  push,
  set,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

const kowaiButton = document.getElementById("kowaiButton");
const message = document.getElementById("message");
const storyName = document.getElementById("storyName");
const participantStatus = document.getElementById("participantStatus");

const countRef = ref(database, "currentCount");
const eventRef = ref(database, "event");
const currentClicksRef = ref(database, "currentClicks");

const cooldownMilliseconds = 3000;

let isCoolingDown = false;
let isEventActive = false;
let cooldownTimer = null;

try {
  const credential = await signInAnonymously(auth);
  console.log("参加者・匿名認証成功:", credential.user.uid);
} catch (error) {
  console.error("参加者・匿名認証エラー:", error);
  kowaiButton.disabled = true;
  message.textContent =
    "Firebase認証に失敗しました。ページを再読み込みしてください。";
  message.classList.add("error");
  throw error;
}

function getDeviceId() {
  const storageKey = "kowai-device-id";
  let id = localStorage.getItem(storageKey);

  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, id);
  }

  return id;
}

async function registerPresence() {
  const user = auth.currentUser;
  if (!user) return;

  const participantRef = ref(database, `participants/${user.uid}`);

  try {
    await onDisconnect(participantRef).remove();

    await set(participantRef, {
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      deviceId: getDeviceId()
    });
  } catch (error) {
    console.warn("参加人数の登録に失敗しました:", error);
  }
}

await registerPresence();

onValue(
  eventRef,
  (snapshot) => {
    const event = snapshot.val() || {};

    isEventActive = event.isActive === true;
    storyName.textContent = event.title || "開始をお待ちください";

    if (isEventActive) {
      participantStatus.textContent =
        "怖いと思った瞬間に押してください";

      if (!isCoolingDown) {
        kowaiButton.disabled = false;
        message.textContent = "ボタンを押せます";
      }
    } else {
      participantStatus.textContent = "現在は待機中です";
      kowaiButton.disabled = true;
      message.textContent = "ホストが話を開始すると押せます";
    }
  },
  (error) => {
    console.error("イベント状態の読み込みエラー:", error);
    kowaiButton.disabled = true;
    message.textContent = "イベント情報を読み込めませんでした";
    message.classList.add("error");
  }
);

function speakKowai() {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const voice = new SpeechSynthesisUtterance("怖い！");
  voice.lang = "ja-JP";
  voice.rate = 1.05;
  voice.pitch = 0.75;
  voice.volume = 1;

  window.speechSynthesis.speak(voice);
}

function vibratePhone() {
  if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 180]);
  }
}

async function sendKowai() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("匿名認証が完了していません");
  }

  const clickRef = push(currentClicksRef);

  await Promise.all([
    runTransaction(countRef, (currentValue) => {
      const currentCount =
        typeof currentValue === "number" ? currentValue : 0;

      return currentCount + 1;
    }),

    set(clickRef, {
      timestamp: Date.now(),
      uid: user.uid,
      deviceId: getDeviceId()
    })
  ]);
}

function startCooldown() {
  isCoolingDown = true;
  kowaiButton.disabled = true;

  let remainingSeconds = cooldownMilliseconds / 1000;
  message.textContent = `次に押せるまで ${remainingSeconds}秒`;

  window.clearInterval(cooldownTimer);

  cooldownTimer = window.setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      window.clearInterval(cooldownTimer);
      isCoolingDown = false;

      if (isEventActive) {
        kowaiButton.disabled = false;
        message.textContent = "ボタンを押せます";
      } else {
        kowaiButton.disabled = true;
        message.textContent = "ホストが話を開始すると押せます";
      }

      return;
    }

    message.textContent = `次に押せるまで ${remainingSeconds}秒`;
  }, 1000);
}

kowaiButton.addEventListener("click", async () => {
  if (isCoolingDown || !isEventActive) return;

  speakKowai();
  vibratePhone();

  kowaiButton.classList.add("is-pressed");

  window.setTimeout(() => {
    kowaiButton.classList.remove("is-pressed");
  }, 180);

  kowaiButton.disabled = true;
  message.classList.remove("error");
  message.textContent = "送信中…";

  try {
    await sendKowai();
    message.textContent = "怖い！を送信しました";
    startCooldown();
  } catch (error) {
    console.error("送信エラー:", error);
    message.textContent =
      "送信できませんでした。通信状態を確認してください。";
    message.classList.add("error");
    isCoolingDown = false;
    kowaiButton.disabled = !isEventActive;
  }
});
