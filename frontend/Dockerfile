# Etapa 1: compila o Angular (o resultado vai pra dist/)
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: o nginx serve o site compilado e repassa /api pro back
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/evandros-grill/browser /usr/share/nginx/html
EXPOSE 80
