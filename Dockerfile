FROM alpine:latest
RUN apk add --no-cache su-exec

ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
ARG BUILD_DATE
ARG VCS_REF

LABEL build_version="Build-date:- ${BUILD_DATE} SHA:- ${VCS_REF}"

# Copy the statically linked executable
COPY transmission-rss_${TARGETOS}_${TARGETARCH} /usr/local/bin/transmission-rss

# Define build argument for port
ARG PORT=9093

# Set default environment variables
ENV TRANSMISSION_ENDPOINT=http://127.0.0.1:9091 \
    CONFIG_TYPE=toml \
    PUID=1000 \
    PGID=1000 \
    PORT=${PORT} \
    UPDATE_INTERVAL=60

# Expose the defined port
EXPOSE $PORT

# Set the default command
CMD ["sh", "-c", "su-exec \"${PUID}:${PGID}\" /usr/local/bin/transmission-rss -path /config -rpc \"${TRANSMISSION_ENDPOINT}/transmission/rpc\" -host \":${PORT}\" -config-type ${CONFIG_TYPE} -update ${UPDATE_INTERVAL}"]

