// トップの映像切り替え・スクロールでふわっと出る・数字が数え上がる・スマホのメニュー
// 映像は次の1本だけ先読み・動きを減らす設定とデータ節約中は静止画のまま
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;

  // ---- スマホのメニュー
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (btn && nav) {
    var close = function (refocus) {
      if (!nav.classList.contains("open")) return;
      nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.textContent = "MENU";
      if (refocus) btn.focus(); // 隠れたメニューの中にフォーカスを置き去りにしない
    };
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "CLOSE" : "MENU";
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") close(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(nav.contains(document.activeElement)); });
    document.addEventListener("click", function (e) { if (!nav.contains(e.target) && !btn.contains(e.target)) close(false); });
  }

  // ---- トップの映像：順番に切り替える
  var vids = Array.prototype.slice.call(document.querySelectorAll(".hero-media video"));
  if (vids.length && !reduce && !saveData) {
    var cur = 0;
    var broken = [];
    // preload="none" のままだと src を入れても再生まで読まない＝先読みにならない。読む時に auto へ変える
    var load = function (v) {
      if (!v.getAttribute("src")) { v.preload = "auto"; v.src = v.getAttribute("data-src"); v.load(); }
    };
    var next = function (i) {
      for (var k = 1; k <= vids.length; k++) {
        var j = (i + k) % vids.length;
        if (!broken[j]) return j;
      }
      return -1;
    };
    var show = function (i) {
      var v = vids[i];
      cur = i;
      load(v);
      try { v.currentTime = 0; } catch (e) { /* 読み込み前は無視 */ }
      var p = v.play();
      // 自動再生を止められた時は静止画（poster・背景）のまま＝切替もしない
      if (p && p.catch) p.catch(function () {});
      vids.forEach(function (o, j) { o.classList.toggle("is-on", j === i); });
      var n = next(i);
      if (n >= 0 && n !== i) load(vids[n]); // 次の1本だけ先に読む
    };
    vids.forEach(function (v, i) {
      v.addEventListener("ended", function () { var n = next(i); if (n >= 0) show(n); });
      // 読めない映像は飛ばす（全部読めなければ静止画のまま止まる）
      v.addEventListener("error", function () {
        broken[i] = true;
        if (i !== cur) return;
        var n = next(i);
        if (n >= 0) show(n);
        else vids.forEach(function (o) { o.classList.remove("is-on"); });
      });
    });
    if (vids.length === 1) vids[0].loop = true;
    show(0);
  }

  // ---- 数字が数え上がる（動きを減らす設定では最初から最終の値）
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  // 桁区切りは1万以上の時だけ（「1952年」を「1,952年」にしない）
  var fmt = function (x, dec) {
    var s = x.toFixed(dec);
    return Math.abs(x) >= 10000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
  };
  var count = function (el) {
    var to = parseFloat(el.getAttribute("data-count"));
    var dec = (String(el.getAttribute("data-count")).split(".")[1] || "").length;
    var t0 = null;
    var step = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / 1400);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * eased, dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  counters.forEach(function (el) {
    var v = el.getAttribute("data-count");
    el.textContent = fmt(parseFloat(v), (String(v).split(".")[1] || "").length);
  });

  if (reduce || !("IntersectionObserver" in window)) return;

  // ---- スクロールでふわっと出る（JSが動かない時は最初から全部見える）
  document.documentElement.classList.add("motion");
  var sel = ".hero .inner > *, .section .eyebrow, .section h2, .section .lead, .point, .card, .stat, " +
            ".band-inner > *, .flow li, details.faq, .info-table tr, .news li, .btns";
  var els = Array.prototype.slice.call(document.querySelectorAll(sel));
  els.forEach(function (el) {
    el.classList.add("reveal");
    var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.transitionDelay = Math.min(sib, 5) * 90 + "ms"; // 並んだ物は少しずつずらす
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });

  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      count(e.target);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  counters.forEach(function (el) { el.textContent = "0"; cio.observe(el); });
})();
