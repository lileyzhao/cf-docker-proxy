# 🐳 cf-docker-proxy

[中文](README.md) | English

A Docker registry proxy service built on Cloudflare Workers that provides accelerated access to Docker images from multiple registries including Docker Hub, GitHub Container Registry, Google Container Registry, Kubernetes Registry, and Quay.io.

## ⚠️ Important Risk Warning

**Please carefully read and understand the following risk warning:**

Cloudflare updated its [Terms of Service](https://www.cloudflare.com/terms/) on December 3, 2024, explicitly stating that using their services as a proxy is prohibited. According to the restrictions in section 2.2.1 of the terms, using Cloudflare services as a proxy may be considered a violation of the terms of service and could result in account suspension.

**This project is intended for learning and technical research purposes only. Please use it cautiously after understanding the associated risks. If you choose to deploy this project, please remove the Cloudflare deployment within 24 hours.**

## Why This Project

**Single domain for multiple registries**: Unlike other proxies that require different domains for each registry, this project supports all mainstream image registries with just one domain.

## Features

- 🔗 Single Domain Support: One domain supports all mainstream image registries
- 🌐 Multi-Registry Support: Support for Docker Hub, ghcr.io, gcr.io, k8s.io, quay.io and more
- ⚡ Smart Load Balancing: Support multiple Docker Hub mirror sources with consistent source selection per image
- 🔧 Flexible Configuration: Dynamic mirror source configuration via environment variables with multiple format support
- 🚀 Global Acceleration: Fast image pulling through Cloudflare's global edge network

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

## 🔧 Advanced Configuration

### Multi-Mirror Load Balancing

This project supports configuring multiple mirror sources for all registries to achieve intelligent load balancing. You can add additional mirror sources for each registry through environment variables.

#### Configuration

Configure the corresponding environment variables in `wrangler.jsonc`:

```json
{
  "vars": {
    "DOCKER_IO_PROXY": "docker.1ms.run,docker.xuanyuan.me,docker-0.unsee.tech",
    "GHCR_IO_PROXY": "ghcr.mirror1.com,ghcr.mirror2.com",
    "GCR_IO_PROXY": "gcr.mirror1.com",
    "K8S_IO_PROXY": "k8s.mirror1.com,k8s.mirror2.com",
    "QUAY_IO_PROXY": "quay.mirror1.com"
  }
}
```

#### Supported Environment Variables

| Registry                  | Environment Variable | Description                     |
| ------------------------- | -------------------- | ------------------------------- |
| Docker Hub                | `DOCKER_IO_PROXY`    | Docker Hub mirror sources       |
| GitHub Container Registry | `GHCR_IO_PROXY`      | GitHub container mirror sources |
| Google Container Registry | `GCR_IO_PROXY`       | Google container mirror sources |
| Kubernetes Registry       | `K8S_IO_PROXY`       | Kubernetes mirror sources       |
| Quay.io                   | `QUAY_IO_PROXY`      | Red Hat Quay mirror sources     |

#### Supported Configuration Formats

1. **Multiple mirror sources (comma-separated)**:

   ```json
   {
     "vars": {
       "DOCKER_IO_PROXY": "docker.1ms.run,docker.xuanyuan.me,docker-0.unsee.tech"
     }
   }
   ```

2. **Single mirror source**:

   ```json
   {
     "vars": {
       "DOCKER_IO_PROXY": "docker.1ms.run"
     }
   }
   ```

#### Smart Features

- **Consistency Guarantee**: All requests (auth, manifest, blob layers) for the same Docker image use the same mirror source
- **Auto Protocol**: URLs don't need `https://` prefix, the system adds it automatically
- **Mixed Protocols**: Support mixing HTTP and HTTPS, e.g., `https://mirror1.com,http://internal-mirror,mirror2.com`
- **Load Distribution**: Different images are distributed across different mirror sources for load balancing
- **Failover Ready**: Quick switching to other sources if a mirror becomes unavailable

#### How It Works

The system uses a consistent hashing algorithm to determine a fixed mirror source based on the image name. For example:

- All requests for `nginx` image → `docker.1ms.run`
- All requests for `redis` image → `docker.xuanyuan.me`
- All requests for `mysql` image → `docker-0.unsee.tech`

This ensures that all related requests during Docker image pulling use the same mirror source, avoiding issues caused by cross-source requests.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

Thanks to [cloudflare-docker-proxy](https://github.com/ciiiii/cloudflare-docker-proxy) project, this project references its code implementation.
