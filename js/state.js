/**
 * CONSTRUCTION PAYMENT TRACKER PRO - STATE MANAGEMENT
 * Handles multi-project state, BOQ items, payment milestones, localStorage persistence, and JSON backup/restore.
 */

const STORAGE_KEY = 'CONSTRUCTION_PAYMENT_PRO_DATA_V1';

const AppState = {
  activeProjectId: 'proj_1',
  activeMilestoneId: 'ms_2',
  activeTab: 'tab-dashboard',
  activePrintDoc: 'pl03a',
  projects: []
};

// Default Sample Project Generator
function createSampleProject() {
  return {
    id: 'proj_1',
    info: {
      name: 'Xây dựng Trụ sở làm việc Ban Quản lý Dự án & Trung tâm Điều hành',
      code: 'DA-2026/XD-01',
      package: 'Gói thầu số 03: Thi công xây dựng và lắp đặt thiết bị công trình chính',
      investor: 'Ban Quản Lý Dự Án Đầu Tư Xây Dựng Khu Vực',
      contractor: 'Tổng Công Ty Xây Dựng Số 1 - CTCP',
      supervision: 'Công ty Cổ phần Tư vấn Giám sát & Quản lý Dự án Phương Nam',
      contractNo: 'HĐ-XD số 18/2025/HĐ-XD ngày 20/12/2025',
      signingDate: '2025-12-20',
      durationDays: 360,
      advancePct: 20, // 20% Tạm ứng hợp đồng
      retentionPct: 5, // 5% Giữ lại bảo hành công trình
      advanceAmount: 765400000, // Số tiền đã tạm ứng
      commander: 'Kỹ sư Nguyễn Văn Thắng (Chỉ huy trưởng)',
      qsEngineer: 'Kỹ sư Trần Anh Quân (Kỹ sư QS - Thanh toán)',
      supervisionChief: 'Kỹ sư Lê Hoàng Nam (Tư vấn giám sát trưởng)',
      investorRep: 'Ông Phạm Đức Minh (Giám đốc Ban QLDA)'
    },
    boqItems: [
      { id: 'boq_1', code: 'AA.11211', name: 'Đào móng công trình bằng máy đào 0.8m3, đất cấp II', unit: '100m3', contractQty: 12.5, variationQty: 0, unitPrice: 3800000 },
      { id: 'boq_2', code: 'AF.11111', name: 'Sản xuất, đổ bê tông lót móng M100, đá 2x4', unit: 'm3', contractQty: 85.0, variationQty: 0, unitPrice: 1180000 },
      { id: 'boq_3', code: 'AF.61111', name: 'Gia công lắp dựng ván khuôn móng, gỗ ván phủ phim', unit: '100m2', contractQty: 6.2, variationQty: 0.5, unitPrice: 19500000 },
      { id: 'boq_4', code: 'AF.61211', name: 'Gia công lắp dựng cốt thép móng, đường kính <= 18mm', unit: 'tấn', contractQty: 22.4, variationQty: 0, unitPrice: 24800000 },
      { id: 'boq_5', code: 'AF.21111', name: 'Sản xuất, đổ bê tông móng M250, đá 1x2, bằng bơm', unit: 'm3', contractQty: 235.0, variationQty: 0, unitPrice: 1520000 },
      { id: 'boq_6', code: 'AB.13111', name: 'Đắp cát hố móng, lu lèn đầm chặt K=0.95', unit: '100m3', contractQty: 8.0, variationQty: 0, unitPrice: 8500000 },
      { id: 'boq_7', code: 'AF.61311', name: 'Ván khuôn cột, dầm, sàn tầng 1 & tầng 2, phủ phim', unit: '100m2', contractQty: 28.5, variationQty: 1.2, unitPrice: 22000000 },
      { id: 'boq_8', code: 'AF.61411', name: 'Cốt thép cột, dầm, sàn tầng 1 & tầng 2, CB400/CB300', unit: 'tấn', contractQty: 48.6, variationQty: 0, unitPrice: 25200000 },
      { id: 'boq_9', code: 'AF.22111', name: 'Đổ bê tông cột, dầm, sàn tầng 1 & tầng 2, M300, đá 1x2', unit: 'm3', contractQty: 450.0, variationQty: 0, unitPrice: 1580000 },
      { id: 'boq_10', code: 'AK.11111', name: 'Xây tường gạch ống 8x8x18 mác 75, dày 200mm và 100mm', unit: 'm3', contractQty: 210.0, variationQty: 0, unitPrice: 1680000 },
      { id: 'boq_11', code: 'AK.21111', name: 'Trát tường trong và ngoài nhà, dày 1.5cm, vữa mác 75', unit: '100m2', contractQty: 18.0, variationQty: 0, unitPrice: 13200000 },
      { id: 'boq_12', code: 'AK.51111', name: 'Lát nền gạch Granite 600x600, vữa xi măng mác 75', unit: '100m2', contractQty: 8.5, variationQty: 0, unitPrice: 33500000 }
    ],
    milestones: [
      {
        id: 'ms_1',
        name: 'Đợt 1: Nghiệm thu hoàn thành Giai đoạn Ép cọc & Kết cấu Phần Ngầm',
        code: 'DOT-01',
        startDate: '2026-01-05',
        endDate: '2026-03-20',
        submissionDate: '2026-03-24',
        paymentDate: '2026-04-05',
        status: 'paid', // draft | inspected | approved | paid
        quantities: {
          'boq_1': 12.5, // Xong 100% đào móng
          'boq_2': 85.0, // Xong 100% bê tông lót
          'boq_3': 6.2,  // Xong ván khuôn móng
          'boq_4': 22.4, // Xong cốt thép móng
          'boq_5': 235.0,// Xong bê tông móng
          'boq_6': 8.0   // Xong đắp đất móng
        },
        chainageDetails: {
          'boq_1': { fromKm: 'Km0+000', toKm: 'Km0+450', position: 'Toàn tuyến', note: 'Đào hố móng trụ' }
        },
        advanceDeductionRate: 20,
        customAdvanceDeduction: null,
        retentionRate: 5,
        otherDeductions: 0,
        paidAmount: 935000000,
        notes: 'Đã hoàn tất thanh toán đợt 1 qua Kho bạc Nhà nước'
      },
      {
        id: 'ms_2',
        name: 'Đợt 2: Nghiệm thu hoàn thành Khung bê tông cốt thép Tầng 1 và Sàn Tầng 2',
        code: 'DOT-02',
        startDate: '2026-03-21',
        endDate: '2026-06-25',
        submissionDate: '2026-06-28',
        paymentDate: '2026-07-15',
        status: 'approved', // Hồ sơ đã ký duyệt A-B-TVGS, đang đợi giải ngân
        quantities: {
          'boq_1': 0,
          'boq_2': 0,
          'boq_3': 0.5,  // Phát sinh thêm theo phụ lục
          'boq_4': 0,
          'boq_5': 0,
          'boq_6': 0,
          'boq_7': 18.0, // Ván khuôn khung tầng 1 và sàn T2
          'boq_8': 30.5, // Cốt thép khung
          'boq_9': 280.0,// Bê tông cột dầm sàn
          'boq_10': 45.0 // Xây tường ngăn tầng 1
        },
        chainageDetails: {
          'boq_7': { fromKm: 'Km0+450', toKm: 'Km1+200', position: 'Trái tuyến', note: 'Khung cột trục 1-5' },
          'boq_8': { fromKm: 'Km0+450', toKm: 'Km1+200', position: 'Trái tuyến', note: 'Cốt thép sàn T2' }
        },
        advanceDeductionRate: 20,
        customAdvanceDeduction: null,
        retentionRate: 5,
        otherDeductions: 5000000, // Khấu trừ tiền điện nước thi công
        paidAmount: 0,
        notes: 'Hồ sơ đã nộp Kho bạc, đang chờ giải ngân chuyển khoản'
      },
      {
        id: 'ms_3',
        name: 'Đợt 3: Dự kiến Nghiệm thu Hoàn thành Khung tầng 2, Xây thô & Bắt đầu hoàn thiện',
        code: 'DOT-03',
        startDate: '2026-06-26',
        endDate: '2026-09-30',
        submissionDate: '2026-10-05',
        paymentDate: '2026-10-20',
        status: 'draft', // Kế hoạch dự kiến
        quantities: {
          'boq_7': 11.7, // Làm nốt ván khuôn
          'boq_8': 18.1, // Làm nốt cốt thép
          'boq_9': 170.0,// Làm nốt bê tông
          'boq_10': 120.0,// Xây tường tiếp
          'boq_11': 10.0 // Bắt đầu trát tường
        },
        chainageDetails: {
          'boq_10': { fromKm: 'Km1+200', toKm: 'Km2+500', position: 'Toàn tuyến', note: 'Xây tường ngăn' }
        },
        advanceDeductionRate: 20,
        customAdvanceDeduction: null,
        retentionRate: 5,
        otherDeductions: 0,
        paidAmount: 0,
        notes: 'Đợt dự kiến lập kế hoạch dòng tiền thi công'
      },
      {
        id: 'ms_4',
        name: 'Đợt 4: Nghiệm thu hoàn thiện Mặt đường & Vỉa hè',
        code: 'DOT-04',
        startDate: '2026-10-01',
        endDate: '2026-12-15',
        submissionDate: '2026-12-20',
        paymentDate: '',
        status: 'draft',
        quantities: {
          'boq_12': 250 // Hiện 250m
        },
        chainageDetails: {
          'boq_12': {
            fromKm: 'Km3+100',
            toKm: 'Km3+250',
            position: 'Trái tuyến',
            note: 'Thi công từ Km3+100 tới Km3+250 (chiều dài 150m)'
          }
        },
        advanceDeductionRate: 20,
        customAdvanceDeduction: null,
        retentionRate: 5,
        otherDeductions: 0,
        paidAmount: 0,
        notes: 'Đợt 4 thi công phân đoạn lý trình Km3+100 - Km3+250'
      }
    ]
  };
}

// Initializer
function initAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.projects && parsed.projects.length > 0) {
        AppState.projects = parsed.projects;
        AppState.activeProjectId = parsed.activeProjectId || AppState.projects[0].id;
        // Ensure chainageDetails initialized on all milestones
        AppState.projects.forEach(p => {
          (p.milestones || []).forEach(m => {
            if (!m.chainageDetails) m.chainageDetails = {};
          });
          // If demo project and missing ms_4, append sample ms_4
          if (p.id === 'proj_demo_highway_01' && !p.milestones.some(m => m.id === 'ms_4')) {
            const sample = createSampleProject();
            const ms4 = sample.milestones.find(m => m.id === 'ms_4');
            if (ms4) p.milestones.push(ms4);
          }
        });
        return;
      }
    }
  } catch (err) {
    console.warn('Could not load stored data, initializing default project:', err);
  }

  // First time or corrupted: load default demo project
  const defaultProj = createSampleProject();
  AppState.projects = [defaultProj];
  AppState.activeProjectId = defaultProj.id;
  AppState.activeMilestoneId = defaultProj.milestones[1].id; // Point to milestone 2
  saveAppState();
}

// Save to LocalStorage
function saveAppState() {
  try {
    const payload = {
      projects: AppState.projects,
      activeProjectId: AppState.activeProjectId,
      activeMilestoneId: AppState.activeMilestoneId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Getter for active project
function getActiveProject() {
  const p = AppState.projects.find(proj => proj.id === AppState.activeProjectId);
  if (!p && AppState.projects.length > 0) {
    AppState.activeProjectId = AppState.projects[0].id;
    return AppState.projects[0];
  }
  return p;
}

// Getter for active milestone
function getActiveMilestone() {
  const proj = getActiveProject();
  if (!proj || !proj.milestones || proj.milestones.length === 0) return null;
  const m = proj.milestones.find(ms => ms.id === AppState.activeMilestoneId);
  if (!m) {
    AppState.activeMilestoneId = proj.milestones[0].id;
    return proj.milestones[0];
  }
  return m;
}

// Export Full JSON Backup
function exportJSONBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.projects, null, 2));
  const dlAnchor = document.createElement('a');
  const now = new Date().toISOString().slice(0, 10);
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `SaoLuu_ThanhToanCongTrinh_${now}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

// Import JSON Backup
function importJSONBackup(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].info && parsed[0].boqItems) {
      AppState.projects = parsed;
      AppState.activeProjectId = parsed[0].id;
      AppState.activeMilestoneId = parsed[0].milestones && parsed[0].milestones[0] ? parsed[0].milestones[0].id : null;
      saveAppState();
      return { success: true, count: parsed.length };
    } else {
      return { success: false, error: 'Định dạng file JSON không hợp lệ với cấu trúc dự án.' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Reset to Sample Demo Data
function resetToSampleDemo() {
  const sample = createSampleProject();
  AppState.projects = [sample];
  AppState.activeProjectId = sample.id;
  AppState.activeMilestoneId = sample.milestones[1].id;
  saveAppState();
}

// Helper: Escape HTML string
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Format Currency (VND)
function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('vi-VN');
}

// Helper: Format Decimal Quantity (up to 3 decimal places without trailing zeroes)
function formatQty(qty) {
  if (qty === null || qty === undefined || isNaN(qty)) return '0';
  const num = parseFloat(qty);
  return Number(num.toFixed(3)).toLocaleString('vi-VN');
}

// Helper: Format Date
function formatDateVN(dateStr) {
  if (!dateStr) return '--/--/----';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
