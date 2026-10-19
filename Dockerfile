# Build Node app
FROM node:24-trixie
# Corepack runs the Yarn version set in the packageManager field of package.json, in place of the image's Yarn 1.
# Make sure to install from npm since Node.js 25+ no longer bundles it.
RUN npm install -g corepack
WORKDIR /app
# Install all the json package dependencies in an intermediary image. To do so, we copy each package.json files
# and run yarn install which will download all the listed packages in the image.
COPY package.json yarn.lock ./
COPY localisation/package.json localisation/package.json
# As an optimisation we would only copy the package.json first before the yarn install, but we need the
# local packages in evolution for yarn install to work
COPY evolution evolution
RUN yarn install

# Copy the source. (node_modules are excluded in .dockerignore)
COPY localisation localisation

# Setup the example as a default configuration for the image
COPY .env.example /app/.env

RUN yarn compile

# Start Node app
CMD yarn build:prod && yarn start
EXPOSE 8080
