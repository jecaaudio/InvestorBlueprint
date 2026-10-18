/*
 * InvestorBlueprint temporary frontend gate for public GitHub Pages.
 * A valid server check is required to display the app in a normal browser.
 * IMPORTANT: This does NOT make publicly hosted HTML/source code private.
 * The permanent fix is to serve calculators/assets behind an authenticated host.
 */
(function () {
  "use strict";
  const root = document.documentElement;
  const script = document.currentScript;
  const prefix = script?.dataset.root || "../";
  const cfg = window.IB_AUTH_CONFIG || {};
  const loginUrl = new URL(prefix + "login.html", window.location.href);
  const path = window.location.pathname + window.location.search + window.location.hash;
  loginUrl.searchParams.set("returnTo", path);
  const redirect = (reason) => {
    loginUrl.searchParams.set("reason", reason);
    window.location.replace(loginUrl.href);
  };

  let permanentlyLocked = false;
  const lock = () => {
    permanentlyLocked = true;
    root.classList.add("ib-access-denied");
    const show = () => {
      if (!document.body || root.classList.contains("ib-access-granted")) return;
      document.body.replaceChildren();
      const main = document.createElement("main");
      main.style.cssText = "max-width:480px;margin:12vh auto;padding:24px;font:16px system-ui,sans-serif;color:#18283b;background:white;border:1px solid #dae4ed;border-radius:14px;";
      const h = document.createElement("h1"); h.textContent = "Acceso restringido / Sign in required";
      const p = document.createElement("p");
      p.textContent = "Debes iniciar sesión y tener una cuenta aprobada para usar esta herramienta.";
      const a = document.createElement("a"); a.href = loginUrl.href; a.textContent = "Iniciar sesión / Sign in";
      main.append(h, p, a); document.body.append(main);
      root.classList.add("ib-access-error-visible");
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
    else show();
  };

  async function check() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase?.createClient) {
      lock(); return;
    }
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) { redirect("login"); return; }
      const response = await fetch(cfg.supabaseUrl + "/functions/v1/member-access-check", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + data.session.access_token,
          apikey: cfg.supabaseAnonKey
        }
      });
      if (response.status === 401) { await client.auth.signOut(); redirect("login"); return; }
      if (response.status === 403) { redirect("approval"); return; }
      if (!response.ok) { lock(); return; }
      const result = await response.json();
      if (result.authorized !== true || result.status !== "approved" || permanentlyLocked) { lock(); return; }
      root.classList.remove("ib-access-denied");
      root.classList.add("ib-access-granted");
      window.IB_TOOL_AUTHORIZED = true;
      window.dispatchEvent(new Event("ib:tool-authorized"));
    } catch (err) {
      console.error("InvestorBlueprint access verification unavailable", err);
      lock();
    }
  }

  const timer = window.setTimeout(() => {
    if (!root.classList.contains("ib-access-granted")) lock();
  }, 14000);
  check().finally(() => window.clearTimeout(timer));
})();
