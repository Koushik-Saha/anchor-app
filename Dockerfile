# Anchor — web (PWA) image for Coolify.
# Stage 1 builds the static site; stage 2 serves dist/ with nginx (no Node at runtime).
# TLS is terminated by Coolify's proxy; this container speaks plain HTTP on port 80.

FROM node:22-alpine AS build
WORKDIR /app
# Install exactly what package-lock.json pins (incl. the right native binaries for this CPU).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Same gate as CI: type-check, then build (PWA manifest + service worker included).
RUN npm run build && npm run size

FROM nginx:1.30-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
