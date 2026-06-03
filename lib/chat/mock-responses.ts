const DEFAULT_MOCK_REPLY = `Chào bạn! Tôi là **CRM Chatbot** (chế độ mock).

Bạn có thể thử hỏi về:
- **Tra cứu khách hàng** — ví dụ: "Tra cứu khách hàng Nguyễn Văn A"
- **Tạo ticket** — ví dụ: "Tạo ticket hỗ trợ"
- **Báo cáo doanh số** — ví dụ: "Xem báo cáo pipeline tháng này"

Tin nhắn này được stream giả lập để xem trước giao diện chat.`;

export const MOCK_CUSTOMER_REPLY = `Đã tra cứu thông tin khách hàng **Nguyễn Văn A**:

| Trường | Giá trị |
|--------|---------|
| Mã KH | KH-1024 |
| Email | nguyenvana@email.com |
| SĐT | 0901 234 567 |
| Phân loại | VIP |
| Doanh số YTD | 245.000.000 ₫ |

**Lịch sử gần đây**
1. 28/05 — Mua gói Enterprise (50 user)
2. 15/04 — Ticket #TK-8891 đã xử lý xong
3. 02/03 — Demo tính năng báo cáo pipeline

Bạn muốn tôi **tạo ticket**, **gửi email follow-up** hay **xem chi tiết hợp đồng**?`;

export const MOCK_TICKET_REPLY = `Hướng dẫn **tạo ticket hỗ trợ** trong CRM:

1. Vào menu **Hỗ trợ → Ticket mới**
2. Chọn khách hàng hoặc nhập mã KH
3. Điền **tiêu đề**, **mức độ ưu tiên**, **nhóm xử lý**
4. Gắn tag phù hợp (billing, kỹ thuật, onboarding…)
5. Bấm **Tạo & gán** cho agent phụ trách

Ticket mock vừa tạo: **#TK-9042** — trạng thái \`Mới\`, SLA phản hồi **4 giờ**.`;

export const MOCK_REPORT_REPLY = `**Báo cáo pipeline — Tháng 6/2026** (mock)

- Tổng giá trị pipeline: **1,82 tỷ ₫**
- Deal đang thương lượng: **12**
- Tỷ lệ chốt dự kiến: **34%**
- Top stage: *Proposal* (5 deal)

\`\`\`
Lead        ████████░░  8
Qualified   ██████░░░░  6
Proposal    █████░░░░░  5
Negotiation ███░░░░░░░  3
Won         ██░░░░░░░░  2
\`\`\`

Cần xuất **Excel** hay lọc theo **nhân viên kinh doanh**?`;

export const MOCK_CRM_GUIDE_REPLY = `**Hướng dẫn nhanh CRM Chatbot**

Các module chính:
- **Contacts** — quản lý khách hàng & lịch sử tương tác
- **Deals** — pipeline bán hàng theo giai đoạn
- **Tickets** — hỗ trợ sau bán & SLA
- **Reports** — dashboard KPI, doanh số, conversion

Mẹo: dùng ô chat này để tra cứu nhanh thay vì mở nhiều tab báo cáo.

*(Đây là dữ liệu mock — chưa kết nối backend thật.)*`;

export function getMockReply(userText: string): string {
  const text = userText.toLowerCase();

  if (
    text.includes("khách hàng") ||
    text.includes("tra cứu") ||
    text.includes("nguyễn")
  ) {
    return MOCK_CUSTOMER_REPLY;
  }

  if (text.includes("ticket") || text.includes("hỗ trợ")) {
    return MOCK_TICKET_REPLY;
  }

  if (
    text.includes("báo cáo") ||
    text.includes("doanh số") ||
    text.includes("pipeline")
  ) {
    return MOCK_REPORT_REPLY;
  }

  if (text.includes("hướng dẫn") || text.includes("crm")) {
    return MOCK_CRM_GUIDE_REPLY;
  }

  return DEFAULT_MOCK_REPLY;
}

export function extractUserText(messages: unknown[]): string {
  const lastUser = [...messages]
    .reverse()
    .find(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        (message as { role: string }).role === "user",
    ) as { parts?: { type: string; text?: string }[] } | undefined;

  const textPart = lastUser?.parts?.find((part) => part.type === "text");
  return textPart?.text?.trim() ?? "";
}
