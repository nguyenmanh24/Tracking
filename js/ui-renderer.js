/**
 * CONSTRUCTION PAYMENT TRACKER PRO - UI RENDERER (PART 1)
 */

const UIRenderer = {

  // --- 1. RENDER HEADER & KPI CARDS ---
  renderHeaderAndKPIs() {
    const project = getActiveProject();
    if (!project) return;

    const nameEl = document.getElementById('header-project-name');
    if (nameEl) nameEl.textContent = `Dự án: ${project.info.name}`;

    const metrics = Calculator.calculateGlobalProjectMetrics(project);
    if (!metrics) return;

    const elContractTotal = document.getElementById('kpi-contract-total');
    if (elContractTotal) elContractTotal.textContent = `${formatVND(metrics.boqSummary.totalApprovedAmount)} đ`;

    const elContractSub = document.getElementById('kpi-contract-sub');
    if (elContractSub) elContractSub.textContent = `Gốc: ${formatVND(metrics.boqSummary.originalAmount)} | PS: +${formatVND(metrics.boqSummary.variationAmount)}`;

    const elAcceptedTotal = document.getElementById('kpi-accepted-total');
    if (elAcceptedTotal) elAcceptedTotal.textContent = `${formatVND(metrics.totalCumulativeAcceptedValue)} đ`;

    const elAcceptedPct = document.getElementById('kpi-accepted-pct');
    if (elAcceptedPct) elAcceptedPct.textContent = `${metrics.globalCompletionPct.toFixed(1)}% Tổng HĐ`;

    const elRemainingTotal = document.getElementById('kpi-remaining-total');
    if (elRemainingTotal) elRemainingTotal.textContent = `${formatVND(metrics.remainingProjectValue)} đ`;

    const elRemainingSub = document.getElementById('kpi-remaining-sub');
    if (elRemainingSub) {
      const remainingPct = 100 - metrics.globalCompletionPct;
      elRemainingSub.textContent = `${remainingPct > 0 ? remainingPct.toFixed(1) : 0}% còn lại (${metrics.remainingItems.length} đầu việc)`;
    }

    const elPaidTotal = document.getElementById('kpi-paid-total');
    if (elPaidTotal) elPaidTotal.textContent = `${formatVND(metrics.totalPaidToBank)} đ`;

    const elDebtSub = document.getElementById('kpi-debt-sub');
    if (elDebtSub) elDebtSub.textContent = `CĐT còn nợ: ${formatVND(metrics.investorOutstandingDebt)} đ`;

    const barAccepted = document.getElementById('progress-bar-accepted');
    if (barAccepted) {
      const pct = Math.min(100, Math.max(0, metrics.globalCompletionPct));
      barAccepted.style.width = `${pct}%`;
    }
    const barText = document.getElementById('progress-bar-text');
    if (barText) barText.textContent = `Tiến độ nghiệm thu lũy kế: ${metrics.globalCompletionPct.toFixed(1)}%`;
  },

  // --- 2. RENDER TAB 1: DASHBOARD OVERVIEW ---
  renderDashboardTab() {
    const project = getActiveProject();
    if (!project) return;
    const metrics = Calculator.calculateGlobalProjectMetrics(project);

    const tbody = document.getElementById('dashboard-milestones-body');
    if (!tbody) return;

    if (!project.milestones || project.milestones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-500">Chưa có đợt thanh toán nào được tạo!</td></tr>`;
      return;
    }

    tbody.innerHTML = project.milestones.map((ms, idx) => {
      const fin = Calculator.calculateMilestoneFinancials(project, ms);
      const isCurrent = ms.id === AppState.activeMilestoneId;

      const statusBadge = {
        draft: '<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Dự thảo</span>',
        inspected: '<span class="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Đã nghiệm thu</span>',
        approved: '<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Đã ký duyệt</span>',
        paid: '<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã nhận tiền</span>'
      }[ms.status] || ms.status;

      return `
        <tr class="hover:bg-slate-800/60 transition ${isCurrent ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' : ''}">
          <td class="p-3 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-3 font-mono font-semibold text-emerald-400">${escapeHtml(ms.code || `DOT-0${idx + 1}`)}</td>
          <td class="p-3">
            <div class="font-medium text-white">${escapeHtml(ms.name)}</div>
            <div class="text-[11px] text-slate-400 font-mono">${formatDateVN(ms.startDate)} &rarr; ${formatDateVN(ms.endDate)}</div>
          </td>
          <td class="p-3 text-center">${statusBadge}</td>
          <td class="p-3 text-right font-mono font-semibold text-white">${formatVND(fin.grossThisPeriod)} đ</td>
          <td class="p-3 text-right font-mono text-amber-400">-${formatVND(fin.advanceDeduction)} đ</td>
          <td class="p-3 text-right font-mono text-cyan-400">-${formatVND(fin.retentionDeduction)} đ</td>
          <td class="p-3 text-right font-mono font-bold text-emerald-400">${formatVND(fin.netPayment)} đ</td>
          <td class="p-3 text-center">
            <button class="btn-jump-milestone px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs transition" data-id="${ms.id}">
              <i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> Mở Đợt
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.btn-jump-milestone').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.activeMilestoneId = btn.dataset.id;
        saveAppState();
        switchTab('tab-payment');
      });
    });
  },

  // --- 3. RENDER TAB 2: BOQ CONTRACT & ITEMS ---
  renderBOQTab() {
    const project = getActiveProject();
    if (!project) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('proj-name', project.info.name || '');
    setVal('proj-code', project.info.code || '');
    setVal('proj-package', project.info.package || '');
    setVal('proj-investor', project.info.investor || '');
    setVal('proj-contractor', project.info.contractor || '');
    setVal('proj-supervision', project.info.supervision || '');
    setVal('proj-contract-no', project.info.contractNo || '');
    setVal('proj-advance-pct', project.info.advancePct || 20);
    setVal('proj-retention-pct', project.info.retentionPct || 5);
    setVal('proj-advance-amount', project.info.advanceAmount || 0);

    const tbody = document.getElementById('boq-table-body');
    if (!tbody) return;

    let grandTotal = 0;
    tbody.innerHTML = (project.boqItems || []).map((item, idx) => {
      const origQty = parseFloat(item.contractQty) || 0;
      const varQty = parseFloat(item.variationQty) || 0;
      const approvedQty = origQty + varQty;
      const price = parseFloat(item.unitPrice) || 0;
      const totalAmount = approvedQty * price;
      grandTotal += totalAmount;

      return `
        <tr class="hover:bg-slate-800/50 transition" data-id="${item.id}">
          <td class="p-2.5 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-2 font-mono text-emerald-400 font-semibold">
            <input type="text" class="table-input-cell font-mono text-emerald-400 text-left input-boq-code" data-id="${item.id}" value="${escapeHtml(item.code)}">
          </td>
          <td class="p-2">
            <input type="text" class="table-input-cell text-left text-white font-medium input-boq-name" data-id="${item.id}" value="${escapeHtml(item.name)}">
          </td>
          <td class="p-2 text-center">
            <input type="text" class="table-input-cell text-center font-mono text-slate-300 input-boq-unit" data-id="${item.id}" value="${escapeHtml(item.unit)}">
          </td>
          <td class="p-2 text-right">
            <input type="number" step="any" class="table-input-cell text-right font-mono text-slate-300 input-boq-contract-qty" data-id="${item.id}" value="${origQty}">
          </td>
          <td class="p-2 text-right">
            <input type="number" step="any" class="table-input-cell text-right font-mono ${varQty !== 0 ? 'text-amber-400 font-bold' : 'text-slate-500'} input-boq-var-qty" data-id="${item.id}" value="${varQty}" title="Khối lượng phát sinh (+/-)">
          </td>
          <td class="p-2.5 text-right font-mono font-bold text-emerald-400">${formatQty(approvedQty)}</td>
          <td class="p-2 text-right">
            <input type="number" step="any" class="table-input-cell text-right font-mono text-slate-300 input-boq-price" data-id="${item.id}" value="${price}">
          </td>
          <td class="p-2.5 text-right font-mono font-bold text-white">${formatVND(totalAmount)} đ</td>
          <td class="p-2 text-center">
            <button class="btn-delete-boq p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition" data-id="${item.id}" title="Xóa đầu việc">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const statEl = document.getElementById('stat-boq-grand-total');
    if (statEl) statEl.textContent = `${formatVND(grandTotal)} đ`;

    this.attachBOQTableEvents();
  },

  attachBOQTableEvents() {
    const project = getActiveProject();
    if (!project) return;

    document.querySelectorAll('.btn-delete-boq').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('Bạn có chắc muốn xóa công tác này khỏi danh mục hợp đồng?')) {
          project.boqItems = project.boqItems.filter(i => i.id !== id);
          saveAppState();
          UIRenderer.renderAll();
          showToast('Đã xóa đầu việc khỏi BOQ.', 'info');
        }
      });
    });

    const updateItem = (id, field, value) => {
      const item = project.boqItems.find(i => i.id === id);
      if (item) {
        item[field] = value;
        saveAppState();
        UIRenderer.renderHeaderAndKPIs();
        const metrics = Calculator.calculateBOQSummary(project);
        const statEl = document.getElementById('stat-boq-grand-total');
        if (statEl) statEl.textContent = `${formatVND(metrics.totalApprovedAmount)} đ`;
      }
    };

    document.querySelectorAll('.input-boq-code').forEach(el => el.addEventListener('change', e => updateItem(e.target.dataset.id, 'code', e.target.value)));
    document.querySelectorAll('.input-boq-name').forEach(el => el.addEventListener('change', e => updateItem(e.target.dataset.id, 'name', e.target.value)));
    document.querySelectorAll('.input-boq-unit').forEach(el => el.addEventListener('change', e => updateItem(e.target.dataset.id, 'unit', e.target.value)));
    document.querySelectorAll('.input-boq-contract-qty').forEach(el => el.addEventListener('change', e => {
      updateItem(e.target.dataset.id, 'contractQty', parseFloat(e.target.value) || 0);
      UIRenderer.renderBOQTab();
    }));
    document.querySelectorAll('.input-boq-var-qty').forEach(el => el.addEventListener('change', e => {
      updateItem(e.target.dataset.id, 'variationQty', parseFloat(e.target.value) || 0);
      UIRenderer.renderBOQTab();
    }));
    document.querySelectorAll('.input-boq-price').forEach(el => el.addEventListener('change', e => {
      updateItem(e.target.dataset.id, 'unitPrice', parseFloat(e.target.value) || 0);
      UIRenderer.renderBOQTab();
    }));
  },
  // --- 4. RENDER TAB 3: PAYMENT ALLOCATION ---
  renderPaymentTab() {
    const project = getActiveProject();
    if (!project) return;

    const select = document.getElementById('select-active-milestone');
    if (select) {
      select.innerHTML = (project.milestones || []).map(ms => {
        const isSel = ms.id === AppState.activeMilestoneId ? 'selected' : '';
        return `<option value="${ms.id}" ${isSel}>${escapeHtml(ms.code || 'Đợt')} - ${escapeHtml(ms.name)}</option>`;
      }).join('');
    }

    const activeMs = getActiveMilestone();
    if (!activeMs) {
      document.getElementById('payment-table-body').innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-500">Chưa có đợt thanh toán nào! Vui lòng bấm "Tạo Đợt Mới".</td></tr>`;
      return;
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('ms-name', activeMs.name || '');
    setVal('ms-code', activeMs.code || '');
    setVal('ms-start-date', activeMs.startDate || '');
    setVal('ms-end-date', activeMs.endDate || '');
    setVal('ms-submission-date', activeMs.submissionDate || '');
    setVal('ms-status', activeMs.status || 'draft');
    setVal('ms-adv-rate', activeMs.advanceDeductionRate !== undefined ? activeMs.advanceDeductionRate : (project.info.advancePct || 20));
    setVal('ms-ret-rate', activeMs.retentionRate !== undefined ? activeMs.retentionRate : (project.info.retentionPct || 5));
    setVal('ms-other-deductions', activeMs.otherDeductions || 0);
    setVal('ms-paid-amount', activeMs.paidAmount || 0);

    const fin = Calculator.calculateMilestoneFinancials(project, activeMs);
    const tbody = document.getElementById('payment-table-body');
    if (!tbody) return;

    tbody.innerHTML = fin.itemRows.map((row, idx) => {
      let statusBadge = '';
      if (row.isOverrun) {
        statusBadge = `<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> VƯỢT HĐ</span>`;
      } else if (row.isCompleted) {
        statusBadge = `<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">100% Xong</span>`;
      } else if (row.completionPct > 0) {
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">${row.completionPct.toFixed(1)}%</span>`;
      } else {
        statusBadge = `<span class="text-slate-500">Chưa làm</span>`;
      }

      const chainage = activeMs.chainageDetails ? activeMs.chainageDetails[row.itemId] : null;
      const hasChainage = chainage && (chainage.fromKm || chainage.toKm);

      return `
        <tr class="hover:bg-slate-800/50 transition ${row.isOverrun ? 'row-overrun' : (row.isCompleted ? 'row-completed' : '')}" data-id="${row.itemId}">
          <td class="p-2 text-center text-slate-500 font-mono text-[11px]">${idx + 1}</td>
          <td class="p-2 font-mono text-emerald-400 font-semibold text-[11px]">${escapeHtml(row.code)}</td>
          <td class="p-2">
            <div class="text-slate-200 font-medium text-xs">${escapeHtml(row.name)}</div>
            ${hasChainage ? `
              <div class="mt-0.5 inline-flex items-center gap-1 text-[10px] text-cyan-400 font-mono cursor-pointer hover:underline" onclick="if(window.openChainageModal) window.openChainageModal('${row.itemId}', '${activeMs.id}')" title="${escapeHtml(chainage.note || 'Xem/sửa lý trình')}">
                <i class="fa-solid fa-location-dot text-[9px]"></i> ${escapeHtml(chainage.fromKm || '')} ➔ ${escapeHtml(chainage.toKm || '')} ${chainage.position ? '(' + escapeHtml(chainage.position) + ')' : ''}
              </div>
            ` : ''}
          </td>
          <td class="p-2 text-center text-slate-400 font-mono text-[11px]">${escapeHtml(row.unit)}</td>
          <td class="p-2 text-right font-mono text-slate-300 text-xs">${formatQty(row.totalApprovedQty)}</td>
          <td class="p-2 text-right font-mono text-slate-400 text-xs bg-slate-900/40">${formatQty(row.prevQty)}</td>
          <td class="p-1.5 text-right border-x border-amber-500/30 bg-amber-500/10">
            <input type="number" step="any" class="table-input-cell text-amber-300 font-bold text-xs input-period-qty" data-id="${row.itemId}" value="${row.thisPeriodQty}">
          </td>
          <td class="p-2 text-right font-mono font-bold ${row.isOverrun ? 'text-rose-400' : 'text-emerald-400'} text-xs">${formatQty(row.totalCumulativeQty)}</td>
          <td class="p-2 text-right font-mono ${row.remainingQty < 0 ? 'text-rose-400 font-bold' : 'text-slate-300'} text-xs bg-slate-900/40">
            ${formatQty(row.remainingQty)}
          </td>
          <td class="p-2 text-right font-mono text-slate-400 text-[11px]">${formatVND(row.unitPrice)}</td>
          <td class="p-2 text-right font-mono font-bold text-emerald-400 text-xs">${formatVND(row.thisPeriodAmount)} đ</td>
          <td class="p-2 text-right font-mono text-cyan-300 text-xs">${formatVND(row.remainingValue)} đ</td>
          <td class="p-2 text-center text-xs">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('sum-period-gross').textContent = `${formatVND(fin.grossThisPeriod)} đ`;
    document.getElementById('sum-period-advance').textContent = `-${formatVND(fin.advanceDeduction)} đ`;
    document.getElementById('sum-period-retention').textContent = `-${formatVND(fin.retentionDeduction)} đ`;
    document.getElementById('sum-period-other').textContent = `-${formatVND(fin.otherDeductions)} đ`;
    document.getElementById('sum-period-net').textContent = `${formatVND(fin.netPayment)} đ`;
    document.getElementById('disp-debt-milestone').textContent = `CĐT đã trả: ${formatVND(fin.paidAmount)} đ | Còn nợ đợt này: ${formatVND(fin.balanceDue)} đ`;

    const overrunBanner = document.getElementById('banner-overrun-warning');
    if (overrunBanner) {
      if (fin.overrunCount > 0) {
        overrunBanner.classList.remove('hidden');
        document.getElementById('text-overrun-count').textContent = fin.overrunCount;
        document.getElementById('text-overrun-amount').textContent = `${formatVND(fin.totalOverrunAmount)} đ`;
      } else {
        overrunBanner.classList.add('hidden');
      }
    }

    this.attachPaymentTableEvents();
  },

  attachPaymentTableEvents() {
    const project = getActiveProject();
    const activeMs = getActiveMilestone();
    if (!project || !activeMs) return;

    document.querySelectorAll('.input-period-qty').forEach(input => {
      input.addEventListener('input', (e) => {
        const itemId = e.target.dataset.id;
        const val = parseFloat(e.target.value) || 0;
        activeMs.quantities[itemId] = val;
        saveAppState();
        UIRenderer.renderPaymentTab();
        UIRenderer.renderHeaderAndKPIs();
      });
    });
  },

  // --- 3B. RENDER TAB 3: XÁC NHẬN KHỐI LƯỢNG (CHỈ CÁC ĐẦU VIỆC CÓ PHÁT SINH KL) ---
  renderConfirmQtyTab() {
    const project = getActiveProject();
    if (!project) return;
    const activeMs = getActiveMilestone();
    if (!activeMs) return;

    const titleEl = document.getElementById('confirm-qty-ms-title');
    if (titleEl) titleEl.textContent = `${activeMs.code || 'ĐỢT'}: ${activeMs.name}`;

    const fin = Calculator.calculateMilestoneFinancials(project, activeMs);
    const tbody = document.getElementById('confirm-qty-table-body');
    if (!tbody || !fin) return;

    // Filter ONLY items with thisPeriodQty > 0
    const activeRows = fin.itemRows.filter(r => (r.thisPeriodQty || 0) > 0.0001 || (r.thisPeriodQty || 0) < -0.0001);

    // Update Quick Stats
    const countEl = document.getElementById('confirm-qty-count');
    if (countEl) countEl.textContent = `${activeRows.length} / ${project.boqItems.length} đầu việc`;

    const ratioEl = document.getElementById('confirm-qty-ratio');
    if (ratioEl) {
      const pct = project.boqItems.length > 0 ? (activeRows.length / project.boqItems.length) * 100 : 0;
      ratioEl.textContent = `${pct.toFixed(1)}% BOQ`;
    }

    let chainageCount = 0;
    activeRows.forEach(r => {
      const ch = activeMs.chainageDetails ? activeMs.chainageDetails[r.itemId] : null;
      if (ch && (ch.fromKm || ch.toKm || ch.note)) chainageCount++;
    });
    const chainageCountEl = document.getElementById('confirm-qty-chainage-count');
    if (chainageCountEl) chainageCountEl.textContent = `${chainageCount} công tác`;

    if (activeRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="p-8 text-center text-slate-500">
            <div class="max-w-md mx-auto space-y-3">
              <i class="fa-solid fa-folder-open text-3xl text-slate-600"></i>
              <div class="text-sm font-semibold text-slate-300">Chưa có công tác nào phát sinh khối lượng trong đợt này</div>
              <p class="text-xs text-slate-500">Bạn hãy bấm nút bên dưới để tải bảng Excel đợt thi công lên hoặc quay lại Tab 2 để nhập khối lượng.</p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <button onclick="switchTab('tab-payment')" class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition">
                  <i class="fa-solid fa-file-excel mr-1"></i> Sang Tab 2 Nạp File Excel
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = activeRows.map((row, idx) => {
      const chainage = activeMs.chainageDetails ? activeMs.chainageDetails[row.itemId] : null;
      const hasChainage = chainage && (chainage.fromKm || chainage.toKm || chainage.note);

      let chainageBadge = '';
      if (hasChainage) {
        chainageBadge = `
          <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] cursor-pointer hover:bg-cyan-900/50 transition" onclick="window.openChainageModal('${row.itemId}', '${activeMs.id}')" title="Bấm để sửa lý trình: ${escapeHtml(chainage.note || '')}">
            <i class="fa-solid fa-location-dot text-cyan-400"></i>
            <span>${escapeHtml(chainage.fromKm || '...')} &rarr; ${escapeHtml(chainage.toKm || '...')}</span>
            ${chainage.position && chainage.position !== 'Toàn tuyến' ? `<span class="text-cyan-400/70">(${escapeHtml(chainage.position)})</span>` : ''}
          </div>
        `;
      } else {
        chainageBadge = `
          <button class="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition py-1" onclick="window.openChainageModal('${row.itemId}', '${activeMs.id}')">
            <i class="fa-solid fa-plus text-[10px]"></i> Gắn lý trình
          </button>
        `;
      }

      return `
        <tr class="hover:bg-slate-800/40 transition group">
          <td class="p-3 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-3 text-center font-mono font-bold text-emerald-400">${escapeHtml(row.code)}</td>
          <td class="p-3 font-medium text-slate-200">
            <div>${escapeHtml(row.name)}</div>
          </td>
          <td class="p-3 text-center font-mono text-slate-400">${escapeHtml(row.unit)}</td>
          <td class="p-3 text-right font-mono text-slate-300">${formatQty(row.totalApprovedQty)}</td>
          <td class="p-3 text-right font-mono text-slate-400">${formatQty(row.prevQty)}</td>
          <td class="p-2 text-right border-x border-amber-500/30 bg-amber-500/10">
            <input type="number" step="any" class="table-input-cell text-amber-300 font-bold text-xs input-confirm-period-qty" data-id="${row.itemId}" value="${row.thisPeriodQty}">
          </td>
          <td class="p-3 text-right font-mono font-bold ${row.isOverrun ? 'text-rose-400' : 'text-emerald-400'}">${formatQty(row.totalCumulativeQty)}</td>
          <td class="p-3">${chainageBadge}</td>
          <td class="p-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button class="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-900/40 text-slate-400 hover:text-cyan-300 transition" onclick="window.openChainageModal('${row.itemId}', '${activeMs.id}')" title="Sửa chi tiết khối lượng & lý trình">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition" onclick="window.clearItemFromMilestone('${row.itemId}')" title="Gỡ công việc này khỏi đợt">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.attachConfirmQtyEvents();
  },

  attachConfirmQtyEvents() {
    const project = getActiveProject();
    const activeMs = getActiveMilestone();
    if (!project || !activeMs) return;

    document.querySelectorAll('.input-confirm-period-qty').forEach(input => {
      input.addEventListener('input', (e) => {
        const itemId = e.target.dataset.id;
        const val = parseFloat(e.target.value) || 0;
        activeMs.quantities[itemId] = val;
        saveAppState();
        UIRenderer.renderHeaderAndKPIs();
      });
      input.addEventListener('change', () => {
        UIRenderer.renderAll();
      });
    });
  },

  // --- 3C. RENDER TAB 4: TỔNG HỢP GIÁ TRỊ THANH TOÁN KỲ NÀY ---
  renderValueSummaryTab() {
    const project = getActiveProject();
    if (!project) return;
    const activeMs = getActiveMilestone();
    if (!activeMs) return;

    const titleEl = document.getElementById('value-summary-ms-title');
    if (titleEl) titleEl.textContent = `${activeMs.code || 'ĐỢT'}: ${activeMs.name}`;

    const fin = Calculator.calculateMilestoneFinancials(project, activeMs);
    const tbody = document.getElementById('value-summary-table-body');
    if (!tbody || !fin) return;

    // Filter items with thisPeriodQty > 0
    const activeRows = fin.itemRows.filter(r => (r.thisPeriodQty || 0) > 0.0001 || (r.thisPeriodQty || 0) < -0.0001);

    // Update KPI cards
    const elGross = document.getElementById('value-kpi-gross');
    if (elGross) elGross.textContent = `${formatVND(fin.grossThisPeriod)} đ`;

    const elAdvance = document.getElementById('value-kpi-advance');
    if (elAdvance) elAdvance.textContent = `-${formatVND(fin.advanceDeduction)} đ`;

    const elRetention = document.getElementById('value-kpi-retention');
    if (elRetention) elRetention.textContent = `-${formatVND(fin.retentionDeduction)} đ`;

    const elNet = document.getElementById('value-kpi-net');
    if (elNet) elNet.textContent = `${formatVND(fin.netPayment)} đ`;

    const elTotalAmount = document.getElementById('value-summary-total-amount');
    if (elTotalAmount) elTotalAmount.textContent = `${formatVND(fin.grossThisPeriod)} đ`;

    if (activeRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-500">
            Chưa có công tác nào có khối lượng trong đợt này để tính giá trị.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = activeRows.map((row, idx) => {
      const sharePct = fin.grossThisPeriod > 0 ? (row.thisPeriodAmount / fin.grossThisPeriod) * 100 : 0;
      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-3 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-3 text-center font-mono font-bold text-emerald-400">${escapeHtml(row.code)}</td>
          <td class="p-3 font-medium text-slate-200">${escapeHtml(row.name)}</td>
          <td class="p-3 text-center font-mono text-slate-400">${escapeHtml(row.unit)}</td>
          <td class="p-3 text-right font-mono font-bold text-amber-300 bg-amber-500/5">${formatQty(row.thisPeriodQty)}</td>
          <td class="p-3 text-right font-mono text-slate-300">${formatVND(row.unitPrice)}</td>
          <td class="p-3 text-right font-mono font-bold text-emerald-400 text-sm">${formatVND(row.thisPeriodAmount)} đ</td>
          <td class="p-3 text-center font-mono text-slate-400">${sharePct.toFixed(1)}%</td>
        </tr>
      `;
    }).join('');
  },

  // --- 5. RENDER TAB 4: REMAINING FORECAST ---
  renderRemainingTab() {
    const project = getActiveProject();
    if (!project) return;
    const metrics = Calculator.calculateGlobalProjectMetrics(project);

    const summaryText = document.getElementById('remaining-summary-text');
    if (summaryText) {
      summaryText.textContent = `Toàn dự án còn lại ${formatVND(metrics.remainingProjectValue)} đ (${(100 - metrics.globalCompletionPct).toFixed(1)}% giá trị hợp đồng), phân bổ trên ${metrics.remainingItems.length} hạng mục công tác chưa hoàn thành.`;
    }

    const tbody = document.getElementById('remaining-table-body');
    if (!tbody) return;

    if (metrics.remainingItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-emerald-400 font-bold"><i class="fa-solid fa-circle-check mr-2 text-lg"></i> Toàn bộ công tác trong hợp đồng đã được nghiệm thu 100%! Không còn khối lượng tồn đọng.</td></tr>`;
      return;
    }

    tbody.innerHTML = metrics.remainingItems.map((item, idx) => {
      const pctBarWidth = Math.min(100, Math.max(0, item.pctRemaining));
      return `
        <tr class="hover:bg-slate-800/50 transition">
          <td class="p-2.5 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-2.5 font-mono text-emerald-400 font-semibold">${escapeHtml(item.code)}</td>
          <td class="p-2.5"><div class="font-medium text-white">${escapeHtml(item.name)}</div></td>
          <td class="p-2.5 text-center font-mono text-slate-400">${escapeHtml(item.unit)}</td>
          <td class="p-2.5 text-right font-mono text-slate-300">${formatQty(item.approvedQty)}</td>
          <td class="p-2.5 text-right font-mono text-slate-400 bg-slate-900/40">${formatQty(item.cumQty)}</td>
          <td class="p-2.5 text-right font-mono font-bold text-amber-300">${formatQty(item.remQty)}</td>
          <td class="p-2.5 text-right font-mono text-slate-400">${formatVND(item.unitPrice)}</td>
          <td class="p-2.5 text-right font-mono font-bold text-cyan-400 text-sm">${formatVND(item.remValue)} đ</td>
          <td class="p-2.5 w-32">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div class="bg-amber-400 h-2 rounded-full" style="width: ${pctBarWidth}%"></div>
              </div>
              <span class="text-[11px] font-mono text-slate-400 w-10 text-right">${item.pctRemaining.toFixed(0)}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const overrunTbody = document.getElementById('overrun-items-body');
    const overrunCard = document.getElementById('card-overrun-analysis');
    if (overrunCard && overrunTbody) {
      if (metrics.overrunItems.length > 0) {
        overrunCard.classList.remove('hidden');
        overrunTbody.innerHTML = metrics.overrunItems.map((ov, idx) => `
          <tr class="hover:bg-rose-950/20 transition text-rose-300">
            <td class="p-2 text-center font-mono">${idx + 1}</td>
            <td class="p-2 font-mono font-bold">${escapeHtml(ov.code)}</td>
            <td class="p-2 font-medium">${escapeHtml(ov.name)}</td>
            <td class="p-2 text-center font-mono">${escapeHtml(ov.unit)}</td>
            <td class="p-2 text-right font-mono">${formatQty(ov.approvedQty)}</td>
            <td class="p-2 text-right font-mono">${formatQty(ov.cumQty)}</td>
            <td class="p-2 text-right font-mono font-bold">+${formatQty(ov.overrunQty)}</td>
            <td class="p-2 text-right font-mono font-bold">+${formatVND(ov.overrunValue)} đ</td>
            <td class="p-2 text-center"><span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold">Cần Lập Phụ Lục HĐ</span></td>
          </tr>
        `).join('');
      } else {
        overrunCard.classList.add('hidden');
      }
    }
  },

  // --- 5. RENDER TAB 4: MATRIX TỔNG HỢP CÁC ĐỢT & LÝ TRÌNH ---
  renderMatrixTab() {
    const project = getActiveProject();
    if (!project) return;

    const theadRow = document.getElementById('matrix-table-header-row');
    const tbody = document.getElementById('matrix-table-body');
    if (!theadRow || !tbody) return;

    const milestones = project.milestones || [];
    const boqItems = project.boqItems || [];
    const searchTerm = (document.getElementById('filter-matrix-search')?.value || '').toLowerCase().trim();

    // 1. Build Header row
    let headerHtml = `
      <th class="p-3 text-center w-12 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">STT</th>
      <th class="p-3 text-center w-24 sticky left-12 z-20 bg-slate-900 border-r border-slate-800">Mã Hiệu</th>
      <th class="p-3 min-w-[280px] z-10 bg-slate-900 border-r border-slate-800">Nội Dung Hạng Mục BOQ</th>
      <th class="p-3 text-center w-16 bg-slate-900 border-r border-slate-800">ĐVT</th>
      <th class="p-3 text-right w-28 bg-slate-900 border-r border-slate-800">Khối Lượng HĐ</th>
    `;

    milestones.forEach((ms, idx) => {
      const isCurrentActive = ms.id === AppState.activeMilestoneId;
      headerHtml += `
        <th class="p-3 text-center min-w-[170px] border-r border-slate-800 ${isCurrentActive ? 'bg-cyan-950/40 text-cyan-300 font-bold' : 'bg-slate-900'}">
          <div class="flex items-center justify-center gap-1">
            <span>${escapeHtml(ms.code || `ĐỢT ${idx + 1}`)}</span>
            ${isCurrentActive ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>' : ''}
          </div>
          <div class="text-[10px] text-slate-400 font-normal truncate max-w-[160px] mx-auto mt-0.5" title="${escapeHtml(ms.name)}">
            ${escapeHtml(ms.name)}
          </div>
        </th>
      `;
    });

    headerHtml += `
      <th class="p-3 text-right w-28 bg-slate-900 border-r border-slate-800 text-emerald-400 font-bold">Lũy Kế Thực Hiện</th>
      <th class="p-3 text-right w-28 bg-slate-900 border-r border-slate-800 text-amber-300">Khối Lượng Còn Lại</th>
      <th class="p-3 text-center w-24 bg-slate-900 text-cyan-400">Tỷ Lệ (%)</th>
    `;
    theadRow.innerHTML = headerHtml;

    // 2. Filter BOQ items
    const filteredItems = boqItems.filter(item => {
      if (!searchTerm) return true;
      return (item.name && item.name.toLowerCase().includes(searchTerm)) ||
             (item.code && item.code.toLowerCase().includes(searchTerm));
    });

    if (filteredItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${5 + milestones.length + 3}" class="p-8 text-center text-slate-500 italic">
            Không tìm thấy hạng mục nào phù hợp với từ khóa "${escapeHtml(searchTerm)}".
          </td>
        </tr>
      `;
      return;
    }

    // 3. Render Body Rows
    tbody.innerHTML = filteredItems.map((item, idx) => {
      const contractQty = (item.contractQty || 0) + (item.variationQty || 0);
      let cumTotal = 0;

      let msCellsHtml = '';
      milestones.forEach(ms => {
        const qty = (ms.quantities && ms.quantities[item.id]) ? Number(ms.quantities[item.id]) : 0;
        cumTotal += qty;

        const chainage = ms.chainageDetails ? ms.chainageDetails[item.id] : null;
        const hasChainage = chainage && (chainage.fromKm || chainage.toKm || chainage.note || chainage.position);

        let cellContent = '';
        if (qty > 0) {
          cellContent += `<div class="font-bold text-slate-100 text-xs">${formatQty(qty)} <span class="text-[10px] text-slate-400 font-normal">${escapeHtml(item.unit)}</span></div>`;
        } else {
          cellContent += `<div class="text-slate-600 font-normal text-xs">-</div>`;
        }

        if (hasChainage) {
          const from = chainage.fromKm || '...';
          const to = chainage.toKm || '...';
          const pos = chainage.position && chainage.position !== 'Toàn tuyến' ? ` (${chainage.position})` : '';
          cellContent += `
            <div class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 text-[10px] font-mono leading-none" title="${escapeHtml(chainage.note || '')}">
              <i class="fa-solid fa-location-dot text-cyan-400 text-[9px]"></i>
              <span>${escapeHtml(from)} &rarr; ${escapeHtml(to)}${escapeHtml(pos)}</span>
            </div>
          `;
        }

        msCellsHtml += `
          <td class="matrix-cell p-2 text-center border-r border-slate-800 cursor-pointer transition hover:bg-cyan-900/30 group relative ${qty > 0 ? 'bg-slate-900/40' : ''}"
              data-item-id="${escapeHtml(item.id)}"
              data-ms-id="${escapeHtml(ms.id)}"
              title="Nhấp để xem hoặc nhập tay khối lượng & lý trình">
            ${cellContent}
            <span class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition text-[9px] text-cyan-400">
              <i class="fa-solid fa-pen"></i>
            </span>
          </td>
        `;
      });

      const remaining = contractQty - cumTotal;
      const pct = contractQty > 0 ? (cumTotal / contractQty) * 100 : 0;
      const isOver = cumTotal > contractQty && contractQty > 0;

      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-2.5 text-center font-mono text-slate-400 sticky left-0 z-10 bg-slate-900/95 border-r border-slate-800">${idx + 1}</td>
          <td class="p-2.5 text-center font-mono font-bold text-emerald-400 sticky left-12 z-10 bg-slate-900/95 border-r border-slate-800">${escapeHtml(item.code)}</td>
          <td class="p-2.5 font-sans font-medium text-slate-200 border-r border-slate-800">
            <div>${escapeHtml(item.name)}</div>
          </td>
          <td class="p-2.5 text-center font-mono text-slate-400 border-r border-slate-800">${escapeHtml(item.unit)}</td>
          <td class="p-2.5 text-right font-mono font-semibold text-white border-r border-slate-800">${formatQty(contractQty)}</td>
          ${msCellsHtml}
          <td class="p-2.5 text-right font-mono font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'} border-r border-slate-800">
            ${formatQty(cumTotal)}
            ${isOver ? '<div class="text-[9px] text-rose-400 font-sans font-normal">(Vượt HĐ)</div>' : ''}
          </td>
          <td class="p-2.5 text-right font-mono font-medium ${remaining < 0 ? 'text-rose-400' : 'text-amber-300'} border-r border-slate-800">
            ${formatQty(remaining)}
          </td>
          <td class="p-2.5 text-center font-mono">
            <span class="inline-block px-2 py-0.5 rounded text-[11px] font-bold ${pct >= 100 ? 'bg-emerald-500/20 text-emerald-300' : (pct > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500')}">
              ${pct.toFixed(1)}%
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  // --- 6. RENDER PRINT CANVAS ---
  renderPrintCanvas(docType = 'pl03a') {
    AppState.activePrintDoc = docType;
    const project = getActiveProject();
    if (!project) return;
    const activeMs = getActiveMilestone();
    const fin = activeMs ? Calculator.calculateMilestoneFinancials(project, activeMs) : null;
    const canvas = document.getElementById('printable-canvas');
    if (!canvas || !fin) return;

    if (docType === 'pl03a') {
      canvas.innerHTML = `
        <div class="text-center space-y-1 mb-6">
          <p class="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p class="font-bold text-xs uppercase underline">Độc lập - Tự do - Hạnh phúc</p>
          <p class="text-[11px] text-gray-500 mt-2 italic">Phụ lục số 03.a - Ban hành kèm theo Nghị định số 99/2021/NĐ-CP</p>
        </div>
        <div class="text-center my-4">
          <h2 class="font-bold text-base uppercase">BẢNG XÁC ĐỊNH GIÁ TRỊ KHỐI LƯỢNG CÔNG VIỆC HOÀN THÀNH</h2>
          <p class="text-xs italic">Kèm theo Giấy đề nghị thanh toán vốn đầu tư ${escapeHtml(activeMs.name)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs mb-4 border-b pb-3">
          <div><strong>Tên dự án:</strong> ${escapeHtml(project.info.name)}</div>
          <div><strong>Chủ đầu tư:</strong> ${escapeHtml(project.info.investor)}</div>
          <div><strong>Gói thầu:</strong> ${escapeHtml(project.info.package)}</div>
          <div><strong>Nhà thầu:</strong> ${escapeHtml(project.info.contractor)}</div>
          <div><strong>Hợp đồng số:</strong> ${escapeHtml(project.info.contractNo)}</div>
          <div><strong>Thời gian:</strong> Từ ${formatDateVN(activeMs.startDate)} đến ${formatDateVN(activeMs.endDate)}</div>
        </div>
        <table class="w-full border-collapse border border-gray-400 text-[11px] mb-4">
          <thead>
            <tr class="bg-gray-100 font-bold text-center">
              <th class="border border-gray-400 p-1 w-8">STT</th>
              <th class="border border-gray-400 p-1 w-20">Mã hiệu</th>
              <th class="border border-gray-400 p-1">Nội dung công việc</th>
              <th class="border border-gray-400 p-1 w-12">ĐVT</th>
              <th class="border border-gray-400 p-1 w-16">KL Hợp đồng</th>
              <th class="border border-gray-400 p-1 w-16">Lũy kế trước</th>
              <th class="border border-gray-400 p-1 w-16 bg-amber-50">Kỳ này</th>
              <th class="border border-gray-400 p-1 w-16">Lũy kế hết kỳ</th>
              <th class="border border-gray-400 p-1 w-16">KL Còn lại</th>
              <th class="border border-gray-400 p-1 w-20">Đơn giá (đ)</th>
              <th class="border border-gray-400 p-1 w-24">Thành tiền kỳ này (đ)</th>
            </tr>
          </thead>
          <tbody>
            ${fin.itemRows.map((r, i) => {
              const prevStr = (r.prevQty > 0.0001 || r.prevQty < -0.0001) ? formatQty(r.prevQty) : '';
              const periodStr = (r.thisPeriodQty > 0.0001 || r.thisPeriodQty < -0.0001) ? formatQty(r.thisPeriodQty) : '';
              const cumStr = (r.totalCumulativeQty > 0.0001) ? formatQty(r.totalCumulativeQty) : '';
              const remStr = (r.remainingQty > 0.0001 || r.remainingQty < -0.0001) ? formatQty(r.remainingQty) : '';
              const amountStr = (r.thisPeriodAmount > 0.0001) ? formatVND(r.thisPeriodAmount) : '';

              return `
              <tr>
                <td class="border border-gray-400 p-1 text-center font-mono">${i + 1}</td>
                <td class="border border-gray-400 p-1 font-mono">${escapeHtml(r.code)}</td>
                <td class="border border-gray-400 p-1">${escapeHtml(r.name)}</td>
                <td class="border border-gray-400 p-1 text-center font-mono">${escapeHtml(r.unit)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatQty(r.totalApprovedQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${prevStr}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold ${periodStr ? 'bg-amber-50' : ''}">${periodStr}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold">${cumStr}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${remStr}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatVND(r.unitPrice)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold">${amountStr}</td>
              </tr>
            `;
            }).join('')}
            <tr class="font-bold bg-gray-100">
              <td colspan="10" class="border border-gray-400 p-1.5 text-right uppercase">Tổng giá trị hoàn thành kỳ này:</td>
              <td class="border border-gray-400 p-1.5 text-right font-mono">${formatVND(fin.grossThisPeriod)} đ</td>
            </tr>
            <tr>
              <td colspan="10" class="border border-gray-400 p-1 text-right">Giảm trừ thu hồi tạm ứng (${activeMs.advanceDeductionRate || project.info.advancePct}%):</td>
              <td class="border border-gray-400 p-1 text-right font-mono text-red-600">-${formatVND(fin.advanceDeduction)} đ</td>
            </tr>
            <tr>
              <td colspan="10" class="border border-gray-400 p-1 text-right">Giảm trừ giữ lại bảo hành công trình (${activeMs.retentionRate || project.info.retentionPct}%):</td>
              <td class="border border-gray-400 p-1 text-right font-mono text-red-600">-${formatVND(fin.retentionDeduction)} đ</td>
            </tr>
            ${fin.otherDeductions > 0 ? `
              <tr>
                <td colspan="10" class="border border-gray-400 p-1 text-right">Các khoản khấu trừ khác:</td>
                <td class="border border-gray-400 p-1 text-right font-mono text-red-600">-${formatVND(fin.otherDeductions)} đ</td>
              </tr>
            ` : ''}
            <tr class="font-bold text-xs bg-emerald-50">
              <td colspan="10" class="border border-gray-400 p-2 text-right uppercase text-emerald-800">SỐ TIỀN ĐỀ NGHỊ THANH TOÁN KỲ NÀY:</td>
              <td class="border border-gray-400 p-2 text-right font-mono text-emerald-800 text-sm">${formatVND(fin.netPayment)} đ</td>
            </tr>
          </tbody>
        </table>
        <div class="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-4">
          <div>
            <p class="font-bold uppercase">ĐẠI DIỆN NHÀ THẦU</p>
            <p class="text-[11px] text-gray-500 italic mb-16">(Ký, ghi rõ họ tên và đóng dấu)</p>
            <p class="font-bold">${escapeHtml(project.info.commander || 'Chỉ huy trưởng')}</p>
          </div>
          <div>
            <p class="font-bold uppercase">TƯ VẤN GIÁM SÁT</p>
            <p class="text-[11px] text-gray-500 italic mb-16">(Ký, ghi rõ họ tên)</p>
            <p class="font-bold">${escapeHtml(project.info.supervisionChief || 'Tư vấn giám sát trưởng')}</p>
          </div>
          <div>
            <p class="font-bold uppercase">ĐẠI DIỆN CHỦ ĐẦU TƯ</p>
            <p class="text-[11px] text-gray-500 italic mb-16">(Ký, ghi rõ họ tên và đóng dấu)</p>
            <p class="font-bold">${escapeHtml(project.info.investorRep || 'Giám đốc Ban QLDA')}</p>
          </div>
        </div>
      `;
    } else {
      canvas.innerHTML = `
        <div class="text-center space-y-1 mb-6">
          <p class="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p class="font-bold text-xs uppercase underline">Độc lập - Tự do - Hạnh phúc</p>
        </div>
        <div class="text-center my-6">
          <h2 class="font-bold text-lg uppercase">GIẤY ĐỀ NGHỊ THANH TOÁN VỐN ĐẦU TƯ</h2>
          <p class="text-xs italic">Kính gửi: ${escapeHtml(project.info.investor)}</p>
        </div>
        <div class="space-y-3 text-xs leading-relaxed">
          <p>- Căn cứ Hợp đồng số: <strong>${escapeHtml(project.info.contractNo)}</strong>.</p>
          <p>- Căn cứ Bảng xác định giá trị khối lượng hoàn thành (Phụ lục 03.a) lập ngày ${formatDateVN(activeMs.submissionDate || activeMs.endDate)}.</p>
          <p class="mt-4 font-semibold">Nhà thầu kính đề nghị Chủ đầu tư xem xét và giải ngân thanh toán kỳ này với nội dung sau:</p>
          <table class="w-full border-collapse border border-gray-400 text-xs my-3">
            <tr class="bg-gray-100">
              <th class="border border-gray-400 p-2 text-center w-10">STT</th>
              <th class="border border-gray-400 p-2 text-left">Nội Dung</th>
              <th class="border border-gray-400 p-2 text-right w-44">Giá Trị (VNĐ)</th>
            </tr>
            <tr>
              <td class="border border-gray-400 p-2 text-center font-mono">1</td>
              <td class="border border-gray-400 p-2">Giá trị khối lượng nghiệm thu hoàn thành kỳ này</td>
              <td class="border border-gray-400 p-2 text-right font-mono font-bold">${formatVND(fin.grossThisPeriod)} đ</td>
            </tr>
            <tr>
              <td class="border border-gray-400 p-2 text-center font-mono">2</td>
              <td class="border border-gray-400 p-2">Khấu trừ thu hồi tạm ứng (${activeMs.advanceDeductionRate || project.info.advancePct}%)</td>
              <td class="border border-gray-400 p-2 text-right font-mono text-red-600">-${formatVND(fin.advanceDeduction)} đ</td>
            </tr>
            <tr>
              <td class="border border-gray-400 p-2 text-center font-mono">3</td>
              <td class="border border-gray-400 p-2">Khấu trừ giữ lại bảo hành công trình (${activeMs.retentionRate || project.info.retentionPct}%)</td>
              <td class="border border-gray-400 p-2 text-right font-mono text-red-600">-${formatVND(fin.retentionDeduction)} đ</td>
            </tr>
            ${fin.otherDeductions > 0 ? `
              <tr>
                <td class="border border-gray-400 p-2 text-center font-mono">4</td>
                <td class="border border-gray-400 p-2">Các khoản khấu trừ khác</td>
                <td class="border border-gray-400 p-2 text-right font-mono text-red-600">-${formatVND(fin.otherDeductions)} đ</td>
              </tr>
            ` : ''}
            <tr class="font-bold bg-emerald-50 text-emerald-900">
              <td class="border border-gray-400 p-2.5 text-center font-mono">5</td>
              <td class="border border-gray-400 p-2.5 uppercase">SỐ TIỀN THỰC ĐỀ NGHỊ THANH TOÁN:</td>
              <td class="border border-gray-400 p-2.5 text-right font-mono text-sm">${formatVND(fin.netPayment)} đ</td>
            </tr>
          </table>
          <p>Kính mong Quý Chủ đầu tư sớm làm thủ tục giải ngân chuyển khoản để nhà thầu tiếp tục thi công đảm bảo tiến độ.</p>
        </div>
        <div class="grid grid-cols-2 gap-4 text-center text-xs mt-12 pt-4">
          <div></div>
          <div>
            <p class="italic text-[11px] mb-1">Ngày ..... tháng ..... năm 2026</p>
            <p class="font-bold uppercase">ĐẠI DIỆN NHÀ THẦU THI CÔNG</p>
            <p class="text-[11px] text-gray-500 italic mb-20">(Ký tên và đóng dấu)</p>
            <p class="font-bold">${escapeHtml(project.info.commander || 'Chỉ huy trưởng')}</p>
          </div>
        </div>
      `;
    }
  },

  renderAll() {
    this.renderHeaderAndKPIs();
    this.renderDashboardTab();
    this.renderBOQTab();
    this.renderPaymentTab();
    this.renderConfirmQtyTab();
    this.renderValueSummaryTab();
    this.renderMatrixTab();
    this.renderRemainingTab();
    this.renderPrintCanvas(AppState.activePrintDoc || 'pl03a');
  }
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const iconMap = {
    success: 'fa-circle-check text-emerald-400',
    error: 'fa-circle-xmark text-rose-400',
    warning: 'fa-triangle-exclamation text-amber-400',
    info: 'fa-circle-info text-cyan-400'
  };

  toast.className = 'flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs text-white transform transition-all duration-300 translate-y-2 opacity-0 z-50 backdrop-blur-md pointer-events-auto';
  toast.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info} text-sm"></i><span class="font-medium">${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 3500);
  }, 3500);
}
