# 🐳 cf-docker-proxy

中文 | [English](README_EN.md)

基于 Cloudflare Workers 构建的 Docker 镜像仓库代理服务，为 Docker Hub、GitHub Container Registry、Google Container Registry、Kubernetes Registry 和 Quay.io 等多个镜像仓库提供加速访问。

## 项目特点

**单域名支持多仓库**：与其他需要为每个仓库配置不同域名的代理不同，本项目只需一个域名即可支持所有主流镜像仓库。

## 特性

- 🔗 单域名支持所有仓库
- 🌐 支持多个镜像仓库（Docker Hub、ghcr.io、gcr.io、k8s.io、quay.io）
- 🚀 通过 Cloudflare 全球边缘网络加速镜像拉取

## 部署

### 快速部署（推荐）

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lileyzhao/cf-docker-proxy)

1. 点击上方的"部署到 Workers"按钮
2. 登录您的 Cloudflare 账户
3. 将仓库 fork 到您的 GitHub 账户
4. 将您的 GitHub 仓库连接到 Cloudflare Workers
5. 在 Cloudflare 控制台中配置自定义域名（可选）
6. Worker 将自动部署

### 手动部署

1. 克隆仓库：

   ```bash
   git clone https://github.com/lileyzhao/cf-docker-proxy.git
   cd cf-docker-proxy
   ```

2. 安装依赖：

   ```bash
   pnpm install
   ```

3. 部署到 Cloudflare Workers：

   ```bash
   pnpm run deploy
   ```

### 使用方法

部署完成后，您可以将 Docker 代理设置为镜像仓库镜像：

```bash
# Docker Hub（简化形式）
docker pull your-worker-domain.workers.dev/hello-world

# Docker Hub（完整路径）
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

将 `your-worker-domain.workers.dev` 替换为您实际的 Cloudflare Workers 域名。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

感谢 [cloudflare-docker-proxy](https://github.com/ciiiii/cloudflare-docker-proxy) 项目，本项目参考了其代码实现。
