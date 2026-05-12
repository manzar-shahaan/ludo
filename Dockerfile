# ── Stage 1: Build the Vite SPA ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx vite build

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install only production dependencies (tsx is in dependencies, so it's included)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the pre-built Vite SPA
COPY --from=builder /app/dist ./dist

# Copy server TypeScript source (tsx compiles at runtime — see HOSTING.md for why)
COPY server/ ./server/

# Copy the src files the server imports via @/ path aliases
COPY src/net/ ./src/net/
COPY src/types/ ./src/types/
COPY src/constants.ts ./src/constants.ts
COPY src/store/initials/ ./src/store/initials/

# TypeScript config (tsx needs this for @/* alias resolution)
COPY tsconfig.server.json ./

EXPOSE 8080
ENV PORT=8080

CMD ["npx", "tsx", "--tsconfig", "tsconfig.server.json", "server/index.ts"]
