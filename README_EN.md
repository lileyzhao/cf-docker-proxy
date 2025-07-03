# 🐳 cf-docker-proxy

[中文](README.md) | English

![deploy](https://github.com/lileyzhao/cf-docker-proxy/actions/workflows/deploy.yaml/badge.svg)

A Docker registry proxy service built on Cloudflare Workers that provides accelerated access to Docker images from multiple registries including Docker Hub, GitHub Container Registry, Google Container Registry, Kubernetes Registry, and Quay.io.

## Features

- 🚀 Fast image pulling through Cloudflare's global edge network
- 🌐 Support for multiple registries (Docker Hub, ghcr.io, gcr.io, k8s.io, quay.io)
- 🔐 Automatic authentication handling
- 📊 Built-in status page and health monitoring
- 🆓 Free tier available with Cloudflare Workers
- ⚡ Zero maintenance required

## Deploy

### Quick Deploy (Recommended)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lileyzhao/cf-docker-proxy)

1. Click the "Deploy With Workers" button above
2. Sign in to your Cloudflare account
3. Fork the repository to your GitHub account
4. Connect your GitHub repository to Cloudflare Workers
5. Configure your custom domain (optional) in the Cloudflare dashboard
6. The worker will be deployed automatically

### Manual Deploy

1. Clone the repository:

   ```bash
   git clone https://github.com/lileyzhao/cf-docker-proxy.git
   cd cf-docker-proxy
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Deploy to Cloudflare Workers:

   ```bash
   pnpm run deploy
   ```

### Usage

After deployment, you can use your Docker proxy by setting it as your Docker registry mirror:

```bash
# Docker Hub (Simplified)
docker pull your-worker-domain.workers.dev/hello-world

# Docker Hub (Full Path)
docker pull your-worker-domain.workers.dev/docker.io/hello-world

# GitHub Registry
docker pull your-worker-domain.workers.dev/ghcr.io/distroless/static

# Google Registry
docker pull your-worker-domain.workers.dev/gcr.io/google-containers/pause

# Kubernetes Registry
docker pull your-worker-domain.workers.dev/k8s.io/pause

# Quay.io
docker pull your-worker-domain.workers.dev/quay.io/prometheus/node-exporter
```

Replace `your-worker-domain.workers.dev` with your actual Cloudflare Workers domain.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

Thanks to [cloudflare-docker-proxy](https://github.com/ciiiii/cloudflare-docker-proxy) project, this project references its code implementation.
