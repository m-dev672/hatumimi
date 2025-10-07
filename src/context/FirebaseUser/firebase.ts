// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuIvToq6rKb3dqFW15P9cRIn78DPT_nW4",
  authDomain: "hatumimi-dev.firebaseapp.com",
  projectId: "hatumimi-dev",
  storageBucket: "hatumimi-dev.firebasestorage.app",
  messagingSenderId: "733224170733",
  appId: "1:733224170733:web:413c960380c991dc5fc8e4"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);