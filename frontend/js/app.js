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
  if (targetTabId === 'tab-dashboard') UIRenderer.renderDashboardTab();
  if (targetTabId === 'tab-contract') UIRenderer.renderBOQTab();
  if (targetTabId === 'tab-payment') UIRenderer.renderPaymentTab();
  if (targetTabId === 'tab-remaining') UIRenderer.renderRemainingTab();
  if (targetTabId === 'tab-export') UIRenderer.renderPrintCanvas(AppState.activePrintDoc || 'pl03a');
  
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
