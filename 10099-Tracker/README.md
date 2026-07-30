# 10099 Tracker 本地服务

这是 [BiancoCat/10099-Tracker](https://github.com/BiancoCat/10099-Tracker) 核心查询流程的本地集成版，用于给本仓库的“运营商信息”插件提供中国广电官方流量数据。上游项目采用 MIT License，本目录保留了 [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt)。

## 它如何工作

中国广电小程序查询请求包含短期有效的 `Session`、`Access` 和加密 `data`。服务在本机保存这些字段，启动后自动查询并向浏览器提供缓存结果：

```text
运营商信息插件 -> 本机 /traffic -> wx.10099.com.cn/qryUserRes
```

首次授权后，服务默认每 15 分钟刷新一次，并将最近成功的非敏感结果写入 `data/traffic_cache.json`。登录态失效或官方接口临时不可达时，`/traffic` 会继续返回最近成功结果，并标记 `stale: true`。

它不能凭手机号和密码自动登录，也不能免授权生成小程序的动态加密参数。因此首次使用和登录态失效时仍需要从小程序复制一次 cURL；之后的日常查询、缓存和刷新都是自动的。敏感字段不会写入插件或提交到 Git。

服务还为 WebOS 关于页提供公开只读的仓库版本代理。当浏览器拦截 GitHub API 时，WebOS 会自动请求 `/project-version`；该接口只读取公开仓库元数据，不读取抓包配置和管理令牌。结果默认缓存 10 分钟；`force=1` 可强制刷新，GitHub 临时不可达时会返回最后一次成功结果并标记 `stale: true`。

## 方式一：macOS 原生运行

没有安装 Docker 时，直接运行最省事：

```bash
cd /Users/lcean/Documents/F50/10099-Tracker
chmod +x run-native.sh
./run-native.sh
```

首次启动会创建 `.venv`、安装 `requests`，并生成：

- `data/admin_token`：配置页管理令牌
- `data/config.json`：小程序请求配置

保持终端窗口运行，然后打开 [http://127.0.0.1:8000/](http://127.0.0.1:8000/)。

## 方式二：Docker Compose

先安装并启动 Docker Desktop，然后在本目录执行：

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f traffic-api
```

配置页仍是 [http://127.0.0.1:8000/](http://127.0.0.1:8000/)。停止服务：

```bash
docker compose down
```

端口被占用时，在 `.env` 中修改 `APP_PORT`，例如 `18000`。

## 获取并保存小程序请求

1. 在微信中登录中国广电相关小程序并进入流量查询。
2. 使用 Reqable、Charles 或 Fiddler 抓取 HTTPS 请求。
3. 触发一次流量查询，定位：

   ```text
   https://wx.10099.com.cn/contact-web/api/busi/qryUserRes
   ```

4. 将该请求复制为 cURL。
5. 打开本地配置页，输入 `data/admin_token` 中的管理令牌。
6. 粘贴完整 cURL，点击“解析并保存”。服务会立即启动自动查询，不需要逐次手工执行。

不要把 cURL、`config.json` 或管理令牌发到聊天、Issue 或 Git 仓库。

## 连接运营商信息插件

插件会自动尝试已保存的服务地址、`127.0.0.1:8000` 与当前 F50 局域网的 Mac 服务，并自动选择直连或 UFI-TOOLS `/api/proxy/--` 转发，无需在插件界面手工填写 URL。服务的标准接口仍为：

```text
http://127.0.0.1:8000/traffic?details=1
```

如果从手机或另一台电脑打开 UFI-TOOLS，则服务需要以 `0.0.0.0` 监听，并把 `127.0.0.1` 换成这台 Mac 的局域网 IP；若 macOS 防火墙拦截 Python，请允许该程序接收入站连接。

可用接口：

| 地址 | 用途 |
| --- | --- |
| `/health` | 服务、自动查询、缓存与授权状态 |
| `/project-version` | WebOS 版本和 GitHub Stars 的只读缓存代理 |
| `/traffic` | 总流量、已用和剩余流量，默认读取自动缓存 |
| `/traffic?details=1` | 加上流量资源明细 |
| `/traffic?details=1&refresh=1` | 立即刷新官方接口 |
| `/api/config` | 脱敏配置状态，需要 `X-Admin-Token` |
| `/api/extract-curl` | 保存 cURL，需要 `X-Admin-Token` |

## 验证

```bash
cd /Users/lcean/Documents/F50/10099-Tracker
python3 -m unittest -v
```

没有有效授权配置和历史缓存时，`/traffic` 返回 `config_error`；这表示代理服务已工作，只是还没有可用于官方接口的动态登录态。
