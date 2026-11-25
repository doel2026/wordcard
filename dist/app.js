/* app.js —— 由 build/concat.py 拼接，禁止手改。
   内容哈希：8e9f9e6755  prod  22 个文件
   顺序见 build/manifest.json */

/* ──────── src/ui/shared/dom.js ──────── */
/* dom.js —— 极简 DOM 工具。零依赖、无框架、不碰业务。
   用法：
     var el = WC.dom.h("div", {class:"x", text:"hi", on:{click: fn}}, child1, child2)
     WC.dom.mount(root, el)          // 换掉 root 的全部子节点
   props 支持：class / id / text / style(字符串或对象) / data(对象) / on(对象) / 其余当作 attribute
*/
(function (WC) {
  "use strict";

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = String(v);
        else if (k === "style") {
          if (typeof v === "string") el.setAttribute("style", v);
          else for (var s in v) el.style.setProperty(s, v[s]);
        } else if (k === "data") {
          for (var d in v) el.dataset[d] = v[d];
        } else if (k === "on") {
          for (var e in v) {
            if (v[e]) el.addEventListener(e, v[e]);
          }
        } else el.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var kids = arguments[i];
      if (kids === null || kids === undefined || kids === false) continue;
      if (Array.isArray(kids)) {
        for (var j = 0; j < kids.length; j++) add(el, kids[j]);
      } else add(el, kids);
    }
    return el;
  }

  function add(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (typeof kid === "string" || typeof kid === "number") el.appendChild(document.createTextNode(String(kid)));
    else if (kid.nodeType) el.appendChild(kid);
  }

  function mount(root, node) {
    root.textContent = "";
    if (node) root.appendChild(node);
    return root;
  }

  function clear(root) {
    root.textContent = "";
  }

  WC.dom = { h: h, mount: mount, clear: clear };
})(window.WC = window.WC || {});

/* ──────── src/ui/shared/components.js ──────── */
/* components.js —— 共享组件。只吃 VM 的字段，不读 state，不写业务判断。
   四个组件：
     WC.ui.option({pos, cn, num, mark, w})   选项卡（mark: idle|right|wrong|muted；w 仅揭示后给）
     WC.ui.button({label, kind, onClick})     按钮（kind: primary|quiet）
     WC.ui.cells({cells, onPick})             组色块网格（7 列）
     WC.ui.rows({rows, onPick})               白卡行列表
   两个外壳：
     WC.ui.toast(vm.toast)                    返回节点或 null，调用方 append 到 body/root
     WC.ui.sheet({items, onPick, onClose})    底部菜单，insert 到 body，返回 {close}
   一个图标：
     WC.ui.icon("star"|"sound"|"more")
*/
(function (WC) {
  "use strict";
  var h = WC.dom.h;

  var GLYPH = { star: "★", sound: "♪", more: "⋮", undo: "↶" };

  function icon(name) {
    return h("span", { class: "wc-ic", "aria-hidden": "true", text: GLYPH[name] || "" });
  }

  /* 选项卡。o.w 只在揭示后给（非答案项的单词），ask 阶段没有这个字段。 */
  function option(o) {
    var mark = o.mark || "idle";
    var cls = "wc-opt";
    if (mark === "right") cls += " is-right";
    else if (mark === "wrong") cls += " is-wrong";
    else if (mark === "muted") cls += " is-muted";
    if (mark !== "idle") cls += " is-locked";
    if (o.w) cls += " has-w";

    return h(
      "div",
      {
        class: cls,
        role: "button",
        tabindex: mark === "idle" ? "0" : "-1",
        "aria-label": (o.pos ? o.pos + " " : "") + o.cn + (o.w ? "（" + o.w + "）" : "")
      },
      h(
        "div",
        { class: "wc-opt-body" },
        o.pos ? h("div", { class: "wc-pos", text: o.pos }) : null,
        h(
          "div",
          { class: "wc-cn" },
          h("span", { text: o.cn }),
          o.w ? h("span", { class: "wc-opt-w", text: o.w }) : null
        )
      ),
      h("i", { class: "wc-num", text: String(o.num || "") })
    );
  }

  /* 读音键：单词 / 例句 / 以后加的同族词都用它。
     text 由调用方通过 dispatch({type:"speak", text}) 指定，组件本身不认识业务。 */
  function speakButton(o) {
    var label = o.label || "朗读";
    return h(
      "button",
      {
        class: "wc-speak" + (o.small ? " is-small" : ""),
        type: "button",
        "aria-label": label,
        title: label,
        on: { click: o.onClick || null }
      },
      icon("sound")
    );
  }

  /* 按钮 */
  function button(o) {
    var kind = o.kind === "quiet" ? "is-quiet" : "is-primary";
    return h("button", {
      class: "wc-btn " + kind,
      type: "button",
      text: o.label,
      disabled: o.disabled ? true : null,
      on: { click: o.onClick || null }
    });
  }

  /* 组色块 */
  function cells(o) {
    var wrap = h("div", { class: "wc-cells" });
    (o.cells || []).forEach(function (c) {
      var cls = "wc-cell";
      if (c.state === "done") cls += " is-done";
      else if (c.state === "active") cls += " is-active";
      else cls += " is-todo";
      wrap.appendChild(
        h("button", {
          class: cls,
          type: "button",
          text: String(c.g),
          title: c.g + " 组 · " + c.mastered + "/" + c.size,
          on: { click: o.onPick ? function () { o.onPick(c.g); } : null }
        })
      );
    });
    return wrap;
  }

  /* 行列表 */
  function rows(o) {
    var wrap = h("div", { class: "wc-rows" });
    (o.rows || []).forEach(function (r) {
      wrap.appendChild(
        h(
          "button",
          { class: "wc-row", type: "button", on: { click: o.onPick ? function () { o.onPick(r.key); } : null } },
          h("span", { text: r.label }),
          h("span", { text: r.n + " 词" })
        )
      );
    });
    return wrap;
  }

  /* Toast：vm.toast 有值才返回节点 */
  function toast(t) {
    if (!t) return null;
    return h("div", { class: "wc-toast" + (t.kind === "err" ? " is-err" : ""), role: "status", text: t.text });
  }

  /* 重置确认流程（v1.14）：选档位 → 执行 → 结果提示。
     桌面和手机只有弹层样式不同（cls），流程和文案必须一模一样，所以放这里。

     两档差别就一句话：
       progress  清记忆，留下备注、收藏和统计 —— 背第二遍用这个
       all       连统计和收藏一起清 —— 只有「想彻底忘掉这件事」才选

     onRun(mode) 由调用方给（app.js 的 resetGame），返回 Promise。
     执行前那边会先备份；备份失败会返回 ok:false，这里只负责把话说清楚。 */
  function resetSheet(o) {
    var opts = o || {};
    var cls = opts.cls || "";

    function open(items) {
      sheet({ cls: cls, items: items });
    }

    function run(mode) {
      if (!opts.onRun) return;
      var p = opts.onRun(mode);
      if (!p || !p.then) return;
      p.then(function (r) {
        if (!r || !r.ok) {
          open([
            {
              label:
                r && r.reason === "backup-failed"
                  ? "备份没写成功，重置已取消 —— 进度一个字没动"
                  : "重置失败：" + ((r && r.reason) || "未知原因"),
              danger: true
            },
            { label: "知道了" }
          ]);
          return;
        }
        /* 重置完最该知道的是「刚才那份存哪了」。浏览器里没有自动备份，
           就退一步提醒导出。 */
        if (r.backup) {
          open([
            {
              label: "已备份 " + r.backup,
              onSelect: function () {
                if (WC.app && WC.app.openBackupFolder) WC.app.openBackupFolder();
              }
            },
            { label: "知道了" }
          ]);
        } else {
          open([
            {
              label: "这里没有自动备份 · 导出一份留着",
              onSelect: function () {
                if (WC.app && WC.app.exportFile) WC.app.exportFile();
              }
            },
            { label: "知道了" }
          ]);
        }
      });
    }

    open([
      {
        label: "重来这一遍 · 清空记忆，保留备注和统计",
        onSelect: function () {
          run("progress");
        }
      },
      {
        label: "彻底清空 · 连统计和收藏一起清",
        danger: true,
        onSelect: function () {
          open([
            { label: "确定彻底清空？日志和收藏都会没有", danger: true, onSelect: function () { run("all"); } },
            { label: "取消" }
          ]);
        }
      },
      { label: "取消" }
    ]);
  }

  /* 底部菜单；插入 body，返回 {close} */
  function sheet(o) {
    var scrim = h("div", { class: "wc-scrim", on: { click: close } });
    var box = h("div", { class: "wc-sheet" + (o.cls ? " " + o.cls : ""), role: "menu" });

    (o.items || []).forEach(function (it) {
      if (it === "-") {
        box.appendChild(h("div", { style: "height:6px" }));
        return;
      }
      box.appendChild(
        h("button", {
          type: "button",
          class: it.danger ? "is-danger" : "",
          text: it.label,
          on: {
            click: function () {
              close();
              if (it.onSelect) it.onSelect();
            }
          }
        })
      );
    });

    document.body.appendChild(scrim);
    document.body.appendChild(box);

    function close() {
      if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
      if (box.parentNode) box.parentNode.removeChild(box);
      if (o.onClose) o.onClose();
    }

    return { close: close };
  }

  /* 分析页：四个数字（作答 / 正确率 / 平均反应 / 连续天数） */
  function statMetrics(items) {
    var list = items || [];
    var wrap = h("div", { class: "wc-stat-metrics" + (list.length === 3 ? " is-3" : "") });
    list.forEach(function (it) {
      wrap.appendChild(
        h(
          "div",
          { class: "wc-stat-metric" },
          h("div", { class: "wc-stat-v", text: String(it.value) }),
          h("div", { class: "wc-stat-k", text: it.label }),
          it.sub ? h("div", { class: "wc-stat-sub", text: it.sub }) : null
        )
      );
    });
    return wrap;
  }

  /* 柱状图：柱高与档位全部由 VM 给（pct / tone），这里只负责画 */
  function statChart(o) {
    var wrap = h("div", {
      class: "wc-stat-chart" + (o.cls ? " " + o.cls : ""),
      role: "img",
      "aria-label": o.ariaLabel || ""
    });
    (o.cols || []).forEach(function (c) {
      wrap.appendChild(
        h(
          "div",
          { class: "wc-stat-col", title: c.title || "" },
          h(
            "div",
            { class: "wc-stat-track" },
            h("i", {
              class: "wc-stat-fill is-" + (c.tone || "none"),
              style: { height: (c.pct || 0) + "%" }
            })
          )
        )
      );
    });
    return wrap;
  }

  /* 「真不会 / 反应最慢」两栏列表 */
  function statRows(rows) {
    var wrap = h("div", { class: "wc-stat-rows" });
    (rows || []).forEach(function (r) {
      wrap.appendChild(
        h(
          "div",
          { class: "wc-stat-row" },
          h(
            "span",
            { class: "wc-stat-row-w" },
            h("span", { text: r.w }),
            r.pos ? h("em", { text: r.pos }) : null
          ),
          h("span", { class: "wc-stat-row-cn", text: r.cn || "" }),
          h("span", { class: "wc-stat-row-n", text: r.text })
        )
      );
    });
    return wrap;
  }

  /* 「叮」：用 WebAudio 现合成，不带音频文件。
     必须在用户手势之后创建/恢复 AudioContext，所以调用点是答题那一刻。 */
  var dingCtx = null;

  /* fresh = true 时丢掉旧上下文重建一个。
     长时间挂机 / 切后台 / 系统音频被打断（来电、拔耳机、蓝牙断开）之后，
     老上下文会停在 suspended（Safari 还有 interrupted），有的设备上它再也 resume 不回来。
     这种情况只能新建一个。 */
  function ensureAudio(fresh) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (dingCtx && (fresh || dingCtx.state === "closed")) {
        try {
          dingCtx.close();
        } catch (e) {
          /* 已经死了的上下文关不掉也无所谓 */
        }
        dingCtx = null;
      }
      if (!dingCtx) dingCtx = new Ctx();
      return dingCtx;
    } catch (e) {
      dingCtx = null;
      return null;
    }
  }

  function resumeAudio(ctx) {
    if (!ctx || ctx.state === "running") return null;
    try {
      var p = ctx.resume();
      return p && p.then ? p : null;
    } catch (e) {
      return null;
    }
  }

  /* 浏览器要求音频上下文在用户手势里创建/恢复。
     注意这里**不设一次性开关**：挂机一晚上再回来，第一次点必须还能把通道重新叫醒；
     只叫一次的话，那一次失败之后就彻底哑了。 */
  function unlockAudio() {
    var ctx = ensureAudio(false);
    if (!ctx || ctx.state === "running") return;
    var p = resumeAudio(ctx);
    if (p) p.catch(function () {});
  }

  function beep(ctx, freq, at, dur, peak, type) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function playBeeps(ctx, kind) {
    try {
      var t0 = ctx.currentTime + 0.01;
      if (kind === "wrong") {
        beep(ctx, 196, t0, 0.16, 0.12, "triangle");
        beep(ctx, 146.8, t0 + 0.1, 0.2, 0.1, "triangle");
      } else {
        beep(ctx, 1046.5, t0, 0.22, 0.16, "sine");
        beep(ctx, 1568, t0 + 0.03, 0.22, 0.06, "sine");
      }
    } catch (e) {
      /* 没有音频设备就当没这回事，不打断背单词 */
    }
  }

  /* 在某个上下文上响一次；叫不醒且允许重建时，换一个新上下文再响。
     重建只做一次，避免死循环。 */
  function playOn(ctx, kind, mayRebuild) {
    if (!ctx) return;
    if (ctx.state === "running") {
      playBeeps(ctx, kind);
      return;
    }
    var retry = function () {
      if (ctx.state === "running") {
        playBeeps(ctx, kind);
        return;
      }
      if (mayRebuild) playOn(ensureAudio(true), kind, false);
    };
    var p = resumeAudio(ctx);
    if (p) p.then(retry).catch(retry);
    else retry();
  }

  /* 提示音：答对用原来的高音「叮」，答错用两声低音；kind 省略时按答对处理。
     用 WebAudio 现合成，不带音频文件。 */
  function ding(kind) {
    playOn(ensureAudio(false), kind, true);
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("pointerdown", unlockAudio, true);
    document.addEventListener("keydown", unlockAudio, true);
    /* 从后台 / 息屏回来时先试着叫醒（没有手势时可能叫不醒，叫不醒就交给下一次点按） */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || !dingCtx) return;
      if (dingCtx.state === "running") return;
      var p = resumeAudio(dingCtx);
      if (p) p.catch(function () {});
    });
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("focus", function () {
        if (!dingCtx || dingCtx.state === "running") return;
        var p = resumeAudio(dingCtx);
        if (p) p.catch(function () {});
      });
      window.addEventListener("pageshow", function () {
        if (!dingCtx || dingCtx.state === "running") return;
        var p = resumeAudio(dingCtx);
        if (p) p.catch(function () {});
      });
    }
  }

  WC.ui = {
    icon: icon, option: option, button: button, speakButton: speakButton,
    cells: cells, rows: rows, toast: toast, sheet: sheet, resetSheet: resetSheet, ding: ding,
    statMetrics: statMetrics, statChart: statChart, statRows: statRows
  };
})(window.WC = window.WC || {});

/* ──────── src/ui/mobile/mobile.js ──────── */
/* mobile.js —— M2 手机界面。一个 render(vm, root, dispatch) 全量重画三页。
   只读 VM（contract.md §6），不读 state、不做判定与调度。
   颜色 / 字号 / 间距全部走 tokens.css 的变量；不出现色值字面量。 */
(function (WC) {
  "use strict";

  var h = WC.dom.h;

  /* ── 小工具 ─────────────────────────────────────────── */

  function tabBar(route, dispatch) {
    var items = [["learn", "学习"], ["library", "词库"], ["stats", "分析"], ["me", "我的"]];
    var bar = h("nav", { class: "mob-tabs", role: "tablist", "aria-label": "主导航" });
    items.forEach(function (it) {
      var on = route === it[0] || (it[0] === "library" && route === "list");
      bar.appendChild(
        h("button", {
          class: "mob-tab" + (on ? " is-on" : ""),
          type: "button",
          role: "tab",
          "aria-selected": on ? "true" : "false",
          text: it[1],
          on: {
            click: function () {
              dispatch({ type: "goto", route: it[0] });
            }
          }
        })
      );
    });
    return bar;
  }

  function iconRow(moreOnClick, actions) {
    var on = actions || {};
    function btn(name, label, handler) {
      if (!handler) return WC.ui.icon(name);
      return h(
        "button",
        {
          class: "mob-icbtn" + (on[name + "On"] ? " is-on" : ""),
          type: "button",
          "aria-label": label,
          on: { click: handler }
        },
        WC.ui.icon(name)
      );
    }
    var more = moreOnClick
      ? h(
          "button",
          {
            class: "mob-more",
            type: "button",
            "aria-label": "更多",
            on: { click: moreOnClick }
          },
          WC.ui.icon("more")
        )
      : WC.ui.icon("more");
    return h(
      "div",
      { class: "mob-ics" },
      btn("star", on.starOn ? "取消收藏" : "收藏", on.onFav),
      more
    );
  }

  function headerActions(vm, dispatch) {
    var word = vm.learn && vm.learn.word;
    if (!word) return {};
    return {
      starOn: !!word.fav,
      onFav: function () { dispatch({ type: word.fav ? "unfav" : "fav" }); }
    };
  }

  function speakKey(dispatch, text, label, small) {
    return WC.ui.speakButton({
      label: label || "朗读 " + text,
      small: !!small,
      onClick: function () { dispatch({ type: "speak", text: text }); }
    });
  }

  function learnHeader(head, onMore, actions) {
    return h(
      "header",
      { class: "mob-top" },
      h("div", { class: "mob-head", text: head }),
      iconRow(onMore, actions)
    );
  }

  function examplePanel(word) {
    return h(
      "div",
      { class: "mob-example" },
      h("div", { class: "mob-ex-en", text: word.en }),
      word.tr ? h("div", { class: "mob-ex-tr", text: word.tr }) : null
    );
  }

  function openMenu(vm, dispatch) {
    var word = vm.learn && vm.learn.word;
    if (!word) return;
    WC.ui.sheet({
      items: [
        {
          label: word.fav ? "取消收藏" : "收藏",
          onSelect: function () {
            dispatch({ type: word.fav ? "unfav" : "fav" });
          }
        },
        {
          label: "标为已掌握",
          onSelect: function () {
            dispatch({ type: "master" });
          }
        },
        {
          label: "备注",
          onSelect: function () {
            // 契约 §7 要求 { type:"note", text }。手机端先用 prompt 收文本，
            // 与桌面端一致；后面换成 sheet + textarea 时只改这一处。
            var text = window.prompt("备注", word.note || "");
            if (text !== null) dispatch({ type: "note", text: text });
          }
        },
        {
          label: "朗读",
          onSelect: function () {
            dispatch({ type: "speak" });
          }
        }
      ]
    });
  }

  /* ── 学习页 ─────────────────────────────────────────── */

  /* 完成页：本组背完 / 整本书为空（契约 §6.1）。这两种 word 都是 null，
     不能用常规 learn 布局，否则一组背完的瞬间就 TypeError。 */
  function donePage(vm, dispatch) {
    var learn = vm.learn;
    var empty = !vm.book || vm.book.total === 0;
    var group = vm.counts && vm.counts.group ? vm.counts.group : { mastered: 0, size: 0 };

    var page = h("main", { class: "mob-page mob-learn mob-done" });
    page.appendChild(
      learnHeader(learn.head, function () { openMenu(vm, dispatch); }, headerActions(vm, dispatch))
    );

    var box = h("div", { class: "mob-done-box" });
    box.appendChild(h("div", { class: "mob-done-title", text: empty ? "还没有词本" : "本组完成" }));
    box.appendChild(
      h("div", {
        class: "mob-done-sub",
        text: empty
          ? "词本接入后就能开始背了"
          : group.mastered + " / " + group.size + " 已掌握"
      })
    );
    if (!empty && learn.cta && learn.cta.label) {
      box.appendChild(
        WC.ui.button({
          label: learn.cta.label,
          kind: "primary",
          onClick: function () { dispatch({ type: "continue" }); }
        })
      );
    }
    page.appendChild(box);
    return page;
  }

  /* 详情页：答错 / 第一次答对之后，停下来看音标、完整释义、例句，点「继续」走 */
  function detailPage(vm, dispatch) {
    var learn = vm.learn;
    var w = learn.word;
    var page = h("main", { class: "mob-page mob-learn mob-detail" });

    page.appendChild(
      learnHeader(learn.head, function () { openMenu(vm, dispatch); }, headerActions(vm, dispatch))
    );

    var body = h("div", { class: "mob-detail-body" });
    body.appendChild(
      h(
        "div",
        { class: "mob-word-row" },
        h("h1", { class: "mob-word-w", text: w.w }),
        speakKey(dispatch, w.w)
      )
    );
    if (w.ph) body.appendChild(h("div", { class: "mob-ph", text: w.ph }));
    body.appendChild(
      h(
        "div",
        { class: "mob-detail-mean" },
        h("span", { class: "mob-detail-pos", text: w.pos }),
        h("span", { class: "mob-detail-cn", text: w.cn })
      )
    );
    if (w.en) {
      var ex = h("div", { class: "mob-detail-ex" });
      ex.appendChild(
        h(
          "div",
          { class: "mob-ex-row" },
          h("div", { class: "mob-ex-en", text: w.en }),
          speakKey(dispatch, w.en, "朗读例句", true)
        )
      );
      if (w.tr) ex.appendChild(h("div", { class: "mob-ex-tr", text: w.tr }));
      body.appendChild(ex);
    }
    if (w.note) body.appendChild(h("div", { class: "mob-detail-note", text: "备注：" + w.note }));
    page.appendChild(body);

    var cta = h("div", { class: "mob-cta" });
    cta.appendChild(
      WC.ui.button({
        label: (learn.cta && learn.cta.label) || "继续",
        kind: "primary",
        onClick: function () { dispatch({ type: "continue" }); }
      })
    );
    page.appendChild(cta);
    return page;
  }

  function learnPage(vm, dispatch) {
    var learn = vm.learn;
    if (learn.phase === "done") return donePage(vm, dispatch);
    if (learn.phase === "detail") return detailPage(vm, dispatch);
    /* flash = 答对后停 1 秒直接下一词；hold = 答错 / 跳过 / 第一次答对，停 1 秒再进详情。
       两个态都不给 CTA：那 1 秒由 core 的定时器接管（§6.2）。 */
    var silent = learn.phase === "flash" || learn.phase === "hold";
    var reveal = learn.phase !== "ask";
    var page = h("main", {
      class: "mob-page mob-learn " + (reveal ? "is-reveal" : "is-ask")
    });

    page.appendChild(
      learnHeader(
        learn.head,
        function () { openMenu(vm, dispatch); },
        headerActions(vm, dispatch)
      )
    );

    page.appendChild(
      h(
        "div",
        { class: "mob-word" },
        h(
          "div",
          { class: "mob-word-row" },
          h("h1", { class: "mob-word-w", text: learn.word.w }),
          speakKey(dispatch, learn.word.w)
        ),
        learn.word.ph ? h("div", { class: "mob-ph", text: learn.word.ph }) : null
      )
    );

    var opts = h("div", { class: "mob-opts" });
    learn.options.forEach(function (o, i) {
      var node = WC.ui.option({ pos: o.pos, cn: o.cn, w: o.w, num: i + 1, mark: o.mark });
      if (o.mark === "idle") {
        node.addEventListener("click", function () {
          dispatch({ type: "answer", i: i });
        });
        node.addEventListener("keydown", function (ev) {
          if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
          if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
            ev.preventDefault();
            dispatch({ type: "answer", i: i });
          }
        });
      }
      opts.appendChild(node);
    });
    page.appendChild(opts);

    if (reveal) {
      /* 那 1 秒里只留选项的对错标记，不摆按钮 —— 摆了也来不及点 */
      if (silent) return page;

      var cta = h("div", { class: "mob-cta" });
      cta.appendChild(
        WC.ui.button({
          label: (learn.cta && learn.cta.label) || "继续",
          kind: "primary",
          onClick: function () {
            dispatch({ type: "continue" });
          }
        })
      );
      // 方案交互表：手机端撤销是「底部小字」，不能只有桌面有 Z
      if (vm.canUndo) {
        cta.appendChild(
          h("button", {
            class: "mob-undo",
            type: "button",
            text: "撤销",
            on: {
              click: function () {
                dispatch({ type: "undo" });
              }
            }
          })
        );
      }
      page.appendChild(cta);
    } else {
      page.appendChild(
        h(
          "div",
          { class: "mob-skip" },
          h("button", {
            class: "mob-skip-btn",
            type: "button",
            text: "不认识 · 看详情",
            on: {
              click: function () {
                dispatch({ type: "skip" });
              }
            }
          })
        )
      );
    }

    return page;
  }

  /* ── 词汇列表（收藏 / 待复习 / 已掌握 / 全部） ───────── */

  function listPage(vm, dispatch) {
    var L = vm.list;
    var page = h("main", { class: "mob-page mob-lib mob-list" });

    page.appendChild(
      h(
        "div",
        { class: "mob-list-top" },
        h("button", {
          class: "mob-back",
          type: "button",
          text: "‹ 词库",
          on: { click: function () { dispatch({ type: "goto", route: "library" }); } }
        }),
        h("div", { class: "mob-list-count", text: L.total + " 词" })
      )
    );
    page.appendChild(h("div", { class: "mob-list-h", text: L.title }));

    var card = h("div", { class: "wc-card mob-list-card" });
    if (!L.words.length) {
      card.appendChild(
        h("div", { class: "mob-empty", text: L.key === "review" ? "没有待复习的词，很干净" : L.key === "learning" ? "还没有在学的词" : "这里是空的" })
      );
    } else {
      L.words.forEach(function (w) {
        card.appendChild(
          h(
            "div",
            { class: "wc-word" },
            h("span", { class: "wc-word-w", text: w.w }),
            h("span", { class: "wc-word-cn", text: w.cn }),
            h("span", { class: "wc-word-sta", text: w.sta })
          )
        );
      });
      if (L.truncated) {
        card.appendChild(
          h("div", { class: "mob-empty", text: "只显示前 " + L.words.length + " 条" })
        );
      }
    }
    page.appendChild(card);
    return page;
  }

  /* 换书目：底部弹层，列出所有已加载的词本；只有一本时也照常显示（能看出当前是哪本） */
  function openBookSheet(vm, dispatch) {
    var books = vm.books || [];
    if (!books.length) {
      WC.ui.sheet({
        items: [{ label: "还没有词本", onSelect: function () {} }, "-", { label: "取消", onSelect: function () {} }]
      });
      return;
    }
    var items = books.map(function (b) {
      return {
        label: (b.active ? "✓ " : "　 ") + b.name + " · " + b.total + " 词",
        onSelect: function () {
          dispatch({ type: "pickBook", id: b.id });
        }
      };
    });
    WC.ui.sheet({ items: items });
  }

  /* ── 词库页 ─────────────────────────────────────────── */

  function libraryPage(vm, dispatch) {
    var page = h("main", { class: "mob-page mob-lib" });
    var group = vm.counts.group;
    var pct = group.size > 0 ? Math.round((group.mastered / group.size) * 100) : 0;

    page.appendChild(
      h(
        "header",
        { class: "mob-lib-top" },
        h("div", { class: "mob-title", text: "词库" }),
        h("div", { class: "mob-ics" }, WC.ui.icon("more"))
      )
    );

    page.appendChild(
      h(
        "section",
        { class: "wc-card mob-card mob-bookcard" },
        h(
          "button",
          {
            class: "mob-bookrow",
            type: "button",
            on: {
              click: function () {
                openBookSheet(vm, dispatch);
              }
            }
          },
          h("span", { class: "mob-card-label", text: vm.book.name + " · 第 " + group.g + " 组" }),
          h("span", { class: "mob-bookrow-swap", text: "换书 ›" })
        ),
        h(
          "div",
          { class: "mob-card-line" },
          h("span", { class: "mob-card-big", text: String(group.mastered) }),
          h("span", { class: "mob-card-cap", text: "/ " + group.size + " 已掌握" })
        ),
        h("div", { class: "wc-bar mob-bar" }, h("i", { style: { width: pct + "%" } }))
      )
    );

    page.appendChild(
      h(
        "section",
        { class: "mob-groups" },
        h("div", { class: "mob-eyebrow", text: vm.book.groups + " 组" }),
        WC.ui.cells({
          cells: vm.groups,
          onPick: function (g) {
            dispatch({ type: "pickGroup", g: g });
          }
        })
      )
    );

    page.appendChild(
      h(
        "section",
        { class: "wc-card mob-card mob-lib-rows" },
        WC.ui.rows({
          rows: vm.library.rows,
          onPick: function (key) {
            dispatch({ type: "pickList", key: key });
          }
        })
      )
    );

    return page;
  }

  /* ── 我的页 ─────────────────────────────────────────── */

  var THEMES = [
    ["g1", "晨粉"],
    ["g2", "雾蓝"],
    ["g3", "烟紫"]
  ];

  function mePage(vm, dispatch) {
    var page = h("main", { class: "mob-page mob-me" });

    page.appendChild(
      h("header", { class: "mob-me-top" }, h("div", { class: "mob-title", text: "我的" }))
    );

    var themeList = h("div", { class: "mob-themes", role: "radiogroup", "aria-label": "画布主题" });
    THEMES.forEach(function (t) {
      var on = vm.settings.theme === t[0];
      themeList.appendChild(
        h(
          "button",
          {
            class: "mob-theme" + (on ? " is-on" : ""),
            type: "button",
            role: "radio",
            "aria-checked": on ? "true" : "false",
            on: {
              click: function () {
                dispatch({ type: "theme", theme: t[0] });
              }
            }
          },
          h("span", { class: "mob-swatch strip-" + t[0] }),
          h("span", { class: "mob-theme-label", text: t[1] }),
          h("span", { class: "mob-check", text: on ? "✓" : "" })
        )
      );
    });
    page.appendChild(
      h("section", { class: "mob-sec" }, h("div", { class: "mob-eyebrow", text: "主题" }), themeList)
    );

    var autoOn = !!vm.settings.autoSpeak;
    page.appendChild(
      h(
        "section",
        { class: "mob-setting" },
        h("span", { class: "mob-setting-label", text: "自动朗读" }),
        h(
          "button",
          {
            class: "mob-switch" + (autoOn ? " is-on" : ""),
            type: "button",
            role: "switch",
            "aria-checked": autoOn ? "true" : "false",
            "aria-label": "自动朗读",
            on: {
              click: function () {
                dispatch({ type: "autoSpeak", on: !autoOn });
              }
            }
          },
          h("i", { "aria-hidden": "true" })
        )
      )
    );

    page.appendChild(
      h(
        "section",
        { class: "mob-sec" },
        h("div", { class: "mob-eyebrow", text: "数据" }),
        h(
          "div",
          { class: "wc-card mob-card mob-data" },
          h(
            "button",
            {
              class: "wc-row",
              type: "button",
              on: {
                click: function () {
                  if (WC.app && WC.app.exportFile) WC.app.exportFile();
                }
              }
            },
            h("span", { text: "导出" }),
            h("span", { class: "mob-row-hint", text: "下载 JSON" })
          ),
          h(
            "button",
            {
              class: "wc-row",
              type: "button",
              on: {
                click: function () {
                  if (WC.app && WC.app.pickImport) WC.app.pickImport();
                }
              }
            },
            h("span", { text: "导入" }),
            h("span", { class: "mob-row-hint", text: "按词取新，不覆盖" })
          ),
          WC.app && WC.app.backupEnabled && WC.app.backupEnabled()
            ? h(
                "button",
                {
                  class: "wc-row",
                  type: "button",
                  on: {
                    click: function () {
                      if (WC.app && WC.app.openBackupFolder) WC.app.openBackupFolder();
                    }
                  }
                },
                h("span", { text: "备份" }),
                h("span", { class: "mob-row-hint", text: "打开文件夹" })
              )
            : null,
          h(
            "button",
            {
              class: "wc-row",
              type: "button",
              on: {
                click: function () {
                  if (!WC.ui || !WC.ui.resetSheet || !WC.app || !WC.app.resetGame) return;
                  WC.ui.resetSheet({
                    onRun: function (mode) { return WC.app.resetGame(mode); }
                  });
                }
              }
            },
            h("span", { text: "重置" }),
            h("span", { class: "mob-row-hint", text: "背完重来一遍" })
          )
        )
      )
    );

    page.appendChild(
      h("div", {
        class: "mob-foot",
        text: "v7 · " + vm.counts.total + " 词 · 进度在本机，可导出"
      })
    );

    return page;
  }

  /* ── 分析页（P7） ───────────────────────────────────── */

  function statHead(title, badge) {
    return h(
      "div",
      { class: "wc-stat-head" },
      h("div", { class: "wc-stat-h", text: title }),
      badge ? h("span", { class: "wc-stat-badge", text: badge }) : null
    );
  }

  function statAxis(labels) {
    var row = h("div", { class: "wc-stat-axis" });
    labels.forEach(function (t) {
      row.appendChild(h("span", { text: t }));
    });
    return row;
  }

  function statCard(children) {
    var card = h("section", { class: "wc-card mob-card mob-stat-card" });
    (children || []).forEach(function (c) { if (c) card.appendChild(c); });
    return card;
  }

  function statsPage(vm, dispatch) {
    var S = vm.stats;
    var page = h("main", { class: "mob-page mob-stats" });
    var has = !!(S && S.totals && S.totals.n > 0);

    page.appendChild(
      h(
        "header",
        { class: "mob-stats-top" },
        h("div", { class: "mob-title", text: "分析" }),
        h("div", {
          class: "mob-stats-sub",
          text: "按「" + vm.book.name + "」· " + (has ? S.totals.days + " 天记录" : "本地答题日志")
        })
      )
    );

    if (!has) {
      page.appendChild(
        statCard([
          h("div", { class: "mob-stat-empty-t", text: "还没有答题记录" }),
          h("div", {
            class: "mob-stat-empty-s",
            text: "背几道题，这里就会出现正确率、时段分布和 14 天走势。"
          }),
          h(
            "div",
            { class: "mob-stat-empty-cta" },
            WC.ui.button({
              label: "去学习",
              kind: "primary",
              onClick: function () { dispatch({ type: "goto", route: "learn" }); }
            })
          )
        ])
      );
      return page;
    }

    page.appendChild(
      statCard([
        WC.ui.statMetrics([
          { value: S.totals.n, label: "累计作答", sub: "本书 " + S.totals.days + " 天" },
          { value: S.totals.rate + "%", label: "正确率", sub: "错 " + S.totals.wrong + " 次" },
          { value: S.totals.streak + " 天", label: "连续学习", sub: "今天没练会断" }
        ])
      ])
    );

    var when = statCard([
      statHead("时段效率", S.peakHour ? S.peakHour.text : "样本还不够"),
      WC.ui.statChart({ cols: S.hours, ariaLabel: "24 小时答题占比，全部词本合计" }),
      statAxis(["0 点", "6 点", "12 点", "18 点", "23 点"]),
      h("div", {
        class: "wc-stat-cap",
        text: "柱高 = 占全部作答的比例（全部词本合计 " + S.hourTotal +
          " 题）；颜色越深越准，少于 5 题不下结论。"
      }),
      h(
        "div",
        { class: "wc-stat-block" },
        statHead("星期节奏", ""),
        WC.ui.statChart({ cols: S.week, ariaLabel: "周一到周日答题占比，全部词本合计" }),
        statAxis(["周一", "周二", "周三", "周四", "周五", "周六", "周日"])
      )
    ]);
    page.appendChild(when);

    page.appendChild(
      statCard([
        statHead("最近 14 天", S.totals.streak > 1 ? "连 " + S.totals.streak + " 天" : ""),
        WC.ui.statChart({ cols: S.daily, ariaLabel: "最近 14 天答题量与正确率" }),
        statAxis(["14 天前", "今天"]),
        h("div", { class: "wc-stat-legend" }, [
          h("span", { class: "wc-stat-dot is-strong" }),
          h("span", { text: "≥80%" }),
          h("span", { class: "wc-stat-dot" }),
          h("span", { text: "50–79%" }),
          h("span", { class: "wc-stat-dot is-weak" }),
          h("span", { text: "<50%" })
        ])
      ])
    );

    page.appendChild(
      h("div", {
        class: "mob-stat-foot",
        text: "数据来自本机答题日志，不上传；手动标掌握不计正确率。"
      })
    );

    return page;
  }

  /* ── 全量渲染 ───────────────────────────────────────── */

  /* 只换自己的类，保留 app.js 挂在 root 上的 app-root / app-mobile 等 */
  function setRootClass(root, theme, route) {
    var keep = [];
    var old = (root.className || "").split(/\s+/);
    for (var i = 0; i < old.length; i++) {
      var c = old[i];
      if (!c) continue;
      if (c === "mob-root" || c === "is-canvas" || c === "is-mgr" || /^t-g\d+$/.test(c)) continue;
      keep.push(c);
    }
    keep.push("mob-root", "t-" + (theme || "g1"));
    keep.push(route === "learn" ? "is-canvas" : "is-mgr");
    root.className = keep.join(" ");
  }

  var lastPhase = null;

  function render(vm, root, dispatch) {
    /* 每次判分（ask → flash/hold）响一次：答对高音、答错 / 跳过低音。
       detail 是 hold 那 1 秒之后的二次渲染，不能再响，所以只认 ask → flash/hold。
       hold 与 flash 一样要在这里，否则答错就静音了。 */
    if (vm.learn && (vm.learn.phase === "flash" || vm.learn.phase === "hold") &&
        lastPhase === "ask") {
      var wrong = vm.learn.picked !== null && vm.learn.picked !== vm.learn.answer;
      WC.ui.ding(wrong || vm.learn.skipped ? "wrong" : "right");
    }
    lastPhase = vm.learn ? vm.learn.phase : null;
    root.textContent = "";
    setRootClass(root, vm.theme, vm.route);

    var page;
    if (vm.route === "library") page = libraryPage(vm, dispatch);
    else if (vm.route === "list") page = listPage(vm, dispatch);
    else if (vm.route === "stats") page = statsPage(vm, dispatch);
    else if (vm.route === "me") page = mePage(vm, dispatch);
    else page = learnPage(vm, dispatch);

    root.appendChild(page);
    root.appendChild(tabBar(vm.route, dispatch));

    // toast 插在「继续 / 跳过」之前，随页面上移，不覆盖任何东西
    var toast = WC.ui.toast(vm.toast);
    if (toast) {
      // 放进 CTA / 跳过容器的最前面：贴着按钮上方，跟着按钮走
      var anchor = page.querySelector(".mob-cta") || page.querySelector(".mob-skip");
      if (anchor) anchor.insertBefore(toast, anchor.firstChild);
      else page.appendChild(toast);
    }
  }

  WC.mobile = { render: render };
})(window.WC = window.WC || {});

/* ──────── src/ui/desktop/desktop.js ──────── */
/* desktop.js —— M4 桌面布局。
   两个出口：
     WC.desktop.render(vm, root, dispatch)   全量重渲染（幂等），只读 VM
     WC.desktop.bindKeys(dispatch)           桌面激活时调用一次，返回解绑函数
   这里不读 state、不算业务数值、不拼文案：head / pct / mark / answer / canUndo /
   cta / hints 全部来自 VM。按键只做「把意图翻译成事件」。
*/
(function (WC) {
  "use strict";

  var h = WC.dom.h;
  var THEMES = ["g1", "g2", "g3"];
  var currentVM = null;
  var activeUnbind = null;

  function themeOf(vm) {
    return THEMES.indexOf(vm.theme) >= 0 ? vm.theme : THEMES[0];
  }

  function send(dispatch, action) {
    if (typeof dispatch === "function") dispatch(action);
  }

  function speakKey(dispatch, text, label, small) {
    return WC.ui.speakButton({
      label: label || "朗读 " + text,
      small: !!small,
      onClick: function () { send(dispatch, { type: "speak", text: text }); }
    });
  }

  /* ── 侧栏 ─────────────────────────────────────────────── */

  function navAction(key, dispatch) {
    if (key === "today") send(dispatch, { type: "goto", route: "learn" });
    else if (key === "review") send(dispatch, { type: "pickList", key: "review" });
    else if (key === "learning") send(dispatch, { type: "pickList", key: "learning" });
    else if (key === "fav") send(dispatch, { type: "pickList", key: "fav" });
    else if (key === "mastered") send(dispatch, { type: "pickList", key: "mastered" });
  }

  /* 换词本：居中弹出的小面板（WC.ui.sheet 在桌面端收窄） */
  function openBookSheet(vm, dispatch) {
    var books = vm.books || [];
    var items = books.length
      ? books.map(function (b) {
          return {
            label: (b.active ? "✓ " : "　 ") + b.name + " · " + b.total + " 词",
            onSelect: function () {
              send(dispatch, { type: "pickBook", id: b.id });
            }
          };
        })
      : [{ label: "还没有词本", onSelect: function () {} }];
    WC.ui.sheet({ items: items, cls: "desk-sheet" });
  }

  function buildSidebar(vm, dispatch) {
    var scroll = h("div", { class: "desk-side-scroll" });

    scroll.appendChild(
      h(
        "button",
        {
          class: "desk-book desk-book-btn",
          type: "button",
          title: "切换词本",
          on: { click: function () { openBookSheet(vm, dispatch); } }
        },
        h("span", { text: vm.book.name + " · " + vm.book.total + " 词" }),
        h("span", { class: "desk-book-swap", text: "换书" })
      )
    );

    var nav = h("nav", { class: "desk-nav", "aria-label": "单词本导航" });
    var items = [
      { key: "today", label: "今天", n: vm.counts.today },
      { key: "review", label: "待复习", n: vm.counts.review },
      { key: "learning", label: "学习中", n: vm.counts.learning },
      { key: "fav", label: "收藏", n: vm.counts.fav },
      { key: "mastered", label: "已掌握", n: vm.counts.mastered }
    ];
    /* 四个筛选项只在学习页有意义；「词库 / 我的」是页面，单独做成链接（见下） */
    var current =
      vm.route === "learn" ? "today"
      : vm.route === "list" && vm.list ? vm.list.key
      : null;
    items.forEach(function (it) {
      nav.appendChild(
        h(
          "button",
          {
            class: "desk-nav-item" + (it.key === current ? " is-on" : ""),
            type: "button",
            "aria-current": it.key === current ? "page" : null,
            on: {
              click: function () {
                navAction(it.key, dispatch);
              }
            }
          },
          h("span", { class: "desk-nav-label", text: it.label }),
          h("span", { class: "desk-nav-n", text: String(it.n) })
        )
      );
    });
    scroll.appendChild(nav);

    scroll.appendChild(h("div", { class: "desk-rule" }));
    scroll.appendChild(h("div", { class: "desk-side-h", text: "分组" }));
    scroll.appendChild(
      h(
        "div",
        { class: "desk-groups" },
        WC.ui.cells({
          cells: vm.groups,
          onPick: function (g) {
            send(dispatch, { type: "pickGroup", g: g });
          }
        })
      )
    );

    /* 页面导航：桌面端也得能进「词库」「我的」，否则主题、导入导出全无处可达 */
    scroll.appendChild(h("div", { class: "desk-rule" }));
    [
      { route: "library", label: "词库", n: vm.book.groups + " 组" },
      { route: "stats", label: "分析", n: "" },
      { route: "me", label: "我的", n: "" }
    ].forEach(function (pg) {
      var on = vm.route === pg.route;
      scroll.appendChild(
        h(
          "button",
          {
            class: "desk-nav-item" + (on ? " is-on" : ""),
            type: "button",
            "aria-current": on ? "page" : null,
            on: { click: function () { send(dispatch, { type: "goto", route: pg.route }); } }
          },
          h("span", { class: "desk-nav-label", text: pg.label }),
          h("span", { class: "desk-nav-n", text: pg.n })
        )
      );
    });

    /* 键位提示只在用得上的时候出现：
       ask = 完整两组；detail = 只剩「空格 继续」；其余页面（词库/我的/列表/done）不显示 */
    var lines = [];
    if (vm.learn && vm.learn.phase === "ask") {
      lines = [vm.learn.hints.answer, vm.learn.hints.pick + "   " + vm.learn.hints.undo];
    } else if (vm.learn && vm.learn.phase === "detail") {
      lines = ["空格 继续"];
    }

    return h(
      "aside",
      { class: "desk-side is-" + ((vm.settings && vm.settings.side) || "grad"), "aria-label": "侧栏" },
      scroll,
      lines.length
        ? h(
            "div",
            { class: "desk-hints" },
            lines.map(function (t) { return h("div", { class: "desk-hint-line", text: t }); })
          )
        : null
    );
  }

  /* ── 顶行 ─────────────────────────────────────────────── */

  function dot() {
    return h("span", { class: "desk-act-sep", "aria-hidden": "true", text: "·" });
  }

  function openNote(vm, dispatch) {
    var word = vm.learn && vm.learn.word;
    if (!word) return;
    if (typeof window.prompt !== "function") {
      send(dispatch, { type: "note", text: word.note || "" });
      return;
    }
    var text = window.prompt("备注 · " + word.w, word.note || "");
    if (text === null) return;
    send(dispatch, { type: "note", text: text });
  }

  function buildTop(vm, dispatch) {
    var actions = h("div", { class: "desk-top-actions" });

    actions.appendChild(
      h(
        "button",
        {
          class: "desk-act",
          type: "button",
          disabled: vm.canUndo ? null : true,
          on: {
            click: function () {
              send(dispatch, { type: "undo" });
            }
          }
        },
        "撤销"
      )
    );
    actions.appendChild(dot());
    actions.appendChild(
      h(
        "button",
        {
          class: "desk-act",
          type: "button",
          on: {
            click: function () {
              send(dispatch, { type: "fav" });
            }
          }
        },
        "收藏"
      )
    );
    actions.appendChild(dot());
    actions.appendChild(
      h(
        "button",
        {
          class: "desk-act",
          type: "button",
          on: {
            click: function () {
              openNote(vm, dispatch);
            }
          }
        },
        "备注"
      )
    );

    return h(
      "div",
      { class: "desk-top" },
      h("div", { class: "desk-head", text: vm.learn.head }),
      actions
    );
  }

  /* ── 大卡 ─────────────────────────────────────────────── */

  function buildCard(vm, dispatch) {
    var learn = vm.learn;
    var word = learn.word;

    var top = h(
      "div",
      { class: "desk-card-top" },
      h(
        "div",
        { class: "desk-word-row" },
        h("div", { class: "desk-word", text: word.w }),
        speakKey(dispatch, word.w)
      ),
      word.ph ? h("div", { class: "desk-ph", text: word.ph }) : null
    );

    var grid = h("div", { class: "desk-opts" });
    learn.options.forEach(function (o, i) {
      var node = WC.ui.option({ pos: o.pos, cn: o.cn, w: o.w, num: i + 1, mark: o.mark });
      if (o.mark === "idle") {
        node.addEventListener("click", function () {
          send(dispatch, { type: "answer", i: i });
        });
      }
      grid.appendChild(node);
    });

    var mid = h("div", { class: "desk-card-mid" }, grid);
    if (learn.phase === "detail" && word.en) {
      mid.appendChild(
        h(
          "div",
          { class: "desk-ex" },
          h(
            "div",
            { class: "desk-ex-row" },
            h("div", { class: "desk-ex-en", text: word.en }),
            speakKey(dispatch, word.en, "朗读例句", true)
          ),
          word.tr ? h("div", { class: "desk-ex-tr", text: word.tr }) : null
        )
      );
    }

    var isAsk = learn.phase === "ask";

    var left = h(
      "div",
      { class: "desk-foot-left" },
      h(
        "button",
        {
          class: "desk-link",
          type: "button",
          on: {
            click: function () {
              send(dispatch, { type: "skip" });
            }
          }
        },
        "不认识 · 看详情"
      ),
      h("span", { class: "desk-dot", "aria-hidden": "true", text: "·" }),
      h(
        "button",
        {
          class: "desk-link",
          type: "button",
          on: {
            click: function () {
              send(dispatch, { type: "master" });
            }
          }
        },
        "标为已掌握"
      )
    );

    /* 那 1 秒里的右下角提示要说实话：flash 是直接走，hold 是看完转详情 */
    var right;
    if (learn.phase === "flash") {
      right = h("div", { class: "desk-foot-right desk-foot-tip", text: "自动进入下一词" });
    } else if (learn.phase === "hold") {
      right = h("div", { class: "desk-foot-right desk-foot-tip", text: "稍候看详情" });
    } else {
      right = h("div", { class: "desk-foot-right desk-foot-tip", text: "空格继续" });
    }

    return h(
      "div",
      { class: "desk-card t-" + themeOf(vm) },
      top,
      mid,
      h("div", { class: "desk-foot" }, isAsk ? left : h("div", { class: "desk-foot-left" }), right)
    );
  }

  /* ── 词汇列表（收藏 / 待复习 / 已掌握 / 全部） ───────── */

  function buildList(vm) {
    var L = vm.list;
    var main = h("main", { class: "desk-main desk-list" });
    main.appendChild(
      h(
        "div",
        { class: "desk-list-top" },
        h("div", { class: "desk-list-h", text: L.title }),
        h("div", { class: "desk-list-n", text: L.total + " 词" })
      )
    );
    var card = h("section", { class: "desk-list-card" });
    if (!L.words.length) {
      card.appendChild(
        h("div", { class: "desk-empty", text: L.key === "review" ? "没有待复习的词，很干净" : "这里是空的" })
      );
    } else {
      L.words.forEach(function (w) {
        card.appendChild(
          h(
            "div",
            { class: "wc-word" },
            h("span", { class: "wc-word-w", text: w.w }),
            h("span", { class: "wc-word-cn", text: w.cn }),
            h("span", { class: "wc-word-sta", text: w.g + " 组 · " + w.sta })
          )
        );
      });
      if (L.truncated) card.appendChild(h("div", { class: "desk-empty", text: "只显示前 " + L.words.length + " 条" }));
    }
    main.appendChild(card);
    return main;
  }

  /* ── 非学习页的简化主区（词库 / 我的） ───────────────── */

  function buildPlain(vm, dispatch) {
    var isLibrary = vm.route === "library";
    var box = h(
      "section",
      { class: "desk-plain" },
      h("div", { class: "desk-plain-h", text: isLibrary ? "词库" : "我的" })
    );

    if (isLibrary && vm.library) {
      box.appendChild(
        h(
          "div",
          { class: "desk-plain-card desk-bookcard" },
          h(
            "div",
            { class: "desk-bookcard-main" },
            h("div", { class: "desk-bookcard-name", text: vm.book.name }),
            h("div", {
              class: "desk-bookcard-sub",
              text: vm.book.total + " 词 · " + vm.book.groups + " 组"
            })
          ),
          h("button", {
            class: "desk-bookcard-btn",
            type: "button",
            text: "换书 ›",
            on: { click: function () { openBookSheet(vm, dispatch); } }
          })
        )
      );
      box.appendChild(
        h(
          "div",
          { class: "desk-plain-card" },
          WC.ui.rows({
            rows: vm.library.rows,
            onPick: function (key) {
              send(dispatch, { type: "pickList", key: key });
            }
          })
        )
      );
    } else {
      /* 主题：三个色卡，深墨描边标当前项（与手机「我的」一致） */
      var tcard = h("div", { class: "desk-plain-card desk-kv" });
      [
        ["g1", "晨粉"],
        ["g2", "雾蓝"],
        ["g3", "烟紫"]
      ].forEach(function (pair) {
        var on = vm.settings.theme === pair[0];
        tcard.appendChild(
          h(
            "button",
            {
              class: "desk-theme-row" + (on ? " is-on" : ""),
              type: "button",
              on: {
                click: function () {
                  send(dispatch, { type: "theme", theme: pair[0] });
                }
              }
            },
            h("span", { class: "desk-swatch strip-" + pair[0] }),
            h("span", { class: "desk-theme-name", text: pair[1] }),
            h("span", { class: "desk-check", text: on ? "✓" : "" })
          )
        );
      });
      box.appendChild(tcard);

      /* 侧栏背景：渐变（跟右侧同一块）或纯白 */
      var sideCard = h("div", { class: "desk-plain-card desk-kv" });
      [
        ["grad", "跟背景同渐变"],
        ["white", "纯白"]
      ].forEach(function (pair) {
        var on = (vm.settings.side || "grad") === pair[0];
        sideCard.appendChild(
          h(
            "button",
            {
              class: "desk-theme-row" + (on ? " is-on" : ""),
              type: "button",
              on: { click: function () { send(dispatch, { type: "side", side: pair[0] }); } }
            },
            h("span", { class: "desk-theme-name", text: pair[1] }),
            h("span", { class: "desk-check", text: on ? "✓" : "" })
          )
        );
      });
      /* 小标题放进卡片第一行，避免又一层容器 */
      sideCard.insertBefore(
        h("div", { class: "desk-kv-row desk-kv-label" }, h("span", { text: "侧栏背景" })),
        sideCard.firstChild
      );
      box.appendChild(sideCard);

      /* 自动朗读 */
      box.appendChild(
        h(
          "div",
          { class: "desk-plain-card desk-kv" },
          h(
            "button",
            {
              class: "desk-kv-row desk-kv-btn",
              type: "button",
              on: {
                click: function () {
                  send(dispatch, { type: "autoSpeak", on: !vm.settings.autoSpeak });
                }
              }
            },
            h("span", { text: "自动朗读" }),
            h("span", { class: "desk-switch" + (vm.settings.autoSpeak ? " is-on" : ""), "aria-hidden": "true" })
          )
        )
      );

      var kv = h("div", { class: "desk-plain-card desk-kv" });
      [
        ["今日", vm.counts.today],
        ["待复习", vm.counts.review],
        ["学习中", vm.counts.learning],
        ["收藏", vm.counts.fav],
        ["已掌握", vm.counts.mastered]
      ].forEach(function (pair) {
        kv.appendChild(
          h(
            "div",
            { class: "desk-kv-row" },
            h("span", { text: pair[0] }),
            h("span", { class: "desk-kv-n", text: String(pair[1]) })
          )
        );
      });
      box.appendChild(kv);

      // 导出 / 导入：文件对话框由 app.js 管（UI 不碰 storage，也不拼 JSON）
      var data = h("div", { class: "desk-plain-card desk-kv" });
      var dataRows = [
        ["导出", "下载 JSON", function () { if (WC.app) WC.app.exportFile(); }],
        ["导入", "按词取新，不覆盖", function () { if (WC.app) WC.app.pickImport(); }]
      ];
      /* 自动备份只在 macOS 壳里有（window.WCBackup）。浏览器里不显示这一行，
         否则点了没反应，比没有更糟。 */
      if (WC.app && WC.app.backupEnabled && WC.app.backupEnabled()) {
        dataRows.push(["备份", "打开文件夹", function () { if (WC.app) WC.app.openBackupFolder(); }]);
      }
      /* 重置：背完一遍之后再背一遍。危险操作，流程（两档 + 确认 + 备份）在 WC.ui.resetSheet */
      dataRows.push([
        "重置",
        "背完重来一遍",
        function () {
          if (!WC.ui || !WC.ui.resetSheet || !WC.app || !WC.app.resetGame) return;
          WC.ui.resetSheet({
            cls: "desk-sheet",
            onRun: function (mode) { return WC.app.resetGame(mode); }
          });
        }
      ]);
      dataRows.forEach(function (row) {
        data.appendChild(
          h(
            "button",
            { class: "desk-kv-row desk-kv-btn", type: "button", on: { click: row[2] } },
            h("span", { text: row[0] }),
            h("span", { class: "desk-kv-n", text: row[1] })
          )
        );
      });
      box.appendChild(data);
    }

    return box;
  }

  /* ── 分析页（P7） ─────────────────────────────────────── */

  function statHead(title, badge) {
    return h(
      "div",
      { class: "wc-stat-head" },
      h("div", { class: "wc-stat-h", text: title }),
      badge ? h("span", { class: "wc-stat-badge", text: badge }) : null
    );
  }

  function statAxis(labels) {
    var row = h("div", { class: "wc-stat-axis" });
    labels.forEach(function (t) {
      row.appendChild(h("span", { text: t }));
    });
    return row;
  }

  function statCard(children) {
    var card = h("section", { class: "desk-plain-card desk-stat-card" });
    (children || []).forEach(function (c) { if (c) card.appendChild(c); });
    return card;
  }

  function buildStats(vm, dispatch) {
    var S = vm.stats;
    var wrap = h("section", { class: "desk-stats" });
    var has = !!(S && S.totals && S.totals.n > 0);

    wrap.appendChild(
      h(
        "div",
        { class: "desk-stats-top" },
        h("div", { class: "desk-plain-h", text: "分析" }),
        h("div", {
          class: "desk-stats-sub",
          text: "按「" + vm.book.name + "」· " + (has ? S.totals.days + " 天记录" : "本地答题日志")
        })
      )
    );

    if (!has) {
      wrap.appendChild(
        statCard([
          h("div", { class: "desk-stat-empty-t", text: "还没有答题记录" }),
          h("div", {
            class: "desk-stat-empty-s",
            text: "背几道题，这里就会出现正确率、高效时段和反复错的词。"
          }),
          h(
            "div",
            { class: "desk-stat-empty-cta" },
            WC.ui.button({
              label: "去学习",
              kind: "primary",
              onClick: function () { send(dispatch, { type: "goto", route: "learn" }); }
            })
          )
        ])
      );
      return wrap;
    }

    wrap.appendChild(
      statCard([
        WC.ui.statMetrics([
          { value: S.totals.n, label: "累计作答", sub: "本书 " + S.totals.days + " 天" },
          { value: S.totals.rate + "%", label: "正确率", sub: "错 " + S.totals.wrong + " 次" },
          { value: S.totals.streak + " 天", label: "连续学习", sub: "今天没练会断" }
        ])
      ])
    );

    var when = statCard([
      statHead("时段效率", S.peakHour ? S.peakHour.text : "样本还不够"),
      WC.ui.statChart({ cols: S.hours, ariaLabel: "24 小时答题占比，全部词本合计" }),
      statAxis(["0 点", "6 点", "12 点", "18 点", "23 点"]),
      h("div", {
        class: "wc-stat-cap",
        text: "柱高 = 占全部作答的比例（全部词本合计 " + S.hourTotal +
          " 题）；颜色越深越准，少于 5 题不下结论。"
      }),
      h(
        "div",
        { class: "wc-stat-block" },
        statHead("星期节奏", ""),
        WC.ui.statChart({ cols: S.week, ariaLabel: "周一到周日答题占比，全部词本合计" }),
        statAxis(["周一", "周二", "周三", "周四", "周五", "周六", "周日"])
      )
    ]);

    var trend = statCard([
      statHead("最近 14 天", S.totals.streak > 1 ? "连 " + S.totals.streak + " 天" : ""),
      WC.ui.statChart({ cols: S.daily, ariaLabel: "最近 14 天答题量与正确率" }),
      statAxis(["14 天前", "今天"]),
      h("div", { class: "wc-stat-legend" }, [
        h("span", { class: "wc-stat-dot is-strong" }),
        h("span", { text: "≥80%" }),
        h("span", { class: "wc-stat-dot" }),
        h("span", { text: "50–79%" }),
        h("span", { class: "wc-stat-dot is-weak" }),
        h("span", { text: "<50%" })
      ])
    ]);

    wrap.appendChild(
      h(
        "div",
        { class: "desk-stats-grid" },
        h("div", { class: "desk-stats-col" }, when),
        h("div", { class: "desk-stats-col" }, trend)
      )
    );
    wrap.appendChild(
      h("div", {
        class: "desk-stats-foot",
        text: "数据来自本机答题日志，不上传；手动标掌握不计正确率。"
      })
    );
    return wrap;
  }

  function buildMain(vm, dispatch) {
    var main = h("main", { class: "desk-main" });
    if (vm.stats) {
      main.appendChild(buildStats(vm, dispatch));
      return main;
    }
    if (vm.list) {
      return buildList(vm);
    }
    if (vm.learn && vm.learn.phase === "done") {
      main.appendChild(buildTop(vm, dispatch));
      main.appendChild(buildDone(vm, dispatch));
    } else if (vm.learn && vm.learn.phase === "detail") {
      main.appendChild(buildTop(vm, dispatch));
      main.appendChild(buildDetail(vm, dispatch));
    } else if (vm.learn) {
      main.appendChild(buildTop(vm, dispatch));
      main.appendChild(buildCard(vm, dispatch));
    } else {
      main.appendChild(buildPlain(vm, dispatch));
    }
    return main;
  }

  /* 完成页：本组背完 / 空词本（契约 §6.1）。word 为 null，不能走 buildCard。 */
  function buildDone(vm, dispatch) {
    var learn = vm.learn;
    var empty = !vm.book || vm.book.total === 0;
    var group = (vm.counts && vm.counts.group) || { mastered: 0, size: 0 };

    var card = h("section", { class: "desk-card t-" + themeOf(vm) + " desk-done" });
    var box = h("div", { class: "desk-done-box" });
    box.appendChild(
      h("div", { class: "desk-done-title", text: empty ? "还没有词本" : "本组完成" })
    );
    box.appendChild(
      h("div", {
        class: "desk-done-sub",
        text: empty
          ? "把 cet4 词本放进 src/data/books 再重新构建"
          : group.mastered + " / " + group.size + " 已掌握"
      })
    );
    if (!empty && learn.cta && learn.cta.label) {
      var wrap = h("div", { class: "desk-done-cta" });
      wrap.appendChild(
        WC.ui.button({
          label: learn.cta.label,
          kind: "primary",
          onClick: function () { dispatch({ type: "continue" }); }
        })
      );
      box.appendChild(wrap);
    }
    card.appendChild(box);
    return card;
  }

  /* 详情页：答错 / 第一次答对之后停下来看，点「继续」走（契约 §6.2） */
  function buildDetail(vm, dispatch) {
    var learn = vm.learn;
    var w = learn.word;
    var card = h("section", { class: "desk-card t-" + themeOf(vm) + " desk-detail" });

    var body = h("div", { class: "desk-detail-body" });
    body.appendChild(
      h(
        "div",
        { class: "desk-word-row" },
        h("div", { class: "desk-word", text: w.w }),
        speakKey(dispatch, w.w)
      )
    );
    if (w.ph) body.appendChild(h("div", { class: "desk-ph", text: w.ph }));
    body.appendChild(
      h(
        "div",
        { class: "desk-detail-mean" },
        h("span", { class: "desk-detail-pos", text: w.pos }),
        h("span", { class: "desk-detail-cn", text: w.cn })
      )
    );
    if (w.en) {
      body.appendChild(
        h(
          "div",
          { class: "desk-ex desk-detail-ex" },
          h(
            "div",
            { class: "desk-ex-row" },
            h("div", { class: "desk-ex-en", text: w.en }),
            speakKey(dispatch, w.en, "朗读例句", true)
          ),
          w.tr ? h("div", { class: "desk-ex-tr", text: w.tr }) : null
        )
      );
    }
    if (w.note) body.appendChild(h("div", { class: "desk-detail-note", text: "备注：" + w.note }));
    card.appendChild(body);

    var cta = h("div", { class: "desk-detail-cta" });
    cta.appendChild(
      WC.ui.button({
        label: (learn.cta && learn.cta.label) || "继续",
        kind: "primary",
        onClick: function () { send(dispatch, { type: "continue" }); }
      })
    );
    card.appendChild(cta);
    return card;
  }

  /* ── 全量渲染 ─────────────────────────────────────────── */

  var lastPhase = null;

  function render(vm, root, dispatch) {
    if (!vm || !root) return;
    /* 每次判分（ask → flash/hold）响一次：答对高音、答错 / 跳过低音。
       hold 不能漏 —— 答错走的是 hold，1 秒后转 detail 时不该再响。 */
    if (vm.learn && (vm.learn.phase === "flash" || vm.learn.phase === "hold") &&
        lastPhase === "ask") {
      var wrong = vm.learn.picked !== null && vm.learn.picked !== vm.learn.answer;
      WC.ui.ding(wrong || vm.learn.skipped ? "wrong" : "right");
    }
    lastPhase = vm.learn ? vm.learn.phase : null;
    currentVM = vm;

    var theme = themeOf(vm);
    if (root.classList) {
      for (var i = 0; i < THEMES.length; i++) root.classList.remove("t-" + THEMES[i]);
      root.classList.add("t-" + theme);
    }

    var shell = h(
      "div",
      { class: "desk-root t-" + theme + (vm.route === "learn" ? " is-learn" : " is-mgmt") },
      buildSidebar(vm, dispatch),
      buildMain(vm, dispatch)
    );
    WC.dom.mount(root, shell);

    var toast = WC.ui.toast(vm.toast);
    if (toast) root.appendChild(toast);
  }

  /* ── 键盘 ─────────────────────────────────────────────── */

  function bindKeys(dispatch) {
    if (activeUnbind) activeUnbind();

    function isTypingTarget(t) {
      if (!t) return false;
      if (t.isContentEditable) return true;
      var tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function onKey(e) {
      if (!e || e.defaultPrevented || e.isComposing) return;
      /* Cmd / Ctrl / Alt 一律放行：Cmd+1 是切标签页，不能劫持 */
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      var vm = currentVM;
      var learn = vm && vm.learn;
      if (!learn) return;
      var key = e.key;

      if (key === "1" || key === "2" || key === "3" || key === "4") {
        if (learn.phase !== "ask") return;
        var i = Number(key) - 1;
        var opt = learn.options && learn.options[i];
        if (!opt || opt.mark !== "idle") return;
        e.preventDefault();
        send(dispatch, { type: "answer", i: i });
        return;
      }

      if (key === " " || key === "Spacebar" || e.code === "Space") {
        if (learn.phase === "ask") {
          e.preventDefault();
          send(dispatch, { type: "skip" });
          return;
        }
        if (learn.phase === "detail") {
          e.preventDefault();
          send(dispatch, { type: "continue" });
          return;
        }
        return;
      }

      if (key === "Enter") {
        if (learn.phase === "ask") {
          e.preventDefault();
          send(dispatch, { type: "skip" });
          return;
        }
        if (learn.phase === "detail") {
          e.preventDefault();
          send(dispatch, { type: "continue" });
          return;
        }
        return;
      }

      if (typeof key !== "string" || key.length !== 1) return;
      var k = key.toLowerCase();

      if (k === "z") {
        if (!vm.canUndo) return;
        e.preventDefault();
        send(dispatch, { type: "undo" });
        return;
      }

      if (k === "f") {
        e.preventDefault();
        send(dispatch, { type: "fav" });
        return;
      }

      if (k === "n") {
        e.preventDefault();
        openNote(vm, dispatch);
      }
    }

    document.addEventListener("keydown", onKey, true);

    function unbind() {
      document.removeEventListener("keydown", onKey, true);
      if (activeUnbind === unbind) activeUnbind = null;
    }

    activeUnbind = unbind;
    return unbind;
  }

  WC.desktop = { render: render, bindKeys: bindKeys };
})(window.WC = window.WC || {});

/* ──────── src/core/types.js ──────── */
/* types.js —— JSDoc 类型定义，不含运行代码。字段口径以 contract.md §2 为准。

/**
 * @typedef {Object} Word            词条（静态，随书） §2.1
 * @property {string} w             单词，书内唯一键
 * @property {string} ph            音标，可空串
 * @property {string} pos           词性（显示用 + 干扰项同词性判据）
 * @property {string} cn            中文释义
 * @property {string} en            例句英文，可空串
 * @property {string} tr            例句译文，可空串
 * @property {number} g             组号 1..groups
 *
 * @typedef {Object} Book            词本 §2.2
 * @property {string} id
 * @property {string} name
 * @property {number} groups
 * @property {Word[]} words
 *
 * @typedef {Object} WordState       逐词进度 §2.3
 * @property {number} ok            累计答对 0..3，封顶 3
 * @property {number} bad           累计答错 >=0，不因复习通过清零
 * @property {number} rev           连续复习答对 0..2
 * @property {number} at            最后变更 unix 秒
 * @property {string} note          备注，可空
 *
 * @typedef {Object} ProgressFile    落盘文件 §2.5（只含 v/active/books/p/log）
 *
 * @typedef {Object} LogEvent        日志事件 §2.6
 * @property {string} w  @property {string} b  @property {number} g
 * @property {number} ok            1 答对 / 0 答错
 * @property {string} k             pick | skip | master | undo
 * @property {number} ms            出题到作答毫秒
 * @property {string[]} opts        四个选项文字快照
 * @property {?number} picked       所选序号 0..3，跳过为 null
 * @property {number} t             unix 秒
 *
 * @typedef {Object} Sched           10 词滑动窗口 §4
 * @property {number} g
 * @property {string[]} queue
 * @property {string[]} pool
 *
 * 运行时 state（不落盘部分）：sched / session / ui / undo / seen / book / clock / bookIdx。
 * fav（收藏）自 v1.4 起落盘。
*/

/* ──────── src/core/derive.js ──────── */
/* derive.js —— 派生判定（contract §2.4）。纯函数，不改入参。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  function pendingReview(ws) {
    return !!ws && ws.ok >= 3 && ws.bad > 0 && ws.rev < 2;
  }

  /* 已掌握不含待复习，两类互斥（§2.4） */
  function mastered(ws) {
    return !!ws && ws.ok >= 3 && !pendingReview(ws);
  }

  /* 五分类，互斥且完备：mastered + pending + learning + new + untouched === 组词数。
     new = 有记录但零进度（如只写过备注），untouched = 无记录。 */
  function classify(ws) {
    if (!ws) return "untouched";
    if (pendingReview(ws)) return "pending";
    if (ws.ok >= 3) return "mastered";
    if (ws.ok === 0 && ws.bad === 0) return "new";
    return "learning";
  }

  function blankGroup(g) {
    return { g: g, size: 0, mastered: 0, pending: 0, learning: 0, untouched: 0, new: 0 };
  }

  /* 全书 + 各组计数，一次遍历。组词集合固定，不随掌握缩小（§4）。 */
  function summarize(book, wmap) {
    var groups = {};
    var g, i;
    for (g = 1; g <= book.groups; g++) groups[g] = blankGroup(g);
    var total = blankGroup(0);
    var words = book.words || [];
    for (i = 0; i < words.length; i++) {
      var w = words[i];
      var cls = classify(wmap ? wmap[w.w] : null);
      var gg = groups[w.g] || (groups[w.g] = blankGroup(w.g));
      gg.size++;
      gg[cls]++;
      total.size++;
      total[cls]++;
    }
    var list = [];
    for (g = 1; g <= book.groups; g++) list.push(groups[g]);
    return { total: total, groups: list, byGroup: groups };
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  /* unix 秒 → 本地 "YYYY-MM-DD"。只用 Date 构造器做既有时间戳的换算，不取「现在」。
     同一时间戳反复换算（todayCount 每次渲染都扫全量日志），做一层记忆化。 */
  var dayCache = {};
  function dayOf(t) {
    var hit = dayCache[t];
    if (hit !== undefined) return hit;
    var d = new Date(t * 1000);
    var s = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    dayCache[t] = s;
    return s;
  }

  /* 今日已判分数：判分动作 pick / skip / master 计入；undo 只记账不计数 */
  var JUDGED = { pick: 1, skip: 1, master: 1 };
  function todayCount(entries, today) {
    var n = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (JUDGED[e.k] && dayOf(e.t) === today) n++;
    }
    return n;
  }

  core.derive = {
    pendingReview: pendingReview,
    mastered: mastered,
    classify: classify,
    summarize: summarize,
    dayOf: dayOf,
    todayCount: todayCount
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/grader.js ──────── */
/* grader.js —— 判分与状态转移（contract §3）+ 连点闸门（§3.2）。纯函数，不改入参。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  var GATE_MS = 150;

  function base(ws) {
    return ws || { ok: 0, bad: 0, rev: 0, at: 0, note: "" };
  }

  /* apply(ws, ev) → ws'。ev = { ok: 0|1, k: "pick"|"skip"|"master", t: unix秒 }。
     转移表（§3 逐行）：
       选对 且 ok<3            → ok += 1
       选对 且 ok=3 且待复习   → rev += 1（rev 到 2 即转正，bad 保留）
       选对 且 ok=3 且已掌握   → 无变化（ok 封顶 3）
       选错 / 跳过             → bad += 1，rev = 0
       标为已掌握              → ok=3，bad=0，rev=0
     判定「无变化」时返回入参本身（===），调用方据此不写日志、不占撤销栈、不刷新 at。
     每次变更刷新 at = ev.t。未知字段原样带走（§9 前向兼容）。 */
  function apply(ws, ev) {
    var cur = base(ws);
    var next = null;
    function changed(patch) {
      next = {};
      var k;
      for (k in cur) next[k] = cur[k];
      for (k in patch) next[k] = patch[k];
      next.at = ev.t;
      if (typeof next.note !== "string") next.note = "";
    }
    if (ev.k === "master") {
      if (cur.ok === 3 && cur.bad === 0 && cur.rev === 0) return ws;
      changed({ ok: 3, bad: 0, rev: 0 });
    } else if (ev.ok === 1) {
      if (cur.ok < 3) {
        changed({ ok: cur.ok + 1 });
      } else if (core.derive.pendingReview(cur)) {
        changed({ rev: cur.rev + 1 });
      } else {
        return ws;
      }
    } else {
      changed({ bad: cur.bad + 1, rev: 0 });
    }
    return next;
  }

  /* 150ms 连点闸门：距上一次判分动作不足 GATE_MS 则整条丢弃（§3.2） */
  function gateAllowed(lastMs, nowMs) {
    return nowMs - lastMs >= GATE_MS;
  }

  core.grader = { apply: apply, gateAllowed: gateAllowed, GATE_MS: GATE_MS };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/schedule.js ──────── */
/* schedule.js —— 10 词滑动窗口（contract §4）。纯函数，确定性：同 (book, state) 必得同题。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  var WINDOW = 10;

  /* 进组：该组未掌握词按书中原顺序取前 WINDOW 个进 queue，其余进 pool。
     「未掌握」含待复习（§2.4：pendingReview 不算 mastered）。
     组词集合固定，不因掌握而缩小（§4）。 */
  function initGroup(book, wmap, g) {
    var queue = [];
    var pool = [];
    var words = book.words || [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.g !== g) continue;
      if (core.derive.mastered(wmap ? wmap[w.w] : null)) continue;
      if (queue.length < WINDOW) queue.push(w.w);
      else pool.push(w.w);
    }
    return { g: g, queue: queue, pool: pool };
  }

  function current(sched) {
    return sched.queue[0] || null;
  }

  function done(sched) {
    return sched.queue.length === 0 && sched.pool.length === 0;
  }

  /* 判分后只动 queue（§4）：
       已掌握 → 从 queue 移除（无论它排第几，master 在 reveal 态补刀也安全），不再回来；
       否则   → 仅当它是 queue[0] 时移到末尾（答错最多隔 9 张卡重现）；
       queue 不满 WINDOW 时从 pool 头部补齐。 */
  function afterJudge(sched, wordId, isMastered) {
    var queue = sched.queue.slice();
    var pool = sched.pool.slice();
    var qi = queue.indexOf(wordId);
    if (isMastered) {
      if (qi >= 0) queue.splice(qi, 1);
    } else if (qi === 0) {
      queue.push(queue.shift());
    }
    while (queue.length < WINDOW && pool.length > 0) queue.push(pool.shift());
    return { g: sched.g, queue: queue, pool: pool };
  }

  /* 从 g+1 起第一组未完成的；全书完成返回 null */
  function nextGroup(book, wmap, g) {
    for (var n = g + 1; n <= book.groups; n++) {
      var s = initGroup(book, wmap, n);
      if (!done(s)) return s;
    }
    return null;
  }

  core.schedule = {
    WINDOW: WINDOW,
    initGroup: initGroup,
    current: current,
    done: done,
    afterJudge: afterJudge,
    nextGroup: nextGroup
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/quiz.js ──────── */
/* quiz.js —— 四选一干扰项（contract §5）。确定性：同 seed 必得同结果，无随机源。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32：确定性伪随机序列，仅用于选项洗牌，不涉及出题顺序（出题见 schedule） */
  function rng(seed) {
    var a = hash(seed);
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 同词根判据（§5.3）：词首 2 个字符相同即排除（abandon / abandonment 类） */
  function sameRoot(a, b) {
    if (a.length < 2 || b.length < 2) return a === b;
    return a.slice(0, 2) === b.slice(0, 2);
  }

  /* seed：字符串，或 { w: 词id, n: 本词第几次出题 }。
     正确项位置 = (hash(w) + n) % 4 —— 由 seed 决定、每次出题重洗，
     且同一词连续两次出现位置必然相差 1（§5.4）。 */
  function normSeed(seed) {
    if (seed && typeof seed === "object") return { w: String(seed.w), n: seed.n | 0 };
    return { w: String(seed), n: 0 };
  }

  /* build(word, candidates, seed) → { options: [4 × {pos, cn, w}], answer: 正确项下标 }
     挑选顺序（§5.2）：同 pos 且字数差 ≤2 → ≤3 → ≤4 → 同 pos 不限字数 → 跨 pos；
     同词根在所有档位一律排除；四个选项 cn 两两不同（§5.5）。 */
  function build(word, candidates, seed) {
    var s = normSeed(seed);
    var rand = rng(s.w + "@" + s.n);
    var target = word.cn.length;

    var pool = [];
    var i, c;
    for (i = 0; i < candidates.length; i++) {
      c = candidates[i];
      if (c.w === word.w || c.cn === word.cn) continue;
      pool.push(c);
    }
    var noRoot = pool.filter(function (c) { return !sameRoot(c.w, word.w); });

    var picked = [];
    var used = {};
    /* 部分洗牌：每次只把随机选中项换到头部，避免每次整列重洗 */
    function take(list) {
      var sh = list.slice();
      for (var j = 0; j < sh.length && picked.length < 3; j++) {
        var r = j + Math.floor(rand() * (sh.length - j));
        var tmp = sh[j];
        sh[j] = sh[r];
        sh[r] = tmp;
        var cn = sh[j].cn;
        if (used[cn]) continue;
        used[cn] = true;
        picked.push(sh[j]);
      }
    }
    function samePos(list, limit) {
      return list.filter(function (c) {
        return c.pos === word.pos && Math.abs(c.cn.length - target) <= limit;
      });
    }

    var limits = [2, 3, 4];
    for (i = 0; i < limits.length && picked.length < 3; i++) take(samePos(noRoot, limits[i]));
    if (picked.length < 3) {
      take(noRoot.filter(function (c) { return c.pos === word.pos; }));
    }
    if (picked.length < 3) take(noRoot); // 跨 pos 补
    /* 兜底：极端小词本最后才放宽同词根限制，cn 互不相同始终保证（见交付歧义清单） */
    if (picked.length < 3) take(pool);

    /* 每个选项都带上自己那个词的拼写（w）：答完揭示时 UI 要把干扰项对应的单词也亮出来，
       只靠一份 cn 是猜不回词的（同义/近义的 cn 可能撞车）。见 contract v1.12。 */
    var options = picked.map(function (c) { return { pos: c.pos, cn: c.cn, w: c.w }; });
    var answer = (hash(s.w) + s.n) % (options.length + 1);
    options.splice(answer, 0, { pos: word.pos, cn: word.cn, w: word.w });
    return { options: options, answer: answer };
  }

  core.quiz = { build: build, hash: hash, sameRoot: sameRoot };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/log.js ──────── */
/* log.js —— LogEvent（contract §2.6）：追加、按月归档的读取、去重键 (w,b,t,k)。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  function key(e) {
    return [e.w, e.b, e.t, e.k].join("");
  }

  /* 读：数组（未归档）与按月归档对象两种都接受（§2.5）。归档对象按月名排序摊平。 */
  function entries(log) {
    if (!log) return [];
    if (Array.isArray(log)) return log;
    var out = [];
    var months = [];
    for (var m in log) months.push(m);
    months.sort();
    for (var i = 0; i < months.length; i++) {
      var arr = log[months[i]];
      if (Array.isArray(arr)) {
        for (var j = 0; j < arr.length; j++) out.push(arr[j]);
      }
    }
    return out;
  }

  function monthOf(t) {
    var d = new Date(t * 1000);
    var m = d.getMonth() + 1;
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m;
  }

  /* 追加：保持原形态——数组直接加；归档对象加到当月桶。返回使用的 log 容器。 */
  function append(log, e) {
    if (!log || Array.isArray(log)) {
      var arr = log || [];
      arr.push(e);
      return arr;
    }
    var m = monthOf(e.t);
    if (!Array.isArray(log[m])) log[m] = [];
    log[m].push(e);
    return log;
  }

  /* 并集去重（§8 merge 用）：按 (w,b,t,k) 去重，先入先留 */
  function union(a, b) {
    var seen = {};
    var out = [];
    var all = entries(a).concat(entries(b));
    for (var i = 0; i < all.length; i++) {
      var k = key(all[i]);
      if (seen[k]) continue;
      seen[k] = true;
      out.push(all[i]);
    }
    return out;
  }

  core.log = { key: key, entries: entries, append: append, monthOf: monthOf, union: union };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/migrate.js ──────── */
/* migrate.js —— 存储版本与迁移（contract §9）：只加字段、不改字段、不删字段。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  var VERSION = 7;

  /* 运行时专用键：落盘时剔除（§2.5 只落 ProgressFile），其余键（含未知字段）原样保留 */
  /* fav 已改为持久化（契约 v1.4）：收藏列表是可见功能，刷新就清空等于没有 */
  var RUNTIME = { sched: 1, session: 1, ui: 1, undo: 1, seen: 1, book: 1, clock: 1, bookIdx: 1, allBooks: 1 };

  function fresh(active) {
    return {
      v: VERSION,
      active: active || null,
      books: {},
      p: { theme: "g1", autoSpeak: false, side: "grad" },
      fav: {},
      log: []
    };
  }

  /* v6 → v7：WordState 补 rev / note；顶层补 books / p / log / active；未知字段保留 */
  function fillWord(ws) {
    if (!ws || typeof ws !== "object") return;
    if (typeof ws.rev !== "number") ws.rev = 0;
    if (typeof ws.note !== "string") ws.note = "";
  }

  function anyToCurrent(raw) {
    if (!raw || typeof raw !== "object") return null;
    var out = {};
    for (var k in raw) out[k] = raw[k];
    if (typeof out.v !== "number" || out.v < VERSION) out.v = VERSION;
    if (!out.books || typeof out.books !== "object") out.books = {};
    for (var id in out.books) {
      var b = out.books[id];
      if (!b || typeof b !== "object") {
        out.books[id] = { w: {} };
        continue;
      }
      if (!b.w || typeof b.w !== "object") b.w = {};
      for (var w in b.w) fillWord(b.w[w]);
    }
    if (!out.p || typeof out.p !== "object") out.p = { theme: "g1", autoSpeak: false };
    if (typeof out.p.theme !== "string") out.p.theme = "g1";
    if (typeof out.p.autoSpeak !== "boolean") out.p.autoSpeak = false;
    if (out.p.side !== "grad" && out.p.side !== "white") out.p.side = "grad";
    if (!out.fav || typeof out.fav !== "object") out.fav = {};
    if (!out.log) out.log = [];
    if (typeof out.active !== "string") out.active = null;
    return out;
  }

  /* ProgressFile（§2.5）：剔运行时键；迁移带上来的未知字段随包保留 */
  function toFile(state) {
    var out = {};
    for (var k in state) {
      if (RUNTIME[k]) continue;
      out[k] = state[k];
    }
    out.v = VERSION;
    return out;
  }

  function serialize(state) {
    return JSON.stringify(toFile(state));
  }

  core.migrate = {
    VERSION: VERSION,
    fresh: fresh,
    anyToCurrent: anyToCurrent,
    toFile: toFile,
    serialize: serialize
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/analysis.js ──────── */
/* analysis.js —— P7 分析（contract §6.2 / v1.11）：纯函数，吃日志吐统计，零 DOM。
   只做「从 LogEvent 里能直接算出来的事」，不猜。判定口径与 §2.6 / §3 一致：
     - pick / skip 算一次作答，skip 与选错等价（ok:0）；
     - master 是手动标掌握，计入动作数，但不计正确率（没经过四选一）；
     - undo 只记账，不参与任何统计。

   v1.11 三处口径调整（用户 2026-11-24 决定）：
     1. 不再产出任何「反应时间」类指标。e.ms 是「卡片出现到作答」的间隔，
        中途走开 / 切窗口 / 息屏都会记成几十秒，只有 150ms 下限、没有上限，
        所以「平均反应」「反应最慢」量的是我什么时候离开过，不是哪个词不熟。
     2. 时段（24 小时）与星期改为**跨词本**累计，并给出「占全部作答的百分比」。
        回答的是「我习惯在每天哪个时间背、那时候占多少」——跟具体哪本书无关。
        其余指标（累计作答 / 正确率 / 连续天数 / 14 天走势）仍按当前词本。
     3. 结论从「正确率最高的时段」改为「题量最大的时段」，因为前者答的是
        「哪段最准」，而用户要的是「哪段最常背」。
     4. 连续学习天数改为**跨词本**：它衡量的是「我这个人有没有坚持」，
        交替背两本书不该把连续记录打断。`totals.days`（本书有记录的天数）仍按书算。
     - hard（真不会）继续算、继续返回，但 UI 暂不展示（用户说 app 化后再做功能）。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  var WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  var HARD_CAP = 8;    // 「真不会」最多列 8 个词（暂不展示，保留数据）
  var PEAK_MIN = 5;    // 时段样本少于 5 题不下结论，避免 1 题 100% 的噪声
  var DAYS = 14;       // 最近 14 天

  function rateOf(ok, n) {
    return n > 0 ? Math.round((ok / n) * 100) : 0;
  }

  function toneOf(rate, n) {
    if (!n) return "none";
    if (rate >= 80) return "strong";
    if (rate >= 50) return "mid";
    return "weak";
  }

  /* "YYYY-MM-DD" 加减天数。用本地 Date 构造器做日历运算，不取「现在」。 */
  function dayShift(day, delta) {
    var p = day.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + delta);
    return core.derive.dayOf(Math.floor(d.getTime() / 1000));
  }

  function emptySeries(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ n: 0, ok: 0 });
    return out;
  }

  /* 给柱子补展示用字段：pct = 柱高（相对本序列最大题量），tone = 正确率档位。
     UI 只负责把 pct 变成 height、把 tone 变成 class，不再自己算比例。 */
  function decorate(series) {
    var max = 0;
    var i;
    for (i = 0; i < series.length; i++) if (series[i].n > max) max = series[i].n;
    for (i = 0; i < series.length; i++) {
      var b = series[i];
      b.rate = rateOf(b.ok, b.n);
      b.tone = toneOf(b.rate, b.n);
      b.pct = b.n > 0 && max > 0 ? Math.max(6, Math.round((b.n / max) * 100)) : 0;
    }
    return series;
  }

  function analyze(log, opts) {
    opts = opts || {};
    var bookId = typeof opts.bookId === "string" ? opts.bookId : "";
    var words = opts.words || {};
    var entries = core.log.entries(log);

    var hours = emptySeries(24);   // 24 小时：跨词本
    var week = emptySeries(7);     // 星期：跨词本
    var hourTotal = 0;             // 时段百分比的分母 = 所有词本的作答题数
    var days = {};       // 当前词本有记录的天（给 totals.days 用）
    var allDays = {};    // 所有词本有记录的天（给 streak 用）
    var byWord = {};
    var totals = { n: 0, ok: 0, wrong: 0, actions: 0 };
    var firstAt = 0;
    var lastAt = 0;

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e || (e.k !== "pick" && e.k !== "skip" && e.k !== "master")) continue;
      /* 这本书 vs 别的书：只有「时段 / 星期」不分书，其余都只认当前词本 */
      var inBook = !bookId || !e.b || e.b === bookId;
      var t = Number(e.t) || 0;

      /* 连续天数不分书：哪天动过笔就算哪天 */
      if (t > 0) {
        var dAll = core.derive.dayOf(t);
        if (dAll) allDays[dAll] = true;
      }

      if (inBook) {
        if (t > 0) {
          if (!firstAt || t < firstAt) firstAt = t;
          if (t > lastAt) lastAt = t;
          var d0 = core.derive.dayOf(t);
          if (d0) days[d0] = true;
        }
        totals.actions++;
      }

      if (e.k === "master") continue; // 手动标掌握不算一次四选一

      var ok = e.ok === 1 ? 1 : 0;

      /* 时段 / 星期：不分词本，全部作答一起算 */
      hourTotal++;
      if (t > 0) {
        var dt = new Date(t * 1000);
        var hb = hours[dt.getHours()];
        hb.n++;
        hb.ok += ok;
        var wd = (dt.getDay() + 6) % 7;
        week[wd].n++;
        week[wd].ok += ok;
      }

      if (!inBook) continue;

      totals.n++;
      totals.ok += ok;
      if (!ok) totals.wrong++;

      var wid = e.w;
      if (!wid) continue;
      var ws = byWord[wid] || (byWord[wid] = { tries: 0, wrong: 0 });
      ws.tries++;
      if (!ok) ws.wrong++;
    }

    var today = typeof opts.today === "string" && opts.today
      ? opts.today
      : (lastAt ? core.derive.dayOf(lastAt) : "");

    var dayList = [];
    for (var dk in days) if (days[dk]) dayList.push(dk);
    dayList.sort();

    /* 连续学习天数：从今天（今天没练就从昨天）往前数。跨词本——衡量习惯，不是衡量哪本书。 */
    var streak = 0;
    if (today) {
      var cursor = allDays[today] ? today : dayShift(today, -1);
      while (allDays[cursor]) {
        streak++;
        cursor = dayShift(cursor, -1);
      }
    }

    /* 最近 14 天：按当前词本 */
    var daily = [];
    for (var k = DAYS - 1; k >= 0; k--) {
      var day = today ? dayShift(today, -k) : "";
      daily.push({ date: day, label: day ? day.slice(5) : "", n: 0, ok: 0 });
    }
    for (i = 0; i < entries.length; i++) {
      var ee = entries[i];
      if (!ee || (ee.k !== "pick" && ee.k !== "skip")) continue;
      if (bookId && ee.b && ee.b !== bookId) continue;
      if (!ee.t) continue;
      var key = core.derive.dayOf(ee.t);
      for (var j = 0; j < daily.length; j++) {
        if (daily[j].date === key) {
          daily[j].n++;
          if (ee.ok === 1) daily[j].ok++;
          break;
        }
      }
    }

    /* 时段占比：把「每个小时有多少题」换成「占全部作答的百分之几」 */
    var shareOf = function (n) {
      return hourTotal > 0 ? Math.round((n / hourTotal) * 100) : 0;
    };

    var hb2;
    for (i = 0; i < 24; i++) {
      hb2 = hours[i];
      hb2.h = i;
      hb2.label = i + " 点";
      hb2.share = shareOf(hb2.n);
      hb2.title = hb2.n
        ? i + " 点 · " + hb2.n + " 题 · 占 " + hb2.share + "% · 正确率 " + rateOf(hb2.ok, hb2.n) + "%"
        : i + " 点 · 无记录";
    }
    for (i = 0; i < 7; i++) {
      week[i].d = i;
      week[i].label = WEEK[i];
      week[i].title = WEEK[i] + " · " + week[i].n + " 题" +
        (week[i].n ? " · 占 " + shareOf(week[i].n) + "% · " + rateOf(week[i].ok, week[i].n) + "%" : "");
    }
    for (i = 0; i < daily.length; i++) {
      daily[i].title = (daily[i].date || "—") + " · " + daily[i].n + " 题" +
        (daily[i].n ? " · " + rateOf(daily[i].ok, daily[i].n) + "%" : "");
    }

    decorate(hours);
    decorate(week);
    decorate(daily);

    /* 结论：题量最大的时段（不是正确率最高的那段）。
       「我习惯什么时候背」是题量问题；「那段准不准」是另一个问题，用 rate 一并给出。 */
    var peak = null;
    for (i = 0; i < 24; i++) {
      var hc = hours[i];
      if (hc.n < PEAK_MIN) continue;
      if (!peak || hc.n > peak.n || (hc.n === peak.n && hc.rate > peak.rate)) peak = hc;
    }

    var hard = [];
    for (var wid2 in byWord) {
      var st = byWord[wid2];
      var meta = words[wid2] || {};
      var row = {
        w: wid2,
        pos: meta.pos || "",
        cn: meta.cn || "",
        g: meta.g || 0,
        tries: st.tries,
        wrong: st.wrong,
        rate: rateOf(st.tries - st.wrong, st.tries)
      };
      row.text = "错 " + st.wrong + " / " + st.tries + " 次";
      /* 「真不会」至少错两次、且错率不低；只错一次可能是手滑，不放进榜单。 */
      if (st.wrong >= 2 && row.rate <= 60) hard.push(row);
    }
    hard.sort(function (a, b) {
      return b.wrong - a.wrong || a.rate - b.rate || b.tries - a.tries ||
        (a.w < b.w ? -1 : a.w > b.w ? 1 : 0);
    });
    hard = hard.slice(0, HARD_CAP);

    return {
      totals: {
        n: totals.n,
        ok: totals.ok,
        wrong: totals.wrong,
        rate: rateOf(totals.ok, totals.n),
        actions: totals.actions,
        days: dayList.length,
        streak: streak,
        firstAt: firstAt,
        lastAt: lastAt
      },
      hourTotal: hourTotal,
      peakHour: peak
        ? { h: peak.h, n: peak.n, share: peak.share, rate: peak.rate,
            text: peak.h + " 点 · 占 " + peak.share + "%" }
        : null,
      hours: hours,
      week: week,
      daily: daily,
      hard: hard
    };
  }

  core.analysis = { analyze: analyze };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/viewmodel.js ──────── */
/* viewmodel.js —— toViewModel(state, {viewport}) → VM（contract §6，字段逐字对应）。
   每次调用返回一份全新对象，UI 全量重渲染。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  /* §6 样例文案。viewport 当前不影响输出——契约只说「影响 learn.head 与
     keyboardHints」但未给两种视口的文案，按最保守理解两端一致（见交付歧义清单）。 */
  var HINTS = { answer: "空格 看答案", pick: "1–4 选项", undo: "Z 撤销" };

  function wordIndex(book) {
    var map = {};
    var words = book.words || [];
    for (var i = 0; i < words.length; i++) map[words[i].w] = words[i];
    return map;
  }

  function groupState(gs, activeG) {
    if (gs.size > 0 && gs.mastered >= gs.size) return "done";
    if (gs.g === activeG) return "active";
    return "todo";
  }

  function learnVM(state, book, sum, idx) {
    var s = state.session;
    var g = state.sched.g;
    var gstat = sum.byGroup[g] || { size: 0, mastered: 0 };
    /* 本组第几张 = 组词数 − 剩余未掌握(queue+pool) + 1，恒在 [1, size] */
    var remaining = state.sched.queue.length + state.sched.pool.length;
    var pos = gstat.size === 0 ? 0 : Math.min(gstat.size, gstat.size - remaining + 1);
    var head = "第 " + g + " 组 · " + pos + " / " + gstat.size;

    var word = null;
    if (s.wordId && idx[s.wordId]) {
      var bw = idx[s.wordId];
      var ws = (state.books[book.id] && state.books[book.id].w[s.wordId]) || null;
      word = {
        w: bw.w, ph: bw.ph, pos: bw.pos, cn: bw.cn, en: bw.en, tr: bw.tr,
        fav: !!state.fav[bw.w],
        note: ws && typeof ws.note === "string" ? ws.note : ""
      };
    }

    /* reveal = 已经判完分、可以公开答案的三个态：
       detail（停下来看详情）/ flash（停 1 秒下一词）/ hold（停 1 秒再进 detail） */
    var reveal = s.phase === "detail" || s.phase === "flash" || s.phase === "hold";
    var options = (s.options || []).map(function (op, i) {
      var mark = "idle";
      if (reveal) {
        if (i === s.answer) mark = "right";
        else if (s.picked !== null && i === s.picked) mark = "wrong";
        else mark = "muted";
      }
      var o = { pos: op.pos, cn: op.cn, mark: mark };
      /* v1.12：揭示后把「别的选项分别是哪个词」也带出去（答案那个词已经在词头，
         不重复）。ask 阶段不给，免得提前泄题；字段也不出现在 ask 的 VM 里。 */
      if (reveal && i !== s.answer) o.w = op.w || "";
      return o;
    });

    return {
      phase: s.phase,
      g: g,
      pos: pos,
      size: gstat.size,
      head: head,
      word: word,
      options: options,
      answer: reveal ? s.answer : null,
      picked: reveal ? s.picked : null,
      skipped: reveal && !!s.skipped,
      // 契约 §6.1：done 给「下一组」；空书（book.total===0）不给 CTA
      cta:
        s.phase === "done"
          ? (book.total > 0 ? { label: "下一组" } : null)
          : s.phase === "detail"
          ? { label: "继续" }
          : null,        // flash / hold 不给按钮：1 秒后 core 自己接管（下一词 / 详情）
      hints: { answer: HINTS.answer, pick: HINTS.pick, undo: HINTS.undo }
    };
  }

  /* 词汇列表（收藏 / 待复习 / 已掌握 / 全部）。
     排序固定为书中顺序，不做「最近」排序——列表是用来扫的，不是用来排的。 */
  var LIST_TITLE = { fav: "收藏", review: "待复习", learning: "学习中", mastered: "已掌握", all: "全部" };
  var STA_LABEL = {
    untouched: "未学", new: "未学", learning: "学习中", pending: "待复习", mastered: "已掌握"
  };
  var LIST_CAP = 400; // 全部 1279 条一次画完会卡，先画 400

  function listVM(state, book, wmap) {
    var key = state.ui.listFilter;
    if (!key) return null;
    var all = [];
    for (var i = 0; i < book.words.length; i++) {
      var bw = book.words[i];
      var ws = wmap[bw.w];
      var st = core.derive.classify(ws);
      var hit =
        key === "all" ? true
        : key === "fav" ? !!state.fav[bw.w]
        : key === "review" ? st === "pending"
        : key === "learning" ? st === "learning"
        : st === "mastered";
      if (!hit) continue;
      all.push({ w: bw.w, pos: bw.pos, cn: bw.cn, g: bw.g, sta: STA_LABEL[st] });
    }
    /* 列表按字母排：词本是乱序的（学习顺序随机），但列表是用来扫的，字母序才好找 */
    all.sort(function (a, b) { return a.w < b.w ? -1 : a.w > b.w ? 1 : 0; });
    return {
      key: key,
      title: LIST_TITLE[key],
      total: all.length,
      words: all.slice(0, LIST_CAP),
      truncated: all.length > LIST_CAP
    };
  }

  /* 书单：给「换书目」用。只有一本时也要给出来，UI 才能显示当前书是哪本 */
  function bookList(state, current) {
    var out = [];
    var map = state.allBooks || {};
    for (var id in map) {
      var b = map[id];
      if (!b || !b.words) continue;
      out.push({
        id: b.id,
        name: b.name,
        total: b.words.length,
        groups: b.groups,
        active: b.id === current.id
      });
    }
    return out;
  }

  /* 分析页（P7，§6.2）：只在 route === "stats" 时计算，别让每次答题重渲染都扫全量日志 */
  function statsVM(state, book, idx, today) {
    if (!core.analysis) return null;
    return core.analysis.analyze(state.log, { bookId: book.id, today: today, words: idx });
  }

  function toViewModel(state, opts) {
    opts = opts || {};
    var book = state.book;
    var wmap = (state.books[book.id] && state.books[book.id].w) || {};
    var sum = core.derive.summarize(book, wmap);
    var idx = state.bookIdx || wordIndex(book);
    var entries = core.log.entries(state.log);
    var today = state.clock ? state.clock.today() : "";

    /* 只数本书里的收藏：导入别书的星标时不会让计数和列表对不上 */
    var favCount = 0;
    for (var fi = 0; fi < book.words.length; fi++) {
      if (state.fav[book.words[fi].w]) favCount++;
    }

    var activeG = state.sched.g;
    var gstat = sum.byGroup[activeG] || { g: activeG, mastered: 0, size: 0 };

    var groups = sum.groups.map(function (gs) {
      return {
        g: gs.g,
        mastered: gs.mastered,
        size: gs.size,
        state: groupState(gs, activeG),
        pct: gs.size > 0 ? Math.floor((gs.mastered / gs.size) * 100) : 0
      };
    });

    return {
      v: 1,
      route: state.ui.route,
      theme: state.p.theme,
      canUndo: !!state.undo && (state.session.phase === "detail" || state.session.phase === "flash" || state.session.phase === "hold"),
      toast: state.ui.toast ? { text: state.ui.toast.text, kind: state.ui.toast.kind } : null,
      book: { id: book.id, name: book.name, total: (book.words || []).length, groups: book.groups },
      books: bookList(state, book),
      counts: {
        today: core.derive.todayCount(entries, today),
        review: sum.total.pending,
        learning: sum.total.learning,
        fav: favCount,
        mastered: sum.total.mastered,
        total: sum.total.size,
        group: { g: activeG, mastered: gstat.mastered, size: gstat.size }
      },
      learn: state.ui.route === "learn" ? learnVM(state, book, sum, idx) : null,
      list: state.ui.route === "list" ? listVM(state, book, wmap) : null,
      stats: state.ui.route === "stats" ? statsVM(state, book, idx, today) : null,
      groups: groups,
      library: {
        rows: [
          { key: "fav", label: "收藏", n: favCount },
          { key: "review", label: "待复习", n: sum.total.pending },
          { key: "learning", label: "学习中", n: sum.total.learning },
          { key: "all", label: "全部", n: sum.total.size }
        ]
      },
      settings: { theme: state.p.theme, autoSpeak: state.p.autoSpeak, side: state.p.side || "grad" }
    };
  }

  core.toViewModel = toViewModel;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/store.js ──────── */
/* store.js —— dispatch / subscribe / undo / getVM / canUndo（contract §7、§3.1、§3.2）。
   自动落盘只写 §2.5 的 ProgressFile；sched / session / ui / undo / fav / seen 是内存态。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  var ROUTES = { learn: 1, library: 1, me: 1, stats: 1 };
  var THEMES = { g1: 1, g2: 1, g3: 1 };
  var LIST_KEYS = { fav: 1, review: 1, learning: 1, mastered: 1, all: 1 };
  var TOAST_MS = 2000;
  var FLASH_MS = 1000; // 判分后停在原地的那 1 秒

  /* 判分之后、进入下一题之前的三个态：
     detail = 停下来看详情（等用户点「继续」）
     flash  = 停 1 秒看选项对照，然后自动下一词
     hold   = 停 1 秒看选项对照，然后转 detail（答错 / 跳过 / 第一次答对）
     flash 和 hold 的渲染是同一套：四个选项标出对错、干扰项带上自己是哪个词。 */
  function isReviewPhase(p) {
    return p === "detail" || p === "flash" || p === "hold";
  }

  function wmapOf(state, book) {
    return state.books[book.id].w;
  }

  function wordIndex(book) {
    var map = {};
    var words = book.words || [];
    for (var i = 0; i < words.length; i++) map[words[i].w] = words[i];
    return map;
  }

  function cloneSched(s) {
    return { g: s.g, queue: s.queue.slice(), pool: s.pool.slice() };
  }

  function cloneSession(s) {
    return {
      phase: s.phase,
      wordId: s.wordId,
      /* v1.12 起选项带 w，快照必须一起拷，否则撤销后重新揭示时干扰项说不出自己是谁 */
      options: s.options.map(function (o) { return { pos: o.pos, cn: o.cn, w: o.w }; }),
      answer: s.answer,
      picked: s.picked,
      skipped: s.skipped,
      t0: s.t0
    };
  }

  /* 当前组完成则顺推到下一未完成组；全书完成则停在最后一组（queue/pool 皆空） */
  function advanceGroups(state) {
    var book = state.book;
    while (core.schedule.done(state.sched) && state.sched.g < book.groups) {
      state.sched = core.schedule.initGroup(book, wmapOf(state, book), state.sched.g + 1);
    }
  }

  /* 开一张新卡；无卡可开则进入 done 态 */
  function startCard(state) {
    var book = state.book;
    advanceGroups(state);
    var wid = core.schedule.current(state.sched);
    if (!wid || !state.bookIdx[wid]) {
      state.session = { phase: "done", wordId: null, options: [], answer: null, picked: null, skipped: false, t0: 0 };
      return;
    }
    var occ = state.seen[wid] || 0;
    state.seen[wid] = occ + 1;
    var built = core.quiz.build(state.bookIdx[wid], book.words, { w: wid, n: occ });
    state.session = {
      phase: "ask",
      wordId: wid,
      options: built.options,
      answer: built.answer,
      picked: null,
      skipped: false,
      t0: state.clock.ms()
    };
  }

  /* 运行时 state 组装：持久化进度 + 内存态 */
  function initState(book, persisted, clock, allBooks) {
    var state = persisted || core.migrate.fresh(book.id);
    state.v = core.migrate.VERSION;
    state.active = book.id;
    if (!state.books || typeof state.books !== "object") state.books = {};
    if (!state.books[book.id] || typeof state.books[book.id] !== "object") state.books[book.id] = { w: {} };
    if (!state.books[book.id].w || typeof state.books[book.id].w !== "object") state.books[book.id].w = {};
    if (!state.p || typeof state.p !== "object") state.p = { theme: "g1", autoSpeak: false, side: "grad" };
    if (state.p.side !== "grad" && state.p.side !== "white") state.p.side = "grad";
    if (!state.log) state.log = [];
    state.book = book;
    state.bookIdx = wordIndex(book);
    state.allBooks = allBooks || {};
    state.clock = clock;
    /* 收藏自 v1.4 起落盘：这里要从存档恢复，不能重置成 {} */
    state.fav = state.fav && typeof state.fav === "object" ? state.fav : {};
    state.seen = {};
    state.ui = { route: "learn", toast: null, toastUntil: 0, listFilter: null };
    state.undo = null;

    var sched = core.schedule.initGroup(book, wmapOf(state, book), 1);
    while (core.schedule.done(sched) && sched.g < book.groups) {
      sched = core.schedule.initGroup(book, wmapOf(state, book), sched.g + 1);
    }
    state.sched = sched;
    startCard(state);
    return state;
  }

  function create(o) {
    var book = o.book;
    var bookMap = o.books || (o.book ? { [o.book.id]: o.book } : {});
    var state = o.state;
    var adapters = o.adapters || {};
    var clock = adapters.clock;
    var storage = adapters.storage;
    var speech = adapters.speech;
    var storageKey = o.storageKey || "wc7";
    var subs = [];
    var lastGateMs = -Infinity;
    var toastTimer = null;
    var dirty = !!o.dirty; // 仅落盘数据（§2.5）变更时才写；内存态动作不重写

    function wmap() {
      return state.books[book.id].w;
    }

    function emit() {
      var snap = core.toViewModel(state, {});
      for (var i = 0; i < subs.length; i++) subs[i](snap);
    }

    function save() {
      if (!storage || !dirty) return;
      dirty = false;
      try {
        storage.write(storageKey, core.migrate.serialize(state));
      } catch (e) {
        /* 存储不可用静默降级，不阻断判分 */
      }
    }

    function toast(text, kind) {
      state.ui.toast = { text: text, kind: kind || "info" };
      state.ui.toastUntil = clock.ms() + TOAST_MS;
      var token = state.ui.toast;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        if (state.ui.toast === token) {
          state.ui.toast = null;
          state.ui.toastUntil = 0;
          emit();
        }
      }, TOAST_MS);
      if (toastTimer && typeof toastTimer.unref === "function") toastTimer.unref();
    }

    function speak(text) {
      if (!speech || !speech.available || !text) return;
      try {
        speech.speak(text, { lang: "en-US" });
      } catch (e) {
        /* 语音异常不外抛（§8） */
      }
    }

    /* 自动朗读的唯一入口：开一张新卡之后读这张卡的词。
       以前只在 continue 里读，导致 flash 自动前进 / 标掌握 / 换组 / 换书都漏读。 */
    function autoSpeakCurrent() {
      if (!state.p || !state.p.autoSpeak) return;
      if (!state.session || state.session.phase !== "ask" || !state.session.wordId) return;
      speak(state.session.wordId);
    }

    function nextCard() {
      startCard(state);
      autoSpeakCurrent();
    }

    /* 150ms 连点闸门（§3.2）：answer / skip / continue 共用。
       距上一次通过的判分动作不足 GATE_MS 则整条丢弃，VM 无任何变化。 */
    function gated() {
      var m = clock.ms();
      if (!core.grader.gateAllowed(lastGateMs, m)) return false;
      lastGateMs = m;
      return true;
    }

    function optionTexts(s) {
      return s.options.map(function (op) { return op.pos + op.cn; });
    }

    function appendEvent(e) {
      state.log = core.log.append(state.log, e);
    }

    /* 判分（answer / skip 共用）：picked 为 null 表示跳过，跳过按错处理但日志 k:"skip" */
    function judge(picked) {
      var s = state.session;
      if (!s || s.phase !== "ask" || !s.wordId) return;
      var word = state.bookIdx[s.wordId];
      if (!word) return;
      var skipped = picked === null;
      var prev = wmap()[s.wordId];
      var now = clock.now();
      var ok = !skipped && picked === s.answer ? 1 : 0;
      var snapSched = cloneSched(state.sched);
      var snapSession = cloneSession(s);
      var next = core.grader.apply(prev, { ok: ok, k: skipped ? "skip" : "pick", t: now });
      if (next !== prev) {
        dirty = true;
        state.undo = { word: s.wordId, prev: prev || null, sched: snapSched, session: snapSession };
        wmap()[s.wordId] = next;
        appendEvent({
          w: s.wordId, b: book.id, g: word.g, ok: ok,
          k: skipped ? "skip" : "pick",
          ms: clock.ms() - s.t0,
          opts: optionTexts(s), picked: skipped ? null : picked, t: now
        });
      } else {
        state.undo = null;
      }
      state.sched = core.schedule.afterJudge(state.sched, s.wordId, core.derive.mastered(wmap()[s.wordId]));
      /* 契约 §6.2：答对且这个词以前答对过（ok>0）→ flash（停 1 秒，直接下一词）；
         其余（答错 / 跳过 / 第一次答对）→ hold（同样停 1 秒看选项对照，再转 detail）。
         两侧共享那 1 秒，否则答错时用户根本来不及看清「其他三个选项是哪个词」。 */
      var seenRight = !!(prev && prev.ok > 0);
      s.phase = ok && seenRight ? "flash" : "hold";
      s.picked = skipped ? null : picked;
      s.skipped = skipped;
      armFlash();
      if (!ok && !skipped) toast("记下了，稍后再考你一次");
    }

    /* 那 1 秒的定时器：flash → 直接下一词；hold → 转 detail（等用户点「继续」）。
       任何用户动作都要先取消，否则「叮」完还会再跳一次 */
    var flashTimer = null;
    function clearFlash() {
      if (flashTimer) {
        clearTimeout(flashTimer);
        flashTimer = null;
      }
    }
    function armFlash() {
      clearFlash();
      flashTimer = setTimeout(function () {
        flashTimer = null;
        var phase = state.session.phase;
        if (phase === "flash") {
          state.undo = null;
          nextCard();
          save();
          emit();
        } else if (phase === "hold") {
          /* 对照看完了再换详情页。undo 留着 —— detail 态还能撤销这一次判分 */
          state.session.phase = "detail";
          emit();
        }
      }, FLASH_MS);
    }

    function doUndo() {
      var u = state.undo;
      if (!u || !isReviewPhase(state.session.phase)) return false;
      dirty = true;
      if (u.prev) wmap()[u.word] = u.prev;
      else delete wmap()[u.word];
      state.sched = cloneSched(u.sched);
      state.session = cloneSession(u.session);
      state.session.phase = "ask";
      clearFlash();
      state.session.picked = null;
      state.session.skipped = false;
      state.session.t0 = clock.ms();
      var word = state.bookIdx[u.word];
      /* 撤销不删日志，追加 k:"undo" 记账（§3.1）；undo 不计入判分统计 */
      appendEvent({
        w: u.word, b: book.id, g: word ? word.g : 0, ok: 0, k: "undo",
        ms: 0, opts: optionTexts(state.session), picked: null, t: clock.now()
      });
      state.undo = null;
      toast("已撤销");
      return true;
    }

    function doMaster() {
      var s = state.session;
      if (!s || !s.wordId || s.phase === "done") return;
      var word = state.bookIdx[s.wordId];
      var now = clock.now();
      var prev = wmap()[s.wordId];
      var next = core.grader.apply(prev, { ok: 1, k: "master", t: now });
      if (next !== prev) {
        dirty = true;
        wmap()[s.wordId] = next;
        appendEvent({
          w: s.wordId, b: book.id, g: word.g, ok: 1, k: "master",
          ms: s.phase === "ask" ? clock.ms() - s.t0 : 0,
          opts: optionTexts(s), picked: null, t: now
        });
      }
      state.sched = core.schedule.afterJudge(state.sched, s.wordId, true);
      state.undo = null;
      toast("已标为已掌握");
      nextCard();
    }

    function doFav() {
      var s = state.session;
      if (!s || !s.wordId) return;
      if (state.fav[s.wordId]) {
        delete state.fav[s.wordId];
        toast("已取消收藏");
      } else {
        state.fav[s.wordId] = true;
        toast("已收藏");
      }
      dirty = true; // v1.4：收藏落盘
    }

    function doNote(a) {
      var s = state.session;
      if (!s || !s.wordId) return;
      var text = typeof a.text === "string" ? a.text : "";
      var prev = wmap()[s.wordId];
      var next = {};
      var k;
      if (prev) {
        for (k in prev) next[k] = prev[k];
      } else {
        next.ok = 0;
        next.bad = 0;
        next.rev = 0;
      }
      next.note = text;
      next.at = clock.now();
      wmap()[s.wordId] = next;
      dirty = true;
      toast("备注已保存");
    }

    function doPickGroup(a) {
      var g = Math.floor(Number(a.g));
      if (!(g >= 1 && g <= book.groups)) return;
      state.sched = core.schedule.initGroup(book, wmap(), g);
      state.ui.route = "learn";
      state.undo = null;
      nextCard();
    }

    var ACTIONS = {
      /* 导入：transfer.merge 逐词比 at 整条取新（§8），结果直接落盘。
         失败一律走 toast，不抛错——文件是用户随手挑的，坏档不该让应用崩。 */
      import: function (a) {
        var report = null;
        var text = String(a.text || "");
        /* 先自己判一次「是不是 JSON」：merge 对坏文本和高版本文件都给 rejected，
           不分开就没法给用户一句准确的话。 */
        try {
          JSON.parse(text);
        } catch (e) {
          toast("导入失败：文件不是合法 JSON", "err");
          return;
        }
        try {
          var r = adapters.transfer.merge(state, text);
          report = r && r.report;
          if (r && r.state) state = r.state;
          dirty = true;
        } catch (e) {
          toast("导入失败：文件读不懂", "err");
          return;
        }
        var added = (report && report.added) || 0;
        var updated = (report && report.updated) || 0;
        var favAdded = (report && report.favAdded) || 0;
        var rejected = (report && report.rejected) || 0;
        if (rejected > 0 && !added && !updated) toast("导入被拒绝：文件版本更高", "err");
        else if (!added && !updated && !favAdded) toast("导入完成：没有新进度");
        else
          toast(
            "导入完成：" + added + " 新增 · " + updated + " 更新" +
            (favAdded ? " · " + favAdded + " 收藏" : "")
          );
      },

      /* 重置（v1.14）：背完一遍后重来一遍。
           mode:"progress"（默认）清记忆，留下备注、收藏和统计
           mode:"all"      连日志和收藏一起清，等于刚装的样子
         文件层面的备份由 app.js 在 dispatch **之前**做——core 不碰文件系统，
         也不该假装知道「备份」这回事。 */
      reset: function (a) {
        var mode = a && a.mode === "all" ? "all" : "progress";
        var n = 0;
        for (var id in state.books) {
          var b = state.books[id];
          if (!b || typeof b !== "object") continue;
          if (!b.w || typeof b.w !== "object") b.w = {};
          for (var w in b.w) {
            var ws = b.w[w];
            /* 只有「背过」的词才计入 reset 计数：只写过备注、没答过的词
               重置前后是同一个状态，算进去会让「已重置 N 词」虚高。 */
            if (ws && ((ws.ok | 0) > 0 || (ws.bad | 0) > 0 || (ws.rev | 0) > 0)) n++;
            /* 备注是手写内容，不是「背了多少」—— 重置进度必须留着它，
               否则用户第一遍辛苦抄的例句、易混点会被顺手抹掉。 */
            var note = mode === "progress" && ws && typeof ws.note === "string" ? ws.note : "";
            if (!note) delete b.w[w];
            else b.w[w] = { ok: 0, bad: 0, rev: 0, at: 0, note: note };
          }
        }
        if (mode === "all") {
          state.log = [];
          state.fav = {};
        } else if (n > 0) {
          /* 留一条分界：将来统计要「只看这一遍」时，靠它切。现在分析页只认
             pick / skip / master，这条不会被算进任何数字（§2.6）。 */
          core.log.append(state.log, {
            w: "", b: book.id, g: 0, ok: 0, k: "reset", ms: 0, opts: [], picked: null,
            t: clock.now()
          });
        }
        state.seen = {};
        state.undo = null;
        state.ui.route = "learn";
        state.ui.listFilter = null;
        clearFlash();
        var sched = core.schedule.initGroup(book, wmap(), 1);
        while (core.schedule.done(sched) && sched.g < book.groups) {
          sched = core.schedule.initGroup(book, wmap(), sched.g + 1);
        }
        state.sched = sched;
        nextCard();
        dirty = true;
        toast(
          mode === "all"
            ? "已彻底清空"
            : n > 0
              ? "已重置：" + n + " 词回到未学"
              : "本来就是清的，没有可重置的进度"
        );
      },

      answer: function (a) {
        if (state.session.phase !== "ask" || !gated()) return;
        var i = Math.floor(Number(a.i));
        if (!(i >= 0 && i < state.session.options.length)) return;
        judge(i);
      },
      skip: function () {
        if (state.session.phase !== "ask" || !gated()) return;
        judge(null);
      },
      continue: function () {
        if (!isReviewPhase(state.session.phase) || !gated()) return;
        clearFlash();
        state.undo = null;
        nextCard();
      },
      undo: function () {
        doUndo();
      },
      fav: function () {
        doFav();
      },
      unfav: function () {
        doFav();
      },
      master: function () {
        doMaster();
      },
      note: function (a) {
        doNote(a);
      },
      goto: function (a) {
        if (!ROUTES[a.route]) return;
        state.ui.route = a.route;
      },
      /* 换词本：进度按书独立存（§2.5），切过去只换 book / sched / 路由 */
      pickBook: function (a) {
        var id = a && a.id;
        if (!id || !bookMap[id] || id === book.id) return;
        book = bookMap[id];
        state.book = book;
        state.active = book.id;
        state.bookIdx = wordIndex(book);
        if (!state.books[book.id] || typeof state.books[book.id] !== "object") {
          state.books[book.id] = { w: {} };
        }
        if (!state.books[book.id].w) state.books[book.id].w = {};
        var sched = core.schedule.initGroup(book, wmap(), 1);
        while (core.schedule.done(sched) && sched.g < book.groups) {
          sched = core.schedule.initGroup(book, wmap(), sched.g + 1);
        }
        state.sched = sched;
        state.ui.route = "learn";
        state.ui.listFilter = null;
        state.undo = null;
        clearFlash();
        nextCard();
        dirty = true;
      },

      pickGroup: function (a) {
        doPickGroup(a);
      },
      pickList: function (a) {
        if (!LIST_KEYS[a.key]) return;
        state.ui.listFilter = a.key;
        state.ui.route = "list";
      },
      /* 侧栏底色：渐变（跟右侧一致）或纯白（v1.7） */
      side: function (a) {
        var v = a && a.side;
        if (v !== "grad" && v !== "white") return;
        state.p.side = v;
        dirty = true;
      },

      theme: function (a) {
        if (!THEMES[a.theme]) return;
        state.p.theme = a.theme;
        dirty = true;
      },
      /* text 可选：给了就读 text（例句 / 以后加的同族词），没给就读当前词 */
      speak: function (a) {
        var text = a && typeof a.text === "string" && a.text ? a.text : state.session.wordId;
        if (text) speak(text);
      },
      autoSpeak: function (a) {
        state.p.autoSpeak = !!a.on;
        dirty = true;
      }
    };

    save(); // 启动即 flush：迁移（v6→v7）后立即落成新格式档
    autoSpeakCurrent(); // 启动就在学习页时，第一张卡也要读

    function dispatch(a) {
      if (!a || typeof a.type !== "string") return;
      var fn = ACTIONS[a.type];
      if (!fn) return; // 未列出的 action 一律忽略，不抛错（§7）
      if (a.type !== "answer" && a.type !== "skip") clearFlash();
      fn(a);
      save();
      emit();
    }

    return {
      getVM: function () {
        return core.toViewModel(state, {});
      },
      dispatch: dispatch,
      subscribe: function (fn) {
        subs.push(fn);
        return function () {
          var i = subs.indexOf(fn);
          if (i >= 0) subs.splice(i, 1);
        };
      },
      undo: function () {
        var ok = doUndo();
        if (ok) {
          save();
          emit();
        }
        return ok;
      },
      canUndo: function () {
        return !!state.undo && isReviewPhase(state.session.phase);
      },
      /* 导出：返回 JSON 文本，由调用方（app.js）负责下载。
         不做成 action，因为它需要一个返回值，而 dispatch 是 void。 */
      exportText: function () {
        try {
          return adapters.transfer.export(state, state.book);
        } catch (e) {
          return null;
        }
      }
    };
  }

  core.store = { create: create, initState: initState };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/core/index.js ──────── */
/* index.js —— WC.core.boot(opts)（contract §10）：组装 + 无 adapter 时的内置兜底。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var core = (WC.core = WC.core || {});

  /* book 为 null（M3 未交付）时用空书跑，不许抛错 */
  var EMPTY_BOOK = { id: "empty", name: "空词本", groups: 0, words: [] };

  function memoryStorage() {
    var data = {};
    return {
      read: function (k) {
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      write: function (k, s) {
        data[k] = String(s);
      },
      remove: function (k) {
        delete data[k];
      }
    };
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  /* 系统时钟兜底：core 内部一律经 clock 取时（§8），不直接取系统毫秒数 */
  function systemClock() {
    return {
      now: function () {
        return Math.floor(new Date().getTime() / 1000);
      },
      today: function () {
        var d = new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
      },
      ms: function () {
        return new Date().getTime();
      }
    };
  }

  function silentSpeech() {
    return { available: false, speak: function () {}, cancel: function () {} };
  }

  /* transfer 兜底：M3 未交付时导出仍可用，合并整包拒绝并计数 */
  function basicTransfer() {
    return {
      export: function (state) {
        return core.migrate.serialize(state);
      },
      merge: function (localState) {
        return { state: localState, report: { added: 0, updated: 0, same: 0, logAdded: 0, rejected: 1 } };
      }
    };
  }

  /* 读档：解析失败、或版本高于当前 → 原始串先写进 key+".bak" 再继续（§9：迁移失败不覆盖原文件）。
     返回 { state, migrated }；migrated 为 true 时启动后应立即落一次新格式档。 */
  function load(storage, key) {
    var raw = null;
    try {
      raw = storage.read(key);
    } catch (e) {
      raw = null;
    }
    if (!raw) return { state: null, migrated: false };
    function backup() {
      try {
        storage.write(key + ".bak", raw);
      } catch (e) {
        /* 备份本身失败不阻断启动 */
      }
    }
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") {
      backup();
      return { state: null, migrated: false };
    }
    if (typeof parsed.v === "number" && parsed.v > core.migrate.VERSION) {
      backup(); // 更高版本整包拒绝（§8 同口径），原样留在 .bak，重开新档
      return { state: null, migrated: false };
    }
    if (parsed.v !== core.migrate.VERSION) {
      backup();
      return { state: core.migrate.anyToCurrent(parsed), migrated: true };
    }
    return { state: core.migrate.anyToCurrent(parsed), migrated: false };
  }

  function bookMap(opts) {
    var map = {};
    var src = opts.books;
    if (src && typeof src === "object") {
      for (var k in src) {
        var b = src[k];
        if (b && Array.isArray(b.words)) map[b.id || k] = b;
      }
    }
    if (opts.book && Array.isArray(opts.book.words)) map[opts.book.id] = opts.book;
    return map;
  }

  function boot(opts) {
    opts = opts || {};
    var books = bookMap(opts);
    var ids = [];
    for (var bid in books) ids.push(bid);
    var book = opts.book && Array.isArray(opts.book.words) ? opts.book : null;
    if (!book) book = ids.length ? books[ids[0]] : EMPTY_BOOK;
    var adapters = opts.adapters || {};
    var storage = adapters.storage || memoryStorage();
    var clock = adapters.clock || systemClock();
    var speech = adapters.speech || silentSpeech();
    var transfer = adapters.transfer || basicTransfer();
    var storageKey = typeof opts.storageKey === "string" ? opts.storageKey : "wc7";

    var loaded = load(storage, storageKey);
    /* 上次用的是哪本书：存档里的 active 优先，其次 opts.book，最后是书单第一本 */
    if (loaded.state && typeof loaded.state.active === "string" && books[loaded.state.active]) {
      book = books[loaded.state.active];
    }
    var allBooks = ids.length ? books : null;
    var state = core.store.initState(book, loaded.state, clock, allBooks);
    return core.store.create({
      book: book,
      books: ids.length ? books : null,
      state: state,
      adapters: { storage: storage, clock: clock, speech: speech, transfer: transfer },
      storageKey: storageKey,
      dirty: loaded.migrated
    });
  }

  core.boot = boot;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/adapters/storage.js ──────── */
/* storage.js —— 同步存储（contract §8、§9）。
   WC.adapters.storage       浏览器里走 localStorage；不可用（node、无痕配额拒绝）自动退回内存实现。
   WC.adapters.memoryStorage()  内存实现工厂：测试与 node 用。
   只搬运字符串：core 自己负责 JSON.parse / 序列化 / 迁移，这里不做任何迁移。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var adapters = (WC.adapters = WC.adapters || {});

  function memoryStorage() {
    var data = {};
    return {
      read: function (key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      write: function (key, s) {
        data[key] = String(s); // 同步：core 判分路径直接调用，不许包 Promise
      },
      remove: function (key) {
        delete data[key];
      }
    };
  }

  /* 探测一次：无痕模式 / 配额为 0 时 setItem 会抛，探测不过就当没有 localStorage */
  function localBackend() {
    var ls = null;
    try {
      ls = root.localStorage || null;
    } catch (e) {
      ls = null; // 有的环境读 localStorage 本身就抛（禁用 Cookie）
    }
    if (!ls) return null;
    var probe = "wc7.__probe__";
    try {
      ls.setItem(probe, "1");
      ls.removeItem(probe);
    } catch (e) {
      return null;
    }
    return ls;
  }

  function localStorageStorage(ls) {
    return {
      read: function (key) {
        try {
          var v = ls.getItem(key);
          return v === null || v === undefined ? null : String(v);
        } catch (e) {
          return null; // 读失败按「没有档」处理，core 会走新档
        }
      },
      write: function (key, s) {
        try {
          ls.setItem(key, String(s)); // 同步
        } catch (e) {
          /* 配额满等写入失败：静默降级，不阻断判分（core 的 save 也已兜底） */
        }
      },
      remove: function (key) {
        try {
          ls.removeItem(key);
        } catch (e) {
          /* 同上，静默降级 */
        }
      }
    };
  }

  var backend = localBackend();
  adapters.memoryStorage = memoryStorage;
  adapters.storage = backend ? localStorageStorage(backend) : memoryStorage();
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/adapters/clock.js ──────── */
/* clock.js —— 全项目唯一时间源（contract §8）。
   ⚠ 唯一允许出现 Date.now() / new Date() 的源文件：core 与其他模块一律经 WC.adapters.clock 取时。
   now()   unix 秒（整数）：写进 WordState.at 与日志 t
   today() "2026-11-23"（本地日）：viewmodel 算「今日已判分数」用
   ms()    单调毫秒：计时与 150ms 闸门；performance.now() 有则用，无则退回 Date */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var adapters = (WC.adapters = WC.adapters || {});

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  var perf = root.performance && typeof root.performance.now === "function" ? root.performance : null;

  adapters.clock = {
    now: function () {
      return Math.floor(Date.now() / 1000); // ← 唯一时间源（见文件头注释）
    },
    today: function () {
      var d = new Date(); // ← 唯一时间源（本地时区日历日）
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    },
    ms: function () {
      /* performance.now() 单调、不受系统时钟回拨影响；node 与老浏览器退回 Date */
      return perf ? perf.now() : Date.now(); // ← 唯一时间源（退回路径）
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/adapters/speech.js ──────── */
/* speech.js —— 朗读（contract §8）。四条铁律：
     1. 并发只保一个：新朗读先 cancel 旧的
     2. 切词先 cancel：speak 入口无条件先 cancel（调用方切词后必走 speak/停口）
     3. available 为假时静默降级：speak/cancel 都是空操作
     4. 任何异常不外抛：所有 speechSynthesis 调用包 try/catch
   WC.adapters.speech        真实实现（无 speechSynthesis 时自动是静默版）
   WC.adapters.silentSpeech() 空实现：测试与显式降级用 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var adapters = (WC.adapters = WC.adapters || {});

  function silentSpeech() {
    return { available: false, speak: function () {}, cancel: function () {} };
  }

  var synth = null;
  try {
    synth = root.speechSynthesis || null;
  } catch (e) {
    synth = null;
  }
  var Utterance = root.SpeechSynthesisUtterance || null;
  var usable = !!(synth && Utterance && typeof synth.speak === "function");

  function webSpeech() {
    /* Chrome 里 cancel() 之后立刻 speak() 有概率把新句子也吞掉（尤其连续切词时）。
       用序号 + 一个 tick 的延迟，既保证「只读最后一句」，又给引擎留出清理窗口。 */
    var seq = 0;
    return {
      available: true,
      speak: function (text, opts) {
        if (!text) return;
        opts = opts || {};
        var mine = ++seq;
        try {
          synth.cancel(); // 铁律 1+2：新朗读（含切词）先把旧的掐掉，并发只保一个
        } catch (e) {
          /* 铁律 4 */
        }
        var fire = function () {
          if (mine !== seq) return; // 期间又来了新句子，这句作废
          try {
            if (synth.paused) synth.resume(); // Chrome 偶发自己 pause，先拉回来
            var u = new Utterance(String(text));
            u.lang = typeof opts.lang === "string" && opts.lang ? opts.lang : "en-US";
            if (typeof opts.rate === "number" && opts.rate > 0) u.rate = opts.rate;
            synth.speak(u);
          } catch (e) {
            /* 铁律 4：异常不外抛 */
          }
        };
        setTimeout(fire, 30);
      },
      cancel: function () {
        seq++;
        try {
          synth.cancel();
        } catch (e) {
          /* 铁律 4 */
        }
      }
    };
  }

  adapters.silentSpeech = silentSpeech;
  adapters.speech = usable ? webSpeech() : silentSpeech(); // 铁律 3：不可用静默降级
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/adapters/transfer.js ──────── */
/* transfer.js —— 导出 / 合并（contract §8）。
   export(state)          输出含所有书进度 + 日志的 JSON 文本（ProgressFile 口径，剔运行时键）
   merge(local, text)     逐词比 at、整条取新：at 新→updated，at 同→same 留本地，at 旧→rejected 留本地。
                          绝不做字段级缝合（{ok:3} 与 {bad:1} 缝一起会凭空造出「待复习」）。
                          incoming.v 比本地高 → 整包拒绝并计入 report.rejected。
                          日志按 (w,b,t,k) 去重后并集。不改入参 localState，返回新对象。 */
(function (root) {
  "use strict";
  var WC = (root.WC = root.WC || {});
  var adapters = (WC.adapters = WC.adapters || {});

  var VERSION = 7;

  /* 与 core/migrate.js 同口径：这些键是内存态，不进导出文本 */
  var RUNTIME = { sched: 1, session: 1, ui: 1, undo: 1, seen: 1, book: 1, clock: 1, bookIdx: 1, allBooks: 1 };

  function clone(o) {
    var out = {};
    for (var k in o) out[k] = o[k];
    return out;
  }

  function exportState(state) {
    var src = state && typeof state === "object" ? state : {};
    var out = {};
    for (var k in src) {
      if (RUNTIME[k]) continue;
      out[k] = src[k];
    }
    out.v = VERSION;
    return JSON.stringify(out);
  }

  /* 日志两种形态都接受（§2.5）：数组（未归档）或按月归档对象（按月名排序摊平） */
  function logEntries(log) {
    if (!log) return [];
    if (Array.isArray(log)) return log;
    if (typeof log !== "object") return [];
    var months = [];
    for (var m in log) months.push(m);
    months.sort();
    var out = [];
    for (var i = 0; i < months.length; i++) {
      var arr = log[months[i]];
      if (Array.isArray(arr)) {
        for (var j = 0; j < arr.length; j++) out.push(arr[j]);
      }
    }
    return out;
  }

  /* 去重键 (w,b,t,k)；用 JSON 拼避免空串拼接撞键 */
  function logKey(e) {
    return JSON.stringify([e && e.w, e && e.b, e && e.t, e && e.k]);
  }

  function countWords(books) {
    var n = 0;
    if (!books || typeof books !== "object") return 0;
    for (var id in books) {
      var b = books[id];
      if (!b || typeof b !== "object" || !b.w || typeof b.w !== "object") continue;
      for (var w in b.w) n++;
    }
    return n;
  }

  function atOf(ws) {
    return ws && typeof ws.at === "number" ? ws.at : 0;
  }

  function merge(localState, incomingText) {
    var report = { added: 0, updated: 0, same: 0, logAdded: 0, favAdded: 0, rejected: 0 };
    var local = localState && typeof localState === "object" ? localState : {};

    var incoming = null;
    try {
      incoming = JSON.parse(incomingText);
    } catch (e) {
      incoming = null;
    }
    if (!incoming || typeof incoming !== "object") {
      report.rejected = 1; // 文本坏了：整包拒绝，本地原样返回
      return { state: localState, report: report };
    }

    var localV = typeof local.v === "number" ? local.v : VERSION;
    var inV = typeof incoming.v === "number" ? incoming.v : 0;
    if (inV > localV) {
      /* v 比本地高：整包拒绝（§8），一条都不缝进来 */
      report.rejected = Math.max(1, countWords(incoming.books));
      return { state: localState, report: report };
    }
    if (inV < localV && WC.core && WC.core.migrate && typeof WC.core.migrate.anyToCurrent === "function") {
      /* incoming 版本较低：迁移是 core 的活，这里只调它的现成函数，不自己实现 */
      incoming = WC.core.migrate.anyToCurrent(incoming) || incoming;
    }

    /* 组装新 state：只重建 books 与 log，其余键共享引用（不会被改写） */
    var out = clone(local);
    if (typeof out.v !== "number") out.v = localV;

    var outBooks = {};
    var localBooks = local.books && typeof local.books === "object" ? local.books : {};
    var id, w;
    for (id in localBooks) {
      var lb = localBooks[id];
      var wmap = {};
      var lw = lb && lb.w && typeof lb.w === "object" ? lb.w : {};
      for (w in lw) wmap[w] = clone(lw[w]); // WordState 逐条拷贝，输出与输入零共享
      var nb = lb && typeof lb === "object" ? clone(lb) : {};
      nb.w = wmap;
      outBooks[id] = nb;
    }

    var inBooks = incoming.books && typeof incoming.books === "object" ? incoming.books : {};
    for (id in inBooks) {
      var ib = inBooks[id];
      var iw = ib && typeof ib === "object" && ib.w && typeof ib.w === "object" ? ib.w : {};
      if (!outBooks[id]) outBooks[id] = { w: {} };
      var ow = outBooks[id].w;
      for (w in iw) {
        var inc = iw[w];
        if (!inc || typeof inc !== "object") continue;
        var cur = ow[w];
        if (!cur) {
          ow[w] = clone(inc);
          report.added++;
          continue;
        }
        var incAt = atOf(inc);
        var curAt = atOf(cur);
        if (incAt > curAt) {
          ow[w] = clone(inc); // 整条取新，不字段级缝合
          report.updated++;
        } else if (incAt === curAt) {
          report.same++; // at 相同留本地
        } else {
          report.rejected++; // at 较旧：整条拒，本地不动
        }
      }
    }
    out.books = outBooks;

    /* 日志并集：本地在前先入先留，incoming 里 (w,b,t,k) 已见的不重复收 */
    var seen = {};
    var merged = [];
    var localLog = logEntries(local.log);
    var i, e, key;
    for (i = 0; i < localLog.length; i++) {
      e = localLog[i];
      key = logKey(e);
      if (seen[key]) continue;
      seen[key] = 1;
      merged.push(e);
    }
    var base = merged.length;
    var inLog = logEntries(incoming.log);
    for (i = 0; i < inLog.length; i++) {
      e = inLog[i];
      key = logKey(e);
      if (seen[key]) continue;
      seen[key] = 1;
      merged.push(e);
    }
    report.logAdded = merged.length - base;
    out.log = merged;

    /* 收藏取并集（契约 §8 v1.5）。单用户、两台设备各自标星，取并集最省心。
       代价：取消收藏不会传播——A 取消后，从 B 的旧导出导回来会重新加上。 */
    var outFav = clone(local.fav && typeof local.fav === "object" ? local.fav : {});
    var inFav = incoming.fav && typeof incoming.fav === "object" ? incoming.fav : {};
    for (w in inFav) {
      if (!Object.prototype.hasOwnProperty.call(inFav, w)) continue;
      if (!outFav[w]) {
        outFav[w] = 1;
        report.favAdded = (report.favAdded || 0) + 1;
      }
    }
    out.fav = outFav;

    return { state: out, report: report };
  }

  adapters.transfer = { export: exportState, merge: merge };
})(typeof globalThis !== "undefined" ? globalThis : this);

/* ──────── src/data/books/cet4.js ──────── */
/* 生成物：src/data/from_legacy.py。别手改。 */
window.WC = window.WC || {}; WC.books = WC.books || {};
WC.books.cet4 = {"id":"cet4","name":"四级基础词汇","groups":16,"words":[{"w":"election","ph":"/ɪˈlekʃn/","pos":"n.","cn":"选举；当选","en":"The presidential election will be held next month.","tr":"总统选举将在下个月举行。","g":1},{"w":"pessimistic","ph":"/ˌpesɪˈmɪstɪk/","pos":"a.","cn":"悲观的","en":"He is pessimistic about the future.","tr":"他对未来持悲观态度。","g":1},{"w":"collection","ph":"/kəˈlekʃn/","pos":"n.","cn":"收藏品；收集","en":"She showed me her art collection.","tr":"她向我展示了她的艺术收藏。","g":1},{"w":"accelerate","ph":"/əkˈseləreɪt/","pos":"v.","cn":"加速；促进","en":"The car accelerated smoothly.","tr":"汽车平滑加速。","g":1},{"w":"citizen","ph":"/ˈsɪtɪzn/","pos":"n.","cn":"公民；市民","en":"He is a British citizen.","tr":"他是一位英国公民。","g":1},{"w":"minimum","ph":"/ˈmɪnɪməm/","pos":"a.","cn":"最小的；最低的；最小值","en":"The minimum wage will increase.","tr":"最低工资将会增加。","g":1},{"w":"absence","ph":"/ˈæbsəns/","pos":"n.","cn":"缺席；不在","en":"His absence from the meeting was noted.","tr":"他未出席会议被注意到。","g":1},{"w":"harm","ph":"/hɑːrm/","pos":"n.","cn":"伤害；损害；危害","en":"Too much sun can harm your skin.","tr":"过多的阳光会伤害你的皮肤。","g":1},{"w":"feedback","ph":"/ˈfiːdbæk/","pos":"n.","cn":"反馈；反应","en":"We welcome feedback from our customers.","tr":"我们欢迎客户的反馈。","g":1},{"w":"lump","ph":"/lʌmp/","pos":"n.","cn":"块；肿块","en":"There was a lump on his head.","tr":"他的头上有个肿块。","g":1},{"w":"confront","ph":"/kənˈfrʌnt/","pos":"v.","cn":"面对；对抗；遭遇","en":"We must confront our fears.","tr":"我们必须面对我们的恐惧。","g":1},{"w":"parcel","ph":"/ˈpɑːrsl/","pos":"n.","cn":"包裹；小包","en":"A parcel arrived for you this morning.","tr":"今天早上有一个包裹寄给你。","g":1},{"w":"innocent","ph":"/ˈɪnəsnt/","pos":"a.","cn":"无辜的；天真的；无恶意的","en":"She was found innocent of the crime.","tr":"她被认定无罪。","g":1},{"w":"cycle","ph":"/ˈsaɪkl/","pos":"n.","cn":"循环；自行车；周期","en":"She cycles to work every day.","tr":"她每天都骑自行车上班。","g":1},{"w":"therapy","ph":"/ˈθerəpi/","pos":"n.","cn":"治疗；疗法","en":"She is receiving physical therapy.","tr":"她正在接受物理治疗。","g":1},{"w":"racial","ph":"/ˈreɪʃl/","pos":"a.","cn":"种族的","en":"Racial discrimination is illegal.","tr":"种族歧视是非法的。","g":1},{"w":"reject","ph":"/rɪˈdʒekt/","pos":"v.","cn":"拒绝；排斥；否决","en":"She rejected the job offer.","tr":"她拒绝了工作邀请。","g":1},{"w":"urgent","ph":"/ˈɜːrdʒənt/","pos":"a.","cn":"紧急的；急迫的","en":"There is an urgent need for food and water.","tr":"迫切需要食物和水。","g":1},{"w":"influence","ph":"/ˈɪnfluəns/","pos":"n.","cn":"影响；作用；势力","en":"She had a great influence on my career.","tr":"她对我的职业生涯产生了巨大的影响。","g":1},{"w":"predict","ph":"/prɪˈdɪkt/","pos":"v.","cn":"预测；预言","en":"It&#39;s hard to predict the weather.","tr":"预测天气是很难的。","g":1},{"w":"publication","ph":"/ˌpʌblɪˈkeɪʃn/","pos":"n.","cn":"出版物；出版；发表","en":"The research was published in a scientific publication.","tr":"这项研究发表在一份科学出版物上。","g":1},{"w":"budget","ph":"/ˈbʌdʒɪt/","pos":"n.","cn":"预算；做预算","en":"We need to stay within budget.","tr":"我们需要在预算内。","g":1},{"w":"quest","ph":"/kwest/","pos":"n.","cn":"追求；探索","en":"He went on a quest for gold.","tr":"他去寻找黄金。","g":1},{"w":"apply","ph":"/əˈplaɪ/","pos":"v.","cn":"申请；应用；涂","en":"She applied for a visa.","tr":"她申请了签证。","g":1},{"w":"compose","ph":"/kəmˈpoʊz/","pos":"v.","cn":"组成；创作；作曲","en":"He composed a piece of music.","tr":"他创作了一首乐曲。","g":1},{"w":"notion","ph":"/ˈnoʊʃn/","pos":"n.","cn":"概念；观念；想法","en":"He has no notion of time.","tr":"他对时间没有概念。","g":1},{"w":"desperate","ph":"/ˈdespərət/","pos":"a.","cn":"绝望的；拼命的；极需要的","en":"The survivors were desperate for water.","tr":"幸存者们迫切需要水。","g":1},{"w":"patience","ph":"/ˈpeɪʃns/","pos":"n.","cn":"耐心；忍耐","en":"You need patience to teach children.","tr":"教孩子需要耐心。","g":1},{"w":"severe","ph":"/sɪˈvɪr/","pos":"a.","cn":"严重的；严厉的；朴素的","en":"The storm caused severe damage.","tr":"暴风雨造成了严重损害。","g":1},{"w":"outlet","ph":"/ˈaʊtlet/","pos":"n.","cn":"出口；出路；商店","en":"This chain has retail outlets across the country.","tr":"这家连锁店在全国各地都有零售店。","g":1},{"w":"greedy","ph":"/ˈɡriːdi/","pos":"a.","cn":"贪婪的；贪吃的","en":"He is greedy for power.","tr":"他渴望权力。","g":1},{"w":"architect","ph":"/ˈɑːrkɪtekt/","pos":"n.","cn":"建筑师；设计师","en":"He wants to be an architect.","tr":"他想成为一名建筑师。","g":1},{"w":"objective","ph":"/əbˈdʒektɪv/","pos":"n.","cn":"目标；目的；客观的","en":"We need to set clear objectives.","tr":"我们需要设定清晰的目标。","g":1},{"w":"furthermore","ph":"/ˌfɜːrðərˈmɔːr/","pos":"ad.","cn":"此外；而且","en":"The house is too small, and furthermore, it&#39;s expensive.","tr":"房子太小，而且，它还很贵。","g":1},{"w":"harmony","ph":"/ˈhɑːrməni/","pos":"n.","cn":"和谐；协调","en":"They lived in harmony with nature.","tr":"他们与自然和谐相处。","g":1},{"w":"frequent","ph":"/ˈfriːkwənt/","pos":"a.","cn":"频繁的；经常的","en":"He is a frequent visitor to the museum.","tr":"他是博物馆的常客。","g":1},{"w":"assume","ph":"/əˈsuːm/","pos":"v.","cn":"假设；承担；呈现","en":"We assume he will agree.","tr":"我们假设他会同意。","g":1},{"w":"creature","ph":"/ˈkriːtʃər/","pos":"n.","cn":"生物；动物；人","en":"The forest is full of wild creatures.","tr":"森林里充满了野生动物。","g":1},{"w":"canal","ph":"/kəˈnæl/","pos":"n.","cn":"运河","en":"The Panama Canal connects two oceans.","tr":"巴拿马运河连接了两个大洋。","g":1},{"w":"rough","ph":"/rʌf/","pos":"a.","cn":"粗糙的；粗略的；汹涌的","en":"The skin on his hands was rough.","tr":"他的手上皮肤很粗糙。","g":1},{"w":"pension","ph":"/ˈpenʃn/","pos":"n.","cn":"养老金；抚恤金","en":"He receives a state pension.","tr":"他领取国家养老金。","g":1},{"w":"debt","ph":"/det/","pos":"n.","cn":"债务；恩情","en":"He borrowed money and is now deep in debt.","tr":"他借了钱，现在债务沉重。","g":1},{"w":"protein","ph":"/ˈproʊtiːn/","pos":"n.","cn":"蛋白质","en":"Meat and eggs are rich in protein.","tr":"肉类和鸡蛋富含蛋白质。","g":1},{"w":"declare","ph":"/dɪˈkler/","pos":"v.","cn":"宣布；声明；申报","en":"The president declared a state of emergency.","tr":"总统宣布进入紧急状态。","g":1},{"w":"proportion","ph":"/prəˈpɔːrʃn/","pos":"n.","cn":"比例；部分；均衡","en":"A large proportion of the students are from abroad.","tr":"很大一部分学生来自国外。","g":1},{"w":"alarm","ph":"/əˈlɑːrm/","pos":"n.","cn":"警报；闹钟；惊慌","en":"Set the alarm for 7 a.m.","tr":"将闹钟设定为早上7点。","g":1},{"w":"prejudice","ph":"/ˈpredʒudɪs/","pos":"n.","cn":"偏见；成见","en":"Racial prejudice still exists.","tr":"种族偏见仍然存在。","g":1},{"w":"harvest","ph":"/ˈhɑːrvɪst/","pos":"n.","cn":"收获；收割；收成","en":"The harvest was good this year.","tr":"今年的收成很好。","g":1},{"w":"counsel","ph":"/ˈkaʊnsl/","pos":"n.","cn":"劝告；法律顾问","en":"He sought legal counsel.","tr":"他寻求了法律咨询。","g":1},{"w":"beneath","ph":"/bɪˈniːθ/","pos":"prep.","cn":"在...之下；低于","en":"They rested beneath the tree.","tr":"他们在树下休息。","g":1},{"w":"chapter","ph":"/ˈtʃæptər/","pos":"n.","cn":"章节；分会","en":"Read the first chapter of the book.","tr":"阅读这本书的第一章。","g":1},{"w":"circumstance","ph":"/ˈsɜːrkəmstæns/","pos":"n.","cn":"情况；环境；境遇","en":"Under no circumstances should you lie.","tr":"在任何情况下都不应该撒谎。","g":1},{"w":"undertake","ph":"/ˌʌndərˈteɪk/","pos":"v.","cn":"承担；从事；承诺","en":"He undertook the task of organizing the event.","tr":"他承担了组织活动的任务。","g":1},{"w":"cabin","ph":"/ˈkæbɪn/","pos":"n.","cn":"小屋；客舱","en":"They stayed in a log cabin.","tr":"他们住在一间小木屋里。","g":1},{"w":"caution","ph":"/ˈkɔːʃn/","pos":"n.","cn":"谨慎；警告","en":"Proceed with caution.","tr":"请谨慎进行。","g":1},{"w":"motivate","ph":"/ˈmoʊtɪveɪt/","pos":"v.","cn":"激励；激发；促动","en":"She is highly motivated to succeed.","tr":"她非常有动力去成功。","g":1},{"w":"goal","ph":"/ɡoʊl/","pos":"n.","cn":"目标；目的；球门","en":"His goal is to become a lawyer.","tr":"他的目标是成为一名律师。","g":1},{"w":"identify","ph":"/aɪˈdentɪfaɪ/","pos":"v.","cn":"识别；确认；认同","en":"She identified the suspect.","tr":"她认出了嫌疑人。","g":1},{"w":"employer","ph":"/ɪmˈplɔɪər/","pos":"n.","cn":"雇主；老板","en":"She received a good reference from her previous employer.","tr":"她从上一家雇主那里得到了很好的推荐。","g":1},{"w":"peer","ph":"/pɪr/","pos":"n.","cn":"同龄人；凝视；对等","en":"Peer pressure can be hard to resist.","tr":"同伴压力很难抗拒。","g":1},{"w":"commerce","ph":"/ˈkɑːmɜːrs/","pos":"n.","cn":"商业；贸易","en":"E-commerce is growing fast.","tr":"电子商务增长迅速。","g":1},{"w":"devote","ph":"/dɪˈvoʊt/","pos":"v.","cn":"致力于；奉献；把…专用于","en":"She devoted her life to helping the poor.","tr":"她致力于帮助穷人度过一生。","g":1},{"w":"define","ph":"/dɪˈfaɪn/","pos":"v.","cn":"定义；规定；明确","en":"How do you define success?","tr":"你如何定义成功？","g":1},{"w":"intense","ph":"/ɪnˈtens/","pos":"a.","cn":"强烈的；紧张的；热情的","en":"The heat was intense.","tr":"热度非常强烈。","g":1},{"w":"task","ph":"/tæsk/","pos":"n.","cn":"任务；工作","en":"The task is difficult but possible.","tr":"这项任务虽然困难，但是可能完成。","g":1},{"w":"legal","ph":"/ˈliːɡl/","pos":"a.","cn":"法律的；合法的；法定的","en":"Is it legal to park here?","tr":"这里停车合法吗？","g":1},{"w":"cabinet","ph":"/ˈkæbɪnət/","pos":"n.","cn":"橱柜；内阁","en":"The medicine cabinet is full.","tr":"药柜已经满了。","g":1},{"w":"sentence","ph":"/ˈsentəns/","pos":"n.","cn":"句子；判决；宣判","en":"Complete the sentence.","tr":"完成句子。","g":1},{"w":"labor","ph":"/ˈleɪbər/","pos":"n.","cn":"劳动；工作；分娩","en":"Manual labor is physically demanding.","tr":"体力劳动非常耗费体力。","g":1},{"w":"block","ph":"/blɑːk/","pos":"n.","cn":"街区；块；阻碍","en":"She lives two blocks away.","tr":"她住在两个街区之外。","g":1},{"w":"annual","ph":"/ˈænjuəl/","pos":"a.","cn":"每年的；一年一度的","en":"The annual meeting will be held in June.","tr":"年度会议将在六月举行。","g":1},{"w":"contract","ph":"/ˈkɑːntrækt/","pos":"n.","cn":"合同；契约；收缩","en":"They signed a two-year contract.","tr":"他们签订了一个两年的合同。","g":1},{"w":"disorder","ph":"/dɪsˈɔːrdər/","pos":"n.","cn":"混乱；失调","en":"The room was in complete disorder.","tr":"房间一片混乱。","g":1},{"w":"statement","ph":"/ˈsteɪtmənt/","pos":"n.","cn":"陈述；声明；报表","en":"The company issued a statement.","tr":"公司发表了一份声明。","g":1},{"w":"identity","ph":"/aɪˈdentəti/","pos":"n.","cn":"身份；同一性；特征","en":"His identity is unknown.","tr":"他的身份不明。","g":1},{"w":"brief","ph":"/briːf/","pos":"a.","cn":"简短的；摘要","en":"Please give a brief introduction.","tr":"请简短介绍一下。","g":1},{"w":"rival","ph":"/ˈraɪvl/","pos":"n.","cn":"对手；竞争者；竞争的","en":"The two companies are fierce rivals.","tr":"这两家公司是激烈的竞争对手。","g":1},{"w":"haste","ph":"/heɪst/","pos":"n.","cn":"匆忙；急忙","en":"In his haste, he forgot his keys.","tr":"他急忙中忘了带钥匙。","g":1},{"w":"destination","ph":"/ˌdestɪˈneɪʃn/","pos":"n.","cn":"目的地；终点","en":"The package has reached its destination.","tr":"包裹已经到达目的地。","g":1},{"w":"behave","ph":"/bɪˈheɪv/","pos":"v.","cn":"行为；表现；守规矩","en":"Children should behave well in school.","tr":"孩子们在学校应该表现良好。","g":1},{"w":"arise","ph":"/əˈraɪz/","pos":"v.","cn":"出现；产生；起来","en":"Problems arose during the project.","tr":"项目中出现了问题。","g":2},{"w":"obligation","ph":"/ˌɑːblɪˈɡeɪʃn/","pos":"n.","cn":"义务；责任；恩惠","en":"You have an obligation to tell the truth.","tr":"你有义务说实话。","g":2},{"w":"exceed","ph":"/ɪkˈsiːd/","pos":"v.","cn":"超过；超越；越过","en":"The cost must not exceed $100.","tr":"成本不得超过100美元。","g":2},{"w":"initiative","ph":"/ɪˈnɪʃətɪv/","pos":"n.","cn":"主动性；倡议；首创精神","en":"She took the initiative to introduce herself.","tr":"她主动自我介绍。","g":2},{"w":"massive","ph":"/ˈmæsɪv/","pos":"a.","cn":"巨大的；大规模的；严重的","en":"A massive earthquake hit the region.","tr":"一场大地震袭击了这个地区。","g":2},{"w":"argument","ph":"/ˈɑːrɡjumənt/","pos":"n.","cn":"争论；论据；争吵","en":"She had an argument with her boss.","tr":"她和她的老板发生了争执。","g":2},{"w":"cell","ph":"/sel/","pos":"n.","cn":"细胞；小牢房；手机","en":"He was locked in a prison cell.","tr":"他被锁在了牢房里。","g":2},{"w":"sail","ph":"/seɪl/","pos":"v.","cn":"航行；启航；帆","en":"They sailed across the Atlantic.","tr":"他们横渡了大西洋。","g":2},{"w":"await","ph":"/əˈweɪt/","pos":"v.","cn":"等待；等候","en":"A bright future awaits you.","tr":"你的未来一片光明。","g":2},{"w":"recruit","ph":"/rɪˈkruːt/","pos":"v.","cn":"招募；新成员","en":"The company plans to recruit 50 staff.","tr":"公司计划招聘50名员工。","g":2},{"w":"overseas","ph":"/ˌoʊvərˈsiːz/","pos":"ad.","cn":"在海外；海外的","en":"She plans to work overseas.","tr":"她计划去海外工作。","g":2},{"w":"liberal","ph":"/ˈlɪbərəl/","pos":"a.","cn":"自由的；开明的；文科教育的","en":"She has liberal views on marriage.","tr":"她对婚姻持有开明的看法。","g":2},{"w":"eliminate","ph":"/ɪˈlɪmɪneɪt/","pos":"v.","cn":"消除；淘汰；排除","en":"We need to eliminate all sources of error.","tr":"我们需要消除所有错误的源头。","g":2},{"w":"establish","ph":"/ɪˈstæblɪʃ/","pos":"v.","cn":"建立；设立；确立","en":"The company was established in 1990.","tr":"该公司成立于1990年。","g":2},{"w":"remote","ph":"/rɪˈmoʊt/","pos":"a.","cn":"遥远的；偏远的；远程的","en":"They lived in a remote village.","tr":"他们住在遥远的村庄。","g":2},{"w":"float","ph":"/floʊt/","pos":"v.","cn":"漂浮；漂流；提出","en":"The boat floated down the river.","tr":"小船顺流而下。","g":2},{"w":"owe","ph":"/oʊ/","pos":"v.","cn":"欠；归功于；应感谢","en":"I owe my success to my parents.","tr":"我把我的成功归功于我的父母。","g":2},{"w":"replace","ph":"/rɪˈpleɪs/","pos":"v.","cn":"替换；代替；放回原处","en":"The old machine was replaced with a new one.","tr":"旧机器被新机器替换了。","g":2},{"w":"female","ph":"/ˈfiːmeɪl/","pos":"a.","cn":"女性的；雌性的；女子","en":"The female bird builds the nest.","tr":"雌鸟筑巢。","g":2},{"w":"estimate","ph":"/ˈestɪmeɪt/","pos":"v.","cn":"估计；估价；评价","en":"The police estimate that 10,000 people attended.","tr":"警方估计有10,000人出席。","g":2},{"w":"division","ph":"/dɪˈvɪʒn/","pos":"n.","cn":"部门；分割；除法","en":"He works in the sales division.","tr":"他在销售部门工作。","g":2},{"w":"voyage","ph":"/ˈvɔɪɪdʒ/","pos":"n.","cn":"航行；旅行；航程","en":"The voyage across the Atlantic took five days.","tr":"横渡大西洋的航行花了五天时间。","g":2},{"w":"evil","ph":"/ˈiːvl/","pos":"a.","cn":"邪恶的；罪恶的；灾祸","en":"He saw the evil in her eyes.","tr":"他看到了她眼中的邪恶。","g":2},{"w":"worship","ph":"/ˈwɜːrʃɪp/","pos":"v.","cn":"崇拜；敬仰；做礼拜","en":"They worship their ancestors.","tr":"他们崇拜他们的祖先。","g":2},{"w":"adjust","ph":"/əˈdʒʌst/","pos":"v.","cn":"调整；适应","en":"He adjusted his tie.","tr":"他调整了领带。","g":2},{"w":"provoke","ph":"/prəˈvoʊk/","pos":"v.","cn":"激怒；引起；挑衅","en":"His remarks provoked an angry response.","tr":"他的话引起了愤怒的反应。","g":2},{"w":"sustain","ph":"/səˈsteɪn/","pos":"v.","cn":"维持；支撑；遭受","en":"The food supply is enough to sustain us for a week.","tr":"食物供应足够我们维持一周。","g":2},{"w":"loyal","ph":"/ˈlɔɪəl/","pos":"a.","cn":"忠诚的；忠心的","en":"She is a loyal friend.","tr":"她是一位忠诚的朋友。","g":2},{"w":"artificial","ph":"/ˌɑːrtɪˈfɪʃl/","pos":"a.","cn":"人工的；人造的；虚假的","en":"These flowers are artificial.","tr":"这些花是人造的。","g":2},{"w":"kidnap","ph":"/ˈkɪdnæp/","pos":"v.","cn":"绑架；诱拐","en":"The businessman was kidnapped last night.","tr":"这位商人昨晚被绑架了。","g":2},{"w":"launch","ph":"/lɔːntʃ/","pos":"v.","cn":"发射；发起；推出","en":"The company launched a new product.","tr":"公司推出了一款新产品。","g":2},{"w":"authority","ph":"/əˈθɔːrəti/","pos":"n.","cn":"权威；当局；权力","en":"The authorities are investigating the incident.","tr":"当局正在调查这起事件。","g":2},{"w":"steel","ph":"/stiːl/","pos":"n.","cn":"钢；钢铁","en":"The bridge is made of steel.","tr":"这座桥是用钢铁建造的。","g":2},{"w":"reflect","ph":"/rɪˈflekt/","pos":"v.","cn":"反映；反射；反思","en":"The lake reflects the mountains.","tr":"湖面映照着山脉。","g":2},{"w":"drama","ph":"/ˈdrɑːmə/","pos":"n.","cn":"戏剧；剧本；戏剧性事件","en":"She studied drama in college.","tr":"她在大学学习了戏剧。","g":2},{"w":"access","ph":"/ˈækses/","pos":"n.","cn":"进入；通道；访问","en":"Students have access to the library.","tr":"学生可以使用图书馆。","g":2},{"w":"decade","ph":"/ˈdekeɪd/","pos":"n.","cn":"十年","en":"The city has changed greatly in the past decade.","tr":"这座城市在过去十年里发生了巨大的变化。","g":2},{"w":"forecast","ph":"/ˈfɔːrkæst/","pos":"n.","cn":"预报；预测","en":"The weather forecast says it will rain.","tr":"天气预报说会下雨。","g":2},{"w":"earn","ph":"/ɜːrn/","pos":"v.","cn":"赚得；赢得；获得","en":"He earns a good salary.","tr":"他赚的薪水很好。","g":2},{"w":"incredible","ph":"/ɪnˈkredəbl/","pos":"a.","cn":"难以置信的；惊人的","en":"The view from the top was incredible.","tr":"从顶部看到的景色令人难以置信。","g":2},{"w":"stock","ph":"/stɑːk/","pos":"n.","cn":"股票；库存；存货","en":"The company&#39;s stock price fell.","tr":"公司的股价下跌了。","g":2},{"w":"previous","ph":"/ˈpriːviəs/","pos":"a.","cn":"先前的；以前的","en":"The previous owner sold the house.","tr":"前屋主卖掉了房子。","g":2},{"w":"convert","ph":"/kənˈvɜːrt/","pos":"v.","cn":"转变；转换；改变信仰","en":"They converted the garage into a room.","tr":"他们把车库改造成了一个房间。","g":2},{"w":"unique","ph":"/juˈniːk/","pos":"a.","cn":"独特的；独一无二的","en":"Each person&#39;s fingerprint is unique.","tr":"每个人的指纹都是独一无二的。","g":2},{"w":"burden","ph":"/ˈbɜːrdn/","pos":"n.","cn":"负担；重担","en":"He carried a heavy burden.","tr":"他背负着沉重的负担。","g":2},{"w":"rely","ph":"/rɪˈlaɪ/","pos":"v.","cn":"依赖；信赖","en":"You can rely on me.","tr":"你可以依靠我。","g":2},{"w":"emphasize","ph":"/ˈemfəsaɪz/","pos":"v.","cn":"强调；着重","en":"The report emphasized the need for action.","tr":"报告强调了采取行动的必要性。","g":2},{"w":"justify","ph":"/ˈdʒʌstɪfaɪ/","pos":"v.","cn":"证明…正当；为…辩护","en":"How can you justify such behavior?","tr":"你怎么能为这样的行为辩解？","g":2},{"w":"criticism","ph":"/ˈkrɪtɪsɪzəm/","pos":"n.","cn":"批评；批判","en":"He cannot take criticism.","tr":"他无法接受批评。","g":2},{"w":"option","ph":"/ˈɑːpʃn/","pos":"n.","cn":"选择；选项","en":"You have the option of paying online.","tr":"你有在线支付的选项。","g":2},{"w":"vague","ph":"/veɪɡ/","pos":"a.","cn":"模糊的；含糊的；不明确的","en":"His instructions were very vague.","tr":"他的指示非常模糊。","g":2},{"w":"locate","ph":"/ˈloʊkeɪt/","pos":"v.","cn":"找到；位于；使坐落于","en":"The hotel is located in the city center.","tr":"酒店位于市中心。","g":2},{"w":"boost","ph":"/buːst/","pos":"v.","cn":"促进；提高；增加","en":"The new policy will boost growth.","tr":"这项新政策将促进增长。","g":2},{"w":"rigid","ph":"/ˈrɪdʒɪd/","pos":"a.","cn":"严格的；僵硬的；死板的","en":"The school has rigid rules.","tr":"学校的规定很严格。","g":2},{"w":"moral","ph":"/ˈmɔːrəl/","pos":"a.","cn":"道德的；道义上的；寓意","en":"We have a moral duty to help.","tr":"我们有道德责任去帮助。","g":2},{"w":"context","ph":"/ˈkɑːntekst/","pos":"n.","cn":"背景；上下文；语境","en":"You need to understand the context.","tr":"你需要理解上下文。","g":2},{"w":"certificate","ph":"/sərˈtɪfɪkət/","pos":"n.","cn":"证书；证明","en":"She received a certificate of achievement.","tr":"她收到了一份成就证书。","g":2},{"w":"judgment","ph":"/ˈdʒʌdʒmənt/","pos":"n.","cn":"判断；判决；看法","en":"He showed good judgment in the crisis.","tr":"他在危机中表现出了良好的判断力。","g":2},{"w":"participate","ph":"/pɑːrˈtɪsɪpeɪt/","pos":"v.","cn":"参与；参加","en":"He participated in the discussion.","tr":"他参与了讨论。","g":2},{"w":"infection","ph":"/ɪnˈfekʃn/","pos":"n.","cn":"感染；传染","en":"The wound needs to be cleaned to avoid infection.","tr":"伤口需要清洁以避免感染。","g":2},{"w":"strength","ph":"/streŋθ/","pos":"n.","cn":"力量；强度；优点","en":"He has great physical strength.","tr":"他拥有巨大的体力。","g":2},{"w":"survive","ph":"/sərˈvaɪv/","pos":"v.","cn":"幸存；存活；比…活得长","en":"He survived the accident.","tr":"他在这次事故中幸存下来。","g":2},{"w":"burst","ph":"/bɜːrst/","pos":"v.","cn":"爆发；突然出现；爆裂","en":"The balloon burst suddenly.","tr":"气球突然爆裂了。","g":2},{"w":"romantic","ph":"/roʊˈmæntɪk/","pos":"a.","cn":"浪漫的；爱情的；不切实际的","en":"The candlelit dinner was very romantic.","tr":"烛光晚餐非常浪漫。","g":2},{"w":"obtain","ph":"/əbˈteɪn/","pos":"v.","cn":"获得；得到；存在","en":"She obtained a degree in law.","tr":"她获得了法学学位。","g":2},{"w":"charge","ph":"/tʃɑːrdʒ/","pos":"v.","cn":"收费；充电；指控；负责","en":"They charge $10 for delivery.","tr":"他们收取10美元的送货费。","g":2},{"w":"anchor","ph":"/ˈæŋkər/","pos":"n.","cn":"锚；抛锚；主持人","en":"The ship dropped anchor in the bay.","tr":"船在海湾抛下了锚。","g":2},{"w":"excitement","ph":"/ɪkˈsaɪtmənt/","pos":"n.","cn":"兴奋；激动；令人兴奋的事","en":"She couldn&#39;t hide her excitement.","tr":"她无法掩饰她的兴奋。","g":2},{"w":"crash","ph":"/kræʃ/","pos":"v.","cn":"碰撞；坠毁；崩溃","en":"The stock market crashed in 2008.","tr":"股市在2008年崩溃了。","g":2},{"w":"moreover","ph":"/mɔːrˈoʊvər/","pos":"ad.","cn":"而且；此外","en":"The rent is cheap, and moreover, the location is perfect.","tr":"租金便宜，而且位置极佳。","g":2},{"w":"resume","ph":"/rɪˈzuːm/","pos":"v.","cn":"重新开始；继续","en":"We will resume work after lunch.","tr":"我们将在午餐后恢复工作。","g":2},{"w":"accurate","ph":"/ˈækjərət/","pos":"a.","cn":"准确的；精确的","en":"The data is accurate and reliable.","tr":"数据准确可靠。","g":2},{"w":"monitor","ph":"/ˈmɑːnɪtər/","pos":"n.","cn":"显示器；监视器；班长；监控","en":"The nurse monitored the patient&#39;s condition.","tr":"护士监测了病人的状况。","g":2},{"w":"thorough","ph":"/ˈθɜːroʊ/","pos":"a.","cn":"彻底的；详尽的；仔细的","en":"The police carried out a thorough investigation.","tr":"警方进行了彻底的调查。","g":2},{"w":"calculate","ph":"/ˈkælkjuleɪt/","pos":"v.","cn":"计算；估计","en":"Can you calculate the total cost?","tr":"你能计算出总成本吗？","g":2},{"w":"risk","ph":"/rɪsk/","pos":"n.","cn":"风险；冒险","en":"Smoking increases the risk of lung cancer.","tr":"吸烟会增加患肺癌的风险。","g":2},{"w":"abnormal","ph":"/æbˈnɔːrml/","pos":"a.","cn":"不正常的；反常的","en":"The abnormal weather caused crop failures.","tr":"异常的天气导致了庄稼歉收。","g":2},{"w":"distribute","ph":"/dɪˈstrɪbjuːt/","pos":"v.","cn":"分配；分发；散布","en":"The organization distributed food to the poor.","tr":"该组织向穷人分发食物。","g":2},{"w":"advance","ph":"/ədˈvæns/","pos":"n.","cn":"前进；进步；预支","en":"Technology continues to advance.","tr":"技术持续进步。","g":2},{"w":"preside","ph":"/prɪˈzaɪd/","pos":"v.","cn":"主持；负责","en":"The mayor presided over the ceremony.","tr":"市长主持了仪式。","g":2},{"w":"leisure","ph":"/ˈliːʒər/","pos":"n.","cn":"闲暇；休闲","en":"She spends her leisure time reading.","tr":"她把闲暇时间都花在阅读上。","g":3},{"w":"regulate","ph":"/ˈreɡjuleɪt/","pos":"v.","cn":"调节；控制；管理","en":"The temperature is regulated automatically.","tr":"温度是自动调节的。","g":3},{"w":"vocabulary","ph":"/vəˈkæbjəleri/","pos":"n.","cn":"词汇；词汇量","en":"Reading helps to expand your vocabulary.","tr":"阅读有助于扩大你的词汇量。","g":3},{"w":"effective","ph":"/ɪˈfektɪv/","pos":"a.","cn":"有效的；起作用的","en":"The new method is more effective than the old one.","tr":"新方法比旧方法更有效。","g":3},{"w":"particle","ph":"/ˈpɑːrtɪkl/","pos":"n.","cn":"微粒；极小量","en":"There is not a particle of evidence.","tr":"没有一丝证据。","g":3},{"w":"infant","ph":"/ˈɪnfənt/","pos":"n.","cn":"婴儿；幼儿","en":"The infant was sleeping peacefully.","tr":"婴儿睡得很平静。","g":3},{"w":"possess","ph":"/pəˈzes/","pos":"v.","cn":"拥有；具有","en":"He possesses great talent.","tr":"他拥有巨大的天赋。","g":3},{"w":"miracle","ph":"/ˈmɪrəkl/","pos":"n.","cn":"奇迹；令人惊奇的事","en":"It&#39;s a miracle that he survived.","tr":"他能活下来真是个奇迹。","g":3},{"w":"thus","ph":"/ðʌs/","pos":"ad.","cn":"因此；这样；从而","en":"Thus, we can conclude that...","tr":"因此，我们可以得出结论……","g":3},{"w":"ambassador","ph":"/æmˈbæsədər/","pos":"n.","cn":"大使","en":"The ambassador attended the ceremony.","tr":"大使出席了典礼。","g":3},{"w":"legislation","ph":"/ˌledʒɪsˈleɪʃn/","pos":"n.","cn":"立法；法规；法律","en":"New legislation was introduced to protect privacy.","tr":"为保护隐私，引入了新的立法。","g":3},{"w":"mobile","ph":"/ˈmoʊbl/","pos":"a.","cn":"移动的；流动的；机动的","en":"Mobile phones are essential nowadays.","tr":"现在手机是必不可少的。","g":3},{"w":"potential","ph":"/pəˈtenʃl/","pos":"a.","cn":"潜在的；潜力","en":"She has great potential as a singer.","tr":"她作为歌手具有很大的潜力。","g":3},{"w":"propose","ph":"/prəˈpoʊz/","pos":"v.","cn":"提议；建议；求婚","en":"I propose a toast to the happy couple.","tr":"我提议为这对幸福的新人干杯。","g":3},{"w":"reveal","ph":"/rɪˈviːl/","pos":"v.","cn":"揭示；透露；显示","en":"She refused to reveal her source.","tr":"她拒绝透露她的消息来源。","g":3},{"w":"reckon","ph":"/ˈrekən/","pos":"v.","cn":"认为；估计；计算","en":"I reckon we&#39;ll arrive by noon.","tr":"我预计我们中午会到达。","g":3},{"w":"minister","ph":"/ˈmɪnɪstər/","pos":"n.","cn":"部长；大臣；牧师","en":"The foreign minister attended the meeting.","tr":"外交部长出席了会议。","g":3},{"w":"critical","ph":"/ˈkrɪtɪkl/","pos":"a.","cn":"批评的；关键的；危急的","en":"The patient is in critical condition.","tr":"病人情况危急。","g":3},{"w":"vital","ph":"/ˈvaɪtl/","pos":"a.","cn":"至关重要的；有活力的","en":"Exercise is vital for good health.","tr":"锻炼对健康至关重要。","g":3},{"w":"candidate","ph":"/ˈkændɪdət/","pos":"n.","cn":"候选人；应试者","en":"There are three candidates for the job.","tr":"有三个人竞争这份工作。","g":3},{"w":"undergo","ph":"/ˌʌndərˈɡoʊ/","pos":"v.","cn":"经历；经受","en":"She underwent major surgery last year.","tr":"她去年接受了重大手术。","g":3},{"w":"correspond","ph":"/ˌkɔːrəˈspɑːnd/","pos":"v.","cn":"符合；通信；对应","en":"Your actions must correspond with your words.","tr":"你的行动必须与你的话语相符。","g":3},{"w":"index","ph":"/ˈɪndeks/","pos":"n.","cn":"索引；指数；指标","en":"The consumer price index rose by 2%.","tr":"消费者价格指数上涨了2%。","g":3},{"w":"visible","ph":"/ˈvɪzəbl/","pos":"a.","cn":"可见的；明显的","en":"The damage was clearly visible.","tr":"损害是显而易见的。","g":3},{"w":"describe","ph":"/dɪˈskraɪb/","pos":"v.","cn":"描述；形容；画出","en":"Can you describe the man you saw?","tr":"你能描述一下你看到的那个男人吗？","g":3},{"w":"flight","ph":"/flaɪt/","pos":"n.","cn":"飞行；航班；逃跑","en":"The flight was delayed for two hours.","tr":"航班延误了两个小时。","g":3},{"w":"length","ph":"/leŋθ/","pos":"n.","cn":"长度；时间长短；一段","en":"The river is 300 miles in length.","tr":"这条河有300英里长。","g":3},{"w":"alter","ph":"/ˈɔːltər/","pos":"v.","cn":"改变；更改","en":"We had to alter our plans.","tr":"我们不得不改变我们的计划。","g":3},{"w":"accountant","ph":"/əˈkaʊntənt/","pos":"n.","cn":"会计；会计师","en":"She works as an accountant.","tr":"她是一名会计。","g":3},{"w":"settle","ph":"/ˈsetl/","pos":"v.","cn":"解决；定居；安定下来","en":"They decided to settle in Canada.","tr":"他们决定定居在加拿大。","g":3},{"w":"immense","ph":"/ɪˈmens/","pos":"a.","cn":"巨大的；广大的","en":"The immense size of the universe is hard to imagine.","tr":"宇宙的浩瀚难以想象。","g":3},{"w":"province","ph":"/ˈprɑːvɪns/","pos":"n.","cn":"省份；领域","en":"He comes from a province in China.","tr":"他来自中国的一个省份。","g":3},{"w":"stretch","ph":"/stretʃ/","pos":"v.","cn":"伸展；拉长；一段时间","en":"Stretch your legs before running.","tr":"跑步前要伸展腿部。","g":3},{"w":"topic","ph":"/ˈtɑːpɪk/","pos":"n.","cn":"主题；话题","en":"The topic of the speech is climate change.","tr":"演讲的主题是气候变化。","g":3},{"w":"deadline","ph":"/ˈdedlaɪn/","pos":"n.","cn":"截止日期","en":"The deadline for the project is Friday.","tr":"项目的截止日期是周五。","g":3},{"w":"delicate","ph":"/ˈdelɪkət/","pos":"a.","cn":"精致的；脆弱的；微妙的","en":"Be careful with those delicate glasses.","tr":"小心那些易碎的玻璃杯。","g":3},{"w":"mode","ph":"/moʊd/","pos":"n.","cn":"模式；方式；状态","en":"Switch the camera to video mode.","tr":"将相机切换到视频模式。","g":3},{"w":"electric","ph":"/ɪˈlektrɪk/","pos":"a.","cn":"电的；电动的","en":"The atmosphere was electric.","tr":"气氛非常热烈。","g":3},{"w":"range","ph":"/reɪndʒ/","pos":"n.","cn":"范围；幅度；山脉；排列","en":"The price range is from $10 to $50.","tr":"价格范围从10美元到50美元。","g":3},{"w":"complain","ph":"/kəmˈpleɪn/","pos":"v.","cn":"抱怨；投诉","en":"He complained about the noise.","tr":"他对噪音表示抱怨。","g":3},{"w":"otherwise","ph":"/ˈʌðərwaɪz/","pos":"ad.","cn":"否则；另外；在其他方面","en":"Hurry up, otherwise you&#39;ll be late.","tr":"快点，否则你会迟到的。","g":3},{"w":"install","ph":"/ɪnˈstɔːl/","pos":"v.","cn":"安装；安置；使就职","en":"They installed new software on the computer.","tr":"他们在电脑上安装了新软件。","g":3},{"w":"limitation","ph":"/ˌlɪmɪˈteɪʃn/","pos":"n.","cn":"限制；局限性","en":"The system has its limitations.","tr":"这个系统有其局限性。","g":3},{"w":"chairman","ph":"/ˈtʃermən/","pos":"n.","cn":"主席；董事长","en":"The chairman opened the meeting.","tr":"主席打开了会议。","g":3},{"w":"equip","ph":"/ɪˈkwɪp/","pos":"v.","cn":"装备；配备；使有能力","en":"The kitchen is fully equipped.","tr":"厨房设施齐全。","g":3},{"w":"advantage","ph":"/ədˈvæntɪdʒ/","pos":"n.","cn":"优势；有利条件","en":"Good communication gives you an advantage.","tr":"良好的沟通能给你带来优势。","g":3},{"w":"federal","ph":"/ˈfedərəl/","pos":"a.","cn":"联邦的；联邦政府的","en":"Federal law prohibits such actions.","tr":"联邦法律禁止此类行为。","g":3},{"w":"construct","ph":"/kənˈstrʌkt/","pos":"v.","cn":"建造；构建","en":"They constructed a new bridge.","tr":"他们建造了一座新桥。","g":3},{"w":"faculty","ph":"/ˈfæklti/","pos":"n.","cn":"全体教员；能力；系","en":"She is a member of the law faculty.","tr":"她是法学院的成员。","g":3},{"w":"acute","ph":"/əˈkjuːt/","pos":"a.","cn":"严重的；敏锐的","en":"There is an acute shortage of water.","tr":"水的短缺非常严重。","g":3},{"w":"naval","ph":"/ˈneɪvl/","pos":"a.","cn":"海军的","en":"He served in the naval forces.","tr":"他在海军服役。","g":3},{"w":"admire","ph":"/ədˈmaɪər/","pos":"v.","cn":"钦佩；赞赏","en":"I admire her courage.","tr":"我钦佩她的勇气。","g":3},{"w":"sympathy","ph":"/ˈsɪmpəθi/","pos":"n.","cn":"同情；赞同；慰问","en":"I have no sympathy for cheaters.","tr":"我不同情作弊者。","g":3},{"w":"aid","ph":"/eɪd/","pos":"n.","cn":"帮助；援助","en":"The country received foreign aid.","tr":"该国收到了外国援助。","g":3},{"w":"panel","ph":"/ˈpænl/","pos":"n.","cn":"面板；座谈小组；陪审团","en":"A panel of experts discussed the issue.","tr":"一组专家讨论了这个问题。","g":3},{"w":"negotiate","ph":"/nɪˈɡoʊʃieɪt/","pos":"v.","cn":"谈判；协商；商定","en":"The union is negotiating for higher pay.","tr":"工会正在谈判争取更高的工资。","g":3},{"w":"update","ph":"/ˌʌpˈdeɪt/","pos":"v.","cn":"更新；使现代化","en":"I need to update my resume.","tr":"我需要更新我的简历。","g":3},{"w":"awful","ph":"/ˈɔːfl/","pos":"a.","cn":"可怕的；极坏的","en":"The weather is awful today.","tr":"今天的天气很糟糕。","g":3},{"w":"urge","ph":"/ɜːrdʒ/","pos":"v.","cn":"催促；强烈要求；冲动","en":"I urge you to reconsider your decision.","tr":"我敦促你重新考虑你的决定。","g":3},{"w":"universal","ph":"/ˌjuːnɪˈvɜːrsl/","pos":"a.","cn":"普遍的；全体的；通用的","en":"The film has universal appeal.","tr":"这部电影具有普遍的吸引力。","g":3},{"w":"ability","ph":"/əˈbɪləti/","pos":"n.","cn":"能力；才能","en":"She has the ability to solve complex problems.","tr":"她有能力解决复杂的问题。","g":3},{"w":"innovation","ph":"/ˌɪnəˈveɪʃn/","pos":"n.","cn":"创新；改革；新方法","en":"Technological innovation drives economic growth.","tr":"技术创新推动经济增长。","g":3},{"w":"reverse","ph":"/rɪˈvɜːrs/","pos":"v.","cn":"颠倒；相反的；背面","en":"The situation has been reversed.","tr":"情况已经扭转。","g":3},{"w":"violent","ph":"/ˈvaɪələnt/","pos":"a.","cn":"暴力的；猛烈的；激烈的","en":"The violent storm caused damage.","tr":"暴风雨造成了损害。","g":3},{"w":"taste","ph":"/teɪst/","pos":"n.","cn":"味道；味觉；品尝","en":"The soup tastes delicious.","tr":"汤尝起来很美味。","g":3},{"w":"commit","ph":"/kəˈmɪt/","pos":"v.","cn":"犯（罪）；承诺；投入","en":"He committed a crime.","tr":"他犯了罪。","g":3},{"w":"initial","ph":"/ɪˈnɪʃl/","pos":"a.","cn":"最初的；开始的","en":"The initial stage of the project is complete.","tr":"项目初期阶段已完成。","g":3},{"w":"principal","ph":"/ˈprɪnsəpl/","pos":"a.","cn":"主要的；校长；本金","en":"The principal reason for the delay was bad weather.","tr":"延误的主要原因是恶劣天气。","g":3},{"w":"shake","ph":"/ʃeɪk/","pos":"v.","cn":"摇动；颤抖；握手","en":"Shake the bottle before drinking.","tr":"喝之前请摇匀瓶子。","g":3},{"w":"bind","ph":"/baɪnd/","pos":"v.","cn":"捆绑；约束；使结合","en":"The contract binds both parties.","tr":"合同约束双方。","g":3},{"w":"conservation","ph":"/ˌkɑːnsərˈveɪʃn/","pos":"n.","cn":"保护；保存；节约","en":"Water conservation is essential.","tr":"节水至关重要。","g":3},{"w":"commission","ph":"/kəˈmɪʃn/","pos":"n.","cn":"委员会；佣金","en":"The commission will investigate the issue.","tr":"委员会将调查这个问题。","g":3},{"w":"largely","ph":"/ˈlɑːrdʒli/","pos":"ad.","cn":"主要地；很大程度上","en":"The success was largely due to her efforts.","tr":"成功很大程度上归功于她的努力。","g":3},{"w":"active","ph":"/ˈæktɪv/","pos":"a.","cn":"积极的；活跃的","en":"She leads an active lifestyle.","tr":"她过着活跃的生活方式。","g":3},{"w":"opportunity","ph":"/ˌɑːpərˈtuːnəti/","pos":"n.","cn":"机会；时机","en":"This is a great opportunity for us.","tr":"这是一个对我们来说绝佳的机会。","g":3},{"w":"rid","ph":"/rɪd/","pos":"v.","cn":"摆脱；除去","en":"Get rid of that old sofa.","tr":"扔掉那个旧沙发。","g":3},{"w":"aspect","ph":"/ˈæspekt/","pos":"n.","cn":"方面；层面；外观","en":"We considered every aspect of the problem.","tr":"我们考虑了问题的各个方面。","g":3},{"w":"concept","ph":"/ˈkɑːnsept/","pos":"n.","cn":"概念；观念","en":"The concept of time travel is fascinating.","tr":"时间旅行的概念很迷人。","g":3},{"w":"folk","ph":"/foʊk/","pos":"n.","cn":"人们；民族；民间的","en":"The old folk tale was passed down for generations.","tr":"这个古老的故事代代相传。","g":3},{"w":"inform","ph":"/ɪnˈfɔːrm/","pos":"v.","cn":"通知；告知；使了解","en":"Please inform us of any changes.","tr":"请告知我们任何变化。","g":3},{"w":"cancel","ph":"/ˈkænsl/","pos":"v.","cn":"取消；撤销","en":"The flight was canceled due to snow.","tr":"由于下雪，航班被取消了。","g":4},{"w":"consume","ph":"/kənˈsuːm/","pos":"v.","cn":"消费；消耗；吃","en":"We consume a lot of energy every day.","tr":"我们每天消耗大量的能量。","g":4},{"w":"offensive","ph":"/əˈfensɪv/","pos":"a.","cn":"冒犯的；攻击性的","en":"His language was offensive.","tr":"他的语言具有冒犯性。","g":4},{"w":"equipment","ph":"/ɪˈkwɪpmənt/","pos":"n.","cn":"设备；装备；器材","en":"The gym has modern equipment.","tr":"健身房有现代化的设备。","g":4},{"w":"frame","ph":"/freɪm/","pos":"n.","cn":"框架；结构；框住；设计","en":"The photo was placed in a silver frame.","tr":"照片被放置在银色的相框里。","g":4},{"w":"comment","ph":"/ˈkɑːment/","pos":"n.","cn":"评论；意见","en":"No comment.","tr":"无评论。","g":4},{"w":"engineer","ph":"/ˌendʒɪˈnɪr/","pos":"n.","cn":"工程师；技师","en":"He works as a software engineer.","tr":"他是一名软件工程师。","g":4},{"w":"appliance","ph":"/əˈplaɪəns/","pos":"n.","cn":"电器；器具","en":"The kitchen is full of modern appliances.","tr":"厨房里充满了现代电器。","g":4},{"w":"effect","ph":"/ɪˈfekt/","pos":"n.","cn":"影响；效果；实现","en":"The medicine had a positive effect on her health.","tr":"这种药物对她的健康产生了积极的影响。","g":4},{"w":"premier","ph":"/prɪˈmɪr/","pos":"a.","cn":"首要的；总理","en":"He is the premier of the province.","tr":"他是该省的省长。","g":4},{"w":"imagination","ph":"/ɪˌmædʒɪˈneɪʃn/","pos":"n.","cn":"想象；想象力","en":"Children have a vivid imagination.","tr":"孩子们有着丰富的想象力。","g":4},{"w":"criminal","ph":"/ˈkrɪmɪnl/","pos":"a.","cn":"犯罪的；罪犯","en":"He was charged with criminal damage.","tr":"他被控犯有刑事破坏罪。","g":4},{"w":"criticize","ph":"/ˈkrɪtɪsaɪz/","pos":"v.","cn":"批评；指责","en":"Don&#39;t criticize others unfairly.","tr":"不要不公平地批评别人。","g":4},{"w":"privacy","ph":"/ˈpraɪvəsi/","pos":"n.","cn":"隐私；私密","en":"We need to respect her privacy.","tr":"我们需要尊重她的隐私。","g":4},{"w":"nationality","ph":"/ˌnæʃəˈnæləti/","pos":"n.","cn":"国籍；民族","en":"What is your nationality?","tr":"你是什么国籍？","g":4},{"w":"league","ph":"/liːɡ/","pos":"n.","cn":"联盟；社团；联赛","en":"Their team is top of the league.","tr":"他们的队伍在联赛中排名第一。","g":4},{"w":"biology","ph":"/baɪˈɑːlədʒi/","pos":"n.","cn":"生物学","en":"She studied biology at university.","tr":"她在大学学习生物。","g":4},{"w":"raid","ph":"/reɪd/","pos":"n.","cn":"突袭；搜捕；抢劫","en":"Police raided the building.","tr":"警察突袭了这栋建筑。","g":4},{"w":"heap","ph":"/hiːp/","pos":"n.","cn":"堆；大量","en":"There was a heap of dirty clothes on the floor.","tr":"地板上有一堆脏衣服。","g":4},{"w":"trouble","ph":"/ˈtrʌbl/","pos":"n.","cn":"麻烦；困难；烦恼","en":"I&#39;m having trouble with my computer.","tr":"我的电脑出了问题。","g":4},{"w":"sense","ph":"/sens/","pos":"n.","cn":"感觉；意义；理智；意识到","en":"She has a good sense of humor.","tr":"她很有幽默感。","g":4},{"w":"band","ph":"/bænd/","pos":"n.","cn":"乐队；带；波段","en":"He plays guitar in a rock band.","tr":"他在摇滚乐队里弹吉他。","g":4},{"w":"historic","ph":"/hɪˈstɔːrɪk/","pos":"a.","cn":"有历史意义的；历史性的","en":"The historic building was built in 1600.","tr":"这座历史建筑建于1600年。","g":4},{"w":"abandon","ph":"/əˈbændən/","pos":"v.","cn":"放弃；遗弃；沉溺","en":"They had to abandon the project due to lack of funds.","tr":"由于资金不足，他们不得不放弃这个项目。","g":4},{"w":"widespread","ph":"/ˈwaɪdspred/","pos":"a.","cn":"广泛的；普遍的","en":"There was widespread support for the policy.","tr":"这项政策得到了广泛支持。","g":4},{"w":"campaign","ph":"/kæmˈpeɪn/","pos":"n.","cn":"运动；战役","en":"They launched an advertising campaign.","tr":"他们发起了一场广告活动。","g":4},{"w":"defeat","ph":"/dɪˈfiːt/","pos":"v.","cn":"击败；战胜；挫败","en":"The team suffered a heavy defeat.","tr":"队伍遭受了惨重的失败。","g":4},{"w":"reference","ph":"/ˈrefrəns/","pos":"n.","cn":"参考；提及；推荐信","en":"Keep this list for future reference.","tr":"保留这份清单以备将来参考。","g":4},{"w":"prevail","ph":"/prɪˈveɪl/","pos":"v.","cn":"盛行；获胜；占优势","en":"Justice will prevail.","tr":"正义将占上风。","g":4},{"w":"crucial","ph":"/ˈkruːʃl/","pos":"a.","cn":"至关重要的；决定性的","en":"This decision is crucial for the future.","tr":"这个决定对未来发展至关重要。","g":4},{"w":"universe","ph":"/ˈjuːnɪvɜːrs/","pos":"n.","cn":"宇宙；天地万物","en":"Scientists study the origins of the universe.","tr":"科学家研究宇宙的起源。","g":4},{"w":"success","ph":"/səkˈses/","pos":"n.","cn":"成功；成就","en":"Hard work is the key to success.","tr":"努力工作是成功的关键。","g":4},{"w":"captain","ph":"/ˈkæptɪn/","pos":"n.","cn":"队长；船长；上尉","en":"The captain led the team to victory.","tr":"队长带领团队走向胜利。","g":4},{"w":"implement","ph":"/ˈɪmplɪment/","pos":"v.","cn":"实施；执行；使生效","en":"The government implemented a new policy.","tr":"政府实施了一项新政策。","g":4},{"w":"drown","ph":"/draʊn/","pos":"v.","cn":"淹没；淹死","en":"He almost drowned in the river.","tr":"他在河里差点淹死了。","g":4},{"w":"succeed","ph":"/səkˈsiːd/","pos":"v.","cn":"成功；继承；继任","en":"She succeeded in passing the exam.","tr":"她成功通过了考试。","g":4},{"w":"setting","ph":"/ˈsetɪŋ/","pos":"n.","cn":"环境；背景；设定","en":"The hotel is in a beautiful setting.","tr":"酒店位于一个美丽的环境中。","g":4},{"w":"adventure","ph":"/ədˈventʃər/","pos":"n.","cn":"冒险；奇遇","en":"They set off on an adventure.","tr":"他们开始了冒险之旅。","g":4},{"w":"summary","ph":"/ˈsʌməri/","pos":"n.","cn":"摘要；概要","en":"Write a summary of the article.","tr":"写一篇关于文章的总结。","g":4},{"w":"occupation","ph":"/ˌɑːkjuˈpeɪʃn/","pos":"n.","cn":"职业；占领；消遣","en":"What is your occupation?","tr":"你的职业是什么？","g":4},{"w":"faith","ph":"/feɪθ/","pos":"n.","cn":"信仰；信任；信心","en":"She has great faith in her doctor.","tr":"她对她的医生非常有信心。","g":4},{"w":"elect","ph":"/ɪˈlekt/","pos":"v.","cn":"选举；选择","en":"They elected him class president.","tr":"他们选他为班级主席。","g":4},{"w":"contain","ph":"/kənˈteɪn/","pos":"v.","cn":"包含；容纳；控制","en":"This box contains old photos.","tr":"这个盒子装有旧照片。","g":4},{"w":"grind","ph":"/ɡraɪnd/","pos":"v.","cn":"磨碎；碾碎；苦干","en":"Grind the coffee beans finely.","tr":"把咖啡豆磨细。","g":4},{"w":"foreign","ph":"/ˈfɔːrən/","pos":"a.","cn":"外国的；陌生的；涉外的","en":"She can speak two foreign languages.","tr":"她会说两门外语。","g":4},{"w":"evolve","ph":"/ɪˈvɑːlv/","pos":"v.","cn":"进化；发展；逐步形成","en":"Businesses must evolve to survive.","tr":"企业必须进化才能生存。","g":4},{"w":"ancient","ph":"/ˈeɪnʃənt/","pos":"a.","cn":"古代的；古老的","en":"They discovered an ancient temple.","tr":"他们发现了一座古老的神庙。","g":4},{"w":"career","ph":"/kəˈrɪr/","pos":"n.","cn":"职业；生涯","en":"She had a successful career in law.","tr":"她在法律领域拥有成功的事业。","g":4},{"w":"efficient","ph":"/ɪˈfɪʃnt/","pos":"a.","cn":"效率高的；有能力的","en":"She is an efficient worker.","tr":"她是一个效率高的工作者。","g":4},{"w":"lobby","ph":"/ˈlɑːbi/","pos":"n.","cn":"大厅；游说","en":"We met in the hotel lobby.","tr":"我们在酒店大厅见了面。","g":4},{"w":"inspire","ph":"/ɪnˈspaɪər/","pos":"v.","cn":"激励；鼓舞；赋予灵感","en":"Her story inspired many young people.","tr":"她的故事激励了很多年轻人。","g":4},{"w":"income","ph":"/ˈɪnkʌm/","pos":"n.","cn":"收入；收益","en":"He has a high monthly income.","tr":"他有很高的月收入。","g":4},{"w":"industrial","ph":"/ɪnˈdʌstriəl/","pos":"a.","cn":"工业的；产业的","en":"The city is a major industrial center.","tr":"这座城市是主要的工业中心。","g":4},{"w":"similar","ph":"/ˈsɪmələr/","pos":"a.","cn":"相似的；类似的","en":"The two houses are similar in style.","tr":"这两座房子风格相似。","g":4},{"w":"slip","ph":"/slɪp/","pos":"v.","cn":"滑倒；溜走；纸条","en":"He slipped on the ice.","tr":"他在冰上滑倒了。","g":4},{"w":"threat","ph":"/θret/","pos":"n.","cn":"威胁；恐吓；凶兆","en":"Pollution poses a threat to health.","tr":"污染对健康构成了威胁。","g":4},{"w":"dynamic","ph":"/daɪˈnæmɪk/","pos":"a.","cn":"动态的；有活力的；动力学的","en":"The market is very dynamic and changes quickly.","tr":"市场非常活跃，变化迅速。","g":4},{"w":"territory","ph":"/ˈterətɔːri/","pos":"n.","cn":"领土；领域；范围","en":"This island is British territory.","tr":"这个岛是英国的领土。","g":4},{"w":"blank","ph":"/blæŋk/","pos":"a.","cn":"空白的；空白处","en":"Please fill in the blank.","tr":"请填写空白。","g":4},{"w":"removal","ph":"/rɪˈmuːvl/","pos":"n.","cn":"移除；消除；搬家","en":"The removal of the old furniture took hours.","tr":"搬走旧家具花了几小时。","g":4},{"w":"draft","ph":"/dræft/","pos":"n.","cn":"草稿；草案；起草","en":"He wrote the first draft of his essay.","tr":"他写出了他论文的初稿。","g":4},{"w":"unemployment","ph":"/ˌʌnɪmˈplɔɪmənt/","pos":"n.","cn":"失业；失业人数","en":"The unemployment rate has fallen.","tr":"失业率已经下降。","g":4},{"w":"issue","ph":"/ˈɪʃuː/","pos":"n.","cn":"问题；发行；期；发布","en":"Climate change is a global issue.","tr":"气候变化是全球性问题。","g":4},{"w":"rage","ph":"/reɪdʒ/","pos":"n.","cn":"狂怒；盛怒","en":"He flew into a rage.","tr":"他勃然大怒。","g":4},{"w":"traffic","ph":"/ˈtræfɪk/","pos":"n.","cn":"交通；运输量","en":"He was stuck in heavy traffic.","tr":"他被困在了严重的交通堵塞中。","g":4},{"w":"restrict","ph":"/rɪˈstrɪkt/","pos":"v.","cn":"限制；约束","en":"The new law restricts the sale of alcohol.","tr":"新法律限制了酒精的销售。","g":4},{"w":"orbit","ph":"/ˈɔːrbɪt/","pos":"n.","cn":"轨道；绕轨道运行","en":"The satellite is in orbit.","tr":"卫星已经进入轨道。","g":4},{"w":"admission","ph":"/ədˈmɪʃn/","pos":"n.","cn":"准许进入；承认；入场费","en":"Admission is free for children.","tr":"儿童免费入场。","g":4},{"w":"withdraw","ph":"/wɪðˈdrɔː/","pos":"v.","cn":"撤回；退出；取款","en":"She withdrew all her money from the bank.","tr":"她从银行取出了所有的钱。","g":4},{"w":"latter","ph":"/ˈlætər/","pos":"a.","cn":"后者的；后面的","en":"The latter point is more important.","tr":"后者点更为重要。","g":4},{"w":"shape","ph":"/ʃeɪp/","pos":"n.","cn":"形状；体形；塑造","en":"The cloud is in the shape of a horse.","tr":"云的形状像一匹马。","g":4},{"w":"flourish","ph":"/ˈflɜːrɪʃ/","pos":"v.","cn":"繁荣；兴旺；茂盛","en":"The business is flourishing.","tr":"生意兴隆。","g":4},{"w":"blast","ph":"/blæst/","pos":"n.","cn":"爆炸；一阵；炸毁","en":"A blast of cold air hit us.","tr":"一阵冷空气袭来。","g":4},{"w":"supreme","ph":"/suːˈpriːm/","pos":"a.","cn":"最高的；至上的；极度的","en":"The Supreme Court made the final decision.","tr":"最高法院作出了最终决定。","g":4},{"w":"impose","ph":"/ɪmˈpoʊz/","pos":"v.","cn":"强加；征税；利用","en":"The judge imposed a heavy fine.","tr":"法官判了重罚。","g":4},{"w":"bargain","ph":"/ˈbɑːrɡən/","pos":"n.","cn":"便宜货；讨价还价","en":"She found a bargain at the market.","tr":"她在市场上找到了一笔好交易。","g":4},{"w":"original","ph":"/əˈrɪdʒənl/","pos":"a.","cn":"原始的；独创的；最初的","en":"The original plan was changed.","tr":"原计划已经改变。","g":4},{"w":"independence","ph":"/ˌɪndɪˈpendəns/","pos":"n.","cn":"独立；自主","en":"The country gained independence in 1960.","tr":"这个国家于1960年获得独立。","g":4},{"w":"undermine","ph":"/ˌʌndərˈmaɪn/","pos":"v.","cn":"破坏；削弱","en":"The constant criticism undermined his confidence.","tr":"不断的批评削弱了他的信心。","g":4},{"w":"display","ph":"/dɪˈspleɪ/","pos":"n.","cn":"展示；显示；陈列","en":"The museum displays paintings from the 18th century.","tr":"博物馆展示了18世纪的绘画。","g":4},{"w":"style","ph":"/staɪl/","pos":"n.","cn":"风格；方式；款式","en":"She has a unique style of dressing.","tr":"她的穿着风格独特。","g":5},{"w":"balance","ph":"/ˈbæləns/","pos":"n.","cn":"平衡；余额；权衡","en":"You need to keep a balance between work and life.","tr":"你需要在工作和生活之间保持平衡。","g":5},{"w":"prohibit","ph":"/prəˈhɪbɪt/","pos":"v.","cn":"禁止；阻止","en":"Smoking is prohibited in this area.","tr":"这个区域禁止吸烟。","g":5},{"w":"genius","ph":"/ˈdʒiːniəs/","pos":"n.","cn":"天才；天赋","en":"Einstein was a mathematical genius.","tr":"#VALUE!","g":5},{"w":"bless","ph":"/bles/","pos":"v.","cn":"祝福；保佑","en":"God bless you.","tr":"上帝保佑你。","g":5},{"w":"compare","ph":"/kəmˈper/","pos":"v.","cn":"比较；对比","en":"Compare the prices before you buy.","tr":"购买前比较价格。","g":5},{"w":"conventional","ph":"/kənˈvenʃənl/","pos":"a.","cn":"传统的；惯例的；常规的","en":"He lives a conventional life.","tr":"他过着传统的生活。","g":5},{"w":"drift","ph":"/drɪft/","pos":"v.","cn":"漂流；漂移","en":"The boat drifted out to sea.","tr":"小船漂流到了海上。","g":5},{"w":"shelter","ph":"/ˈʃeltər/","pos":"n.","cn":"庇护所；避难所；保护","en":"They sought shelter from the rain.","tr":"他们寻找避雨的地方。","g":5},{"w":"engage","ph":"/ɪnˈɡeɪdʒ/","pos":"v.","cn":"从事；订婚；吸引；雇用","en":"He engaged in a heated debate.","tr":"他参与了一场激烈的辩论。","g":5},{"w":"situation","ph":"/ˌsɪtʃuˈeɪʃn/","pos":"n.","cn":"情况；局势；位置","en":"The situation is under control.","tr":"情况已经得到控制。","g":5},{"w":"approval","ph":"/əˈpruːvl/","pos":"n.","cn":"批准；赞成","en":"The plan needs parental approval.","tr":"这个计划需要家长的批准。","g":5},{"w":"satellite","ph":"/ˈsætəlaɪt/","pos":"n.","cn":"卫星；人造卫星","en":"The satellite orbits the Earth.","tr":"卫星绕地球轨道运行。","g":5},{"w":"rebel","ph":"/ˈrebl/","pos":"n.","cn":"反叛者；造反；反抗","en":"The rebels seized the capital.","tr":"叛军占领了首都。","g":5},{"w":"employ","ph":"/ɪmˈplɔɪ/","pos":"v.","cn":"雇用；使用；利用","en":"The factory employs over 500 workers.","tr":"这家工厂雇佣了超过500名工人。","g":5},{"w":"version","ph":"/ˈvɜːrʒn/","pos":"n.","cn":"版本；说法；样式","en":"I prefer the original version of the song.","tr":"我更喜欢这首歌的原版。","g":5},{"w":"promote","ph":"/prəˈmoʊt/","pos":"v.","cn":"促进；提升；推销","en":"The new policy will promote economic growth.","tr":"新政策将促进经济增长。","g":5},{"w":"assure","ph":"/əˈʃʊr/","pos":"v.","cn":"保证；使确信；担保","en":"I assure you that everything will be fine.","tr":"我向你保证一切都会好起来的。","g":5},{"w":"oppose","ph":"/əˈpoʊz/","pos":"v.","cn":"反对；抵制","en":"Many people opposed the plan.","tr":"许多人反对这个计划。","g":5},{"w":"item","ph":"/ˈaɪtəm/","pos":"n.","cn":"项目；条款；一件商品","en":"What is the most expensive item on the list?","tr":"清单上最贵的项目是什么？","g":5},{"w":"mate","ph":"/meɪt/","pos":"n.","cn":"伙伴；同事；配偶","en":"He is my work mate.","tr":"他是我的工作伙伴。","g":5},{"w":"resemble","ph":"/rɪˈzembl/","pos":"v.","cn":"与…相似；像","en":"She resembles her mother.","tr":"她长得像她母亲。","g":5},{"w":"grave","ph":"/ɡreɪv/","pos":"n.","cn":"坟墓；严重的；庄重的","en":"The situation is very grave.","tr":"形势非常严峻。","g":5},{"w":"expert","ph":"/ˈekspɜːrt/","pos":"n.","cn":"专家；熟练的；内行的","en":"He is an expert in ancient history.","tr":"他是古历史方面的专家。","g":5},{"w":"accomplish","ph":"/əˈkɑːmplɪʃ/","pos":"v.","cn":"完成；实现","en":"They accomplished the mission successfully.","tr":"他们成功完成了任务。","g":5},{"w":"pose","ph":"/poʊz/","pos":"v.","cn":"造成；提出；姿势","en":"He posed a question to the audience.","tr":"他向观众提出了一个问题。","g":5},{"w":"convince","ph":"/kənˈvɪns/","pos":"v.","cn":"使信服；说服","en":"She convinced me to go with her.","tr":"她劝服我和她一起去。","g":5},{"w":"inflation","ph":"/ɪnˈfleɪʃn/","pos":"n.","cn":"通货膨胀；膨胀","en":"The inflation rate has dropped.","tr":"通货膨胀率已经下降。","g":5},{"w":"tradition","ph":"/trəˈdɪʃn/","pos":"n.","cn":"传统；惯例","en":"It&#39;s a family tradition.","tr":"这是一个家族传统。","g":5},{"w":"glory","ph":"/ˈɡlɔːri/","pos":"n.","cn":"光荣；荣誉；辉煌","en":"The team returned in glory.","tr":"#VALUE!","g":5},{"w":"supply","ph":"/səˈplaɪ/","pos":"v.","cn":"供应；供给；补给品","en":"The store supplies fresh vegetables.","tr":"商店供应新鲜蔬菜。","g":5},{"w":"contribute","ph":"/kənˈtrɪbjuːt/","pos":"v.","cn":"贡献；捐献；投稿","en":"Everyone should contribute to the project.","tr":"每个人都应该为项目做出贡献。","g":5},{"w":"vivid","ph":"/ˈvɪvɪd/","pos":"a.","cn":"生动的；鲜明的","en":"She gave a vivid description of the scene.","tr":"她生动地描述了那场景。","g":5},{"w":"compete","ph":"/kəmˈpiːt/","pos":"v.","cn":"竞争；比赛","en":"Athletes compete for the gold medal.","tr":"运动员们争夺金牌。","g":5},{"w":"monthly","ph":"/ˈmʌnθli/","pos":"a.","cn":"每月的；按月；月刊","en":"She pays a monthly subscription.","tr":"她支付月度订阅费。","g":5},{"w":"capture","ph":"/ˈkæptʃər/","pos":"v.","cn":"捕获；俘获；引起注意","en":"The police captured the thief.","tr":"警察抓住了小偷。","g":5},{"w":"interact","ph":"/ˌɪntərˈækt/","pos":"v.","cn":"互动；相互作用；交流","en":"Teachers should interact more with students.","tr":"教师应该更多地与学生互动。","g":5},{"w":"outstanding","ph":"/aʊtˈstændɪŋ/","pos":"a.","cn":"杰出的；未解决的；显著的","en":"He is an outstanding scientist.","tr":"他是一位杰出的科学家。","g":5},{"w":"instinct","ph":"/ˈɪnstɪŋkt/","pos":"n.","cn":"本能；直觉","en":"Birds build nests by instinct.","tr":"鸟儿凭本能筑巢。","g":5},{"w":"attribute","ph":"/əˈtrɪbjuːt/","pos":"v.","cn":"把…归因于；属性","en":"He attributes his success to hard work.","tr":"他将自己的成功归功于努力工作。","g":5},{"w":"mild","ph":"/maɪld/","pos":"a.","cn":"温和的；轻微的；不辣的","en":"We had a mild winter this year.","tr":"今年我们经历了一个温和的冬天。","g":5},{"w":"motion","ph":"/ˈmoʊʃn/","pos":"n.","cn":"运动；动作；动议","en":"The car was in motion.","tr":"汽车在移动中。","g":5},{"w":"command","ph":"/kəˈmænd/","pos":"v.","cn":"命令；掌握；指挥","en":"He has a good command of English.","tr":"他的英语很好。","g":5},{"w":"element","ph":"/ˈelɪmənt/","pos":"n.","cn":"元素；要素；成分","en":"Trust is an essential element of any relationship.","tr":"信任是任何关系中必不可少的元素。","g":5},{"w":"truth","ph":"/truːθ/","pos":"n.","cn":"真相；真理；事实","en":"Tell me the truth.","tr":"告诉我真相。","g":5},{"w":"border","ph":"/ˈbɔːrdər/","pos":"n.","cn":"边境；边界；接壤","en":"They crossed the border into Canada.","tr":"他们越过边界进入了加拿大。","g":5},{"w":"attack","ph":"/əˈtæk/","pos":"n.","cn":"攻击；进攻；抨击","en":"The soldiers attacked at dawn.","tr":"士兵们在黎明时发动了攻击。","g":5},{"w":"frown","ph":"/fraʊn/","pos":"v.","cn":"皱眉；不同意","en":"She frowned at the noisy children.","tr":"她对吵闹的孩子们皱起了眉头。","g":5},{"w":"blend","ph":"/blend/","pos":"v.","cn":"混合；调和","en":"Blend the eggs and sugar.","tr":"搅拌鸡蛋和糖。","g":5},{"w":"opponent","ph":"/əˈpoʊnənt/","pos":"n.","cn":"对手；反对者","en":"He defeated his opponent in the election.","tr":"他在选举中击败了对手。","g":5},{"w":"anniversary","ph":"/ˌænɪˈvɜːrsəri/","pos":"n.","cn":"周年纪念日","en":"They celebrated their 10th wedding anniversary.","tr":"他们庆祝了他们的第10个结婚纪念日。","g":5},{"w":"flash","ph":"/flæʃ/","pos":"n.","cn":"闪光；闪现；突然想到","en":"Lightning flashed across the sky.","tr":"闪电划过天空。","g":5},{"w":"logo","ph":"/ˈloʊɡoʊ/","pos":"n.","cn":"标志；商标","en":"The company has a new logo.","tr":"公司有了一个新标志。","g":5},{"w":"logic","ph":"/ˈlɑːdʒɪk/","pos":"n.","cn":"逻辑；逻辑学；推理","en":"There is no logic in his argument.","tr":"他的论点中没有逻辑。","g":5},{"w":"famine","ph":"/ˈfæmɪn/","pos":"n.","cn":"饥荒","en":"The drought caused a severe famine.","tr":"干旱导致了严重的饥荒。","g":5},{"w":"surround","ph":"/səˈraʊnd/","pos":"v.","cn":"包围；围绕；环绕","en":"The house is surrounded by trees.","tr":"房子被树木环绕。","g":5},{"w":"govern","ph":"/ˈɡʌvərn/","pos":"v.","cn":"统治；管理；支配","en":"The country is governed by a president.","tr":"这个国家是由一位总统治理的。","g":5},{"w":"maintain","ph":"/meɪnˈteɪn/","pos":"v.","cn":"维持；保持；维修","en":"It&#39;s hard to maintain a long-distance relationship.","tr":"维持远距离关系很难。","g":5},{"w":"despite","ph":"/dɪˈspaɪt/","pos":"prep.","cn":"尽管；不管","en":"Despite the rain, they continued to play.","tr":"尽管下雨，他们还是继续玩。","g":5},{"w":"community","ph":"/kəˈmjuːnəti/","pos":"n.","cn":"社区；团体；社会","en":"The local community supports the school.","tr":"当地社区支持这所学校。","g":5},{"w":"blame","ph":"/bleɪm/","pos":"v.","cn":"责备；归咎于","en":"Don&#39;t blame me for your mistakes.","tr":"不要因为你的错误责怪我。","g":5},{"w":"involve","ph":"/ɪnˈvɑːlv/","pos":"v.","cn":"涉及；包含；使参与","en":"The project involves a lot of travel.","tr":"该项目涉及到很多旅行。","g":5},{"w":"trail","ph":"/treɪl/","pos":"n.","cn":"小径；痕迹；跟踪","en":"We walked along a forest trail.","tr":"我们沿着一条森林小径散步。","g":5},{"w":"pattern","ph":"/ˈpætərn/","pos":"n.","cn":"模式；图案；样式","en":"The behavior follows a pattern.","tr":"这种行为遵循一种模式。","g":5},{"w":"rhythm","ph":"/ˈrɪðəm/","pos":"n.","cn":"节奏；韵律","en":"The music has a good rhythm.","tr":"这首音乐节奏很好。","g":5},{"w":"ally","ph":"/ˈælaɪ/","pos":"n.","cn":"同盟国；盟友；结盟","en":"Canada is a close ally of the U.S.","tr":"加拿大是美国的紧密盟友。","g":5},{"w":"occur","ph":"/əˈkɜːr/","pos":"v.","cn":"发生；出现；想到","en":"When did the accident occur?","tr":"事故发生的时间是什么时候？","g":5},{"w":"conclude","ph":"/kənˈkluːd/","pos":"v.","cn":"得出结论；结束；断定","en":"What can we conclude from the evidence?","tr":"我们能从证据中得出什么结论？","g":5},{"w":"tend","ph":"/tend/","pos":"v.","cn":"倾向于；趋向；照料","en":"People tend to eat more in winter.","tr":"人们倾向于在冬天吃得更多。","g":5},{"w":"extent","ph":"/ɪkˈstent/","pos":"n.","cn":"程度；范围；长度","en":"To what extent do you agree?","tr":"你同意到什么程度？","g":5},{"w":"vessel","ph":"/ˈvesl/","pos":"n.","cn":"船；容器；血管","en":"The fishing vessel returned to port.","tr":"渔船返回了港口。","g":5},{"w":"novel","ph":"/ˈnɑːvl/","pos":"n.","cn":"小说；新颖的","en":"She published her first novel at 25.","tr":"她在25岁时出版了她的第一部小说。","g":5},{"w":"concrete","ph":"/ˈkɑːŋkriːt/","pos":"a.","cn":"具体的；混凝土","en":"We need concrete evidence.","tr":"我们需要具体的证据。","g":5},{"w":"myth","ph":"/mɪθ/","pos":"n.","cn":"神话；谬见；虚构的东西","en":"It&#39;s a myth that bats are blind.","tr":"蝙蝠是瞎的是一种神话。","g":5},{"w":"fulfil","ph":"/fʊlˈfɪl/","pos":"v.","cn":"完成；履行；满足","en":"He fulfilled his dream of becoming a pilot.","tr":"他实现了成为飞行员的梦想。","g":5},{"w":"occasion","ph":"/əˈkeɪʒn/","pos":"n.","cn":"场合；机会；时机；起因","en":"He only wears a suit on special occasions.","tr":"他只在特殊场合穿西装。","g":5},{"w":"perspective","ph":"/pərˈspektɪv/","pos":"n.","cn":"观点；视角；前景","en":"Try to see the problem from a different perspective.","tr":"尝试从不同的角度看待问题。","g":5},{"w":"secretary","ph":"/ˈsekrəteri/","pos":"n.","cn":"秘书；部长；书记","en":"She works as a secretary.","tr":"她是一名秘书。","g":5},{"w":"restrain","ph":"/rɪˈstreɪn/","pos":"v.","cn":"抑制；控制；约束","en":"She could barely restrain her anger.","tr":"她几乎无法抑制她的愤怒。","g":5},{"w":"structure","ph":"/ˈstrʌktʃər/","pos":"n.","cn":"结构；构造；建筑物","en":"The structure of the essay is clear.","tr":"文章的结构清晰。","g":5},{"w":"determine","ph":"/dɪˈtɜːrmɪn/","pos":"v.","cn":"决定；确定；下决心","en":"We need to determine the cause of the problem.","tr":"我们需要确定问题的原因。","g":6},{"w":"provision","ph":"/prəˈvɪʒn/","pos":"n.","cn":"供应；规定；条款","en":"The provision of clean water is essential.","tr":"提供清洁水是至关重要的。","g":6},{"w":"share","ph":"/ʃer/","pos":"v.","cn":"分享；分担；份额；股票","en":"Share the cake equally.","tr":"平均分配蛋糕。","g":6},{"w":"bleed","ph":"/bliːd/","pos":"v.","cn":"流血；出血","en":"His nose started to bleed.","tr":"他的鼻子开始流血。","g":6},{"w":"nightmare","ph":"/ˈnaɪtmer/","pos":"n.","cn":"噩梦；可怕的事情","en":"The trip turned into a nightmare.","tr":"旅行变成了一场噩梦。","g":6},{"w":"anticipate","ph":"/ænˈtɪsɪpeɪt/","pos":"v.","cn":"预期；期望","en":"We anticipate a rise in demand.","tr":"我们预计需求会有所增加。","g":6},{"w":"mystery","ph":"/ˈmɪstri/","pos":"n.","cn":"神秘；谜；推理作品","en":"The disappearance remains a mystery.","tr":"消失之谜依然存在。","g":6},{"w":"journal","ph":"/ˈdʒɜːrnl/","pos":"n.","cn":"杂志；期刊；日记","en":"She published an article in a scientific journal.","tr":"她在科学期刊上发表了一篇文章。","g":6},{"w":"organic","ph":"/ɔːrˈɡænɪk/","pos":"a.","cn":"有机的；器官的；组织的","en":"She only buys organic vegetables.","tr":"她只购买有机蔬菜。","g":6},{"w":"refusal","ph":"/rɪˈfjuːzl/","pos":"n.","cn":"拒绝","en":"His refusal to help surprised everyone.","tr":"他对帮助的拒绝让每个人都感到惊讶。","g":6},{"w":"restore","ph":"/rɪˈstɔːr/","pos":"v.","cn":"恢复；修复；归还","en":"The old building was restored.","tr":"那座旧建筑被修复了。","g":6},{"w":"publicity","ph":"/pʌbˈlɪsəti/","pos":"n.","cn":"宣传；公众的关注","en":"The event received a lot of publicity.","tr":"这个事件受到了很多宣传。","g":6},{"w":"missile","ph":"/ˈmɪsl/","pos":"n.","cn":"导弹；发射物","en":"The missile hit the target.","tr":"导弹击中了目标。","g":6},{"w":"volume","ph":"/ˈvɑːljuːm/","pos":"n.","cn":"体积；容量；音量；卷","en":"Can you turn down the volume?","tr":"你能把音量调低一点吗？","g":6},{"w":"fancy","ph":"/ˈfænsi/","pos":"v.","cn":"想象；喜欢；华丽的","en":"Do you fancy a cup of coffee?","tr":"你想喝杯咖啡吗？","g":6},{"w":"figure","ph":"/ˈfɪɡjər/","pos":"n.","cn":"数字；人物；体型；认为","en":"The sales figures are impressive.","tr":"销售数字令人印象深刻。","g":6},{"w":"ultimate","ph":"/ˈʌltɪmət/","pos":"a.","cn":"最终的；根本的","en":"The ultimate decision rests with the manager.","tr":"最终决定权在经理那里。","g":6},{"w":"riot","ph":"/ˈraɪət/","pos":"n.","cn":"暴乱；骚动","en":"The protest turned into a riot.","tr":"抗议演变成了骚乱。","g":6},{"w":"theory","ph":"/ˈθɪri/","pos":"n.","cn":"理论；学说","en":"In theory, the plan should work.","tr":"理论上，这个计划应该可行。","g":6},{"w":"embarrass","ph":"/ɪmˈbærəs/","pos":"v.","cn":"使尴尬；使困窘","en":"His rude question embarrassed her.","tr":"他粗鲁的问题让她感到尴尬。","g":6},{"w":"frontier","ph":"/frʌnˈtɪr/","pos":"n.","cn":"边境；边疆；前沿","en":"The frontier between the two countries is closed.","tr":"两国之间的边界已经关闭。","g":6},{"w":"minority","ph":"/maɪˈnɔːrəti/","pos":"n.","cn":"少数民族；少数派；未成年时期","en":"Minority rights must be protected.","tr":"必须保护少数群体的权利。","g":6},{"w":"quotation","ph":"/kwoʊˈteɪʃn/","pos":"n.","cn":"引用；报价；语录","en":"Can you give me a quotation for the repair?","tr":"你能给我报个修理的价吗？","g":6},{"w":"illegal","ph":"/ɪˈliːɡl/","pos":"a.","cn":"非法的；违法的","en":"It is illegal to drive without a license.","tr":"无证驾驶是非法的。","g":6},{"w":"resource","ph":"/ˈriːsɔːrs/","pos":"n.","cn":"资源；财力；智谋","en":"Water is a precious resource.","tr":"水是一种宝贵的资源。","g":6},{"w":"vast","ph":"/væst/","pos":"a.","cn":"广阔的；巨大的；大量的","en":"A vast majority of people agreed.","tr":"绝大多数人同意了。","g":6},{"w":"humble","ph":"/ˈhʌmbl/","pos":"a.","cn":"谦逊的；简陋的","en":"She is very humble about her success.","tr":"她对自己的成功非常谦虚。","g":6},{"w":"instance","ph":"/ˈɪnstəns/","pos":"n.","cn":"例子；实例；情况","en":"In this instance, I agree with you.","tr":"在这种情况下，我同意你的看法。","g":6},{"w":"reduction","ph":"/rɪˈdʌkʃn/","pos":"n.","cn":"减少；下降；缩小","en":"There has been a reduction in crime.","tr":"犯罪率有所下降。","g":6},{"w":"instrument","ph":"/ˈɪnstrəmənt/","pos":"n.","cn":"工具；乐器；手段","en":"She plays a musical instrument.","tr":"她会演奏一种乐器。","g":6},{"w":"jungle","ph":"/ˈdʒʌŋɡl/","pos":"n.","cn":"丛林；密林","en":"They trekked through the jungle.","tr":"他们穿越了丛林。","g":6},{"w":"violate","ph":"/ˈvaɪəleɪt/","pos":"v.","cn":"违反；侵犯；亵渎","en":"He violated the terms of the contract.","tr":"他违反了合同条款。","g":6},{"w":"demand","ph":"/dɪˈmænd/","pos":"n.","cn":"要求；需求；需要","en":"The workers demanded higher wages.","tr":"工人们要求更高的工资。","g":6},{"w":"satisfaction","ph":"/ˌsætɪsˈfækʃn/","pos":"n.","cn":"满意；满足；乐事","en":"She expressed her satisfaction with the service.","tr":"她对服务表示满意。","g":6},{"w":"donate","ph":"/ˈdoʊneɪt/","pos":"v.","cn":"捐赠；捐献","en":"She regularly donates blood.","tr":"她定期献血。","g":6},{"w":"collapse","ph":"/kəˈlæps/","pos":"v.","cn":"倒塌；崩溃","en":"The building collapsed in the earthquake.","tr":"建筑物在地震中倒塌。","g":6},{"w":"register","ph":"/ˈredʒɪstər/","pos":"v.","cn":"登记；注册；挂号","en":"You need to register for the course.","tr":"你需要为课程注册。","g":6},{"w":"liberty","ph":"/ˈlɪbərti/","pos":"n.","cn":"自由；许可；冒失","en":"They fought for liberty and justice.","tr":"他们为自由和正义而战。","g":6},{"w":"agriculture","ph":"/ˈæɡrɪkʌltʃər/","pos":"n.","cn":"农业","en":"Agriculture is vital to the economy.","tr":"农业对经济至关重要。","g":6},{"w":"substitute","ph":"/ˈsʌbstɪtuːt/","pos":"n.","cn":"替代品；代替","en":"You can use honey as a substitute for sugar.","tr":"你可以用蜂蜜代替糖。","g":6},{"w":"curiosity","ph":"/ˌkjʊriˈɑːsəti/","pos":"n.","cn":"好奇心；求知欲","en":"Children have a natural curiosity.","tr":"孩子们天生具有好奇心。","g":6},{"w":"solar","ph":"/ˈsoʊlər/","pos":"a.","cn":"太阳的；日光的","en":"Solar energy is renewable.","tr":"太阳能是可再生的。","g":6},{"w":"bond","ph":"/bɑːnd/","pos":"n.","cn":"纽带；债券；结合","en":"The bond between mother and child is strong.","tr":"母子之间的联系很牢固。","g":6},{"w":"crisis","ph":"/ˈkraɪsɪs/","pos":"n.","cn":"危机；紧要关头","en":"The country faced an economic crisis.","tr":"国家面临经济危机。","g":6},{"w":"gene","ph":"/dʒiːn/","pos":"n.","cn":"基因","en":"The disease is caused by a faulty gene.","tr":"#VALUE!","g":6},{"w":"rapid","ph":"/ˈræpɪd/","pos":"a.","cn":"快速的；迅速的","en":"The country experienced rapid economic growth.","tr":"该国经历了快速的经济增长。","g":6},{"w":"suitable","ph":"/ˈsuːtəbl/","pos":"a.","cn":"合适的；适宜的","en":"Is this dress suitable for the party?","tr":"这条裙子适合派对吗？","g":6},{"w":"acid","ph":"/ˈæsɪd/","pos":"n.","cn":"酸；酸性的","en":"The lab tested the acid solution.","tr":"实验室测试了酸性溶液。","g":6},{"w":"chemical","ph":"/ˈkemɪkl/","pos":"a.","cn":"化学的；化学品","en":"The factory uses harmful chemicals.","tr":"工厂使用有害化学品。","g":6},{"w":"conscious","ph":"/ˈkɑːnʃəs/","pos":"a.","cn":"有意识的；清醒的；注意到的","en":"He was conscious during the operation.","tr":"手术过程中他有意识。","g":6},{"w":"panic","ph":"/ˈpænɪk/","pos":"n.","cn":"恐慌；惊慌","en":"The crowd panicked and ran.","tr":"人群惊慌失措，四散逃跑。","g":6},{"w":"breed","ph":"/briːd/","pos":"v.","cn":"繁殖；品种；导致","en":"They breed dogs.","tr":"他们繁殖狗。","g":6},{"w":"civil","ph":"/ˈsɪvl/","pos":"a.","cn":"公民的；民事的；文明的","en":"They married in a civil ceremony.","tr":"他们通过民事婚礼结为夫妻。","g":6},{"w":"tolerance","ph":"/ˈtɑːlərəns/","pos":"n.","cn":"容忍；宽容；忍耐力","en":"We need to show tolerance towards others.","tr":"我们需要对他人表现出宽容。","g":6},{"w":"essential","ph":"/ɪˈsenʃl/","pos":"a.","cn":"必要的；本质的；基本的","en":"Water is essential for life.","tr":"水对生命至关重要。","g":6},{"w":"narrow","ph":"/ˈnæroʊ/","pos":"a.","cn":"狭窄的；勉强的；狭隘的","en":"The road is too narrow for two cars.","tr":"这条路太窄，两辆车过不去。","g":6},{"w":"noble","ph":"/ˈnoʊbl/","pos":"a.","cn":"高尚的；贵族的","en":"He had a noble heart.","tr":"他有一颗高尚的心。","g":6},{"w":"series","ph":"/ˈsɪriːz/","pos":"n.","cn":"系列；连续；丛书","en":"A series of events led to the war.","tr":"一系列事件导致了战争。","g":6},{"w":"military","ph":"/ˈmɪləteri/","pos":"a.","cn":"军事的；军队的；军方","en":"He served in the military.","tr":"他在军队服役。","g":6},{"w":"domestic","ph":"/dəˈmestɪk/","pos":"a.","cn":"国内的；家庭的；驯养的","en":"Domestic flights are often cheaper.","tr":"国内航班通常更便宜。","g":6},{"w":"fierce","ph":"/fɪrs/","pos":"a.","cn":"凶猛的；强烈的","en":"There is fierce competition for the job.","tr":"对这份工作竞争激烈。","g":6},{"w":"fare","ph":"/fer/","pos":"n.","cn":"票价；费用","en":"Bus fares have gone up.","tr":"公交车票价上涨了。","g":6},{"w":"principle","ph":"/ˈprɪnsəpl/","pos":"n.","cn":"原则；原理；道德准则","en":"He is a man of principle.","tr":"他是一个坚持原则的人。","g":6},{"w":"verify","ph":"/ˈverɪfaɪ/","pos":"v.","cn":"核实；证实；查证","en":"We need to verify his identity.","tr":"我们需要验证他的身份。","g":6},{"w":"chase","ph":"/tʃeɪs/","pos":"v.","cn":"追逐；追捕","en":"The dog chased the cat.","tr":"狗追猫。","g":6},{"w":"peak","ph":"/piːk/","pos":"n.","cn":"山峰；顶点；峰值","en":"The mountain peak was covered in snow.","tr":"山峰被雪覆盖。","g":6},{"w":"corporate","ph":"/ˈkɔːrpərət/","pos":"a.","cn":"公司的；法人的","en":"He works in the corporate sector.","tr":"他在企业部门工作。","g":6},{"w":"advocate","ph":"/ˈædvəkeɪt/","pos":"v.","cn":"提倡；拥护者","en":"He advocates for environmental protection.","tr":"他倡导环境保护。","g":6},{"w":"overlook","ph":"/ˌoʊvərˈlʊk/","pos":"v.","cn":"俯瞰；忽略；宽恕","en":"Don&#39;t overlook the small details.","tr":"不要忽视小细节。","g":6},{"w":"represent","ph":"/ˌreprɪˈzent/","pos":"v.","cn":"代表；表示；象征","en":"He represents the company at meetings.","tr":"他在会议上代表公司。","g":6},{"w":"observe","ph":"/əbˈzɜːrv/","pos":"v.","cn":"观察；遵守；注意到；庆祝","en":"Scientists have observed changes in the climate.","tr":"科学家观察到气候的变化。","g":6},{"w":"instruct","ph":"/ɪnˈstrʌkt/","pos":"v.","cn":"指示；教导；通知","en":"The teacher instructed the students to be quiet.","tr":"老师指示学生们保持安静。","g":6},{"w":"volunteer","ph":"/ˌvɑːlənˈtɪr/","pos":"n.","cn":"志愿者；自愿做","en":"He volunteered to help the old lady.","tr":"他自愿帮助那位老妇人。","g":6},{"w":"trial","ph":"/ˈtraɪəl/","pos":"n.","cn":"审判；试验；试用","en":"The new drug is undergoing clinical trials.","tr":"新药正在进行临床试验。","g":6},{"w":"deny","ph":"/dɪˈnaɪ/","pos":"v.","cn":"否认；拒绝给予","en":"He denied knowing anything about the accident.","tr":"他否认对事故知情。","g":6},{"w":"kingdom","ph":"/ˈkɪŋdəm/","pos":"n.","cn":"王国；领域","en":"The United Kingdom is made up of four countries.","tr":"联合王国由四个国家组成。","g":6},{"w":"investment","ph":"/ɪnˈvestmənt/","pos":"n.","cn":"投资；投入","en":"The company made a large investment.","tr":"公司进行了大笔投资。","g":6},{"w":"vote","ph":"/voʊt/","pos":"v.","cn":"投票；选举；表决","en":"You must be 18 to vote.","tr":"你必须满18岁才能投票。","g":6},{"w":"fault","ph":"/fɔːlt/","pos":"n.","cn":"错误；缺点；故障","en":"It&#39;s not my fault that the vase broke.","tr":"花瓶破碎不是我的错。","g":6},{"w":"salary","ph":"/ˈsæləri/","pos":"n.","cn":"工资；薪水","en":"She gets a good salary.","tr":"她薪水很高。","g":6},{"w":"attach","ph":"/əˈtætʃ/","pos":"v.","cn":"附上；系；依恋","en":"Please attach a photo to the form.","tr":"请在表格上附上一张照片。","g":7},{"w":"fuel","ph":"/ˈfjuːəl/","pos":"n.","cn":"燃料；加油；刺激","en":"The car runs on diesel fuel.","tr":"这辆车使用柴油燃料。","g":7},{"w":"merit","ph":"/ˈmerɪt/","pos":"n.","cn":"优点；价值；功绩","en":"The plan has its merits.","tr":"这个计划有其优点。","g":7},{"w":"encourage","ph":"/ɪnˈkɜːrɪdʒ/","pos":"v.","cn":"鼓励；激励；促进","en":"Teachers should encourage students to ask questions.","tr":"教师应该鼓励学生提问。","g":7},{"w":"personality","ph":"/ˌpɜːrsəˈnæləti/","pos":"n.","cn":"个性；人格；名人","en":"She has a strong personality.","tr":"她个性坚强。","g":7},{"w":"chemistry","ph":"/ˈkemɪstri/","pos":"n.","cn":"化学","en":"He studied chemistry in college.","tr":"他在大学学习了化学。","g":7},{"w":"relieve","ph":"/rɪˈliːv/","pos":"v.","cn":"减轻；缓解；解除","en":"The medicine relieved the pain.","tr":"这种药缓解了疼痛。","g":7},{"w":"score","ph":"/skɔːr/","pos":"n.","cn":"分数；得分；二十","en":"He got a high score on the test.","tr":"他在考试中得了高分。","g":7},{"w":"quit","ph":"/kwɪt/","pos":"v.","cn":"辞职；停止；退出","en":"He quit his job last month.","tr":"他上个月辞职了。","g":7},{"w":"relate","ph":"/rɪˈleɪt/","pos":"v.","cn":"联系；叙述；有关联","en":"The two events are closely related.","tr":"这两个事件紧密相关。","g":7},{"w":"organization","ph":"/ˌɔːrɡənəˈzeɪʃn/","pos":"n.","cn":"组织；机构；团体","en":"She works for a non-profit organization.","tr":"她在一家非营利组织工作。","g":7},{"w":"somehow","ph":"/ˈsʌmhaʊ/","pos":"ad.","cn":"以某种方式；由于某种原因","en":"Somehow we got lost.","tr":"不知怎的我们迷路了。","g":7},{"w":"recommend","ph":"/ˌrekəˈmend/","pos":"v.","cn":"推荐；建议","en":"I recommend this book to you.","tr":"我向你推荐这本书。","g":7},{"w":"spare","ph":"/sper/","pos":"a.","cn":"空闲的；备用的；抽出；饶恕","en":"What do you do in your spare time?","tr":"你在空闲时间都做些什么？","g":7},{"w":"yield","ph":"/jiːld/","pos":"v.","cn":"产生；屈服；产量","en":"The investment yielded a high return.","tr":"这项投资带来了高回报。","g":7},{"w":"foundation","ph":"/faʊnˈdeɪʃn/","pos":"n.","cn":"基础；基金会；建立","en":"Trust is the foundation of a good relationship.","tr":"信任是良好关系的基础。","g":7},{"w":"chain","ph":"/tʃeɪn/","pos":"n.","cn":"链子；连锁；一系列","en":"He owns a chain of restaurants.","tr":"他拥有一连锁餐厅。","g":7},{"w":"encounter","ph":"/ɪnˈkaʊntər/","pos":"v.","cn":"遇到；遭遇；邂逅","en":"They encountered many difficulties during the journey.","tr":"他们在旅途中遇到了许多困难。","g":7},{"w":"precise","ph":"/prɪˈsaɪs/","pos":"a.","cn":"精确的；准确的","en":"Can you be more precise?","tr":"你能更精确一些吗？","g":7},{"w":"plunge","ph":"/plʌndʒ/","pos":"v.","cn":"投入；跳入；骤降","en":"He plunged into the water.","tr":"他跳进了水里。","g":7},{"w":"permanent","ph":"/ˈpɜːrmənənt/","pos":"a.","cn":"永久的；固定的","en":"He found a permanent job.","tr":"他找到了一份稳定的工作。","g":7},{"w":"boundary","ph":"/ˈbaʊndri/","pos":"n.","cn":"边界；分界线","en":"The river forms the boundary.","tr":"这条河形成了边界。","g":7},{"w":"abstract","ph":"/ˈæbstrækt/","pos":"a.","cn":"抽象的；摘要","en":"The concept is too abstract to understand.","tr":"这个概念太抽象，难以理解。","g":7},{"w":"detect","ph":"/dɪˈtekt/","pos":"v.","cn":"发现；察觉；探测","en":"The test can detect small amounts of lead.","tr":"这个测试可以检测出微量的铅。","g":7},{"w":"objection","ph":"/əbˈdʒekʃn/","pos":"n.","cn":"反对；异议","en":"He raised an objection to the plan.","tr":"他对计划提出了异议。","g":7},{"w":"superior","ph":"/suːˈpɪriər/","pos":"a.","cn":"较高的；优越的；上级的","en":"This model is superior to the old one.","tr":"这个模型比旧的要好。","g":7},{"w":"secret","ph":"/ˈsiːkrət/","pos":"n.","cn":"秘密；秘密的","en":"Can you keep a secret?","tr":"你能保守秘密吗？","g":7},{"w":"emotion","ph":"/ɪˈmoʊʃn/","pos":"n.","cn":"情感；情绪；激情","en":"He struggled to control his emotions.","tr":"他努力控制自己的情绪。","g":7},{"w":"profession","ph":"/prəˈfeʃn/","pos":"n.","cn":"职业；行业；声明","en":"Teaching is a noble profession.","tr":"教书是一份崇高的职业。","g":7},{"w":"discipline","ph":"/ˈdɪsəplɪn/","pos":"n.","cn":"纪律；学科；训练","en":"Self-discipline is key to success.","tr":"自律是成功的关键。","g":7},{"w":"appetite","ph":"/ˈæpɪtaɪt/","pos":"n.","cn":"食欲；胃口；欲望","en":"He has a good appetite.","tr":"他食欲很好。","g":7},{"w":"peculiar","ph":"/pɪˈkjuːliər/","pos":"a.","cn":"奇怪的；独特的","en":"There was a peculiar smell in the room.","tr":"房间里有一种奇怪的味道。","g":7},{"w":"employee","ph":"/ɪmˈplɔɪiː/","pos":"n.","cn":"雇员；员工","en":"All employees must attend the training.","tr":"所有员工必须参加培训。","g":7},{"w":"qualification","ph":"/ˌkwɑːlɪfɪˈkeɪʃn/","pos":"n.","cn":"资格；资格证书；条件","en":"He has the necessary qualifications for the job.","tr":"他具有从事这项工作的必要资格。","g":7},{"w":"aside","ph":"/əˈsaɪd/","pos":"ad.","cn":"在旁边；到一边","en":"She stepped aside to let him pass.","tr":"她侧身让他过去。","g":7},{"w":"trend","ph":"/trend/","pos":"n.","cn":"趋势；潮流；走向","en":"There is a trend towards remote work.","tr":"远程工作正成为一种趋势。","g":7},{"w":"highway","ph":"/ˈhaɪweɪ/","pos":"n.","cn":"公路；高速公路","en":"They took the highway to the city.","tr":"他们走高速公路去往城市。","g":7},{"w":"frank","ph":"/fræŋk/","pos":"a.","cn":"坦白的；直率的","en":"To be frank, I don&#39;t agree.","tr":"坦白说，我不赞同。","g":7},{"w":"protective","ph":"/prəˈtektɪv/","pos":"a.","cn":"保护的；防护的","en":"Mothers are very protective of their children.","tr":"母亲对她们的孩子非常保护。","g":7},{"w":"scientific","ph":"/ˌsaɪənˈtɪfɪk/","pos":"a.","cn":"科学的","en":"Scientific research needs funding.","tr":"科学研究需要资金支持。","g":7},{"w":"moderate","ph":"/ˈmɑːdərət/","pos":"a.","cn":"适度的；温和的；中等的","en":"Moderate exercise is good for health.","tr":"适度的运动对健康有益。","g":7},{"w":"reform","ph":"/rɪˈfɔːrm/","pos":"v.","cn":"改革；改造","en":"The government plans to reform the tax system.","tr":"政府计划改革税收体系。","g":7},{"w":"injure","ph":"/ˈɪndʒər/","pos":"v.","cn":"伤害；使受伤","en":"Two people were injured in the accident.","tr":"事故中有两人受伤。","g":7},{"w":"leadership","ph":"/ˈliːdərʃɪp/","pos":"n.","cn":"领导；领导能力；领导层","en":"He showed strong leadership skills.","tr":"他展现了强大的领导能力。","g":7},{"w":"consult","ph":"/kənˈsʌlt/","pos":"v.","cn":"咨询；查阅；商量","en":"You should consult a doctor.","tr":"你应该咨询医生。","g":7},{"w":"realistic","ph":"/ˌriːəˈlɪstɪk/","pos":"a.","cn":"现实的；逼真的","en":"We have to be realistic about our chances.","tr":"我们必须现实地看待我们的机会。","g":7},{"w":"legend","ph":"/ˈledʒənd/","pos":"n.","cn":"传说；传奇人物；图例","en":"The legend of King Arthur is famous.","tr":"亚瑟王的传说非常著名。","g":7},{"w":"fund","ph":"/fʌnd/","pos":"n.","cn":"基金；资金；资助","en":"The project is funded by the government.","tr":"该项目由政府资助。","g":7},{"w":"proof","ph":"/pruːf/","pos":"n.","cn":"证据；证明","en":"Do you have proof of purchase?","tr":"你有购买凭证吗？","g":7},{"w":"compound","ph":"/ˈkɑːmpaʊnd/","pos":"n.","cn":"复合物；复合的","en":"Water is a chemical compound.","tr":"水是一种化合物。","g":7},{"w":"former","ph":"/ˈfɔːrmər/","pos":"a.","cn":"从前的；前者的；前任的","en":"The former president gave a speech.","tr":"前总统发表了一次演讲。","g":7},{"w":"disaster","ph":"/dɪˈzæstər/","pos":"n.","cn":"灾难；彻底的失败","en":"The earthquake was the worst natural disaster in decades.","tr":"这次地震是数十年来最严重的自然灾害。","g":7},{"w":"aim","ph":"/eɪm/","pos":"n.","cn":"目标；瞄准","en":"Our aim is to improve customer service.","tr":"我们的目标是提高客户服务。","g":7},{"w":"cast","ph":"/kæst/","pos":"v.","cn":"投掷；演员阵容；铸造","en":"The film has an all-star cast.","tr":"这部电影有全明星阵容。","g":7},{"w":"individual","ph":"/ˌɪndɪˈvɪdʒuəl/","pos":"a.","cn":"个人的；单独的；个人","en":"We value the rights of the individual.","tr":"我们重视个人的权利。","g":7},{"w":"blade","ph":"/bleɪd/","pos":"n.","cn":"刀片；叶片","en":"The blade of the knife is sharp.","tr":"刀刃很锋利。","g":7},{"w":"survey","ph":"/ˈsɜːrveɪ/","pos":"n.","cn":"调查；测量；审视","en":"A survey was conducted among students.","tr":"对学生进行了调查。","g":7},{"w":"accommodation","ph":"/əˌkɑːməˈdeɪʃn/","pos":"n.","cn":"住宿；膳宿","en":"We need to arrange accommodation for guests.","tr":"我们需要为客人安排住宿。","g":7},{"w":"via","ph":"/ˈvaɪə/","pos":"prep.","cn":"通过；经由；凭借","en":"I sent the message via email.","tr":"我通过电子邮件发送了信息。","g":7},{"w":"host","ph":"/hoʊst/","pos":"n.","cn":"主人；主持人；主办；招待","en":"Beijing will host the Olympic Games.","tr":"北京将举办奥运会。","g":7},{"w":"symbol","ph":"/ˈsɪmbl/","pos":"n.","cn":"象征；符号；标志","en":"The dove is a symbol of peace.","tr":"鸽子是和平的象征。","g":7},{"w":"native","ph":"/ˈneɪtɪv/","pos":"a.","cn":"本国的；土著的；当地人","en":"Her native language is Chinese.","tr":"她的母语是中文。","g":7},{"w":"radical","ph":"/ˈrædɪkl/","pos":"a.","cn":"根本的；激进的","en":"He holds radical political views.","tr":"他持有激进的政治观点。","g":7},{"w":"perceive","ph":"/pərˈsiːv/","pos":"v.","cn":"察觉；理解；认为","en":"She perceived a change in his attitude.","tr":"她觉察到他的态度有所变化。","g":7},{"w":"necessity","ph":"/nəˈsesəti/","pos":"n.","cn":"必要性；必需品","en":"Water is a basic necessity.","tr":"水是基本必需品。","g":7},{"w":"label","ph":"/ˈleɪbl/","pos":"n.","cn":"标签；标记；给…贴标签","en":"Read the label on the bottle.","tr":"阅读瓶子上的标签。","g":7},{"w":"award","ph":"/əˈwɔːrd/","pos":"n.","cn":"奖品；授予","en":"She won an award for her research.","tr":"她因研究获得了奖项。","g":7},{"w":"protest","ph":"/ˈproʊtest/","pos":"n.","cn":"抗议；反对","en":"The workers staged a protest against the cuts.","tr":"工人们举行了抗议活动，反对削减。","g":7},{"w":"environment","ph":"/ɪnˈvaɪrənmənt/","pos":"n.","cn":"环境；周围","en":"We must protect the environment.","tr":"我们必须保护环境。","g":7},{"w":"found","ph":"/faʊnd/","pos":"v.","cn":"建立；创立；创办","en":"The college was founded in 1850.","tr":"这所大学成立于1850年。","g":7},{"w":"barrier","ph":"/ˈbæriər/","pos":"n.","cn":"障碍；屏障","en":"Language is no longer a barrier.","tr":"语言不再是障碍。","g":7},{"w":"outline","ph":"/ˈaʊtlaɪn/","pos":"n.","cn":"大纲；轮廓；概述","en":"She outlined her ideas to the team.","tr":"她向团队阐述了她的想法。","g":7},{"w":"delegate","ph":"/ˈdelɪɡət/","pos":"n.","cn":"代表；委派","en":"He was delegated to attend the meeting.","tr":"他被委托代表参加这次会议。","g":7},{"w":"passport","ph":"/ˈpæspɔːrt/","pos":"n.","cn":"护照","en":"You need a passport to travel abroad.","tr":"出国旅行需要护照。","g":7},{"w":"agency","ph":"/ˈeɪdʒənsi/","pos":"n.","cn":"代理机构；中介","en":"She works for a travel agency.","tr":"她在一家旅行社工作。","g":7},{"w":"colleague","ph":"/ˈkɑːliːɡ/","pos":"n.","cn":"同事；同僚","en":"She had lunch with a colleague.","tr":"她和一个同事共进午餐。","g":7},{"w":"valid","ph":"/ˈvælɪd/","pos":"a.","cn":"有效的；合理的；有根据的","en":"Your passport must be valid for six months.","tr":"你的护照必须有效六个月。","g":7},{"w":"stable","ph":"/ˈsteɪbl/","pos":"a.","cn":"稳定的；马厩","en":"The economy is stable.","tr":"经济稳定。","g":7},{"w":"imitate","ph":"/ˈɪmɪteɪt/","pos":"v.","cn":"模仿；效仿","en":"He can imitate many famous actors.","tr":"他能模仿许多著名演员。","g":7},{"w":"grateful","ph":"/ˈɡreɪtfl/","pos":"a.","cn":"感激的；感谢的","en":"I&#39;m very grateful for your help.","tr":"我非常感激你的帮助。","g":7},{"w":"classical","ph":"/ˈklæsɪkl/","pos":"a.","cn":"古典的；经典的","en":"She likes classical music.","tr":"她喜欢古典音乐。","g":8},{"w":"royal","ph":"/ˈrɔɪəl/","pos":"a.","cn":"王室的；皇家的；盛大的","en":"The royal family attended the ceremony.","tr":"王室出席了仪式。","g":8},{"w":"focus","ph":"/ˈfoʊkəs/","pos":"v.","cn":"集中；聚焦；焦点","en":"You need to focus on your studies.","tr":"你需要专注于学习。","g":8},{"w":"concentrate","ph":"/ˈkɑːnsntreɪt/","pos":"v.","cn":"集中；专注","en":"I can&#39;t concentrate with all this noise.","tr":"在这么吵闹的环境下我无法集中注意力。","g":8},{"w":"network","ph":"/ˈnetwɜːrk/","pos":"n.","cn":"网络；网状系统；人际关系","en":"She has a large network of contacts.","tr":"她拥有庞大的联系网络。","g":8},{"w":"experiment","ph":"/ɪkˈsperɪmənt/","pos":"n.","cn":"实验；试验；尝试","en":"The experiment proved the theory was correct.","tr":"实验证明了理论是正确的。","g":8},{"w":"miserable","ph":"/ˈmɪzrəbl/","pos":"a.","cn":"痛苦的；悲惨的","en":"He felt miserable after the loss.","tr":"他在失利后感到非常痛苦。","g":8},{"w":"safety","ph":"/ˈseɪfti/","pos":"n.","cn":"安全；安全性","en":"Safety is our top priority.","tr":"安全是我们的首要任务。","g":8},{"w":"proceed","ph":"/prəˈsiːd/","pos":"v.","cn":"继续；进行；前进","en":"Let&#39;s proceed with the plan.","tr":"让我们继续执行计划。","g":8},{"w":"skill","ph":"/skɪl/","pos":"n.","cn":"技能；技巧","en":"You need communication skills.","tr":"你需要沟通技巧。","g":8},{"w":"radiate","ph":"/ˈreɪdieɪt/","pos":"v.","cn":"辐射；散发；流露","en":"Heat radiates from the sun.","tr":"太阳散发出热量。","g":8},{"w":"portion","ph":"/ˈpɔːrʃn/","pos":"n.","cn":"部分；一份；命运","en":"A large portion of the money went to rent.","tr":"大部分钱都花在了租金上。","g":8},{"w":"pledge","ph":"/pledʒ/","pos":"n.","cn":"誓言；保证；抵押","en":"He made a pledge to quit smoking.","tr":"他承诺戒烟。","g":8},{"w":"substance","ph":"/ˈsʌbstəns/","pos":"n.","cn":"物质；实质；重要性","en":"Water is a liquid substance.","tr":"水是一种液体物质。","g":8},{"w":"vacant","ph":"/ˈveɪkənt/","pos":"a.","cn":"空的；空缺的；茫然的","en":"The seat next to her was vacant.","tr":"她旁边的座位是空的。","g":8},{"w":"finance","ph":"/ˈfaɪnæns/","pos":"n.","cn":"财政；金融；资金","en":"He is an expert in finance.","tr":"他是金融领域的专家。","g":8},{"w":"transform","ph":"/trænsˈfɔːrm/","pos":"v.","cn":"转变；改造；变形","en":"The internet has transformed our lives.","tr":"互联网已经改变了我们的生活。","g":8},{"w":"reproduce","ph":"/ˌriːprəˈduːs/","pos":"v.","cn":"复制；繁殖；再现","en":"The artist reproduced the painting.","tr":"这位艺术家复制了那幅画。","g":8},{"w":"guarantee","ph":"/ˌɡærənˈtiː/","pos":"n.","cn":"保证；担保；保修","en":"The product comes with a one-year guarantee.","tr":"产品附带一年的保证。","g":8},{"w":"renew","ph":"/rɪˈnuː/","pos":"v.","cn":"更新；恢复；续借","en":"I need to renew my passport.","tr":"我需要更新我的护照。","g":8},{"w":"layer","ph":"/ˈleɪər/","pos":"n.","cn":"层；层次","en":"There was a thin layer of ice on the road.","tr":"路上有一层薄薄的冰。","g":8},{"w":"shift","ph":"/ʃɪft/","pos":"v.","cn":"转移；改变；轮班","en":"He works the night shift.","tr":"他上夜班。","g":8},{"w":"interrupt","ph":"/ˌɪntəˈrʌpt/","pos":"v.","cn":"打断；中断；打扰","en":"Don&#39;t interrupt me while I&#39;m speaking.","tr":"我在说话的时候不要打断我。","g":8},{"w":"raw","ph":"/rɔː/","pos":"a.","cn":"生的；未加工的；原始的","en":"The meat was raw inside.","tr":"肉里面还是生的。","g":8},{"w":"generous","ph":"/ˈdʒenərəs/","pos":"a.","cn":"慷慨的；大方的；丰盛的","en":"She is always generous with her time.","tr":"#VALUE!","g":8},{"w":"rush","ph":"/rʌʃ/","pos":"v.","cn":"冲；匆忙；高峰时间","en":"I&#39;m in a rush.","tr":"我很急。","g":8},{"w":"silence","ph":"/ˈsaɪləns/","pos":"n.","cn":"沉默；寂静","en":"There was a moment of silence.","tr":"有一刻的沉默。","g":8},{"w":"browse","ph":"/braʊz/","pos":"v.","cn":"浏览；吃草","en":"I like to browse the internet in my free time.","tr":"我喜欢在空闲时间浏览互联网。","g":8},{"w":"source","ph":"/sɔːrs/","pos":"n.","cn":"来源；根源；出处","en":"The river is the source of the city&#39;s water.","tr":"这条河是城市水源的源头。","g":8},{"w":"save","ph":"/seɪv/","pos":"v.","cn":"节省；拯救；储蓄","en":"Save your energy for the final.","tr":"为最后保存你的能量。","g":8},{"w":"occupy","ph":"/ˈɑːkjupaɪ/","pos":"v.","cn":"占据；占领；使忙碌","en":"The sofa occupies too much space.","tr":"沙发占据了太多空间。","g":8},{"w":"imply","ph":"/ɪmˈplaɪ/","pos":"v.","cn":"暗示；意味着","en":"What are you implying?","tr":"你暗示的是什么？","g":8},{"w":"phenomenon","ph":"/fɪˈnɑːmɪnən/","pos":"n.","cn":"现象","en":"This is a natural phenomenon.","tr":"这是一种自然现象。","g":8},{"w":"overtake","ph":"/ˌoʊvərˈteɪk/","pos":"v.","cn":"追上；超过；突然降临","en":"The car overtook the truck safely.","tr":"汽车安全地超过了卡车。","g":8},{"w":"accuse","ph":"/əˈkjuːz/","pos":"v.","cn":"指控；指责","en":"They accused him of theft.","tr":"他们指控他偷窃。","g":8},{"w":"excellent","ph":"/ˈeksələnt/","pos":"a.","cn":"优秀的；极好的；杰出的","en":"She did an excellent job on the project.","tr":"她在项目上做得非常出色。","g":8},{"w":"variable","ph":"/ˈveriəbl/","pos":"a.","cn":"可变的；变量","en":"The weather here is highly variable.","tr":"这里的天气变化无常。","g":8},{"w":"release","ph":"/rɪˈliːs/","pos":"v.","cn":"释放；发布；发行","en":"The new album will be released next month.","tr":"新专辑将在下个月发布。","g":8},{"w":"emergency","ph":"/ɪˈmɜːrdʒənsi/","pos":"n.","cn":"紧急情况；突发事件","en":"Call me only in case of emergency.","tr":"只在紧急情况下联系我。","g":8},{"w":"awkward","ph":"/ˈɔːkwərd/","pos":"a.","cn":"尴尬的；笨拙的","en":"There was an awkward silence.","tr":"出现了一段尴尬的沉默。","g":8},{"w":"betray","ph":"/bɪˈtreɪ/","pos":"v.","cn":"背叛；出卖","en":"He would never betray his friends.","tr":"他永远不会背叛他的朋友。","g":8},{"w":"hence","ph":"/hens/","pos":"ad.","cn":"因此；从今以后","en":"The road is wet; hence, we must drive slowly.","tr":"道路湿滑；因此，我们必须慢速驾驶。","g":8},{"w":"philosophy","ph":"/fɪˈlɑːsəfi/","pos":"n.","cn":"哲学；人生哲学","en":"He studied philosophy at college.","tr":"他在大学学习哲学。","g":8},{"w":"visual","ph":"/ˈvɪʒuəl/","pos":"a.","cn":"视觉的；看得见的","en":"Visual aids can help students learn.","tr":"视觉辅助工具可以帮助学生学习。","g":8},{"w":"classic","ph":"/ˈklæsɪk/","pos":"a.","cn":"经典的；古典的","en":"This novel is a classic.","tr":"这本小说是经典之作。","g":8},{"w":"heritage","ph":"/ˈherɪtɪdʒ/","pos":"n.","cn":"遗产；传统","en":"The Great Wall is a world heritage site.","tr":"长城是世界文化遗产。","g":8},{"w":"vision","ph":"/ˈvɪʒn/","pos":"n.","cn":"视力；远见；幻想","en":"She has a vision of a better future.","tr":"她对更美好的未来有一个愿景。","g":8},{"w":"gap","ph":"/ɡæp/","pos":"n.","cn":"差距；缺口；间隙","en":"There is a wide gap between the two walls.","tr":"两堵墙之间有很大的间隙。","g":8},{"w":"talent","ph":"/ˈtælənt/","pos":"n.","cn":"才能；天赋；人才","en":"She has a talent for painting.","tr":"她在绘画方面有天赋。","g":8},{"w":"dull","ph":"/dʌl/","pos":"a.","cn":"乏味的；迟钝的","en":"The lecture was rather dull.","tr":"讲座相当枯燥。","g":8},{"w":"benefit","ph":"/ˈbenɪfɪt/","pos":"n.","cn":"好处；受益；有益于","en":"Exercise benefits your health.","tr":"锻炼对你的健康有益。","g":8},{"w":"muscle","ph":"/ˈmʌsl/","pos":"n.","cn":"肌肉；力量","en":"He exercises to strengthen his muscles.","tr":"他锻炼以增强肌肉。","g":8},{"w":"scale","ph":"/skeɪl/","pos":"n.","cn":"规模；比例；秤；鳞","en":"The project was done on a large scale.","tr":"这个项目是以大规模进行的。","g":8},{"w":"resolve","ph":"/rɪˈzɑːlv/","pos":"v.","cn":"解决；决心；决定","en":"We need to resolve this issue quickly.","tr":"我们需要迅速解决这个问题。","g":8},{"w":"headquarters","ph":"/ˈhedkwɔːrtərz/","pos":"n.","cn":"总部；司令部","en":"The company&#39;s headquarters are in London.","tr":"公司的总部位于伦敦。","g":8},{"w":"fertile","ph":"/ˈfɜːrtl/","pos":"a.","cn":"肥沃的；富饶的","en":"The soil here is very fertile.","tr":"这里的土壤非常肥沃。","g":8},{"w":"insect","ph":"/ˈɪnsekt/","pos":"n.","cn":"昆虫","en":"Ants are social insects.","tr":"蚂蚁是社会性昆虫。","g":8},{"w":"digital","ph":"/ˈdɪdʒɪtl/","pos":"a.","cn":"数字的；数码的","en":"Digital cameras have replaced film cameras.","tr":"数码相机已经取代了胶片相机。","g":8},{"w":"currency","ph":"/ˈkɜːrənsi/","pos":"n.","cn":"货币；流通","en":"The euro is the currency of the EU.","tr":"欧元是欧盟的货币。","g":8},{"w":"operational","ph":"/ˌɑːpəˈreɪʃənl/","pos":"a.","cn":"操作上的；运转的","en":"The new system is now fully operational.","tr":"新系统现在已全面运行。","g":8},{"w":"retire","ph":"/rɪˈtaɪər/","pos":"v.","cn":"退休；退出","en":"He retired at the age of 60.","tr":"他在60岁时退休了。","g":8},{"w":"resort","ph":"/rɪˈzɔːrt/","pos":"n.","cn":"度假胜地；诉诸；手段","en":"The beach resort was crowded in summer.","tr":"夏日里海滩度假村人满为患。","g":8},{"w":"chip","ph":"/tʃɪp/","pos":"n.","cn":"芯片；薯条；碎片","en":"The computer chip is tiny.","tr":"计算机芯片很小。","g":8},{"w":"revenue","ph":"/ˈrevənuː/","pos":"n.","cn":"收入；税收","en":"The government&#39;s revenue has increased.","tr":"政府的收入增加了。","g":8},{"w":"modify","ph":"/ˈmɑːdɪfaɪ/","pos":"v.","cn":"修改；更改；修饰","en":"We need to modify the plan.","tr":"我们需要修改计划。","g":8},{"w":"input","ph":"/ˈɪnpʊt/","pos":"n.","cn":"输入；投入；输入的信息","en":"Please input your password.","tr":"请输入您的密码。","g":8},{"w":"sufficient","ph":"/səˈfɪʃnt/","pos":"a.","cn":"足够的；充分的","en":"We have sufficient food for the trip.","tr":"我们有足够的食物供旅行使用。","g":8},{"w":"highlight","ph":"/ˈhaɪlaɪt/","pos":"v.","cn":"强调；突出；最精彩的部分","en":"The report highlights the need for reform.","tr":"报告强调了改革的必要性。","g":8},{"w":"priest","ph":"/priːst/","pos":"n.","cn":"牧师；神父","en":"The priest delivered a sermon.","tr":"牧师发表了布道。","g":8},{"w":"height","ph":"/haɪt/","pos":"n.","cn":"高度；身高；顶点","en":"He is of average height.","tr":"他的身高是中等。","g":8},{"w":"refugee","ph":"/ˌrefjuˈdʒiː/","pos":"n.","cn":"难民","en":"The country accepted thousands of refugees.","tr":"该国接纳了成千上万的难民。","g":8},{"w":"interpret","ph":"/ɪnˈtɜːrprɪt/","pos":"v.","cn":"解释；口译；理解","en":"How do you interpret this sentence?","tr":"你怎么解释这句话？","g":8},{"w":"spread","ph":"/spred/","pos":"v.","cn":"展开；传播；蔓延；涂抹","en":"The news spread quickly.","tr":"新闻迅速传播开来。","g":8},{"w":"essay","ph":"/ˈeseɪ/","pos":"n.","cn":"短文；散文；尝试","en":"She wrote an essay on climate change.","tr":"她写了一篇关于气候变化的论文。","g":8},{"w":"quantity","ph":"/ˈkwɑːntəti/","pos":"n.","cn":"数量；量","en":"We need a large quantity of water.","tr":"我们需要大量的水。","g":8},{"w":"cargo","ph":"/ˈkɑːrɡoʊ/","pos":"n.","cn":"货物","en":"The ship carries cargo across the ocean.","tr":"这艘船将货物运往大洋彼岸。","g":8},{"w":"clinic","ph":"/ˈklɪnɪk/","pos":"n.","cn":"诊所","en":"She works at a dental clinic.","tr":"她在一家牙科诊所工作。","g":8},{"w":"whereas","ph":"/ˌwerˈæz/","pos":"conj.","cn":"然而；鉴于；反之","en":"He likes coffee, whereas she prefers tea.","tr":"他喜欢咖啡，而她更喜欢茶。","g":8},{"w":"majority","ph":"/məˈdʒɔːrəti/","pos":"n.","cn":"大多数；多数派","en":"The majority of people agree with the plan.","tr":"大多数人同意这个计划。","g":8},{"w":"expense","ph":"/ɪkˈspens/","pos":"n.","cn":"花费；代价；开支","en":"The expense of living in the city is high.","tr":"在城市生活的开销很大。","g":8},{"w":"bound","ph":"/baʊnd/","pos":"a.","cn":"一定的；有义务的；跳跃","en":"We are bound to succeed.","tr":"我们一定会成功。","g":9},{"w":"mist","ph":"/mɪst/","pos":"n.","cn":"薄雾；水汽","en":"The mountain was covered in mist.","tr":"山被雾气笼罩。","g":9},{"w":"carbon","ph":"/ˈkɑːrbən/","pos":"n.","cn":"碳","en":"Carbon dioxide causes global warming.","tr":"二氧化碳导致全球变暖。","g":9},{"w":"belief","ph":"/bɪˈliːf/","pos":"n.","cn":"信念；相信；信仰","en":"She has a strong belief in God.","tr":"她对上帝有坚定的信仰。","g":9},{"w":"science","ph":"/ˈsaɪəns/","pos":"n.","cn":"科学；学科","en":"Science has changed our lives.","tr":"科学改变了我们的生活。","g":9},{"w":"distinct","ph":"/dɪˈstɪŋkt/","pos":"a.","cn":"明显的；不同的；清晰的","en":"The two concepts are quite distinct.","tr":"这两个概念截然不同。","g":9},{"w":"outcome","ph":"/ˈaʊtkʌm/","pos":"n.","cn":"结果；结局","en":"What was the outcome of the meeting?","tr":"会议的结果是什么？","g":9},{"w":"external","ph":"/ɪkˈstɜːrnl/","pos":"a.","cn":"外部的；外面的；外国的","en":"The external walls need painting.","tr":"外墙需要粉刷。","g":9},{"w":"alcohol","ph":"/ˈælkəhɔːl/","pos":"n.","cn":"酒精；酒","en":"The legal drinking age for alcohol is 21.","tr":"法定饮酒年龄是21岁。","g":9},{"w":"machinery","ph":"/məˈʃiːnəri/","pos":"n.","cn":"机器；机械装置","en":"The factory invested in new machinery.","tr":"工厂投资了新的机器。","g":9},{"w":"guidance","ph":"/ˈɡaɪdns/","pos":"n.","cn":"指导；引导；导航","en":"She provided guidance to the new employees.","tr":"她为新员工提供了指导。","g":9},{"w":"broadcast","ph":"/ˈbrɔːdkæst/","pos":"v.","cn":"广播；播送","en":"The event will be broadcast live.","tr":"该活动将进行现场直播。","g":9},{"w":"social","ph":"/ˈsoʊʃl/","pos":"a.","cn":"社会的；社交的","en":"Social media has changed our lives.","tr":"社交媒体改变了我们的生活。","g":9},{"w":"nuclear","ph":"/ˈnuːkliər/","pos":"a.","cn":"原子核的；核能的；核心的","en":"Nuclear energy can be dangerous.","tr":"核能可能是危险的。","g":9},{"w":"persist","ph":"/pərˈsɪst/","pos":"v.","cn":"坚持；持续存在","en":"If you persist, you will succeed.","tr":"如果你坚持下去，你会成功的。","g":9},{"w":"arouse","ph":"/əˈraʊz/","pos":"v.","cn":"引起；唤醒；唤起","en":"The film aroused their interest.","tr":"这部电影引起了他们的兴趣。","g":9},{"w":"diverse","ph":"/daɪˈvɜːrs/","pos":"a.","cn":"不同的；多样的","en":"The city has a diverse population.","tr":"这个城市有多种族的人口。","g":9},{"w":"security","ph":"/sɪˈkjʊrəti/","pos":"n.","cn":"安全；保安；抵押品","en":"Airport security has been increased.","tr":"机场安全措施已加强。","g":9},{"w":"wrap","ph":"/ræp/","pos":"v.","cn":"包裹；缠绕；披肩","en":"She wrapped the gift in colorful paper.","tr":"她用彩色纸包裹了礼物。","g":9},{"w":"favor","ph":"/ˈfeɪvər/","pos":"n.","cn":"喜爱；赞同；恩惠；有利于","en":"Could you do me a favor?","tr":"你能帮我个忙吗？","g":9},{"w":"genuine","ph":"/ˈdʒenjuɪn/","pos":"a.","cn":"真正的；真诚的","en":"He showed genuine concern for her health.","tr":"#VALUE!","g":9},{"w":"guilty","ph":"/ˈɡɪlti/","pos":"a.","cn":"有罪的；内疚的","en":"He felt guilty about lying.","tr":"他因为说谎感到内疚。","g":9},{"w":"tough","ph":"/tʌf/","pos":"a.","cn":"艰难的；坚强的；粗暴的","en":"It was a tough decision.","tr":"这是一个艰难的决定。","g":9},{"w":"academic","ph":"/ˌækəˈdemɪk/","pos":"a.","cn":"学术的；学院的","en":"She published an academic paper.","tr":"她发表了一篇学术论文。","g":9},{"w":"mercy","ph":"/ˈmɜːrsi/","pos":"n.","cn":"仁慈；宽恕；怜悯","en":"They showed no mercy to the prisoners.","tr":"他们对囚犯毫不留情。","g":9},{"w":"advanced","ph":"/ədˈvænst/","pos":"a.","cn":"高级的；先进的","en":"She took an advanced English course.","tr":"她参加了一个高级英语课程。","g":9},{"w":"climate","ph":"/ˈklaɪmət/","pos":"n.","cn":"气候；风气","en":"The climate is changing rapidly.","tr":"气候正在迅速变化。","g":9},{"w":"export","ph":"/ˈekspɔːrt/","pos":"n.","cn":"出口；输出；出口商品","en":"The country exports oil to many nations.","tr":"这个国家向许多国家出口石油。","g":9},{"w":"joint","ph":"/dʒɔɪnt/","pos":"a.","cn":"共同的；联合的；关节","en":"The two companies made a joint effort.","tr":"这两家公司共同努力。","g":9},{"w":"assist","ph":"/əˈsɪst/","pos":"v.","cn":"帮助；协助","en":"Can you assist me with this?","tr":"你能帮我一下吗？","g":9},{"w":"appreciate","ph":"/əˈpriːʃieɪt/","pos":"v.","cn":"欣赏；感激；领会","en":"I appreciate your help.","tr":"我感激你的帮助。","g":9},{"w":"shortage","ph":"/ˈʃɔːrtɪdʒ/","pos":"n.","cn":"短缺；不足","en":"There is a shortage of fresh water.","tr":"新鲜水短缺。","g":9},{"w":"probe","ph":"/proʊb/","pos":"n.","cn":"探测器；调查；探查","en":"The journalist probed into the scandal.","tr":"记者深入调查了这起丑闻。","g":9},{"w":"spirit","ph":"/ˈspɪrɪt/","pos":"n.","cn":"精神；心灵；烈酒","en":"Team spirit is important.","tr":"团队精神很重要。","g":9},{"w":"exercise","ph":"/ˈeksərsaɪz/","pos":"n.","cn":"练习；锻炼；行使","en":"Regular exercise is good for your health.","tr":"定期锻炼对你的健康有益。","g":9},{"w":"amateur","ph":"/ˈæmətʃər/","pos":"n.","cn":"业余爱好者；业余的","en":"He is an amateur photographer.","tr":"他是一名业余摄影师。","g":9},{"w":"household","ph":"/ˈhaʊshoʊld/","pos":"n.","cn":"家庭；一家人；家庭的","en":"The average household spends $200 a month on electricity.","tr":"普通家庭每月电费支出为200美元。","g":9},{"w":"appoint","ph":"/əˈpɔɪnt/","pos":"v.","cn":"任命；约定","en":"They appointed him as manager.","tr":"他们任命他为经理。","g":9},{"w":"insurance","ph":"/ɪnˈʃʊrəns/","pos":"n.","cn":"保险；保险费","en":"He has health insurance through his job.","tr":"他通过工作获得了健康保险。","g":9},{"w":"companion","ph":"/kəmˈpæniən/","pos":"n.","cn":"同伴；伙伴","en":"His dog is his loyal companion.","tr":"他的狗是他的忠诚伙伴。","g":9},{"w":"bankrupt","ph":"/ˈbæŋkrʌpt/","pos":"a.","cn":"破产的；使破产","en":"The company went bankrupt.","tr":"公司破产了。","g":9},{"w":"hint","ph":"/hɪnt/","pos":"n.","cn":"提示；暗示","en":"She gave a hint about the surprise.","tr":"她暗示了惊喜的存在。","g":9},{"w":"impact","ph":"/ˈɪmpækt/","pos":"n.","cn":"影响；冲击；撞击","en":"The impact of technology on education is huge.","tr":"技术对教育的影响是巨大的。","g":9},{"w":"penalty","ph":"/ˈpenəlti/","pos":"n.","cn":"处罚；罚款；罚球","en":"The penalty for speeding is a fine.","tr":"超速的惩罚是罚款。","g":9},{"w":"behalf","ph":"/bɪˈhæf/","pos":"n.","cn":"代表；利益","en":"On behalf of the team, I thank you.","tr":"我代表团队感谢你。","g":9},{"w":"wound","ph":"/wuːnd/","pos":"n.","cn":"伤口；伤害；使受伤","en":"The soldier had a wound on his leg.","tr":"士兵的腿上有伤口。","g":9},{"w":"retain","ph":"/rɪˈteɪn/","pos":"v.","cn":"保持；保留；记住","en":"She retains a clear memory of the event.","tr":"她对那个事件保留着清晰的记忆。","g":9},{"w":"poison","ph":"/ˈpɔɪzn/","pos":"n.","cn":"毒药；毒害","en":"The snake&#39;s bite contains poison.","tr":"蛇的咬合含有毒液。","g":9},{"w":"competitive","ph":"/kəmˈpetətɪv/","pos":"a.","cn":"竞争的；有竞争力的","en":"The market is very competitive.","tr":"市场竞争非常激烈。","g":9},{"w":"submit","ph":"/səbˈmɪt/","pos":"v.","cn":"提交；屈从；建议","en":"Please submit your report by Friday.","tr":"请在周五之前提交你的报告。","g":9},{"w":"error","ph":"/ˈerər/","pos":"n.","cn":"错误；差错；误差","en":"The report contained several factual errors.","tr":"报告中包含了一些事实错误。","g":9},{"w":"symptom","ph":"/ˈsɪmptəm/","pos":"n.","cn":"症状；征候","en":"Fever is a common symptom of flu.","tr":"发烧是流感的常见症状。","g":9},{"w":"disturb","ph":"/dɪˈstɜːrb/","pos":"v.","cn":"打扰；妨碍；使焦虑","en":"Please do not disturb the sleeping baby.","tr":"请不要打扰正在睡觉的宝宝。","g":9},{"w":"plot","ph":"/plɑːt/","pos":"n.","cn":"情节；阴谋；小块土地","en":"The plot of the movie was confusing.","tr":"电影的情节令人困惑。","g":9},{"w":"rare","ph":"/rer/","pos":"a.","cn":"稀有的；罕见的；半熟的","en":"It&#39;s rare to see snow in this area.","tr":"在这个地区很少看到雪。","g":9},{"w":"express","ph":"/ɪkˈspres/","pos":"v.","cn":"表达；表示；快车；快递","en":"He expressed his gratitude in a letter.","tr":"他在信中表达了感激之情。","g":9},{"w":"abortion","ph":"/əˈbɔːrʃn/","pos":"n.","cn":"流产；堕胎","en":"The issue of abortion remains controversial.","tr":"堕胎问题仍然存在争议。","g":9},{"w":"capital","ph":"/ˈkæpɪtl/","pos":"n.","cn":"首都；资本；大写字母","en":"Beijing is the capital of China.","tr":"北京是中国的首都。","g":9},{"w":"likewise","ph":"/ˈlaɪkwaɪz/","pos":"ad.","cn":"同样地；也","en":"She was a great teacher, and likewise a great mother.","tr":"她是一位伟大的老师，同样也是一位伟大的母亲。","g":9},{"w":"exhibit","ph":"/ɪɡˈzɪbɪt/","pos":"v.","cn":"展览；显示；展品","en":"The museum exhibits ancient Egyptian artifacts.","tr":"博物馆展出了古埃及文物。","g":9},{"w":"urban","ph":"/ˈɜːrbən/","pos":"a.","cn":"城市的；都市的","en":"Urban areas have higher living costs.","tr":"城市地区的居住成本更高。","g":9},{"w":"confirm","ph":"/kənˈfɜːrm/","pos":"v.","cn":"确认；证实；批准","en":"Please confirm your reservation.","tr":"请确认您的预订。","g":9},{"w":"rack","ph":"/ræk/","pos":"n.","cn":"架子；行李架","en":"Put your luggage on the rack.","tr":"把你的行李放在架子上。","g":9},{"w":"fame","ph":"/feɪm/","pos":"n.","cn":"名声；名望","en":"He gained fame after winning the competition.","tr":"他在赢得比赛后获得了名声。","g":9},{"w":"economy","ph":"/ɪˈkɑːnəmi/","pos":"n.","cn":"经济；节约","en":"The global economy is growing slowly.","tr":"全球经济正在缓慢增长。","g":9},{"w":"prompt","ph":"/prɑːmpt/","pos":"a.","cn":"迅速的；立刻的；提示","en":"A prompt reply is appreciated.","tr":"请尽快回复。","g":9},{"w":"scientist","ph":"/ˈsaɪəntɪst/","pos":"n.","cn":"科学家","en":"The scientist made a discovery.","tr":"科学家有了一个发现。","g":9},{"w":"entire","ph":"/ɪnˈtaɪər/","pos":"a.","cn":"整个的；全部的","en":"The entire village was destroyed by the storm.","tr":"整个村庄被暴风雨摧毁了。","g":9},{"w":"consider","ph":"/kənˈsɪdər/","pos":"v.","cn":"考虑；认为","en":"Please consider my proposal.","tr":"请考虑我的提案。","g":9},{"w":"indicate","ph":"/ˈɪndɪkeɪt/","pos":"v.","cn":"表明；指出；暗示","en":"Research indicates that the risk is low.","tr":"研究表明风险较低。","g":9},{"w":"deposit","ph":"/dɪˈpɑːzɪt/","pos":"n.","cn":"存款；押金；放置","en":"He paid a deposit for the apartment.","tr":"他为公寓支付了押金。","g":9},{"w":"intention","ph":"/ɪnˈtenʃn/","pos":"n.","cn":"意图；目的；打算","en":"He had no intention of hurting her.","tr":"他无意伤害她。","g":9},{"w":"category","ph":"/ˈkætəɡɔːri/","pos":"n.","cn":"类别；种类","en":"This book falls into the fiction category.","tr":"这本书归类为小说。","g":9},{"w":"pressure","ph":"/ˈpreʃər/","pos":"n.","cn":"压力；压强；压迫","en":"He is under a lot of pressure at work.","tr":"他在工作中承受了很多压力。","g":9},{"w":"veteran","ph":"/ˈvetərən/","pos":"n.","cn":"老兵；老手；经验丰富的人","en":"He is a veteran of the Second World War.","tr":"他是第二次世界大战的老兵。","g":9},{"w":"habitat","ph":"/ˈhæbɪtæt/","pos":"n.","cn":"栖息地；产地","en":"The panda&#39;s natural habitat is the bamboo forest.","tr":"熊猫的自然栖息地是竹林。","g":9},{"w":"shame","ph":"/ʃeɪm/","pos":"n.","cn":"羞耻；遗憾；耻辱","en":"It&#39;s a shame that he can&#39;t come.","tr":"他不能来真是遗憾。","g":9},{"w":"arrest","ph":"/əˈrest/","pos":"v.","cn":"逮捕；拘留；阻止","en":"The police arrested the suspect.","tr":"警察逮捕了嫌疑人。","g":9},{"w":"electronic","ph":"/ɪˌlekˈtrɑːnɪk/","pos":"a.","cn":"电子的；电子设备的","en":"Electronic devices are not allowed during takeoff.","tr":"起飞过程中不允许使用电子设备。","g":9},{"w":"spot","ph":"/spɑːt/","pos":"n.","cn":"地点；斑点；发现","en":"It&#39;s a popular tourist spot.","tr":"这是一个热门的旅游景点。","g":9},{"w":"retreat","ph":"/rɪˈtriːt/","pos":"v.","cn":"撤退；退避；隐居处","en":"The army was forced to retreat.","tr":"军队被迫撤退。","g":10},{"w":"comprehension","ph":"/ˌkɑːmprɪˈhenʃn/","pos":"n.","cn":"理解；理解力","en":"Reading comprehension is important.","tr":"阅读理解很重要。","g":10},{"w":"characteristic","ph":"/ˌkærəktəˈrɪstɪk/","pos":"n.","cn":"特征；典型的","en":"What are the characteristics of a good leader?","tr":"一个好的领导有哪些特点？","g":10},{"w":"purchase","ph":"/ˈpɜːrtʃəs/","pos":"v.","cn":"购买；购买的东西","en":"She purchased a new laptop.","tr":"她购买了一台新的笔记本电脑。","g":10},{"w":"tackle","ph":"/ˈtækl/","pos":"v.","cn":"处理；抓住；对付","en":"We need to tackle the problem immediately.","tr":"我们需要立即解决这个问题。","g":10},{"w":"create","ph":"/kriˈeɪt/","pos":"v.","cn":"创造；创建","en":"We want to create a better future.","tr":"我们想要创造一个更美好的未来。","g":10},{"w":"nasty","ph":"/ˈnæsti/","pos":"a.","cn":"令人厌恶的；下流的","en":"The weather is really nasty today.","tr":"今天的天气真的很糟糕。","g":10},{"w":"code","ph":"/koʊd/","pos":"n.","cn":"代码；密码；准则","en":"I forgot the access code.","tr":"我忘记了访问代码。","g":10},{"w":"rear","ph":"/rɪr/","pos":"a.","cn":"后部的；后面","en":"The rear door was locked.","tr":"后门被锁上了。","g":10},{"w":"transport","ph":"/ˈtrænspɔːrt/","pos":"n.","cn":"运输；交通系统","en":"Public transport in the city is excellent.","tr":"这座城市的公共交通非常优秀。","g":10},{"w":"constant","ph":"/ˈkɑːnstənt/","pos":"a.","cn":"不断的；不变的；忠实的","en":"The constant noise annoyed me.","tr":"持续的噪音让我感到烦恼。","g":10},{"w":"extensive","ph":"/ɪkˈstensɪv/","pos":"a.","cn":"广泛的；大量的；广阔的","en":"The fire caused extensive damage.","tr":"火灾造成了广泛的破坏。","g":10},{"w":"capacity","ph":"/kəˈpæsəti/","pos":"n.","cn":"能力；容量；身份","en":"The stadium has a capacity of 50,000.","tr":"体育场的容量是50,000个座位。","g":10},{"w":"realm","ph":"/relm/","pos":"n.","cn":"领域；王国","en":"The discovery opened a new realm of science.","tr":"这一发现开辟了科学的新领域。","g":10},{"w":"generate","ph":"/ˈdʒenəreɪt/","pos":"v.","cn":"产生；引起；发（电）","en":"The wind farm generates electricity.","tr":"#VALUE!","g":10},{"w":"coordinate","ph":"/koʊˈɔːrdɪneɪt/","pos":"v.","cn":"协调；配合","en":"We need to coordinate our efforts.","tr":"我们需要协调我们的努力。","g":10},{"w":"extraordinary","ph":"/ɪkˈstrɔːrdəneri/","pos":"a.","cn":"非凡的；特别的；离奇的","en":"He has an extraordinary memory.","tr":"他拥有非凡的记忆力。","g":10},{"w":"enormous","ph":"/ɪˈnɔːrməs/","pos":"a.","cn":"巨大的；庞大的","en":"The project required an enormous amount of money.","tr":"该项目需要巨额资金。","g":10},{"w":"vanish","ph":"/ˈvænɪʃ/","pos":"v.","cn":"消失；突然不见","en":"The thief vanished into the night.","tr":"小偷消失在夜色中。","g":10},{"w":"divorce","ph":"/dɪˈvɔːrs/","pos":"n.","cn":"离婚；分离","en":"The divorce rate has increased in recent years.","tr":"近年来离婚率有所上升。","g":10},{"w":"complex","ph":"/ˈkɑːmpleks/","pos":"a.","cn":"复杂的；复合的","en":"The problem is too complex.","tr":"这个问题太复杂了。","g":10},{"w":"odd","ph":"/ɑːd/","pos":"a.","cn":"奇怪的；奇数的；临时的","en":"It&#39;s odd that he didn&#39;t call.","tr":"他没有打电话很奇怪。","g":10},{"w":"voluntary","ph":"/ˈvɑːlənteri/","pos":"a.","cn":"自愿的；志愿的","en":"She does voluntary work at the hospital.","tr":"她在医院做志愿工作。","g":10},{"w":"estate","ph":"/ɪˈsteɪt/","pos":"n.","cn":"房地产；财产；庄园","en":"He owns a large estate in the countryside.","tr":"他在乡下拥有一大片庄园。","g":10},{"w":"economic","ph":"/ˌiːkəˈnɑːmɪk/","pos":"a.","cn":"经济的；经济学的","en":"The country is facing economic problems.","tr":"这个国家正面临经济问题。","g":10},{"w":"explode","ph":"/ɪkˈsploʊd/","pos":"v.","cn":"爆炸；爆发；激增","en":"The bomb exploded near the building.","tr":"炸弹在大楼附近爆炸了。","g":10},{"w":"origin","ph":"/ˈɔːrɪdʒɪn/","pos":"n.","cn":"起源；出身；由来","en":"The origin of the word is unknown.","tr":"这个词的起源是未知的。","g":10},{"w":"dimension","ph":"/daɪˈmenʃn/","pos":"n.","cn":"尺寸；维度；方面","en":"The room&#39;s dimensions are 10 by 12 feet.","tr":"房间的尺寸是10英尺乘以12英尺。","g":10},{"w":"upgrade","ph":"/ˌʌpˈɡreɪd/","pos":"v.","cn":"升级；提升","en":"We plan to upgrade the computer system.","tr":"我们计划升级计算机系统。","g":10},{"w":"organize","ph":"/ˈɔːrɡənaɪz/","pos":"v.","cn":"组织；安排；整理","en":"They organized a charity event.","tr":"他们组织了一次慈善活动。","g":10},{"w":"revise","ph":"/rɪˈvaɪz/","pos":"v.","cn":"修订；复习；校订","en":"She revised her essay before submitting.","tr":"她在提交前修改了她的论文。","g":10},{"w":"enthusiasm","ph":"/ɪnˈθuːziæzəm/","pos":"n.","cn":"热情；热忱","en":"He showed great enthusiasm for the project.","tr":"他对这个项目表现出了极大的热情。","g":10},{"w":"employment","ph":"/ɪmˈplɔɪmənt/","pos":"n.","cn":"就业；工作；使用","en":"The government aims to increase employment.","tr":"政府旨在增加就业。","g":10},{"w":"relevant","ph":"/ˈreləvənt/","pos":"a.","cn":"相关的；切题的","en":"Is this information relevant to the case?","tr":"这条信息与案件有关吗？","g":10},{"w":"abolish","ph":"/əˈbɑːlɪʃ/","pos":"v.","cn":"废除；取消","en":"Slavery was abolished in the 19th century.","tr":"19世纪废除了奴隶制。","g":10},{"w":"function","ph":"/ˈfʌŋkʃn/","pos":"n.","cn":"功能；作用；运行；起作用","en":"The main function of the heart is to pump blood.","tr":"心脏的主要功能是泵血。","g":10},{"w":"signal","ph":"/ˈsɪɡnəl/","pos":"n.","cn":"信号；发信号","en":"Traffic signals control the flow.","tr":"交通信号灯控制着交通流。","g":10},{"w":"institution","ph":"/ˌɪnstɪˈtuːʃn/","pos":"n.","cn":"机构；制度；建立","en":"Marriage is a social institution.","tr":"婚姻是一种社会制度。","g":10},{"w":"consequence","ph":"/ˈkɑːnsəkwens/","pos":"n.","cn":"后果；结果","en":"You must face the consequences of your actions.","tr":"你必须承担自己行为的后果。","g":10},{"w":"term","ph":"/tɜːrm/","pos":"n.","cn":"学期；术语；期限；条件","en":"The exam is at the end of the term.","tr":"考试在学期末举行。","g":10},{"w":"avoid","ph":"/əˈvɔɪd/","pos":"v.","cn":"避免；避开","en":"He tried to avoid eye contact.","tr":"他试图避免眼神接触。","g":10},{"w":"dominate","ph":"/ˈdɑːmɪneɪt/","pos":"v.","cn":"支配；占优势；俯视","en":"The company dominates the software market.","tr":"这家公司主导了软件市场。","g":10},{"w":"rob","ph":"/rɑːb/","pos":"v.","cn":"抢劫；剥夺","en":"They robbed the bank.","tr":"他们抢了银行。","g":10},{"w":"fashion","ph":"/ˈfæʃn/","pos":"n.","cn":"时尚；时装；方式","en":"She always follows the latest fashion.","tr":"她总是追随最新时尚。","g":10},{"w":"neglect","ph":"/nɪˈɡlekt/","pos":"v.","cn":"忽视；疏忽","en":"He neglected his studies.","tr":"他忽视了他的学业。","g":10},{"w":"teenager","ph":"/ˈtiːneɪdʒər/","pos":"n.","cn":"青少年","en":"The teenager spends too much time on social media.","tr":"青少年在社交媒体上花费了太多时间。","g":10},{"w":"target","ph":"/ˈtɑːrɡɪt/","pos":"n.","cn":"目标；靶子；对象","en":"Set achievable targets.","tr":"设定可实现的目标。","g":10},{"w":"exact","ph":"/ɪɡˈzækt/","pos":"a.","cn":"精确的；准确的；严谨的","en":"Do you know the exact time of arrival?","tr":"你知道确切的到达时间吗？","g":10},{"w":"fiction","ph":"/ˈfɪkʃn/","pos":"n.","cn":"小说；虚构的事","en":"She prefers reading science fiction.","tr":"她更喜欢阅读科幻小说。","g":10},{"w":"impress","ph":"/ɪmˈpres/","pos":"v.","cn":"给…留下深刻印象；使铭记","en":"Her performance impressed everyone.","tr":"她的表演让每个人都印象深刻。","g":10},{"w":"associate","ph":"/əˈsoʊsieɪt/","pos":"v.","cn":"联系；关联；合伙人","en":"People often associate success with money.","tr":"人们常常将成功与金钱联系在一起。","g":10},{"w":"campus","ph":"/ˈkæmpəs/","pos":"n.","cn":"校园","en":"The campus is beautiful in spring.","tr":"校园春天时非常美丽。","g":10},{"w":"import","ph":"/ˈɪmpɔːrt/","pos":"n.","cn":"进口；输入；进口商品","en":"The country imports coffee from Brazil.","tr":"该国从巴西进口咖啡。","g":10},{"w":"luggage","ph":"/ˈlʌɡɪdʒ/","pos":"n.","cn":"行李","en":"We collected our luggage at the airport.","tr":"我们在机场领取了行李。","g":10},{"w":"achieve","ph":"/əˈtʃiːv/","pos":"v.","cn":"实现；达到","en":"She achieved her goal of becoming a doctor.","tr":"她实现了成为医生的目标。","g":10},{"w":"client","ph":"/ˈklaɪənt/","pos":"n.","cn":"客户；委托人","en":"We need to satisfy our clients.","tr":"我们需要满足我们的客户。","g":10},{"w":"quote","ph":"/kwoʊt/","pos":"v.","cn":"引用；报价","en":"She quoted a famous author.","tr":"她引用了一位著名作家的话。","g":10},{"w":"eventually","ph":"/ɪˈventʃuəli/","pos":"ad.","cn":"最终；终于","en":"After many delays, the flight eventually took off.","tr":"经过多次延迟，飞机最终起飞了。","g":10},{"w":"junior","ph":"/ˈdʒuːniər/","pos":"a.","cn":"年少的；下级的；三年级学生","en":"He is junior to me by two years.","tr":"他比我小两岁。","g":10},{"w":"bacteria","ph":"/bækˈtɪriə/","pos":"n.","cn":"细菌","en":"Bacteria can cause disease.","tr":"细菌可以引起疾病。","g":10},{"w":"boom","ph":"/buːm/","pos":"n.","cn":"繁荣；激增；轰鸣","en":"The economy is booming.","tr":"经济正在蓬勃发展。","g":10},{"w":"wage","ph":"/weɪdʒ/","pos":"n.","cn":"工资；薪水","en":"The minimum wage should be increased.","tr":"最低工资应该提高。","g":10},{"w":"aircraft","ph":"/ˈerkræft/","pos":"n.","cn":"飞机；航空器","en":"The aircraft took off on time.","tr":"飞机准时起飞。","g":10},{"w":"controversial","ph":"/ˌkɑːntrəˈvɜːrʃl/","pos":"a.","cn":"有争议的","en":"The issue of abortion is controversial.","tr":"堕胎问题是有争议的。","g":10},{"w":"audience","ph":"/ˈɔːdiəns/","pos":"n.","cn":"观众；听众；读者","en":"The audience applauded loudly.","tr":"观众热烈鼓掌。","g":10},{"w":"readily","ph":"/ˈredɪli/","pos":"ad.","cn":"容易地；乐意地","en":"She readily agreed to help.","tr":"她很乐意帮忙。","g":10},{"w":"exception","ph":"/ɪkˈsepʃn/","pos":"n.","cn":"例外；除外","en":"There is no rule without an exception.","tr":"没有不破例的规则。","g":10},{"w":"permit","ph":"/pərˈmɪt/","pos":"v.","cn":"允许；许可；许可证","en":"Smoking is not permitted here.","tr":"这里不允许吸烟。","g":10},{"w":"contrast","ph":"/ˈkɑːntræst/","pos":"n.","cn":"对比；对照；差异","en":"The contrast between the two pictures is striking.","tr":"两张图片之间的对比是惊人的。","g":10},{"w":"section","ph":"/ˈsekʃn/","pos":"n.","cn":"部分；部门；章节","en":"Read the sports section of the newspaper.","tr":"阅读报纸上的体育版块。","g":10},{"w":"aggressive","ph":"/əˈɡresɪv/","pos":"a.","cn":"侵略的；好斗的；积极的","en":"The dog became aggressive when threatened.","tr":"当狗受到威胁时，它会变得具有攻击性。","g":10},{"w":"hostile","ph":"/ˈhɑːstl/","pos":"a.","cn":"敌对的；敌意的","en":"The two countries have hostile relations.","tr":"这两个国家关系敌对。","g":10},{"w":"agenda","ph":"/əˈdʒendə/","pos":"n.","cn":"议程；日程","en":"The agenda for the meeting was set.","tr":"会议的议程已经设定。","g":10},{"w":"magnetic","ph":"/mæɡˈnetɪk/","pos":"a.","cn":"磁的；有吸引力的","en":"He has a magnetic personality.","tr":"他有着磁性的个性。","g":10},{"w":"alliance","ph":"/əˈlaɪəns/","pos":"n.","cn":"联盟；同盟","en":"The two countries formed an alliance.","tr":"两国形成了联盟。","g":10},{"w":"pause","ph":"/pɔːz/","pos":"v.","cn":"暂停；停顿","en":"She paused to catch her breath.","tr":"她停下来喘了口气。","g":10},{"w":"grace","ph":"/ɡreɪs/","pos":"n.","cn":"优雅；体面；恩惠","en":"She danced with grace.","tr":"她舞姿优雅。","g":10},{"w":"lest","ph":"/lest/","pos":"conj.","cn":"唯恐；以免","en":"He ran fast lest he should miss the bus.","tr":"他跑得很快，以免错过公交车。","g":10},{"w":"precaution","ph":"/prɪˈkɔːʃn/","pos":"n.","cn":"预防；警惕；防范","en":"Take precautions against fire.","tr":"要防火灾采取预防措施。","g":10},{"w":"seek","ph":"/siːk/","pos":"v.","cn":"寻找；寻求；试图","en":"They are seeking a solution.","tr":"他们正在寻找解决方案。","g":10},{"w":"invade","ph":"/ɪnˈveɪd/","pos":"v.","cn":"入侵；侵略；涌入","en":"The enemy invaded the country.","tr":"敌人入侵了这个国家。","g":11},{"w":"seize","ph":"/siːz/","pos":"v.","cn":"抓住；夺取；没收","en":"The police seized the stolen goods.","tr":"警察没收了被盗的物品。","g":11},{"w":"interval","ph":"/ˈɪntərvl/","pos":"n.","cn":"间隔；休息时间；间距","en":"There will be a 20-minute interval.","tr":"将有20分钟的间隔。","g":11},{"w":"column","ph":"/ˈkɑːləm/","pos":"n.","cn":"柱；专栏；纵队","en":"She writes a weekly column for the paper.","tr":"她为报纸撰写每周专栏。","g":11},{"w":"tour","ph":"/tʊr/","pos":"n.","cn":"旅行；游览；巡回","en":"They took a tour of the city.","tr":"他们参观了这座城市的旅行。","g":11},{"w":"solution","ph":"/səˈluːʃn/","pos":"n.","cn":"解决方案；溶液","en":"We need to find a solution to the problem.","tr":"我们需要找到解决问题的办法。","g":11},{"w":"ambulance","ph":"/ˈæmbjələns/","pos":"n.","cn":"救护车","en":"Call an ambulance!","tr":"叫救护车！","g":11},{"w":"dispute","ph":"/dɪˈspjuːt/","pos":"n.","cn":"争论；争端","en":"There is a dispute over the ownership.","tr":"所有权存在争议。","g":11},{"w":"apparent","ph":"/əˈpærənt/","pos":"a.","cn":"明显的；表面上的","en":"It became apparent that he was lying.","tr":"很明显他在撒谎。","g":11},{"w":"recognition","ph":"/ˌrekəɡˈnɪʃn/","pos":"n.","cn":"承认；认出；赞誉","en":"She received recognition for her work.","tr":"她因工作得到了认可。","g":11},{"w":"preserve","ph":"/prɪˈzɜːrv/","pos":"v.","cn":"保存；保护；维持","en":"We must preserve the environment.","tr":"我们必须保护环境。","g":11},{"w":"witness","ph":"/ˈwɪtnəs/","pos":"n.","cn":"目击者；证人；目击","en":"He witnessed the accident.","tr":"他目睹了那场事故。","g":11},{"w":"engine","ph":"/ˈendʒɪn/","pos":"n.","cn":"引擎；发动机；火车头","en":"The car has a powerful engine.","tr":"这辆车有一个强大的引擎。","g":11},{"w":"revolt","ph":"/rɪˈvoʊlt/","pos":"n.","cn":"叛乱；反抗；使厌恶","en":"The people revolted against the dictator.","tr":"人民反抗了独裁者。","g":11},{"w":"remedy","ph":"/ˈremədi/","pos":"n.","cn":"补救；治疗法；药物","en":"The best remedy for a cold is rest.","tr":"治疗感冒最好的方法是休息。","g":11},{"w":"factor","ph":"/ˈfæktər/","pos":"n.","cn":"因素；要素；系数","en":"Hard work is a key factor in success.","tr":"努力工作是成功的关键因素。","g":11},{"w":"due","ph":"/duː/","pos":"a.","cn":"到期的；由于；预期的","en":"The assignment is due next Monday.","tr":"作业下周一截止。","g":11},{"w":"custom","ph":"/ˈkʌstəm/","pos":"n.","cn":"风俗；习惯；海关","en":"It is a local custom to celebrate this day.","tr":"庆祝这一天是当地的习俗。","g":11},{"w":"engineering","ph":"/ˌendʒɪˈnɪrɪŋ/","pos":"n.","cn":"工程；工程学","en":"She studies civil engineering.","tr":"她学习土木工程。","g":11},{"w":"convenience","ph":"/kənˈviːniəns/","pos":"n.","cn":"方便；便利","en":"For convenience, we live near the station.","tr":"为了方便，我们住在靠近车站的地方。","g":11},{"w":"profit","ph":"/ˈprɑːfɪt/","pos":"n.","cn":"利润；利益","en":"The company made a huge profit.","tr":"公司获得了巨大的利润。","g":11},{"w":"safe","ph":"/seɪf/","pos":"a.","cn":"安全的；平安的","en":"Is the water safe to drink?","tr":"水可以安全饮用吗？","g":11},{"w":"honorable","ph":"/ˈɑːnərəbl/","pos":"a.","cn":"光荣的；可敬的","en":"He is an honorable man.","tr":"他是个值得尊敬的人。","g":11},{"w":"justice","ph":"/ˈdʒʌstɪs/","pos":"n.","cn":"正义；公正；司法","en":"We demand justice.","tr":"我们要求正义。","g":11},{"w":"amaze","ph":"/əˈmeɪz/","pos":"v.","cn":"使惊奇；使惊愕","en":"Her performance amazed the audience.","tr":"她的表演让观众惊叹。","g":11},{"w":"account","ph":"/əˈkaʊnt/","pos":"n.","cn":"账户；解释；占…比例","en":"He opened a bank account.","tr":"他开了一个银行账户。","g":11},{"w":"parallel","ph":"/ˈpærəlel/","pos":"a.","cn":"平行的；相似的；平行线","en":"The road runs parallel to the river.","tr":"这条路与河平行。","g":11},{"w":"disabled","ph":"/dɪsˈeɪbld/","pos":"a.","cn":"残疾的；有缺陷的","en":"The building has access for disabled people.","tr":"这座建筑为残疾人提供了通道。","g":11},{"w":"effort","ph":"/ˈefərt/","pos":"n.","cn":"努力；成就；费力的事","en":"He made a great effort to finish on time.","tr":"他努力按时完成。","g":11},{"w":"entitle","ph":"/ɪnˈtaɪtl/","pos":"v.","cn":"给…权利；给…命名","en":"This ticket entitles you to a free drink.","tr":"这张票可免费享用一杯饮料。","g":11},{"w":"utilize","ph":"/ˈjuːtəlaɪz/","pos":"v.","cn":"利用；使用","en":"We should utilize solar energy more.","tr":"我们应该更多地利用太阳能。","g":11},{"w":"nutrition","ph":"/nuˈtrɪʃn/","pos":"n.","cn":"营养；营养学","en":"Good nutrition is essential for health.","tr":"良好的营养对健康至关重要。","g":11},{"w":"suppose","ph":"/səˈpoʊz/","pos":"v.","cn":"猜想；假设；认为","en":"I suppose you&#39;re right.","tr":"我认为你是对的。","g":11},{"w":"apart","ph":"/əˈpɑːrt/","pos":"ad.","cn":"分开地；相距","en":"The two houses are 10 miles apart.","tr":"这两栋房子相隔10英里。","g":11},{"w":"sample","ph":"/ˈsæmpl/","pos":"n.","cn":"样品；样本","en":"They took a water sample for testing.","tr":"他们取了水样进行测试。","g":11},{"w":"concern","ph":"/kənˈsɜːrn/","pos":"n.","cn":"关心；担忧；涉及","en":"The main concern is safety.","tr":"主要关注的是安全问题。","g":11},{"w":"equal","ph":"/ˈiːkwəl/","pos":"a.","cn":"相等的；平等的；等于","en":"Divide the cake into equal parts.","tr":"将蛋糕切成等份。","g":11},{"w":"democracy","ph":"/dɪˈmɑːkrəsi/","pos":"n.","cn":"民主；民主制度","en":"Democracy allows citizens to vote for their leaders.","tr":"民主允许公民为他们的领导人投票。","g":11},{"w":"retail","ph":"/ˈriːteɪl/","pos":"n.","cn":"零售","en":"She works in the retail industry.","tr":"她在零售行业工作。","g":11},{"w":"trigger","ph":"/ˈtrɪɡər/","pos":"v.","cn":"触发；引发；扳机","en":"Stress can trigger health problems.","tr":"压力可以引发健康问题。","g":11},{"w":"pace","ph":"/peɪs/","pos":"n.","cn":"步伐；速度；踱步","en":"He walked at a fast pace.","tr":"他走得很快。","g":11},{"w":"suffer","ph":"/ˈsʌfər/","pos":"v.","cn":"遭受；忍受；受苦","en":"He suffered from a headache.","tr":"他头疼。","g":11},{"w":"chart","ph":"/tʃɑːrt/","pos":"n.","cn":"图表；海图","en":"The chart shows the sales growth.","tr":"图表显示了销售增长。","g":11},{"w":"advertise","ph":"/ˈædvərtaɪz/","pos":"v.","cn":"做广告；宣传","en":"The company advertised its products online.","tr":"公司在网上对其产品进行了广告宣传。","g":11},{"w":"reward","ph":"/rɪˈwɔːrd/","pos":"n.","cn":"奖励；回报；报酬","en":"He received a cash reward.","tr":"他收到了一笔现金奖励。","g":11},{"w":"memorial","ph":"/məˈmɔːriəl/","pos":"a.","cn":"纪念的；纪念碑","en":"A memorial service was held for the victims.","tr":"为受害者举行了追悼会。","g":11},{"w":"invent","ph":"/ɪnˈvent/","pos":"v.","cn":"发明；创造；编造","en":"Who invented the telephone?","tr":"谁发明了电话？","g":11},{"w":"definite","ph":"/ˈdefɪnət/","pos":"a.","cn":"明确的；确定的；一定的","en":"We need a definite date for the meeting.","tr":"我们需要一个确切的会议日期。","g":11},{"w":"intimate","ph":"/ˈɪntɪmət/","pos":"a.","cn":"亲密的；私人的","en":"They have an intimate relationship.","tr":"他们有亲密的关系。","g":11},{"w":"council","ph":"/ˈkaʊnsl/","pos":"n.","cn":"委员会；理事会；议会","en":"The city council approved the plan.","tr":"市政会批准了该计划。","g":11},{"w":"literary","ph":"/ˈlɪtəreri/","pos":"a.","cn":"文学的；书面的","en":"She won a literary award.","tr":"她赢得了一个文学奖。","g":11},{"w":"plug","ph":"/plʌɡ/","pos":"n.","cn":"插头；塞子；插入","en":"Can you plug in the printer?","tr":"你能插上打印机吗？","g":11},{"w":"refine","ph":"/rɪˈfaɪn/","pos":"v.","cn":"精炼；改进；使文雅","en":"Oil is refined to make petrol.","tr":"石油被提炼成汽油。","g":11},{"w":"threaten","ph":"/ˈθretn/","pos":"v.","cn":"威胁；危及；预示","en":"He threatened to resign.","tr":"他威胁要辞职。","g":11},{"w":"senior","ph":"/ˈsiːniər/","pos":"a.","cn":"年长的；高级的；上级","en":"He is a senior manager.","tr":"他是一名高级经理。","g":11},{"w":"proposal","ph":"/prəˈpoʊzl/","pos":"n.","cn":"提议；建议；求婚","en":"The proposal was accepted by the committee.","tr":"提案被委员会接受。","g":11},{"w":"inquire","ph":"/ɪnˈkwaɪər/","pos":"v.","cn":"询问；调查","en":"I&#39;m calling to inquire about the job.","tr":"我打电话是想询问工作的事。","g":11},{"w":"assign","ph":"/əˈsaɪn/","pos":"v.","cn":"分配；指派；指定","en":"The teacher assigned homework.","tr":"老师布置了家庭作业。","g":11},{"w":"champion","ph":"/ˈtʃæmpiən/","pos":"n.","cn":"冠军；拥护者","en":"She became the world champion.","tr":"她成为了世界冠军。","g":11},{"w":"grab","ph":"/ɡræb/","pos":"v.","cn":"抓住；攫取；匆忙地拿","en":"He grabbed his bag and ran out.","tr":"他抓起包就跑了出去。","g":11},{"w":"minor","ph":"/ˈmaɪnər/","pos":"a.","cn":"较小的；次要的；未成年人","en":"It&#39;s a minor problem.","tr":"这是个小问题。","g":11},{"w":"celebrate","ph":"/ˈselɪbreɪt/","pos":"v.","cn":"庆祝；赞美","en":"We celebrated her birthday with a party.","tr":"我们举办了一个派对来庆祝她的生日。","g":11},{"w":"insert","ph":"/ɪnˈsɜːrt/","pos":"v.","cn":"插入；嵌入","en":"Insert the card into the machine.","tr":"请将卡片插入机器。","g":11},{"w":"globe","ph":"/ɡloʊb/","pos":"n.","cn":"地球；世界；球体","en":"The internet connects people across the globe.","tr":"#VALUE!","g":11},{"w":"fascinating","ph":"/ˈfæsɪneɪtɪŋ/","pos":"a.","cn":"迷人的；极有吸引力的","en":"The documentary was absolutely fascinating.","tr":"这部纪录片绝对引人入胜。","g":11},{"w":"react","ph":"/riˈækt/","pos":"v.","cn":"反应；回应；起化学反应","en":"How did he react to the news?","tr":"他对这则新闻有何反应？","g":11},{"w":"rally","ph":"/ˈræli/","pos":"v.","cn":"集合；恢复；拉力赛","en":"The president addressed a rally.","tr":"总统向集会发表了演讲。","g":11},{"w":"fraction","ph":"/ˈfrækʃn/","pos":"n.","cn":"小部分；分数","en":"Only a fraction of the population voted.","tr":"只有少数人参与了投票。","g":11},{"w":"ban","ph":"/bæn/","pos":"v.","cn":"禁止；禁令","en":"The government decided to ban smoking.","tr":"政府决定禁止吸烟。","g":11},{"w":"schedule","ph":"/ˈskedʒuːl/","pos":"n.","cn":"时间表；日程；安排","en":"The meeting is scheduled for 10 a.m.","tr":"会议定于上午10点举行。","g":11},{"w":"fold","ph":"/foʊld/","pos":"v.","cn":"折叠；合拢","en":"She folded the letter and put it in an envelope.","tr":"她把信折好放进信封。","g":11},{"w":"fundamental","ph":"/ˌfʌndəˈmentl/","pos":"a.","cn":"基本的；根本的；重要的","en":"This is a fundamental principle of physics.","tr":"这是物理学的一个基本原理。","g":11},{"w":"mutual","ph":"/ˈmjuːtʃuəl/","pos":"a.","cn":"相互的；共同的；彼此的","en":"The feeling is mutual.","tr":"感觉是相互的。","g":11},{"w":"holy","ph":"/ˈhoʊli/","pos":"a.","cn":"神圣的；圣洁的","en":"Jerusalem is a holy city.","tr":"耶路撒冷是一座圣城。","g":11},{"w":"surprise","ph":"/sərˈpraɪz/","pos":"n.","cn":"惊喜；惊讶；使惊奇","en":"What a pleasant surprise!","tr":"真是个令人愉快的惊喜！","g":11},{"w":"achievement","ph":"/əˈtʃiːvmənt/","pos":"n.","cn":"成就；成绩","en":"Winning the award was a great achievement.","tr":"获得这个奖项是一个巨大的成就。","g":11},{"w":"season","ph":"/ˈsiːzn/","pos":"n.","cn":"季节；赛季","en":"Autumn is my favorite season.","tr":"秋天是我最喜欢的季节。","g":11},{"w":"temporary","ph":"/ˈtempəreri/","pos":"a.","cn":"暂时的；临时的","en":"This is just a temporary solution.","tr":"这只是个临时解决方案。","g":11},{"w":"dramatic","ph":"/drəˈmætɪk/","pos":"a.","cn":"戏剧性的；巨大的；引人注目的","en":"There was a dramatic increase in prices.","tr":"价格戏剧性地上涨了。","g":11},{"w":"enable","ph":"/ɪˈneɪbl/","pos":"v.","cn":"使能够；使成为可能","en":"The scholarship enabled her to attend college.","tr":"奖学金使她能够上大学。","g":11},{"w":"sharp","ph":"/ʃɑːrp/","pos":"a.","cn":"锋利的；敏锐的；急剧的","en":"Be careful, the knife is sharp.","tr":"小心，刀很锋利。","g":12},{"w":"assemble","ph":"/əˈsembl/","pos":"v.","cn":"集合；组装；聚集","en":"The students assembled in the hall.","tr":"学生们在大厅里聚集。","g":12},{"w":"crime","ph":"/kraɪm/","pos":"n.","cn":"犯罪；罪行","en":"The crime rate has fallen.","tr":"犯罪率已经下降。","g":12},{"w":"jury","ph":"/ˈdʒʊri/","pos":"n.","cn":"陪审团；评判委员会","en":"The jury found him guilty.","tr":"陪审团裁定他有罪。","g":12},{"w":"southern","ph":"/ˈsʌðərn/","pos":"a.","cn":"南方的；南部的","en":"She lives in the southern part of the country.","tr":"她住在国家的南部地区。","g":12},{"w":"counter","ph":"/ˈkaʊntər/","pos":"n.","cn":"柜台；计数器；反驳","en":"She paid at the checkout counter.","tr":"她在收银台付了款。","g":12},{"w":"blog","ph":"/blɑːɡ/","pos":"n.","cn":"博客；网络日志","en":"He writes a blog about cooking.","tr":"他写了一个关于烹饪的博客。","g":12},{"w":"incident","ph":"/ˈɪnsɪdənt/","pos":"n.","cn":"事件；事变；冲突","en":"The incident was reported to the police.","tr":"该事件已经报告给警方。","g":12},{"w":"heal","ph":"/hiːl/","pos":"v.","cn":"治愈；痊愈；和解","en":"The wound is healing slowly.","tr":"伤口愈合得很慢。","g":12},{"w":"bore","ph":"/bɔːr/","pos":"v.","cn":"使厌烦；钻孔","en":"The lecture bored me.","tr":"这场讲座让我感到无聊。","g":12},{"w":"volcano","ph":"/vɑːlˈkeɪnoʊ/","pos":"n.","cn":"火山","en":"The volcano erupted last year.","tr":"去年火山爆发了。","g":12},{"w":"communicate","ph":"/kəˈmjuːnɪkeɪt/","pos":"v.","cn":"交流；沟通；传达","en":"We communicate by email.","tr":"我们通过电子邮件进行沟通。","g":12},{"w":"interfere","ph":"/ˌɪntərˈfɪr/","pos":"v.","cn":"干涉；干预；妨碍","en":"Don&#39;t interfere in other people&#39;s business.","tr":"不要干涉别人的私事。","g":12},{"w":"besides","ph":"/bɪˈsaɪdz/","pos":"prep.","cn":"除...之外；而且","en":"Besides English, she speaks French.","tr":"除了英语，她还会说法语。","g":12},{"w":"hazard","ph":"/ˈhæzərd/","pos":"n.","cn":"危险；危害","en":"Smoking is a health hazard.","tr":"吸烟是一种健康危害。","g":12},{"w":"postpone","ph":"/poʊˈspoʊn/","pos":"v.","cn":"推迟；延期","en":"They postponed the meeting until next week.","tr":"他们将会议推迟到下周。","g":12},{"w":"charity","ph":"/ˈtʃærəti/","pos":"n.","cn":"慈善；慈善机构","en":"She donates money to charity.","tr":"她向慈善机构捐款。","g":12},{"w":"cancer","ph":"/ˈkænsər/","pos":"n.","cn":"癌症","en":"She died of lung cancer.","tr":"她因肺癌去世。","g":12},{"w":"temper","ph":"/ˈtempər/","pos":"n.","cn":"脾气；情绪；韧度","en":"He lost his temper.","tr":"他发脾气了。","g":12},{"w":"conference","ph":"/ˈkɑːnfərəns/","pos":"n.","cn":"会议；讨论会","en":"She attended a conference on climate change.","tr":"她参加了一个关于气候变化的会议。","g":12},{"w":"flame","ph":"/fleɪm/","pos":"n.","cn":"火焰；热情","en":"The flames spread quickly through the building.","tr":"火焰迅速在建筑物中蔓延。","g":12},{"w":"rank","ph":"/ræŋk/","pos":"n.","cn":"等级；排名；排列","en":"He holds the rank of captain.","tr":"他的军衔是上尉。","g":12},{"w":"distinguish","ph":"/dɪˈstɪŋɡwɪʃ/","pos":"v.","cn":"区分；辨别；使杰出","en":"It is hard to distinguish between the twins.","tr":"很难区分这对双胞胎。","g":12},{"w":"curriculum","ph":"/kəˈrɪkjələm/","pos":"n.","cn":"课程；全部课程","en":"The school has a broad curriculum.","tr":"学校有广泛的课程。","g":12},{"w":"elderly","ph":"/ˈeldərli/","pos":"a.","cn":"上了年纪的；年长的","en":"The elderly man walked slowly.","tr":"那位老人慢慢地走着。","g":12},{"w":"condition","ph":"/kənˈdɪʃn/","pos":"n.","cn":"条件；状况；环境","en":"The car is in good condition.","tr":"这辆车状况良好。","g":12},{"w":"scholar","ph":"/ˈskɑːlər/","pos":"n.","cn":"学者","en":"He is a well-known scholar.","tr":"他是一位知名学者。","g":12},{"w":"landscape","ph":"/ˈlændskeɪp/","pos":"n.","cn":"风景；景色；景观","en":"The landscape was beautiful in the autumn.","tr":"秋天的风景很美。","g":12},{"w":"neutral","ph":"/ˈnuːtrəl/","pos":"a.","cn":"中立的；中性的","en":"Switzerland remained neutral during the war.","tr":"瑞士在战争期间保持中立。","g":12},{"w":"prospect","ph":"/ˈprɑːspekt/","pos":"n.","cn":"前景；可能性；景色","en":"The job has good prospects.","tr":"这项工作前景很好。","g":12},{"w":"connect","ph":"/kəˈnekt/","pos":"v.","cn":"连接；联系；接通","en":"The printer is connected to the computer.","tr":"打印机已连接到电脑。","g":12},{"w":"administration","ph":"/ədˌmɪnɪˈstreɪʃn/","pos":"n.","cn":"管理；行政；当局","en":"The school administration made the decision.","tr":"学校管理层做出了决定。","g":12},{"w":"obstacle","ph":"/ˈɑːbstəkl/","pos":"n.","cn":"障碍；妨碍；障碍物","en":"Lack of money is a major obstacle.","tr":"缺钱是一个主要障碍。","g":12},{"w":"component","ph":"/kəmˈpoʊnənt/","pos":"n.","cn":"组成部分；部件","en":"Trust is a key component of a relationship.","tr":"信任是关系中的关键要素。","g":12},{"w":"religion","ph":"/rɪˈlɪdʒən/","pos":"n.","cn":"宗教；信仰","en":"Everyone has the right to freedom of religion.","tr":"每个人都有宗教自由的权利。","g":12},{"w":"bomb","ph":"/bɑːm/","pos":"n.","cn":"炸弹；轰炸","en":"The bomb exploded near the market.","tr":"炸弹在市场附近爆炸了。","g":12},{"w":"transfer","ph":"/trænsˈfɜːr/","pos":"v.","cn":"转移；调动；转乘","en":"He transferred to another department.","tr":"他转到了另一个部门。","g":12},{"w":"capable","ph":"/ˈkeɪpəbl/","pos":"a.","cn":"有能力的；能干的","en":"He is capable of solving the problem.","tr":"他有能力解决这个问题。","g":12},{"w":"parade","ph":"/pəˈreɪd/","pos":"n.","cn":"游行；检阅","en":"The victory parade lasted for hours.","tr":"胜利游行持续了数小时。","g":12},{"w":"financial","ph":"/faɪˈnænʃl/","pos":"a.","cn":"金融的；财政的；财务的","en":"She gave me some financial advice.","tr":"她给了我一些建议。","g":12},{"w":"approve","ph":"/əˈpruːv/","pos":"v.","cn":"赞成；批准","en":"The committee approved the budget.","tr":"委员会批准了预算。","g":12},{"w":"suggest","ph":"/səˈdʒest/","pos":"v.","cn":"建议；暗示；表明","en":"I suggest we go by train.","tr":"我建议我们乘火车去。","g":12},{"w":"evident","ph":"/ˈevɪdənt/","pos":"a.","cn":"明显的；明白的","en":"It is evident that he is not happy.","tr":"很明显他并不高兴。","g":12},{"w":"diagram","ph":"/ˈdaɪəɡræm/","pos":"n.","cn":"图表；简图","en":"The teacher drew a diagram on the board.","tr":"老师在黑板上画了一个图表。","g":12},{"w":"channel","ph":"/ˈtʃænl/","pos":"n.","cn":"频道；渠道；海峡","en":"What&#39;s on the other channel?","tr":"另一个频道上有什么节目？","g":12},{"w":"prosperity","ph":"/prɑːˈsperəti/","pos":"n.","cn":"繁荣；兴旺","en":"We wish you health and prosperity.","tr":"我们祝你健康和繁荣。","g":12},{"w":"reliable","ph":"/rɪˈlaɪəbl/","pos":"a.","cn":"可靠的；可信赖的","en":"He is a reliable friend.","tr":"他是一个可靠的朋友。","g":12},{"w":"mount","ph":"/maʊnt/","pos":"v.","cn":"登上；安装；增加；山","en":"He mounted his horse.","tr":"他骑上了他的马。","g":12},{"w":"commercial","ph":"/kəˈmɜːrʃl/","pos":"a.","cn":"商业的；广告","en":"The commercial was very funny.","tr":"广告非常有趣。","g":12},{"w":"destroy","ph":"/dɪˈstrɔɪ/","pos":"v.","cn":"破坏；毁坏；消灭","en":"The fire destroyed the old factory.","tr":"火灾摧毁了旧工厂。","g":12},{"w":"bounce","ph":"/baʊns/","pos":"v.","cn":"弹跳；反弹","en":"The ball bounced high.","tr":"球弹得很高。","g":12},{"w":"conduct","ph":"/kənˈdʌkt/","pos":"v.","cn":"实施；行为；指挥","en":"They conducted a survey.","tr":"他们进行了一项调查。","g":12},{"w":"examine","ph":"/ɪɡˈzæmɪn/","pos":"v.","cn":"检查；考试；细查","en":"The doctor examined the patient carefully.","tr":"医生仔细检查了病人。","g":12},{"w":"forest","ph":"/ˈfɔːrɪst/","pos":"n.","cn":"森林；林木","en":"They got lost in the forest.","tr":"他们在森林里迷路了。","g":12},{"w":"entertainment","ph":"/ˌentərˈteɪnmənt/","pos":"n.","cn":"娱乐；消遣；款待","en":"Television is a popular form of entertainment.","tr":"电视是一种流行的娱乐方式。","g":12},{"w":"layout","ph":"/ˈleɪaʊt/","pos":"n.","cn":"布局；设计；安排","en":"The layout of the website is user-friendly.","tr":"网站的布局对用户友好。","g":12},{"w":"contact","ph":"/ˈkɑːntækt/","pos":"n.","cn":"联系；接触；熟人","en":"Keep in contact with your friends.","tr":"保持与朋友的联系。","g":12},{"w":"reputation","ph":"/ˌrepjuˈteɪʃn/","pos":"n.","cn":"名声；名誉","en":"The company has a good reputation.","tr":"公司声誉良好。","g":12},{"w":"delete","ph":"/dɪˈliːt/","pos":"v.","cn":"删除；清除","en":"Please delete the file from the computer.","tr":"请从电脑上删除该文件。","g":12},{"w":"device","ph":"/dɪˈvaɪs/","pos":"n.","cn":"装置；设备；手段","en":"The device can translate speech into text.","tr":"该设备可以将语音转换为文本。","g":12},{"w":"recreation","ph":"/ˌrekriˈeɪʃn/","pos":"n.","cn":"娱乐；消遣","en":"Walking is her favorite form of recreation.","tr":"散步是她最喜欢的休闲方式。","g":12},{"w":"worthy","ph":"/ˈwɜːrði/","pos":"a.","cn":"值得的；有价值的；配得上的","en":"The charity is a worthy cause.","tr":"这项慈善事业是值得的。","g":12},{"w":"fatal","ph":"/ˈfeɪtl/","pos":"a.","cn":"致命的；毁灭性的","en":"The accident proved fatal.","tr":"这次事故被证明是致命的。","g":12},{"w":"lung","ph":"/lʌŋ/","pos":"n.","cn":"肺","en":"Smoking can cause lung cancer.","tr":"吸烟可能导致肺癌。","g":12},{"w":"document","ph":"/ˈdɑːkjumənt/","pos":"n.","cn":"文件；文档","en":"Please sign the document at the bottom.","tr":"请在文档底部签名。","g":12},{"w":"screen","ph":"/skriːn/","pos":"n.","cn":"屏幕；银幕；屏风","en":"She spends all day staring at a computer screen.","tr":"她整天盯着电脑屏幕。","g":12},{"w":"aboard","ph":"/əˈbɔːrd/","pos":"ad.","cn":"在船上；上船","en":"All passengers aboard the flight were safe.","tr":"飞行中的所有乘客都是安全的。","g":12},{"w":"recession","ph":"/rɪˈseʃn/","pos":"n.","cn":"经济衰退；退后","en":"The economy is in recession.","tr":"经济正在衰退。","g":12},{"w":"edition","ph":"/ɪˈdɪʃn/","pos":"n.","cn":"版本；版次","en":"The first edition of the book sold out quickly.","tr":"这本书的第一版很快售罄。","g":12},{"w":"decorate","ph":"/ˈdekəreɪt/","pos":"v.","cn":"装饰；装潢；授勋","en":"They decorated the room with balloons.","tr":"他们用气球装饰了房间。","g":12},{"w":"invisible","ph":"/ɪnˈvɪzəbl/","pos":"a.","cn":"看不见的；无形的","en":"The bacteria are invisible to the naked eye.","tr":"细菌用肉眼是看不见的。","g":12},{"w":"negative","ph":"/ˈneɡətɪv/","pos":"a.","cn":"消极的；否定的；负面的","en":"Don&#39;t be so negative about everything.","tr":"不要对一切都这么消极。","g":12},{"w":"gradual","ph":"/ˈɡrædʒuəl/","pos":"a.","cn":"逐渐的；渐进的","en":"There has been a gradual improvement.","tr":"已经逐渐有所改善。","g":12},{"w":"revolution","ph":"/ˌrevəˈluːʃn/","pos":"n.","cn":"革命；巨变；旋转","en":"The Industrial Revolution changed society.","tr":"工业革命改变了社会。","g":12},{"w":"reinforce","ph":"/ˌriːɪnˈfɔːrs/","pos":"v.","cn":"加强；增援；加固","en":"The walls were reinforced with steel.","tr":"墙壁被加固了钢。","g":12},{"w":"evolution","ph":"/ˌevəˈluːʃn/","pos":"n.","cn":"进化；演变；发展","en":"Darwin&#39;s theory of evolution changed science.","tr":"达尔文的进化论改变了科学。","g":12},{"w":"giant","ph":"/ˈdʒaɪənt/","pos":"a.","cn":"巨大的；巨人","en":"The company is a giant in the industry.","tr":"#VALUE!","g":12},{"w":"chief","ph":"/tʃiːf/","pos":"a.","cn":"主要的；首领","en":"The chief problem is lack of time.","tr":"主要问题是缺乏时间。","g":12},{"w":"feature","ph":"/ˈfiːtʃər/","pos":"n.","cn":"特征；特点；以…为特色","en":"The new phone has many advanced features.","tr":"新手机有很多先进功能。","g":12},{"w":"stick","ph":"/stɪk/","pos":"v.","cn":"粘；刺；坚持；棍","en":"Stick the stamp on the envelope.","tr":"把邮票贴在信封上。","g":12},{"w":"technology","ph":"/tekˈnɑːlədʒi/","pos":"n.","cn":"技术；科技","en":"Modern technology has changed our lives.","tr":"现代科技改变了我们的生活。","g":13},{"w":"vary","ph":"/ˈveri/","pos":"v.","cn":"变化；改变；使不同","en":"Prices vary according to the season.","tr":"价格根据季节有所不同。","g":13},{"w":"standard","ph":"/ˈstændərd/","pos":"n.","cn":"标准；水平；标准的","en":"The hotel is of a high standard.","tr":"这家酒店的标准很高。","g":13},{"w":"executive","ph":"/ɪɡˈzekjətɪv/","pos":"n.","cn":"执行官；行政的；管理的","en":"She is a senior executive in the company.","tr":"她在公司是一名高级管理人员。","g":13},{"w":"pulse","ph":"/pʌls/","pos":"n.","cn":"脉搏；脉冲","en":"The doctor checked his pulse.","tr":"医生检查了他的脉搏。","g":13},{"w":"plague","ph":"/pleɪɡ/","pos":"n.","cn":"瘟疫；困扰","en":"The country was hit by a plague.","tr":"这个国家遭受了瘟疫的袭击。","g":13},{"w":"machine","ph":"/məˈʃiːn/","pos":"n.","cn":"机器；机械","en":"The machine is out of order.","tr":"机器出现故障。","g":13},{"w":"depart","ph":"/dɪˈpɑːrt/","pos":"v.","cn":"离开；出发","en":"The train departs at noon.","tr":"火车中午出发。","g":13},{"w":"strategy","ph":"/ˈstrætədʒi/","pos":"n.","cn":"战略；策略","en":"We need a new marketing strategy.","tr":"我们需要一个新的营销策略。","g":13},{"w":"edit","ph":"/ˈedɪt/","pos":"v.","cn":"编辑；剪辑","en":"She edited her essay before handing it in.","tr":"她在提交前编辑了她的论文。","g":13},{"w":"formal","ph":"/ˈfɔːrml/","pos":"a.","cn":"正式的；正规的；形式上的","en":"He wore a formal suit to the interview.","tr":"他穿着正式西装去面试。","g":13},{"w":"versus","ph":"/ˈvɜːrsəs/","pos":"prep.","cn":"对；与…相对；对抗","en":"The case is Smith versus Jones.","tr":"案件是史密斯对琼斯。","g":13},{"w":"merchant","ph":"/ˈmɜːrtʃənt/","pos":"n.","cn":"商人；批发商","en":"His father was a tea merchant.","tr":"他的父亲是一名茶叶商人。","g":13},{"w":"resolution","ph":"/ˌrezəˈluːʃn/","pos":"n.","cn":"决心；决议；分辨率","en":"She made a New Year resolution to lose weight.","tr":"她制定了一个新年的减肥计划。","g":13},{"w":"argue","ph":"/ˈɑːrɡjuː/","pos":"v.","cn":"争论；辩论；主张","en":"They argued about money.","tr":"他们因为钱的问题而争论。","g":13},{"w":"headline","ph":"/ˈhedlaɪn/","pos":"n.","cn":"大字标题；新闻提要","en":"The headline news is about the election.","tr":"头条新闻是关于选举的。","g":13},{"w":"acquisition","ph":"/ˌækwɪˈzɪʃn/","pos":"n.","cn":"获得；收购","en":"The company announced a new acquisition.","tr":"公司宣布了一项新的收购。","g":13},{"w":"tissue","ph":"/ˈtɪʃuː/","pos":"n.","cn":"纸巾；薄纸；组织","en":"She wiped her tears with a tissue.","tr":"她用纸巾擦去了眼泪。","g":13},{"w":"intelligence","ph":"/ɪnˈtelɪdʒəns/","pos":"n.","cn":"智力；情报；智能","en":"Artificial intelligence is advancing rapidly.","tr":"人工智能正在快速发展。","g":13},{"w":"search","ph":"/sɜːrtʃ/","pos":"v.","cn":"搜索；搜寻；查找","en":"They searched for the missing child.","tr":"他们正在寻找失踪的孩子。","g":13},{"w":"literature","ph":"/ˈlɪtrətʃər/","pos":"n.","cn":"文学；文献；资料","en":"She studied English literature in college.","tr":"她在大学学习了英国文学。","g":13},{"w":"therefore","ph":"/ˈðerfɔːr/","pos":"ad.","cn":"因此；所以","en":"He was ill, therefore he stayed home.","tr":"他生病了，因此他待在家里。","g":13},{"w":"stress","ph":"/stres/","pos":"n.","cn":"压力；强调；重音","en":"She is under a lot of stress.","tr":"她承受着巨大的压力。","g":13},{"w":"venture","ph":"/ˈventʃər/","pos":"n.","cn":"风险项目；冒险；敢于","en":"It was a bold venture to start a new business.","tr":"创立新企业是一项大胆的冒险。","g":13},{"w":"pump","ph":"/pʌmp/","pos":"n.","cn":"泵；打气；抽水","en":"We need a pump to get the water out.","tr":"我们需要一个泵来把水抽出来。","g":13},{"w":"hook","ph":"/hʊk/","pos":"n.","cn":"钩子；钩住；吸引","en":"Hang your coat on the hook.","tr":"把你的外套挂在钩子上。","g":13},{"w":"passive","ph":"/ˈpæsɪv/","pos":"a.","cn":"被动的；消极的","en":"He played a passive role in the project.","tr":"他在项目中扮演了一个被动的角色。","g":13},{"w":"district","ph":"/ˈdɪstrɪkt/","pos":"n.","cn":"地区；区域；行政区","en":"She lives in the financial district of the city.","tr":"她住在城市的金融区。","g":13},{"w":"sacrifice","ph":"/ˈsækrɪfaɪs/","pos":"n.","cn":"牺牲；献祭","en":"She sacrificed her career for her family.","tr":"她为了家庭牺牲了自己的事业。","g":13},{"w":"invest","ph":"/ɪnˈvest/","pos":"v.","cn":"投资；投入；授予","en":"He invested all his money in stocks.","tr":"他把所有的钱都投资在股票上。","g":13},{"w":"reside","ph":"/rɪˈzaɪd/","pos":"v.","cn":"居住；定居；属于","en":"He resides in a small village.","tr":"他住在一个小村庄里。","g":13},{"w":"behavior","ph":"/bɪˈheɪvjər/","pos":"n.","cn":"行为；举止；习性","en":"His behavior was unacceptable.","tr":"他的行为是不可接受的。","g":13},{"w":"background","ph":"/ˈbækɡraʊnd/","pos":"n.","cn":"背景；出身","en":"She comes from a musical background.","tr":"她来自一个音乐背景。","g":13},{"w":"profile","ph":"/ˈproʊfaɪl/","pos":"n.","cn":"侧面；轮廓；简介","en":"We checked his profile online.","tr":"我们在网上查了他的资料。","g":13},{"w":"courage","ph":"/ˈkɜːrɪdʒ/","pos":"n.","cn":"勇气；胆量","en":"He showed great courage.","tr":"他展现了巨大的勇气。","g":13},{"w":"lean","ph":"/liːn/","pos":"v.","cn":"倚靠；倾斜；瘦的","en":"He leaned against the wall.","tr":"他靠在墙上。","g":13},{"w":"broad","ph":"/brɔːd/","pos":"a.","cn":"宽的；广泛的；概括的","en":"We have a broad range of products.","tr":"我们有广泛的产品范围。","g":13},{"w":"passion","ph":"/ˈpæʃn/","pos":"n.","cn":"激情；热情；爱好","en":"She has a passion for music.","tr":"她对音乐充满热情。","g":13},{"w":"loan","ph":"/loʊn/","pos":"n.","cn":"贷款；借贷；借出","en":"He applied for a bank loan.","tr":"他申请了银行贷款。","g":13},{"w":"discount","ph":"/ˈdɪskaʊnt/","pos":"n.","cn":"折扣","en":"They offered a 20% discount on all items.","tr":"所有商品都提供20%的折扣。","g":13},{"w":"ratio","ph":"/ˈreɪʃioʊ/","pos":"n.","cn":"比率；比例","en":"The ratio of men to women is 3:2.","tr":"男女比例为3:2。","g":13},{"w":"punctual","ph":"/ˈpʌŋktʃuəl/","pos":"a.","cn":"守时的；准时的","en":"Please be punctual for the meeting.","tr":"请准时参加会议。","g":13},{"w":"leap","ph":"/liːp/","pos":"v.","cn":"跳跃；飞跃","en":"The cat leaped onto the table.","tr":"猫跳上了桌子。","g":13},{"w":"license","ph":"/ˈlaɪsns/","pos":"n.","cn":"执照；许可证；许可","en":"You need a license to drive.","tr":"你需要驾驶许可证。","g":13},{"w":"impulse","ph":"/ˈɪmpʌls/","pos":"n.","cn":"冲动；推动力","en":"He bought the car on impulse.","tr":"他一时冲动买了那辆车。","g":13},{"w":"vulnerable","ph":"/ˈvʌlnərəbl/","pos":"a.","cn":"脆弱的；易受伤的","en":"Children are vulnerable to diseases.","tr":"儿童易受疾病的侵袭。","g":13},{"w":"application","ph":"/ˌæplɪˈkeɪʃn/","pos":"n.","cn":"申请；应用；应用程序","en":"His job application was successful.","tr":"他的工作申请成功了。","g":13},{"w":"hardship","ph":"/ˈhɑːrdʃɪp/","pos":"n.","cn":"艰难；困苦","en":"They suffered many hardships during the war.","tr":"他们在战争中遭受了很多苦难。","g":13},{"w":"vice","ph":"/vaɪs/","pos":"n.","cn":"恶习；缺点；副的","en":"Smoking is a harmful vice.","tr":"吸烟是一种有害的恶习。","g":13},{"w":"prescribe","ph":"/prɪˈskraɪb/","pos":"v.","cn":"开药方；规定","en":"The doctor prescribed antibiotics.","tr":"医生开了抗生素。","g":13},{"w":"surface","ph":"/ˈsɜːrfɪs/","pos":"n.","cn":"表面；外表；水面","en":"The surface of the water was calm.","tr":"水面平静。","g":13},{"w":"deliver","ph":"/dɪˈlɪvər/","pos":"v.","cn":"递送；发表；接生","en":"The mailman delivers letters every morning.","tr":"邮差每天早上送信。","g":13},{"w":"dictation","ph":"/dɪkˈteɪʃn/","pos":"n.","cn":"听写；口述","en":"The teacher gave the students a dictation exercise.","tr":"老师给学生们布置了一个听写练习。","g":13},{"w":"expose","ph":"/ɪkˈspoʊz/","pos":"v.","cn":"暴露；揭露；使接触","en":"The report exposed the company&#39;s illegal activities.","tr":"报告揭露了公司的非法活动。","g":13},{"w":"billion","ph":"/ˈbɪljən/","pos":"num.","cn":"十亿","en":"The project cost one billion dollars.","tr":"项目成本十亿美元。","g":13},{"w":"tuition","ph":"/tuˈɪʃn/","pos":"n.","cn":"学费；教学","en":"Tuition fees have risen this year.","tr":"今年学费上涨了。","g":13},{"w":"explore","ph":"/ɪkˈsplɔːr/","pos":"v.","cn":"探索；探测；探究","en":"They explored the jungle for new species.","tr":"他们探索了丛林，寻找新物种。","g":13},{"w":"exchange","ph":"/ɪksˈtʃeɪndʒ/","pos":"n.","cn":"交换；兑换；交流","en":"They exchanged phone numbers.","tr":"他们交换了电话号码。","g":13},{"w":"struggle","ph":"/ˈstrʌɡl/","pos":"v.","cn":"斗争；挣扎；努力","en":"She struggled to open the door.","tr":"她努力想要打开门。","g":13},{"w":"pitch","ph":"/pɪtʃ/","pos":"n.","cn":"场地；音高；投掷","en":"The football pitch was muddy.","tr":"足球场泥泞不堪。","g":13},{"w":"ambition","ph":"/æmˈbɪʃn/","pos":"n.","cn":"野心；雄心；志向","en":"His ambition is to become a CEO.","tr":"他的雄心是成为CEO。","g":13},{"w":"isolate","ph":"/ˈaɪsəleɪt/","pos":"v.","cn":"孤立；隔离；分离","en":"The village was isolated by the snowstorm.","tr":"村庄被暴风雪孤立。","g":13},{"w":"entry","ph":"/ˈentri/","pos":"n.","cn":"进入；入口；条目","en":"There is a No Entry&#34; sign on the door.&#34;","tr":"门上挂着一个“禁止进入”的标志。","g":13},{"w":"abuse","ph":"/əˈbjuːs/","pos":"n.","cn":"滥用；虐待","en":"Drug abuse is a serious problem.","tr":"药物滥用是一个严重的问题。","g":13},{"w":"inevitable","ph":"/ɪnˈevɪtəbl/","pos":"a.","cn":"不可避免的；必然的","en":"Change is inevitable.","tr":"变革是不可避免的。","g":13},{"w":"flexible","ph":"/ˈfleksəbl/","pos":"a.","cn":"灵活的；柔韧的；可变通的","en":"We need a more flexible schedule.","tr":"我们需要一个更灵活的时间表。","g":13},{"w":"existence","ph":"/ɪɡˈzɪstəns/","pos":"n.","cn":"存在；生存；生活","en":"The organization has been in existence for 20 years.","tr":"该组织已经存在了20年。","g":13},{"w":"nerve","ph":"/nɜːrv/","pos":"n.","cn":"神经；勇气","en":"He had the nerve to ask for more money.","tr":"他竟然有胆量要求更多的钱。","g":13},{"w":"primitive","ph":"/ˈprɪmətɪv/","pos":"a.","cn":"原始的；早期的；简陋的","en":"Primitive man lived in caves.","tr":"原始人类生活在洞穴中。","g":13},{"w":"intend","ph":"/ɪnˈtend/","pos":"v.","cn":"打算；计划；意指","en":"I intend to study abroad next year.","tr":"我打算明年出国留学。","g":13},{"w":"poll","ph":"/poʊl/","pos":"n.","cn":"民意调查；投票","en":"The latest poll shows the candidate leading.","tr":"最新的民意调查显示该候选人领先。","g":13},{"w":"heroic","ph":"/hɪˈroʊɪk/","pos":"a.","cn":"英雄的；英勇的","en":"His heroic act saved many lives.","tr":"他的英勇行为挽救了许多生命。","g":13},{"w":"evidence","ph":"/ˈevɪdəns/","pos":"n.","cn":"证据；迹象；证明","en":"There is no evidence to support his claim.","tr":"没有证据支持他的说法。","g":13},{"w":"jam","ph":"/dʒæm/","pos":"n.","cn":"果酱；堵塞；拥挤","en":"Traffic jams are common in the city.","tr":"城市里交通堵塞很常见。","g":13},{"w":"hatred","ph":"/ˈheɪtrɪd/","pos":"n.","cn":"憎恨；仇恨","en":"There was hatred in his eyes.","tr":"他的眼中充满了仇恨。","g":13},{"w":"core","ph":"/kɔːr/","pos":"n.","cn":"核心；中心；果核","en":"The core of the problem is trust.","tr":"问题的核心是信任。","g":13},{"w":"committee","ph":"/kəˈmɪti/","pos":"n.","cn":"委员会","en":"The committee decided to postpone the vote.","tr":"委员会决定推迟投票。","g":13},{"w":"multiply","ph":"/ˈmʌltɪplaɪ/","pos":"v.","cn":"乘；倍增；繁殖","en":"Multiply the length by the width.","tr":"将长度乘以宽度。","g":13},{"w":"assess","ph":"/əˈses/","pos":"v.","cn":"评估；评定；估算","en":"They assessed the damage carefully.","tr":"他们仔细评估了损失。","g":13},{"w":"speech","ph":"/spiːtʃ/","pos":"n.","cn":"演讲；讲话；言语能力","en":"He gave a moving speech.","tr":"他发表了一场感人的演讲。","g":13},{"w":"shock","ph":"/ʃɑːk/","pos":"n.","cn":"震惊；冲击；电击","en":"The news came as a shock.","tr":"这个消息令人震惊。","g":14},{"w":"ease","ph":"/iːz/","pos":"n.","cn":"容易；舒适；减轻","en":"He passed the test with ease.","tr":"他轻松通过了考试。","g":14},{"w":"announce","ph":"/əˈnaʊns/","pos":"v.","cn":"宣布；通告","en":"The president announced the new policy.","tr":"总统宣布了新政策。","g":14},{"w":"ideal","ph":"/aɪˈdiːəl/","pos":"a.","cn":"理想的；完美的；理想","en":"This is an ideal place for a picnic.","tr":"这是野餐的理想地点。","g":14},{"w":"adequate","ph":"/ˈædɪkwət/","pos":"a.","cn":"足够的；适当的","en":"The supply is adequate for our needs.","tr":"供应足以满足我们的需求。","g":14},{"w":"shade","ph":"/ʃeɪd/","pos":"n.","cn":"阴凉处；阴影；色调","en":"Let&#39;s sit in the shade.","tr":"我们坐在阴凉处吧。","g":14},{"w":"image","ph":"/ˈɪmɪdʒ/","pos":"n.","cn":"形象；图像；影像","en":"The company wants to improve its public image.","tr":"公司想要改善其公共形象。","g":14},{"w":"lawyer","ph":"/ˈlɔːjər/","pos":"n.","cn":"律师","en":"He hired a lawyer to handle the case.","tr":"他雇了一名律师来处理这个案件。","g":14},{"w":"contemporary","ph":"/kənˈtempəreri/","pos":"a.","cn":"当代的；同时代的","en":"She studies contemporary art.","tr":"她学习当代艺术。","g":14},{"w":"allowance","ph":"/əˈlaʊəns/","pos":"n.","cn":"津贴；零用钱","en":"He receives a monthly allowance.","tr":"他每月有一笔津贴。","g":14},{"w":"halt","ph":"/hɔːlt/","pos":"n.","cn":"停止；暂停","en":"The car came to a halt at the red light.","tr":"汽车在红灯前停了下来。","g":14},{"w":"adopt","ph":"/əˈdɑːpt/","pos":"v.","cn":"采用；收养","en":"They adopted a child.","tr":"他们收养了一个孩子。","g":14},{"w":"offend","ph":"/əˈfend/","pos":"v.","cn":"冒犯；得罪；违反","en":"His remarks offended many people.","tr":"他的言论冒犯了许多人。","g":14},{"w":"steady","ph":"/ˈstedi/","pos":"a.","cn":"稳定的；稳固的；持续的","en":"He has a steady job.","tr":"他有一份稳定的工作。","g":14},{"w":"sale","ph":"/seɪl/","pos":"n.","cn":"销售；出售；大减价","en":"The house is for sale.","tr":"这房子正在出售。","g":14},{"w":"loose","ph":"/luːs/","pos":"a.","cn":"松的；宽松的；不牢固的","en":"The screw was loose.","tr":"螺丝松了。","g":14},{"w":"interior","ph":"/ɪnˈtɪriər/","pos":"a.","cn":"内部的；内部","en":"The interior of the house is modern.","tr":"房子的内部装饰现代。","g":14},{"w":"credit","ph":"/ˈkredɪt/","pos":"n.","cn":"信用；学分；赞扬","en":"He got a credit card last week.","tr":"他上周申请了一张信用卡。","g":14},{"w":"current","ph":"/ˈkɜːrənt/","pos":"a.","cn":"当前的；水流；趋势","en":"What is your current job?","tr":"你现在的工作是什么？","g":14},{"w":"institute","ph":"/ˈɪnstɪtuːt/","pos":"n.","cn":"学院；机构；研究所","en":"She works at a research institute.","tr":"她在一所研究所工作。","g":14},{"w":"challenge","ph":"/ˈtʃælɪndʒ/","pos":"n.","cn":"挑战；质疑","en":"This job is a real challenge.","tr":"这项工作真是一个挑战。","g":14},{"w":"software","ph":"/ˈsɔːftwer/","pos":"n.","cn":"软件","en":"He develops computer software.","tr":"他开发计算机软件。","g":14},{"w":"grip","ph":"/ɡrɪp/","pos":"v.","cn":"紧握；抓住；控制","en":"She gripped the handle tightly.","tr":"她紧紧握住了把手。","g":14},{"w":"bloom","ph":"/bluːm/","pos":"n.","cn":"花；开花；兴旺","en":"The roses are in full bloom.","tr":"玫瑰花正值盛花期。","g":14},{"w":"arrange","ph":"/əˈreɪndʒ/","pos":"v.","cn":"安排；整理；筹备","en":"They arranged a meeting for Monday.","tr":"他们安排了周一的会议。","g":14},{"w":"primary","ph":"/ˈpraɪmeri/","pos":"a.","cn":"首要的；初级的；基本的","en":"The primary goal is to make money.","tr":"主要目标是赚钱。","g":14},{"w":"wander","ph":"/ˈwɑːndər/","pos":"v.","cn":"漫步；闲逛；走神","en":"She wandered around the market.","tr":"她在市场上闲逛。","g":14},{"w":"republican","ph":"/rɪˈpʌblɪkən/","pos":"a.","cn":"共和国的；共和党人","en":"The Republican candidate won the election.","tr":"共和党候选人赢得了选举。","g":14},{"w":"afford","ph":"/əˈfɔːrd/","pos":"v.","cn":"负担得起；提供","en":"We can&#39;t afford to lose this opportunity.","tr":"我们不能失去这个机会。","g":14},{"w":"creative","ph":"/kriˈeɪtɪv/","pos":"a.","cn":"有创造力的；创意的","en":"She is very creative.","tr":"她非常有创造力。","g":14},{"w":"alternative","ph":"/ɔːlˈtɜːrnətɪv/","pos":"n.","cn":"替代的；供替代的选择","en":"We need an alternative approach.","tr":"我们需要一种替代方法。","g":14},{"w":"output","ph":"/ˈaʊtpʊt/","pos":"n.","cn":"产量；输出；输出量","en":"The factory increased its output by 20%.","tr":"工厂增加了20%的产量。","g":14},{"w":"pursue","ph":"/pərˈsuː/","pos":"v.","cn":"追求；追赶；从事","en":"She pursued her dream of becoming a writer.","tr":"她追求成为作家的梦想。","g":14},{"w":"embrace","ph":"/ɪmˈbreɪs/","pos":"v.","cn":"拥抱；包括；欣然接受","en":"She embraced her mother warmly.","tr":"她热情地拥抱了她的母亲。","g":14},{"w":"slight","ph":"/slaɪt/","pos":"a.","cn":"轻微的；细小的；苗条的","en":"There is a slight chance of rain.","tr":"有轻微的降雨机会。","g":14},{"w":"trade","ph":"/treɪd/","pos":"n.","cn":"贸易；交易；行业；交换","en":"International trade is increasing.","tr":"国际贸易正在增加。","g":14},{"w":"manufacture","ph":"/ˌmænjuˈfæktʃər/","pos":"v.","cn":"制造；生产；制造业","en":"The company manufactures computer parts.","tr":"这家公司生产电脑零件。","g":14},{"w":"temperature","ph":"/ˈtemprətʃər/","pos":"n.","cn":"温度；体温","en":"The temperature dropped below zero.","tr":"温度降至零度以下。","g":14},{"w":"absolute","ph":"/ˈæbsəluːt/","pos":"a.","cn":"绝对的；完全的","en":"He demanded absolute loyalty.","tr":"他要求绝对的忠诚。","g":14},{"w":"keen","ph":"/kiːn/","pos":"a.","cn":"渴望的；热衷的；敏锐的","en":"She is keen to learn new skills.","tr":"她渴望学习新技能。","g":14},{"w":"affair","ph":"/əˈfer/","pos":"n.","cn":"事务；事件；私事","en":"The government handled the affair badly.","tr":"政府处理这件事情很糟糕。","g":14},{"w":"explain","ph":"/ɪkˈspleɪn/","pos":"v.","cn":"解释；说明；阐明","en":"Can you explain how the machine works?","tr":"你能解释一下这台机器是如何工作的吗？","g":14},{"w":"roar","ph":"/rɔːr/","pos":"v.","cn":"吼叫；咆哮；轰鸣","en":"The lion roared loudly.","tr":"狮子大声吼叫。","g":14},{"w":"available","ph":"/əˈveɪləbl/","pos":"a.","cn":"可获得的；有空的","en":"Is this seat available?","tr":"这个座位有人吗？","g":14},{"w":"accompany","ph":"/əˈkʌmpəni/","pos":"v.","cn":"陪伴；伴随","en":"She accompanied her friend to the hospital.","tr":"她陪她的朋友去了医院。","g":14},{"w":"reasonable","ph":"/ˈriːznəbl/","pos":"a.","cn":"合理的；公道的；通情达理的","en":"His request sounds reasonable.","tr":"他的请求听起来很合理。","g":14},{"w":"prominent","ph":"/ˈprɑːmɪnənt/","pos":"a.","cn":"突出的；著名的；显著的","en":"He is a prominent scientist.","tr":"他是一位杰出的科学家。","g":14},{"w":"strike","ph":"/straɪk/","pos":"v.","cn":"罢工；打击；撞击；突然想到","en":"The workers went on strike.","tr":"工人们罢工了。","g":14},{"w":"serious","ph":"/ˈsɪriəs/","pos":"a.","cn":"严肃的；严重的；认真的","en":"It&#39;s a serious problem.","tr":"这是一个严重的问题。","g":14},{"w":"select","ph":"/sɪˈlekt/","pos":"v.","cn":"选择；挑选","en":"Select a file to open.","tr":"选择一个文件打开。","g":14},{"w":"intellectual","ph":"/ˌɪntəˈlektʃuəl/","pos":"a.","cn":"智力的；有才智的；知识分子","en":"Reading improves intellectual ability.","tr":"阅读能提高智力能力。","g":14},{"w":"extreme","ph":"/ɪkˈstriːm/","pos":"a.","cn":"极端的；极度的；极端","en":"They live in extreme poverty.","tr":"他们生活在极端贫困中。","g":14},{"w":"hunt","ph":"/hʌnt/","pos":"v.","cn":"打猎；搜寻；追捕","en":"The police are hunting for the suspect.","tr":"警方正在搜寻嫌疑人。","g":14},{"w":"premium","ph":"/ˈpriːmiəm/","pos":"n.","cn":"保险费；溢价；高价的","en":"They pay a monthly insurance premium.","tr":"他们每月支付保险费。","g":14},{"w":"obvious","ph":"/ˈɑːbviəs/","pos":"a.","cn":"明显的；显然的；公认的","en":"The answer is obvious.","tr":"答案是显而易见的。","g":14},{"w":"bare","ph":"/ber/","pos":"a.","cn":"赤裸的；光秃的；勉强的","en":"The room was bare and empty.","tr":"房间空荡荡的。","g":14},{"w":"accent","ph":"/ˈæksent/","pos":"n.","cn":"口音；重音","en":"She speaks English with a French accent.","tr":"她说英语带有法国口音。","g":14},{"w":"absorb","ph":"/əbˈzɔːrb/","pos":"v.","cn":"吸收；吸引","en":"Plants absorb nutrients from the soil.","tr":"植物从土壤中吸收养分。","g":14},{"w":"psychological","ph":"/ˌsaɪkəˈlɑːdʒɪkl/","pos":"a.","cn":"心理的；心理学的","en":"There may be a psychological cause.","tr":"可能有心理上的原因。","g":14},{"w":"knot","ph":"/nɑːt/","pos":"n.","cn":"结；节；疙瘩","en":"Tie a knot in the rope.","tr":"在绳子上打个结。","g":14},{"w":"typical","ph":"/ˈtɪpɪkl/","pos":"a.","cn":"典型的；特有的；平常的","en":"It&#39;s a typical British dish.","tr":"这是典型的英国菜。","g":14},{"w":"preference","ph":"/ˈprefrəns/","pos":"n.","cn":"偏爱；优先权","en":"She has a preference for classical music.","tr":"她偏爱古典音乐。","g":14},{"w":"stem","ph":"/stem/","pos":"n.","cn":"茎；干；阻止；起源于","en":"The plant&#39;s stem is broken.","tr":"植物的茎被折断了。","g":14},{"w":"separate","ph":"/ˈseprət/","pos":"a.","cn":"分开的；不同的；分居","en":"They sleep in separate rooms.","tr":"他们分房睡觉。","g":14},{"w":"attorney","ph":"/əˈtɜːrni/","pos":"n.","cn":"律师；代理人","en":"He hired an attorney to handle the case.","tr":"他雇了一名律师来处理这个案件。","g":14},{"w":"significant","ph":"/sɪɡˈnɪfɪkənt/","pos":"a.","cn":"重大的；显著的；有意义的","en":"There has been a significant improvement.","tr":"有了显著的改善。","g":14},{"w":"content","ph":"/ˈkɑːntent/","pos":"n.","cn":"内容；满足的","en":"He seemed content with his life.","tr":"他对他的生活感到满足。","g":14},{"w":"forbid","ph":"/fərˈbɪd/","pos":"v.","cn":"禁止；不许","en":"Smoking is forbidden in this building.","tr":"本建筑内禁止吸烟。","g":14},{"w":"recall","ph":"/rɪˈkɔːl/","pos":"v.","cn":"回忆；召回；收回","en":"I can&#39;t recall his name.","tr":"我记不起他的名字了。","g":14},{"w":"appeal","ph":"/əˈpiːl/","pos":"n.","cn":"呼吁；吸引；上诉","en":"They made an appeal for donations.","tr":"他们发出了募捐呼吁。","g":14},{"w":"nevertheless","ph":"/ˌnevərðəˈles/","pos":"ad.","cn":"然而；尽管如此","en":"It was raining; nevertheless, we went out.","tr":"尽管下着雨，我们还是出去了。","g":14},{"w":"victim","ph":"/ˈvɪktɪm/","pos":"n.","cn":"受害者；牺牲品","en":"The victim was taken to hospital.","tr":"受害者被送往医院。","g":14},{"w":"weapon","ph":"/ˈwepən/","pos":"n.","cn":"武器；手段","en":"The police found the murder weapon.","tr":"警察找到了凶器。","g":14},{"w":"routine","ph":"/ruːˈtiːn/","pos":"n.","cn":"常规；例行公事；例行程序","en":"My daily routine includes exercise.","tr":"我的日常例行公事包括锻炼。","g":14},{"w":"trust","ph":"/trʌst/","pos":"n.","cn":"信任；信赖；托付","en":"You can trust me.","tr":"你可以相信我。","g":14},{"w":"editor","ph":"/ˈedɪtər/","pos":"n.","cn":"编辑；编者","en":"The editor checked the article for errors.","tr":"编辑检查了文章中的错误。","g":14},{"w":"boast","ph":"/boʊst/","pos":"v.","cn":"自夸；夸耀","en":"He boasts about his wealth.","tr":"他夸耀自己的财富。","g":14},{"w":"specific","ph":"/spəˈsɪfɪk/","pos":"a.","cn":"具体的；特定的；明确的","en":"Can you be more specific?","tr":"你能更具体一些吗？","g":14},{"w":"margin","ph":"/ˈmɑːrdʒən/","pos":"n.","cn":"边缘；余地；利润","en":"We left a margin for error.","tr":"我们预留了犯错的余地。","g":14},{"w":"analyse","ph":"/ˈænəlaɪz/","pos":"v.","cn":"分析","en":"We need to analyse the data.","tr":"我们需要分析数据。","g":14},{"w":"atmosphere","ph":"/ˈætməsfɪr/","pos":"n.","cn":"气氛；大气；环境","en":"The restaurant has a romantic atmosphere.","tr":"这家餐厅有一种浪漫的氛围。","g":15},{"w":"arbitrary","ph":"/ˈɑːrbɪtreri/","pos":"a.","cn":"任意的；武断的","en":"The decision seemed arbitrary.","tr":"这个决定看起来是随意的。","g":15},{"w":"debate","ph":"/dɪˈbeɪt/","pos":"n.","cn":"辩论；争论","en":"The students took part in a heated debate.","tr":"学生们参加了一场激烈的辩论。","g":15},{"w":"inspect","ph":"/ɪnˈspekt/","pos":"v.","cn":"检查；视察；审视","en":"The officer inspected the documents.","tr":"官员检查了文件。","g":15},{"w":"gaze","ph":"/ɡeɪz/","pos":"v.","cn":"凝视；注视","en":"She gazed at the stars.","tr":"#VALUE!","g":15},{"w":"decline","ph":"/dɪˈklaɪn/","pos":"v.","cn":"下降；婉拒；衰退","en":"The number of tourists has declined sharply.","tr":"游客数量急剧下降。","g":15},{"w":"masterpiece","ph":"/ˈmæstərpiːs/","pos":"n.","cn":"杰作；名作","en":"The Mona Lisa is a masterpiece.","tr":"蒙娜丽莎是一幅杰作。","g":15},{"w":"publish","ph":"/ˈpʌblɪʃ/","pos":"v.","cn":"出版；发行；发表","en":"She published her first novel last year.","tr":"她去年出版了她的第一部小说。","g":15},{"w":"privilege","ph":"/ˈprɪvəlɪdʒ/","pos":"n.","cn":"特权；荣幸","en":"It&#39;s a privilege to work with you.","tr":"与您合作是我们的荣幸。","g":15},{"w":"numerous","ph":"/ˈnuːmərəs/","pos":"a.","cn":"许多的；众多的","en":"She has received numerous awards.","tr":"她获得了许多奖项。","g":15},{"w":"resign","ph":"/rɪˈzaɪn/","pos":"v.","cn":"辞职；辞去","en":"He resigned as manager.","tr":"他辞去了经理的职务。","g":15},{"w":"disappear","ph":"/ˌdɪsəˈpɪr/","pos":"v.","cn":"消失；灭绝","en":"The snow will soon disappear.","tr":"很快雪就会融化。","g":15},{"w":"poverty","ph":"/ˈpɑːvərti/","pos":"n.","cn":"贫穷；贫困","en":"Millions of people live in poverty.","tr":"数百万人生活在贫困中。","g":15},{"w":"process","ph":"/ˈprɑːses/","pos":"n.","cn":"过程；进程；处理","en":"The healing process takes time.","tr":"愈合过程需要时间。","g":15},{"w":"appropriate","ph":"/əˈproʊpriət/","pos":"a.","cn":"适当的；合适的","en":"This movie is not appropriate for children.","tr":"这部电影不适合儿童。","g":15},{"w":"acknowledge","ph":"/əkˈnɑːlɪdʒ/","pos":"v.","cn":"承认；感谢","en":"He acknowledged his mistake.","tr":"他承认了他的错误。","g":15},{"w":"emphasis","ph":"/ˈemfəsɪs/","pos":"n.","cn":"强调；重点；重音","en":"The school puts a lot of emphasis on discipline.","tr":"学校非常重视纪律。","g":15},{"w":"confidence","ph":"/ˈkɑːnfɪdəns/","pos":"n.","cn":"信心；信任","en":"She has confidence in her abilities.","tr":"她对自己的能力有信心。","g":15},{"w":"flood","ph":"/flʌd/","pos":"n.","cn":"洪水；淹没；大量涌入","en":"The heavy rain caused a flood.","tr":"大雨引发了洪水。","g":15},{"w":"cultivate","ph":"/ˈkʌltɪveɪt/","pos":"v.","cn":"培养；耕作","en":"He cultivates good relationships.","tr":"他培养良好的关系。","g":15},{"w":"humor","ph":"/ˈhjuːmər/","pos":"n.","cn":"幽默；诙谐","en":"He has a good sense of humor.","tr":"他很有幽默感。","g":15},{"w":"ignore","ph":"/ɪɡˈnɔːr/","pos":"v.","cn":"忽视；不理会","en":"He ignored my advice.","tr":"他没有听从我的建议。","g":15},{"w":"analysis","ph":"/əˈnæləsɪs/","pos":"n.","cn":"分析；解析","en":"The analysis of the results took hours.","tr":"分析结果花费了数小时。","g":15},{"w":"aware","ph":"/əˈwer/","pos":"a.","cn":"意识到的；知道的","en":"Are you aware of the risks?","tr":"你知道这些风险吗？","g":15},{"w":"era","ph":"/ˈɪrə/","pos":"n.","cn":"时代；年代；纪元","en":"We are living in the digital era.","tr":"我们正生活在一个数字化的时代。","g":15},{"w":"eastern","ph":"/ˈiːstərn/","pos":"a.","cn":"东方的；东部的","en":"They traveled to eastern Europe.","tr":"他们旅行到了东欧。","g":15},{"w":"enterprise","ph":"/ˈentərpraɪz/","pos":"n.","cn":"企业；事业；进取心","en":"She runs a small enterprise.","tr":"她经营着一家小企业。","g":15},{"w":"cooperate","ph":"/koʊˈɑːpəreɪt/","pos":"v.","cn":"合作；协作","en":"The two companies cooperated on the project.","tr":"两家公司在项目上进行了合作。","g":15},{"w":"cable","ph":"/ˈkeɪbl/","pos":"n.","cn":"电缆；缆绳","en":"We need a longer cable for the TV.","tr":"我们需要一根更长的电视电缆。","g":15},{"w":"service","ph":"/ˈsɜːrvɪs/","pos":"n.","cn":"服务；维修；公共设施","en":"The customer service was excellent.","tr":"客户服务非常优秀。","g":15},{"w":"pile","ph":"/paɪl/","pos":"n.","cn":"堆；堆积","en":"There was a pile of books on the desk.","tr":"桌子上有一堆书。","g":15},{"w":"strengthen","ph":"/ˈstreŋθn/","pos":"v.","cn":"加强；增强；巩固","en":"Exercise strengthens the body.","tr":"锻炼可以加强身体。","g":15},{"w":"alert","ph":"/əˈlɜːrt/","pos":"a.","cn":"警惕的；警报；使警觉","en":"Stay alert while driving at night.","tr":"开车时要保持警觉。","g":15},{"w":"status","ph":"/ˈsteɪtəs/","pos":"n.","cn":"地位；状况；身份","en":"The status of women has improved.","tr":"妇女的地位有所提高。","g":15},{"w":"defend","ph":"/dɪˈfend/","pos":"v.","cn":"防御；保卫；辩护","en":"The lawyer defended his client in court.","tr":"律师在法庭上为他的客户辩护。","g":15},{"w":"bold","ph":"/boʊld/","pos":"a.","cn":"大胆的；粗体的","en":"He made a bold decision.","tr":"他做出了一个大胆的决定。","g":15},{"w":"brilliant","ph":"/ˈbrɪliənt/","pos":"a.","cn":"杰出的；明亮的；精彩的","en":"He came up with a brilliant idea.","tr":"他想出了一个绝妙的主意。","g":15},{"w":"virus","ph":"/ˈvaɪrəs/","pos":"n.","cn":"病毒；计算机病毒","en":"The virus spread rapidly across the country.","tr":"病毒迅速在全国传播。","g":15},{"w":"portray","ph":"/pɔːrˈtreɪ/","pos":"v.","cn":"描绘；扮演；描写","en":"The painting portrays a young woman.","tr":"这幅画描绘了一位年轻女子。","g":15},{"w":"nourish","ph":"/ˈnɜːrɪʃ/","pos":"v.","cn":"滋养；养育；培养","en":"Good food nourishes the body.","tr":"美食滋养身体。","g":15},{"w":"approach","ph":"/əˈproʊtʃ/","pos":"n.","cn":"方法；接近；着手处理","en":"They took a new approach to teaching.","tr":"他们采取了一种新的教学方法。","g":15},{"w":"facility","ph":"/fəˈsɪləti/","pos":"n.","cn":"设施；设备；场所","en":"The hotel has excellent sports facilities.","tr":"这家酒店拥有极好的体育设施。","g":15},{"w":"fade","ph":"/feɪd/","pos":"v.","cn":"褪色；逐渐消失","en":"The colour of the curtains has faded.","tr":"窗帘的颜色已经褪色。","g":15},{"w":"demonstrate","ph":"/ˈdemənstreɪt/","pos":"v.","cn":"证明；演示；示威游行","en":"The experiment demonstrated that the theory was correct.","tr":"实验表明该理论是正确的。","g":15},{"w":"conflict","ph":"/ˈkɑːnflɪkt/","pos":"n.","cn":"冲突；矛盾；战斗","en":"The conflict between the two countries lasted years.","tr":"两国之间的冲突持续了多年。","g":15},{"w":"prime","ph":"/praɪm/","pos":"a.","cn":"首要的；最好的；基本的","en":"Smoking is the prime cause of lung cancer.","tr":"吸烟是肺癌的主要原因。","g":15},{"w":"support","ph":"/səˈpɔːrt/","pos":"v.","cn":"支持；支援；供养","en":"I support your decision.","tr":"我支持你的决定。","g":15},{"w":"evaluate","ph":"/ɪˈvæljueɪt/","pos":"v.","cn":"评价；评估；估值","en":"We need to evaluate the effectiveness of the program.","tr":"我们需要评估该计划的有效性。","g":15},{"w":"avenue","ph":"/ˈævənuː/","pos":"n.","cn":"大街；途径；林荫道","en":"They walked down Fifth Avenue.","tr":"他们沿着第五大道走。","g":15},{"w":"gesture","ph":"/ˈdʒestʃər/","pos":"n.","cn":"手势；姿态；表示","en":"He made a rude gesture.","tr":"#VALUE!","g":15},{"w":"resist","ph":"/rɪˈzɪst/","pos":"v.","cn":"抵抗；抵制；忍住","en":"I can&#39;t resist chocolate.","tr":"我无法抗拒巧克力。","g":15},{"w":"scene","ph":"/siːn/","pos":"n.","cn":"景色；现场；情景","en":"The police arrived at the scene.","tr":"警察到达了现场。","g":15},{"w":"session","ph":"/ˈseʃn/","pos":"n.","cn":"会议；学期；一段时间","en":"The training session lasted two hours.","tr":"培训课程持续了两个小时。","g":15},{"w":"grant","ph":"/ɡrænt/","pos":"v.","cn":"授予；同意；拨款","en":"The school received a government grant.","tr":"学校收到了政府的补助金。","g":15},{"w":"zone","ph":"/zoʊn/","pos":"n.","cn":"地区；区域；地带","en":"This is a no-parking zone.","tr":"这是一个禁停区域。","g":15},{"w":"lack","ph":"/læk/","pos":"n.","cn":"缺乏；不足；没有","en":"The project failed due to a lack of funds.","tr":"项目因为缺乏资金而失败。","g":15},{"w":"expand","ph":"/ɪkˈspænd/","pos":"v.","cn":"扩大；膨胀；详述","en":"The company plans to expand its business overseas.","tr":"公司计划将其业务扩展到海外。","g":15},{"w":"suspect","ph":"/səˈspekt/","pos":"v.","cn":"怀疑；嫌疑犯","en":"The police suspect him of the crime.","tr":"警方怀疑他犯了罪。","g":15},{"w":"gain","ph":"/ɡeɪn/","pos":"v.","cn":"获得；增加；受益","en":"He gained a lot of experience from the job.","tr":"他从工作中获得了丰富的经验。","g":15},{"w":"depress","ph":"/dɪˈpres/","pos":"v.","cn":"使沮丧；使萧条；压下","en":"The constant rain depressed her.","tr":"持续的雨让她感到沮丧。","g":15},{"w":"horizon","ph":"/həˈraɪzn/","pos":"n.","cn":"地平线；眼界；范围","en":"The sun sank below the horizon.","tr":"太阳沉没在地平线下。","g":15},{"w":"reluctant","ph":"/rɪˈlʌktənt/","pos":"a.","cn":"不情愿的；勉强的","en":"She was reluctant to leave.","tr":"她不愿意离开。","g":15},{"w":"site","ph":"/saɪt/","pos":"n.","cn":"地点；位置；网站","en":"Visit our website for more information.","tr":"访问我们的网站获取更多信息。","g":15},{"w":"failure","ph":"/ˈfeɪljər/","pos":"n.","cn":"失败；失败者；故障","en":"The project was a complete failure.","tr":"该项目彻底失败了。","g":15},{"w":"grasp","ph":"/ɡræsp/","pos":"v.","cn":"抓住；理解；掌握","en":"He quickly grasped the main idea.","tr":"他迅速理解了主要观点。","g":15},{"w":"automatic","ph":"/ˌɔːtəˈmætɪk/","pos":"a.","cn":"自动的；无意识的","en":"The door opens automatically.","tr":"门可以自动打开。","g":15},{"w":"wealth","ph":"/welθ/","pos":"n.","cn":"财富；大量；丰富","en":"Health is more important than wealth.","tr":"健康比财富更重要。","g":15},{"w":"modest","ph":"/ˈmɑːdɪst/","pos":"a.","cn":"谦虚的；适度的；端庄的","en":"She is very modest about her success.","tr":"她对自己的成功非常谦虚。","g":15},{"w":"bonus","ph":"/ˈboʊnəs/","pos":"n.","cn":"奖金；红利；额外收获","en":"Employees received a year-end bonus.","tr":"员工收到了年终奖金。","g":15},{"w":"withstand","ph":"/wɪðˈstænd/","pos":"v.","cn":"承受；经受住；抵抗","en":"The bridge is designed to withstand earthquakes.","tr":"桥梁设计能够抵御地震。","g":15},{"w":"adapt","ph":"/əˈdæpt/","pos":"v.","cn":"适应；改编","en":"She adapted quickly to the new environment.","tr":"她很快适应了新环境。","g":15},{"w":"anxiety","ph":"/æŋˈzaɪəti/","pos":"n.","cn":"焦虑；忧虑","en":"The exam caused her great anxiety.","tr":"考试让她感到非常焦虑。","g":15},{"w":"extend","ph":"/ɪkˈstend/","pos":"v.","cn":"延伸；扩大；给予；延续","en":"The meeting extended into the evening.","tr":"会议持续到了晚上。","g":15},{"w":"mortal","ph":"/ˈmɔːrtl/","pos":"a.","cn":"终有一死的；致命的；凡人","en":"All men are mortal.","tr":"所有人都是会死的。","g":15},{"w":"staff","ph":"/stæf/","pos":"n.","cn":"全体员工；工作人员","en":"The staff are very friendly.","tr":"员工们非常友好。","g":15},{"w":"relief","ph":"/rɪˈliːf/","pos":"n.","cn":"缓解；救济；宽慰","en":"It was a relief to hear the good news.","tr":"听到这个好消息是一种安慰。","g":15},{"w":"attract","ph":"/əˈtrækt/","pos":"v.","cn":"吸引；引起…的好感","en":"The city attracts many tourists.","tr":"这座城市吸引了许多游客。","g":15},{"w":"soil","ph":"/sɔɪl/","pos":"n.","cn":"土壤；土地","en":"The soil here is very fertile.","tr":"这里的土壤非常肥沃。","g":15},{"w":"acquire","ph":"/əˈkwaɪər/","pos":"v.","cn":"获得；习得","en":"She acquired a good knowledge of English.","tr":"她掌握了良好的英语知识。","g":15},{"w":"fortune","ph":"/ˈfɔːrtʃən/","pos":"n.","cn":"财富；运气；命运","en":"He made a fortune in the stock market.","tr":"他在股票市场上赚了一大笔钱。","g":15},{"w":"illustrate","ph":"/ˈɪləstreɪt/","pos":"v.","cn":"说明；举例说明；加插图","en":"The graph illustrates the growth trend.","tr":"图表展示了增长趋势。","g":16},{"w":"mechanic","ph":"/məˈkænɪk/","pos":"n.","cn":"技工；机械师","en":"He works as a car mechanic.","tr":"他的工作是汽车修理工。","g":16},{"w":"navigation","ph":"/ˌnævɪˈɡeɪʃn/","pos":"n.","cn":"航行；导航","en":"GPS makes navigation much easier.","tr":"GPS使得导航变得容易得多。","g":16},{"w":"patent","ph":"/ˈpætnt/","pos":"n.","cn":"专利；专利的","en":"He applied for a patent for his invention.","tr":"他为他的发明申请了专利。","g":16},{"w":"investigate","ph":"/ɪnˈvestɪɡeɪt/","pos":"v.","cn":"调查；研究；审查","en":"The police are investigating the case.","tr":"警方正在调查这个案件。","g":16},{"w":"emerge","ph":"/ɪˈmɜːrdʒ/","pos":"v.","cn":"出现；浮现；暴露","en":"New evidence emerged during the trial.","tr":"审判期间出现了新的证据。","g":16},{"w":"serve","ph":"/sɜːrv/","pos":"v.","cn":"服务；提供；上菜；服役","en":"Breakfast is served from 7 to 9.","tr":"早餐从7点供应到9点。","g":16},{"w":"mission","ph":"/ˈmɪʃn/","pos":"n.","cn":"使命；任务；代表团","en":"The rescue mission was successful.","tr":"救援任务成功了。","g":16},{"w":"recovery","ph":"/rɪˈkʌvəri/","pos":"n.","cn":"恢复；康复；复苏","en":"The economy is showing signs of recovery.","tr":"经济显示出复苏的迹象。","g":16},{"w":"reserve","ph":"/rɪˈzɜːrv/","pos":"v.","cn":"预订；保留；储备","en":"I&#39;d like to reserve a table for two.","tr":"我想预订一张两人桌。","g":16},{"w":"secure","ph":"/sɪˈkjʊr/","pos":"a.","cn":"安全的；牢固的；获得","en":"The building is secure.","tr":"大楼是安全的。","g":16},{"w":"polish","ph":"/ˈpɑːlɪʃ/","pos":"v.","cn":"擦亮；磨光；优美","en":"He polished his shoes.","tr":"他擦亮了他的鞋子。","g":16},{"w":"attain","ph":"/əˈteɪn/","pos":"v.","cn":"达到；获得；实现","en":"She attained her goal of running a marathon.","tr":"她实现了自己跑马拉松的目标。","g":16},{"w":"rotten","ph":"/ˈrɑːtn/","pos":"a.","cn":"腐烂的；腐朽的","en":"The fruit was rotten.","tr":"水果腐烂了。","g":16},{"w":"mechanism","ph":"/ˈmekənɪzəm/","pos":"n.","cn":"机制；机械装置；方法","en":"The pain mechanism is not fully understood.","tr":"疼痛机制尚未完全被理解。","g":16},{"w":"academy","ph":"/əˈkædəmi/","pos":"n.","cn":"学院；研究院","en":"He studied at a military academy.","tr":"他在军事学院学习。","g":16},{"w":"presumably","ph":"/prɪˈzuːməbli/","pos":"ad.","cn":"大概；据推测","en":"Presumably, he will arrive soon.","tr":"据推测，他很快就会到达。","g":16},{"w":"combine","ph":"/kəmˈbaɪn/","pos":"v.","cn":"结合；联合","en":"Combine the ingredients in a bowl.","tr":"将配料混合在一个碗里。","g":16},{"w":"bureau","ph":"/ˈbjʊroʊ/","pos":"n.","cn":"局；办公桌；衣柜","en":"The weather bureau issued a warning.","tr":"气象局发布了预警。","g":16},{"w":"prior","ph":"/ˈpraɪər/","pos":"a.","cn":"在先的；优先的","en":"Please give us prior notice.","tr":"请提前通知我们。","g":16},{"w":"casual","ph":"/ˈkæʒuəl/","pos":"a.","cn":"随便的；非正式的；偶然的","en":"Dress code is casual on Fridays.","tr":"周五的着装代码是休闲。","g":16},{"w":"database","ph":"/ˈdeɪtəbeɪs/","pos":"n.","cn":"数据库","en":"All customer information is stored in the database.","tr":"所有客户信息都存储在数据库中。","g":16},{"w":"maximum","ph":"/ˈmæksɪməm/","pos":"a.","cn":"最大的；最大值","en":"The maximum speed is 120 km/h.","tr":"最高速度是120公里/小时。","g":16},{"w":"harsh","ph":"/hɑːrʃ/","pos":"a.","cn":"严厉的；刺耳的；艰苦的","en":"The punishment seemed too harsh.","tr":"惩罚似乎太严厉了。","g":16},{"w":"diplomat","ph":"/ˈdɪpləmæt/","pos":"n.","cn":"外交官","en":"She served as a diplomat in France.","tr":"她曾在法国担任外交官。","g":16},{"w":"welfare","ph":"/ˈwelfer/","pos":"n.","cn":"福利；幸福；救济金","en":"The government is cutting welfare benefits.","tr":"政府正在削减福利津贴。","g":16},{"w":"virtue","ph":"/ˈvɜːrtʃuː/","pos":"n.","cn":"美德；优点；贞操","en":"Patience is a virtue.","tr":"耐心是一种美德。","g":16},{"w":"audio","ph":"/ˈɔːdioʊ/","pos":"a.","cn":"音频的；声音的","en":"The audio quality is excellent.","tr":"音质非常出色。","g":16},{"w":"rural","ph":"/ˈrʊrəl/","pos":"a.","cn":"乡村的；农村的","en":"They moved to a rural area.","tr":"他们搬到了一个农村地区。","g":16},{"w":"ensure","ph":"/ɪnˈʃʊr/","pos":"v.","cn":"确保；保证","en":"Please ensure that all windows are closed.","tr":"请确保所有窗户都已关闭。","g":16},{"w":"derive","ph":"/dɪˈraɪv/","pos":"v.","cn":"源于；获得","en":"Many English words derive from Latin.","tr":"许多英语单词来源于拉丁语。","g":16},{"w":"sensitive","ph":"/ˈsensətɪv/","pos":"a.","cn":"敏感的；灵敏的；体贴的","en":"He is sensitive to criticism.","tr":"他对批评很敏感。","g":16},{"w":"personnel","ph":"/ˌpɜːrsəˈnel/","pos":"n.","cn":"人员；全体员工；人事部门","en":"All personnel must wear an ID badge.","tr":"所有员工必须佩戴身份识别牌。","g":16},{"w":"stage","ph":"/steɪdʒ/","pos":"n.","cn":"阶段；舞台；步骤","en":"The project is in its early stages.","tr":"项目尚处于初期阶段。","g":16},{"w":"title","ph":"/ˈtaɪtl/","pos":"n.","cn":"标题；头衔；权利","en":"What&#39;s the title of the book?","tr":"这本书的标题是什么？","g":16},{"w":"offense","ph":"/əˈfens/","pos":"n.","cn":"冒犯；进攻；犯法","en":"He meant no offense.","tr":"他并没有冒犯之意。","g":16},{"w":"hollow","ph":"/ˈhɑːloʊ/","pos":"a.","cn":"空的；中空的；空洞的","en":"The tree trunk was hollow.","tr":"树干是空心的。","g":16},{"w":"affect","ph":"/əˈfekt/","pos":"v.","cn":"影响；感动","en":"The weather can affect your mood.","tr":"天气会影响你的心情。","g":16},{"w":"angle","ph":"/ˈæŋɡl/","pos":"n.","cn":"角度；观点","en":"Look at the problem from a different angle.","tr":"从不同的角度看待问题。","g":16},{"w":"remark","ph":"/rɪˈmɑːrk/","pos":"n.","cn":"评论；注意；言论","en":"He made a rude remark.","tr":"他发表了一个粗鲁的评论。","g":16},{"w":"exclude","ph":"/ɪkˈskluːd/","pos":"v.","cn":"排除；排斥；把…除外","en":"The price excludes taxes.","tr":"价格不包括税费。","g":16},{"w":"album","ph":"/ˈælbəm/","pos":"n.","cn":"相册；专辑","en":"She released a new album.","tr":"她发布了一张新专辑。","g":16},{"w":"educate","ph":"/ˈedʒukeɪt/","pos":"v.","cn":"教育；培养；教导","en":"Parents should educate their children about safety.","tr":"父母应该教育他们的孩子注意安全。","g":16},{"w":"overcome","ph":"/ˌoʊvərˈkʌm/","pos":"v.","cn":"克服；战胜","en":"She managed to overcome her fear.","tr":"她设法克服了她的恐惧。","g":16},{"w":"apologize","ph":"/əˈpɑːlədʒaɪz/","pos":"v.","cn":"道歉；认错","en":"He apologized for being late.","tr":"他为迟到道歉。","g":16},{"w":"character","ph":"/ˈkærəktər/","pos":"n.","cn":"性格；角色；字符","en":"She has a strong character.","tr":"她性格坚强。","g":16},{"w":"cease","ph":"/siːs/","pos":"v.","cn":"停止；终止","en":"The fighting ceased at midnight.","tr":"战斗在午夜停止。","g":16},{"w":"magnificent","ph":"/mæɡˈnɪfɪsnt/","pos":"a.","cn":"壮丽的；宏伟的","en":"The view from the top was magnificent.","tr":"从顶部看风景很壮观。","g":16},{"w":"conservative","ph":"/kənˈsɜːrvətɪv/","pos":"a.","cn":"保守的；守旧的","en":"He has a conservative view on marriage.","tr":"他对婚姻持保守看法。","g":16},{"w":"regarding","ph":"/rɪˈɡɑːrdɪŋ/","pos":"prep.","cn":"关于；至于","en":"She said nothing regarding your request.","tr":"她对你的请求什么也没说。","g":16},{"w":"eager","ph":"/ˈiːɡər/","pos":"a.","cn":"渴望的；热切的","en":"She is eager to learn new skills.","tr":"她渴望学习新技能。","g":16},{"w":"deliberate","ph":"/dɪˈlɪbərət/","pos":"a.","cn":"故意的；深思熟虑的","en":"It was a deliberate act.","tr":"这是一个蓄意的行为。","g":16},{"w":"priority","ph":"/praɪˈɔːrəti/","pos":"n.","cn":"优先；优先事项","en":"Safety is our top priority.","tr":"安全是我们的首要任务。","g":16},{"w":"organ","ph":"/ˈɔːrɡən/","pos":"n.","cn":"器官；机构；风琴","en":"The heart is a vital organ.","tr":"心脏是一个重要的器官。","g":16},{"w":"claim","ph":"/kleɪm/","pos":"v.","cn":"声称；索赔；要求","en":"He claims that he is innocent.","tr":"他声称自己是无辜的。","g":16},{"w":"attitude","ph":"/ˈætɪtuːd/","pos":"n.","cn":"态度；看法；姿势","en":"She has a positive attitude towards life.","tr":"她对生活持有积极的态度。","g":16},{"w":"handle","ph":"/ˈhændl/","pos":"v.","cn":"处理；操作；把手","en":"She knows how to handle difficult customers.","tr":"她知道如何处理难缠的顾客。","g":16},{"w":"abundant","ph":"/əˈbʌndənt/","pos":"a.","cn":"丰富的；充裕的","en":"The region has abundant natural resources.","tr":"该地区拥有丰富的自然资源。","g":16},{"w":"deserve","ph":"/dɪˈzɜːrv/","pos":"v.","cn":"值得；应得","en":"She worked hard and deserves a promotion.","tr":"她工作努力，应该得到晋升。","g":16},{"w":"internal","ph":"/ɪnˈtɜːrnl/","pos":"a.","cn":"内部的；国内的；体内的","en":"The company conducted an internal investigation.","tr":"公司进行了一次内部调查。","g":16},{"w":"management","ph":"/ˈmænɪdʒmənt/","pos":"n.","cn":"管理；经营；管理层","en":"Good management is essential for success.","tr":"良好的管理对于成功至关重要。","g":16},{"w":"dismiss","ph":"/dɪsˈmɪs/","pos":"v.","cn":"解雇；解散；不予考虑","en":"He was dismissed from his job for stealing.","tr":"他因偷窃被解雇。","g":16},{"w":"consist","ph":"/kənˈsɪst/","pos":"v.","cn":"由...组成；在于","en":"The team consists of five members.","tr":"这个团队由五名成员组成。","g":16},{"w":"invasion","ph":"/ɪnˈveɪʒn/","pos":"n.","cn":"入侵；侵略","en":"The invasion caused widespread destruction.","tr":"入侵造成了广泛的破坏。","g":16},{"w":"asset","ph":"/ˈæset/","pos":"n.","cn":"资产；优点；有用的人","en":"Experience is a valuable asset.","tr":"经验是宝贵的财富。","g":16},{"w":"immigrant","ph":"/ˈɪmɪɡrənt/","pos":"n.","cn":"移民；侨民","en":"The city has a large immigrant population.","tr":"这座城市有大量的移民人口。","g":16},{"w":"dial","ph":"/ˈdaɪəl/","pos":"v.","cn":"拨号；刻度盘","en":"Dial 911 in an emergency.","tr":"紧急情况下拨打911。","g":16},{"w":"profound","ph":"/prəˈfaʊnd/","pos":"a.","cn":"深刻的；深远的；深奥的","en":"The book had a profound effect on me.","tr":"这本书对我产生了深刻的影响。","g":16},{"w":"mere","ph":"/mɪr/","pos":"a.","cn":"仅仅的；纯粹的；只不过","en":"He won by a mere 2 points.","tr":"他仅以2分的优势获胜。","g":16},{"w":"brand","ph":"/brænd/","pos":"n.","cn":"品牌；商标","en":"What brand of phone do you use?","tr":"你用的是什么品牌的手机？","g":16},{"w":"procedure","ph":"/prəˈsiːdʒər/","pos":"n.","cn":"程序；步骤；手续","en":"The procedure is quite simple.","tr":"程序非常简单。","g":16},{"w":"intelligent","ph":"/ɪnˈtelɪdʒənt/","pos":"a.","cn":"聪明的；有才智的；智能的","en":"She is a highly intelligent student.","tr":"她是一个非常聪明的学生。","g":16},{"w":"ancestor","ph":"/ˈænsestər/","pos":"n.","cn":"祖先；祖宗","en":"Our ancestors lived in caves.","tr":"我们的祖先生活在洞穴里。","g":16},{"w":"wisdom","ph":"/ˈwɪzdəm/","pos":"n.","cn":"智慧；明智；知识","en":"He gained wisdom from his experiences.","tr":"他从经历中获得了智慧。","g":16},{"w":"multiple","ph":"/ˈmʌltɪpl/","pos":"a.","cn":"多重的；多种多样的","en":"She has multiple reasons for quitting.","tr":"她有多个辞职的理由。","g":16},{"w":"satisfy","ph":"/ˈsætɪsfaɪ/","pos":"v.","cn":"使满意；满足","en":"The answer didn&#39;t satisfy me.","tr":"答案没有让我满意。","g":16},{"w":"luxury","ph":"/ˈlʌkʃəri/","pos":"n.","cn":"奢侈；奢侈品","en":"They live a life of luxury.","tr":"他们过着奢侈的生活。","g":16},{"w":"attempt","ph":"/əˈtempt/","pos":"n.","cn":"尝试；企图","en":"He made an attempt to climb the mountain.","tr":"他尝试攀登那座山。","g":16},{"w":"surgery","ph":"/ˈsɜːrdʒəri/","pos":"n.","cn":"外科手术；外科","en":"He underwent heart surgery.","tr":"他接受了心脏手术。","g":16}]};

/* ──────── src/data/books/cet4-key600.js ──────── */
/* 生成物：src/data/from_key600.py。别手改。 */
window.WC = window.WC || {}; WC.books = WC.books || {};
WC.books["cet4-key600"] = {"id":"cet4-key600","name":"四级重点词汇600","groups":8,"words":[{"w":"launch","ph":"/lɔːntʃ/","pos":"v.","cn":"发射；发起；推出","en":"The company launched a new product.","tr":"公司推出了一款新产品。","g":1},{"w":"essential","ph":"/ɪˈsenʃl/","pos":"a.","cn":"必要的；本质的；基本的","en":"Water is essential for life.","tr":"水对生命至关重要。","g":1},{"w":"accurate","ph":"/ˈækjərət/","pos":"a.","cn":"准确的；精确的","en":"The data is accurate and reliable.","tr":"数据准确可靠。","g":1},{"w":"estimate","ph":"/ˈestɪmeɪt/","pos":"v.","cn":"估计；估价；评价","en":"The police estimate that 10,000 people attended.","tr":"警方估计有10,000人出席。","g":1},{"w":"desperate","ph":"/ˈdespərət/","pos":"a.","cn":"绝望的；拼命的；极需要的","en":"The survivors were desperate for water.","tr":"幸存者们迫切需要水。","g":1},{"w":"compare","ph":"/kəmˈper/","pos":"v.","cn":"比较；对比","en":"Compare the prices before you buy.","tr":"购买前比较价格。","g":1},{"w":"season","ph":"/ˈsiːzn/","pos":"n.","cn":"季节；赛季","en":"Autumn is my favorite season.","tr":"秋天是我最喜欢的季节。","g":1},{"w":"experiment","ph":"/ɪkˈsperɪmənt/","pos":"n.","cn":"实验；试验；尝试","en":"The experiment proved the theory was correct.","tr":"实验证明了理论是正确的。","g":1},{"w":"minority","ph":"/maɪˈnɔːrəti/","pos":"n.","cn":"少数民族；少数派；未成年时期","en":"Minority rights must be protected.","tr":"必须保护少数群体的权利。","g":1},{"w":"trust","ph":"/trʌst/","pos":"n.","cn":"信任；信赖；托付","en":"You can trust me.","tr":"你可以相信我。","g":1},{"w":"commit","ph":"/kəˈmɪt/","pos":"v.","cn":"犯（罪）；承诺；投入","en":"He committed a crime.","tr":"他犯了罪。","g":1},{"w":"climate","ph":"/ˈklaɪmət/","pos":"n.","cn":"气候；风气","en":"The climate is changing rapidly.","tr":"气候正在迅速变化。","g":1},{"w":"success","ph":"/səkˈses/","pos":"n.","cn":"成功；成就","en":"Hard work is the key to success.","tr":"努力工作是成功的关键。","g":1},{"w":"contact","ph":"/ˈkɑːntækt/","pos":"n.","cn":"联系；接触；熟人","en":"Keep in contact with your friends.","tr":"保持与朋友的联系。","g":1},{"w":"ease","ph":"/iːz/","pos":"n.","cn":"容易；舒适；减轻","en":"He passed the test with ease.","tr":"他轻松通过了考试。","g":1},{"w":"deserve","ph":"/dɪˈzɜːrv/","pos":"v.","cn":"值得；应得","en":"She worked hard and deserves a promotion.","tr":"她工作努力，应该得到晋升。","g":1},{"w":"achieve","ph":"/əˈtʃiːv/","pos":"v.","cn":"实现；达到","en":"She achieved her goal of becoming a doctor.","tr":"她实现了成为医生的目标。","g":1},{"w":"defend","ph":"/dɪˈfend/","pos":"v.","cn":"防御；保卫；辩护","en":"The lawyer defended his client in court.","tr":"律师在法庭上为他的客户辩护。","g":1},{"w":"assure","ph":"/əˈʃʊr/","pos":"v.","cn":"保证；使确信；担保","en":"I assure you that everything will be fine.","tr":"我向你保证一切都会好起来的。","g":1},{"w":"afford","ph":"/əˈfɔːrd/","pos":"v.","cn":"负担得起；提供","en":"We can&#39;t afford to lose this opportunity.","tr":"我们不能失去这个机会。","g":1},{"w":"aware","ph":"/əˈwer/","pos":"a.","cn":"意识到的；知道的","en":"Are you aware of the risks?","tr":"你知道这些风险吗？","g":1},{"w":"legal","ph":"/ˈliːɡl/","pos":"a.","cn":"法律的；合法的；法定的","en":"Is it legal to park here?","tr":"这里停车合法吗？","g":1},{"w":"narrow","ph":"/ˈnæroʊ/","pos":"a.","cn":"狭窄的；勉强的；狭隘的","en":"The road is too narrow for two cars.","tr":"这条路太窄，两辆车过不去。","g":1},{"w":"item","ph":"/ˈaɪtəm/","pos":"n.","cn":"项目；条款；一件商品","en":"What is the most expensive item on the list?","tr":"清单上最贵的项目是什么？","g":1},{"w":"artificial","ph":"/ˌɑːrtɪˈfɪʃl/","pos":"a.","cn":"人工的；人造的；虚假的","en":"These flowers are artificial.","tr":"这些花是人造的。","g":1},{"w":"obtain","ph":"/əbˈteɪn/","pos":"v.","cn":"获得；得到；存在","en":"She obtained a degree in law.","tr":"她获得了法学学位。","g":1},{"w":"interact","ph":"/ˌɪntərˈækt/","pos":"v.","cn":"互动；相互作用；交流","en":"Teachers should interact more with students.","tr":"教师应该更多地与学生互动。","g":1},{"w":"recommend","ph":"/ˌrekəˈmend/","pos":"v.","cn":"推荐；建议","en":"I recommend this book to you.","tr":"我向你推荐这本书。","g":1},{"w":"issue","ph":"/ˈɪʃuː/","pos":"n.","cn":"问题；发行；期；发布","en":"Climate change is a global issue.","tr":"气候变化是全球性问题。","g":1},{"w":"casual","ph":"/ˈkæʒuəl/","pos":"a.","cn":"随便的；非正式的；偶然的","en":"Dress code is casual on Fridays.","tr":"周五的着装代码是休闲。","g":1},{"w":"extensive","ph":"/ɪkˈstensɪv/","pos":"a.","cn":"广泛的；大量的；广阔的","en":"The fire caused extensive damage.","tr":"火灾造成了广泛的破坏。","g":1},{"w":"examine","ph":"/ɪɡˈzæmɪn/","pos":"v.","cn":"检查；考试；细查","en":"The doctor examined the patient carefully.","tr":"医生仔细检查了病人。","g":1},{"w":"administration","ph":"/ədˌmɪnɪˈstreɪʃn/","pos":"n.","cn":"管理；行政；当局","en":"The school administration made the decision.","tr":"学校管理层做出了决定。","g":1},{"w":"range","ph":"/reɪndʒ/","pos":"n.","cn":"范围；幅度；山脉；排列","en":"The price range is from $10 to $50.","tr":"价格范围从10美元到50美元。","g":1},{"w":"character","ph":"/ˈkærəktər/","pos":"n.","cn":"性格；角色；字符","en":"She has a strong character.","tr":"她性格坚强。","g":1},{"w":"appeal","ph":"/əˈpiːl/","pos":"n.","cn":"呼吁；吸引；上诉","en":"They made an appeal for donations.","tr":"他们发出了募捐呼吁。","g":1},{"w":"certificate","ph":"/sərˈtɪfɪkət/","pos":"n.","cn":"证书；证明","en":"She received a certificate of achievement.","tr":"她收到了一份成就证书。","g":1},{"w":"initiative","ph":"/ɪˈnɪʃətɪv/","pos":"n.","cn":"主动性；倡议；首创精神","en":"She took the initiative to introduce herself.","tr":"她主动自我介绍。","g":1},{"w":"argument","ph":"/ˈɑːrɡjumənt/","pos":"n.","cn":"争论；论据；争吵","en":"She had an argument with her boss.","tr":"她和她的老板发生了争执。","g":1},{"w":"bond","ph":"/bɑːnd/","pos":"n.","cn":"纽带；债券；结合","en":"The bond between mother and child is strong.","tr":"母子之间的联系很牢固。","g":1},{"w":"distinguish","ph":"/dɪˈstɪŋɡwɪʃ/","pos":"v.","cn":"区分；辨别；使杰出","en":"It is hard to distinguish between the twins.","tr":"很难区分这对双胞胎。","g":1},{"w":"extraordinary","ph":"/ɪkˈstrɔːrdəneri/","pos":"a.","cn":"非凡的；特别的；离奇的","en":"He has an extraordinary memory.","tr":"他拥有非凡的记忆力。","g":1},{"w":"content","ph":"/ˈkɑːntent/","pos":"n.","cn":"内容；满足的","en":"He seemed content with his life.","tr":"他对他的生活感到满足。","g":1},{"w":"disappear","ph":"/ˌdɪsəˈpɪr/","pos":"v.","cn":"消失；灭绝","en":"The snow will soon disappear.","tr":"很快雪就会融化。","g":1},{"w":"monitor","ph":"/ˈmɑːnɪtər/","pos":"n.","cn":"显示器；监视器；班长；监控","en":"The nurse monitored the patient&#39;s condition.","tr":"护士监测了病人的状况。","g":1},{"w":"process","ph":"/ˈprɑːses/","pos":"n.","cn":"过程；进程；处理","en":"The healing process takes time.","tr":"愈合过程需要时间。","g":1},{"w":"communicate","ph":"/kəˈmjuːnɪkeɪt/","pos":"v.","cn":"交流；沟通；传达","en":"We communicate by email.","tr":"我们通过电子邮件进行沟通。","g":1},{"w":"award","ph":"/əˈwɔːrd/","pos":"n.","cn":"奖品；授予","en":"She won an award for her research.","tr":"她因研究获得了奖项。","g":1},{"w":"eventually","ph":"/ɪˈventʃuəli/","pos":"ad.","cn":"最终；终于","en":"After many delays, the flight eventually took off.","tr":"经过多次延迟，飞机最终起飞了。","g":1},{"w":"arrange","ph":"/əˈreɪndʒ/","pos":"v.","cn":"安排；整理；筹备","en":"They arranged a meeting for Monday.","tr":"他们安排了周一的会议。","g":1},{"w":"advanced","ph":"/ədˈvænst/","pos":"a.","cn":"高级的；先进的","en":"She took an advanced English course.","tr":"她参加了一个高级英语课程。","g":1},{"w":"compete","ph":"/kəmˈpiːt/","pos":"v.","cn":"竞争；比赛","en":"Athletes compete for the gold medal.","tr":"运动员们争夺金牌。","g":1},{"w":"effect","ph":"/ɪˈfekt/","pos":"n.","cn":"影响；效果；实现","en":"The medicine had a positive effect on her health.","tr":"这种药物对她的健康产生了积极的影响。","g":1},{"w":"argue","ph":"/ˈɑːrɡjuː/","pos":"v.","cn":"争论；辩论；主张","en":"They argued about money.","tr":"他们因为钱的问题而争论。","g":1},{"w":"awkward","ph":"/ˈɔːkwərd/","pos":"a.","cn":"尴尬的；笨拙的","en":"There was an awkward silence.","tr":"出现了一段尴尬的沉默。","g":1},{"w":"associate","ph":"/əˈsoʊsieɪt/","pos":"v.","cn":"联系；关联；合伙人","en":"People often associate success with money.","tr":"人们常常将成功与金钱联系在一起。","g":1},{"w":"intense","ph":"/ɪnˈtens/","pos":"a.","cn":"强烈的；紧张的；热情的","en":"The heat was intense.","tr":"热度非常强烈。","g":1},{"w":"asset","ph":"/ˈæset/","pos":"n.","cn":"资产；优点；有用的人","en":"Experience is a valuable asset.","tr":"经验是宝贵的财富。","g":1},{"w":"define","ph":"/dɪˈfaɪn/","pos":"v.","cn":"定义；规定；明确","en":"How do you define success?","tr":"你如何定义成功？","g":1},{"w":"organize","ph":"/ˈɔːrɡənaɪz/","pos":"v.","cn":"组织；安排；整理","en":"They organized a charity event.","tr":"他们组织了一次慈善活动。","g":1},{"w":"approve","ph":"/əˈpruːv/","pos":"v.","cn":"赞成；批准","en":"The committee approved the budget.","tr":"委员会批准了预算。","g":1},{"w":"skill","ph":"/skɪl/","pos":"n.","cn":"技能；技巧","en":"You need communication skills.","tr":"你需要沟通技巧。","g":1},{"w":"concern","ph":"/kənˈsɜːrn/","pos":"n.","cn":"关心；担忧；涉及","en":"The main concern is safety.","tr":"主要关注的是安全问题。","g":1},{"w":"recognition","ph":"/ˌrekəɡˈnɪʃn/","pos":"n.","cn":"承认；认出；赞誉","en":"She received recognition for her work.","tr":"她因工作得到了认可。","g":1},{"w":"destroy","ph":"/dɪˈstrɔɪ/","pos":"v.","cn":"破坏；毁坏；消灭","en":"The fire destroyed the old factory.","tr":"火灾摧毁了旧工厂。","g":1},{"w":"competitive","ph":"/kəmˈpetətɪv/","pos":"a.","cn":"竞争的；有竞争力的","en":"The market is very competitive.","tr":"市场竞争非常激烈。","g":1},{"w":"deny","ph":"/dɪˈnaɪ/","pos":"v.","cn":"否认；拒绝给予","en":"He denied knowing anything about the accident.","tr":"他否认对事故知情。","g":1},{"w":"charity","ph":"/ˈtʃærəti/","pos":"n.","cn":"慈善；慈善机构","en":"She donates money to charity.","tr":"她向慈善机构捐款。","g":1},{"w":"credit","ph":"/ˈkredɪt/","pos":"n.","cn":"信用；学分；赞扬","en":"He got a credit card last week.","tr":"他上周申请了一张信用卡。","g":1},{"w":"appreciate","ph":"/əˈpriːʃieɪt/","pos":"v.","cn":"欣赏；感激；领会","en":"I appreciate your help.","tr":"我感激你的帮助。","g":1},{"w":"massive","ph":"/ˈmæsɪv/","pos":"a.","cn":"巨大的；大规模的；严重的","en":"A massive earthquake hit the region.","tr":"一场大地震袭击了这个地区。","g":1},{"w":"option","ph":"/ˈɑːpʃn/","pos":"n.","cn":"选择；选项","en":"You have the option of paying online.","tr":"你有在线支付的选项。","g":1},{"w":"bound","ph":"/baʊnd/","pos":"a.","cn":"一定的；有义务的；跳跃","en":"We are bound to succeed.","tr":"我们一定会成功。","g":1},{"w":"environment","ph":"/ɪnˈvaɪrənmənt/","pos":"n.","cn":"环境；周围","en":"We must protect the environment.","tr":"我们必须保护环境。","g":1},{"w":"classical","ph":"/ˈklæsɪkl/","pos":"a.","cn":"古典的；经典的","en":"She likes classical music.","tr":"她喜欢古典音乐。","g":1},{"w":"convince","ph":"/kənˈvɪns/","pos":"v.","cn":"使信服；说服","en":"She convinced me to go with her.","tr":"她劝服我和她一起去。","g":1},{"w":"conclude","ph":"/kənˈkluːd/","pos":"v.","cn":"得出结论；结束；断定","en":"What can we conclude from the evidence?","tr":"我们能从证据中得出什么结论？","g":1},{"w":"declare","ph":"/dɪˈkler/","pos":"v.","cn":"宣布；声明；申报","en":"The president declared a state of emergency.","tr":"总统宣布进入紧急状态。","g":1},{"w":"decade","ph":"/ˈdekeɪd/","pos":"n.","cn":"十年","en":"The city has changed greatly in the past decade.","tr":"这座城市在过去十年里发生了巨大的变化。","g":1},{"w":"military","ph":"/ˈmɪləteri/","pos":"a.","cn":"军事的；军队的；军方","en":"He served in the military.","tr":"他在军队服役。","g":1},{"w":"council","ph":"/ˈkaʊnsl/","pos":"n.","cn":"委员会；理事会；议会","en":"The city council approved the plan.","tr":"市政会批准了该计划。","g":2},{"w":"invest","ph":"/ɪnˈvest/","pos":"v.","cn":"投资；投入；授予","en":"He invested all his money in stocks.","tr":"他把所有的钱都投资在股票上。","g":2},{"w":"besides","ph":"/bɪˈsaɪdz/","pos":"prep.","cn":"除...之外；而且","en":"Besides English, she speaks French.","tr":"除了英语，她还会说法语。","g":2},{"w":"justify","ph":"/ˈdʒʌstɪfaɪ/","pos":"v.","cn":"证明…正当；为…辩护","en":"How can you justify such behavior?","tr":"你怎么能为这样的行为辩解？","g":2},{"w":"illegal","ph":"/ɪˈliːɡl/","pos":"a.","cn":"非法的；违法的","en":"It is illegal to drive without a license.","tr":"无证驾驶是非法的。","g":2},{"w":"category","ph":"/ˈkætəɡɔːri/","pos":"n.","cn":"类别；种类","en":"This book falls into the fiction category.","tr":"这本书归类为小说。","g":2},{"w":"network","ph":"/ˈnetwɜːrk/","pos":"n.","cn":"网络；网状系统；人际关系","en":"She has a large network of contacts.","tr":"她拥有庞大的联系网络。","g":2},{"w":"section","ph":"/ˈsekʃn/","pos":"n.","cn":"部分；部门；章节","en":"Read the sports section of the newspaper.","tr":"阅读报纸上的体育版块。","g":2},{"w":"evident","ph":"/ˈevɪdənt/","pos":"a.","cn":"明显的；明白的","en":"It is evident that he is not happy.","tr":"很明显他并不高兴。","g":2},{"w":"separate","ph":"/ˈseprət/","pos":"a.","cn":"分开的；不同的；分居","en":"They sleep in separate rooms.","tr":"他们分房睡觉。","g":2},{"w":"component","ph":"/kəmˈpoʊnənt/","pos":"n.","cn":"组成部分；部件","en":"Trust is a key component of a relationship.","tr":"信任是关系中的关键要素。","g":2},{"w":"involve","ph":"/ɪnˈvɑːlv/","pos":"v.","cn":"涉及；包含；使参与","en":"The project involves a lot of travel.","tr":"该项目涉及到很多旅行。","g":2},{"w":"evaluate","ph":"/ɪˈvæljueɪt/","pos":"v.","cn":"评价；评估；估值","en":"We need to evaluate the effectiveness of the program.","tr":"我们需要评估该计划的有效性。","g":2},{"w":"coordinate","ph":"/koʊˈɔːrdɪneɪt/","pos":"v.","cn":"协调；配合","en":"We need to coordinate our efforts.","tr":"我们需要协调我们的努力。","g":2},{"w":"employer","ph":"/ɪmˈplɔɪər/","pos":"n.","cn":"雇主；老板","en":"She received a good reference from her previous employer.","tr":"她从上一家雇主那里得到了很好的推荐。","g":2},{"w":"exchange","ph":"/ɪksˈtʃeɪndʒ/","pos":"n.","cn":"交换；兑换；交流","en":"They exchanged phone numbers.","tr":"他们交换了电话号码。","g":2},{"w":"foreign","ph":"/ˈfɔːrən/","pos":"a.","cn":"外国的；陌生的；涉外的","en":"She can speak two foreign languages.","tr":"她会说两门外语。","g":2},{"w":"blame","ph":"/bleɪm/","pos":"v.","cn":"责备；归咎于","en":"Don&#39;t blame me for your mistakes.","tr":"不要因为你的错误责怪我。","g":2},{"w":"opportunity","ph":"/ˌɑːpərˈtuːnəti/","pos":"n.","cn":"机会；时机","en":"This is a great opportunity for us.","tr":"这是一个对我们来说绝佳的机会。","g":2},{"w":"accompany","ph":"/əˈkʌmpəni/","pos":"v.","cn":"陪伴；伴随","en":"She accompanied her friend to the hospital.","tr":"她陪她的朋友去了医院。","g":2},{"w":"calculate","ph":"/ˈkælkjuleɪt/","pos":"v.","cn":"计算；估计","en":"Can you calculate the total cost?","tr":"你能计算出总成本吗？","g":2},{"w":"behave","ph":"/bɪˈheɪv/","pos":"v.","cn":"行为；表现；守规矩","en":"Children should behave well in school.","tr":"孩子们在学校应该表现良好。","g":2},{"w":"security","ph":"/sɪˈkjʊrəti/","pos":"n.","cn":"安全；保安；抵押品","en":"Airport security has been increased.","tr":"机场安全措施已加强。","g":2},{"w":"chapter","ph":"/ˈtʃæptər/","pos":"n.","cn":"章节；分会","en":"Read the first chapter of the book.","tr":"阅读这本书的第一章。","g":2},{"w":"consequence","ph":"/ˈkɑːnsəkwens/","pos":"n.","cn":"后果；结果","en":"You must face the consequences of your actions.","tr":"你必须承担自己行为的后果。","g":2},{"w":"evidence","ph":"/ˈevɪdəns/","pos":"n.","cn":"证据；迹象；证明","en":"There is no evidence to support his claim.","tr":"没有证据支持他的说法。","g":2},{"w":"supply","ph":"/səˈplaɪ/","pos":"v.","cn":"供应；供给；补给品","en":"The store supplies fresh vegetables.","tr":"商店供应新鲜蔬菜。","g":2},{"w":"civil","ph":"/ˈsɪvl/","pos":"a.","cn":"公民的；民事的；文明的","en":"They married in a civil ceremony.","tr":"他们通过民事婚礼结为夫妻。","g":2},{"w":"currency","ph":"/ˈkɜːrənsi/","pos":"n.","cn":"货币；流通","en":"The euro is the currency of the EU.","tr":"欧元是欧盟的货币。","g":2},{"w":"risk","ph":"/rɪsk/","pos":"n.","cn":"风险；冒险","en":"Smoking increases the risk of lung cancer.","tr":"吸烟会增加患肺癌的风险。","g":2},{"w":"benefit","ph":"/ˈbenɪfɪt/","pos":"n.","cn":"好处；受益；有益于","en":"Exercise benefits your health.","tr":"锻炼对你的健康有益。","g":2},{"w":"demonstrate","ph":"/ˈdemənstreɪt/","pos":"v.","cn":"证明；演示；示威游行","en":"The experiment demonstrated that the theory was correct.","tr":"实验表明该理论是正确的。","g":2},{"w":"task","ph":"/tæsk/","pos":"n.","cn":"任务；工作","en":"The task is difficult but possible.","tr":"这项任务虽然困难，但是可能完成。","g":2},{"w":"error","ph":"/ˈerər/","pos":"n.","cn":"错误；差错；误差","en":"The report contained several factual errors.","tr":"报告中包含了一些事实错误。","g":2},{"w":"campus","ph":"/ˈkæmpəs/","pos":"n.","cn":"校园","en":"The campus is beautiful in spring.","tr":"校园春天时非常美丽。","g":2},{"w":"emphasize","ph":"/ˈemfəsaɪz/","pos":"v.","cn":"强调；着重","en":"The report emphasized the need for action.","tr":"报告强调了采取行动的必要性。","g":2},{"w":"generous","ph":"/ˈdʒenərəs/","pos":"a.","cn":"慷慨的；大方的；丰盛的","en":"She is always generous with her time.","tr":"#VALUE!","g":2},{"w":"outcome","ph":"/ˈaʊtkʌm/","pos":"n.","cn":"结果；结局","en":"What was the outcome of the meeting?","tr":"会议的结果是什么？","g":2},{"w":"abandon","ph":"/əˈbændən/","pos":"v.","cn":"放弃；遗弃；沉溺","en":"They had to abandon the project due to lack of funds.","tr":"由于资金不足，他们不得不放弃这个项目。","g":2},{"w":"promote","ph":"/prəˈmoʊt/","pos":"v.","cn":"促进；提升；推销","en":"The new policy will promote economic growth.","tr":"新政策将促进经济增长。","g":2},{"w":"arrest","ph":"/əˈrest/","pos":"v.","cn":"逮捕；拘留；阻止","en":"The police arrested the suspect.","tr":"警察逮捕了嫌疑人。","g":2},{"w":"emerge","ph":"/ɪˈmɜːrdʒ/","pos":"v.","cn":"出现；浮现；暴露","en":"New evidence emerged during the trial.","tr":"审判期间出现了新的证据。","g":2},{"w":"technology","ph":"/tekˈnɑːlədʒi/","pos":"n.","cn":"技术；科技","en":"Modern technology has changed our lives.","tr":"现代科技改变了我们的生活。","g":2},{"w":"division","ph":"/dɪˈvɪʒn/","pos":"n.","cn":"部门；分割；除法","en":"He works in the sales division.","tr":"他在销售部门工作。","g":2},{"w":"await","ph":"/əˈweɪt/","pos":"v.","cn":"等待；等候","en":"A bright future awaits you.","tr":"你的未来一片光明。","g":2},{"w":"depart","ph":"/dɪˈpɑːrt/","pos":"v.","cn":"离开；出发","en":"The train departs at noon.","tr":"火车中午出发。","g":2},{"w":"connect","ph":"/kəˈnekt/","pos":"v.","cn":"连接；联系；接通","en":"The printer is connected to the computer.","tr":"打印机已连接到电脑。","g":2},{"w":"acquire","ph":"/əˈkwaɪər/","pos":"v.","cn":"获得；习得","en":"She acquired a good knowledge of English.","tr":"她掌握了良好的英语知识。","g":2},{"w":"critical","ph":"/ˈkrɪtɪkl/","pos":"a.","cn":"批评的；关键的；危急的","en":"The patient is in critical condition.","tr":"病人情况危急。","g":2},{"w":"perceive","ph":"/pərˈsiːv/","pos":"v.","cn":"察觉；理解；认为","en":"She perceived a change in his attitude.","tr":"她觉察到他的态度有所变化。","g":2},{"w":"construct","ph":"/kənˈstrʌkt/","pos":"v.","cn":"建造；构建","en":"They constructed a new bridge.","tr":"他们建造了一座新桥。","g":2},{"w":"accommodation","ph":"/əˌkɑːməˈdeɪʃn/","pos":"n.","cn":"住宿；膳宿","en":"We need to arrange accommodation for guests.","tr":"我们需要为客人安排住宿。","g":2},{"w":"enormous","ph":"/ɪˈnɔːrməs/","pos":"a.","cn":"巨大的；庞大的","en":"The project required an enormous amount of money.","tr":"该项目需要巨额资金。","g":2},{"w":"amaze","ph":"/əˈmeɪz/","pos":"v.","cn":"使惊奇；使惊愕","en":"Her performance amazed the audience.","tr":"她的表演让观众惊叹。","g":2},{"w":"creative","ph":"/kriˈeɪtɪv/","pos":"a.","cn":"有创造力的；创意的","en":"She is very creative.","tr":"她非常有创造力。","g":2},{"w":"broadcast","ph":"/ˈbrɔːdkæst/","pos":"v.","cn":"广播；播送","en":"The event will be broadcast live.","tr":"该活动将进行现场直播。","g":2},{"w":"rely","ph":"/rɪˈlaɪ/","pos":"v.","cn":"依赖；信赖","en":"You can rely on me.","tr":"你可以依靠我。","g":2},{"w":"contain","ph":"/kənˈteɪn/","pos":"v.","cn":"包含；容纳；控制","en":"This box contains old photos.","tr":"这个盒子装有旧照片。","g":2},{"w":"serious","ph":"/ˈsɪriəs/","pos":"a.","cn":"严肃的；严重的；认真的","en":"It&#39;s a serious problem.","tr":"这是一个严重的问题。","g":2},{"w":"complex","ph":"/ˈkɑːmpleks/","pos":"a.","cn":"复杂的；复合的","en":"The problem is too complex.","tr":"这个问题太复杂了。","g":2},{"w":"foundation","ph":"/faʊnˈdeɪʃn/","pos":"n.","cn":"基础；基金会；建立","en":"Trust is the foundation of a good relationship.","tr":"信任是良好关系的基础。","g":2},{"w":"diverse","ph":"/daɪˈvɜːrs/","pos":"a.","cn":"不同的；多样的","en":"The city has a diverse population.","tr":"这个城市有多种族的人口。","g":2},{"w":"cycle","ph":"/ˈsaɪkl/","pos":"n.","cn":"循环；自行车；周期","en":"She cycles to work every day.","tr":"她每天都骑自行车上班。","g":2},{"w":"block","ph":"/blɑːk/","pos":"n.","cn":"街区；块；阻碍","en":"She lives two blocks away.","tr":"她住在两个街区之外。","g":2},{"w":"function","ph":"/ˈfʌŋkʃn/","pos":"n.","cn":"功能；作用；运行；起作用","en":"The main function of the heart is to pump blood.","tr":"心脏的主要功能是泵血。","g":2},{"w":"collection","ph":"/kəˈlekʃn/","pos":"n.","cn":"收藏品；收集","en":"She showed me her art collection.","tr":"她向我展示了她的艺术收藏。","g":2},{"w":"commercial","ph":"/kəˈmɜːrʃl/","pos":"a.","cn":"商业的；广告","en":"The commercial was very funny.","tr":"广告非常有趣。","g":2},{"w":"community","ph":"/kəˈmjuːnəti/","pos":"n.","cn":"社区；团体；社会","en":"The local community supports the school.","tr":"当地社区支持这所学校。","g":2},{"w":"context","ph":"/ˈkɑːntekst/","pos":"n.","cn":"背景；上下文；语境","en":"You need to understand the context.","tr":"你需要理解上下文。","g":2},{"w":"capable","ph":"/ˈkeɪpəbl/","pos":"a.","cn":"有能力的；能干的","en":"He is capable of solving the problem.","tr":"他有能力解决这个问题。","g":2},{"w":"acknowledge","ph":"/əkˈnɑːlɪdʒ/","pos":"v.","cn":"承认；感谢","en":"He acknowledged his mistake.","tr":"他承认了他的错误。","g":2},{"w":"aim","ph":"/eɪm/","pos":"n.","cn":"目标；瞄准","en":"Our aim is to improve customer service.","tr":"我们的目标是提高客户服务。","g":2},{"w":"creature","ph":"/ˈkriːtʃər/","pos":"n.","cn":"生物；动物；人","en":"The forest is full of wild creatures.","tr":"森林里充满了野生动物。","g":2},{"w":"surprise","ph":"/sərˈpraɪz/","pos":"n.","cn":"惊喜；惊讶；使惊奇","en":"What a pleasant surprise!","tr":"真是个令人愉快的惊喜！","g":2},{"w":"ignore","ph":"/ɪɡˈnɔːr/","pos":"v.","cn":"忽视；不理会","en":"He ignored my advice.","tr":"他没有听从我的建议。","g":2},{"w":"represent","ph":"/ˌreprɪˈzent/","pos":"v.","cn":"代表；表示；象征","en":"He represents the company at meetings.","tr":"他在会议上代表公司。","g":2},{"w":"significant","ph":"/sɪɡˈnɪfɪkənt/","pos":"a.","cn":"重大的；显著的；有意义的","en":"There has been a significant improvement.","tr":"有了显著的改善。","g":2},{"w":"angle","ph":"/ˈæŋɡl/","pos":"n.","cn":"角度；观点","en":"Look at the problem from a different angle.","tr":"从不同的角度看待问题。","g":2},{"w":"avoid","ph":"/əˈvɔɪd/","pos":"v.","cn":"避免；避开","en":"He tried to avoid eye contact.","tr":"他试图避免眼神接触。","g":2},{"w":"impose","ph":"/ɪmˈpoʊz/","pos":"v.","cn":"强加；征税；利用","en":"The judge imposed a heavy fine.","tr":"法官判了重罚。","g":2},{"w":"financial","ph":"/faɪˈnænʃl/","pos":"a.","cn":"金融的；财政的；财务的","en":"She gave me some financial advice.","tr":"她给了我一些建议。","g":3},{"w":"affect","ph":"/əˈfekt/","pos":"v.","cn":"影响；感动","en":"The weather can affect your mood.","tr":"天气会影响你的心情。","g":3},{"w":"institute","ph":"/ˈɪnstɪtuːt/","pos":"n.","cn":"学院；机构；研究所","en":"She works at a research institute.","tr":"她在一所研究所工作。","g":3},{"w":"engineering","ph":"/ˌendʒɪˈnɪrɪŋ/","pos":"n.","cn":"工程；工程学","en":"She studies civil engineering.","tr":"她学习土木工程。","g":3},{"w":"anticipate","ph":"/ænˈtɪsɪpeɪt/","pos":"v.","cn":"预期；期望","en":"We anticipate a rise in demand.","tr":"我们预计需求会有所增加。","g":3},{"w":"flexible","ph":"/ˈfleksəbl/","pos":"a.","cn":"灵活的；柔韧的；可变通的","en":"We need a more flexible schedule.","tr":"我们需要一个更灵活的时间表。","g":3},{"w":"defeat","ph":"/dɪˈfiːt/","pos":"v.","cn":"击败；战胜；挫败","en":"The team suffered a heavy defeat.","tr":"队伍遭受了惨重的失败。","g":3},{"w":"enable","ph":"/ɪˈneɪbl/","pos":"v.","cn":"使能够；使成为可能","en":"The scholarship enabled her to attend college.","tr":"奖学金使她能够上大学。","g":3},{"w":"relate","ph":"/rɪˈleɪt/","pos":"v.","cn":"联系；叙述；有关联","en":"The two events are closely related.","tr":"这两个事件紧密相关。","g":3},{"w":"immigrant","ph":"/ˈɪmɪɡrənt/","pos":"n.","cn":"移民；侨民","en":"The city has a large immigrant population.","tr":"这座城市有大量的移民人口。","g":3},{"w":"native","ph":"/ˈneɪtɪv/","pos":"a.","cn":"本国的；土著的；当地人","en":"Her native language is Chinese.","tr":"她的母语是中文。","g":3},{"w":"identity","ph":"/aɪˈdentəti/","pos":"n.","cn":"身份；同一性；特征","en":"His identity is unknown.","tr":"他的身份不明。","g":3},{"w":"apparent","ph":"/əˈpærənt/","pos":"a.","cn":"明显的；表面上的","en":"It became apparent that he was lying.","tr":"很明显他在撒谎。","g":3},{"w":"efficient","ph":"/ɪˈfɪʃnt/","pos":"a.","cn":"效率高的；有能力的","en":"She is an efficient worker.","tr":"她是一个效率高的工作者。","g":3},{"w":"overseas","ph":"/ˌoʊvərˈsiːz/","pos":"ad.","cn":"在海外；海外的","en":"She plans to work overseas.","tr":"她计划去海外工作。","g":3},{"w":"crisis","ph":"/ˈkraɪsɪs/","pos":"n.","cn":"危机；紧要关头","en":"The country faced an economic crisis.","tr":"国家面临经济危机。","g":3},{"w":"access","ph":"/ˈækses/","pos":"n.","cn":"进入；通道；访问","en":"Students have access to the library.","tr":"学生可以使用图书馆。","g":3},{"w":"atmosphere","ph":"/ˈætməsfɪr/","pos":"n.","cn":"气氛；大气；环境","en":"The restaurant has a romantic atmosphere.","tr":"这家餐厅有一种浪漫的氛围。","g":3},{"w":"alert","ph":"/əˈlɜːrt/","pos":"a.","cn":"警惕的；警报；使警觉","en":"Stay alert while driving at night.","tr":"开车时要保持警觉。","g":3},{"w":"appropriate","ph":"/əˈproʊpriət/","pos":"a.","cn":"适当的；合适的","en":"This movie is not appropriate for children.","tr":"这部电影不适合儿童。","g":3},{"w":"advance","ph":"/ədˈvæns/","pos":"n.","cn":"前进；进步；预支","en":"Technology continues to advance.","tr":"技术持续进步。","g":3},{"w":"focus","ph":"/ˈfoʊkəs/","pos":"v.","cn":"集中；聚焦；焦点","en":"You need to focus on your studies.","tr":"你需要专注于学习。","g":3},{"w":"observe","ph":"/əbˈzɜːrv/","pos":"v.","cn":"观察；遵守；注意到；庆祝","en":"Scientists have observed changes in the climate.","tr":"科学家观察到气候的变化。","g":3},{"w":"bonus","ph":"/ˈboʊnəs/","pos":"n.","cn":"奖金；红利；额外收获","en":"Employees received a year-end bonus.","tr":"员工收到了年终奖金。","g":3},{"w":"social","ph":"/ˈsoʊʃl/","pos":"a.","cn":"社会的；社交的","en":"Social media has changed our lives.","tr":"社交媒体改变了我们的生活。","g":3},{"w":"assemble","ph":"/əˈsembl/","pos":"v.","cn":"集合；组装；聚集","en":"The students assembled in the hall.","tr":"学生们在大厅里聚集。","g":3},{"w":"client","ph":"/ˈklaɪənt/","pos":"n.","cn":"客户；委托人","en":"We need to satisfy our clients.","tr":"我们需要满足我们的客户。","g":3},{"w":"nevertheless","ph":"/ˌnevərðəˈles/","pos":"ad.","cn":"然而；尽管如此","en":"It was raining; nevertheless, we went out.","tr":"尽管下着雨，我们还是出去了。","g":3},{"w":"entire","ph":"/ɪnˈtaɪər/","pos":"a.","cn":"整个的；全部的","en":"The entire village was destroyed by the storm.","tr":"整个村庄被暴风雨摧毁了。","g":3},{"w":"emotion","ph":"/ɪˈmoʊʃn/","pos":"n.","cn":"情感；情绪；激情","en":"He struggled to control his emotions.","tr":"他努力控制自己的情绪。","g":3},{"w":"boundary","ph":"/ˈbaʊndri/","pos":"n.","cn":"边界；分界线","en":"The river forms the boundary.","tr":"这条河形成了边界。","g":3},{"w":"seek","ph":"/siːk/","pos":"v.","cn":"寻找；寻求；试图","en":"They are seeking a solution.","tr":"他们正在寻找解决方案。","g":3},{"w":"contract","ph":"/ˈkɑːntrækt/","pos":"n.","cn":"合同；契约；收缩","en":"They signed a two-year contract.","tr":"他们签订了一个两年的合同。","g":3},{"w":"origin","ph":"/ˈɔːrɪdʒɪn/","pos":"n.","cn":"起源；出身；由来","en":"The origin of the word is unknown.","tr":"这个词的起源是未知的。","g":3},{"w":"attribute","ph":"/əˈtrɪbjuːt/","pos":"v.","cn":"把…归因于；属性","en":"He attributes his success to hard work.","tr":"他将自己的成功归功于努力工作。","g":3},{"w":"generate","ph":"/ˈdʒenəreɪt/","pos":"v.","cn":"产生；引起；发（电）","en":"The wind farm generates electricity.","tr":"#VALUE!","g":3},{"w":"achievement","ph":"/əˈtʃiːvmənt/","pos":"n.","cn":"成就；成绩","en":"Winning the award was a great achievement.","tr":"获得这个奖项是一个巨大的成就。","g":3},{"w":"arbitrary","ph":"/ˈɑːrbɪtreri/","pos":"a.","cn":"任意的；武断的","en":"The decision seemed arbitrary.","tr":"这个决定看起来是随意的。","g":3},{"w":"eager","ph":"/ˈiːɡər/","pos":"a.","cn":"渴望的；热切的","en":"She is eager to learn new skills.","tr":"她渴望学习新技能。","g":3},{"w":"awful","ph":"/ˈɔːfl/","pos":"a.","cn":"可怕的；极坏的","en":"The weather is awful today.","tr":"今天的天气很糟糕。","g":3},{"w":"abundant","ph":"/əˈbʌndənt/","pos":"a.","cn":"丰富的；充裕的","en":"The region has abundant natural resources.","tr":"该地区拥有丰富的自然资源。","g":3},{"w":"document","ph":"/ˈdɑːkjumənt/","pos":"n.","cn":"文件；文档","en":"Please sign the document at the bottom.","tr":"请在文档底部签名。","g":3},{"w":"code","ph":"/koʊd/","pos":"n.","cn":"代码；密码；准则","en":"I forgot the access code.","tr":"我忘记了访问代码。","g":3},{"w":"broad","ph":"/brɔːd/","pos":"a.","cn":"宽的；广泛的；概括的","en":"We have a broad range of products.","tr":"我们有广泛的产品范围。","g":3},{"w":"moral","ph":"/ˈmɔːrəl/","pos":"a.","cn":"道德的；道义上的；寓意","en":"We have a moral duty to help.","tr":"我们有道德责任去帮助。","g":3},{"w":"boom","ph":"/buːm/","pos":"n.","cn":"繁荣；激增；轰鸣","en":"The economy is booming.","tr":"经济正在蓬勃发展。","g":3},{"w":"dominate","ph":"/ˈdɑːmɪneɪt/","pos":"v.","cn":"支配；占优势；俯视","en":"The company dominates the software market.","tr":"这家公司主导了软件市场。","g":3},{"w":"audience","ph":"/ˈɔːdiəns/","pos":"n.","cn":"观众；听众；读者","en":"The audience applauded loudly.","tr":"观众热烈鼓掌。","g":3},{"w":"staff","ph":"/stæf/","pos":"n.","cn":"全体员工；工作人员","en":"The staff are very friendly.","tr":"员工们非常友好。","g":3},{"w":"due","ph":"/duː/","pos":"a.","cn":"到期的；由于；预期的","en":"The assignment is due next Monday.","tr":"作业下周一截止。","g":3},{"w":"intelligent","ph":"/ɪnˈtelɪdʒənt/","pos":"a.","cn":"聪明的；有才智的；智能的","en":"She is a highly intelligent student.","tr":"她是一个非常聪明的学生。","g":3},{"w":"traffic","ph":"/ˈtræfɪk/","pos":"n.","cn":"交通；运输量","en":"He was stuck in heavy traffic.","tr":"他被困在了严重的交通堵塞中。","g":3},{"w":"dynamic","ph":"/daɪˈnæmɪk/","pos":"a.","cn":"动态的；有活力的；动力学的","en":"The market is very dynamic and changes quickly.","tr":"市场非常活跃，变化迅速。","g":3},{"w":"pressure","ph":"/ˈpreʃər/","pos":"n.","cn":"压力；压强；压迫","en":"He is under a lot of pressure at work.","tr":"他在工作中承受了很多压力。","g":3},{"w":"brilliant","ph":"/ˈbrɪliənt/","pos":"a.","cn":"杰出的；明亮的；精彩的","en":"He came up with a brilliant idea.","tr":"他想出了一个绝妙的主意。","g":3},{"w":"aboard","ph":"/əˈbɔːrd/","pos":"ad.","cn":"在船上；上船","en":"All passengers aboard the flight were safe.","tr":"飞行中的所有乘客都是安全的。","g":3},{"w":"previous","ph":"/ˈpriːviəs/","pos":"a.","cn":"先前的；以前的","en":"The previous owner sold the house.","tr":"前屋主卖掉了房子。","g":3},{"w":"definite","ph":"/ˈdefɪnət/","pos":"a.","cn":"明确的；确定的；一定的","en":"We need a definite date for the meeting.","tr":"我们需要一个确切的会议日期。","g":3},{"w":"attract","ph":"/əˈtrækt/","pos":"v.","cn":"吸引；引起…的好感","en":"The city attracts many tourists.","tr":"这座城市吸引了许多游客。","g":3},{"w":"exercise","ph":"/ˈeksərsaɪz/","pos":"n.","cn":"练习；锻炼；行使","en":"Regular exercise is good for your health.","tr":"定期锻炼对你的健康有益。","g":3},{"w":"accuse","ph":"/əˈkjuːz/","pos":"v.","cn":"指控；指责","en":"They accused him of theft.","tr":"他们指控他偷窃。","g":3},{"w":"intention","ph":"/ɪnˈtenʃn/","pos":"n.","cn":"意图；目的；打算","en":"He had no intention of hurting her.","tr":"他无意伤害她。","g":3},{"w":"border","ph":"/ˈbɔːrdər/","pos":"n.","cn":"边境；边界；接壤","en":"They crossed the border into Canada.","tr":"他们越过边界进入了加拿大。","g":3},{"w":"academic","ph":"/ˌækəˈdemɪk/","pos":"a.","cn":"学术的；学院的","en":"She published an academic paper.","tr":"她发表了一篇学术论文。","g":3},{"w":"career","ph":"/kəˈrɪr/","pos":"n.","cn":"职业；生涯","en":"She had a successful career in law.","tr":"她在法律领域拥有成功的事业。","g":3},{"w":"determine","ph":"/dɪˈtɜːrmɪn/","pos":"v.","cn":"决定；确定；下决心","en":"We need to determine the cause of the problem.","tr":"我们需要确定问题的原因。","g":3},{"w":"alcohol","ph":"/ˈælkəhɔːl/","pos":"n.","cn":"酒精；酒","en":"The legal drinking age for alcohol is 21.","tr":"法定饮酒年龄是21岁。","g":3},{"w":"frequent","ph":"/ˈfriːkwənt/","pos":"a.","cn":"频繁的；经常的","en":"He is a frequent visitor to the museum.","tr":"他是博物馆的常客。","g":3},{"w":"fuel","ph":"/ˈfjuːəl/","pos":"n.","cn":"燃料；加油；刺激","en":"The car runs on diesel fuel.","tr":"这辆车使用柴油燃料。","g":3},{"w":"mission","ph":"/ˈmɪʃn/","pos":"n.","cn":"使命；任务；代表团","en":"The rescue mission was successful.","tr":"救援任务成功了。","g":3},{"w":"exact","ph":"/ɪɡˈzækt/","pos":"a.","cn":"精确的；准确的；严谨的","en":"Do you know the exact time of arrival?","tr":"你知道确切的到达时间吗？","g":3},{"w":"custom","ph":"/ˈkʌstəm/","pos":"n.","cn":"风俗；习惯；海关","en":"It is a local custom to celebrate this day.","tr":"庆祝这一天是当地的习俗。","g":3},{"w":"permit","ph":"/pərˈmɪt/","pos":"v.","cn":"允许；许可；许可证","en":"Smoking is not permitted here.","tr":"这里不允许吸烟。","g":3},{"w":"demand","ph":"/dɪˈmænd/","pos":"n.","cn":"要求；需求；需要","en":"The workers demanded higher wages.","tr":"工人们要求更高的工资。","g":3},{"w":"absence","ph":"/ˈæbsəns/","pos":"n.","cn":"缺席；不在","en":"His absence from the meeting was noted.","tr":"他未出席会议被注意到。","g":3},{"w":"failure","ph":"/ˈfeɪljər/","pos":"n.","cn":"失败；失败者；故障","en":"The project was a complete failure.","tr":"该项目彻底失败了。","g":3},{"w":"authority","ph":"/əˈθɔːrəti/","pos":"n.","cn":"权威；当局；权力","en":"The authorities are investigating the incident.","tr":"当局正在调查这起事件。","g":3},{"w":"gap","ph":"/ɡæp/","pos":"n.","cn":"差距；缺口；间隙","en":"There is a wide gap between the two walls.","tr":"两堵墙之间有很大的间隙。","g":3},{"w":"advocate","ph":"/ˈædvəkeɪt/","pos":"v.","cn":"提倡；拥护者","en":"He advocates for environmental protection.","tr":"他倡导环境保护。","g":3},{"w":"colleague","ph":"/ˈkɑːliːɡ/","pos":"n.","cn":"同事；同僚","en":"She had lunch with a colleague.","tr":"她和一个同事共进午餐。","g":3},{"w":"replace","ph":"/rɪˈpleɪs/","pos":"v.","cn":"替换；代替；放回原处","en":"The old machine was replaced with a new one.","tr":"旧机器被新机器替换了。","g":4},{"w":"organization","ph":"/ˌɔːrɡənəˈzeɪʃn/","pos":"n.","cn":"组织；机构；团体","en":"She works for a non-profit organization.","tr":"她在一家非营利组织工作。","g":4},{"w":"concentrate","ph":"/ˈkɑːnsntreɪt/","pos":"v.","cn":"集中；专注","en":"I can&#39;t concentrate with all this noise.","tr":"在这么吵闹的环境下我无法集中注意力。","g":4},{"w":"display","ph":"/dɪˈspleɪ/","pos":"n.","cn":"展示；显示；陈列","en":"The museum displays paintings from the 18th century.","tr":"博物馆展示了18世纪的绘画。","g":4},{"w":"bold","ph":"/boʊld/","pos":"a.","cn":"大胆的；粗体的","en":"He made a bold decision.","tr":"他做出了一个大胆的决定。","g":4},{"w":"accomplish","ph":"/əˈkɑːmplɪʃ/","pos":"v.","cn":"完成；实现","en":"They accomplished the mission successfully.","tr":"他们成功完成了任务。","g":4},{"w":"active","ph":"/ˈæktɪv/","pos":"a.","cn":"积极的；活跃的","en":"She leads an active lifestyle.","tr":"她过着活跃的生活方式。","g":4},{"w":"spread","ph":"/spred/","pos":"v.","cn":"展开；传播；蔓延；涂抹","en":"The news spread quickly.","tr":"新闻迅速传播开来。","g":4},{"w":"specific","ph":"/spəˈsɪfɪk/","pos":"a.","cn":"具体的；特定的；明确的","en":"Can you be more specific?","tr":"你能更具体一些吗？","g":4},{"w":"announce","ph":"/əˈnaʊns/","pos":"v.","cn":"宣布；通告","en":"The president announced the new policy.","tr":"总统宣布了新政策。","g":4},{"w":"trade","ph":"/treɪd/","pos":"n.","cn":"贸易；交易；行业；交换","en":"International trade is increasing.","tr":"国际贸易正在增加。","g":4},{"w":"extreme","ph":"/ɪkˈstriːm/","pos":"a.","cn":"极端的；极度的；极端","en":"They live in extreme poverty.","tr":"他们生活在极端贫困中。","g":4},{"w":"boost","ph":"/buːst/","pos":"v.","cn":"促进；提高；增加","en":"The new policy will boost growth.","tr":"这项新政策将促进增长。","g":4},{"w":"impact","ph":"/ˈɪmpækt/","pos":"n.","cn":"影响；冲击；撞击","en":"The impact of technology on education is huge.","tr":"技术对教育的影响是巨大的。","g":4},{"w":"anxiety","ph":"/æŋˈzaɪəti/","pos":"n.","cn":"焦虑；忧虑","en":"The exam caused her great anxiety.","tr":"考试让她感到非常焦虑。","g":4},{"w":"faith","ph":"/feɪθ/","pos":"n.","cn":"信仰；信任；信心","en":"She has great faith in her doctor.","tr":"她对她的医生非常有信心。","g":4},{"w":"attain","ph":"/əˈteɪn/","pos":"v.","cn":"达到；获得；实现","en":"She attained her goal of running a marathon.","tr":"她实现了自己跑马拉松的目标。","g":4},{"w":"engage","ph":"/ɪnˈɡeɪdʒ/","pos":"v.","cn":"从事；订婚；吸引；雇用","en":"He engaged in a heated debate.","tr":"他参与了一场激烈的辩论。","g":4},{"w":"apologize","ph":"/əˈpɑːlədʒaɪz/","pos":"v.","cn":"道歉；认错","en":"He apologized for being late.","tr":"他为迟到道歉。","g":4},{"w":"factor","ph":"/ˈfæktər/","pos":"n.","cn":"因素；要素；系数","en":"Hard work is a key factor in success.","tr":"努力工作是成功的关键因素。","g":4},{"w":"statement","ph":"/ˈsteɪtmənt/","pos":"n.","cn":"陈述；声明；报表","en":"The company issued a statement.","tr":"公司发表了一份声明。","g":4},{"w":"injure","ph":"/ˈɪndʒər/","pos":"v.","cn":"伤害；使受伤","en":"Two people were injured in the accident.","tr":"事故中有两人受伤。","g":4},{"w":"budget","ph":"/ˈbʌdʒɪt/","pos":"n.","cn":"预算；做预算","en":"We need to stay within budget.","tr":"我们需要在预算内。","g":4},{"w":"committee","ph":"/kəˈmɪti/","pos":"n.","cn":"委员会","en":"The committee decided to postpone the vote.","tr":"委员会决定推迟投票。","g":4},{"w":"exception","ph":"/ɪkˈsepʃn/","pos":"n.","cn":"例外；除外","en":"There is no rule without an exception.","tr":"没有不破例的规则。","g":4},{"w":"internal","ph":"/ɪnˈtɜːrnl/","pos":"a.","cn":"内部的；国内的；体内的","en":"The company conducted an internal investigation.","tr":"公司进行了一次内部调查。","g":4},{"w":"search","ph":"/sɜːrtʃ/","pos":"v.","cn":"搜索；搜寻；查找","en":"They searched for the missing child.","tr":"他们正在寻找失踪的孩子。","g":4},{"w":"district","ph":"/ˈdɪstrɪkt/","pos":"n.","cn":"地区；区域；行政区","en":"She lives in the financial district of the city.","tr":"她住在城市的金融区。","g":4},{"w":"investment","ph":"/ɪnˈvestmənt/","pos":"n.","cn":"投资；投入","en":"The company made a large investment.","tr":"公司进行了大笔投资。","g":4},{"w":"domestic","ph":"/dəˈmestɪk/","pos":"a.","cn":"国内的；家庭的；驯养的","en":"Domestic flights are often cheaper.","tr":"国内航班通常更便宜。","g":4},{"w":"deadline","ph":"/ˈdedlaɪn/","pos":"n.","cn":"截止日期","en":"The deadline for the project is Friday.","tr":"项目的截止日期是周五。","g":4},{"w":"confidence","ph":"/ˈkɑːnfɪdəns/","pos":"n.","cn":"信心；信任","en":"She has confidence in her abilities.","tr":"她对自己的能力有信心。","g":4},{"w":"interpret","ph":"/ɪnˈtɜːrprɪt/","pos":"v.","cn":"解释；口译；理解","en":"How do you interpret this sentence?","tr":"你怎么解释这句话？","g":4},{"w":"counter","ph":"/ˈkaʊntər/","pos":"n.","cn":"柜台；计数器；反驳","en":"She paid at the checkout counter.","tr":"她在收银台付了款。","g":4},{"w":"aggressive","ph":"/əˈɡresɪv/","pos":"a.","cn":"侵略的；好斗的；积极的","en":"The dog became aggressive when threatened.","tr":"当狗受到威胁时，它会变得具有攻击性。","g":4},{"w":"express","ph":"/ɪkˈspres/","pos":"v.","cn":"表达；表示；快车；快递","en":"He expressed his gratitude in a letter.","tr":"他在信中表达了感激之情。","g":4},{"w":"maintain","ph":"/meɪnˈteɪn/","pos":"v.","cn":"维持；保持；维修","en":"It&#39;s hard to maintain a long-distance relationship.","tr":"维持远距离关系很难。","g":4},{"w":"assist","ph":"/əˈsɪst/","pos":"v.","cn":"帮助；协助","en":"Can you assist me with this?","tr":"你能帮我一下吗？","g":4},{"w":"election","ph":"/ɪˈlekʃn/","pos":"n.","cn":"选举；当选","en":"The presidential election will be held next month.","tr":"总统选举将在下个月举行。","g":4},{"w":"effort","ph":"/ˈefərt/","pos":"n.","cn":"努力；成就；费力的事","en":"He made a great effort to finish on time.","tr":"他努力按时完成。","g":4},{"w":"agency","ph":"/ˈeɪdʒənsi/","pos":"n.","cn":"代理机构；中介","en":"She works for a travel agency.","tr":"她在一家旅行社工作。","g":4},{"w":"complain","ph":"/kəmˈpleɪn/","pos":"v.","cn":"抱怨；投诉","en":"He complained about the noise.","tr":"他对噪音表示抱怨。","g":4},{"w":"debate","ph":"/dɪˈbeɪt/","pos":"n.","cn":"辩论；争论","en":"The students took part in a heated debate.","tr":"学生们参加了一场激烈的辩论。","g":4},{"w":"inspire","ph":"/ɪnˈspaɪər/","pos":"v.","cn":"激励；鼓舞；赋予灵感","en":"Her story inspired many young people.","tr":"她的故事激励了很多年轻人。","g":4},{"w":"science","ph":"/ˈsaɪəns/","pos":"n.","cn":"科学；学科","en":"Science has changed our lives.","tr":"科学改变了我们的生活。","g":4},{"w":"ban","ph":"/bæn/","pos":"v.","cn":"禁止；禁令","en":"The government decided to ban smoking.","tr":"政府决定禁止吸烟。","g":4},{"w":"criticism","ph":"/ˈkrɪtɪsɪzəm/","pos":"n.","cn":"批评；批判","en":"He cannot take criticism.","tr":"他无法接受批评。","g":4},{"w":"finance","ph":"/ˈfaɪnæns/","pos":"n.","cn":"财政；金融；资金","en":"He is an expert in finance.","tr":"他是金融领域的专家。","g":4},{"w":"distribute","ph":"/dɪˈstrɪbjuːt/","pos":"v.","cn":"分配；分发；散布","en":"The organization distributed food to the poor.","tr":"该组织向穷人分发食物。","g":4},{"w":"adopt","ph":"/əˈdɑːpt/","pos":"v.","cn":"采用；收养","en":"They adopted a child.","tr":"他们收养了一个孩子。","g":4},{"w":"machine","ph":"/məˈʃiːn/","pos":"n.","cn":"机器；机械","en":"The machine is out of order.","tr":"机器出现故障。","g":4},{"w":"service","ph":"/ˈsɜːrvɪs/","pos":"n.","cn":"服务；维修；公共设施","en":"The customer service was excellent.","tr":"客户服务非常优秀。","g":4},{"w":"struggle","ph":"/ˈstrʌɡl/","pos":"v.","cn":"斗争；挣扎；努力","en":"She struggled to open the door.","tr":"她努力想要打开门。","g":4},{"w":"income","ph":"/ˈɪnkʌm/","pos":"n.","cn":"收入；收益","en":"He has a high monthly income.","tr":"他有很高的月收入。","g":4},{"w":"site","ph":"/saɪt/","pos":"n.","cn":"地点；位置；网站","en":"Visit our website for more information.","tr":"访问我们的网站获取更多信息。","g":4},{"w":"core","ph":"/kɔːr/","pos":"n.","cn":"核心；中心；果核","en":"The core of the problem is trust.","tr":"问题的核心是信任。","g":4},{"w":"confront","ph":"/kənˈfrʌnt/","pos":"v.","cn":"面对；对抗；遭遇","en":"We must confront our fears.","tr":"我们必须面对我们的恐惧。","g":4},{"w":"figure","ph":"/ˈfɪɡjər/","pos":"n.","cn":"数字；人物；体型；认为","en":"The sales figures are impressive.","tr":"销售数字令人印象深刻。","g":4},{"w":"discipline","ph":"/ˈdɪsəplɪn/","pos":"n.","cn":"纪律；学科；训练","en":"Self-discipline is key to success.","tr":"自律是成功的关键。","g":4},{"w":"suppose","ph":"/səˈpoʊz/","pos":"v.","cn":"猜想；假设；认为","en":"I suppose you&#39;re right.","tr":"我认为你是对的。","g":4},{"w":"motivate","ph":"/ˈmoʊtɪveɪt/","pos":"v.","cn":"激励；激发；促动","en":"She is highly motivated to succeed.","tr":"她非常有动力去成功。","g":4},{"w":"series","ph":"/ˈsɪriːz/","pos":"n.","cn":"系列；连续；丛书","en":"A series of events led to the war.","tr":"一系列事件导致了战争。","g":4},{"w":"leadership","ph":"/ˈliːdərʃɪp/","pos":"n.","cn":"领导；领导能力；领导层","en":"He showed strong leadership skills.","tr":"他展现了强大的领导能力。","g":4},{"w":"labor","ph":"/ˈleɪbər/","pos":"n.","cn":"劳动；工作；分娩","en":"Manual labor is physically demanding.","tr":"体力劳动非常耗费体力。","g":4},{"w":"proceed","ph":"/prəˈsiːd/","pos":"v.","cn":"继续；进行；前进","en":"Let&#39;s proceed with the plan.","tr":"让我们继续执行计划。","g":4},{"w":"emphasis","ph":"/ˈemfəsɪs/","pos":"n.","cn":"强调；重点；重音","en":"The school puts a lot of emphasis on discipline.","tr":"学校非常重视纪律。","g":4},{"w":"appoint","ph":"/əˈpɔɪnt/","pos":"v.","cn":"任命；约定","en":"They appointed him as manager.","tr":"他们任命他为经理。","g":4},{"w":"situation","ph":"/ˌsɪtʃuˈeɪʃn/","pos":"n.","cn":"情况；局势；位置","en":"The situation is under control.","tr":"情况已经得到控制。","g":4},{"w":"equal","ph":"/ˈiːkwəl/","pos":"a.","cn":"相等的；平等的；等于","en":"Divide the cake into equal parts.","tr":"将蛋糕切成等份。","g":4},{"w":"arise","ph":"/əˈraɪz/","pos":"v.","cn":"出现；产生；起来","en":"Problems arose during the project.","tr":"项目中出现了问题。","g":4},{"w":"bare","ph":"/ber/","pos":"a.","cn":"赤裸的；光秃的；勉强的","en":"The room was bare and empty.","tr":"房间空荡荡的。","g":4},{"w":"arouse","ph":"/əˈraʊz/","pos":"v.","cn":"引起；唤醒；唤起","en":"The film aroused their interest.","tr":"这部电影引起了他们的兴趣。","g":4},{"w":"incident","ph":"/ˈɪnsɪdənt/","pos":"n.","cn":"事件；事变；冲突","en":"The incident was reported to the police.","tr":"该事件已经报告给警方。","g":4},{"w":"behavior","ph":"/bɪˈheɪvjər/","pos":"n.","cn":"行为；举止；习性","en":"His behavior was unacceptable.","tr":"他的行为是不可接受的。","g":4},{"w":"lawyer","ph":"/ˈlɔːjər/","pos":"n.","cn":"律师","en":"He hired a lawyer to handle the case.","tr":"他雇了一名律师来处理这个案件。","g":4},{"w":"standard","ph":"/ˈstændərd/","pos":"n.","cn":"标准；水平；标准的","en":"The hotel is of a high standard.","tr":"这家酒店的标准很高。","g":4},{"w":"current","ph":"/ˈkɜːrənt/","pos":"a.","cn":"当前的；水流；趋势","en":"What is your current job?","tr":"你现在的工作是什么？","g":4},{"w":"intend","ph":"/ɪnˈtend/","pos":"v.","cn":"打算；计划；意指","en":"I intend to study abroad next year.","tr":"我打算明年出国留学。","g":4},{"w":"despite","ph":"/dɪˈspaɪt/","pos":"prep.","cn":"尽管；不管","en":"Despite the rain, they continued to play.","tr":"尽管下雨，他们还是继续玩。","g":4},{"w":"flight","ph":"/flaɪt/","pos":"n.","cn":"飞行；航班；逃跑","en":"The flight was delayed for two hours.","tr":"航班延误了两个小时。","g":4},{"w":"trouble","ph":"/ˈtrʌbl/","pos":"n.","cn":"麻烦；困难；烦恼","en":"I&#39;m having trouble with my computer.","tr":"我的电脑出了问题。","g":5},{"w":"conference","ph":"/ˈkɑːnfərəns/","pos":"n.","cn":"会议；讨论会","en":"She attended a conference on climate change.","tr":"她参加了一个关于气候变化的会议。","g":5},{"w":"absorb","ph":"/əbˈzɔːrb/","pos":"v.","cn":"吸收；吸引","en":"Plants absorb nutrients from the soil.","tr":"植物从土壤中吸收养分。","g":5},{"w":"element","ph":"/ˈelɪmənt/","pos":"n.","cn":"元素；要素；成分","en":"Trust is an essential element of any relationship.","tr":"信任是任何关系中必不可少的元素。","g":5},{"w":"eliminate","ph":"/ɪˈlɪmɪneɪt/","pos":"v.","cn":"消除；淘汰；排除","en":"We need to eliminate all sources of error.","tr":"我们需要消除所有错误的源头。","g":5},{"w":"inform","ph":"/ɪnˈfɔːrm/","pos":"v.","cn":"通知；告知；使了解","en":"Please inform us of any changes.","tr":"请告知我们任何变化。","g":5},{"w":"acute","ph":"/əˈkjuːt/","pos":"a.","cn":"严重的；敏锐的","en":"There is an acute shortage of water.","tr":"水的短缺非常严重。","g":5},{"w":"structure","ph":"/ˈstrʌktʃər/","pos":"n.","cn":"结构；构造；建筑物","en":"The structure of the essay is clear.","tr":"文章的结构清晰。","g":5},{"w":"admission","ph":"/ədˈmɪʃn/","pos":"n.","cn":"准许进入；承认；入场费","en":"Admission is free for children.","tr":"儿童免费入场。","g":5},{"w":"grasp","ph":"/ɡræsp/","pos":"v.","cn":"抓住；理解；掌握","en":"He quickly grasped the main idea.","tr":"他迅速理解了主要观点。","g":5},{"w":"gain","ph":"/ɡeɪn/","pos":"v.","cn":"获得；增加；受益","en":"He gained a lot of experience from the job.","tr":"他从工作中获得了丰富的经验。","g":5},{"w":"constant","ph":"/ˈkɑːnstənt/","pos":"a.","cn":"不断的；不变的；忠实的","en":"The constant noise annoyed me.","tr":"持续的噪音让我感到烦恼。","g":5},{"w":"justice","ph":"/ˈdʒʌstɪs/","pos":"n.","cn":"正义；公正；司法","en":"We demand justice.","tr":"我们要求正义。","g":5},{"w":"balance","ph":"/ˈbæləns/","pos":"n.","cn":"平衡；余额；权衡","en":"You need to keep a balance between work and life.","tr":"你需要在工作和生活之间保持平衡。","g":5},{"w":"serve","ph":"/sɜːrv/","pos":"v.","cn":"服务；提供；上菜；服役","en":"Breakfast is served from 7 to 9.","tr":"早餐从7点供应到9点。","g":5},{"w":"adequate","ph":"/ˈædɪkwət/","pos":"a.","cn":"足够的；适当的","en":"The supply is adequate for our needs.","tr":"供应足以满足我们的需求。","g":5},{"w":"solution","ph":"/səˈluːʃn/","pos":"n.","cn":"解决方案；溶液","en":"We need to find a solution to the problem.","tr":"我们需要找到解决问题的办法。","g":5},{"w":"suggest","ph":"/səˈdʒest/","pos":"v.","cn":"建议；暗示；表明","en":"I suggest we go by train.","tr":"我建议我们乘火车去。","g":5},{"w":"condition","ph":"/kənˈdɪʃn/","pos":"n.","cn":"条件；状况；环境","en":"The car is in good condition.","tr":"这辆车状况良好。","g":5},{"w":"exceed","ph":"/ɪkˈsiːd/","pos":"v.","cn":"超过；超越；越过","en":"The cost must not exceed $100.","tr":"成本不得超过100美元。","g":5},{"w":"imply","ph":"/ɪmˈplaɪ/","pos":"v.","cn":"暗示；意味着","en":"What are you implying?","tr":"你暗示的是什么？","g":5},{"w":"abuse","ph":"/əˈbjuːs/","pos":"n.","cn":"滥用；虐待","en":"Drug abuse is a serious problem.","tr":"药物滥用是一个严重的问题。","g":5},{"w":"ally","ph":"/ˈælaɪ/","pos":"n.","cn":"同盟国；盟友；结盟","en":"Canada is a close ally of the U.S.","tr":"加拿大是美国的紧密盟友。","g":5},{"w":"found","ph":"/faʊnd/","pos":"v.","cn":"建立；创立；创办","en":"The college was founded in 1850.","tr":"这所大学成立于1850年。","g":5},{"w":"negative","ph":"/ˈneɡətɪv/","pos":"a.","cn":"消极的；否定的；负面的","en":"Don&#39;t be so negative about everything.","tr":"不要对一切都这么消极。","g":5},{"w":"excellent","ph":"/ˈeksələnt/","pos":"a.","cn":"优秀的；极好的；杰出的","en":"She did an excellent job on the project.","tr":"她在项目上做得非常出色。","g":5},{"w":"corporate","ph":"/ˈkɔːrpərət/","pos":"a.","cn":"公司的；法人的","en":"He works in the corporate sector.","tr":"他在企业部门工作。","g":5},{"w":"carbon","ph":"/ˈkɑːrbən/","pos":"n.","cn":"碳","en":"Carbon dioxide causes global warming.","tr":"二氧化碳导致全球变暖。","g":5},{"w":"handle","ph":"/ˈhændl/","pos":"v.","cn":"处理；操作；把手","en":"She knows how to handle difficult customers.","tr":"她知道如何处理难缠的顾客。","g":5},{"w":"height","ph":"/haɪt/","pos":"n.","cn":"高度；身高；顶点","en":"He is of average height.","tr":"他的身高是中等。","g":5},{"w":"challenge","ph":"/ˈtʃælɪndʒ/","pos":"n.","cn":"挑战；质疑","en":"This job is a real challenge.","tr":"这项工作真是一个挑战。","g":5},{"w":"occasion","ph":"/əˈkeɪʒn/","pos":"n.","cn":"场合；机会；时机；起因","en":"He only wears a suit on special occasions.","tr":"他只在特殊场合穿西装。","g":5},{"w":"concept","ph":"/ˈkɑːnsept/","pos":"n.","cn":"概念；观念","en":"The concept of time travel is fascinating.","tr":"时间旅行的概念很迷人。","g":5},{"w":"cooperate","ph":"/koʊˈɑːpəreɪt/","pos":"v.","cn":"合作；协作","en":"The two companies cooperated on the project.","tr":"两家公司在项目上进行了合作。","g":5},{"w":"investigate","ph":"/ɪnˈvestɪɡeɪt/","pos":"v.","cn":"调查；研究；审查","en":"The police are investigating the case.","tr":"警方正在调查这个案件。","g":5},{"w":"acquisition","ph":"/ˌækwɪˈzɪʃn/","pos":"n.","cn":"获得；收购","en":"The company announced a new acquisition.","tr":"公司宣布了一项新的收购。","g":5},{"w":"employee","ph":"/ɪmˈplɔɪiː/","pos":"n.","cn":"雇员；员工","en":"All employees must attend the training.","tr":"所有员工必须参加培训。","g":5},{"w":"claim","ph":"/kleɪm/","pos":"v.","cn":"声称；索赔；要求","en":"He claims that he is innocent.","tr":"他声称自己是无辜的。","g":5},{"w":"adventure","ph":"/ədˈventʃər/","pos":"n.","cn":"冒险；奇遇","en":"They set off on an adventure.","tr":"他们开始了冒险之旅。","g":5},{"w":"conventional","ph":"/kənˈvenʃənl/","pos":"a.","cn":"传统的；惯例的；常规的","en":"He lives a conventional life.","tr":"他过着传统的生活。","g":5},{"w":"grateful","ph":"/ˈɡreɪtfl/","pos":"a.","cn":"感激的；感谢的","en":"I&#39;m very grateful for your help.","tr":"我非常感激你的帮助。","g":5},{"w":"advertise","ph":"/ˈædvərtaɪz/","pos":"v.","cn":"做广告；宣传","en":"The company advertised its products online.","tr":"公司在网上对其产品进行了广告宣传。","g":5},{"w":"explain","ph":"/ɪkˈspleɪn/","pos":"v.","cn":"解释；说明；阐明","en":"Can you explain how the machine works?","tr":"你能解释一下这台机器是如何工作的吗？","g":5},{"w":"biology","ph":"/baɪˈɑːlədʒi/","pos":"n.","cn":"生物学","en":"She studied biology at university.","tr":"她在大学学习生物。","g":5},{"w":"absolute","ph":"/ˈæbsəluːt/","pos":"a.","cn":"绝对的；完全的","en":"He demanded absolute loyalty.","tr":"他要求绝对的忠诚。","g":5},{"w":"consume","ph":"/kənˈsuːm/","pos":"v.","cn":"消费；消耗；吃","en":"We consume a lot of energy every day.","tr":"我们每天消耗大量的能量。","g":5},{"w":"aspect","ph":"/ˈæspekt/","pos":"n.","cn":"方面；层面；外观","en":"We considered every aspect of the problem.","tr":"我们考虑了问题的各个方面。","g":5},{"w":"safe","ph":"/seɪf/","pos":"a.","cn":"安全的；平安的","en":"Is the water safe to drink?","tr":"水可以安全饮用吗？","g":5},{"w":"deliver","ph":"/dɪˈlɪvər/","pos":"v.","cn":"递送；发表；接生","en":"The mailman delivers letters every morning.","tr":"邮差每天早上送信。","g":5},{"w":"ancient","ph":"/ˈeɪnʃənt/","pos":"a.","cn":"古代的；古老的","en":"They discovered an ancient temple.","tr":"他们发现了一座古老的神庙。","g":5},{"w":"similar","ph":"/ˈsɪmələr/","pos":"a.","cn":"相似的；类似的","en":"The two houses are similar in style.","tr":"这两座房子风格相似。","g":5},{"w":"overcome","ph":"/ˌoʊvərˈkʌm/","pos":"v.","cn":"克服；战胜","en":"She managed to overcome her fear.","tr":"她设法克服了她的恐惧。","g":5},{"w":"contrast","ph":"/ˈkɑːntræst/","pos":"n.","cn":"对比；对照；差异","en":"The contrast between the two pictures is striking.","tr":"两张图片之间的对比是惊人的。","g":5},{"w":"comprehension","ph":"/ˌkɑːmprɪˈhenʃn/","pos":"n.","cn":"理解；理解力","en":"Reading comprehension is important.","tr":"阅读理解很重要。","g":5},{"w":"instance","ph":"/ˈɪnstəns/","pos":"n.","cn":"例子；实例；情况","en":"In this instance, I agree with you.","tr":"在这种情况下，我同意你的看法。","g":5},{"w":"abolish","ph":"/əˈbɑːlɪʃ/","pos":"v.","cn":"废除；取消","en":"Slavery was abolished in the 19th century.","tr":"19世纪废除了奴隶制。","g":5},{"w":"conflict","ph":"/ˈkɑːnflɪkt/","pos":"n.","cn":"冲突；矛盾；战斗","en":"The conflict between the two countries lasted years.","tr":"两国之间的冲突持续了多年。","g":5},{"w":"succeed","ph":"/səkˈsiːd/","pos":"v.","cn":"成功；继承；继任","en":"She succeeded in passing the exam.","tr":"她成功通过了考试。","g":5},{"w":"conduct","ph":"/kənˈdʌkt/","pos":"v.","cn":"实施；行为；指挥","en":"They conducted a survey.","tr":"他们进行了一项调查。","g":5},{"w":"disaster","ph":"/dɪˈzæstər/","pos":"n.","cn":"灾难；彻底的失败","en":"The earthquake was the worst natural disaster in decades.","tr":"这次地震是数十年来最严重的自然灾害。","g":5},{"w":"largely","ph":"/ˈlɑːrdʒli/","pos":"ad.","cn":"主要地；很大程度上","en":"The success was largely due to her efforts.","tr":"成功很大程度上归功于她的努力。","g":5},{"w":"release","ph":"/rɪˈliːs/","pos":"v.","cn":"释放；发布；发行","en":"The new album will be released next month.","tr":"新专辑将在下个月发布。","g":5},{"w":"expose","ph":"/ɪkˈspoʊz/","pos":"v.","cn":"暴露；揭露；使接触","en":"The report exposed the company&#39;s illegal activities.","tr":"报告揭露了公司的非法活动。","g":5},{"w":"channel","ph":"/ˈtʃænl/","pos":"n.","cn":"频道；渠道；海峡","en":"What&#39;s on the other channel?","tr":"另一个频道上有什么节目？","g":5},{"w":"cancel","ph":"/ˈkænsl/","pos":"v.","cn":"取消；撤销","en":"The flight was canceled due to snow.","tr":"由于下雪，航班被取消了。","g":5},{"w":"bacteria","ph":"/bækˈtɪriə/","pos":"n.","cn":"细菌","en":"Bacteria can cause disease.","tr":"细菌可以引起疾病。","g":5},{"w":"chief","ph":"/tʃiːf/","pos":"a.","cn":"主要的；首领","en":"The chief problem is lack of time.","tr":"主要问题是缺乏时间。","g":5},{"w":"electric","ph":"/ɪˈlektrɪk/","pos":"a.","cn":"电的；电动的","en":"The atmosphere was electric.","tr":"气氛非常热烈。","g":5},{"w":"agriculture","ph":"/ˈæɡrɪkʌltʃər/","pos":"n.","cn":"农业","en":"Agriculture is vital to the economy.","tr":"农业对经济至关重要。","g":5},{"w":"individual","ph":"/ˌɪndɪˈvɪdʒuəl/","pos":"a.","cn":"个人的；单独的；个人","en":"We value the rights of the individual.","tr":"我们重视个人的权利。","g":5},{"w":"alliance","ph":"/əˈlaɪəns/","pos":"n.","cn":"联盟；同盟","en":"The two countries formed an alliance.","tr":"两国形成了联盟。","g":5},{"w":"minimum","ph":"/ˈmɪnɪməm/","pos":"a.","cn":"最小的；最低的；最小值","en":"The minimum wage will increase.","tr":"最低工资将会增加。","g":5},{"w":"fund","ph":"/fʌnd/","pos":"n.","cn":"基金；资金；资助","en":"The project is funded by the government.","tr":"该项目由政府资助。","g":5},{"w":"analysis","ph":"/əˈnæləsɪs/","pos":"n.","cn":"分析；解析","en":"The analysis of the results took hours.","tr":"分析结果花费了数小时。","g":5},{"w":"crime","ph":"/kraɪm/","pos":"n.","cn":"犯罪；罪行","en":"The crime rate has fallen.","tr":"犯罪率已经下降。","g":5},{"w":"destination","ph":"/ˌdestɪˈneɪʃn/","pos":"n.","cn":"目的地；终点","en":"The package has reached its destination.","tr":"包裹已经到达目的地。","g":5},{"w":"band","ph":"/bænd/","pos":"n.","cn":"乐队；带；波段","en":"He plays guitar in a rock band.","tr":"他在摇滚乐队里弹吉他。","g":5},{"w":"dramatic","ph":"/drəˈmætɪk/","pos":"a.","cn":"戏剧性的；巨大的；引人注目的","en":"There was a dramatic increase in prices.","tr":"价格戏剧性地上涨了。","g":5},{"w":"combine","ph":"/kəmˈbaɪn/","pos":"v.","cn":"结合；联合","en":"Combine the ingredients in a bowl.","tr":"将配料混合在一个碗里。","g":5},{"w":"majority","ph":"/məˈdʒɔːrəti/","pos":"n.","cn":"大多数；多数派","en":"The majority of people agree with the plan.","tr":"大多数人同意这个计划。","g":5},{"w":"chemistry","ph":"/ˈkemɪstri/","pos":"n.","cn":"化学","en":"He studied chemistry in college.","tr":"他在大学学习了化学。","g":6},{"w":"mobile","ph":"/ˈmoʊbl/","pos":"a.","cn":"移动的；流动的；机动的","en":"Mobile phones are essential nowadays.","tr":"现在手机是必不可少的。","g":6},{"w":"attempt","ph":"/əˈtempt/","pos":"n.","cn":"尝试；企图","en":"He made an attempt to climb the mountain.","tr":"他尝试攀登那座山。","g":6},{"w":"ambition","ph":"/æmˈbɪʃn/","pos":"n.","cn":"野心；雄心；志向","en":"His ambition is to become a CEO.","tr":"他的雄心是成为CEO。","g":6},{"w":"abortion","ph":"/əˈbɔːrʃn/","pos":"n.","cn":"流产；堕胎","en":"The issue of abortion remains controversial.","tr":"堕胎问题仍然存在争议。","g":6},{"w":"convenience","ph":"/kənˈviːniəns/","pos":"n.","cn":"方便；便利","en":"For convenience, we live near the station.","tr":"为了方便，我们住在靠近车站的地方。","g":6},{"w":"electronic","ph":"/ɪˌlekˈtrɑːnɪk/","pos":"a.","cn":"电子的；电子设备的","en":"Electronic devices are not allowed during takeoff.","tr":"起飞过程中不允许使用电子设备。","g":6},{"w":"consist","ph":"/kənˈsɪst/","pos":"v.","cn":"由...组成；在于","en":"The team consists of five members.","tr":"这个团队由五名成员组成。","g":6},{"w":"facility","ph":"/fəˈsɪləti/","pos":"n.","cn":"设施；设备；场所","en":"The hotel has excellent sports facilities.","tr":"这家酒店拥有极好的体育设施。","g":6},{"w":"guarantee","ph":"/ˌɡærənˈtiː/","pos":"n.","cn":"保证；担保；保修","en":"The product comes with a one-year guarantee.","tr":"产品附带一年的保证。","g":6},{"w":"safety","ph":"/ˈseɪfti/","pos":"n.","cn":"安全；安全性","en":"Safety is our top priority.","tr":"安全是我们的首要任务。","g":6},{"w":"resource","ph":"/ˈriːsɔːrs/","pos":"n.","cn":"资源；财力；智谋","en":"Water is a precious resource.","tr":"水是一种宝贵的资源。","g":6},{"w":"campaign","ph":"/kæmˈpeɪn/","pos":"n.","cn":"运动；战役","en":"They launched an advertising campaign.","tr":"他们发起了一场广告活动。","g":6},{"w":"consider","ph":"/kənˈsɪdər/","pos":"v.","cn":"考虑；认为","en":"Please consider my proposal.","tr":"请考虑我的提案。","g":6},{"w":"influence","ph":"/ˈɪnfluəns/","pos":"n.","cn":"影响；作用；势力","en":"She had a great influence on my career.","tr":"她对我的职业生涯产生了巨大的影响。","g":6},{"w":"length","ph":"/leŋθ/","pos":"n.","cn":"长度；时间长短；一段","en":"The river is 300 miles in length.","tr":"这条河有300英里长。","g":6},{"w":"innovation","ph":"/ˌɪnəˈveɪʃn/","pos":"n.","cn":"创新；改革；新方法","en":"Technological innovation drives economic growth.","tr":"技术创新推动经济增长。","g":6},{"w":"alter","ph":"/ˈɔːltər/","pos":"v.","cn":"改变；更改","en":"We had to alter our plans.","tr":"我们不得不改变我们的计划。","g":6},{"w":"lack","ph":"/læk/","pos":"n.","cn":"缺乏；不足；没有","en":"The project failed due to a lack of funds.","tr":"项目因为缺乏资金而失败。","g":6},{"w":"conservation","ph":"/ˌkɑːnsərˈveɪʃn/","pos":"n.","cn":"保护；保存；节约","en":"Water conservation is essential.","tr":"节水至关重要。","g":6},{"w":"style","ph":"/staɪl/","pos":"n.","cn":"风格；方式；款式","en":"She has a unique style of dressing.","tr":"她的穿着风格独特。","g":6},{"w":"feedback","ph":"/ˈfiːdbæk/","pos":"n.","cn":"反馈；反应","en":"We welcome feedback from our customers.","tr":"我们欢迎客户的反馈。","g":6},{"w":"source","ph":"/sɔːrs/","pos":"n.","cn":"来源；根源；出处","en":"The river is the source of the city&#39;s water.","tr":"这条河是城市水源的源头。","g":6},{"w":"crucial","ph":"/ˈkruːʃl/","pos":"a.","cn":"至关重要的；决定性的","en":"This decision is crucial for the future.","tr":"这个决定对未来发展至关重要。","g":6},{"w":"era","ph":"/ˈɪrə/","pos":"n.","cn":"时代；年代；纪元","en":"We are living in the digital era.","tr":"我们正生活在一个数字化的时代。","g":6},{"w":"equipment","ph":"/ɪˈkwɪpmənt/","pos":"n.","cn":"设备；装备；器材","en":"The gym has modern equipment.","tr":"健身房有现代化的设备。","g":6},{"w":"delicate","ph":"/ˈdelɪkət/","pos":"a.","cn":"精致的；脆弱的；微妙的","en":"Be careful with those delicate glasses.","tr":"小心那些易碎的玻璃杯。","g":6},{"w":"executive","ph":"/ɪɡˈzekjətɪv/","pos":"n.","cn":"执行官；行政的；管理的","en":"She is a senior executive in the company.","tr":"她在公司是一名高级管理人员。","g":6},{"w":"disturb","ph":"/dɪˈstɜːrb/","pos":"v.","cn":"打扰；妨碍；使焦虑","en":"Please do not disturb the sleeping baby.","tr":"请不要打扰正在睡觉的宝宝。","g":6},{"w":"intelligence","ph":"/ɪnˈtelɪdʒəns/","pos":"n.","cn":"智力；情报；智能","en":"Artificial intelligence is advancing rapidly.","tr":"人工智能正在快速发展。","g":6},{"w":"classic","ph":"/ˈklæsɪk/","pos":"a.","cn":"经典的；古典的","en":"This novel is a classic.","tr":"这本小说是经典之作。","g":6},{"w":"identify","ph":"/aɪˈdentɪfaɪ/","pos":"v.","cn":"识别；确认；认同","en":"She identified the suspect.","tr":"她认出了嫌疑人。","g":6},{"w":"capacity","ph":"/kəˈpæsəti/","pos":"n.","cn":"能力；容量；身份","en":"The stadium has a capacity of 50,000.","tr":"体育场的容量是50,000个座位。","g":6},{"w":"locate","ph":"/ˈloʊkeɪt/","pos":"v.","cn":"找到；位于；使坐落于","en":"The hotel is located in the city center.","tr":"酒店位于市中心。","g":6},{"w":"establish","ph":"/ɪˈstæblɪʃ/","pos":"v.","cn":"建立；设立；确立","en":"The company was established in 1990.","tr":"该公司成立于1990年。","g":6},{"w":"sale","ph":"/seɪl/","pos":"n.","cn":"销售；出售；大减价","en":"The house is for sale.","tr":"这房子正在出售。","g":6},{"w":"therefore","ph":"/ˈðerfɔːr/","pos":"ad.","cn":"因此；所以","en":"He was ill, therefore he stayed home.","tr":"他生病了，因此他待在家里。","g":6},{"w":"discount","ph":"/ˈdɪskaʊnt/","pos":"n.","cn":"折扣","en":"They offered a 20% discount on all items.","tr":"所有商品都提供20%的折扣。","g":6},{"w":"capital","ph":"/ˈkæpɪtl/","pos":"n.","cn":"首都；资本；大写字母","en":"Beijing is the capital of China.","tr":"北京是中国的首都。","g":6},{"w":"adjust","ph":"/əˈdʒʌst/","pos":"v.","cn":"调整；适应","en":"He adjusted his tie.","tr":"他调整了领带。","g":6},{"w":"fashion","ph":"/ˈfæʃn/","pos":"n.","cn":"时尚；时装；方式","en":"She always follows the latest fashion.","tr":"她总是追随最新时尚。","g":6},{"w":"charge","ph":"/tʃɑːrdʒ/","pos":"v.","cn":"收费；充电；指控；负责","en":"They charge $10 for delivery.","tr":"他们收取10美元的送货费。","g":6},{"w":"stage","ph":"/steɪdʒ/","pos":"n.","cn":"阶段；舞台；步骤","en":"The project is in its early stages.","tr":"项目尚处于初期阶段。","g":6},{"w":"entertainment","ph":"/ˌentərˈteɪnmənt/","pos":"n.","cn":"娱乐；消遣；款待","en":"Television is a popular form of entertainment.","tr":"电视是一种流行的娱乐方式。","g":6},{"w":"fault","ph":"/fɔːlt/","pos":"n.","cn":"错误；缺点；故障","en":"It&#39;s not my fault that the vase broke.","tr":"花瓶破碎不是我的错。","g":6},{"w":"strength","ph":"/streŋθ/","pos":"n.","cn":"力量；强度；优点","en":"He has great physical strength.","tr":"他拥有巨大的体力。","g":6},{"w":"topic","ph":"/ˈtɑːpɪk/","pos":"n.","cn":"主题；话题","en":"The topic of the speech is climate change.","tr":"演讲的主题是气候变化。","g":6},{"w":"brief","ph":"/briːf/","pos":"a.","cn":"简短的；摘要","en":"Please give a brief introduction.","tr":"请简短介绍一下。","g":6},{"w":"scene","ph":"/siːn/","pos":"n.","cn":"景色；现场；情景","en":"The police arrived at the scene.","tr":"警察到达了现场。","g":6},{"w":"impress","ph":"/ɪmˈpres/","pos":"v.","cn":"给…留下深刻印象；使铭记","en":"Her performance impressed everyone.","tr":"她的表演让每个人都印象深刻。","g":6},{"w":"device","ph":"/dɪˈvaɪs/","pos":"n.","cn":"装置；设备；手段","en":"The device can translate speech into text.","tr":"该设备可以将语音转换为文本。","g":6},{"w":"management","ph":"/ˈmænɪdʒmənt/","pos":"n.","cn":"管理；经营；管理层","en":"Good management is essential for success.","tr":"良好的管理对于成功至关重要。","g":6},{"w":"goal","ph":"/ɡoʊl/","pos":"n.","cn":"目标；目的；球门","en":"His goal is to become a lawyer.","tr":"他的目标是成为一名律师。","g":6},{"w":"objective","ph":"/əbˈdʒektɪv/","pos":"n.","cn":"目标；目的；客观的","en":"We need to set clear objectives.","tr":"我们需要设定清晰的目标。","g":6},{"w":"comment","ph":"/ˈkɑːment/","pos":"n.","cn":"评论；意见","en":"No comment.","tr":"无评论。","g":6},{"w":"aside","ph":"/əˈsaɪd/","pos":"ad.","cn":"在旁边；到一边","en":"She stepped aside to let him pass.","tr":"她侧身让他过去。","g":6},{"w":"debt","ph":"/det/","pos":"n.","cn":"债务；恩情","en":"He borrowed money and is now deep in debt.","tr":"他借了钱，现在债务沉重。","g":6},{"w":"educate","ph":"/ˈedʒukeɪt/","pos":"v.","cn":"教育；培养；教导","en":"Parents should educate their children about safety.","tr":"父母应该教育他们的孩子注意安全。","g":6},{"w":"captain","ph":"/ˈkæptɪn/","pos":"n.","cn":"队长；船长；上尉","en":"The captain led the team to victory.","tr":"队长带领团队走向胜利。","g":6},{"w":"create","ph":"/kriˈeɪt/","pos":"v.","cn":"创造；创建","en":"We want to create a better future.","tr":"我们想要创造一个更美好的未来。","g":6},{"w":"expense","ph":"/ɪkˈspens/","pos":"n.","cn":"花费；代价；开支","en":"The expense of living in the city is high.","tr":"在城市生活的开销很大。","g":6},{"w":"explore","ph":"/ɪkˈsplɔːr/","pos":"v.","cn":"探索；探测；探究","en":"They explored the jungle for new species.","tr":"他们探索了丛林，寻找新物种。","g":6},{"w":"chemical","ph":"/ˈkemɪkl/","pos":"a.","cn":"化学的；化学品","en":"The factory uses harmful chemicals.","tr":"工厂使用有害化学品。","g":6},{"w":"formal","ph":"/ˈfɔːrml/","pos":"a.","cn":"正式的；正规的；形式上的","en":"He wore a formal suit to the interview.","tr":"他穿着正式西装去面试。","g":6},{"w":"vital","ph":"/ˈvaɪtl/","pos":"a.","cn":"至关重要的；有活力的","en":"Exercise is vital for good health.","tr":"锻炼对健康至关重要。","g":6},{"w":"candidate","ph":"/ˈkændɪdət/","pos":"n.","cn":"候选人；应试者","en":"There are three candidates for the job.","tr":"有三个人竞争这份工作。","g":6},{"w":"emergency","ph":"/ɪˈmɜːrdʒənsi/","pos":"n.","cn":"紧急情况；突发事件","en":"Call me only in case of emergency.","tr":"只在紧急情况下联系我。","g":6},{"w":"thus","ph":"/ðʌs/","pos":"ad.","cn":"因此；这样；从而","en":"Thus, we can conclude that...","tr":"因此，我们可以得出结论……","g":6},{"w":"burst","ph":"/bɜːrst/","pos":"v.","cn":"爆发；突然出现；爆裂","en":"The balloon burst suddenly.","tr":"气球突然爆裂了。","g":6},{"w":"barrier","ph":"/ˈbæriər/","pos":"n.","cn":"障碍；屏障","en":"Language is no longer a barrier.","tr":"语言不再是障碍。","g":6},{"w":"advantage","ph":"/ədˈvæntɪdʒ/","pos":"n.","cn":"优势；有利条件","en":"Good communication gives you an advantage.","tr":"良好的沟通能给你带来优势。","g":6},{"w":"commission","ph":"/kəˈmɪʃn/","pos":"n.","cn":"委员会；佣金","en":"The commission will investigate the issue.","tr":"委员会将调查这个问题。","g":6},{"w":"earn","ph":"/ɜːrn/","pos":"v.","cn":"赚得；赢得；获得","en":"He earns a good salary.","tr":"他赚的薪水很好。","g":6},{"w":"harm","ph":"/hɑːrm/","pos":"n.","cn":"伤害；损害；危害","en":"Too much sun can harm your skin.","tr":"过多的阳光会伤害你的皮肤。","g":6},{"w":"speech","ph":"/spiːtʃ/","pos":"n.","cn":"演讲；讲话；言语能力","en":"He gave a moving speech.","tr":"他发表了一场感人的演讲。","g":6},{"w":"effective","ph":"/ɪˈfektɪv/","pos":"a.","cn":"有效的；起作用的","en":"The new method is more effective than the old one.","tr":"新方法比旧方法更有效。","g":6},{"w":"admire","ph":"/ədˈmaɪər/","pos":"v.","cn":"钦佩；赞赏","en":"I admire her courage.","tr":"我钦佩她的勇气。","g":6},{"w":"proportion","ph":"/prəˈpɔːrʃn/","pos":"n.","cn":"比例；部分；均衡","en":"A large proportion of the students are from abroad.","tr":"很大一部分学生来自国外。","g":6},{"w":"assign","ph":"/əˈsaɪn/","pos":"v.","cn":"分配；指派；指定","en":"The teacher assigned homework.","tr":"老师布置了家庭作业。","g":6},{"w":"primary","ph":"/ˈpraɪmeri/","pos":"a.","cn":"首要的；初级的；基本的","en":"The primary goal is to make money.","tr":"主要目标是赚钱。","g":6},{"w":"academy","ph":"/əˈkædəmi/","pos":"n.","cn":"学院；研究院","en":"He studied at a military academy.","tr":"他在军事学院学习。","g":7},{"w":"sense","ph":"/sens/","pos":"n.","cn":"感觉；意义；理智；意识到","en":"She has a good sense of humor.","tr":"她很有幽默感。","g":7},{"w":"image","ph":"/ˈɪmɪdʒ/","pos":"n.","cn":"形象；图像；影像","en":"The company wants to improve its public image.","tr":"公司想要改善其公共形象。","g":7},{"w":"capture","ph":"/ˈkæptʃər/","pos":"v.","cn":"捕获；俘获；引起注意","en":"The police captured the thief.","tr":"警察抓住了小偷。","g":7},{"w":"minor","ph":"/ˈmaɪnər/","pos":"a.","cn":"较小的；次要的；未成年人","en":"It&#39;s a minor problem.","tr":"这是个小问题。","g":7},{"w":"citizen","ph":"/ˈsɪtɪzn/","pos":"n.","cn":"公民；市民","en":"He is a British citizen.","tr":"他是一位英国公民。","g":7},{"w":"feature","ph":"/ˈfiːtʃər/","pos":"n.","cn":"特征；特点；以…为特色","en":"The new phone has many advanced features.","tr":"新手机有很多先进功能。","g":7},{"w":"chain","ph":"/tʃeɪn/","pos":"n.","cn":"链子；连锁；一系列","en":"He owns a chain of restaurants.","tr":"他拥有一连锁餐厅。","g":7},{"w":"correspond","ph":"/ˌkɔːrəˈspɑːnd/","pos":"v.","cn":"符合；通信；对应","en":"Your actions must correspond with your words.","tr":"你的行动必须与你的话语相符。","g":7},{"w":"employment","ph":"/ɪmˈplɔɪmənt/","pos":"n.","cn":"就业；工作；使用","en":"The government aims to increase employment.","tr":"政府旨在增加就业。","g":7},{"w":"celebrate","ph":"/ˈselɪbreɪt/","pos":"v.","cn":"庆祝；赞美","en":"We celebrated her birthday with a party.","tr":"我们举办了一个派对来庆祝她的生日。","g":7},{"w":"ancestor","ph":"/ˈænsestər/","pos":"n.","cn":"祖先；祖宗","en":"Our ancestors lived in caves.","tr":"我们的祖先生活在洞穴里。","g":7},{"w":"illustrate","ph":"/ˈɪləstreɪt/","pos":"v.","cn":"说明；举例说明；加插图","en":"The graph illustrates the growth trend.","tr":"图表展示了增长趋势。","g":7},{"w":"existence","ph":"/ɪɡˈzɪstəns/","pos":"n.","cn":"存在；生存；生活","en":"The organization has been in existence for 20 years.","tr":"该组织已经存在了20年。","g":7},{"w":"courage","ph":"/ˈkɜːrɪdʒ/","pos":"n.","cn":"勇气；胆量","en":"He showed great courage.","tr":"他展现了巨大的勇气。","g":7},{"w":"approach","ph":"/əˈproʊtʃ/","pos":"n.","cn":"方法；接近；着手处理","en":"They took a new approach to teaching.","tr":"他们采取了一种新的教学方法。","g":7},{"w":"describe","ph":"/dɪˈskraɪb/","pos":"v.","cn":"描述；形容；画出","en":"Can you describe the man you saw?","tr":"你能描述一下你看到的那个男人吗？","g":7},{"w":"apart","ph":"/əˈpɑːrt/","pos":"ad.","cn":"分开地；相距","en":"The two houses are 10 miles apart.","tr":"这两栋房子相隔10英里。","g":7},{"w":"suffer","ph":"/ˈsʌfər/","pos":"v.","cn":"遭受；忍受；受苦","en":"He suffered from a headache.","tr":"他头疼。","g":7},{"w":"institution","ph":"/ˌɪnstɪˈtuːʃn/","pos":"n.","cn":"机构；制度；建立","en":"Marriage is a social institution.","tr":"婚姻是一种社会制度。","g":7},{"w":"cell","ph":"/sel/","pos":"n.","cn":"细胞；小牢房；手机","en":"He was locked in a prison cell.","tr":"他被锁在了牢房里。","g":7},{"w":"abstract","ph":"/ˈæbstrækt/","pos":"a.","cn":"抽象的；摘要","en":"The concept is too abstract to understand.","tr":"这个概念太抽象，难以理解。","g":7},{"w":"excitement","ph":"/ɪkˈsaɪtmənt/","pos":"n.","cn":"兴奋；激动；令人兴奋的事","en":"She couldn&#39;t hide her excitement.","tr":"她无法掩饰她的兴奋。","g":7},{"w":"extend","ph":"/ɪkˈstend/","pos":"v.","cn":"延伸；扩大；给予；延续","en":"The meeting extended into the evening.","tr":"会议持续到了晚上。","g":7},{"w":"economy","ph":"/ɪˈkɑːnəmi/","pos":"n.","cn":"经济；节约","en":"The global economy is growing slowly.","tr":"全球经济正在缓慢增长。","g":7},{"w":"analyse","ph":"/ˈænəlaɪz/","pos":"v.","cn":"分析","en":"We need to analyse the data.","tr":"我们需要分析数据。","g":7},{"w":"former","ph":"/ˈfɔːrmər/","pos":"a.","cn":"从前的；前者的；前任的","en":"The former president gave a speech.","tr":"前总统发表了一次演讲。","g":7},{"w":"chairman","ph":"/ˈtʃermən/","pos":"n.","cn":"主席；董事长","en":"The chairman opened the meeting.","tr":"主席打开了会议。","g":7},{"w":"alternative","ph":"/ɔːlˈtɜːrnətɪv/","pos":"n.","cn":"替代的；供替代的选择","en":"We need an alternative approach.","tr":"我们需要一种替代方法。","g":7},{"w":"accelerate","ph":"/əkˈseləreɪt/","pos":"v.","cn":"加速；促进","en":"The car accelerated smoothly.","tr":"汽车平滑加速。","g":7},{"w":"account","ph":"/əˈkaʊnt/","pos":"n.","cn":"账户；解释；占…比例","en":"He opened a bank account.","tr":"他开了一个银行账户。","g":7},{"w":"belief","ph":"/bɪˈliːf/","pos":"n.","cn":"信念；相信；信仰","en":"She has a strong belief in God.","tr":"她对上帝有坚定的信仰。","g":7},{"w":"alarm","ph":"/əˈlɑːrm/","pos":"n.","cn":"警报；闹钟；惊慌","en":"Set the alarm for 7 a.m.","tr":"将闹钟设定为早上7点。","g":7},{"w":"entry","ph":"/ˈentri/","pos":"n.","cn":"进入；入口；条目","en":"There is a No Entry&#34; sign on the door.&#34;","tr":"门上挂着一个“禁止进入”的标志。","g":7},{"w":"potential","ph":"/pəˈtenʃl/","pos":"a.","cn":"潜在的；潜力","en":"She has great potential as a singer.","tr":"她作为歌手具有很大的潜力。","g":7},{"w":"criminal","ph":"/ˈkrɪmɪnl/","pos":"a.","cn":"犯罪的；罪犯","en":"He was charged with criminal damage.","tr":"他被控犯有刑事破坏罪。","g":7},{"w":"truth","ph":"/truːθ/","pos":"n.","cn":"真相；真理；事实","en":"Tell me the truth.","tr":"告诉我真相。","g":7},{"w":"conscious","ph":"/ˈkɑːnʃəs/","pos":"a.","cn":"有意识的；清醒的；注意到的","en":"He was conscious during the operation.","tr":"手术过程中他有意识。","g":7},{"w":"assume","ph":"/əˈsuːm/","pos":"v.","cn":"假设；承担；呈现","en":"We assume he will agree.","tr":"我们假设他会同意。","g":7},{"w":"favor","ph":"/ˈfeɪvər/","pos":"n.","cn":"喜爱；赞同；恩惠；有利于","en":"Could you do me a favor?","tr":"你能帮我个忙吗？","g":7},{"w":"reasonable","ph":"/ˈriːznəbl/","pos":"a.","cn":"合理的；公道的；通情达理的","en":"His request sounds reasonable.","tr":"他的请求听起来很合理。","g":7},{"w":"assess","ph":"/əˈses/","pos":"v.","cn":"评估；评定；估算","en":"They assessed the damage carefully.","tr":"他们仔细评估了损失。","g":7},{"w":"reflect","ph":"/rɪˈflekt/","pos":"v.","cn":"反映；反射；反思","en":"The lake reflects the mountains.","tr":"湖面映照着山脉。","g":7},{"w":"fundamental","ph":"/ˌfʌndəˈmentl/","pos":"a.","cn":"基本的；根本的；重要的","en":"This is a fundamental principle of physics.","tr":"这是物理学的一个基本原理。","g":7},{"w":"contemporary","ph":"/kənˈtempəreri/","pos":"a.","cn":"当代的；同时代的","en":"She studies contemporary art.","tr":"她学习当代艺术。","g":7},{"w":"term","ph":"/tɜːrm/","pos":"n.","cn":"学期；术语；期限；条件","en":"The exam is at the end of the term.","tr":"考试在学期末举行。","g":7},{"w":"satisfy","ph":"/ˈsætɪsfaɪ/","pos":"v.","cn":"使满意；满足","en":"The answer didn&#39;t satisfy me.","tr":"答案没有让我满意。","g":7},{"w":"adapt","ph":"/əˈdæpt/","pos":"v.","cn":"适应；改编","en":"She adapted quickly to the new environment.","tr":"她很快适应了新环境。","g":7},{"w":"background","ph":"/ˈbækɡraʊnd/","pos":"n.","cn":"背景；出身","en":"She comes from a musical background.","tr":"她来自一个音乐背景。","g":7},{"w":"encounter","ph":"/ɪnˈkaʊntər/","pos":"v.","cn":"遇到；遭遇；邂逅","en":"They encountered many difficulties during the journey.","tr":"他们在旅途中遇到了许多困难。","g":7},{"w":"bargain","ph":"/ˈbɑːrɡən/","pos":"n.","cn":"便宜货；讨价还价","en":"She found a bargain at the market.","tr":"她在市场上找到了一笔好交易。","g":7},{"w":"support","ph":"/səˈpɔːrt/","pos":"v.","cn":"支持；支援；供养","en":"I support your decision.","tr":"我支持你的决定。","g":7},{"w":"occupy","ph":"/ˈɑːkjupaɪ/","pos":"v.","cn":"占据；占领；使忙碌","en":"The sofa occupies too much space.","tr":"沙发占据了太多空间。","g":7},{"w":"occur","ph":"/əˈkɜːr/","pos":"v.","cn":"发生；出现；想到","en":"When did the accident occur?","tr":"事故发生的时间是什么时候？","g":7},{"w":"highlight","ph":"/ˈhaɪlaɪt/","pos":"v.","cn":"强调；突出；最精彩的部分","en":"The report highlights the need for reform.","tr":"报告强调了改革的必要性。","g":7},{"w":"implement","ph":"/ˈɪmplɪment/","pos":"v.","cn":"实施；执行；使生效","en":"The government implemented a new policy.","tr":"政府实施了一项新政策。","g":7},{"w":"agenda","ph":"/əˈdʒendə/","pos":"n.","cn":"议程；日程","en":"The agenda for the meeting was set.","tr":"会议的议程已经设定。","g":7},{"w":"affair","ph":"/əˈfer/","pos":"n.","cn":"事务；事件；私事","en":"The government handled the affair badly.","tr":"政府处理这件事情很糟糕。","g":7},{"w":"insurance","ph":"/ɪnˈʃʊrəns/","pos":"n.","cn":"保险；保险费","en":"He has health insurance through his job.","tr":"他通过工作获得了健康保险。","g":7},{"w":"share","ph":"/ʃer/","pos":"v.","cn":"分享；分担；份额；股票","en":"Share the cake equally.","tr":"平均分配蛋糕。","g":7},{"w":"characteristic","ph":"/ˌkærəktəˈrɪstɪk/","pos":"n.","cn":"特征；典型的","en":"What are the characteristics of a good leader?","tr":"一个好的领导有哪些特点？","g":7},{"w":"devote","ph":"/dɪˈvoʊt/","pos":"v.","cn":"致力于；奉献；把…专用于","en":"She devoted her life to helping the poor.","tr":"她致力于帮助穷人度过一生。","g":7},{"w":"digital","ph":"/ˈdɪdʒɪtl/","pos":"a.","cn":"数字的；数码的","en":"Digital cameras have replaced film cameras.","tr":"数码相机已经取代了胶片相机。","g":7},{"w":"ensure","ph":"/ɪnˈʃʊr/","pos":"v.","cn":"确保；保证","en":"Please ensure that all windows are closed.","tr":"请确保所有窗户都已关闭。","g":7},{"w":"encourage","ph":"/ɪnˈkɜːrɪdʒ/","pos":"v.","cn":"鼓励；激励；促进","en":"Teachers should encourage students to ask questions.","tr":"教师应该鼓励学生提问。","g":7},{"w":"decline","ph":"/dɪˈklaɪn/","pos":"v.","cn":"下降；婉拒；衰退","en":"The number of tourists has declined sharply.","tr":"游客数量急剧下降。","g":7},{"w":"cancer","ph":"/ˈkænsər/","pos":"n.","cn":"癌症","en":"She died of lung cancer.","tr":"她因肺癌去世。","g":7},{"w":"burden","ph":"/ˈbɜːrdn/","pos":"n.","cn":"负担；重担","en":"He carried a heavy burden.","tr":"他背负着沉重的负担。","g":7},{"w":"obvious","ph":"/ˈɑːbviəs/","pos":"a.","cn":"明显的；显然的；公认的","en":"The answer is obvious.","tr":"答案是显而易见的。","g":7},{"w":"engineer","ph":"/ˌendʒɪˈnɪr/","pos":"n.","cn":"工程师；技师","en":"He works as a software engineer.","tr":"他是一名软件工程师。","g":7},{"w":"independence","ph":"/ˌɪndɪˈpendəns/","pos":"n.","cn":"独立；自主","en":"The country gained independence in 1960.","tr":"这个国家于1960年获得独立。","g":7},{"w":"forest","ph":"/ˈfɔːrɪst/","pos":"n.","cn":"森林；林木","en":"They got lost in the forest.","tr":"他们在森林里迷路了。","g":7},{"w":"tend","ph":"/tend/","pos":"v.","cn":"倾向于；趋向；照料","en":"People tend to eat more in winter.","tr":"人们倾向于在冬天吃得更多。","g":7},{"w":"female","ph":"/ˈfiːmeɪl/","pos":"a.","cn":"女性的；雌性的；女子","en":"The female bird builds the nest.","tr":"雌鸟筑巢。","g":7},{"w":"rapid","ph":"/ˈræpɪd/","pos":"a.","cn":"快速的；迅速的","en":"The country experienced rapid economic growth.","tr":"该国经历了快速的经济增长。","g":7},{"w":"oppose","ph":"/əˈpoʊz/","pos":"v.","cn":"反对；抵制","en":"Many people opposed the plan.","tr":"许多人反对这个计划。","g":7},{"w":"expand","ph":"/ɪkˈspænd/","pos":"v.","cn":"扩大；膨胀；详述","en":"The company plans to expand its business overseas.","tr":"公司计划将其业务扩展到海外。","g":7},{"w":"cabinet","ph":"/ˈkæbɪnət/","pos":"n.","cn":"橱柜；内阁","en":"The medicine cabinet is full.","tr":"药柜已经满了。","g":7},{"w":"confirm","ph":"/kənˈfɜːrm/","pos":"v.","cn":"确认；证实；批准","en":"Please confirm your reservation.","tr":"请确认您的预订。","g":7},{"w":"accountant","ph":"/əˈkaʊntənt/","pos":"n.","cn":"会计；会计师","en":"She works as an accountant.","tr":"她是一名会计。","g":7},{"w":"original","ph":"/əˈrɪdʒənl/","pos":"a.","cn":"原始的；独创的；最初的","en":"The original plan was changed.","tr":"原计划已经改变。","g":8},{"w":"attitude","ph":"/ˈætɪtuːd/","pos":"n.","cn":"态度；看法；姿势","en":"She has a positive attitude towards life.","tr":"她对生活持有积极的态度。","g":8},{"w":"abnormal","ph":"/æbˈnɔːrml/","pos":"a.","cn":"不正常的；反常的","en":"The abnormal weather caused crop failures.","tr":"异常的天气导致了庄稼歉收。","g":8},{"w":"blank","ph":"/blæŋk/","pos":"a.","cn":"空白的；空白处","en":"Please fill in the blank.","tr":"请填写空白。","g":8},{"w":"aid","ph":"/eɪd/","pos":"n.","cn":"帮助；援助","en":"The country received foreign aid.","tr":"该国收到了外国援助。","g":8},{"w":"stress","ph":"/stres/","pos":"n.","cn":"压力；强调；重音","en":"She is under a lot of stress.","tr":"她承受着巨大的压力。","g":8},{"w":"command","ph":"/kəˈmænd/","pos":"v.","cn":"命令；掌握；指挥","en":"He has a good command of English.","tr":"他的英语很好。","g":8},{"w":"expert","ph":"/ˈekspɜːrt/","pos":"n.","cn":"专家；熟练的；内行的","en":"He is an expert in ancient history.","tr":"他是古历史方面的专家。","g":8},{"w":"attach","ph":"/əˈtætʃ/","pos":"v.","cn":"附上；系；依恋","en":"Please attach a photo to the form.","tr":"请在表格上附上一张照片。","g":8},{"w":"circumstance","ph":"/ˈsɜːrkəmstæns/","pos":"n.","cn":"情况；环境；境遇","en":"Under no circumstances should you lie.","tr":"在任何情况下都不应该撒谎。","g":8},{"w":"extent","ph":"/ɪkˈstent/","pos":"n.","cn":"程度；范围；长度","en":"To what extent do you agree?","tr":"你同意到什么程度？","g":8},{"w":"behalf","ph":"/bɪˈhæf/","pos":"n.","cn":"代表；利益","en":"On behalf of the team, I thank you.","tr":"我代表团队感谢你。","g":8},{"w":"initial","ph":"/ɪˈnɪʃl/","pos":"a.","cn":"最初的；开始的","en":"The initial stage of the project is complete.","tr":"项目初期阶段已完成。","g":8},{"w":"billion","ph":"/ˈbɪljən/","pos":"num.","cn":"十亿","en":"The project cost one billion dollars.","tr":"项目成本十亿美元。","g":8},{"w":"employ","ph":"/ɪmˈplɔɪ/","pos":"v.","cn":"雇用；使用；利用","en":"The factory employs over 500 workers.","tr":"这家工厂雇佣了超过500名工人。","g":8},{"w":"reputation","ph":"/ˌrepjuˈteɪʃn/","pos":"n.","cn":"名声；名誉","en":"The company has a good reputation.","tr":"公司声誉良好。","g":8},{"w":"disabled","ph":"/dɪsˈeɪbld/","pos":"a.","cn":"残疾的；有缺陷的","en":"The building has access for disabled people.","tr":"这座建筑为残疾人提供了通道。","g":8},{"w":"economic","ph":"/ˌiːkəˈnɑːmɪk/","pos":"a.","cn":"经济的；经济学的","en":"The country is facing economic problems.","tr":"这个国家正面临经济问题。","g":8},{"w":"industrial","ph":"/ɪnˈdʌstriəl/","pos":"a.","cn":"工业的；产业的","en":"The city is a major industrial center.","tr":"这座城市是主要的工业中心。","g":8},{"w":"otherwise","ph":"/ˈʌðərwaɪz/","pos":"ad.","cn":"否则；另外；在其他方面","en":"Hurry up, otherwise you&#39;ll be late.","tr":"快点，否则你会迟到的。","g":8},{"w":"automatic","ph":"/ˌɔːtəˈmætɪk/","pos":"a.","cn":"自动的；无意识的","en":"The door opens automatically.","tr":"门可以自动打开。","g":8},{"w":"apply","ph":"/əˈplaɪ/","pos":"v.","cn":"申请；应用；涂","en":"She applied for a visa.","tr":"她申请了签证。","g":8},{"w":"ideal","ph":"/aɪˈdiːəl/","pos":"a.","cn":"理想的；完美的；理想","en":"This is an ideal place for a picnic.","tr":"这是野餐的理想地点。","g":8},{"w":"judgment","ph":"/ˈdʒʌdʒmənt/","pos":"n.","cn":"判断；判决；看法","en":"He showed good judgment in the crisis.","tr":"他在危机中表现出了良好的判断力。","g":8},{"w":"annual","ph":"/ˈænjuəl/","pos":"a.","cn":"每年的；一年一度的","en":"The annual meeting will be held in June.","tr":"年度会议将在六月举行。","g":8},{"w":"contribute","ph":"/kənˈtrɪbjuːt/","pos":"v.","cn":"贡献；捐献；投稿","en":"Everyone should contribute to the project.","tr":"每个人都应该为项目做出贡献。","g":8},{"w":"literature","ph":"/ˈlɪtrətʃər/","pos":"n.","cn":"文学；文献；资料","en":"She studied English literature in college.","tr":"她在大学学习了英国文学。","g":8},{"w":"available","ph":"/əˈveɪləbl/","pos":"a.","cn":"可获得的；有空的","en":"Is this seat available?","tr":"这个座位有人吗？","g":8},{"w":"save","ph":"/seɪv/","pos":"v.","cn":"节省；拯救；储蓄","en":"Save your energy for the final.","tr":"为最后保存你的能量。","g":8},{"w":"approval","ph":"/əˈpruːvl/","pos":"n.","cn":"批准；赞成","en":"The plan needs parental approval.","tr":"这个计划需要家长的批准。","g":8},{"w":"collapse","ph":"/kəˈlæps/","pos":"v.","cn":"倒塌；崩溃","en":"The building collapsed in the earthquake.","tr":"建筑物在地震中倒塌。","g":8},{"w":"criticize","ph":"/ˈkrɪtɪsaɪz/","pos":"v.","cn":"批评；指责","en":"Don&#39;t criticize others unfairly.","tr":"不要不公平地批评别人。","g":8},{"w":"eastern","ph":"/ˈiːstərn/","pos":"a.","cn":"东方的；东部的","en":"They traveled to eastern Europe.","tr":"他们旅行到了东欧。","g":8},{"w":"attack","ph":"/əˈtæk/","pos":"n.","cn":"攻击；进攻；抨击","en":"The soldiers attacked at dawn.","tr":"士兵们在黎明时发动了攻击。","g":8},{"w":"incredible","ph":"/ɪnˈkredəbl/","pos":"a.","cn":"难以置信的；惊人的","en":"The view from the top was incredible.","tr":"从顶部看到的景色令人难以置信。","g":8},{"w":"pattern","ph":"/ˈpætərn/","pos":"n.","cn":"模式；图案；样式","en":"The behavior follows a pattern.","tr":"这种行为遵循一种模式。","g":8},{"w":"brand","ph":"/brænd/","pos":"n.","cn":"品牌；商标","en":"What brand of phone do you use?","tr":"你用的是什么品牌的手机？","g":8},{"w":"application","ph":"/ˌæplɪˈkeɪʃn/","pos":"n.","cn":"申请；应用；应用程序","en":"His job application was successful.","tr":"他的工作申请成功了。","g":8},{"w":"ability","ph":"/əˈbɪləti/","pos":"n.","cn":"能力；才能","en":"She has the ability to solve complex problems.","tr":"她有能力解决复杂的问题。","g":8},{"w":"indicate","ph":"/ˈɪndɪkeɪt/","pos":"v.","cn":"表明；指出；暗示","en":"Research indicates that the risk is low.","tr":"研究表明风险较低。","g":8}]};

/* ──────── src/app.js ──────── */
/* app.js —— 唯一的 startup glue。不属于任何模块：它只做三件事
     1. 选引擎：有 WC.core 就用真的，没有就用 WC.preview（接口完全一致）
     2. 按视口选布局：宽屏 desktop，窄屏 mobile
     3. 订阅 + 首次渲染 + 视口变化时重挂
   业务一行都不在这里。 */
(function (WC) {
  "use strict";

  var BREAK = 900; // px：>= 900 用桌面布局
  var root = null;
  var engine = null;
  var current = null;   // "mobile" | "desktop"
  var unbindKeys = null;
  var lastVM = null;

  /* 词本：契约 §2.2 v1.1 —— 运行时只认 WC.books[id]，不 fetch */
  function book() {
    if (!WC.books) return null;
    if (WC.books.cet4) return WC.books.cet4;
    for (var k in WC.books) if (WC.books[k] && WC.books[k].words) return WC.books[k];
    return null;
  }

  function viewport() {
    return window.innerWidth >= BREAK ? "desktop" : "mobile";
  }

  function bindKeys() {
    if (unbindKeys) {
      unbindKeys();
      unbindKeys = null;
    }
    if (current === "desktop" && WC.desktop && WC.desktop.bindKeys) {
      unbindKeys = WC.desktop.bindKeys(dispatch);
    }
  }

  function dispatch(a) {
    if (engine) engine.dispatch(a);
    scheduleBackup();
  }

  /* 重置：先存一份备份，确认它真落了盘，再动数据。
     备份失败就**不重置** —— 宁可这次没重来，也不能让进度无路可退。
     唯一的例外是「本来就没有词条」（no-words）：那是空档，没什么可丢的。 */
  function resetGame(mode) {
    var m = mode === "all" ? "all" : "progress";
    if (!engine || !engine.exportText) return Promise.resolve({ ok: false, reason: "no-engine" });

    var pre;
    if (backupEnabled()) {
      try {
        pre = Promise.resolve(window.WCBackup.auto(engine.exportText()));
      } catch (e) {
        pre = Promise.resolve({ ok: false, reason: "throw" });
      }
    } else {
      /* 浏览器 / 线上版没有自动备份。UI 那边会先提醒「建议先导出」。 */
      pre = Promise.resolve(null);
    }

    return pre
      .then(function (r) {
        var needsBackup = backupEnabled();
        var nothingToLose = r && r.reason === "no-words";
        if (needsBackup && (!r || !r.ok) && !nothingToLose) {
          return { ok: false, reason: "backup-failed", detail: r || null };
        }
        dispatch({ type: "reset", mode: m });
        /* 记一笔，别让 6 秒后的排队备份又把空档试一遍 */
        bkLastAt = Date.now();
        return { ok: true, mode: m, backup: (r && r.name) || null };
      })
      .catch(function (e) {
        return { ok: false, reason: "throw", message: String((e && e.message) || e) };
      });
  }

  /* ── 自动备份（只有 macOS 壳里有 window.WCBackup） ────────────
     浏览器 / 线上版没有这个对象，整段自动空转，线上行为一个字不变。

     时机：启动 3 秒后一次（把上一次会话的进度存下来），之后每有动作排一次队，
           两次落盘之间最少隔 45 秒。内容没变时壳那边直接跳过，
           所以这里不用自己做去重，也不怕挂机一天攒出几百个相同文件。 */
  var BK_FIRST = 3000;
  var BK_GAP = 45000;
  var BK_DELAY = 6000;
  var bkTimer = null;
  var bkLastAt = 0;
  var bkLast = null;   // 最近一次落盘结果，给界面显示用

  function backupEnabled() {
    return !!(window.WCBackup && window.WCBackup.auto);
  }

  function flushBackup() {
    bkTimer = null;
    if (!backupEnabled() || !engine || !engine.exportText) return;
    var text = engine.exportText();
    if (!text) return;
    try {
      var p = window.WCBackup.auto(text);
      if (p && p.then) {
        p.then(function (r) {
          bkLast = r || null;
          /* 只有真落了盘才记时间。被拒（空档 / 非法）或写失败都不算数，
             否则下一次要白等满 45 秒才有机会重试。 */
          if (r && r.ok) bkLastAt = Date.now();
        }).catch(function () {});
      }
    } catch (e) {
      /* 备份是保险，不是主流程：写不进去也不能让答题停住 */
    }
  }

  function scheduleBackup() {
    if (!backupEnabled()) return;
    if (bkTimer) clearTimeout(bkTimer);
    var gap = Date.now() - bkLastAt;
    var wait = gap >= BK_GAP ? BK_DELAY : BK_GAP - gap;
    bkTimer = setTimeout(flushBackup, wait);
  }

  function render(vm) {
    if (!root || !vm) return;
    lastVM = vm;
    var vp = viewport();
    if (vp !== current) {
      current = vp;
      root.className = "app-root app-" + vp;
      bindKeys();
    }
    var mod = vp === "desktop" ? WC.desktop : WC.mobile;
    if (!mod) {
      root.textContent = "缺少 " + vp + " 布局模块";
      return;
    }
    // toast 由各平台 render 自己画（契约 §6）。这里再追加一次就会叠两张——
    // 2026-11-23 踩过一次：M2 报集成页答错后 .wc-toast 数量为 2。
    mod.render(vm, root, dispatch);
  }

  function start() {
    root = document.getElementById("app");
    if (!root) return;

    if (WC.core && WC.core.boot) {
      engine = WC.core.boot({
        book: book(),
        books: WC.books || null,
        adapters: WC.adapters || {},
        storageKey: "wc7"
      });
    } else if (WC.preview && WC.preview.boot) {
      engine = WC.preview.boot();
    } else {
      root.textContent = "没有可用的引擎（既没有 WC.core 也没有 WC.preview）";
      return;
    }

    // M3 未交付时 core 走内存兜底：刷新即丢。必须说清楚，不能让人以为进度存下来了。
    if (!WC.adapters || !WC.adapters.storage) {
      var bar = document.createElement("div");
      bar.className = "wc-nostorage";
      bar.textContent = "未接入存储：本次进度不会保存（等 M3 的 storage adapter）";
      document.body.appendChild(bar);
      document.body.classList.add("wc-has-notice");
      if (window.console) console.warn("[wc7] 没有 WC.adapters.storage，进度只存在内存里");
    }

    engine.subscribe(render);
    render(engine.getVM());

    /* 首次自动备份：等首帧、迁移后的 flush、自动朗读都落地再写，
       这时候 exportText() 拿到的是真正稳定的档。 */
    if (backupEnabled()) setTimeout(flushBackup, BK_FIRST);

    var timer = null;
    window.addEventListener("resize", function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        if (viewport() !== current) render(engine.getVM());
      }, 120);
    });
  }

  /* 导出：下载一份 JSON。文件名带日期，便于两台设备之间来回传。 */
  function exportFile() {
    if (!engine || !engine.exportText) return false;
    var text = engine.exportText();
    if (!text) return false;
    var d = new Date();
    var stamp = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "wordcard-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  /* 导入：弹文件选择器，读完交给 store 的 import 动作（合并规则在 transfer 里） */
  function pickImport() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        dispatch({ type: "import", text: String(reader.result || "") });
      };
      reader.readAsText(f);
    };
    input.click();
  }

  WC.app = {
    dispatch: dispatch,
    exportFile: exportFile,
    pickImport: pickImport,
    exportText: function () {
      return engine && engine.exportText ? engine.exportText() : null;
    },
    /* 自动备份：浏览器里 backupEnabled() 为 false，UI 据此决定显不显示入口 */
    backupEnabled: backupEnabled,
    backupNow: flushBackup,
    resetGame: resetGame,
    backupInfo: function () {
      if (!backupEnabled()) return Promise.resolve(null);
      return Promise.resolve(window.WCBackup.info()).catch(function () { return null; });
    },
    openBackupFolder: function () {
      if (!backupEnabled()) return;
      flushBackup(); // 先把当前状态落一份，再开目录：点开看到的就是最新
      try {
        var p = window.WCBackup.openFolder();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {
        /* 同上，静默 */
      }
    },
    getVM: function () { return engine ? engine.getVM() : null; },
    get viewport() { return current; },
    get vm() { return lastVM; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window.WC = window.WC || {});
