import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import { getDatabase } from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-database.js";

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

export {
  auth,
  database,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
};
