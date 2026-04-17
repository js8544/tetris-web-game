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

当前实现已经移除前端手写 webhook 提交与硬编码 Consen ID，改为把 `webhookUrl` 直接交给官方 `Agentation` 组件处理。页面里的状态文案只提示“已触发官方提交”，不再伪造 webhook 成功/失败结果。
