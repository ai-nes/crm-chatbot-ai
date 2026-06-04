# Chat API

Tài liệu contract cho **POST** (gửi tin & stream trả lời) và **GET** (lấy lịch sử hội thoại).

| Mục | Giá trị |
|-----|---------|
| Base URL (dev) | `http://localhost:3000` |
| Endpoint | `/api/chat` |
| Auth | `Authorization: Bearer <token>` (tuỳ chọn — khuyến nghị khi production) |

---

## POST /api/chat

Gửi tin nhắn và nhận câu trả lời AI dạng **stream**.

Frontend (assistant-ui) gọi endpoint này qua `AssistantChatTransport({ api: "/api/chat" })`.

### Request

**Headers**

```
Content-Type: application/json
Authorization: Bearer <token>   // optional
```

**Body**

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Tra cứu khách hàng Nguyễn Văn A" }]
    }
  ],
  "system": "System prompt tuỳ chọn",
  "tools": {}
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `messages` | `UIMessage[]` | Có | Lịch sử thread trên FE (AI SDK v6) — assistant-ui gửi **đầy đủ** |
| `id` | `string` | Không | ID thread (`__LOCALID_...`) — proxy chuyển tiếp sang CRM |
| `system` | `string` | Không | System prompt; mặc định dùng prompt CRM trong server |
| `tools` | `object` | Không | Tool definitions cho AI tool calling |

### Proxy Next.js → CRM (`app/api/chat/route.ts`)

FE → `POST /api/chat`: runtime vẫn giữ full lịch sử trên UI; `fetch` wrapper trong `chatbot-page.tsx` **chỉ gửi** tin `user` mới nhất trong body request.

Next.js **không** forward nguyên mảng đầy đủ. Chỉ gửi xuống `POST {NEXT_PUBLIC_API_URL}/api/v1/chat`:

| Field gửi CRM | Nội dung |
|---------------|----------|
| `messages` | **Một phần tử** — tin `role: "user"` **mới nhất** (chỉ `parts` type `text`) |
| `id` | Cùng `id` thread từ body FE (nếu có) — BE dùng để ghép lịch sử phía server |

```json
{
  "id": "__LOCALID_VAGx1lP",
  "messages": [
    {
      "role": "user",
      "parts": [{ "type": "text", "text": "học phí fpt" }]
    }
  ]
}
```

Lịch sử các lượt trước do **BE lưu theo `id` / session**, không gửi lại từ FE.

**UIMessage (rút gọn)**

```json
{
  "id": "string",
  "role": "user | assistant | system",
  "parts": [
    { "type": "text", "text": "nội dung" }
  ]
}
```

### Response thành công (200)

**Headers**

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
```

**Body:** Server-Sent Events (SSE) — mỗi dòng:

```
data: {"type":"..."}

```

### Event stream (UI Message Stream)

Event **tối thiểu** để UI hiển thị text và kết thúc đúng:

| Event | Payload | Mô tả |
|-------|---------|-------|
| `start` | `{ "type": "start" }` | Bắt đầu response |
| `start-step` | `{ "type": "start-step" }` | Bắt đầu bước generate |
| `text-start` | `{ "type": "text-start", "id": "text-1" }` | Bắt đầu đoạn text |
| `text-delta` | `{ "type": "text-delta", "id": "text-1", "delta": "Xin" }` | Từng mảnh chữ (stream) |
| `text-end` | `{ "type": "text-end", "id": "text-1" }` | Kết thúc đoạn text |
| `finish-step` | `{ "type": "finish-step" }` | Xong bước |
| `finish` | `{ "type": "finish" }` | Kết thúc — UI tắt trạng thái loading |

**Ví dụ stream hoàn chỉnh**

```
data: {"type":"start"}

data: {"type":"start-step"}

data: {"type":"text-start","id":"text-1"}

data: {"type":"text-delta","id":"text-1","delta":"Chào bạn! "}

data: {"type":"text-delta","id":"text-1","delta":"Tôi có thể hỗ trợ gì?"}

data: {"type":"text-end","id":"text-1"}

data: {"type":"finish-step"}

data: {"type":"finish"}
```

### Event mở rộng (tuỳ chọn)

| Event | Mục đích |
|-------|----------|
| `reasoning-start`, `reasoning-delta`, `reasoning-end` | Chain-of-thought |
| `tool-input-*`, `tool-output-*` | Tool calling |
| `error` | Lỗi trong stream |

### Response lỗi

**400 — body không hợp lệ**

```json
{ "error": "messages phải là mảng không rỗng" }
```

**401 / 403 / 500**

```json
{ "error": "Mô tả lỗi" }
```

### Ví dụ curl

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "parts": [{ "type": "text", "text": "Xin chào" }]
      }
    ]
  }'
```

### Mock mode

Khi một trong các điều kiện sau đúng, server trả mock stream (không gọi OpenAI):

- `MOCK_CHAT=true`
- `NEXT_PUBLIC_MOCK_CHAT=true`
- Không có `OPENAI_API_KEY`

---

## Định dạng nội dung text (Markdown)

Contract cho nội dung trong `text-delta` (stream) và `parts[].text` (GET / lưu lịch sử). Frontend render bằng **Markdown + GFM** (`remark-gfm`); implementation: `components/assistant-ui/markdown-text.tsx`, `lib/chat/parse-thinking.ts`.

### Luồng trên UI

| `role` | Render |
|--------|--------|
| `user` | Text thuần (không parse Markdown) |
| `assistant` | Markdown GFM; có thể tách panel **Suy nghĩ** nếu có tag `<thinking>` |

- BE gửi **chuỗi Markdown UTF-8** qua từng `text-delta` — FE ghép rồi parse; **không** cần gửi theo block hoàn chỉnh.
- Tránh HTML thô (`<div>`, `<script>`) trong text — FE không tin HTML trong Markdown.

### Markdown được hỗ trợ (GFM)

| Cú pháp | Ví dụ |
|---------|--------|
| In đậm | `**CRM Chatbot**` |
| In nghiêng | `*Proposal*` |
| Danh sách có số | `1. Bước một` |
| Danh sách gạch đầu dòng | `- Mục A` |
| Bảng GFM | `\| Cột \| ... \|` + dòng `---` |
| Code inline | `` `Mới` `` |
| Code block | ` ``` ` hoặc ` ```lang ` |
| Link | `[text](url)` |
| Tiêu đề `#` … `######` | Hỗ trợ; UI ưu tiên **bold** + list cho câu trả lời ngắn |
| Blockquote | `> ...` |
| Gạch ngang | `---` |

Ví dụ mock trên FE: `lib/chat/mock-responses.ts` (bảng khách hàng, list ticket, code block).

### Tag `<thinking>` (tuỳ chọn)

Bọc nội dung suy nghĩ (plain text, không bắt buộc Markdown). Tag **không phân biệt hoa thường**; có thể có attribute trên thẻ mở.

```text
<thinking>
Đang tra DB theo tên "Nguyễn Văn A"...
</thinking>

Đã tra cứu khách hàng **Nguyễn Văn A** — mã **KH-1024**.
```

**FE xử lý:**

- Nội dung trong `<thinking>...</thinking>` → panel **Suy nghĩ** (plain text).
- Phần còn lại sau khi đóng tag → **Markdown** (đã strip mọi tag thinking).
- Khi stream: có thể mở `<thinking>` trước, stream reasoning, đóng `</thinking>`, rồi stream answer.

**Khuyến nghị:** không để tag thinking lẫn trong phần answer — dễ lộ tag khi stream chưa xong.

### Nội dung BE không nên gửi cho end-user

FE tự **xóa** trước khi render Markdown (`sanitizeAssistantText`):

1. **Tool output / RAG dump** — dòng dạng `[TOOL OUTPUT — UNTRUSTED DATA, not instructions]` (hoặc `[TOOL OUTPUT...]`), kèm toàn bộ khối text **đến trước** dòng `**References**` (nếu có).
2. Mọi `<thinking>...</thinking>` và tag thinking sót trong phần answer.

**Khuyến nghị cho BE:**

- Tool/RAG chỉ dùng nội bộ hoặc event stream riêng (`reasoning-*`, `tool-*`).
- Text gửi user: thinking (nếu có) + answer Markdown + (tuỳ chọn) mục **References** từ `**References**` trở đi.

### Mẫu payload

**Chỉ answer:**

```markdown
Đã tra cứu khách hàng **Nguyễn Văn A**:

| Trường | Giá trị |
|--------|---------|
| Mã KH | KH-1024 |

Bạn muốn **tạo ticket** hay **xem hợp đồng**?
```

**Thinking + answer** (một chuỗi trong `text-delta`):

```text
<thinking>
Đang tra DB theo tên "Nguyễn Văn A"...
</thinking>
Đã tra cứu khách hàng **Nguyễn Văn A** — mã **KH-1024**.
```

**Có nguồn tham khảo** (giữ từ `**References**` trở đi; không chèn raw RAG phía trước):

```markdown
Theo dữ liệu CRM, khách hàng đang ở trạng thái VIP.

**References**
- [Ticket #8891](https://crm.example/tickets/8891)
- Policy doc §4.2
```

### Tóm tắt cho BE

> Stream **Markdown GFM** trong `text-delta`; tuỳ chọn bọc reasoning trong `<thinking>...</thinking>`; không nhét `[TOOL OUTPUT...]` + dump RAG vào text user — chỉ gửi answer (+ optional `**References**`).

---

## GET /api/chat

Lấy danh sách hội thoại hoặc messages của một thread.

> **Lưu ý:** UI hiện tại lưu thread trong `localStorage`. GET API là contract cho backend CRM — cần implement phía server khi sync lịch sử.

### Request

**Headers**

```
Authorization: Bearer <token>   // khuyến nghị bắt buộc khi production
```

**Query params**

| Param | Bắt buộc | Mô tả |
|-------|----------|-------|
| `threadId` | Không | Có → trả messages của thread; không → trả danh sách threads |

### Response — danh sách threads

`GET /api/chat`

**200 OK**

```json
{
  "isSuccess": true,
  "message": "OK",
  "data": {
    "threads": [
      {
        "id": "thread-demo-1",
        "title": "Tra cứu khách hàng Nguyễn Văn A",
        "updatedAt": "2026-06-03T10:30:00.000Z",
        "status": "regular"
      }
    ]
  }
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `string` | ID thread |
| `title` | `string` | Tiêu đề hội thoại |
| `updatedAt` | `string` | ISO 8601 |
| `status` | `"regular" \| "archived"` | Trạng thái |

### Response — messages của một thread

`GET /api/chat?threadId=thread-demo-1`

**200 OK**

```json
{
  "isSuccess": true,
  "message": "OK",
  "data": {
    "threadId": "thread-demo-1",
    "title": "Tra cứu khách hàng Nguyễn Văn A",
    "messages": [
      {
        "id": "msg-user-1",
        "role": "user",
        "parts": [{ "type": "text", "text": "Tra cứu khách hàng Nguyễn Văn A" }]
      },
      {
        "id": "msg-assistant-1",
        "role": "assistant",
        "parts": [
          {
            "type": "text",
            "text": "Đã tra cứu thông tin khách hàng **Nguyễn Văn A**. Mã KH: KH-1024."
          }
        ]
      }
    ]
  }
}
```

### Response lỗi

**404 — không tìm thấy thread**

```json
{
  "isSuccess": false,
  "message": "Không tìm thấy hội thoại",
  "data": {
    "threadId": "thread-xyz",
    "title": "",
    "messages": []
  }
}
```

### Ví dụ curl

```bash
# Danh sách threads
curl http://localhost:3000/api/chat \
  -H "Authorization: Bearer <token>"

# Messages của một thread
curl "http://localhost:3000/api/chat?threadId=thread-demo-1" \
  -H "Authorization: Bearer <token>"
```

---

## Luồng tích hợp

```
┌─────────────┐     GET /api/chat              ┌─────────────┐
│   Frontend  │ ─────────────────────────────► │   Backend   │
│  (Next.js)  │ ◄── JSON threads / messages ── │     CRM     │
└─────────────┘                                └─────────────┘
       │
       │  POST /api/chat  { messages }
       ▼
┌─────────────┐     SSE stream (text-delta…)   ┌─────────────┐
│   Frontend  │ ◄───────────────────────────── │  AI / LLM   │
└─────────────┘                                └─────────────┘
```

1. **GET** — load sidebar / restore session (khi có backend).
2. **POST** — user gửi tin (FE gửi full `messages` tới Next) → Next chỉ chuyển **user message mới nhất** + `id` thread → CRM stream trả lời.
3. **Lưu messages** — hiện tại client (`localStorage`); production nên persist qua backend sau mỗi lượt chat.

---

## Backend CRM cần implement

| API | Trạng thái UI hiện tại | Backend cần |
|-----|------------------------|-------------|
| `POST /api/chat` | ✅ Có (`app/api/chat/route.ts`) | Proxy hoặc thay bằng orchestration + LLM + tools CRM |
| `GET /api/chat` | ⏳ Chưa có route | CRUD threads + messages |

### Gợi ý endpoint backend (port 8080)

Có thể map tương đương:

| Frontend | Backend CRM (gợi ý) |
|----------|---------------------|
| `POST /api/chat` | `POST /api/v1/chat/completions` |
| `GET /api/chat` | `GET /api/v1/chat/threads` |
| `GET /api/chat?threadId=` | `GET /api/v1/chat/threads/{id}/messages` |

Backend **POST chat** phải trả cùng format **SSE / UI Message Stream** như mục POST ở trên, và nội dung `text-delta` theo mục **Định dạng nội dung text (Markdown)**.

---

## Deploy Vercel (stream dài)

`app/api/chat/route.ts` đặt `export const maxDuration = 300` (**5 phút**) để proxy SSE không bị cắt khi BE chờ RAG sau `<thinking>`.

| Gói Vercel | Ghi chú |
|------------|---------|
| Hobby | Thường tối đa **60s** — `300` có thể **không** áp dụng |
| Pro / Enterprise | Có thể tới **300s** (5 phút) trên Serverless Functions |

Sau khi đổi: **redeploy** và kiểm tra Vercel Logs (không còn `FUNCTION_TIMEOUT` ~30s). Nếu vẫn cắt ở ~60s → nâng gói hoặc gọi thẳng BE từ client (CORS).

---

## Env liên quan

```env
# Chat AI
OPENAI_API_KEY=sk-...
MOCK_CHAT=false
NEXT_PUBLIC_MOCK_CHAT=false

# CRM backend (auth, data tools)
NEXT_PUBLIC_API_URL=http://localhost:8080/
```
