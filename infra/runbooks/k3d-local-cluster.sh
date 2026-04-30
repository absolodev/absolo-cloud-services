#!/usr/bin/env bash
set -e

# Creates a k3d local cluster mimicking our production target

echo "=> Creating local k3d cluster"

k3d cluster create absolo-local \
  --api-port 6550 \
  -p "80:80@loadbalancer" \
  -p "443:443@loadbalancer" \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0"

echo "=> Waiting for cluster nodes to be ready"
kubectl wait --for=condition=Ready nodes --all --timeout=60s

echo "=> Creating namespaces"
kubectl create namespace absolo-system || true
kubectl create namespace apps || true

echo "=> Done! Use 'kubectl cluster-info' to verify."

