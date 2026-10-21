import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.LITC_SUPABASE_CONFIG || {};
const downloadButton = document.getElementById("downloadButton");
if (downloadButton && typeof config.downloadUrl === "string" && /^https:\/\//i.test(config.downloadUrl)) {
  downloadButton.href = config.downloadUrl;
  downloadButton.textContent = "Open Windows download";
  downloadButton.setAttribute("aria-disabled", "false");
  downloadButton.removeAttribute("tabindex");
  downloadButton.target = "_blank";
  downloadButton.rel = "noopener noreferrer";
}
const configured = Boolean(
  config.url &&
  config.publishableKey &&
  !config.url.includes("PASTE_") &&
  !config.publishableKey.includes("PASTE_")
);
const supabase = configured
  ? createClient(config.url, config.publishableKey)
  : null;

const accountButton = document.getElementById("accountButton");
const authDialog = document.getElementById("authDialog");
const profileDialog = document.getElementById("profileDialog");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const profileForm = document.getElementById("profileForm");
const authStatus = document.getElementById("authStatus");
const profileStatus = document.getElementById("profileStatus");
const profileEmail = document.getElementById("profileEmail");
const logoutButton = document.getElementById("logoutButton");
let currentUser = null;
let currentUsername = "";

function showStatus(element, message, kind) {
  element.textContent = message || "";
  if (kind) element.dataset.kind = kind;
  else delete element.dataset.kind;
}

function openAuth(view) {
  setAuthView(view || "login");
  showStatus(authStatus, configured ? "" : "Accounts are not connected yet. The site owner needs to finish Supabase setup.");
  if (!authDialog.open) authDialog.showModal();
}

function setAuthView(view) {
  const isLogin = view === "login";
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.authTab === view));
  });
  document.getElementById("authTitle").textContent = isLogin ? "Welcome back." : "Join the crew.";
  showStatus(authStatus, "");
}

async function syncAccount(user) {
  currentUser = user || null;
  currentUsername = "";
  if (currentUser && supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", currentUser.id)
      .maybeSingle();
    currentUsername = data?.username || currentUser.user_metadata?.username || "Crew member";
  }
  if (currentUser) {
    accountButton.textContent = currentUsername || "Profile";
    profileEmail.textContent = currentUser.email || "";
    profileForm.elements.username.value = currentUsername;
  } else {
    accountButton.textContent = "Log in / Sign up";
    profileEmail.textContent = "";
  }
}

accountButton.addEventListener("click", () => {
  if (currentUser) {
    showStatus(profileStatus, "");
    profileDialog.showModal();
  } else {
    openAuth("login");
  }
});

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => setAuthView(tab.dataset.authTab));
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

[authDialog, profileDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    showStatus(authStatus, "Accounts are not configured yet. Please try again later.");
    return;
  }
  const form = new FormData(loginForm);
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus(authStatus, "Connecting to the crew registry...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: form.get("email").trim(),
    password: form.get("password")
  });
  submit.disabled = false;
  if (error) {
    showStatus(authStatus, error.message, "error");
    return;
  }
  await syncAccount(data.user);
  authDialog.close();
  loginForm.reset();
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    showStatus(authStatus, "Accounts are not configured yet. Please try again later.");
    return;
  }
  const form = new FormData(signupForm);
  const username = form.get("username").trim();
  if (username.length < 3) {
    showStatus(authStatus, "Choose a username with at least 3 characters.", "error");
    return;
  }
  const submit = signupForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus(authStatus, "Creating your crew account...");
  const { data, error } = await supabase.auth.signUp({
    email: form.get("email").trim(),
    password: form.get("password"),
    options: { data: { username }, emailRedirectTo: window.location.origin }
  });
  submit.disabled = false;
  if (error) {
    showStatus(authStatus, error.message, "error");
    return;
  }
  signupForm.reset();
  if (!data.session) {
    showStatus(authStatus, "Check your email for a confirmation link, then log in.");
    return;
  }
  await syncAccount(data.user);
  authDialog.close();
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase || !currentUser) return;
  const username = profileForm.elements.username.value.trim();
  if (username.length < 3) {
    showStatus(profileStatus, "Choose a display name with at least 3 characters.", "error");
    return;
  }
  const submit = profileForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus(profileStatus, "Saving your name...");
  const { error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", currentUser.id);
  submit.disabled = false;
  if (error) {
    showStatus(profileStatus, error.message, "error");
    return;
  }
  await syncAccount(currentUser);
  showStatus(profileStatus, "Name updated.");
});

logoutButton.addEventListener("click", async () => {
  if (!supabase) return;
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  logoutButton.disabled = false;
  if (error) {
    showStatus(profileStatus, error.message, "error");
    return;
  }
  currentUser = null;
  currentUsername = "";
  await syncAccount(null);
  profileDialog.close();
});

document.getElementById("accountButton").addEventListener("contextmenu", (event) => event.preventDefault());

if (!configured) {
  loginForm.querySelectorAll("input,button").forEach((control) => { control.disabled = true; });
  signupForm.querySelectorAll("input,button").forEach((control) => { control.disabled = true; });
  profileForm.querySelectorAll("input,button").forEach((control) => { control.disabled = true; });
  logoutButton.disabled = true;
} else {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    Promise.resolve().then(() => syncAccount(session?.user || null));
  });
  supabase.auth.getSession().then(({ data }) => syncAccount(data.session?.user || null));
  window.addEventListener("beforeunload", () => subscription.unsubscribe(), { once: true });
}