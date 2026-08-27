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

const kowaiButton =
  document.getElementById("kowaiButton");

const message =
  document.getElementById("message");

const storyName =
  document.getElementById("storyName");

const participantStatus =
  document.getElementById("participantStatus");

const countRef =
  ref(database, "currentCount");

const eventRef =
  ref(database, "event");

const currentClicksRef =
  ref(database, "currentClicks");

let isEventActive = false;


/* ========================================
   匿名認証
======================================== */

try {

  const credential =
    await signInAnonymously(auth);

  console.log(
    "参加者・匿名認証成功:",
    credential.user.uid
  );

} catch (error) {

  console.error(
    "参加者・匿名認証エラー:",
    error
  );

  kowaiButton.disabled = true;

  message.textContent =
    "Firebase認証に失敗しました。ページを再読み込みしてください。";

  message.classList.add("error");

  throw error;
}


/* ========================================
   端末ID
======================================== */

function getDeviceId() {

  const storageKey =
    "kowai-device-id";

  let id =
    localStorage.getItem(
      storageKey
    );

  if (!id) {

    id =
      crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(
      storageKey,
      id
    );
  }

  return id;
}


/* ========================================
   参加人数
======================================== */

async function registerPresence() {

  const user =
    auth.currentUser;

  if (!user) {
    return;
  }

  const participantRef =
    ref(
      database,
      `participants/${user.uid}`
    );

  try {

    await onDisconnect(
      participantRef
    ).remove();

    await set(
      participantRef,
      {
        connectedAt:
          Date.now(),

        lastSeen:
          Date.now(),

        deviceId:
          getDeviceId()
      }
    );

  } catch (error) {

    console.warn(
      "参加人数の登録に失敗しました:",
      error
    );

  }
}

await registerPresence();


/* ========================================
   話の開始・終了を監視
======================================== */

onValue(
  eventRef,

  (snapshot) => {

    const event =
      snapshot.val() || {};

    isEventActive =
      event.isActive === true;

    storyName.textContent =
      event.title ||
      "開始をお待ちください";


    if (isEventActive) {

      participantStatus.textContent =
        "怖いと思った瞬間に押してください";

      kowaiButton.disabled =
        false;

      message.textContent =
        "何度でも押せます";

    } else {

      participantStatus.textContent =
        "現在は待機中です";

      kowaiButton.disabled =
        true;

      message.textContent =
        "ホストが話を開始すると押せます";

    }

  },

  (error) => {

    console.error(
      "イベント状態の読み込みエラー:",
      error
    );

    kowaiButton.disabled =
      true;

    message.textContent =
      "イベント情報を読み込めませんでした";

    message.classList.add(
      "error"
    );

  }
);


/* ========================================
   「怖い！」音声
======================================== */

function speakKowai() {

  if (
    !(
      "speechSynthesis"
      in window
    )
  ) {
    return;
  }

  /*
    連打時に音声が大量に溜まらないように
    前の音声を止めて最新の「怖い！」を鳴らす
  */

  window.speechSynthesis.cancel();

  const voice =
    new SpeechSynthesisUtterance(
      "怖い！"
    );

  voice.lang =
    "ja-JP";

  voice.rate =
    1.05;

  voice.pitch =
    0.75;

  voice.volume =
    1;

  window.speechSynthesis.speak(
    voice
  );
}


/* ========================================
   バイブレーション
======================================== */

function vibratePhone() {

  if (
    "vibrate"
    in navigator
  ) {

    navigator.vibrate(
      80
    );

  }
}


/* ========================================
   「怖い！」をFirebaseへ送信
======================================== */

async function sendKowai() {

  const user =
    auth.currentUser;

  if (!user) {

    throw new Error(
      "匿名認証が完了していません"
    );

  }


  const clickRef =
    push(
      currentClicksRef
    );


  /*
    カウントとタイムラインを送信
  */

  await Promise.all([

    runTransaction(
      countRef,

      (currentValue) => {

        const currentCount =
          typeof currentValue
          === "number"
            ? currentValue
            : 0;

        return (
          currentCount + 1
        );

      }
    ),


    set(
      clickRef,
      {
        timestamp:
          Date.now(),

        uid:
          user.uid,

        deviceId:
          getDeviceId()
      }
    )

  ]);

}


/* ========================================
   ボタン
======================================== */

kowaiButton.addEventListener(
  "click",

  () => {

    if (!isEventActive) {
      return;
    }


    /*
      ボタンは無効化しない。
      そのため何度でも連打可能。
    */

    speakKowai();

    vibratePhone();


    /*
      押下アニメーション
    */

    kowaiButton.classList.remove(
      "is-pressed"
    );

    void kowaiButton.offsetWidth;

    kowaiButton.classList.add(
      "is-pressed"
    );


    window.setTimeout(
      () => {

        kowaiButton.classList.remove(
          "is-pressed"
        );

      },
      120
    );


    /*
      Firebaseへの送信は非同期で実行。
      前回の通信完了を待たないため連打可能。
    */

    sendKowai()
      .catch(
        (error) => {

          console.error(
            "送信エラー:",
            error
          );

          message.textContent =
            "一部の送信に失敗しました";

          message.classList.add(
            "error"
          );

        }
      );

  }
);
