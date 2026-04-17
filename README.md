# Tetris Web Game

一个可正式上线的俄罗斯方块 Web 游戏，具备：
- 完整开始 / 进行中 / 暂停 / 结束 UI
- 标准落块、旋转、碰撞、锁定、消行、计分、等级加速
- 下一个方块预览、最高分、本局状态面板
- 键盘控制：左右移动、旋转、软降、硬降、暂停、重开
- Agentation 反馈入口，发送动作交给官方组件直连 webhook
- Railway 可部署的静态构建 + Express 启动器

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm start
```

默认 `npm start` 会读取 `PORT`，并用 Express 提供 `dist/` 与 `/health`。

## Agentation 环境变量

参考 `.env.example`：

- `VITE_AGENTATION_WEBHOOK_URL`

当前实现保留 `webhookUrl=https://api.consen.app/webhooks/agentation`，但会在浏览器端把 Agentation 官方事件 payload 规范化成 Consen `/webhooks/agentation` 兼容格式：顶层 `timestamp` 强制转成字符串，`submit` 事件使用顶层 `workspace_id / project_id / task_id / chat_id / site_id`，并把 `annotations` 简化为 `{ id, comment }` 数组。
