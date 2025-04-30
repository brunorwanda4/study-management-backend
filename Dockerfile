ARG NODE_VERSION=22

################################################################################
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

################################################################################
FROM base AS deps

# Only copy package files for layer caching
COPY package.json package-lock.json ./

# Prevent postinstall from running temporarily
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
FROM deps AS build

# Allow postinstall now
ENV NPM_CONFIG_IGNORE_SCRIPTS=false

# Copy full source (including prisma/)
COPY . .

# Re-run postinstall explicitly now that prisma/schema.prisma is present
RUN npm run postinstall

# Optionally re-install dev dependencies (optional)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Build the app
RUN npm run build

################################################################################
FROM base AS final

ENV NODE_ENV=production
USER node

COPY package.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 4666
CMD ["npm", "run", "dev"]
