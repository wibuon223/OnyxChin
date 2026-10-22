#!/usr/bin/env bash
# Bikin CA lokal + sertifikat untuk donghive.vip.
# Dipakai oleh tools/origin-spoof: browser harus percaya cert ini supaya
# https://donghive.vip bisa dilayani dari mesin sendiri.
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p certs
cd certs

HOST="${1:-donghive.vip}"

if [ -f ca.key ] && [ -f ca.crt ]; then
  echo "CA sudah ada (certs/ca.crt) — pakai yang lama."
else
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 3650 \
    -subj "/CN=Onyx Local CA" \
    -keyout ca.key -out ca.crt
  echo "CA dibuat: certs/ca.crt"
fi

openssl req -newkey rsa:2048 -sha256 -nodes \
  -subj "/CN=${HOST}" \
  -keyout site.key -out site.csr

cat > ext.cnf <<EOF
subjectAltName=DNS:${HOST},DNS:www.${HOST}
extendedKeyUsage=serverAuth
basicConstraints=CA:FALSE
EOF

openssl x509 -req -in site.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -days 825 -sha256 -extfile ext.cnf -out site.crt

rm -f site.csr ext.cnf
echo "Sertifikat siap: certs/site.crt + certs/site.key (CN=${HOST})"
