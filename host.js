import {
  auth,
  database,
  signInWithEmailAndPassword,
  signOut
} from "./firebase.js";

import {
  ref,
  onValue,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

/* =========================
   管理者設定
========================= */

const HOST_PIN = "4837";

const HOST_UID =
  "ERZb5quIuSQW1iMeaco5AZZt5Jn1";

/* =========================
   HTML
========================= */

const pinGate =
  document.getElementById("pinGate");

const pinInput =
  document.getElementById("pinInput");

const hostEmail =
  document.getElementById("hostEmail");

const hostPassword =
  document.getElementById("hostPassword");

const hostLoginButton =
  document.getElementById("hostLoginButton");

const pinMessage =
  document.getElementById("pinMessage");

const hostScreen =
  document.getElementById("hostScreen");

const countNumber =
  document.getElementById("countNumber");

const storyTitle =
  document.getElementById("storyTitle");

const hostMessage =
  document.getElementById("hostMessage");

const eventStatus =
  document.getElementById("eventStatus");

const participantCount =
  document.getElementById("participantCount");

const startButton =
  document.getElementById("startButton");

const endButton =
  document.getElementById("endButton");

const saveButton =
  document.getElementById("saveButton");

const resetButton =
  document.getElementById("resetButton");

const csvButton =
  document.getElementById("csvButton");

const deleteResultsButton =
  document.getElementById("deleteResultsButton");

const rankingList =
  document.getElementById("rankingList");

const timelineChart =
  document.getElementById("timelineChart");

const scaryOverlay =
  document.getElementById("scaryOverlay");

const enableEffectsButton =
  document.getElementById("enableEffectsButton");

const effectStatus =
  document.getElementById("effectStatus");

/* =========================
   Firebase
========================= */

const countRef =
  ref(database, "currentCount");

const resultsRef =
  ref(database, "results");

const eventRef =
  ref(database, "event");

const participantsRef =
  ref(database, "participants");

const currentClicksRef =
  ref(database, "currentClicks");

/* =========================
   状態
========================= */

let currentCount = 0;
let currentResults = [];
let currentClicks = [];

let hasReceivedInitialCount = false;
let effectsEnabled = false;
let audioContext = null;
let eventIsActive = false;

let hostStarted = false;

/*
  ログイン前は管理ボタンを無効化
*/
setManagementEnabled(false);

console.log(
  "host.js 読み込み完了。ホスト認証待ちです。"
);

/* =========================
   ホストログイン
========================= */

hostLoginButton.addEventListener(
  "click",
  async () => {
    pinMessage.classList.remove("error");

    const enteredPin =
      pinInput.value.trim();

    const email =
      hostEmail.value.trim();

    const password =
      hostPassword.value;

    if (enteredPin !== HOST_PIN) {
      pinMessage.textContent =
        "管理者PINが違います";

      pinMessage.classList.add("error");
      pinInput.focus();

      return;
    }

    if (!email || !password) {
      pinMessage.textContent =
        "メールアドレスとパスワードを入力してください";

      pinMessage.classList.add("error");

      return;
    }

    hostLoginButton.disabled = true;
    hostLoginButton.textContent =
      "ログイン中…";

    pinMessage.textContent =
      "Firebaseで管理者認証しています…";

    try {
      /*
        ホスト画面では匿名認証しない。
        直接メール＋パスワードで認証する。
      */
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      if (
        credential.user.uid !==
        HOST_UID
      ) {
        await signOut(auth);

        throw new Error(
          "このアカウントにはホスト権限がありません"
        );
      }

      console.log(
        "ホスト認証成功:",
        credential.user.uid
      );

      pinMessage.textContent =
        "認証成功";

      unlockHostScreen();

      startHostApp();

    } catch (error) {
      console.error(
        "ホスト認証エラー:",
        error
      );

      pinMessage.textContent =
        loginErrorMessage(error);

      pinMessage.classList.add("error");

    } finally {
      hostLoginButton.disabled = false;
      hostLoginButton.textContent =
        "ホストとしてログイン";
    }
  }
);

/*
  Enterキーでもログイン
*/
[
  pinInput,
  hostEmail,
  hostPassword
].forEach((element) => {
  element.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        hostLoginButton.click();
      }
    }
  );
});

function unlockHostScreen() {
  pinGate.hidden = true;

  hostScreen.classList.remove(
    "is-locked"
  );
}

function loginErrorMessage(error) {
  const code =
    error?.code || "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "メールアドレスまたはパスワードが違います";
  }

  if (
    code === "auth/too-many-requests"
  ) {
    return "ログイン試行が多すぎます。少し待ってから再試行してください";
  }

  return "ホスト認証に失敗しました";
}

/* =========================
   ホスト機能開始
========================= */

function startHostApp() {
  if (hostStarted) {
    return;
  }

  if (
    !auth.currentUser ||
    auth.currentUser.uid !==
      HOST_UID
  ) {
    console.error(
      "ホストUIDではないため管理機能を開始しません"
    );

    return;
  }

  hostStarted = true;

  setManagementEnabled(true);

  setupQrCode();
  setupEffects();
  setupRealtimeListeners();
  setupManagementActions();

  hostMessage.textContent =
    "Firebaseに接続しました";

  console.log(
    "ホスト管理機能を開始しました"
  );
}

/* =========================
   QRコード
========================= */

function setupQrCode() {
  const participantUrl =
    new URL(
      "index.html",
      window.location.href
    ).href;

  document.getElementById(
    "participantUrl"
  ).textContent =
    participantUrl;

  const qrcode =
    document.getElementById(
      "qrcode"
    );

  qrcode.innerHTML = "";

  if (window.QRCode) {
    new window.QRCode(
      qrcode,
      {
        text: participantUrl,
        width: 190,
        height: 190,
        correctLevel:
          window.QRCode.CorrectLevel.H
      }
    );
  }
}

/* =========================
   演出
========================= */

function setupEffects() {
  enableEffectsButton.addEventListener(
    "click",
    async () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContextClass) {
          effectStatus.textContent =
            "このブラウザは効果音に対応していません";

          return;
        }

        if (!audioContext) {
          audioContext =
            new AudioContextClass();
        }

        if (
          audioContext.state ===
          "suspended"
        ) {
          await audioContext.resume();
        }

        effectsEnabled = true;

        enableEffectsButton.textContent =
          "音と「怖」演出：有効";

        enableEffectsButton.disabled =
          true;

        effectStatus.textContent =
          "参加者が押すと演出が表示されます";

        playScarySound();

      } catch (error) {
        console.error(
          "演出有効化エラー:",
          error
        );

        effectStatus.textContent =
          "演出を有効にできませんでした";
      }
    }
  );
}

function playScarySound() {
  if (
    !effectsEnabled ||
    !audioContext
  ) {
    return;
  }

  const now =
    audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator.type = "sawtooth";

  oscillator.frequency.setValueAtTime(
    210,
    now
  );

  oscillator.frequency
    .exponentialRampToValueAtTime(
      48,
      now + 0.7
    );

  gainNode.gain.setValueAtTime(
    0.0001,
    now
  );

  gainNode.gain
    .exponentialRampToValueAtTime(
      0.24,
      now + 0.025
    );

  gainNode.gain
    .exponentialRampToValueAtTime(
      0.0001,
      now + 0.72
    );

  oscillator.connect(gainNode);
  gainNode.connect(
    audioContext.destination
  );

  oscillator.start(now);
  oscillator.stop(now + 0.74);
}

function showScaryOverlay(
  increase = 1
) {
  if (!effectsEnabled) {
    return;
  }

  scaryOverlay.textContent =
    increase > 1
      ? `怖 ×${increase}`
      : "怖";

  scaryOverlay.classList.remove(
    "is-visible"
  );

  void scaryOverlay.offsetWidth;

  scaryOverlay.classList.add(
    "is-visible"
  );

  window.setTimeout(
    () => {
      scaryOverlay.classList.remove(
        "is-visible"
      );
    },
    1200
  );
}

/* =========================
   Firebase監視
========================= */

function setupRealtimeListeners() {
  onValue(
    countRef,
    (snapshot) => {
      const value =
        snapshot.val();

      const newCount =
        typeof value === "number"
          ? value
          : 0;

      if (
        hasReceivedInitialCount &&
        newCount > currentCount
      ) {
        const increase =
          newCount -
          currentCount;

        playScarySound();

        showScaryOverlay(
          increase
        );
      }

      currentCount =
        newCount;

      countNumber.textContent =
        currentCount;

      hostMessage.textContent =
        "リアルタイム集計中";

      hostMessage.classList.remove(
        "error"
      );

      countNumber.classList.remove(
        "count-up"
      );

      void countNumber.offsetWidth;

      countNumber.classList.add(
        "count-up"
      );

      hasReceivedInitialCount =
        true;
    },
    (error) => {
      showError(
        "カウントを読み込めませんでした",
        error
      );
    }
  );

  onValue(
    eventRef,
    (snapshot) => {
      const event =
        snapshot.val() || {};

      eventIsActive =
        event.isActive === true;

      if (eventIsActive) {
        eventStatus.textContent =
          `進行中：${event.title || "タイトルなし"}`;

        eventStatus.classList.add(
          "is-active"
        );

        storyTitle.value =
          event.title ||
          storyTitle.value;

      } else {
        eventStatus.textContent =
          "待機中";

        eventStatus.classList.remove(
          "is-active"
        );
      }

      updateStartEndButtons();
    },
    (error) => {
      showError(
        "イベント状態を読み込めませんでした",
        error
      );
    }
  );

  onValue(
    participantsRef,
    (snapshot) => {
      const participants =
        snapshot.val() || {};

      participantCount.textContent =
        Object.keys(
          participants
        ).length;
    },
    (error) => {
      console.error(
        "参加人数読み込みエラー:",
        error
      );
    }
  );

  onValue(
    currentClicksRef,
    (snapshot) => {
      const data =
        snapshot.val() || {};

      currentClicks =
        Object.values(data)
          .map(
            (item) =>
              Number(
                item.timestamp
              ) || 0
          )
          .filter(
            (timestamp) =>
              timestamp > 0
          );

      renderTimeline();
    },
    (error) => {
      console.error(
        "タイムライン読み込みエラー:",
        error
      );
    }
  );

  onValue(
    resultsRef,
    (snapshot) => {
      const resultsData =
        snapshot.val();

      rankingList.innerHTML = "";

      if (!resultsData) {
        currentResults = [];

        showEmptyRanking();

        return;
      }

      currentResults =
        Object.entries(
          resultsData
        ).map(
          ([id, result]) => ({
            id,
            title:
              result.title ||
              "タイトルなし",
            count:
              typeof result.count ===
              "number"
                ? result.count
                : 0,
            createdAt:
              result.createdAt ||
              0
          })
        );

      currentResults.sort(
        (a, b) => {
          if (
            b.count !==
            a.count
          ) {
            return (
              b.count -
              a.count
            );
          }

          return (
            a.createdAt -
            b.createdAt
          );
        }
      );

      currentResults.forEach(
        (result, index) => {
          rankingList.appendChild(
            createRankingItem(
              result,
              index
            )
          );
        }
      );
    },
    (error) => {
      showError(
        "ランキングを読み込めませんでした",
        error
      );
    }
  );

  window.setInterval(
    renderTimeline,
    5000
  );
}

/* =========================
   タイムライン
========================= */

function renderTimeline() {
  const now = Date.now();

  const bucketMilliseconds =
    10000;

  const bucketCount = 6;

  const buckets =
    new Array(
      bucketCount
    ).fill(0);

  currentClicks.forEach(
    (timestamp) => {
      const age =
        now - timestamp;

      if (
        age < 0 ||
        age >=
          bucketMilliseconds *
            bucketCount
      ) {
        return;
      }

      const reverseIndex =
        Math.floor(
          age /
          bucketMilliseconds
        );

      const index =
        bucketCount -
        1 -
        reverseIndex;

      buckets[index] += 1;
    }
  );

  const max =
    Math.max(
      ...buckets,
      1
    );

  timelineChart.innerHTML = "";

  buckets.forEach(
    (count, index) => {
      const group =
        document.createElement(
          "div"
        );

      group.className =
        "timeline-bar-group";

      const value =
        document.createElement(
          "span"
        );

      value.className =
        "timeline-value";

      value.textContent =
        String(count);

      const bar =
        document.createElement(
          "div"
        );

      bar.className =
        "timeline-bar";

      bar.style.height =
        `${Math.max(
          5,
          (count / max) * 100
        )}%`;

      const label =
        document.createElement(
          "span"
        );

      label.className =
        "timeline-label";

      label.textContent =
        index ===
        bucketCount - 1
          ? "現在"
          : `-${(
              bucketCount -
              1 -
              index
            ) * 10}秒`;

      group.append(
        value,
        bar,
        label
      );

      timelineChart.appendChild(
        group
      );
    }
  );
}

/* =========================
   管理操作
========================= */

function setupManagementActions() {
  startButton.addEventListener(
    "click",
    async () => {
      const title =
        storyTitle.value.trim();

      if (!title) {
        window.alert(
          "怖い話のタイトルを入力してください。"
        );

        storyTitle.focus();

        return;
      }

      if (
        !window.confirm(
          `「${title}」を開始しますか？`
        )
      ) {
        return;
      }

      setBusy(true);

      try {
        await update(
          ref(database),
          {
            currentCount: 0,
            currentClicks: null,

            event: {
              isActive: true,
              title,
              startedAt:
                Date.now()
            }
          }
        );

        hostMessage.textContent =
          "話を開始しました";

      } catch (error) {
        showError(
          "話を開始できませんでした",
          error
        );

      } finally {
        setBusy(false);
      }
    }
  );

  endButton.addEventListener(
    "click",
    async () => {
      if (
        !window.confirm(
          "参加者の「怖い！」ボタンを停止しますか？"
        )
      ) {
        return;
      }

      try {
        await update(
          eventRef,
          {
            isActive: false,
            endedAt:
              Date.now()
          }
        );

        hostMessage.textContent =
          "話を終了しました";

      } catch (error) {
        showError(
          "話を終了できませんでした",
          error
        );
      }
    }
  );

  saveButton.addEventListener(
    "click",
    async () => {
      const title =
        storyTitle.value.trim();

      if (!title) {
        window.alert(
          "怖い話のタイトルを入力してください。"
        );

        storyTitle.focus();

        return;
      }

      if (
        !window.confirm(
          `「${title}」を${currentCount}回で保存しますか？`
        )
      ) {
        return;
      }

      setBusy(true);

      saveButton.textContent =
        "保存中…";

      try {
        const newResultRef =
          push(resultsRef);

        await update(
          ref(database),
          {
            [`results/${newResultRef.key}`]:
              {
                title,
                count:
                  currentCount,
                createdAt:
                  Date.now()
              },

            currentCount: 0,
            currentClicks: null,

            event: {
              isActive: false,
              title: "",
              endedAt:
                Date.now()
            }
          }
        );

        storyTitle.value = "";

        hostMessage.textContent =
          "結果を保存し、待機状態に戻しました";

      } catch (error) {
        showError(
          "結果を保存できませんでした",
          error
        );

      } finally {
        setBusy(false);

        saveButton.textContent =
          "この話の結果を保存";
      }
    }
  );

  resetButton.addEventListener(
    "click",
    async () => {
      if (
        !window.confirm(
          "結果を保存せず、カウントとタイムラインを0に戻しますか？"
        )
      ) {
        return;
      }

      try {
        await update(
          ref(database),
          {
            currentCount: 0,
            currentClicks: null
          }
        );

        hostMessage.textContent =
          "カウントを0に戻しました";

      } catch (error) {
        showError(
          "リセットできませんでした",
          error
        );
      }
    }
  );

  csvButton.addEventListener(
    "click",
    () => {
      if (
        currentResults.length ===
        0
      ) {
        window.alert(
          "保存された結果がありません。"
        );

        return;
      }

      const rows = [
        [
          "順位",
          "タイトル",
          "怖い回数",
          "保存日時"
        ],

        ...currentResults.map(
          (result, index) => [
            index + 1,
            result.title,
            result.count,
            new Date(
              result.createdAt
            ).toLocaleString(
              "ja-JP"
            )
          ]
        )
      ];

      const csv =
        "\uFEFF" +
        rows
          .map(
            (row) =>
              row
                .map(
                  escapeCsvValue
                )
                .join(",")
          )
          .join("\r\n");

      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8"
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `kowai-ranking-${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.csv`;

      link.click();

      URL.revokeObjectURL(url);
    }
  );

  deleteResultsButton.addEventListener(
    "click",
    async () => {
      if (
        !window.confirm(
          "保存済みのランキングをすべて削除しますか？"
        )
      ) {
        return;
      }

      if (
        !window.confirm(
          "本当にすべて削除しますか？"
        )
      ) {
        return;
      }

      try {
        await remove(
          resultsRef
        );

        hostMessage.textContent =
          "ランキングの履歴を削除しました";

      } catch (error) {
        showError(
          "ランキングを削除できませんでした",
          error
        );
      }
    }
  );
}

/* =========================
   ランキング
========================= */

function createRankingItem(
  result,
  index
) {
  const item =
    document.createElement(
      "li"
    );

  item.className =
    "ranking-item";

  const position =
    document.createElement(
      "span"
    );

  position.className =
    "ranking-position";

  position.textContent =
    getRankingMark(index);

  const information =
    document.createElement(
      "div"
    );

  information.className =
    "ranking-information";

  const title =
    document.createElement(
      "span"
    );

  title.className =
    "ranking-story-title";

  title.textContent =
    result.title;

  const count =
    document.createElement(
      "span"
    );

  count.className =
    "ranking-count";

  count.textContent =
    `${result.count}回`;

  information.append(
    title,
    count
  );

  item.append(
    position,
    information
  );

  return item;
}

function getRankingMark(index) {
  if (index === 0) {
    return "🥇";
  }

  if (index === 1) {
    return "🥈";
  }

  if (index === 2) {
    return "🥉";
  }

  return `${index + 1}位`;
}

function showEmptyRanking() {
  const item =
    document.createElement(
      "li"
    );

  item.className =
    "ranking-empty";

  item.textContent =
    "まだ保存された結果はありません";

  rankingList.appendChild(item);
}

/* =========================
   UI補助
========================= */

function setManagementEnabled(
  enabled
) {
  startButton.disabled =
    !enabled;

  endButton.disabled =
    !enabled;

  saveButton.disabled =
    !enabled;

  resetButton.disabled =
    !enabled;

  csvButton.disabled =
    !enabled;

  deleteResultsButton.disabled =
    !enabled;

  enableEffectsButton.disabled =
    !enabled;
}

function updateStartEndButtons() {
  if (!hostStarted) {
    return;
  }

  startButton.disabled =
    eventIsActive;

  endButton.disabled =
    !eventIsActive;
}

function setBusy(busy) {
  if (busy) {
    startButton.disabled = true;
    endButton.disabled = true;
    saveButton.disabled = true;
    resetButton.disabled = true;
    deleteResultsButton.disabled =
      true;

    return;
  }

  saveButton.disabled = false;
  resetButton.disabled = false;
  deleteResultsButton.disabled =
    false;

  updateStartEndButtons();
}

function showError(
  message,
  error
) {
  console.error(
    message,
    error
  );

  hostMessage.textContent =
    message;

  hostMessage.classList.add(
    "error"
  );
}

function escapeCsvValue(value) {
  const text =
    String(value ?? "");

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}
