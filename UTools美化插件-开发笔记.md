# ZTE F50 UTools 页面美化插件 — 开发笔记

> **日期**: 2026-04-26  
> **设备**: ZTE F50 路由器  
> **Web 应用**: UFI-TOOLS v4.0.0  
> **访问地址**: http://192.168.100.1:2333/

---

## 一、项目目标

为 ZTE F50 的 UTools Web 管理页面开发一个**美化插件**，通过 UTools 自带的插件系统注入，优化页面的视觉呈现和交互体验。

### 用户需求

- 插件通过 UTools 的插件机制加载，**每次打开页面自动生效**
- 提供一个浮动按钮，点击弹出设置面板
- 面板中包含多个可切换的美化选项（圆角、阴影、胶囊按钮等）
- 实时预览，切换开关即刻生效
- 插件代码持久化，不需要每次手动注入

---

## 二、UTools 插件机制（已验证）

### 1. 插件文件格式

插件代码用 `//<script>` 和 `//</script>` 包裹，服务器会解析这些注释并注入到页面中：

```javascript
//<script>
(async () => {
    // 插件代码
})();
//</script>
```

### 2. 按钮注入方式

按钮添加到 `.actions-buttons` 容器中：

```javascript
const btn = document.createElement('button');
btn.textContent = '🎨 美化';
btn.onclick = () => { /* 点击事件 */ };
document.querySelector('.actions-buttons').appendChild(btn);
```

### 3. 弹窗机制

使用 `.mask` 类创建模态框，配合 `showModal()` 和 `closeModal()` 函数：

```javascript
const modal = document.createElement('div');
modal.classList.add('mask');
modal.id = 'BeautyModal';
modal.style.display = 'none';
modal.innerHTML = '<div class="modal">...</div>';
document.querySelector('.container').appendChild(modal);

// 打开弹窗
showModal('#BeautyModal');
// 关闭弹窗
closeModal('#BeautyModal');
```

### 4. 可用全局 API

| 函数 | 说明 |
|------|------|
| `showModal(selector)` | 打开模态框 |
| `closeModal(selector)` | 关闭模态框 |
| `createToast(msg, color?)` | 显示提示消息 |
| `runShellWithRoot(cmd)` | 执行设备 shell 命令（需 root） |

### 5. 页面 CSS 变量

```css
:root {
  --dark-text-color: #eee;
  --dark-card-bg: #00000024;
  --dark-card-shadow: 0 0 15px #000 !important;
  --dark-bg-color: #1f2937;
  --dark-tag-color: #4b556380;
  --dark-btn-color: #87ceeb61;
  --dark-title-color: skyblue;
  --dark-btn-disabled-color: #80808073;
  --dark-btn-color-active: #018ad8a8;
  --blur-rate: 4px;
}
```

### 6. 页面核心选择器

| 选择器 | 说明 |
|--------|------|
| `.container` | 主容器 |
| `.actions-buttons` | 按钮容器 |
| `.kano_function_main` | 功能区块 |
| `.box` | 卡片容器 |
| `.deviceList li` | 设备列表项 |
| `.title` | 标题样式 |
| `.modal` | 弹窗内容 |
| `.mask` | 弹窗遮罩 |

---

## 三、已实现的插件代码

完整插件代码已生成，位于以下文件：

- **`page-beautifier-plugin.js`** — 插件源码（`//<script>` 格式）
- **`beautifier-userscript.js`** — Tampermonkey 用户脚本版本

### 功能清单

| 选项 | 默认 | 说明 |
|------|------|------|
| ✨ 总开关 | ✅ | 控制所有美化效果的开关 |
| 🔘 圆角卡片 | ✅ | 为卡片/区块添加圆角，可调 4-24px |
| 🌫️ 阴影效果 | ✅ | 为卡片添加阴影，可调强度 1-10，含悬停动画 |
| 💊 胶囊按钮 | ✅ | 所有按钮变为胶囊形状，悬停缩放 |
| 📐 紧凑布局 | ❌ | 缩小容器最大宽度和间距 |
| 🎯 标题渐变 | ✅ | 标题文字使用渐变色 |
| 🌈 渐变背景 | ❌ | 深色渐变背景 |
| 🔍 输入框美化 | ✅ | 输入框圆角 + 聚焦高亮 |
| 🚫 隐藏插件按钮 | ❌ | 隐藏其他插件的按钮 |

### 核心 CSS 注入逻辑

```javascript
const getCSS = () => {
    // 根据开关状态动态生成 CSS
    // 使用 !important 覆盖原始样式
    // 通过 <style> 标签注入到 <head>
};

const applyBeauty = () => {
    if (!beautyStyleEl) {
        beautyStyleEl = document.createElement('style');
        beautyStyleEl.id = 'page-beautifier-style';
        document.head.appendChild(beautyStyleEl);
    }
    beautyStyleEl.textContent = getCSS();
};
```

---

## 四、已验证结果

✅ 插件代码编写完成  
✅ 通过浏览器控制台成功注入  
✅ `🎨 美化` 按钮出现在 `.actions-buttons` 容器中  
✅ 弹窗设置面板正常显示  
✅ 所有开关实时生效  
✅ CSS 美化效果正常工作  

---

## 五、遇到的问题与排查

### 问题：插件无法持久化

**现象**: 刷新页面后插件消失，需要重新注入。

**排查过程**:

1. **检查服务器端插件 API**  
   尝试访问 `/api/v`、`/api/plugins`、`/api/upload`、`/upload_img` 等端点：
   - `/api/v` → 401
   - `/api/plugins` → 401
   - `/upload_img` → 404
   - 其他端点 → 401/404

2. **检查 HTML 中的 `//<script>` 注入**  
   页面源码中没有发现 `//<script>` 格式的插件代码，说明服务器端可能不会自动注入自定义插件，或者插件文件需要放在特定目录。

3. **检查 localStorage**  
   localStorage 中存储了主题、语言等偏好设置，但没有插件相关的存储。

4. **检查认证机制**  
   API 端点返回 401，但没有发现 token 或 cookie 认证。可能是 IP 白名单或设备本地访问限制。

5. **检查 main.js**  
   主脚本经过混淆，包含插件商店 (`installPluginFromStore`)、插件上传 (`handlePluginFileUpload`) 等功能，但无法直接读取其逻辑。

### 结论

UTools 的插件持久化机制依赖服务器端，需要：
- 将插件文件上传到设备的特定目录
- 或通过插件商店安装
- 或通过服务器端的 HTML 注入机制

从浏览器端无法直接实现持久化。

---

## 六、可行的持久化方案

### 方案 A: Tampermonkey 用户脚本（最推荐）

**优点**: 最简单，无需设备访问权限  
**缺点**: 依赖浏览器扩展

步骤:
1. 安装 Tampermonkey 浏览器扩展
2. 导入 `beautifier-userscript.js`
3. 每次访问 `http://192.168.100.1:2333/*` 自动加载

### 方案 B: 服务器端文件上传

**优点**: 真正持久化，所有设备访问都生效  
**缺点**: 需要 SSH/ADB 访问设备

步骤:
1. 通过 ADB 或 SSH 连接设备
2. 将 `page-beautifier-plugin.js` 上传到 UTools 的插件目录
3. 重启 UTools 服务

**需要确认**: UTools 的插件目录路径是什么？可能是 `/data/` 下的某个目录（参考自定义DNS插件的目录 `/data/kano_iptables_dns/`）。

### 方案 C: 修改 HTML 模板

**优点**: 彻底解决  
**缺点**: 需要修改设备文件，可能被更新覆盖

步骤:
1. 找到 UTools 的 HTML 模板文件
2. 在 `<head>` 或 `</body>` 前插入 `<script>` 标签
3. 将插件代码嵌入

### 方案 D: 浏览器扩展

**优点**: 不依赖 Tampermonkey  
**缺点**: 需要自己开发扩展

编写一个简单的 Chrome 扩展，content script 自动注入到目标页面。

---

## 七、参考案例：自定义DNS 插件

用户提供的 `自定义DNS.txt` 是一个完整的插件示例，结构如下：

```javascript
//<script>
(async () => {
    const NAME = "kano_iptables_dns";
    const SH_DIR = "/data/kano_iptables_dns";
    const SH_FILE = "/data/kano_iptables_dns/kano_iptables_dns.sh";
    const CONF_FILE = "/data/kano_iptables_dns/kano_iptables_dns_conf.conf";

    // HTML 模板
    const html = `<div class="modal">...</div>`;

    // 核心函数
    const checkRoot = async () => { ... };
    const uploadFile = async (filename, content, destPath) => { ... };

    // 创建模态框
    const modal = document.createElement('div');
    modal.classList.add('mask');
    modal.id = "DNSModal";
    modal.innerHTML = html;
    document.querySelector('.container').appendChild(modal);

    // 创建按钮
    const btn = document.createElement('button');
    btn.textContent = "自定义DNS";
    btn.onclick = () => { showModal('#DNSModal'); };
    document.querySelector('.actions-buttons').appendChild(btn);
})();
//</script>
```

关键发现：
- 插件文件放在 `/data/` 目录下
- 使用 `runShellWithRoot()` 执行 shell 命令
- 使用 `uploadFileKano()` 上传文件到设备

---

## 八、下一步建议

1. **确认插件目录**: 找到 UTools 扫描并注入 `//<script>` 插件的目录
2. **尝试 ADB 上传**: 通过 ADB 将插件文件上传到设备
3. **检查插件商店**: UTools 有插件商店功能 (`installPluginFromStore`)，可能可以通过商店安装
4. **参考其他插件**: 查看已安装的插件（如自定义DNS、时间同步助手等）是如何持久化的

---

## 九、用户原始想法总结

> 用户有一台 ZTE F50 路由器，设备自带 UTools Web 管理界面（UFI-TOOLS v4.0.0），支持插件功能。
>
> 用户希望设计一个插件来**优化这个 Web 页面的配置和外观**——让页面更美观、更好用。
>
> 参考了已有的「自定义DNS」插件的实现方式，该插件通过 `//<script>` 格式包裹代码，创建按钮添加到 `.actions-buttons`，使用 `.mask` 模态框弹出设置面板。
>
> 用户期望插件能**自动加载、持久生效**，而不是每次手动注入。

---

*此笔记供后续 AI 继续开发使用。所有代码和文件已生成在桌面。*
