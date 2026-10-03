# syntax=docker/dockerfile:1.7
# Admin web app as a static site behind nginx. Build from the REPO ROOT (Nx needs the workspace):
#   DOCKER_BUILDKIT=1 docker build -f apps/admin/Dockerfile -t coracure-admin .
#   docker run -p 8080:80 coracure-admin

FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first so this layer is cached until the lockfiles change.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
# Nx writes the bundle to dist/apps/admin (apps/admin/vite.config.mts).
RUN npx nx build admin

FROM nginx:1.27-alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/admin /usr/share/nginx/html
EXPOSE 80
