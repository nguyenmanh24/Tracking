/**
 * CONSTRUCTION PAYMENT TRACKER PRO - MAIN APPLICATION CONTROLLER (PART 1)
 * Coordinates tabs, event handlers, milestone management, Excel importing, and document printing.
 */

// Global Tab Switcher
function switchTab(targetTabId) {
  AppState.activeTab = targetTabId;
  
  // Update navigation tab styles
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.dataset.tab === targetTabId) {
      btn.className = 'nav-tab active px-3.5 py-2 rounded-xl flex items-center gap-2 bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 transition';
    } else {
      btn.className = 'nav-tab px-3.5 py-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2 transition hover:bg-slate-800';
    }
  });

  // Toggle tab sections
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === targetTabId) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  // Re-render relevant view
  if (targetTabId === 'tab-contract') UIRenderer.renderBOQTab();
  if (targetTabId === 'tab-payment') UIRenderer.renderPaymentTab();
  if (targetTabId === 'tab-confirm-qty') UIRenderer.renderConfirmQtyTab();
  if (targetTabId === 'tab-value-summary') UIRenderer.renderValueSummaryTab();
  if (targetTabId === 'tab-export') UIRenderer.renderPrintCanvas(AppState.activePrintDoc || 'pl03a');
  if (targetTabId === 'tab-matrix') UIRenderer.renderMatrixTab();
  if (targetTabId === 'tab-remaining') UIRenderer.renderRemainingTab();
  if (targetTabId === 'tab-dashboard') UIRenderer.renderDashboardTab();
  
  UIRenderer.renderHeaderAndKPIs();
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State
  initAppState();

  // 2. Initial Render
  UIRenderer.renderAll();

  // 3. Tab Buttons Click Handlers
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // 4. Milestone Selector Changed
  const selectMilestone = document.getElementById('select-active-milestone');
  if (selectMilestone) {
    selectMilestone.addEventListener('change', (e) => {
      AppState.activeMilestoneId = e.target.value;
      saveAppState();
      UIRenderer.renderPaymentTab();
      UIRenderer.renderHeaderAndKPIs();
      UIRenderer.renderPrintCanvas(AppState.activePrintDoc);
    });
  }

  // 5. Add New Milestone Button
  const btnAddMilestone = document.getElementById('btn-add-milestone');
  if (btnAddMilestone) {
    btnAddMilestone.addEventListener('click', () => {
      const project = getActiveProject();
      if (!project) return;

      const count = (project.milestones || []).length + 1;
      const newId = `ms_${Date.now()}`;
      const newMs = {
        id: newId,
        code: `DOT-0${count}`,
        name: `Đợt ${count}: Nghiệm thu khối lượng giai đoạn mới`,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        submissionDate: '',
        status: 'draft',
        quantities: {},
        advanceDeductionRate: project.info.advancePct || 20,
        customAdvanceDeduction: null,
        retentionRate: project.info.retentionPct || 5,
        otherDeductions: 0,
        paidAmount: 0,
        notes: ''
      };

      project.milestones.push(newMs);
      AppState.activeMilestoneId = newId;
      saveAppState();
      UIRenderer.renderAll();
      showToast(`Đã tạo Đợt ${count} thành công!`, 'success');
    });
  }

  // 6. Delete Current Milestone Button
  const btnDeleteMilestone = document.getElementById('btn-delete-milestone');
  if (btnDeleteMilestone) {
    btnDeleteMilestone.addEventListener('click', () => {
      const project = getActiveProject();
      if (!project || project.milestones.length <= 1) {
        alert('Dự án phải có ít nhất một đợt thanh toán!');
        return;
      }

      const activeMs = getActiveMilestone();
      if (confirm(`Bạn có chắc muốn xóa đợt thanh toán: "${activeMs.name}"?`)) {
        project.milestones = project.milestones.filter(m => m.id !== activeMs.id);
        AppState.activeMilestoneId = project.milestones[0].id;
        saveAppState();
        UIRenderer.renderAll();
        showToast('Đã xóa đợt thanh toán.', 'info');
      }
    });
  }

  // 7. Auto Fill 100% Remaining Quantities for this Milestone
  const btnFillRemaining = document.getElementById('btn-auto-fill-remaining');
  if (btnFillRemaining) {
    btnFillRemaining.addEventListener('click', () => {
      const project = getActiveProject();
      const activeMs = getActiveMilestone();
      if (!project || !activeMs) return;

      if (!confirm('Bạn có muốn tự động điền toàn bộ khối lượng còn lại vào đợt này? (Áp dụng để nghiệm thu dứt điểm)')) {
        return;
      }

      let filledCount = 0;
      (project.boqItems || []).forEach(item => {
        const approvedQty = (parseFloat(item.contractQty) || 0) + (parseFloat(item.variationQty) || 0);
        const prevQty = Calculator.getCumulativeQtyBefore(project, activeMs.id, item.id);
        const rem = approvedQty - prevQty;
        if (rem > 0) {
          activeMs.quantities[item.id] = Number(rem.toFixed(3));
          filledCount++;
        }
      });

      saveAppState();
      UIRenderer.renderPaymentTab();
      UIRenderer.renderHeaderAndKPIs();
      showToast(`Đã áp đầy đủ khối lượng còn lại cho ${filledCount} đầu việc!`, 'success');
    });
  }

  // 8. Clear all quantities for this milestone
  const btnClearPeriod = document.getElementById('btn-clear-period-quantities');
  if (btnClearPeriod) {
    btnClearPeriod.addEventListener('click', () => {
      const activeMs = getActiveMilestone();
      if (!activeMs) return;
      if (confirm('Bạn có chắc muốn xóa trắng toàn bộ số liệu khối lượng kỳ này (đặt về 0)?')) {
        activeMs.quantities = {};
        saveAppState();
        UIRenderer.renderPaymentTab();
        UIRenderer.renderHeaderAndKPIs();
        showToast('Đã xóa trắng khối lượng kỳ này.', 'info');
      }
    });
  }
  // 9. Add New BOQ Item
  const btnAddBOQ = document.getElementById('btn-add-boq-item');
  if (btnAddBOQ) {
    btnAddBOQ.addEventListener('click', () => {
      const project = getActiveProject();
      if (!project) return;

      const count = (project.boqItems || []).length + 1;
      const newItem = {
        id: `boq_${Date.now()}`,
        code: `CV.${count < 10 ? '0' + count : count}`,
        name: 'Công tác xây dựng mới (Nhấp vào để sửa tên)',
        unit: 'm3',
        contractQty: 10,
        variationQty: 0,
        unitPrice: 1000000
      };

      project.boqItems.push(newItem);
      saveAppState();
      UIRenderer.renderBOQTab();
      UIRenderer.renderHeaderAndKPIs();
      showToast('Đã thêm đầu việc mới vào BOQ. Vui lòng nhập thông tin chi tiết!', 'success');
    });
  }

  // 10. Project Info Inputs Change Handlers
  const updateProjectField = (field, value) => {
    const project = getActiveProject();
    if (!project) return;
    project.info[field] = value;
    saveAppState();
    UIRenderer.renderHeaderAndKPIs();
  };

  ['proj-name', 'proj-code', 'proj-package', 'proj-investor', 'proj-contractor', 'proj-supervision', 'proj-contract-no'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const fieldMap = {
        'proj-name': 'name', 'proj-code': 'code', 'proj-package': 'package',
        'proj-investor': 'investor', 'proj-contractor': 'contractor',
        'proj-supervision': 'supervision', 'proj-contract-no': 'contractNo'
      };
      el.addEventListener('change', e => updateProjectField(fieldMap[id], e.target.value));
    }
  });

  ['proj-advance-pct', 'proj-retention-pct', 'proj-advance-amount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const fieldMap = {
        'proj-advance-pct': 'advancePct',
        'proj-retention-pct': 'retentionPct',
        'proj-advance-amount': 'advanceAmount'
      };
      el.addEventListener('change', e => {
        updateProjectField(fieldMap[id], parseFloat(e.target.value) || 0);
        UIRenderer.renderPaymentTab();
      });
    }
  });

  // 11. Active Milestone Inputs Change Handlers
  const updateMilestoneField = (field, value) => {
    const activeMs = getActiveMilestone();
    if (!activeMs) return;
    activeMs[field] = value;
    saveAppState();
    UIRenderer.renderHeaderAndKPIs();
  };

  ['ms-name', 'ms-code', 'ms-start-date', 'ms-end-date', 'ms-submission-date', 'ms-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const fieldMap = {
        'ms-name': 'name', 'ms-code': 'code', 'ms-start-date': 'startDate',
        'ms-end-date': 'endDate', 'ms-submission-date': 'submissionDate',
        'ms-status': 'status'
      };
      el.addEventListener('change', e => {
        updateMilestoneField(fieldMap[id], e.target.value);
        if (id === 'ms-name' || id === 'ms-code') {
          // Re-render select option
          const sel = document.getElementById('select-active-milestone');
          if (sel) {
            const opt = sel.querySelector(`option[value="${activeMs.id}"]`);
            if (opt) opt.textContent = `${activeMs.code || 'Đợt'} - ${activeMs.name}`;
          }
        }
      });
    }
  });

  ['ms-adv-rate', 'ms-ret-rate', 'ms-other-deductions', 'ms-paid-amount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const fieldMap = {
        'ms-adv-rate': 'advanceDeductionRate',
        'ms-ret-rate': 'retentionRate',
        'ms-other-deductions': 'otherDeductions',
        'ms-paid-amount': 'paidAmount'
      };
      el.addEventListener('change', e => {
        updateMilestoneField(fieldMap[id], parseFloat(e.target.value) || 0);
        UIRenderer.renderPaymentTab();
      });
    }
  });

  // 12. Export Full Project Excel
  const btnExportExcel = document.getElementById('btn-export-full-excel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      const project = getActiveProject();
      if (!project) return;
      ExcelService.exportFullProjectExcel(project, AppState.activeMilestoneId);
      showToast('Đang tải xuống bộ báo cáo Excel đa Sheet...', 'success');
    });
  }

  // 13. Print Active Document
  const btnPrintDoc = document.getElementById('btn-print-doc');
  if (btnPrintDoc) {
    btnPrintDoc.addEventListener('click', () => {
      window.print();
    });
  }

  // Switch print document type (PL 03a vs Giấy đề nghị)
  const btnDocPL03a = document.getElementById('btn-doc-pl03a');
  const btnDocStatement = document.getElementById('btn-doc-statement');
  if (btnDocPL03a && btnDocStatement) {
    btnDocPL03a.addEventListener('click', () => {
      btnDocPL03a.className = 'px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow';
      btnDocStatement.className = 'px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700';
      UIRenderer.renderPrintCanvas('pl03a');
    });
    btnDocStatement.addEventListener('click', () => {
      btnDocStatement.className = 'px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow';
      btnDocPL03a.className = 'px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700';
      UIRenderer.renderPrintCanvas('statement');
    });
  }

  // 14. JSON Backup and Restore
  const btnBackup = document.getElementById('btn-backup-json');
  if (btnBackup) {
    btnBackup.addEventListener('click', () => {
      exportJSONBackup();
      showToast('Đã xuất file sao lưu JSON thành công!', 'success');
    });
  }

  const inputRestore = document.getElementById('input-restore-json');
  if (inputRestore) {
    inputRestore.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = importJSONBackup(event.target.result);
        if (result.success) {
          UIRenderer.renderAll();
          showToast(`Khôi phục dữ liệu thành công! Đã nạp ${result.count} công trình.`, 'success');
        } else {
          alert('Lỗi khôi phục: ' + result.error);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // 15. Reset to Demo Project
  const btnResetDemo = document.getElementById('btn-reset-demo');
  if (btnResetDemo) {
    btnResetDemo.addEventListener('click', () => {
      if (confirm('Bạn có muốn nạp lại dữ liệu dự án mẫu ban đầu (dự án Trụ sở 5 tầng với 3 đợt thanh toán)? Lưu ý dữ liệu hiện tại chưa sao lưu sẽ được làm mới.')) {
        resetToSampleDemo();
        UIRenderer.renderAll();
        showToast('Đã nạp thành công dự án mẫu chuẩn.', 'success');
      }
    });
  }

  // 16. Theme Switcher (Dark / Light)
  const btnTheme = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      if (themeIcon) {
        themeIcon.className = isDark ? 'fa-solid fa-moon text-emerald-400' : 'fa-solid fa-sun text-amber-500';
      }
    });
  }

  // 17. Smart Excel BOQ Import Handler
  initExcelImportModal();

  // 18. Matrix Tab & Chainage Editor Handler
  initMatrixAndChainageModal();

  // 19. Milestone Excel Import Handler
  initMilestoneExcelImportModal();
});

// Smart Excel BOQ Import
let importedWorkbook = null;
let importedSheetData = [];

function initExcelImportModal() {
  const fileInput = document.getElementById('input-boq-file');
  const dropzoneInput = document.getElementById('input-boq-dropzone');
  const modal = document.getElementById('modal-boq-mapper');
  const btnClose = document.getElementById('btn-close-boq-modal');
  const btnCancel = document.getElementById('btn-cancel-boq-modal');
  const btnConfirm = document.getElementById('btn-confirm-boq-modal');
  const selectSheet = document.getElementById('modal-select-sheet');

  const handleFile = (file) => {
    if (!file) return;
    ExcelService.parseUploadedBOQFile(file, (res) => {
      if (!res.success) {
        alert('Không thể đọc file Excel: ' + res.error);
        return;
      }

      importedWorkbook = res.workbook;
      document.getElementById('modal-filename-text').textContent = `File: ${file.name}`;

      // Populate sheet selector
      selectSheet.innerHTML = importedWorkbook.SheetNames.map((name, i) => {
        return `<option value="${name}" ${i === 0 ? 'selected' : ''}>${escapeHtml(name)}</option>`;
      }).join('');

      loadSheetData(importedWorkbook.SheetNames[0]);
      modal.classList.remove('hidden');
    });
  };

  if (fileInput) fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  if (dropzoneInput) dropzoneInput.addEventListener('change', e => handleFile(e.target.files[0]));

  const loadSheetData = (sheetName) => {
    const ws = importedWorkbook.Sheets[sheetName];
    importedSheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Auto-detect columns
    const detected = ExcelService.detectColumns(importedSheetData);
    populateMappingSelectors(detected);
    renderModalPreview(detected ? detected.dataStartRowIndex : 2);
  };

  if (selectSheet) {
    selectSheet.addEventListener('change', (e) => {
      loadSheetData(e.target.value);
    });
  }

  const populateMappingSelectors = (mapping) => {
    const firstRow = importedSheetData[mapping ? mapping.headerRowIndex : 0] || [];
    const makeOptions = (selectedIdx) => {
      let html = '<option value="-1">-- Không chọn --</option>';
      firstRow.forEach((col, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const text = String(col || '').trim();
        const sel = idx === selectedIdx ? 'selected' : '';
        html += `<option value="${idx}" ${sel}>Cột ${letter}: ${escapeHtml(text.slice(0, 30))}</option>`;
      });
      return html;
    };

    document.getElementById('map-col-code').innerHTML = makeOptions(mapping ? mapping.colCode : 1);
    document.getElementById('map-col-name').innerHTML = makeOptions(mapping ? mapping.colName : 2);
    document.getElementById('map-col-unit').innerHTML = makeOptions(mapping ? mapping.colUnit : 3);
    document.getElementById('map-col-qty').innerHTML = makeOptions(mapping ? mapping.colQty : 4);
    document.getElementById('map-col-price').innerHTML = makeOptions(mapping ? mapping.colPrice : 5);
  };

  const renderModalPreview = (startRow) => {
    const previewTable = document.getElementById('modal-preview-table');
    const rows = importedSheetData.slice(0, Math.min(importedSheetData.length, 12));
    previewTable.innerHTML = rows.map((r, i) => {
      const isHeader = i < startRow;
      return `
        <tr class="${isHeader ? 'bg-slate-800/80 font-bold text-slate-300' : 'text-slate-400'}">
          <td class="p-1.5 border border-slate-800 text-center">${i + 1}</td>
          ${(r || []).slice(0, 8).map(c => `<td class="p-1.5 border border-slate-800 truncate max-w-[140px]">${escapeHtml(String(c))}</td>`).join('')}
        </tr>
      `;
    }).join('');
  };

  if (btnClose) btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const startRow = parseInt(document.getElementById('modal-start-row').value) - 1 || 1;
      const colCode = parseInt(document.getElementById('map-col-code').value);
      const colName = parseInt(document.getElementById('map-col-name').value);
      const colUnit = parseInt(document.getElementById('map-col-unit').value);
      const colQty = parseInt(document.getElementById('map-col-qty').value);
      const colPrice = parseInt(document.getElementById('map-col-price').value);

      if (colName === -1 || colQty === -1) {
        alert('Bạn bắt buộc phải chọn Cột Tên Công Việc và Cột Khối Lượng!');
        return;
      }

      const project = getActiveProject();
      if (!project) return;

      const newBOQ = [];
      for (let r = startRow; r < importedSheetData.length; r++) {
        const row = importedSheetData[r];
        if (!row) continue;
        const name = String(row[colName] || '').trim();
        if (!name) continue;

        const rawQty = row[colQty];
        const qty = parseFloat(String(rawQty).replace(/,/g, '')) || 0;
        if (qty <= 0) continue;

        const code = colCode !== -1 ? String(row[colCode] || '').trim() : `CV.${r}`;
        const unit = colUnit !== -1 ? String(row[colUnit] || '').trim() : 'm3';
        const rawPrice = colPrice !== -1 ? row[colPrice] : 0;
        const price = parseFloat(String(rawPrice).replace(/,/g, '')) || 0;

        newBOQ.push({
          id: `boq_${Date.now()}_${r}`,
          code: code || `CV.${r}`,
          name,
          unit: unit || 'cái',
          contractQty: qty,
          variationQty: 0,
          unitPrice: price
        });
      }

      if (newBOQ.length === 0) {
        alert('Không tìm thấy dòng đầu việc hợp lệ nào theo cấu hình cột vừa chọn!');
        return;
      }

      if (confirm(`Tìm thấy ${newBOQ.length} đầu việc hợp lệ. Bạn có muốn ghi đè vào BOQ hợp đồng hiện tại không?`)) {
        project.boqItems = newBOQ;
        saveAppState();
        modal.classList.add('hidden');
        UIRenderer.renderAll();
        showToast(`Đã nạp thành công ${newBOQ.length} đầu việc từ file Excel!`, 'success');
      }
    });
  }
}

// ==================== TAB 4: MATRIX TỔNG HỢP & LÝ TRÌNH THI CÔNG ====================
let activeChainageTarget = null; // { itemId, milestoneId }

function updateChainageCalcLength() {
  const inputChainageFrom = document.getElementById('modal-chainage-from');
  const inputChainageTo = document.getElementById('modal-chainage-to');
  const fromVal = inputChainageFrom ? inputChainageFrom.value : '';
  const toVal = inputChainageTo ? inputChainageTo.value : '';
  const len = Calculator.calculateChainageDistance(fromVal, toVal);
  const lenEl = document.getElementById('modal-chainage-calc-len');
  if (lenEl) {
    if (len !== null) {
      lenEl.textContent = `${len.toLocaleString('vi-VN')} m (${(len / 1000).toFixed(3)} km)`;
      lenEl.className = 'bg-slate-800/80 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-cyan-300 font-mono font-bold';
    } else {
      lenEl.textContent = '-- m';
      lenEl.className = 'bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-400 font-mono';
    }
  }
}

function openChainageModal(itemId, milestoneId) {
  const project = getActiveProject();
  if (!project) return;
  const item = (project.boqItems || []).find(b => b.id === itemId);
  const ms = (project.milestones || []).find(m => m.id === milestoneId);
  if (!item || !ms) return;

  activeChainageTarget = { itemId, milestoneId };

  const contractQty = (item.contractQty || 0) + (item.variationQty || 0);
  const currentQty = (ms.quantities && ms.quantities[itemId] !== undefined) ? ms.quantities[itemId] : '';
  const detail = (ms.chainageDetails && ms.chainageDetails[itemId]) ? ms.chainageDetails[itemId] : {};

  // Populate Modal UI
  const subtitleEl = document.getElementById('modal-chainage-subtitle');
  if (subtitleEl) subtitleEl.textContent = `${ms.name} | ${item.code}: ${item.name}`;

  const itemNameEl = document.getElementById('modal-chainage-itemname');
  if (itemNameEl) itemNameEl.textContent = item.name;

  const itemCodeEl = document.getElementById('modal-chainage-itemcode');
  if (itemCodeEl) itemCodeEl.textContent = item.code;

  const itemUnitEl = document.getElementById('modal-chainage-unit');
  if (itemUnitEl) itemUnitEl.textContent = item.unit;

  const unitLabelEl = document.getElementById('modal-chainage-unit-label');
  if (unitLabelEl) unitLabelEl.textContent = item.unit;

  const unitBadgeEl = document.getElementById('modal-chainage-unit-badge');
  if (unitBadgeEl) unitBadgeEl.textContent = item.unit;

  const contractQtyEl = document.getElementById('modal-chainage-contract-qty');
  if (contractQtyEl) contractQtyEl.textContent = formatQty(contractQty);

  const qtyInput = document.getElementById('modal-chainage-qty');
  if (qtyInput) qtyInput.value = currentQty;

  const inputFrom = document.getElementById('modal-chainage-from');
  if (inputFrom) inputFrom.value = detail.fromKm || '';

  const inputTo = document.getElementById('modal-chainage-to');
  if (inputTo) inputTo.value = detail.toKm || '';

  const posSelect = document.getElementById('modal-chainage-pos');
  if (posSelect) posSelect.value = detail.position || 'Toàn tuyến';

  const noteInput = document.getElementById('modal-chainage-note');
  if (noteInput) noteInput.value = detail.note || '';

  updateChainageCalcLength();

  const modal = document.getElementById('modal-chainage-editor');
  if (modal) modal.classList.remove('hidden');
  if (qtyInput) qtyInput.focus();
}

window.openChainageModal = openChainageModal;

function closeChainageModal() {
  const modal = document.getElementById('modal-chainage-editor');
  if (modal) modal.classList.add('hidden');
  activeChainageTarget = null;
}

function initMatrixAndChainageModal() {
  // Search Filter
  const filterInput = document.getElementById('filter-matrix-search');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      UIRenderer.renderMatrixTab();
    });
  }

  // Create Milestone Button inside Matrix Tab
  const btnMatrixAdd = document.getElementById('btn-matrix-add-ms');
  if (btnMatrixAdd) {
    btnMatrixAdd.addEventListener('click', () => {
      const btnAdd = document.getElementById('btn-add-milestone');
      if (btnAdd) btnAdd.click();
      switchTab('tab-matrix');
    });
  }

  // Live chainage distance calculation
  const inputFrom = document.getElementById('modal-chainage-from');
  const inputTo = document.getElementById('modal-chainage-to');
  if (inputFrom) inputFrom.addEventListener('input', updateChainageCalcLength);
  if (inputTo) inputTo.addEventListener('input', updateChainageCalcLength);

  // Modal Close buttons
  const btnClose = document.getElementById('btn-close-chainage');
  const btnCancel = document.getElementById('btn-cancel-chainage');
  if (btnClose) btnClose.addEventListener('click', closeChainageModal);
  if (btnCancel) btnCancel.addEventListener('click', closeChainageModal);

  // Delegate click on matrix table cells
  const matrixTableBody = document.getElementById('matrix-table-body');
  if (matrixTableBody) {
    matrixTableBody.addEventListener('click', (e) => {
      const cell = e.target.closest('.matrix-cell');
      if (!cell) return;
      const itemId = cell.dataset.itemId;
      const msId = cell.dataset.msId;
      if (itemId && msId) {
        openChainageModal(itemId, msId);
      }
    });
  }

  // Save chainage & quantity button
  const btnSave = document.getElementById('btn-save-chainage');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!activeChainageTarget) return;
      const project = getActiveProject();
      if (!project) return;
      const ms = (project.milestones || []).find(m => m.id === activeChainageTarget.milestoneId);
      if (!ms) return;

      const qtyVal = parseFloat(document.getElementById('modal-chainage-qty')?.value);
      const qty = isNaN(qtyVal) ? 0 : qtyVal;
      const fromKm = document.getElementById('modal-chainage-from')?.value.trim() || '';
      const toKm = document.getElementById('modal-chainage-to')?.value.trim() || '';
      const pos = document.getElementById('modal-chainage-pos')?.value || 'Toàn tuyến';
      const note = document.getElementById('modal-chainage-note')?.value.trim() || '';

      if (!ms.quantities) ms.quantities = {};
      ms.quantities[activeChainageTarget.itemId] = qty;

      if (!ms.chainageDetails) ms.chainageDetails = {};
      if (fromKm || toKm || note || (pos && pos !== 'Toàn tuyến')) {
        ms.chainageDetails[activeChainageTarget.itemId] = {
          fromKm,
          toKm,
          position: pos,
          note
        };
      } else {
        delete ms.chainageDetails[activeChainageTarget.itemId];
      }

      saveAppState();
      closeChainageModal();
      UIRenderer.renderAll();
      showToast('Đã lưu khối lượng & lý trình thành công!', 'success');
    });
  }

  // Delete / Clear Cell button
  const btnDelete = document.getElementById('btn-delete-chainage-cell');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (!activeChainageTarget) return;
      const project = getActiveProject();
      if (!project) return;
      const ms = (project.milestones || []).find(m => m.id === activeChainageTarget.milestoneId);
      if (!ms) return;

      if (confirm('Bạn có chắc chắn muốn xóa khối lượng và lý trình của ô này không?')) {
        if (ms.quantities) delete ms.quantities[activeChainageTarget.itemId];
        if (ms.chainageDetails) delete ms.chainageDetails[activeChainageTarget.itemId];

        saveAppState();
        closeChainageModal();
        UIRenderer.renderAll();
        showToast('Đã xóa dữ liệu ô thành công!', 'info');
      }
    });
  }
}

// ==================== MILESTONE EXCEL IMPORT MODAL ====================
let importedMsWorkbook = null;
let importedMsSheetData = [];

function initMilestoneExcelImportModal() {
  const btnOpen = document.getElementById('btn-import-milestone-excel');
  const modal = document.getElementById('modal-milestone-excel-import');
  const btnClose = document.getElementById('btn-close-ms-import-modal');
  const btnCancel = document.getElementById('btn-cancel-ms-import-modal');
  const btnConfirm = document.getElementById('btn-confirm-ms-import-modal');
  const fileInput = document.getElementById('input-ms-excel-file');
  const selectSheet = document.getElementById('modal-ms-select-sheet');
  const fileNameEl = document.getElementById('modal-ms-file-name');
  const mappingSection = document.getElementById('ms-import-mapping-section');
  const subtitleEl = document.getElementById('modal-ms-import-subtitle');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const activeMs = getActiveMilestone();
      if (subtitleEl && activeMs) {
        subtitleEl.textContent = `Đợt đang chọn: ${activeMs.code || 'Đợt'} - ${activeMs.name}`;
      }
      if (modal) modal.classList.remove('hidden');
    });
  }

  if (btnClose) btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

  const handleMsFile = (file) => {
    if (!file) return;
    ExcelService.parseUploadedBOQFile(file, (res) => {
      if (!res.success) {
        alert('Không thể đọc file Excel: ' + res.error);
        return;
      }

      importedMsWorkbook = res.workbook;
      if (fileNameEl) {
        fileNameEl.textContent = `✓ Đã chọn: ${file.name}`;
        fileNameEl.classList.remove('hidden');
      }

      if (selectSheet) {
        selectSheet.innerHTML = importedMsWorkbook.SheetNames.map((name, i) => {
          return `<option value="${escapeHtml(name)}" ${i === 0 ? 'selected' : ''}>${escapeHtml(name)}</option>`;
        }).join('');
      }

      loadMsSheetData(importedMsWorkbook.SheetNames[0]);
      if (mappingSection) mappingSection.classList.remove('hidden');
    });
  };

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleMsFile(e.target.files[0]);
    });
  }

  const loadMsSheetData = (sheetName) => {
    if (!importedMsWorkbook) return;
    const ws = importedMsWorkbook.Sheets[sheetName];
    importedMsSheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const detected = ExcelService.detectMilestoneColumns(importedMsSheetData);
    populateMsMappingSelectors(detected);
    renderMsModalPreview(detected ? detected.dataStartRowIndex : 2);
  };

  if (selectSheet) {
    selectSheet.addEventListener('change', (e) => {
      loadMsSheetData(e.target.value);
    });
  }

  const populateMsMappingSelectors = (mapping) => {
    const firstRow = importedMsSheetData[mapping ? mapping.headerRowIndex : 0] || [];
    const makeOptions = (selectedIdx, allowNone = true) => {
      let html = allowNone ? '<option value="-1">-- Không dùng cột này --</option>' : '';
      firstRow.forEach((col, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const text = String(col || '').trim();
        const sel = idx === selectedIdx ? 'selected' : '';
        html += `<option value="${idx}" ${sel}>Cột ${letter}: ${escapeHtml(text.slice(0, 30))}</option>`;
      });
      return html;
    };

    const selCode = document.getElementById('map-ms-col-code');
    const selName = document.getElementById('map-ms-col-name');
    const selQty = document.getElementById('map-ms-col-qty');
    const selChainage = document.getElementById('map-ms-col-chainage');

    if (selCode) selCode.innerHTML = makeOptions(mapping ? mapping.colCode : 0);
    if (selName) selName.innerHTML = makeOptions(mapping ? mapping.colName : 1);
    if (selQty) selQty.innerHTML = makeOptions(mapping ? mapping.colQty : 2, false);
    if (selChainage) selChainage.innerHTML = makeOptions(mapping ? mapping.colChainage : -1);
  };

  const renderMsModalPreview = (startRow) => {
    const previewTable = document.getElementById('modal-ms-preview-table');
    if (!previewTable) return;
    const rows = importedMsSheetData.slice(0, Math.min(importedMsSheetData.length, 10));
    previewTable.innerHTML = rows.map((r, i) => {
      const isHeader = i < startRow;
      return `
        <tr class="${isHeader ? 'bg-slate-800/80 font-bold text-slate-300' : 'text-slate-400'}">
          <td class="p-1.5 border border-slate-800 text-center">${i + 1}</td>
          ${(r || []).slice(0, 8).map(c => `<td class="p-1.5 border border-slate-800 truncate max-w-[130px]">${escapeHtml(String(c))}</td>`).join('')}
        </tr>
      `;
    }).join('');
  };

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const startRow = parseInt(document.getElementById('modal-ms-start-row')?.value) - 1 || 1;
      const colCode = parseInt(document.getElementById('map-ms-col-code')?.value ?? -1);
      const colName = parseInt(document.getElementById('map-ms-col-name')?.value ?? -1);
      const colQty = parseInt(document.getElementById('map-ms-col-qty')?.value ?? -1);
      const colChainage = parseInt(document.getElementById('map-ms-col-chainage')?.value ?? -1);

      if (colQty === -1) {
        alert('Vui lòng chọn Cột Khối Lượng Kỳ Này!');
        return;
      }
      if (colCode === -1 && colName === -1) {
        alert('Bạn phải chọn ít nhất Cột Mã Hiệu hoặc Cột Tên Công Việc để hệ thống nhận diện đầu việc!');
        return;
      }

      const project = getActiveProject();
      const activeMs = getActiveMilestone();
      if (!project || !activeMs) return;

      const mappingConfig = { startRow, colCode, colName, colQty, colChainage };
      const res = ExcelService.matchMilestoneExcelData(importedMsSheetData, mappingConfig, project, activeMs.id);

      if (!res.success) {
        alert('Lỗi: ' + res.error);
        return;
      }

      if (res.matchedCount === 0) {
        alert('Không tìm thấy đầu việc nào trong bảng Excel khớp với BOQ Hợp đồng hiện tại! Vui lòng kiểm tra lại cột Mã hiệu hoặc Tên công việc.');
        return;
      }

      saveAppState();
      if (modal) modal.classList.add('hidden');
      UIRenderer.renderAll();
      showToast(`Đã tự động nhận diện và nạp thành công ${res.matchedCount} đầu việc vào đợt!`, 'success');

      // Tự động chuyển qua tab Xác nhận khối lượng!
      switchTab('tab-confirm-qty');
    });
  }
}

// Global helper to remove an item from current milestone
window.clearItemFromMilestone = function(itemId) {
  const activeMs = getActiveMilestone();
  if (!activeMs) return;
  const project = getActiveProject();
  const item = (project.boqItems || []).find(b => b.id === itemId);
  const itemName = item ? item.name : 'công tác này';

  if (confirm(`Bạn có muốn xóa khối lượng của "${itemName}" trong đợt này không?`)) {
    if (activeMs.quantities) delete activeMs.quantities[itemId];
    if (activeMs.chainageDetails) delete activeMs.chainageDetails[itemId];
    saveAppState();
    UIRenderer.renderAll();
    showToast(`Đã xóa công tác khỏi đợt!`, 'info');
  }
};
