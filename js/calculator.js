/**
 * CONSTRUCTION PAYMENT TRACKER PRO - CALCULATION ENGINE
 * Pure mathematical and business logic for construction payments, acceptance quantities,
 * remaining balances, overrun alerts, and cashflow deductions.
 */

const Calculator = {

  // 1. Calculate BOQ Contract Totals
  calculateBOQSummary(project) {
    if (!project || !project.boqItems) {
      return { originalAmount: 0, variationAmount: 0, totalApprovedAmount: 0, totalItems: 0 };
    }

    let originalAmount = 0;
    let variationAmount = 0;
    let totalApprovedAmount = 0;

    project.boqItems.forEach(item => {
      const origQty = parseFloat(item.contractQty) || 0;
      const varQty = parseFloat(item.variationQty) || 0;
      const price = parseFloat(item.unitPrice) || 0;

      const origVal = origQty * price;
      const varVal = varQty * price;
      const totalVal = (origQty + varQty) * price;

      originalAmount += origVal;
      variationAmount += varVal;
      totalApprovedAmount += totalVal;
    });

    return {
      originalAmount,
      variationAmount,
      totalApprovedAmount,
      totalItems: project.boqItems.length
    };
  },

  // 2. Get Cumulative Accepted Quantity for an Item BEFORE a specific milestone
  getCumulativeQtyBefore(project, milestoneId, itemId) {
    if (!project || !project.milestones) return 0;
    const msIdx = project.milestones.findIndex(m => m.id === milestoneId);
    if (msIdx <= 0) return 0;

    let sum = 0;
    for (let i = 0; i < msIdx; i++) {
      const q = parseFloat(project.milestones[i].quantities[itemId]) || 0;
      sum += q;
    }
    return sum;
  },

  // 3. Calculate Item Detailed Metrics for a given Milestone
  calculateMilestoneItem(project, milestone, item) {
    const origQty = parseFlexibleNumber(item.contractQty);
    const varQty = parseFlexibleNumber(item.variationQty);
    const totalApprovedQty = origQty + varQty;
    const unitPrice = parseFlexibleNumber(item.unitPrice);

    const prevQty = this.getCumulativeQtyBefore(project, milestone.id, item.id);
    const thisPeriodQty = parseFlexibleNumber(milestone.quantities ? milestone.quantities[item.id] : 0);
    const totalCumulativeQty = prevQty + thisPeriodQty;
    
    // Remaining Quantity and Value
    const remainingQty = totalApprovedQty - totalCumulativeQty;
    const remainingValue = remainingQty > 0 ? Math.round(remainingQty * unitPrice) : 0;

    // Monetary Amounts (Làm tròn chuẩn số nguyên đồng VND cho từng công tác)
    const prevAmount = Math.round(prevQty * unitPrice);
    const thisPeriodAmount = Math.round(thisPeriodQty * unitPrice);
    const totalCumulativeAmount = Math.round(totalCumulativeQty * unitPrice);

    // Percentage of completion
    const completionPct = totalApprovedQty > 0 ? (totalCumulativeQty / totalApprovedQty) * 100 : 0;

    // Overrun detection (precision tolerance 0.00001)
    const isOverrun = totalCumulativeQty > (totalApprovedQty + 0.00001);
    const overrunQty = isOverrun ? (totalCumulativeQty - totalApprovedQty) : 0;
    const overrunAmount = Math.round(overrunQty * unitPrice);

    // Fully completed flag
    const isCompleted = Math.abs(remainingQty) < 0.00001;

    return {
      itemId: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      origQty,
      varQty,
      totalApprovedQty,
      unitPrice,
      prevQty,
      thisPeriodQty,
      totalCumulativeQty,
      remainingQty,
      remainingValue,
      prevAmount,
      thisPeriodAmount,
      totalCumulativeAmount,
      completionPct,
      isOverrun,
      overrunQty,
      overrunAmount,
      isCompleted
    };
  },

  // 4. Calculate Financial Deductions and Net Payment for a Milestone
  calculateMilestoneFinancials(project, milestone) {
    if (!project || !milestone) {
      return {
        grossThisPeriod: 0,
        advanceDeduction: 0,
        retentionDeduction: 0,
        otherDeductions: 0,
        netPayment: 0,
        itemRows: [],
        overrunCount: 0,
        totalOverrunAmount: 0
      };
    }

    let grossThisPeriod = 0;
    let overrunCount = 0;
    let totalOverrunAmount = 0;

    const itemRows = (project.boqItems || []).map(item => {
      const row = this.calculateMilestoneItem(project, milestone, item);
      grossThisPeriod += row.thisPeriodAmount;
      if (row.isOverrun) {
        overrunCount++;
        totalOverrunAmount += row.overrunAmount;
      }
      return row;
    });

    // Advance Deduction Calculation (Thu hồi tạm ứng: theo số tiền trực tiếp hoặc theo %)
    let advanceDeduction = 0;
    if (milestone.customAdvanceDeduction !== null && milestone.customAdvanceDeduction !== undefined && milestone.customAdvanceDeduction !== '' && parseFlexibleNumber(milestone.customAdvanceDeduction) > 0) {
      advanceDeduction = Math.round(parseFlexibleNumber(milestone.customAdvanceDeduction));
    } else {
      const advPct = milestone.advanceDeductionRate !== undefined ? parseFlexibleNumber(milestone.advanceDeductionRate) : (parseFlexibleNumber(project.info.advancePct) || 0);
      advanceDeduction = Math.round(grossThisPeriod * (advPct / 100));
    }

    // Retention Deduction (Bảo hành công trình: tự nhập % hoặc 0% nếu dùng bảo lãnh)
    let retentionDeduction = 0;
    const retPct = milestone.retentionRate !== undefined ? parseFlexibleNumber(milestone.retentionRate) : (parseFlexibleNumber(project.info.retentionPct) || 0);
    if (retPct > 0) {
      retentionDeduction = Math.round(grossThisPeriod * (retPct / 100));
    }

    // Other Deductions (Phạt vi phạm, điện nước, vật tư CĐT cấp...)
    const otherDeductions = Math.round(parseFlexibleNumber(milestone.otherDeductions));

    // Net Payment Requested This Period
    const netPayment = Math.max(0, grossThisPeriod - advanceDeduction - retentionDeduction - otherDeductions);

    // Paid amount & Remaining balance owed by investor for this milestone
    const paidAmount = Math.round(parseFlexibleNumber(milestone.paidAmount));
    const balanceDue = netPayment - paidAmount;

    return {
      grossThisPeriod,
      advanceDeduction,
      retentionDeduction,
      otherDeductions,
      netPayment,
      paidAmount,
      balanceDue,
      itemRows,
      overrunCount,
      totalOverrunAmount
    };
  },

  // 5. Calculate Comprehensive Project-wide Global Metrics
  calculateGlobalProjectMetrics(project) {
    if (!project) return null;

    const boqSummary = this.calculateBOQSummary(project);
    const totalApproved = boqSummary.totalApprovedAmount;

    // Calculate cumulative acceptance across ALL milestones
    let totalCumulativeAcceptedValue = 0;
    let totalPaidToBank = 0;
    let totalAdvanceDeducted = 0;
    let totalRetentionHeld = 0;
    let totalOtherDeductions = 0;
    let totalNetPaymentAllMilestones = 0;

    // Track latest cumulative qty per item across all milestones
    const latestItemCumulative = {};
    (project.boqItems || []).forEach(item => {
      latestItemCumulative[item.id] = 0;
    });

    (project.milestones || []).forEach(ms => {
      const fin = this.calculateMilestoneFinancials(project, ms);
      totalCumulativeAcceptedValue += fin.grossThisPeriod;
      totalPaidToBank += fin.paidAmount;
      totalAdvanceDeducted += fin.advanceDeduction;
      totalRetentionHeld += fin.retentionDeduction;
      totalOtherDeductions += fin.otherDeductions;
      totalNetPaymentAllMilestones += fin.netPayment;

      (project.boqItems || []).forEach(item => {
        const q = parseFloat(ms.quantities[item.id]) || 0;
        latestItemCumulative[item.id] += q;
      });
    });

    // Overall Completion Percentage
    const globalCompletionPct = totalApproved > 0 ? (totalCumulativeAcceptedValue / totalApproved) * 100 : 0;

    // Overall Remaining Project Value
    const remainingProjectValue = Math.max(0, totalApproved - totalCumulativeAcceptedValue);

    // Remaining items ranking (sorted by remaining value descending)
    const remainingItems = [];
    const overrunItems = [];

    (project.boqItems || []).forEach(item => {
      const approvedQty = (parseFloat(item.contractQty) || 0) + (parseFloat(item.variationQty) || 0);
      const cumQty = latestItemCumulative[item.id] || 0;
      const remQty = approvedQty - cumQty;
      const unitPrice = parseFloat(item.unitPrice) || 0;

      if (remQty > 0.0001) {
        remainingItems.push({
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          approvedQty,
          cumQty,
          remQty,
          unitPrice,
          remValue: remQty * unitPrice,
          pctRemaining: approvedQty > 0 ? (remQty / approvedQty) * 100 : 0
        });
      } else if (remQty < -0.0001) {
        overrunItems.push({
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          approvedQty,
          cumQty,
          overrunQty: cumQty - approvedQty,
          unitPrice,
          overrunValue: (cumQty - approvedQty) * unitPrice
        });
      }
    });

    // Sort remaining items by monetary value descending
    remainingItems.sort((a, b) => b.remValue - a.remValue);

    // Advance payment tracking
    const initialAdvance = parseFloat(project.info.advanceAmount) || (totalApproved * (project.info.advancePct || 20) / 100);
    const remainingAdvanceToRecover = Math.max(0, initialAdvance - totalAdvanceDeducted);

    // Outstanding debt owed by investor (Net payment approved - Paid to bank)
    const investorOutstandingDebt = totalNetPaymentAllMilestones - totalPaidToBank;

    return {
      boqSummary,
      totalCumulativeAcceptedValue,
      globalCompletionPct,
      remainingProjectValue,
      remainingItems,
      overrunItems,
      initialAdvance,
      totalAdvanceDeducted,
      remainingAdvanceToRecover,
      totalRetentionHeld,
      totalOtherDeductions,
      totalNetPaymentAllMilestones,
      totalPaidToBank,
      investorOutstandingDebt
    };
  },

  // 6. Chainage Parsing & Distance Helper (Km3+100 -> 3100m)
  parseChainageToMeters(str) {
    if (!str || typeof str !== 'string') return null;
    const clean = str.trim().toLowerCase().replace(/\s+/g, '');
    const match = clean.match(/^(?:km|k)?(\d+)(?:\+(\d+))?$/);
    if (match) {
      const km = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2] || '0', 10) || 0;
      return km * 1000 + m;
    }
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  },

  calculateChainageDistance(fromStr, toStr) {
    const fromM = this.parseChainageToMeters(fromStr);
    const toM = this.parseChainageToMeters(toStr);
    if (fromM === null || toM === null) return null;
    return Math.abs(toM - fromM);
  }
};
