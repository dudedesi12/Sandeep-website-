// Firebase Configuration for LoanMate Finance
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAKKzXszOvV5MrddYas_TwJ4S0qP9wEg5s",
    authDomain: "sandeepweb-21c9f.firebaseapp.com",
    projectId: "sandeepweb-21c9f",
    storageBucket: "sandeepweb-21c9f.firebasestorage.app",
    messagingSenderId: "269624742147",
    appId: "1:269624742147:web:5a6b7e2a3c00df8e431936",
    measurementId: "G-C9X9RY7Y7C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in production with HTTPS)
try {
    const analytics = getAnalytics(app);
} catch (e) {
    console.log('Analytics not available in this environment');
}

// Initialize Firestore and expose globally for the contact form
const db = getFirestore(app);
window.firebaseDB = db;

export { app, db };
