// Firebase configuration (use your own Firebase config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Get DOM elements
const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Handle sign-up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();  // Prevent the default form submission

    const email = emailInput.value;
    const password = passwordInput.value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User registered successfully:", user.email);
            window.location.href = "index.html";  // Redirect to the login page after sign-up
        })
        .catch((error) => {
            console.error(error);
            errorMessage.textContent = "Error: " + error.message;  // Show error if sign-up fails
        });
});
