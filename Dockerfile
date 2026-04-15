# ============================================================
#  Stage 1 — Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# install deps first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# copy source & build
COPY . .

# Build with empty token — user sets token at runtime via the Settings UI
# HA_BASE stays as /ha-api because nginx handles the proxy
RUN VITE_HA_BASE=/ha-api \
    VITE_HA_TOKEN= \
    npm run build

# ============================================================
#  Stage 2 — Production (nginx-alpine, ~25MB)
# ============================================================
FROM nginx:1.27-alpine

# remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# copy nginx template (envsubst will process it at startup)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# copy built SPA
COPY --from=builder /app/dist /usr/share/nginx/html

# copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
