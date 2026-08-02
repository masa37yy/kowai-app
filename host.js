import { database } from "./firebase.js";

import {
  ref,
  onValue,
  set,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

/* ========================================
   HTMLの部品
======================================== */

const countNumber =
  document.getElementById("countNumber");

const storyTitle =
  document.getElementById("storyTitle");

const hostMessage =
  document.getElementById("hostMessage");

const saveButton =
  document.getElementById("saveButton");

const resetButton =
  document.getElementById("resetButton");

const deleteResultsButton =
  document.getElementById("deleteResultsButton");

const rankingList =
  document.getElementById("rankingList");

const scaryOverlay =
  document.getElementById("scaryOverlay");

const enableEffectsButton =
  document.getElementById("enableEffectsButton");

const effectStatus =
  document.getElementById("effectStatus");

/* ========================================
   Firebase内の保存場所
======================================== */

const countRef = ref(database, "currentCount");
const resultsRef = ref(database, "results");

/* ========================================
   状態
======================================== */

let currentCount = 0;

/*
  最初のFirebase読み込みかどうか
  初期表示時に音を鳴らさないために使う
*/
let hasReceivedInitialCount = false;

/*
  音と演出が有効か
*/
let effectsEnabled = false;

/*
  Web Audio API
*/
let audioContext = null;

/* ========================================
   演出を有効化
======================================== */

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
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      effectsEnabled = true;

      enableEffectsButton.textContent =
        "音と「怖」演出：有効";

      enableEffectsButton.disabled = true;

      effectStatus.textContent =
        "参加者が押すと演出が表示されます";

      /*
        有効化できたことを確認する短い音
      */
      playScarySound();
    } catch (error) {
      console.error("演出有効化エラー:", error);

      effectStatus.textContent =
        "演出を有効にできませんでした";
    }
  }
);

/* ========================================
   怖い効果音
======================================== */

function playScarySound() {
  if (
    !effectsEnabled ||
    !audioContext
  ) {
    return;
  }

  const now = audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator.type = "sawtooth";

  oscillator.frequency.setValueAtTime(
    180,
    now
  );

  oscillator.frequency.exponentialRampToValueAtTime(
    65,
    now + 0.45
  );

  gainNode.gain.setValueAtTime(
    0.0001,
    now
  );

  gainNode.gain.exponentialRampToValueAtTime(
    0.22,
    now + 0.025
  );

  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.5
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.52);
}

/* ========================================
   「怖」の文字演出
======================================== */

function showScaryOverlay() {
  if (!effectsEnabled) {
    return;
  }

  /*
    連続で押された場合でも
    アニメーションを最初から再生する
  */
  scaryOverlay.classList.remove("is-visible");

  void scaryOverlay.offsetWidth;

  scaryOverlay.classList.add("is-visible");

  window.setTimeout(() => {
    scaryOverlay.classList.remove("is-visible");
  }, 850);
}

/* ========================================
   カウントをリアルタイム表示
======================================== */

onValue(
  countRef,

  (snapshot) => {
    const value = snapshot.val();

    const newCount =
      typeof value === "number"
        ? value
        : 0;

    /*
      初回読み込みでは演出しない。

      新しい値が以前より増えたときだけ
      音と「怖」を表示する。
    */
    if (
      hasReceivedInitialCount &&
      newCount > currentCount
    ) {
      playScarySound();
      showScaryOverlay();
    }

    currentCount = newCount;
    countNumber.textContent = currentCount;

    hostMessage.textContent =
      "リアルタイム集計中";

    hostMessage.classList.remove("error");

    countNumber.classList.remove("count-up");

    void countNumber.offsetWidth;

    countNumber.classList.add("count-up");

    hasReceivedInitialCount = true;
  },

  (error) => {
    console.error(
      "カウント読み込みエラー:",
      error
    );

    hostMessage.textContent =
      "カウントを読み込めませんでした。";

    hostMessage.classList.add("error");
  }
);

/* ========================================
   ランキング表示
======================================== */

onValue(
  resultsRef,

  (snapshot) => {
    const resultsData = snapshot.val();

    rankingList.innerHTML = "";

    if (!resultsData) {
      showEmptyRanking();
      return;
    }

    const results = Object.entries(
      resultsData
    ).map(([id, result]) => {
      return {
        id: id,

        title:
          result.title ||
          "タイトルなし",

        count:
          typeof result.count === "number"
            ? result.count
            : 0,

        createdAt:
          result.createdAt || 0
      };
    });

    results.sort((resultA, resultB) => {
      if (
        resultB.count !== resultA.count
      ) {
        return (
          resultB.count -
          resultA.count
        );
      }

      return (
        resultA.createdAt -
        resultB.createdAt
      );
    });

    results.forEach((result, index) => {
      rankingList.appendChild(
        createRankingItem(
          result,
          index
        )
      );
    });
  },

  (error) => {
    console.error(
      "ランキング読み込みエラー:",
      error
    );

    rankingList.innerHTML = "";

    const errorItem =
      document.createElement("li");

    errorItem.className =
      "ranking-empty";

    errorItem.textContent =
      "ランキングを読み込めませんでした。";

    rankingList.appendChild(errorItem);
  }
);

/* ========================================
   ランキング1件分
======================================== */

function createRankingItem(
  result,
  index
) {
  const item =
    document.createElement("li");

  item.className = "ranking-item";

  const position =
    document.createElement("span");

  position.className =
    "ranking-position";

  position.textContent =
    getRankingMark(index);

  const information =
    document.createElement("div");

  information.className =
    "ranking-information";

  const title =
    document.createElement("span");

  title.className =
    "ranking-story-title";

  title.textContent =
    result.title;

  const count =
    document.createElement("span");

  count.className =
    "ranking-count";

  count.textContent =
    `${result.count}回`;

  information.appendChild(title);
  information.appendChild(count);

  item.appendChild(position);
  item.appendChild(information);

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
  const emptyItem =
    document.createElement("li");

  emptyItem.className =
    "ranking-empty";

  emptyItem.textContent =
    "まだ保存された結果はありません";

  rankingList.appendChild(emptyItem);
}

/* ========================================
   結果を保存
======================================== */

saveButton.addEventListener(
  "click",
  async () => {
    const title =
      storyTitle.value.trim();

    if (title === "") {
      window.alert(
        "怖い話のタイトルを入力してください。"
      );

      storyTitle.focus();
      return;
    }

    if (currentCount === 0) {
      const saveZero =
        window.confirm(
          "現在のカウントは0回です。\n" +
          "このまま保存しますか？"
        );

      if (!saveZero) {
        return;
      }
    }

    const shouldSave =
      window.confirm(
        `「${title}」を` +
        `${currentCount}回で保存しますか？`
      );

    if (!shouldSave) {
      return;
    }

    setButtonsDisabled(true);

    saveButton.textContent =
      "保存中…";

    hostMessage.classList.remove(
      "error"
    );

    hostMessage.textContent =
      "結果を保存しています…";

    try {
      const newResultRef =
        push(resultsRef);

      await update(ref(database), {
        [`results/${newResultRef.key}`]: {
          title: title,
          count: currentCount,
          createdAt: Date.now()
        },

        currentCount: 0
      });

      storyTitle.value = "";

      hostMessage.textContent =
        "結果を保存し、" +
        "カウントを0に戻しました。";

      storyTitle.focus();
    } catch (error) {
      console.error(
        "結果保存エラー:",
        error
      );

      hostMessage.textContent =
        "結果を保存できませんでした。";

      hostMessage.classList.add(
        "error"
      );
    } finally {
      setButtonsDisabled(false);

      saveButton.textContent =
        "この話の結果を保存";
    }
  }
);

/* ========================================
   保存せずリセット
======================================== */

resetButton.addEventListener(
  "click",
  async () => {
    const shouldReset =
      window.confirm(
        "結果を保存せず、" +
        "カウントを0に戻しますか？"
      );

    if (!shouldReset) {
      return;
    }

    setButtonsDisabled(true);

    resetButton.textContent =
      "リセット中…";

    hostMessage.classList.remove(
      "error"
    );

    try {
      await set(countRef, 0);

      hostMessage.textContent =
        "カウントを0に戻しました。";
    } catch (error) {
      console.error(
        "リセットエラー:",
        error
      );

      hostMessage.textContent =
        "カウントをリセットできませんでした。";

      hostMessage.classList.add(
        "error"
      );
    } finally {
      setButtonsDisabled(false);

      resetButton.textContent =
        "保存せず0に戻す";
    }
  }
);

/* ========================================
   履歴をすべて削除
======================================== */

deleteResultsButton.addEventListener(
  "click",
  async () => {
    const shouldDelete =
      window.confirm(
        "保存済みのランキングを" +
        "すべて削除しますか？\n" +
        "削除した結果は元に戻せません。"
      );

    if (!shouldDelete) {
      return;
    }

    const finalConfirmation =
      window.confirm(
        "本当にすべて削除しますか？"
      );

    if (!finalConfirmation) {
      return;
    }

    deleteResultsButton.disabled =
      true;

    deleteResultsButton.textContent =
      "削除中…";

    try {
      await remove(resultsRef);

      hostMessage.textContent =
        "ランキングの履歴を削除しました。";
    } catch (error) {
      console.error(
        "履歴削除エラー:",
        error
      );

      hostMessage.textContent =
        "ランキングを削除できませんでした。";

      hostMessage.classList.add(
        "error"
      );
    } finally {
      deleteResultsButton.disabled =
        false;

      deleteResultsButton.textContent =
        "履歴をすべて削除";
    }
  }
);

function setButtonsDisabled(
  disabled
) {
  saveButton.disabled = disabled;
  resetButton.disabled = disabled;

  deleteResultsButton.disabled =
    disabled;
}