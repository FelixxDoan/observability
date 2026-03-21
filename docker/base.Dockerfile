FROM node:20-alpine

RUN apk add --no-cache tini git ca-certificates \
  && corepack enable \
  && corepack prepare pnpm@9.15.4 --activate

WORKDIR /workspace

# chốt store path trùng với volume mount
ENV PNPM_STORE_DIR=/pnpm-store
RUN pnpm config set store-dir /pnpm-store

ENTRYPOINT ["/sbin/tini","--"]
CMD ["sh"]