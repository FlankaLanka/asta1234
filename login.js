// Firebase configuration (use your own Firebase credentials)
// const firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "atsa1234-ae1a2.firebaseapp.com",
//     projectId: "atsa1234-ae1a2",
//     storageBucket: "atsa1234-ae1a2.appspot.com",
//     messagingSenderId: "YOUR_SENDER_ID",
//     appId: "YOUR_APP_ID"
// };

const firebaseConfig = {
    apiKey: "AIzaSyASmf5jo5XwUSMEE-PWPXh9J5HQbf0kbW4",
    authDomain: "atsa1234-ae1a2.firebaseapp.com",
    projectId: "atsa1234-ae1a2",
    storageBucket: "atsa1234-ae1a2.firebasestorage.app",
    messagingSenderId: "9350603529",
    appId: "1:9350603529:web:50241f95113529ef2429d8",
    measurementId: "G-Q1KKHXNLXY"
  };

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Get DOM elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Handle login when the form is submitted
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();  // Prevent the form from refreshing the page

    const email = emailInput.value;
    const password = passwordInput.value;

    // Sign in with Firebase
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Logged in successfully:", user.email);
            window.location.href = "game.html";  // Redirect to Unity WebGL game page
        })
        .catch((error) => {
            console.error("Error:", error.message);
            errorMessage.textContent = "Error: " + error.message;  // Show error message
        });
});
