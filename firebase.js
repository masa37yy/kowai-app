// Firebase本体を読み込む
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";

// Realtime Databaseを読み込む
import { getDatabase } from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

/*
  Firebaseコンソールに表示されたfirebaseConfigへ
  自分の値を入力してください。
*/
const firebaseConfig = {
  apiKey: "AIzaSyC8QEnHB5zLNiTy3WPEfNQ_9BURAXtizh4",
  authDomain: "kowai-button.firebaseapp.com",
  databaseURL: "https://kowai-button-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "kowai-button",
  storageBucket: "kowai-button.firebasestorage.app",
  messagingSenderId: "631872635883",
  appId: "1:631872635883:web:762800fd6660e75495cfae"
};

// Firebaseを開始する
const app = initializeApp(firebaseConfig);

// Realtime Databaseを使用できるようにする
const database = getDatabase(app);

// 他のJavaScriptファイルから使用できるようにする
export { database };