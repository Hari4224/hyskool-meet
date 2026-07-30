# HYSKOOL MEET Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies required for Vite build)
RUN npm ci

# Copy source code & assets
COPY . .

# Build Vite frontend assets for production
RUN npm run build

# Expose server port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
