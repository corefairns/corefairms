// CoreFair - Fully Working App logic
let supabaseClient = null;

function initSupabase() {
  if (window.COREFAIR_SUPABASE_URL && window.COREFAIR_SUPABASE_ANON_KEY) {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(
        window.COREFAIR_SUPABASE_URL,
        window.COREFAIR_SUPABASE_ANON_KEY
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupEventListeners();
  checkSession();
});

function setupEventListeners() {
  // Navigation & Drawer
  const navToggle = document.querySelector('.nav-toggle') || document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu') || document.querySelector('nav');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // Auth Forms
  const loginForm = document.querySelector('#login-form') || document.querySelector('form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const signupBtn = document.querySelector('#signup-btn') || document.querySelector('a[href*="signup"]');
  if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showSignupModal();
    });
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[placeholder*="Email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email.includes('@')) {
    alert('দয়া করে একটি সঠিক ইমেইল এড্রেস দিন।');
    return;
  }

  if (!supabaseClient) {
    alert('Supabase কানেকশন তৈরি হয়নি! supabase-config.js ফাইলটি পুনরায় পরীক্ষা করুন।');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert('লগইন ব্যর্থ হয়েছে: ' + error.message);
    } else {
      alert('সফলভাবে লগইন হয়েছে! স্বাগতম CoreFair-এ।');
      window.location.reload();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function checkSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    console.log('User logged in:', session.user);
    // UI changes for logged in user
  }
}
