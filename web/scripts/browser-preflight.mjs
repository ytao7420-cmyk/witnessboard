import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "out");
const port = 8766;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let path = decodeURIComponent(url.pathname);
      if (path.startsWith("/witnessboard")) path = path.slice("/witnessboard".length) || "/";
      if (path.endsWith("/")) path += "index.html";
      const file = normalize(join(root, path));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      } else if (message.method) {
        this.events.push(message);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

const providerScript = `(() => {
  const mode = new URLSearchParams(location.search).get("wallet") || "hang-chain";
  const calls = [];
  window.__walletCalls = calls;
  const account = "0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9";
  window.ethereum = {
    async request({ method }) {
      calls.push(method);
      if (mode === "hang-chain" && method === "eth_chainId") return new Promise(() => {});
      if (mode === "hang-accounts" && method === "eth_requestAccounts") return new Promise(() => {});
      if (method === "eth_chainId") return "0xf22f";
      if (method === "eth_accounts") return mode === "disconnected" ? [] : [account];
      if (method === "eth_requestAccounts") return [account];
      if (method === "eth_sendTransaction") throw new Error("simulated-wallet-error");
      return null;
    },
  };
})();`;

async function openPage(cdp, url) {
  const target = await cdp.send("Target.createTarget", { url: "about:blank" });
  const session = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = session.sessionId;
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: providerScript }, sessionId);
  await cdp.send("Page.navigate", { url }, sessionId);
  const started = Date.now();
  let ready = false;
  while (Date.now() - started < 15000) {
    const result = await cdp.send(
      "Runtime.evaluate",
      { expression: "document.body && document.body.innerText.includes('请求 MetaMask 签名部署')", returnByValue: true },
      sessionId,
    );
    if (result.result?.value) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("prepare page did not hydrate");
  return { sessionId, targetId: target.targetId };
}

async function clickDeploy(cdp, sessionId) {
  const clicked = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("请求 MetaMask 签名部署"));
        if (!button) return "missing-button";
        button.click();
        return "clicked";
      })()`,
      returnByValue: true,
    },
    sessionId,
  );
  if (clicked.result?.value !== "clicked") throw new Error(clicked.result?.value || "click failed");
}

async function waitForText(cdp, sessionId, needle, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snapshot = await cdp.send(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("请求 MetaMask") || item.textContent.includes("已有哈希"));
          return JSON.stringify({
            text: document.body.innerText,
            disabled: button ? button.disabled : null,
            calls: window.__walletCalls || [],
          });
        })()`,
        returnByValue: true,
      },
      sessionId,
    );
    const value = JSON.parse(snapshot.result.value);
    if (value.text.includes(needle)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${needle}`);
}

async function scenario(cdp, name, wallet, needle, checks) {
  const page = await openPage(
    cdp,
    `http://127.0.0.1:${port}/witnessboard/prepare/?wallet=${wallet}&stepMs=700`,
  );
  await clickDeploy(cdp, page.sessionId);
  const value = await waitForText(cdp, page.sessionId, needle, 8000);
  checks(value);
  await cdp.send("Target.closeTarget", { targetId: page.targetId });
  console.log("ok", name, "calls", value.calls.join(","));
}

const server = await serve();
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=9223",
    "--user-data-dir=/tmp/witness-preflight-chrome",
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  let version;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      version = await fetch("http://127.0.0.1:9223/json/version").then((response) => response.json());
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  if (!version) throw new Error("chrome debugging port did not open");
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const cdp = new Cdp(ws);

  await scenario(cdp, "hang-chain", "hang-chain", "waiting for eth_chainId", (value) => {
    if (!value.text.includes("timed out")) throw new Error(value.text.slice(0, 500));
    if (!value.text.includes("No transaction was sent")) throw new Error("missing no-send text");
    if (value.disabled !== false) throw new Error("button stayed disabled");
    if (value.calls.includes("eth_sendTransaction")) throw new Error("sent during chain hang");
    if (value.text.includes("checking")) throw new Error("status stayed checking");
  });

  await scenario(cdp, "hang-accounts", "hang-accounts", "waiting for eth_requestAccounts", (value) => {
    if (!value.text.includes("timed out")) throw new Error(value.text.slice(0, 400));
    if (!value.calls.includes("eth_requestAccounts")) throw new Error("requestAccounts was not called");
    if (value.disabled !== false) throw new Error("button stayed disabled");
    if (value.calls.includes("eth_sendTransaction")) throw new Error("sent during account hang");
  });

  await scenario(cdp, "disconnected-then-connected", "disconnected", "simulated-wallet-error", (value) => {
    if (!value.calls.includes("eth_requestAccounts")) throw new Error("missing requestAccounts: " + value.calls.join(","));
    if (value.calls.filter((call) => call === "eth_sendTransaction").length !== 1) {
      throw new Error("send count " + value.calls.join(","));
    }
    if (value.text.includes("哈希:")) throw new Error("invented a hash: " + value.text.slice(0, 700));
  });

  await scenario(cdp, "already-connected", "connected", "simulated-wallet-error", (value) => {
    if (!value.text.includes("eth_chainId 已返回 0xf22f") && !value.text.includes("0xf22f")) {
      throw new Error(value.text.slice(0, 500));
    }
    if (value.calls.filter((call) => call === "eth_sendTransaction").length !== 1) {
      throw new Error("send count " + value.calls.join(","));
    }
    if (value.text.includes("哈希:")) throw new Error("invented a hash");
    if (value.disabled !== false) throw new Error("button stayed disabled without a hash");
  });

  ws.close();
  console.log("browser preflight ok");
} finally {
  chrome.kill("SIGKILL");
  server.close();
}
