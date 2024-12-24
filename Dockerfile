# syntax=docker/dockerfile:1
# read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
# you will also find guides on how best to write your Dockerfile
ARG INCLUDE_DB=false

ARG PARSER_URL
ARG DATA_SERVER_URL
ARG ECOLE_PASSWORD
ARG MONGODB_URL=mongodb+srv://user:user@image-databases.9769cri.mongodb.net/

# stage that install the dependencies
FROM node:20 as builder-production

WORKDIR /app

COPY --link --chown=1000 package-lock.json package.json ./
RUN --mount=type=cache,target=/app/.npm \
        npm set cache /app/.npm && \
        npm ci --omit=dev

FROM builder-production as builder
RUN npm install -g npm@11.0.0

ARG APP_BASE=
ARG PUBLIC_APP_COLOR=blue

RUN --mount=type=cache,target=/app/.npm \
        npm set cache /app/.npm && \
        npm ci

COPY --link --chown=1000 . .

RUN npm run build

# mongo image
FROM mongo:latest as mongo

# image to be used if INCLUDE_DB is false
FROM node:20-slim as local_db_false

# image to be used if INCLUDE_DB is true
FROM node:20-slim as local_db_true

RUN apt-get update
RUN apt-get install gnupg curl -y
# copy mongo from the other stage
COPY --from=mongo /usr/bin/mongo* /usr/bin/

ENV MONGODB_URL=mongodb://localhost:27017
RUN mkdir -p /data/db
RUN chown -R 1000:1000 /data/db

# final image
FROM local_db_${INCLUDE_DB} as final

# build arg to determine if the database should be included
ARG INCLUDE_DB=false
ENV INCLUDE_DB=${INCLUDE_DB}

# svelte requires APP_BASE at build time so it must be passed as a build arg
ARG APP_BASE=
# tailwind requires the primary theme to be known at build time so it must be passed as a build arg
ARG PUBLIC_APP_COLOR=blue


# install dotenv-cli
RUN npm install -g dotenv-cli

# switch to a user that works for spaces
RUN userdel -r node
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

WORKDIR /app

# add a .env.local if the user doesn't bind a volume to it
RUN touch /app/.env.local

# get the default config, the entrypoint script and the server script
COPY --chown=1000 package.json /app/package.json
COPY --chown=1000 .env /app/.env
COPY --chown=1000 entrypoint.sh /app/entrypoint.sh
COPY --chown=1000 gcp-*.json /app/

#import the build & dependencies
COPY --from=builder --chown=1000 /app/build /app/build
COPY --from=builder --chown=1000 /app/node_modules /app/node_modules

RUN npx playwright install

USER root
RUN npx playwright install-deps
USER user

ENV HF_TOKEN=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
ENV APP_BASE=""
ENV PUBLIC_APP_NAME=ECOLE-MIRACLE 
ENV PUBLIC_APP_ASSETS=ecole
ENV PUBLIC_APP_COLOR=black
ENV PUBLIC_APP_DESCRIPTION= 
ENV PUBLIC_APP_DATA_SHARING=
ENV PUBLIC_APP_DISCLAIMER=
ENV PUBLIC_APP_DISCLAIMER_MESSAGE=""
ENV LLM_SUMMERIZATION=

# Setting environment variables using build arguments
ENV MONGODB_URL=${MONGODB_URL}
ENV MODELS='[{"endpoints": [{"type": "tgi","url": "${PARSER_URL}/generate"}]}]'

# Configuring additional environment variables
ENV DATA_SERVER_URL=${DARA_SERVER_URL}
ENV ECOLE_PASSWORD=${ECOLE_PASSWORD}

RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/bin/bash", "-c", "/app/entrypoint.sh"]
