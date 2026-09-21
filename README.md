# Construction Payment Tracker Pro - Quản Lý Thanh Toán & Khối Lượng Nghiệm Thu

Hệ thống quản lý chuyên sâu thanh quyết toán công trình, kiểm soát khối lượng đã nghiệm thu kỳ trước, khối lượng kỳ này, khối lượng và dòng tiền dự kiến còn lại, tự động tính khấu trừ tạm ứng, giữ bảo hành và xuất báo cáo Excel đa Sheet.

---

## 📁 Cấu Trúc Dự Án (Phân Tách Rõ Ràng Python & HTML/Giao Diện)

Dự án được phân chia module rõ ràng để bạn nạp vào **Visual Studio Code** và phát triển thêm chức năng:

```text
construction-payment-tracker/
│
├── 🐍 backend/                   ==> [PHẦN PYTHON: Xử lý dữ liệu & Máy chủ API]
│   ├── main.py                  # Server FastAPI cung cấp API và nạp frontend
│   ├── calculator.py            # Module Python tính toán khối lượng, lũy kế, dự kiến còn lại
│   ├── excel_exporter.py        # Module Python xuất file Excel định dạng đẹp (openpyxl)
│   └── requirements.txt         # Danh sách thư viện Python cần thiết
│
├── 🌐 frontend/                  ==> [PHẦN GIAO DIỆN: HTML, CSS, JavaScript]
│   ├── index.html               # Trang giao diện chính (Dashboard, Bảng BOQ, Bảng nghiệm thu)
│   ├── css/
│   │   └── style.css            # Định dạng bảng tính, màu sắc, bản in khổ A4
│   ├── js/
│   │   ├── state.js             # Quản lý trạng thái, lưu trữ LocalStorage, xuất/nhập JSON
│   │   ├── calculator.js        # Logic tính toán khối lượng & khấu trừ tức thì trên trình duyệt
│   │   ├── excel-service.js     # Đọc file Excel BOQ và xuất báo cáo Excel (SheetJS)
│   │   ├── ui-renderer.js       # Render DOM, các thẻ KPI, bảng dữ liệu và bản in
│   │   └── app.js               # Điều phối các sự kiện, chuyển Tab, phím tắt
│   └── libs/                    # Thư viện offline (Tailwind CSS, FontAwesome, SheetJS)
│
├── ⚙️ .vscode/                   ==> [CẤU HÌNH CHO VISUAL STUDIO CODE]
│   ├── launch.json              # Bấm F5 trong VS Code là ứng dụng chạy ngay
│   └── settings.json            # Cấu hình môi trường soạn thảo
│
├── 🚀 run_app.py                 # File Python 1-Click: Tự động chạy server & mở trình duyệt
├── ⚡ open_app.bat               # File khởi chạy nhanh không cần gõ lệnh
└── 📖 README.md                  # Hướng dẫn chi tiết này
```

---

## 💻 Cách Nạp Vào Visual Studio Code & Khởi Chạy

### 1. Mở dự án trong VS Code:
1. Mở **Visual Studio Code**.
2. Chọn menu **File** $\rightarrow$ **Open Folder...** (hoặc nhấn `Ctrl + K, Ctrl + O`).
3. Chọn thư mục `construction-payment-tracker`.

### 2. Cách chạy ứng dụng:
- **Cách 1 (Dùng phím tắt F5 trong VS Code)**:
  - Nhấn phím **F5** (hoặc vào menu **Run** $\rightarrow$ **Start Debugging**).
  - Trình duyệt sẽ tự động bật lên tại `http://localhost:8000`.

- **Cách 2 (Dùng Terminal của VS Code)**:
  - Mở Terminal trong VS Code (`Ctrl + ~`).
  - Gõ lệnh:
    ```bash
    python run_app.py
    ```

- **Cách 3 (Chạy độc lập không cần máy chủ)**:
  - Nhấp đúp vào file `open_app.bat` hoặc mở trực tiếp `frontend/index.html` trong bất kỳ trình duyệt nào.

---

## 🛠️ Hướng Dẫn Bổ Sung Thêm Tính Năng Theo Nhu Cầu

- **Nếu muốn viết thêm xử lý logic bằng Python**:
  - Mở thư mục `backend/`, thêm hàm mới vào `calculator.py` hoặc tạo file `.py` mới.
  - Viết API endpoint trong `backend/main.py` để giao diện gọi đến khi cần.

- **Nếu muốn sửa đổi giao diện hoặc thêm bảng tính**:
  - Mở `frontend/index.html` để thêm giao diện.
  - Mở `frontend/js/` để bổ sung logic hiển thị hoặc sự kiện nút bấm.
