// ====================
// NutriCalc 全局配置 + 前后端对接（最终版）
// 零法律风险 | 中英双语 | 后端接口打通
// ====================
const API_BASE = 'http://localhost:3800/api/v1';

document.addEventListener('DOMContentLoaded', function () {
  // ==============================================
  // 1. 全局语言切换
  // ==============================================
  const langBtns = document.querySelectorAll('.lang-switch button');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      document.documentElement.lang = lang;
      localStorage.setItem('nutriLang', lang);
      renderAllTexts();
    });
  });

  // 加载保存的语言
  const savedLang = localStorage.getItem('nutriLang') || 'zh';
  document.documentElement.lang = savedLang;

  function renderAllTexts() {
    const lang = document.documentElement.lang;
    document.querySelectorAll('[lang]').forEach(el => {
      el.style.display = el.getAttribute('lang') === lang ? 'block' : 'none';
    });
    document.querySelectorAll('.lang-switch button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
  renderAllTexts();

  // ==============================================
  // 2. 计算器核心逻辑
  // ==============================================
  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) {
    calcBtn.addEventListener('click', calculate);
  }

  function calculate() {
    const price = parseFloat(document.getElementById('price').value) || 0;
    const total = parseFloat(document.getElementById('totalContent').value) || 0;
    const active = parseFloat(document.getElementById('activeContent').value) || 0;

    if (price <= 0 || total <= 0 || active <= 0) {
      alert(getText('请输入有效的数值', 'Please enter valid numbers'));
      return;
    }

    const realActive = (active / 100) * total;
    const perMg = price / realActive;
    const per100Mg = (perMg * 100).toFixed(4);

    document.getElementById('resultPer100mg').textContent = per100Mg;
    document.getElementById('resultSection').style.display = 'block';

    // 自动填充到匿名提交弹窗
    const submitCostInput = document.getElementById('submitCostPer100mg');
    if (submitCostInput) submitCostInput.value = per100Mg;
  }

  function getText(zh, en) {
    return document.documentElement.lang === 'zh' ? zh : en;
  }

  // ==============================================
  // 3. 匿名数据提交弹窗（对接后端）
  // ==============================================
  const modal = document.getElementById('submitModal');
  const openBtn = document.getElementById('openSubmitModal');
  const closeBtn = document.getElementById('closeSubmitModal');
  const cancelBtn = document.getElementById('cancelSubmitBtn');
  const submitBtn = document.getElementById('submitDataBtn');

  // 打开
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      loadIngredientsToSelect();
    });
  }

  // 关闭
  [closeBtn, cancelBtn].forEach(b => {
    if (b) b.addEventListener('click', () => modal.style.display = 'none');
  });
  window.addEventListener('click', e => e.target === modal && (modal.style.display = 'none'));

  // 加载成分下拉框
  async function loadIngredientsToSelect() {
    const sel = document.getElementById('ingredientType');
    if (!sel) return;
    if (sel.dataset.loaded === 'true') return;

    try {
      const res = await fetch(`${API_BASE}/ingredients`, { method: 'POST' });
      const json = await res.json();
      sel.innerHTML = '';
      json.data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = document.documentElement.lang === 'zh' ? item.nameZh : item.nameEn;
        sel.appendChild(opt);
      });
      sel.dataset.loaded = 'true';
    } catch (e) {
      console.error('加载成分失败', e);
    }
  }

  // 提交匿名数据（核心：不存个人/品牌）
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const ingredientId = document.getElementById('ingredientType').value;
      const cost = parseFloat(document.getElementById('submitCostPer100mg').value);
      const region = document.getElementById('region').value || 'all';
      const form = document.getElementById('formType').value || 'all';

      if (!ingredientId || isNaN(cost) || cost <= 0 || cost > 10) {
        alert(getText('数据无效', 'Invalid data'));
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientId, costPer100mg: cost, region, form })
        });
        const json = await res.json();

        if (json.code === 200) {
          alert(getText('匿名提交成功，感谢贡献', 'Submitted successfully! Thank you.'));
          modal.style.display = 'none';
        } else {
          alert(json.msg || getText('提交失败', 'Failed'));
        }
      } catch (e) {
        alert(getText('网络异常，请稍后再试', 'Network error'));
      }
    });
  }

  // ==============================================
  // 4. 聚合报告页面（对接后端）
  // ==============================================
  if (document.getElementById('reportContainer')) {
    loadReportData();
  }

  async function loadReportData() {
    const loading = document.getElementById('loading');
    const table = document.getElementById('reportTableBody');
    const meta = document.getElementById('reportMeta');

    if (loading) loading.style.display = 'block';
    try {
      const res = await fetch(`${API_BASE}/report`, { method: 'POST' });
      const json = await res.json();
      if (json.code !== 200) throw new Error('report error');

      const data = json.data;
      meta.textContent = getText(
        `更新时间：${data.updatedAt}｜总样本：${data.totalSample} 条（匿名）`,
        `Updated: ${data.updatedAt}｜Total Samples: ${data.totalSample}`
      );

      table.innerHTML = '';
      data.list.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${document.documentElement.lang === 'zh' ? item.nameZh : item.nameEn}</td>
          <td>${item.medianCost.toFixed(2)}</td>
          <td>${item.minCost.toFixed(2)} ~ ${item.maxCost.toFixed(2)}</td>
          <td>${item.sampleCount}</td>
          <td>${getTrend(item.trend)}</td>
        `;
        table.appendChild(tr);
      });
    } catch (e) {
      table.innerHTML = `<tr><td colspan="5">${getText('加载失败', 'Load failed')}</td></tr>`;
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  function getTrend(t) {
    const map = {
      stable: getText('稳定', 'stable'),
      up: getText('上升', 'up'),
      down: getText('下降', 'down')
    };
    return map[t] || map.stable;
  }
});