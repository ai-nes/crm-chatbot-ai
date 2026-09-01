# Nhúng CRM Chatbot vào ứng dụng khác

Chatbot được cung cấp qua route độc lập `/embed/chatbot`. Ứng dụng cha chỉ
cần nhúng route này bằng `iframe`, vì vậy không cần cài lại các dependency
React/Next của repo này.

## 1. Cấu hình origin được phép

Thêm biến môi trường khi build/deploy chatbot:

```env
NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS=https://portal.example.com,http://localhost:5173
NEXT_PUBLIC_EMBED_FULLSCREEN_URL=http://localhost:3000/crm-chatbot
```

Các origin cách nhau bằng dấu phẩy. Biến này được đọc lúc `next build`, nên
cần build lại sau khi thay đổi. Nếu bỏ trống, route vẫn cho phép iframe nhưng
auth bridge chỉ nhận message cùng origin; production nên khai báo allowlist.

## 2. Chế độ toàn màn hình

```html
<iframe
  src="https://chatbot.example.com/embed/chatbot"
  title="CRM Chatbot"
  loading="lazy"
  allow="microphone"
  style="display:block;width:100%;height:720px;border:0"
></iframe>
```

Container của app cha phải tự quyết định `width` và `height`. Route embed tự
co giãn theo kích thước viewport của iframe.

## 3. Chế độ popover nhỏ

Thêm loader sau khi deploy chatbot. Loader tự tạo một iframe nhỏ ở góc phải
dưới; khi người dùng mở chatbot, iframe tự mở rộng thành panel và thu nhỏ lại
khi đóng. Nếu có `NEXT_PUBLIC_EMBED_FULLSCREEN_URL`, nút mở rộng trong header
sẽ điều hướng app cha đến URL đó. Nếu không có biến này, iframe sẽ tự mở rộng
thành fullscreen và nút thu nhỏ đưa giao diện về lại popover.

```html
<script
  src="https://chatbot.example.com/embed/chatbot.js"
  data-chatbot-url="https://chatbot.example.com/embed/chatbot/popover"
></script>
```

Nếu không truyền `data-chatbot-url`, loader sẽ dùng route popover trên cùng
domain với file `chatbot.js`. Có thể đổi id iframe bằng `data-iframe-id`.

Nếu app cha tự quản lý launcher và kích thước popover (như dashboard CRM),
nhúng route sau để hiện đúng icon mở rộng trong header:

```text
https://chatbot.example.com/embed/chatbot?mode=popover
```

Khi người dùng bấm icon mở rộng, iframe gửi message
`{ type: "crm-chatbot:expand" }`; app cha có thể bắt message này và chuyển
sang route toàn màn hình của mình.

## 4. Truyền access token từ app cha

Không truyền token trên query string. Sau khi iframe phát tín hiệu `ready`,
app cha gửi token qua `postMessage`:

```html
<iframe
  id="crm-chatbot"
  src="https://chatbot.example.com/embed/chatbot"
  title="CRM Chatbot"
  allow="microphone"
  style="display:block;width:100%;height:720px;border:0"
></iframe>

<script>
  const chatbotOrigin = "https://chatbot.example.com";
  const chatbotFrame = document.getElementById("crm-chatbot");
  const accessToken = getAccessTokenFromYourApp();
  const refreshToken = getRefreshTokenFromYourApp();

  window.addEventListener("message", (event) => {
    if (
      event.origin !== chatbotOrigin ||
      event.source !== chatbotFrame.contentWindow ||
      event.data?.type !== "crm-chatbot:ready"
    ) {
      return;
    }

    chatbotFrame.contentWindow.postMessage(
      {
        type: "crm-chatbot:set-token",
        accessToken,
        refreshToken,
      },
      chatbotOrigin
    );
  });
</script>
```

Khi app cha refresh token, gửi lại cùng message `crm-chatbot:set-token`.
Chatbot cũng hỗ trợ message `{ type: "crm-chatbot:logout" }` để xóa phiên
đăng nhập trong iframe. Access token được chuyển tiếp từ `/api/chat` tới
upstream CRM API.

## 5. Lưu ý production

- HTTPS là bắt buộc nếu app cha và chatbot chạy khác domain.
- Backend API phải cho phép CORS từ origin của chatbot nếu frontend gọi API
  trực tiếp. Chat stream hiện tại đi qua `/api/chat` của chatbot nên không cần
  CORS giữa app cha và API upstream.
- Không dùng `*` trong `NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS` nếu iframe có thể
  nhận token hoặc dữ liệu riêng tư.
- Access token chỉ được bridge vào bộ nhớ Redux của iframe; refresh token của
  app cha không được ghi vào URL.
