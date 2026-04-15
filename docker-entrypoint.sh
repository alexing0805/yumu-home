#!/bin/sh
set -e

# ---- inject runtime env into nginx config ----
# Default HA target if not set
: "${HA_TARGET:=192.168.100.50:8123}"

export HA_TARGET

# envsubst replaces ${HA_TARGET} in nginx.conf
envsubst '${HA_TARGET}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> yumu-home starting"
echo "    HA target: http://${HA_TARGET}"
echo "    Listening: http://0.0.0.0:8080"

exec nginx -g 'daemon off;'
