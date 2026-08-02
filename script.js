import { database } from "./firebase.js";

import {
  ref,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

const kowaiButton = document.getElementById("kowaiButton");
const message = document.getElementById("message");

const countRef = ref(database, "currentCount");

/*
  次に押せるまでの待ち時間
  3000ミリ秒 = 3秒
*/
const cooldownMilliseconds = 3000;

let isCoolingDown = false;

/*
  「怖い！」と読み上げる
*/
function speakKowai() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const voice = new SpeechSynthesisUtterance("怖い！");

  voice.lang = "ja-JP";
  voice.rate = 1.05;
  voice.pitch = 0.75;
  voice.volume = 1;

  window.speechSynthesis.speak(voice);
}

/*
  対応端末を振動させる
*/
function vibratePhone() {
  if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 180]);
  }
}

/*
  Firebaseのカウントを1増やす
*/
async function incrementCount() {
  await runTransaction(countRef, (currentValue) => {
    const currentCount =
      typeof currentValue === "number"
        ? currentValue
        : 0;

    return currentCount + 1;
  });
}

/*
  3秒の待ち時間を画面に表示する
*/
function startCooldown() {
  isCoolingDown = true;
  kowaiButton.disabled = true;

  let remainingSeconds =
    cooldownMilliseconds / 1000;

  message.textContent =
    `次に押せるまで ${remainingSeconds}秒`;

  const timer = window.setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      window.clearInterval(timer);

      isCoolingDown = false;
      kowaiButton.disabled = false;
      message.textContent = "ボタンを押せます";

      return;
    }

    message.textContent =
      `次に押せるまで ${remainingSeconds}秒`;
  }, 1000);
}

/*
  ボタンを押したとき
*/
kowaiButton.addEventListener("click", async () => {
  if (isCoolingDown) {
    return;
  }

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
    await incrementCount();

    message.textContent = "怖い！を送信しました";

    startCooldown();
  } catch (error) {
    console.error("送信エラー:", error);

    message.textContent =
      "送信できませんでした。通信状態を確認してください。";

    message.classList.add("error");

    isCoolingDown = false;
    kowaiButton.disabled = false;
  }
});