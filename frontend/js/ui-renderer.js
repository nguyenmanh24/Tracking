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

    document.getElementById('proj-name').value = project.info.name || '';
    document.getElementById('proj-code').value = project.info.code || '';
    document.getElementById('proj-package').value = project.info.package || '';
    document.getElementById('proj-investor').value = project.info.investor || '';
    document.getElementById('proj-contractor').value = project.info.contractor || '';
    document.getElementById('proj-supervision').value = project.info.supervision || '';
    document.getElementById('proj-contract-no').value = project.info.contractNo || '';
    document.getElementById('proj-advance-pct').value = project.info.advancePct || 20;
    document.getElementById('proj-retention-pct').value = project.info.retentionPct || 5;
    document.getElementById('proj-advance-amount').value = project.info.advanceAmount || 0;

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

    document.getElementById('ms-name').value = activeMs.name || '';
    document.getElementById('ms-code').value = activeMs.code || '';
    document.getElementById('ms-start-date').value = activeMs.startDate || '';
    document.getElementById('ms-end-date').value = activeMs.endDate || '';
    document.getElementById('ms-submission-date').value = activeMs.submissionDate || '';
    document.getElementById('ms-status').value = activeMs.status || 'draft';
    document.getElementById('ms-adv-rate').value = activeMs.advanceDeductionRate !== undefined ? activeMs.advanceDeductionRate : (project.info.advancePct || 20);
    document.getElementById('ms-ret-rate').value = activeMs.retentionRate !== undefined ? activeMs.retentionRate : (project.info.retentionPct || 5);
    document.getElementById('ms-other-deductions').value = activeMs.otherDeductions || 0;
    document.getElementById('ms-paid-amount').value = activeMs.paidAmount || 0;

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

      return `
        <tr class="hover:bg-slate-800/50 transition ${row.isOverrun ? 'row-overrun' : (row.isCompleted ? 'row-completed' : '')}" data-id="${row.itemId}">
          <td class="p-2 text-center text-slate-500 font-mono text-[11px]">${idx + 1}</td>
          <td class="p-2 font-mono text-emerald-400 font-semibold text-[11px]">${escapeHtml(row.code)}</td>
          <td class="p-2">
            <div class="text-slate-200 font-medium text-xs">${escapeHtml(row.name)}</div>
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
            ${fin.itemRows.map((r, i) => `
              <tr>
                <td class="border border-gray-400 p-1 text-center font-mono">${i + 1}</td>
                <td class="border border-gray-400 p-1 font-mono">${escapeHtml(r.code)}</td>
                <td class="border border-gray-400 p-1">${escapeHtml(r.name)}</td>
                <td class="border border-gray-400 p-1 text-center font-mono">${escapeHtml(r.unit)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatQty(r.totalApprovedQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatQty(r.prevQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold bg-amber-50">${formatQty(r.thisPeriodQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold">${formatQty(r.totalCumulativeQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatQty(r.remainingQty)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono">${formatVND(r.unitPrice)}</td>
                <td class="border border-gray-400 p-1 text-right font-mono font-bold">${formatVND(r.thisPeriodAmount)}</td>
              </tr>
            `).join('')}
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
