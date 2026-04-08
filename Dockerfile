# 1. Use an official lightweight Node.js environment
FROM node:20-alpine

# 2. Define the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package files first to optimize build speed (caching)
COPY package*.json ./

# 4. Install only production dependencies
RUN npm install --production

# 5. Copy the rest of your SecureVault code
COPY . .

# 6. Expose the port your app uses (8080 or the one set in your .env)
EXPOSE 8080

# 7. The command to start your "Neural Link"
CMD ["node", "app.js"]