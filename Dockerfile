FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies for Next.js build)
RUN npm install

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app ./

CMD ["npm", "run", "start"]
