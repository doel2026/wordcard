/* sw.js —— 由 build/gen_sw.py 生成，禁止手改。
   改了 dist/app.js / app.css / index.html 之后必须重新生成：python3 build/gen_sw.py
   （build/check.py 第 7 条会比对 VERSION 哈希，忘了生成会直接报错。） */

const VERSION = "25d71a2e";
const CACHE = "wc7-" + VERSION;
const ASSETS = [
  "./index.html",
  "./dist/app.js",
  "./dist/app.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
];

/* 导航请求的兜底页（离线时打开就是它） */
const SHELL = "./index.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 逐个 add 而不是 addAll：一个资源 404 不会让整次安装失败
      await Promise.all(
        ASSETS.map((u) =>
          cache.add(new Request(u, { cache: "reload" })).catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/* 缓存优先 + 后台更新（stale-while-revalidate）。
   这套应用的数据全在 localStorage，页面本身是纯静态，缓存优先没有任何一致性风险。 */
async function swr(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await net) || new Response("offline", { status: 503 });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (err) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const shell = await cache.match(SHELL);
        const net = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(SHELL, res.clone());
            return res;
          })
          .catch(() => null);
        return shell || (await net) || new Response("offline", { status: 503 });
      })()
    );
    return;
  }

  e.respondWith(swr(req));
});

/* 页面可以发 {type:"skip-waiting"} 让新版本立刻接管（暂未使用，留给以后） */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
});
