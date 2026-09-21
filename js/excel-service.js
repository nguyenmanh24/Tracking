/**
 * CONSTRUCTION PAYMENT TRACKER PRO - EXCEL IMPORT / EXPORT SERVICE
 * Powered by SheetJS (XLSX). Exports multi-sheet reports and imports BOQ files with auto-detection.
 */

const ExcelService = {

  // 1. Export Multi-sheet Project Payment Report
  exportFullProjectExcel(project, activeMilestoneId) {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện Excel (SheetJS) chưa sẵn sàng!');
      return;
    }

    const wb = XLSX.utils.book_new();
    const metrics = Calculator.calculateGlobalProjectMetrics(project);
    const activeMs = project.milestones.find(m => m.id === activeMilestoneId) || project.milestones[0];
    const finActive = activeMs ? Calculator.calculateMilestoneFinancials(project, activeMs) : null;

    // --- SHEET 1: TỔNG HỢP DÒNG TIỀN DỰ ÁN ---
    const summaryData = [
      ['BÁO CÁO TỔNG HỢP THANH TOÁN & DÒNG TIỀN CÔNG TRÌNH'],
      ['Dự án:', project.info.name],
      ['Gói thầu:', project.info.package],
      ['Chủ đầu tư:', project.info.investor],
      ['Nhà thầu:', project.info.contractor],
      ['Hợp đồng số:', project.info.contractNo],
      ['Ngày xuất báo cáo:', new Date().toLocaleDateString('vi-VN')],
      [],
      ['1. CHỈ SỐ TỔNG QUAN HỢP ĐỒNG & THANH TOÁN'],
      ['Chỉ số', 'Giá trị (VNĐ)', 'Tỷ lệ %', 'Ghi chú'],
      ['Giá trị hợp đồng gốc', metrics.boqSummary.originalAmount, '', 'Theo hợp đồng đã ký'],
      ['Giá trị phát sinh điều chỉnh', metrics.boqSummary.variationAmount, '', 'Theo phụ lục hợp đồng'],
      ['Tổng giá trị hợp đồng được duyệt', metrics.boqSummary.totalApprovedAmount, '100%', 'Căn cứ thanh quyết toán'],
      ['Lũy kế giá trị đã nghiệm thu', metrics.totalCumulativeAcceptedValue, `${metrics.globalCompletionPct.toFixed(2)}%`, 'Tất cả các đợt đến nay'],
      ['Giá trị khối lượng dự kiến còn lại', metrics.remainingProjectValue, `${(100 - metrics.globalCompletionPct).toFixed(2)}%`, 'Chưa nghiệm thu'],
      ['Tổng tạm ứng đã cấp', metrics.initialAdvance, `${project.info.advancePct}%`, 'Vốn tạm ứng ban đầu'],
      ['Lũy kế tạm ứng đã thu hồi', metrics.totalAdvanceDeducted, '', 'Đã khấu trừ qua các kỳ'],
      ['Tạm ứng còn lại phải thu hồi', metrics.remainingAdvanceToRecover, '', 'Còn phải trừ tiếp'],
      ['Lũy kế bảo hành đang giữ lại', metrics.totalRetentionHeld, `${project.info.retentionPct}%`, 'Đang giữ chờ hết bảo hành'],
      ['Thực tế tiền đã về tài khoản', metrics.totalPaidToBank, '', 'Đã giải ngân thực nhận'],
      ['Công nợ Chủ đầu tư còn nợ', metrics.investorOutstandingDebt, '', 'Đã nghiệm thu nhưng chưa nhận đủ'],
      [],
      ['2. BẢNG THEO DÕI CÁC ĐỢT THANH TOÁN (LỊCH SỬ DÒNG TIỀN)'],
      ['STT', 'Mã Đợt', 'Tên Đợt Thanh Toán', 'Từ Ngày', 'Đến Ngày', 'Trạng Thái', 'Giá Trị Nghiệm Thu (đ)', 'Thu Hồi Tạm Ứng (đ)', 'Giữ Lại BH (đ)', 'Giảm Trừ Khác (đ)', 'Đề Nghị TT (đ)', 'Đã Giải Ngân (đ)', 'CĐT Còn Nợ (đ)']
    ];

    (project.milestones || []).forEach((ms, idx) => {
      const fin = Calculator.calculateMilestoneFinancials(project, ms);
      const statusVN = {
        draft: 'Dự thảo',
        inspected: 'Đã nghiệm thu',
        approved: 'Đã ký hồ sơ',
        paid: 'Đã thanh toán'
      }[ms.status] || ms.status;

      summaryData.push([
        idx + 1,
        ms.code || `DOT-0${idx + 1}`,
        ms.name,
        formatDateVN(ms.startDate),
        formatDateVN(ms.endDate),
        statusVN,
        fin.grossThisPeriod,
        fin.advanceDeduction,
        fin.retentionDeduction,
        fin.otherDeductions,
        fin.netPayment,
        fin.paidAmount,
        fin.balanceDue
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Hợp Dòng Tiền');


    // --- SHEET 2: PHỤ LỤC 03.A ĐỢT ĐANG CHỌN ---
    if (activeMs && finActive) {
      const pl03aData = [
        ['BẢNG XÁC ĐỊNH GIÁ TRỊ KHỐI LƯỢNG CÔNG VIỆC HOÀN THÀNH THEO HỢP ĐỒNG (PHỤ LỤC 03.A)'],
        [`Áp dụng cho: ${activeMs.name}`],
        [`Thời gian thực hiện: Từ ngày ${formatDateVN(activeMs.startDate)} đến ngày ${formatDateVN(activeMs.endDate)}`],
        ['Dự án:', project.info.name],
        ['Hợp đồng số:', project.info.contractNo],
        [],
        [
          'STT', 'Mã hiệu', 'Nội dung công việc', 'ĐVT', 
          'Khối lượng HĐ', 'KL Lũy kế trước', 'KL Kỳ này (NT)', 'KL Lũy kế hết kỳ', 'KL Còn lại', 
          'Đơn giá HĐ (đ)', 'Thành tiền kỳ này (đ)', 'Thành tiền lũy kế (đ)', 'Tỷ lệ HT (%)'
        ]
      ];

      finActive.itemRows.forEach((row, idx) => {
        pl03aData.push([
          idx + 1,
          row.code,
          row.name,
          row.unit,
          row.totalApprovedQty,
          row.prevQty,
          row.thisPeriodQty,
          row.totalCumulativeQty,
          row.remainingQty,
          row.unitPrice,
          row.thisPeriodAmount,
          row.totalCumulativeAmount,
          row.completionPct.toFixed(1) + '%'
        ]);
      });

      pl03aData.push([]);
      pl03aData.push(['', '', 'TỔNG GIÁ TRỊ HOÀN THÀNH KỲ NÀY', '', '', '', '', '', '', '', finActive.grossThisPeriod, '', '']);
      pl03aData.push(['', '', 'Giảm trừ thu hồi tạm ứng', '', '', '', '', '', '', '', -finActive.advanceDeduction, '', '']);
      pl03aData.push(['', '', 'Giảm trừ giữ lại bảo hành', '', '', '', '', '', '', '', -finActive.retentionDeduction, '', '']);
      pl03aData.push(['', '', 'Các khoản khấu trừ khác', '', '', '', '', '', '', '', -finActive.otherDeductions, '', '']);
      pl03aData.push(['', '', 'SỐ TIỀN ĐỀ NGHỊ THANH TOÁN KỲ NÀY', '', '', '', '', '', '', '', finActive.netPayment, '', '']);

      const ws03a = XLSX.utils.aoa_to_sheet(pl03aData);
      ws03a['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 45 }, { wch: 8 },
        { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
        { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, ws03a, 'Phụ Lục 03.a');
    }


    // --- SHEET 3: KHỐI LƯỢNG CÒN LẠI & DỰ BÁO ---
    const remainingData = [
      ['BẢNG CHI TIẾT KHỐI LƯỢNG & GIÁ TRỊ DỰ KIẾN CÒN LẠI TOÀN CÔNG TRÌNH'],
      ['Dự án:', project.info.name],
      ['Tổng giá trị HĐ:', metrics.boqSummary.totalApprovedAmount],
      ['Lũy kế đã nghiệm thu:', metrics.totalCumulativeAcceptedValue],
      ['TỔNG GIÁ TRỊ DỰ KIẾN CÒN LẠI:', metrics.remainingProjectValue],
      [],
      [
        'STT', 'Mã hiệu', 'Tên công tác xây dựng', 'ĐVT', 
        'KL HĐ duyệt', 'Lũy kế đã NT', 'Khối lượng còn lại', 'Đơn giá HĐ (đ)', 
        'Giá trị dự kiến còn lại (đ)', '% Còn lại so HĐ', 'Đánh giá / Cảnh báo'
      ]
    ];

    metrics.remainingItems.forEach((item, idx) => {
      remainingData.push([
        idx + 1,
        item.code,
        item.name,
        item.unit,
        item.approvedQty,
        item.cumQty,
        item.remQty,
        item.unitPrice,
        item.remValue,
        item.pctRemaining.toFixed(1) + '%',
        'Còn khối lượng cần thi công'
      ]);
    });

    if (metrics.overrunItems.length > 0) {
      remainingData.push([]);
      remainingData.push(['--- CÁC CÔNG TÁC CẢNH BÁO VƯỢT KHỐI LƯỢNG HỢP ĐỒNG ---']);
      metrics.overrunItems.forEach((ov, idx) => {
        remainingData.push([
          `CB-${idx + 1}`,
          ov.code,
          ov.name,
          ov.unit,
          ov.approvedQty,
          ov.cumQty,
          `VƯỢT: +${ov.overrunQty}`,
          ov.unitPrice,
          `+${ov.overrunValue}`,
          'VƯỢT HĐ!',
          'Cần lập Phụ lục HĐ bổ sung'
        ]);
      });
    }

    const wsRemaining = XLSX.utils.aoa_to_sheet(remainingData);
    wsRemaining['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 45 }, { wch: 8 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 24 }, { wch: 14 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRemaining, 'Dự Kiến Còn Lại');

    // Save file
    const safeProjectName = (project.info.name || 'Cong_Trinh').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    const filename = `HoSoThanhToan_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  // 2. Parse Uploaded Excel BOQ File
  parseUploadedBOQFile(file, callback) {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện Excel (SheetJS) chưa được nạp!');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        callback({ success: true, workbook });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    };
    reader.onerror = function(err) {
      callback({ success: false, error: err });
    };
    reader.readAsArrayBuffer(file);
  },

  // 3. Auto-detect Column Headers in Sheet
  detectColumns(sheetData) {
    // sheetData is array of arrays
    if (!sheetData || sheetData.length === 0) return null;

    let bestHeaderRowIndex = 0;
    let maxMatches = 0;

    const keywords = {
      code: ['mã', 'code', 'ma hieu', 'định mức', 'mã số'],
      name: ['tên', 'nội dung', 'công việc', 'hạng mục', 'diễn giải', 'mô tả', 'description'],
      unit: ['đvt', 'đơn vị', 'unit', 'đơn vị tính'],
      qty: ['khối lượng', 'kl', 'số lượng', 'quantity', 'qty', 'hợp đồng', 'trúng thầu'],
      price: ['đơn giá', 'giá', 'đơn giá hđ', 'price', 'unit price', 'dự thầu']
    };

    // Scan first 15 rows to find the best header row
    for (let r = 0; r < Math.min(15, sheetData.length); r++) {
      const row = sheetData[r] || [];
      let matches = 0;
      row.forEach(cell => {
        const text = String(cell || '').toLowerCase().trim();
        for (const key in keywords) {
          if (keywords[key].some(kw => text.includes(kw))) {
            matches++;
            break;
          }
        }
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        bestHeaderRowIndex = r;
      }
    }

    // Now map columns from header row
    const headerRow = sheetData[bestHeaderRowIndex] || [];
    const mapping = {
      headerRowIndex: bestHeaderRowIndex,
      dataStartRowIndex: bestHeaderRowIndex + 1,
      colCode: -1,
      colName: -1,
      colUnit: -1,
      colQty: -1,
      colPrice: -1
    };

    headerRow.forEach((cell, colIdx) => {
      const text = String(cell || '').toLowerCase().trim();
      if (mapping.colCode === -1 && keywords.code.some(kw => text.includes(kw))) {
        mapping.colCode = colIdx;
      } else if (mapping.colName === -1 && keywords.name.some(kw => text.includes(kw))) {
        mapping.colName = colIdx;
      } else if (mapping.colUnit === -1 && keywords.unit.some(kw => text.includes(kw))) {
        mapping.colUnit = colIdx;
      } else if (mapping.colQty === -1 && keywords.qty.some(kw => text.includes(kw))) {
        mapping.colQty = colIdx;
      } else if (mapping.colPrice === -1 && keywords.price.some(kw => text.includes(kw))) {
        mapping.colPrice = colIdx;
      }
    });

    return mapping;
  },

  // 4. Auto-detect Columns for Milestone Payment Sheets
  detectMilestoneColumns(sheetData) {
    if (!sheetData || sheetData.length === 0) return null;

    let bestHeaderRowIndex = 0;
    let maxMatches = 0;

    const keywords = {
      code: ['mã', 'code', 'ma hieu', 'mã số', 'định mức'],
      name: ['tên', 'nội dung', 'công việc', 'hạng mục', 'diễn giải', 'mô tả'],
      qty: ['kỳ này', 'khối lượng', 'kl', 'nghiệm thu', 'thực hiện', 'số lượng', 'qty'],
      chainage: ['lý trình', 'ly trinh', 'phân đoạn', 'vị trí', 'km', 'tuyến', 'đoạn']
    };

    for (let r = 0; r < Math.min(15, sheetData.length); r++) {
      const row = sheetData[r] || [];
      let matches = 0;
      row.forEach(cell => {
        const text = String(cell || '').toLowerCase().trim();
        for (const key in keywords) {
          if (keywords[key].some(kw => text.includes(kw))) {
            matches++;
            break;
          }
        }
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        bestHeaderRowIndex = r;
      }
    }

    const headerRow = sheetData[bestHeaderRowIndex] || [];
    const mapping = {
      headerRowIndex: bestHeaderRowIndex,
      dataStartRowIndex: bestHeaderRowIndex + 1,
      colCode: -1,
      colName: -1,
      colQty: -1,
      colChainage: -1
    };

    headerRow.forEach((cell, colIdx) => {
      const text = String(cell || '').toLowerCase().trim();
      if (mapping.colCode === -1 && keywords.code.some(kw => text.includes(kw))) {
        mapping.colCode = colIdx;
      } else if (mapping.colName === -1 && keywords.name.some(kw => text.includes(kw))) {
        mapping.colName = colIdx;
      } else if (mapping.colQty === -1 && keywords.qty.some(kw => text.includes(kw))) {
        mapping.colQty = colIdx;
      } else if (mapping.colChainage === -1 && keywords.chainage.some(kw => text.includes(kw))) {
        mapping.colChainage = colIdx;
      }
    });

    return mapping;
  },

  // 5. Match and Apply Milestone Quantities from Excel Sheet
  matchMilestoneExcelData(sheetData, mappingConfig, project, milestoneId) {
    if (!sheetData || !project || !project.boqItems) {
      return { success: false, error: 'Thiếu dữ liệu công trình hoặc bảng tính!' };
    }

    const ms = (project.milestones || []).find(m => m.id === milestoneId);
    if (!ms) {
      return { success: false, error: 'Không tìm thấy đợt thanh toán mục tiêu!' };
    }

    const { startRow, colCode, colName, colQty, colChainage } = mappingConfig;
    if (colQty === -1) {
      return { success: false, error: 'Bạn phải chỉ định Cột Khối Lượng!' };
    }

    if (!ms.quantities) ms.quantities = {};
    if (!ms.chainageDetails) ms.chainageDetails = {};

    const cleanStr = (s) => String(s || '').toLowerCase().replace(/[\s\-_.,/()]/g, '').trim();

    let matchedCount = 0;
    const totalRows = Math.max(0, sheetData.length - startRow);

    for (let r = startRow; r < sheetData.length; r++) {
      const row = sheetData[r];
      if (!row) continue;

      const rawCode = colCode !== -1 ? String(row[colCode] || '').trim() : '';
      const rawName = colName !== -1 ? String(row[colName] || '').trim() : '';
      const rawQty = row[colQty];
      if (rawQty === undefined || rawQty === null || rawQty === '') continue;

      const qty = parseFloat(String(rawQty).replace(/,/g, '').trim());
      if (isNaN(qty) || qty <= 0) continue;

      const rawChainage = colChainage !== -1 ? String(row[colChainage] || '').trim() : '';

      // Match against BOQ items
      let matchedItem = null;

      // Match 1: By Code (exact)
      if (rawCode) {
        matchedItem = project.boqItems.find(b => b.code && b.code.toLowerCase().trim() === rawCode.toLowerCase());
      }

      // Match 2: By Name (exact or normalized)
      if (!matchedItem && rawName) {
        matchedItem = project.boqItems.find(b => b.name && b.name.toLowerCase().trim() === rawName.toLowerCase());
        if (!matchedItem) {
          const cleanRowName = cleanStr(rawName);
          if (cleanRowName.length >= 4) {
            matchedItem = project.boqItems.find(b => {
              const cleanBoqName = cleanStr(b.name);
              return cleanBoqName === cleanRowName || 
                     (cleanBoqName.length >= 6 && (cleanBoqName.includes(cleanRowName) || cleanRowName.includes(cleanBoqName)));
            });
          }
        }
      }

      if (matchedItem) {
        matchedCount++;
        ms.quantities[matchedItem.id] = qty;

        // Parse Chainage if present
        if (rawChainage) {
          let fromKm = '';
          let toKm = '';
          const kmMatch = rawChainage.match(/(?:km|k)?\s*(\d+(?:\+\d+)?)\s*(?:đến|->|➔|-|–|\/)\s*(?:km|k)?\s*(\d+(?:\+\d+)?)/i);
          if (kmMatch) {
            fromKm = `Km${kmMatch[1]}`;
            toKm = `Km${kmMatch[2]}`;
          }
          ms.chainageDetails[matchedItem.id] = {
            fromKm: fromKm || rawChainage,
            toKm: toKm || '',
            position: 'Toàn tuyến',
            note: rawChainage
          };
        }
      }
    }

    return { success: true, matchedCount, totalRows };
  }
};
