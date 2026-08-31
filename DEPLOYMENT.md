# Triển khai và tự chỉnh sửa báo cáo

## Nền tảng đang dùng

- Mã nguồn chuẩn: GitHub, nhánh `main`.
- Website: Netlify.
- Dữ liệu vệ sinh: Google Sheets, sheet `Kiểm tra vệ sinh` (`gid=0`).
- API trung gian: Netlify Function tại `/api/facility-sheet-data`.
- Trạng thái xử lý cảnh báo: lưu trực tiếp trên Netlify qua `/api/warning-audits`.

Phần cảnh báo không dùng Firebase, Google Apps Script hay token. Khi chọn một
trạng thái trên thẻ cơ sở, website tự lưu ngay và đồng bộ cho mọi thiết bị.

## Cách cập nhật khi không dùng ChatGPT Plus

1. Mở dự án trong Google AI Studio hoặc một trình soạn thảo mã nguồn.
2. Kéo phiên bản mới nhất từ nhánh `main` trên GitHub.
3. Chỉnh sửa và kiểm tra website.
4. Commit rồi push thay đổi lên nhánh `main`.
5. Netlify tự động build và xuất bản phiên bản mới.

Không chỉnh cùng một tệp ở nhiều công cụ vào cùng thời điểm. Luôn đồng bộ GitHub trước khi bắt đầu chỉnh sửa.

## Cấu hình build Netlify

- Build command: `npm run build:netlify`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Các giá trị này đã được lưu trong `netlify.toml`, nên không cần nhập lại khi tạo deploy mới từ repository.

## Kiểm tra sau khi deploy

- Trang chính: `/`
- Trạng thái website: `/api/health`
- Dữ liệu vệ sinh: `/api/facility-sheet-data?gid=0`
- Trạng thái cảnh báo theo ngày: `/api/warning-audits?date=YYYY-MM-DD`
- CSV toàn bộ nhật ký cho Google Sheets: `/api/warning-audits?format=csv`

Để quản lý nhật ký cảnh báo trong Google Sheets, nhập công thức sau vào ô `A1`
của một trang tính trống:

```text
=IMPORTDATA("https://bao-cao-quan-ly-chat-luong.netlify.app/api/warning-audits?format=csv")
```

Google Sheets sẽ tự tạo bảng gồm ngày, cơ sở, trạng thái xử lý, thời gian ghi
nhận, lý do cảnh báo và người xử lý. Không cần Apps Script hoặc token.

Phản hồi dữ liệu vệ sinh có trường `recordCount` để đối chiếu số hàng thực tế từ Google Sheets.

## Quay lại phiên bản cũ

Trong Netlify, mở **Deploys**, chọn một deploy trước đó và dùng chức năng khôi phục/đưa deploy đó lên production. Mã nguồn vẫn được lưu đầy đủ trên GitHub.
