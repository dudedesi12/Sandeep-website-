// ============================================
// Firebase Configuration for LoanMate Finance
// Enhanced with security, analytics consent, and email notifications
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import { getAnalytics, setAnalyticsCollectionEnabled } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js';
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

// Initialize Analytics — respects cookie consent
let analytics = null;
try {
    analytics = getAnalytics(app);
    // Check stored consent preference
    const consent = localStorage.getItem('lm_cookie_consent');
    if (consent === 'declined') {
        setAnalyticsCollectionEnabled(analytics, false);
    }
} catch (e) {
    console.log('Analytics not available in this environment');
}

// Expose analytics control for cookie consent module
window.lmAnalytics = {
    enable() {
        if (analytics) setAnalyticsCollectionEnabled(analytics, true);
    },
    disable() {
        if (analytics) setAnalyticsCollectionEnabled(analytics, false);
    }
};

// Initialize Firestore and expose globally for forms
const db = getFirestore(app);
window.firebaseDB = db;

// ============================================
// Email Notification via EmailJS (free tier)
// Setup: Create account at emailjs.com, add Gmail service,
// create template, then replace the IDs below.
// ============================================

/**
 * Send email notification when a new enquiry is submitted.
 * Uses EmailJS free tier (200 emails/month).
 *
 * To activate:
 * 1. Sign up at https://www.emailjs.com (free)
 * 2. Add your Gmail as an email service
 * 3. Create an email template with variables:
 *    {{from_name}}, {{loan_type}}, {{email}}, {{phone}},
 *    {{lead_priority}}, {{message}}, {{submitted_at}}
 * 4. Replace the IDs below with your actual EmailJS IDs
 */
const EMAILJS_CONFIG = {
    enabled: false, // Set to true after configuring EmailJS
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',
    serviceId: 'YOUR_EMAILJS_SERVICE_ID',
    templateId: 'YOUR_EMAILJS_TEMPLATE_ID'
};

window.sendEmailNotification = async function(leadData) {
    if (!EMAILJS_CONFIG.enabled) {
        console.log('Email notifications not configured. See firebase-config.js for setup instructions.');
        return;
    }

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: EMAILJS_CONFIG.serviceId,
                template_id: EMAILJS_CONFIG.templateId,
                user_id: EMAILJS_CONFIG.publicKey,
                template_params: {
                    from_name: `${leadData.firstName} ${leadData.lastName}`,
                    loan_type: leadData.loanType || 'Not specified',
                    email: leadData.email,
                    phone: leadData.phone,
                    lead_priority: leadData.leadPriority || 'N/A',
                    message: leadData.notes || leadData.message || 'No message',
                    submitted_at: new Date().toLocaleString('en-AU', {
                        timeZone: 'Australia/Adelaide'
                    })
                }
            })
        });

        if (response.ok) {
            console.log('Email notification sent successfully');
        }
    } catch (error) {
        // Fail silently — email notification is non-critical
        console.log('Email notification failed (non-critical):', error.message);
    }
};

// ============================================
// Firestore Security Rules (deploy via Firebase Console)
// Copy these rules to: Firebase Console > Firestore > Rules
// ============================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Enquiries collection — public write (for form submissions), no public read
    match /enquiries/{enquiryId} {
      // Anyone can create a new enquiry (form submission)
      allow create: if
        request.resource.data.keys().hasAll(['firstName', 'lastName', 'email', 'phone', 'submittedAt', 'status'])
        && request.resource.data.firstName is string
        && request.resource.data.lastName is string
        && request.resource.data.email is string
        && request.resource.data.phone is string
        && request.resource.data.status == 'new'
        && request.resource.data.firstName.size() > 0
        && request.resource.data.firstName.size() < 100
        && request.resource.data.lastName.size() > 0
        && request.resource.data.lastName.size() < 100
        && request.resource.data.email.size() > 0
        && request.resource.data.email.size() < 200
        && request.resource.data.phone.size() > 0
        && request.resource.data.phone.size() < 30;

      // Only authenticated admin users can read, update, or delete
      allow read, update, delete: if request.auth != null
        && request.auth.token.admin == true;
    }

    // Block all other collections by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

export { app, db };
