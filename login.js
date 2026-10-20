// Use the project's browser-safe Supabase publishable key only.
const SUPABASE_URL = "https://yzwpjerjepfbvmriihus.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9lzPxS-uKXnufQOqkk04TA_e2-x3CAa";
const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let mode = "signin";
const $ = id => document.getElementById(id);
function setMode(next) {
  mode = next;
  $("signinTab").classList.toggle("active", mode === "signin");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("title").textContent = mode === "signin" ? "Sign in to CoreFair" : "Create your CoreFair account";
  $("submitBtn").textContent = mode === "signin" ? "Sign in →" : "Create account →";
  $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
  $("message").textContent = "";
}
$("signinTab").addEventListener("click", () => setMode("signin"));
$("signupTab").addEventListener("click", () => setMode("signup"));
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("message"), btn = $("submitBtn");
  msg.style.color = "#b42318";
  if (!client) { msg.textContent = "Supabase could not load. Check your internet connection and configuration."; return; }
  btn.disabled = true; btn.textContent = "Please wait…"; msg.textContent = "";
  try {
    const email = $("email").value.trim(), password = $("password").value;
    const result = mode === "signin"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password });
    if (result.error) throw result.error;
    msg.style.color = "#087b55";
    msg.textContent = mode === "signin"
      ? "Signed in successfully. You can now continue to the marketplace."
      : "Account request created. Check your email if confirmation is enabled.";
    if (mode === "signin") setTimeout(() => location.href = "/explore", 900);
  } catch (err) { msg.textContent = err.message || "Authentication failed."; }
  finally { btn.disabled = false; btn.textContent = mode === "signin" ? "Sign in →" : "Create account →"; }
});
