# Dockerfile cho frontend (Next.js)
FROM node:18

# Đặt thư mục làm việc trong container
WORKDIR /app

# Sao chép file cấu hình
COPY package.json package-lock.json ./

# ✅ Cài đặt phụ thuộc, bỏ qua xung đột peer dependencies
RUN npm install --legacy-peer-deps

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Build project (tuỳ chỉnh nếu dùng next hoặc vite)
RUN npm run build

# Mở cổng
EXPOSE 3000

# Lệnh khởi chạy app
CMD ["npm", "start"]
