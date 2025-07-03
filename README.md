# 🐳 cf-docker-proxy

中文 | [English](README_EN.md)

基于 Cloudflare Workers 构建的 Docker 镜像仓库代理服务，为 Docker Hub、GitHub Container Registry、Google Container Registry、Kubernetes Registry 和 Quay.io 等多个镜像仓库提供加速访问。

## ⚠️ 重要风险警告

**请仔细阅读并理解以下风险警告：**

Cloudflare 于 2024 年 12 月 3 日更新了其[服务条款](https://www.cloudflare.com/terms/)，明确规定不得将其服务用作代理。根据条款第 2.2.1 项的限制，将 Cloudflare 服务用作代理可能被视为违反服务条款，存在账户被封禁的风险。

**本项目仅供学习和技术研究使用，请在了解相关风险后谨慎使用。如果您选择部署此项目，请在 24 小时内移除 Cloudflare 上的部署。**

## 项目特点

**单域名支持多仓库**：与其他需要为每个仓库配置不同域名的代理不同，本项目只需一个域名即可支持所有主流镜像仓库。

## 特性

- 🔗 单域名支持：一个域名支持所有主流镜像仓库
- 🌐 多仓库支持：支持 Docker Hub、ghcr.io、gcr.io、k8s.io、quay.io 等镜像仓库
- ⚡ 智能负载均衡：支持多个 Docker Hub 镜像源，同一镜像的所有请求使用一致的源
- 🔧 灵活配置：通过环境变量动态配置镜像源，支持多种格式
- 🚀 全球加速：通过 Cloudflare 全球边缘网络加速镜像拉取

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

## 🔧 高级配置

### 多镜像源负载均衡

本项目支持为所有镜像仓库配置多个镜像源，实现智能负载均衡。通过环境变量，您可以为每个仓库添加额外的镜像源。

#### 配置方式

在 `wrangler.jsonc` 中配置相应的环境变量：

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

#### 支持的环境变量

| 仓库                      | 环境变量          | 说明                |
| ------------------------- | ----------------- | ------------------- |
| Docker Hub                | `DOCKER_IO_PROXY` | Docker Hub 镜像源   |
| GitHub Container Registry | `GHCR_IO_PROXY`   | GitHub 容器镜像源   |
| Google Container Registry | `GCR_IO_PROXY`    | Google 容器镜像源   |
| Kubernetes Registry       | `K8S_IO_PROXY`    | Kubernetes 镜像源   |
| Quay.io                   | `QUAY_IO_PROXY`   | Red Hat Quay 镜像源 |

#### 支持的配置格式

1. **多个镜像源（逗号分隔）**：

   ```json
   {
     "vars": {
       "DOCKER_IO_PROXY": "docker.1ms.run,docker.xuanyuan.me,docker-0.unsee.tech"
     }
   }
   ```

2. **单个镜像源**：

   ```json
   {
     "vars": {
       "DOCKER_IO_PROXY": "docker.1ms.run"
     }
   }
   ```

#### 智能特性

- **一致性保证**：同一个 Docker 镜像的所有请求（认证、manifest、层文件）都会使用相同的镜像源
- **自动协议**：URL 不需要 `https://` 前缀，系统会自动添加
- **混合协议**：支持 HTTP 和 HTTPS 混用，如 `https://mirror1.com,http://internal-mirror,mirror2.com`
- **负载分散**：不同镜像会分散到不同的镜像源，实现负载均衡
- **故障切换**：如果某个镜像源不可用，可以快速切换到其他源

#### 工作原理

系统使用一致性哈希算法，根据镜像名称计算出固定的镜像源。例如：

- `nginx` 镜像的所有请求 → `docker.1ms.run`
- `redis` 镜像的所有请求 → `docker.xuanyuan.me`
- `mysql` 镜像的所有请求 → `docker-0.unsee.tech`

这确保了 Docker 镜像拉取过程中所有相关请求都使用相同的镜像源，避免了跨源请求导致的问题。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

感谢 [cloudflare-docker-proxy](https://github.com/ciiiii/cloudflare-docker-proxy) 项目，本项目参考了其代码实现。
