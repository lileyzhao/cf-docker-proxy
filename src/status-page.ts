import { RegistryConfig } from './types'

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

  const examples = Object.entries(registries).map(([key, config]) => {
    const isDefault = key === defaultRegistry
    const command = isDefault
      ? `docker pull ${url.host}/${config.testImage}`
      : `docker pull ${url.host}/${key}/${config.testImage}`

    const registryDescriptions: Record<
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

    return {
      command,
      description: registryDescriptions[key].description,
      descriptionZh: registryDescriptions[key].descriptionZh,
    }
  })

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
    <title>Docker Registry Proxy</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: #333;
        }

        .container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            max-width: 980px;
            width: 100%;
            margin: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 20px;
        }

        .lang-switch {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 20px;
        }

        .lang-btn {
            padding: 8px 16px;
            border: 2px solid #667eea;
            background: transparent;
            color: #667eea;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .lang-btn.active {
            background: #667eea;
            color: white;
        }

        .status {
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            color: white;
            padding: 15px 25px;
            border-radius: 15px;
            text-align: center;
            font-weight: 600;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .icon {
            font-size: 1.3rem;
        }

        .registry-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .registry-table th,
        .registry-table td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }

        .registry-table th {
            background: #f8f9ff;
            font-weight: 600;
            color: #555;
        }

        .registry-name {
            font-weight: 600;
            color: #667eea;
        }

        .default-badge {
            background: #4ade80;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-left: 8px;
        }

        .registry-url {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            color: #666;
        }


        .examples {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 12px;
            font-family: 'Monaco', 'Menlo', monospace;
        }

        .example-item {
            margin-bottom: 12px;
            line-height: 1.6;
        }

        .example-cmd {
            color: #7dd3fc;
        }

        .example-desc {
            color: #94a3b8;
            margin-left: 20px;
        }

        .footer {
            text-align: center;
            padding: 25px 20px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            margin-top: auto;
        }

        .footer p {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
            margin: 0;
        }

        .footer .footer-text {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            font-size: 0.95rem;
        }

        .footer a {
            color: #7dd3fc;
            text-decoration: none;
            font-weight: 600;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            padding: 6px 12px;
            background: rgba(125, 211, 252, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(125, 211, 252, 0.3);
            transition: all 0.3s ease;
        }

        .footer a:hover {
            background: rgba(125, 211, 252, 0.2);
            border-color: rgba(125, 211, 252, 0.5);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(125, 211, 252, 0.2);
        }

        @media (max-width: 768px) {
            .card {
                padding: 20px;
                margin: 10px;
            }

            .title {
                font-size: 2rem;
            }

            .registry-table {
                font-size: 0.9rem;
            }

            .registry-table th,
            .registry-table td {
                padding: 12px 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1 class="title" data-en="🐳 Docker Registry Proxy" data-zh="🐳 Docker 镜像仓库代理">${
                  isDefaultChinese
                    ? '🐳 Docker 镜像仓库代理'
                    : '🐳 Docker Registry Proxy'
                }</h1>
                <div class="lang-switch">
                    <button class="lang-btn ${
                      !isDefaultChinese ? 'active' : ''
                    }" onclick="switchLang('en')">English</button>
                    <button class="lang-btn ${
                      isDefaultChinese ? 'active' : ''
                    }" onclick="switchLang('zh')">简体中文</button>
                </div>
                <div class="status">
                    <span data-en="🚀 Proxy is running normally" data-zh="🚀 代理正常运行">${
                      isDefaultChinese
                        ? '🚀 代理正常运行'
                        : '🚀 Proxy is running normally'
                    }</span>
                </div>
            </div>

            <div class="section">
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

            <div class="section">
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

            <div class="section">
                <p style="color: #666; text-align: center;">
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
        function switchLang(lang) {
            document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            document.querySelectorAll('[data-en][data-zh]').forEach(element => {
                if (lang === 'zh') {
                    element.textContent = element.getAttribute('data-zh');
                } else {
                    element.textContent = element.getAttribute('data-en');
                }
            });

            document.documentElement.lang = lang;
        }
    </script>
</body>
</html>
  `

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
