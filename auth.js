(function () {
  const AUTH_KEY = "molecule_recap_auth_via_2026";
  const USERNAME = "via2026";
  const PASSWORD_HASH = "1e893c9c6c3a28480b9be248e95af8cdfc54d25a6232bd8d413be58f049385d3";
  const SCRIPT_VERSION = "20260625-relation-groups";

  const form = document.getElementById("loginForm");
  const userInput = document.getElementById("loginUser");
  const passwordInput = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  const button = document.getElementById("loginButton");

  function setError(message) {
    if (error) error.textContent = message || "";
  }

  async function sha256(text) {
    if (!window.crypto?.subtle) {
      throw new Error("当前浏览器不支持安全登录校验");
    }
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法载入 ${src}`));
      document.body.appendChild(script);
    });
  }

  async function unlock() {
    if (window.__RECAP_AUTH_BOOTED) return;
    window.__RECAP_AUTH_BOOTED = true;
    await loadScript(`./data.js?v=${SCRIPT_VERSION}`);
    await loadScript(`./app.js?v=${SCRIPT_VERSION}`);
    document.body.classList.remove("auth-locked");
    document.getElementById("logoutButton")?.addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_KEY);
      window.location.reload();
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    button.disabled = true;
    button.textContent = "登录中";
    try {
      const user = userInput.value.trim();
      const passwordHash = await sha256(passwordInput.value);
      if (user !== USERNAME || passwordHash !== PASSWORD_HASH) {
        setError("账号或密码不正确");
        passwordInput.select();
        return;
      }
      sessionStorage.setItem(AUTH_KEY, "ok");
      button.textContent = "正在载入";
      await unlock();
    } catch (err) {
      setError(err.message || "登录失败，请重试");
    } finally {
      button.disabled = false;
      button.textContent = "登录";
    }
  }

  form?.addEventListener("submit", handleSubmit);

  if (sessionStorage.getItem(AUTH_KEY) === "ok") {
    unlock().catch((err) => setError(err.message || "载入失败，请刷新重试"));
  } else {
    userInput?.focus();
  }
})();
