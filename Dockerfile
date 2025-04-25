ARG NODE_VERSION=22

################################################################################
# Use node image for base image for all stages.
# Using Alpine variant for a smaller image size.
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory for all build stages.
WORKDIR /usr/src/app

################################################################################
# Create a stage for installing production dependencies.
FROM base AS deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage bind mounts to package.json and package-lock.json to avoid having to copy them
# into this layer.
# Use npm ci for clean and reproducible dependency installation.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps AS build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
# This step is often needed for build tools, linters, test runners, etc.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the source files into the image.
COPY . .

# Run the build script defined in package.json.
# This typically compiles source code (e.g., TypeScript, Babel) into a 'dist' or 'build' folder.
RUN npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base AS final

# Use production node environment by default.
ENV NODE_ENV production

# Run the application as a non-root user for security best practice.
# The 'node' user is created by the official Node.js Docker images.
USER node

# Copy package.json so that package manager commands can be used (e.g., npm run dev).
COPY package.json .

# Copy the production dependencies from the deps stage.
# Ensure this path is correct based on your project structure.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the built application files from the build stage.
# Adjust the source path (/usr/src/app/dist) and destination path (./dist)
# if your build process outputs to a different location.
COPY --from=build /usr/src/app/dist ./dist

# Expose the port that the application listens on.
EXPOSE 4666

# Command to run the application when the container starts.
# Using 'npm run dev' as requested by the user.
CMD ["npm", "run", "dev"]
