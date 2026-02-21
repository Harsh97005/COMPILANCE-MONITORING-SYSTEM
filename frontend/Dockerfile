FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]
