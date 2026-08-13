/* =========================================================================
 * app.js — Tải dữ liệu từ Google Sheet (CSV) và hiển thị dưới dạng thẻ
 * Các tính năng: lọc theo kind, tìm kiếm, sao chép link, giao diện ngày/đêm
 * ========================================================================= */

(function () {
  "use strict";

  /* ---------- Các phần tử DOM ---------- */
  const els = {
    grid: document.getElementById("card-grid"),
    status: document.getElementById("status"),
    controls: document.getElementById("controls"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
    themeLabel: document.getElementById("theme-label"),
    searchInput: document.getElementById("search-input"),
    searchClear: document.getElementById("search-clear"),
  };

  let allRows = [];
  let activeFilter = "all";
  let searchQuery = "";

  /* ---------- Giao diện: ngày / đêm ---------- */
  const THEME_KEY = "linkhub-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    els.themeIcon.textContent = isDark ? "🌙" : "☀️";
    els.themeLabel.textContent = isDark ? "Đêm" : "Ngày";
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* bỏ qua nếu không lưu được */
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) {
      /* ignore */
    }
    if (!saved) {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      saved = prefersDark ? "dark" : "light";
    }
    applyTheme(saved);
  }

  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* ---------- Phân tích CSV ---------- */
  // Hàm phân tích CSV đơn giản, hỗ trợ dấu ngoặc kép và dấu phẩy trong ô.
  function parseCSV(text, delimiter) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === delimiter) {
          row.push(field);
          field = "";
        } else if (c === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        } else if (c === "\r") {
          // bỏ qua CR, xử lý LF bên trên
        } else {
          field += c;
        }
      }
    }
    // dòng cuối
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  /* ---------- Ánh xạ cột ---------- */
  function mapRows(rawRows) {
    if (!rawRows.length) return [];

    let header = null;
    let startIndex = 0;

    if (APP_CONFIG.hasHeader) {
      header = rawRows[0].map(function (h) {
        return (h || "").trim().toLowerCase();
      });
      startIndex = 1;
    } else {
      header = ["stt", "link", "description", "kind"];
    }

    const cols = APP_CONFIG.columns;
    const findIndex = function (name) {
      return header.indexOf(String(name).trim().toLowerCase());
    };

    const idx = {
      stt: findIndex(cols.stt),
      link: findIndex(cols.link),
      description: findIndex(cols.description),
      kind: findIndex(cols.kind),
    };

    const out = [];
    for (let r = startIndex; r < rawRows.length; r++) {
      const cells = rawRows[r];
      // bỏ qua dòng hoàn toàn trống
      if (cells.length === 1 && cells[0].trim() === "") continue;

      const link = idx.link >= 0 ? (cells[idx.link] || "").trim() : "";
      if (!link) continue; // bỏ qua nếu không có link

      out.push({
        stt: idx.stt >= 0 ? (cells[idx.stt] || "").trim() : "",
        link: link,
        description: idx.description >= 0 ? (cells[idx.description] || "").trim() : "",
        kind: idx.kind >= 0 ? (cells[idx.kind] || "").trim() : "",
      });
    }
    return out;
  }

  /* ---------- Sắp xếp theo STT ---------- */
  // Hiển thị từ mới đến cũ (STT lớn lên đầu) mặc định.
  function sortRows(rows) {
    const order = (APP_CONFIG.sortOrder || "desc").toLowerCase();
    if (order === "none" || !rows.length) return rows;

    const toNum = function (v) {
      const n = parseFloat(String(v).trim());
      return isNaN(n) ? NaN : n;
    };

    return rows.slice().sort(function (a, b) {
      const na = toNum(a.stt);
      const nb = toNum(b.stt);
      // dòng không có STT (hoặc không phải số) luôn đẩy xuống cuối
      const aMissing = isNaN(na);
      const bMissing = isNaN(nb);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return order === "asc" ? na - nb : nb - na;
    });
  }

  /* ---------- Tiện ích ---------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    const trimmed = (url || "").trim();
    if (!trimmed) return "";
    // đảm bảo có scheme để mở đúng
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^mailto:/i.test(trimmed)) return trimmed;
    return "https://" + trimmed.replace(/^\/+/, "");
  }

  function hostOf(url) {
    try {
      return new URL(safeUrl(url)).hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  }

  /* ---------- Chọn dữ liệu hiển thị (lọc kind + tìm kiếm) ---------- */
  function getVisibleRows() {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter(function (r) {
      // lọc theo loại (kind)
      if (activeFilter !== "all") {
        const k = (r.kind || "khác").trim().toLowerCase();
        if (k !== activeFilter) return false;
      }
      // lọc theo từ khóa tìm kiếm
      if (q) {
        const host = hostOf(r.link).toLowerCase();
        const haystack = [host, r.link, r.description, r.kind, r.stt]
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- Hiển thị ---------- */
  function render() {
    const rows = getVisibleRows();

    if (!rows.length) {
      let msg = "Không có dữ liệu để hiển thị.";
      if (searchQuery.trim()) {
        msg =
          'Không tìm thấy kết quả cho "' +
          escapeHtml(searchQuery.trim()) +
          '".';
      } else if (activeFilter !== "all") {
        msg = "Không có liên kết nào trong mục này.";
      }
      els.grid.innerHTML =
        '<p class="empty"> ' + msg + "</p>";
      return;
    }

    const html = rows
      .map(function (r) {
        const url = safeUrl(r.link);
        const kind = (r.kind || "khác").trim();
        const desc = r.description ? escapeHtml(r.description) : "";
        const host = escapeHtml(hostOf(r.link));
        const stt = r.stt ? "#" + escapeHtml(r.stt) : "";
        return (
          '<article class="card">' +
          '<div class="card-head">' +
          '<span class="kind-tag">' +
          escapeHtml(kind) +
          "</span>" +
          (stt ? '<span class="stt">' + stt + "</span>" : "") +
          "</div>" +
          '<a class="card-title" href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener noreferrer">' +
          host +
          "</a>" +
          (desc ? '<p class="card-desc">' + desc + "</p>" : "") +
          '<div class="card-actions">' +
          '<a class="card-link-btn" href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener noreferrer">🌐 Mở</a>' +
          '<button class="copy-btn" type="button" data-link="' +
          escapeHtml(url) +
          '" aria-label="Sao chép liên kết">📋 Sao chép</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    els.grid.innerHTML = html;
  }

  function buildFilters() {
    if (!els.controls) return;

    // Đếm số lượng liên kết trong mỗi loại (kind), gồm cả nhóm "khác".
    const counters = new Map(); // key(chữ thường) -> { label, count }
    allRows.forEach(function (r) {
      const label = (r.kind || "khác").trim();
      const key = label.toLowerCase();
      const entry = counters.get(key) || { label: label, count: 0 };
      entry.count += 1;
      counters.set(key, entry);
    });

    const buttons = [];
    buttons.push(
      '<button class="filter-btn active" data-filter="all">Tất cả ' +
        '<span class="count">' +
        allRows.length +
        "</span></button>"
    );

    Array.from(counters.keys())
      .sort()
      .forEach(function (key) {
        const entry = counters.get(key);
        buttons.push(
          '<button class="filter-btn" data-filter="' +
            escapeHtml(key) +
            '">' +
            escapeHtml(entry.label) +
            ' <span class="count">' +
            entry.count +
            "</span></button>"
        );
      });

    els.controls.innerHTML = buttons.join("");
    els.controls.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.getAttribute("data-filter");
        els.controls
          .querySelectorAll(".filter-btn")
          .forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
        render();
      });
    });
  }

  /* ---------- Sao chép liên kết ---------- */
  function showCopied(btn) {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = "✓ Đã sao chép";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.innerHTML = original;
      btn.classList.remove("copied");
    }, 1500);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
      /* bỏ qua */
    }
    document.body.removeChild(ta);
  }

  function copyLink(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showCopied(btn);
        },
        function () {
          fallbackCopy(text, function () {
            showCopied(btn);
          });
        }
      );
    } else {
      fallbackCopy(text, function () {
        showCopied(btn);
      });
    }
  }

  function initCopyButtons() {
    if (!els.grid) return;
    els.grid.addEventListener("click", function (e) {
      const btn = e.target.closest(".copy-btn");
      if (!btn) return;
      const link = btn.getAttribute("data-link");
      copyLink(link, btn);
    });
  }

  /* ---------- Tìm kiếm ---------- */
  function initSearch() {
    if (!els.searchInput) return;

    els.searchInput.addEventListener("input", function () {
      searchQuery = els.searchInput.value || "";
      if (els.searchClear) {
        els.searchClear.style.display = searchQuery ? "block" : "none";
      }
      render();
    });

    if (els.searchClear) {
      els.searchClear.addEventListener("click", function () {
        searchQuery = "";
        els.searchInput.value = "";
        els.searchClear.style.display = "none";
        els.searchInput.focus();
        render();
      });
    }

    // Nhấn Esc để xóa tìm kiếm
    els.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        els.searchInput.value = "";
        searchQuery = "";
        if (els.searchClear) els.searchClear.style.display = "none";
        render();
      }
    });
  }

  /* ---------- Trạng thái ---------- */
  function showStatus(message, type) {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.className = "status" + (type ? " " + type : "");
    els.status.style.display = message ? "block" : "none";
  }

  /* ---------- Tải dữ liệu ---------- */
  async function loadData() {
    showStatus("Đang tải dữ liệu từ Google Sheet…", "loading");
    try {
      const url = APP_CONFIG.exportUrl + "&_=" + Date.now(); // tránh cache
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const text = await res.text();
      const rawRows = parseCSV(text, APP_CONFIG.delimiter || ",");
      allRows = sortRows(mapRows(rawRows));

      if (!allRows.length) {
        showStatus(
          "Không tìm thấy dữ liệu. Hãy chắc chắn bảng tính đã được 'Xuất bản lên web' hoặc chia sẻ công khai, và đúng tên cột (STT, link, description, kind).",
          "error"
        );
      } else {
        showStatus("", null);
      }

      buildFilters();
      render();
    } catch (err) {
      showStatus(
        "Lỗi khi tải dữ liệu: " +
          err.message +
          ". Kiểm tra kết nối mạng và quyền truy cập bảng tính (xem hướng dẫn trong config.js).",
        "error"
      );
    }
  }

  /* ---------- Khởi chạy ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initSearch();
    initCopyButtons();
    loadData();

    const minutes = parseInt(APP_CONFIG.autoRefreshMinutes, 10) || 0;
    if (minutes > 0) {
      setInterval(loadData, minutes * 60 * 1000);
    }
  });
})();
