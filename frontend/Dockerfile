FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

# SPA build output → /app/ subdirectory
COPY --from=builder /app/dist /usr/share/nginx/html/app
RUN chmod -R a+r /usr/share/nginx/html/app

# Landing page → root
COPY --from=builder /app/static/landing.html /usr/share/nginx/html/landing.html

# Favicon → root (for landing page)
COPY --from=builder /app/public/favicon.svg /usr/share/nginx/html/favicon.svg

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
