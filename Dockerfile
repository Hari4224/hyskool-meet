# HYSKOOL MEET Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code & pre-built dist assets
COPY . .

# Build Vite frontend assets for production
RUN npm run build

# Expose server port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
