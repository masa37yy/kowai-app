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
  apiKey: "AIzaSyC8QEnHB5zLNiTy3WPEfNQ_9BURAXtizh4",
  authDomain: "kowai-button.firebaseapp.com",
  databaseURL: "https://kowai-button-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kowai-button",
  storageBucket: "kowai-button.firebasestorage.app",
  messagingSenderId: "631872635883",
  appId: "1:631872635883:web:762800fd6660e75495cfae"
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
