import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
  getDatabase
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

/*
  ここは今まで使っていた自分の設定値をそのまま入れてください
*/
const firebaseConfig = {
  apiKey: "自分のapiKey",
  authDomain: "自分のauthDomain",
  databaseURL: "自分のdatabaseURL",
  projectId: "自分のprojectId",
  storageBucket: "自分のstorageBucket",
  messagingSenderId: "自分のmessagingSenderId",
  appId: "自分のappId"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);

/*
  Firebaseへ匿名ログインする。
  script.js / host.js は、この処理が終わってから
  データベースを使う。
*/
const authReady = signInAnonymously(auth)
  .then((userCredential) => {
    console.log(
      "Firebase匿名認証成功:",
      userCredential.user.uid
    );

    return userCredential.user;
  })
  .catch((error) => {
    console.error(
      "Firebase匿名認証エラー:",
      error
    );

    throw error;
  });

export {
  database,
  auth,
  authReady
};
