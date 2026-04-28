const firebaseConfig = {
    apiKey: "AIzaSyD0GKHekJIBroBaQbbKIagcaZ52ljsgT6A",
    authDomain: "fichas-odisseia.firebaseapp.com",
    projectId: "fichas-odisseia",
    storageBucket: "fichas-odisseia.firebasestorage.app",
    messagingSenderId: "438632062292",
    appId: "1:438632062292:web:68e9584cf8f5ffcf2e3cc1",
    measurementId: "G-JRFYC354YB"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
