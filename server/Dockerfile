FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema and migrations (needed for postinstall script)
COPY prisma ./prisma

# Install dependencies (this will run postinstall which generates Prisma client)
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Railway sets PORT env var, default to 3000)
EXPOSE 3000

# Health check (Railway will override this with its own healthcheck)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application (use deploy script to run migrations)
CMD ["npm", "run", "deploy"]