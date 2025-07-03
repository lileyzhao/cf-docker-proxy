import { RegistryConfig } from './types'

/**
 * 注册表描述配置
 */
const REGISTRY_DESCRIPTIONS: Record<
  string,
  { description: string; descriptionZh: string }
> = {
  'docker.io': { description: 'Docker Hub', descriptionZh: 'Docker Hub' },
  'ghcr.io': {
    description: 'GitHub Registry',
    descriptionZh: 'GitHub 容器注册表',
  },
  'gcr.io': {
    description: 'Google Registry',
    descriptionZh: 'Google 容器注册表',
  },
  'quay.io': { description: 'Quay.io', descriptionZh: 'Quay.io' },
}

/**
 * 处理状态页面，显示代理信息和支持的注册表
 */
export function handleStatusPage(
  url: URL,
  env: Env,
  registries: Record<string, RegistryConfig>,
  defaultRegistry: string
): Response {
  // 获取是否默认中文设置，默认为 false (英文)
  const isDefaultChinese = env.DEFAULT_CHINESE === true
  const defaultLang = isDefaultChinese ? 'zh' : 'en'

  const registryRows = Object.entries(registries)
    .map(([key, config]) => {
      const isDefault = key === defaultRegistry
      const defaultBadge = isDefault
        ? `<span class="default-badge" data-en="Default" data-zh="默认">${
            isDefaultChinese ? '默认' : 'Default'
          }</span>`
        : ''
      return `
        <tr>
          <td class="registry-name">${key} ${defaultBadge}</td>
          <td class="registry-url">${config.url}</td>
        </tr>
      `
    })
    .join('')

  const examples = Object.entries(registries)
    .map(([key, config]) => {
      const isDefault = key === defaultRegistry
      const registryDesc = REGISTRY_DESCRIPTIONS[key] || {
        description: key,
        descriptionZh: key,
      }

      if (isDefault) {
        return [
          {
            command: `docker pull ${url.host}/${config.testImage}`,
            description: `${registryDesc.description} (Simplified)`,
            descriptionZh: `${registryDesc.descriptionZh} (简化用法)`,
          },
          {
            command: `docker pull ${url.host}/${key}/${config.testImage}`,
            description: `${registryDesc.description} (Full Path)`,
            descriptionZh: `${registryDesc.descriptionZh} (完整路径)`,
          },
        ]
      }
      return [
        {
          command: `docker pull ${url.host}/${key}/${config.testImage}`,
          description: registryDesc.description,
          descriptionZh: registryDesc.descriptionZh,
        },
      ]
    })
    .flat()

  const exampleRows = examples
    .map(
      ({ command, description, descriptionZh }) => `
      <div class="example-item">
        <code class="example-cmd">${command}</code>
        <span class="example-desc" data-en="# ${description}" data-zh="# ${descriptionZh}"># ${
          isDefaultChinese ? descriptionZh : description
        }</span>
      </div>
    `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="${defaultLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${
      isDefaultChinese ? 'Docker 镜像仓库代理' : 'Docker Registry Proxy'
    }</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --secondary-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            --success-gradient: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            --dark-bg: #0f172a;
            --card-bg: rgba(255, 255, 255, 0.98);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--primary-gradient);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: var(--text-primary);
            line-height: 1.5;
            overflow-x: hidden;
            font-size: 15px;
        }

        /* 动态背景动画 */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background:
                radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
            animation: float 20s ease-in-out infinite;
            z-index: -1;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(1deg); }
            66% { transform: translateY(10px) rotate(-1deg); }
        }

        .container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            position: relative;
        }

        .card {
            background: var(--card-bg);
            border-radius: 18px;
            box-shadow: var(--shadow-xl);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            padding: 28px 14px;
            max-width: 900px;
            width: 100%;
            margin: 12px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--secondary-gradient);
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .header {
            text-align: center;
            margin-bottom: 28px;
            position: relative;
        }

        .title {
            font-size: 2.1rem;
            font-weight: 700;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 32px;
            letter-spacing: -0.01em;
            position: relative;
            line-height: 1.1;
            white-space: nowrap;
        }

        .lang-switch {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 18px;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px;
            border-radius: 12px;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .lang-btn {
            padding: 7px 16px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            font-size: 0.92rem;
            position: relative;
            overflow: hidden;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 80px;
        }

        .lang-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: var(--secondary-gradient);
            transition: left 0.3s ease;
            z-index: -1;
        }

        .lang-btn:hover::before {
            left: 0;
        }

        .lang-btn:hover {
            color: white;
            transform: translateY(-1px);
        }

        .lang-btn.active {
            background: var(--secondary-gradient);
            color: white;
            box-shadow: var(--shadow-md);
        }

        .status {
            background: var(--success-gradient);
            color: white;
            padding: 12px 18px;
            border-radius: 12px;
            text-align: center;
            font-weight: 700;
            margin-bottom: 22px;
            font-size: 1rem;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }

        .status::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        .section {
            margin-bottom: 18px;
            animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .section-title {
            font-size: 1.15rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
        }

        .section-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: var(--secondary-gradient);
            border-radius: 2px;
        }

        .icon {
            font-size: 1.5rem;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .registry-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 24px;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--shadow-lg);
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .registry-table th,
        .registry-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .registry-table th {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            font-weight: 700;
            color: var(--text-primary);
            font-size: 0.92rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .registry-table tr:last-child td {
            border-bottom: none;
        }

        .registry-table tr:hover {
            background: rgba(102, 126, 234, 0.02);
        }

        .registry-name {
            font-weight: 700;
            color: var(--text-primary);
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .default-badge {
            background: var(--success-gradient);
            color: white;
            padding: 3px 8px;
            border-radius: 16px;
            font-size: 0.75rem;
            font-weight: 600;
            box-shadow: var(--shadow-sm);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .registry-url {
            font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
            font-size: 0.88rem;
            color: var(--text-secondary);
            background: rgba(0, 0, 0, 0.02);
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .examples {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: #e2e8f0;
            padding: 14px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
            box-shadow: var(--shadow-xl);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }

        .examples::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        }

        .example-item {
            margin-bottom: 8px;
            line-height: 1.5;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.3s ease;
        }

        .example-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .example-item:hover {
            background: rgba(255, 255, 255, 0.05);
            margin-left: -8px;
            margin-right: -8px;
            padding-left: 8px;
            padding-right: 8px;
            border-radius: 8px;
        }

        .example-cmd {
            color: #7dd3fc;
            font-weight: 600;
            display: block;
            margin-bottom: 2px;
            font-size: 0.92em;
            cursor: pointer;
            user-select: all;
            position: relative;
        }

        .example-cmd::after {
            content: '点击复制';
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            white-space: nowrap;
        }

        .example-cmd:hover::after {
            opacity: 1;
        }

        .example-desc {
            color: #94a3b8;
            font-size: 0.85rem;
            font-style: italic;
        }

        .footer {
            text-align: center;
            padding: 16px 8px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(255, 255, 255, 0.18);
            margin-top: auto;
            position: relative;
        }

        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        }

        .footer p {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin: 0;
        }

        .footer .footer-text {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 0.92rem;
        }

        .footer a {
            color: #7dd3fc;
            text-decoration: none;
            font-weight: 700;
            font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            padding: 6px 10px;
            background: rgba(125, 211, 252, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(125, 211, 252, 0.25);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .footer a::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.2), transparent);
            transition: left 0.3s ease;
        }

        .footer a:hover::before {
            left: 100%;
        }

        .footer a:hover {
            background: rgba(125, 211, 252, 0.2);
            border-color: rgba(125, 211, 252, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(125, 211, 252, 0.3);
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .container { padding: 4px; }
            .card { margin: 8px; border-radius: 12px; }
            .title {
                font-size: 1.875rem;
                line-height: 1.05;
                white-space: nowrap;
                margin-bottom: 24px;
            }
            .lang-switch { gap: 6px; padding: 4px; }
            .lang-btn {
                font-size: 0.9rem;
                padding: 6px 12px;
                height: 32px;
                min-width: 60px;
            }
            .section-title {
                font-size: 1rem;
                gap: 6px;
                margin-bottom: 6px;
            }
            .section-title::before {
                width: 4px;
                height: 20px;
            }
            .registry-table {
                font-size: 0.85rem;
                border-radius: 8px;
                width: 100%;
            }
            .registry-table th,
            .registry-table td { padding: 7px 4px; }
            .registry-name {
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                font-size: 0.92rem;
            }
            .registry-url {
                font-size: 0.8rem;
                word-break: break-all;
                padding: 2px 4px;
            }
            .examples { padding: 6px; border-radius: 6px; }
            .example-item { padding: 3px 0; margin-bottom: 4px; }
            .footer { padding: 8px 2px; }
            .footer p { flex-direction: column; gap: 4px; }
            .footer a {
                width: 100%;
                text-align: center;
                font-size: 0.8rem;
                padding: 4px 0;
            }
        }

        @media (max-width: 480px) {
            .title { font-size: 1.625rem; }
            .card { padding: 14px 7px; margin: 4px; }
            .registry-table {
                width: 100%;
                font-size: 0.8rem;
            }
            .registry-table th,
            .registry-table td {
                padding: 6px 4px;
                word-break: break-word;
            }
            .lang-switch { gap: 4px; padding: 3px; }
            .lang-btn {
                font-size: 0.85rem;
                padding: 5px 8px;
                min-width: 50px;
                height: 28px;
            }
        }

        /* 深色模式支持 */
        @media (prefers-color-scheme: dark) {
            :root {
                --card-bg: rgba(15, 23, 42, 0.95);
                --text-primary: #f1f5f9;
                --text-secondary: #cbd5e1;
                --text-muted: #64748b;
                --border-color: rgba(255, 255, 255, 0.1);
            }
            .registry-table {
                background: rgba(30, 41, 59, 0.8);
                border-color: rgba(255, 255, 255, 0.1);
            }
            .registry-table th {
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                color: #f1f5f9;
            }
            .registry-table tr:hover {
                background: rgba(102, 126, 234, 0.1);
            }
            .registry-url {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(255, 255, 255, 0.1);
            }
        }

        /* 动画和工具类 */
        .loading {
            opacity: 0;
            animation: fadeIn 0.5s ease-out forwards;
        }

        @keyframes fadeIn { to { opacity: 1; } }

        /* 滚动条美化 */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--secondary-gradient);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        /* 复制功能动画 */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card loading">
            <div class="header">
                <h1 class="title" data-en="🐳 Docker Registry Proxy" data-zh="🐳 Docker 镜像仓库代理">${
                  isDefaultChinese
                    ? '🐳 Docker 镜像仓库代理'
                    : '🐳 Docker Registry Proxy'
                }</h1>
                <div class="lang-switch">
                    <button class="lang-btn ${
                      !isDefaultChinese ? 'active' : ''
                    }" onclick="switchLang('en', this)">English</button>
                    <button class="lang-btn ${
                      isDefaultChinese ? 'active' : ''
                    }" onclick="switchLang('zh', this)">简体中文</button>
                </div>
                <div class="status">
                    <span data-en="🚀 Proxy is running normally" data-zh="🚀 代理正常运行">${
                      isDefaultChinese
                        ? '🚀 代理正常运行'
                        : '🚀 Proxy is running normally'
                    }</span>
                </div>
            </div>

            <div class="section" style="animation-delay: 0.1s;">
                <h2 class="section-title">
                    <span class="icon">📋</span>
                    <span data-en="Supported Registries" data-zh="支持的注册表">${
                      isDefaultChinese ? '支持的注册表' : 'Supported Registries'
                    }</span>
                </h2>
                <table class="registry-table">
                    <thead>
                        <tr>
                            <th data-en="Registry" data-zh="注册表">${
                              isDefaultChinese ? '注册表' : 'Registry'
                            }</th>
                            <th data-en="Target URL" data-zh="目标地址">${
                              isDefaultChinese ? '目标地址' : 'Target URL'
                            }</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${registryRows}
                    </tbody>
                </table>
            </div>

            <div class="section" style="animation-delay: 0.2s;">
                <h2 class="section-title">
                    <span class="icon">💡</span>
                    <span data-en="Usage Examples" data-zh="使用示例">${
                      isDefaultChinese ? '使用示例' : 'Usage Examples'
                    }</span>
                </h2>
                <div class="examples">
                    ${exampleRows}
                </div>
            </div>

            <div class="section" style="animation-delay: 0.3s;">
                <p style="color: var(--text-secondary); text-align: center; font-size: 0.95rem;">
                    <span data-en="📖 Compatible with Docker Registry HTTP API V2" data-zh="📖 兼容 Docker Registry HTTP API V2">${
                      isDefaultChinese
                        ? '📖 兼容 Docker Registry HTTP API V2'
                        : '📖 Compatible with Docker Registry HTTP API V2'
                    }</span>
                </p>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>
            <span class="footer-text" data-en="🌟 Powered by" data-zh="🌟 项目地址">${
              isDefaultChinese ? '🌟 项目地址' : '🌟 Powered by'
            }</span>
            <a href="https://github.com/lileyzhao/cf-docker-proxy" target="_blank">https://github.com/lileyzhao/cf-docker-proxy</a>
        </p>
    </div>

    <script>
        // 页面初始化
        document.addEventListener('DOMContentLoaded', function() {
            const card = document.querySelector('.card');
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100);
            }

            // 添加动画延迟
            document.querySelectorAll('.registry-table tbody tr').forEach((row, index) => {
                row.style.animationDelay = \`\${0.4 + index * 0.1}s\`;
                row.classList.add('loading');
            });

            document.querySelectorAll('.example-item').forEach((item, index) => {
                item.style.animationDelay = \`\${0.6 + index * 0.1}s\`;
                item.classList.add('loading');
            });
        });

        // 语言切换
        function switchLang(lang, btn) {
            const card = document.querySelector('.card');
            card.style.transform = 'scale(0.98)';
            card.style.opacity = '0.8';

            setTimeout(() => {
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('[data-en][data-zh]').forEach(element => {
                    element.textContent = element.getAttribute(lang === 'zh' ? 'data-zh' : 'data-en');
                });

                document.title = lang === 'zh' ? 'Docker 镜像仓库代理' : 'Docker Registry Proxy';
                document.documentElement.lang = lang;

                card.style.transform = 'scale(1)';
                card.style.opacity = '1';
            }, 150);
        }

        // 复制功能
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                const tooltip = document.createElement('div');
                tooltip.textContent = '已复制到剪贴板';
                tooltip.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--success-gradient);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    z-index: 1000;
                    animation: slideIn 0.3s ease-out;
                \`;
                document.body.appendChild(tooltip);

                setTimeout(() => {
                    tooltip.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => tooltip.remove(), 300);
                }, 2000);
            });
        }

        // 点击复制事件
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('example-cmd')) {
                copyToClipboard(e.target.textContent);
            }
        });
    </script>
</body>
</html>
  `

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
