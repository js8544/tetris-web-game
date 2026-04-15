# PRD - 俄罗斯方块 Web 游戏完整交付

## 用户目标
交付一个可正式上线的俄罗斯方块 Web 游戏，具备完整 UI 与交互界面，代码进入 GitHub，部署到 Railway，内置 Agentation 反馈能力，并提供可用于 QA Playwright 截图验收的线上版本。

## 约束
- 不是 demo，必须完整可玩且视觉完成度达成交付水平。
- 必须包含完整 UI：首屏/开始态、主游戏区、侧栏信息、下一个方块预览、分数、等级、暂停态、结束态、重开入口、操作提示。
- 必须包含完整交互：开始、左右移动、旋转、软降、硬降、暂停/继续、重开、碰撞检测、锁定、消行计分、速度递增、结束判定。
- 需要部署到 Railway 并返回真实 URL。
- 需要 GitHub 仓库可核验代码。
- 必须接入 Agentation，反馈 webhook 使用 Consen Agentation 入口。
- QA 最终验收前至少要有 10 轮有效打回/修复往返，但这属于后续协作流程，不得伪造为已完成。

## 非目标
- 不做账号系统、排行榜、多人对战、触屏专门手势系统。
- 暂不做复杂音频引擎或后端分数持久化。

## 技术方案
- React + TypeScript + Vite
- 单页前端游戏逻辑
- Node/Express 提供静态资源与健康检查，方便 Railway 部署
- Playwright 用于本地截图验证

## 验收检查
1. `npm run build` 成功
2. 本地服务可打开并可开始一局俄罗斯方块
3. 页面存在完整 UI 模块与关键状态界面
4. 键盘控制、暂停、重开、分数/等级/预览工作正常
5. Agentation 在页面中挂载，指向 `https://api.consen.app/webhooks/agentation`
6. Git 仓库存在明确提交
7. 成功推送到 GitHub 远程仓库
8. Railway 部署成功且能访问
9. 产出至少一组 Playwright 截图证据

## 部署意图
部署到 Railway production 环境，返回 Railway 实际 URL，并保留可复现的构建/启动命令。
