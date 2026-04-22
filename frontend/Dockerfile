FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile || npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA fallback — all routes serve index.html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
