# 专注循环 · Timely Reminder

> 极简专注循环计时器 — Chrome 扩展

## 功能

- **工作/休息交替** — 专注一段时间后自动进入休息，循环往复
- **自定义时长** — 工作和休息时长均可自由调节（1–180 分钟）
- **循环控制** — 支持有限循环（指定轮数）和无限循环
- **页面 Toast** — 到时间后当前页面弹出通知，带有倒计时和进度条
- **系统通知** — 支持浏览器系统通知 + 按钮操作（「我知道了」/「稍后 5 分钟」）
- **声音提醒** — 可选的提示音
- **持久化** — 关闭弹出窗后计时继续，再次打开可看到进度

## 安装

1. 打开 Chrome，进入 `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择本项目目录

## 使用

1. 点击扩展图标打开弹出窗
2. 点击 **+** 新建专注循环
3. 设置工作时长、休息时长、循环次数
4. 点击 **开始专注**
5. 到时间后浏览器会弹出通知，当前页面会显示 Toast 提醒

## 技术

- Manifest V3
- Service Worker (background.js)
- Content Script (content.js) — 页面内 Toast 通知
- Chrome Alarms API — 计时核心
- Chrome Notifications API — 系统通知
- Chrome Storage API — 数据持久化

## 项目结构

```
timely-reminder/
├── manifest.json        # 扩展配置
├── background.js        # 后台 Service Worker（计时、通知）
├── content.js           # 页面内 Toast 渲染
├── popup.html           # 弹出窗口
├── popup.js             # 弹出窗口逻辑
├── styles.css           # 弹出窗口样式
├── icon16.png
├── icon48.png
└── icon128.png
```
