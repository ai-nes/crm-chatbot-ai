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
| `messages` | `UIMessage[]` | Có | Toàn bộ lịch sử thread hiện tại (AI SDK v6 format) |
| `system` | `string` | Không | System prompt; mặc định dùng prompt CRM trong server |
| `tools` | `object` | Không | Tool definitions cho AI tool calling |

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
2. **POST** — user gửi tin → stream trả lời realtime.
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

Backend **POST chat** phải trả cùng format **SSE / UI Message Stream** như mục POST ở trên.

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
