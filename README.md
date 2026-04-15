# Tetris Web Game

一个可正式上线的俄罗斯方块 Web 游戏，具备：
- 完整开始 / 进行中 / 暂停 / 结束 UI
- 标准落块、旋转、碰撞、锁定、消行、计分、等级加速
- 下一个方块预览、最高分、本局状态面板
- 键盘控制：左右移动、旋转、软降、硬降、暂停、重开
- Agentation 反馈入口，提交时直连 Consen Agentation webhook
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
- `VITE_CONSEN_PROJECT_ID`
- `VITE_CONSEN_TASK_ID`
- `VITE_CONSEN_CHAT_ID`
- `VITE_CONSEN_WORKSPACE_ID`

当前实现采用 `onSubmit` 手动 POST 到 Consen ingress，确保只在用户点击“Send Annotations”后发送反馈，而不是把每个 annotation 生命周期事件都直接推到 webhook。
