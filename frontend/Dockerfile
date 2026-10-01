# --- build stage: compile the React app to static files ---
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build          # -> /app/dist

# --- serve stage: nginx serves the bundle + reverse-proxies the APIs ---
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/wiresploit.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
