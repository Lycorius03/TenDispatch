# TenDispatch

> OpenTenBase 数据调度中心

TenDispatch 是一款面向零基础参与者的 Web 互动科普小游戏。它把 OpenTenBase 分布式架构抽象成一座未来数据物流中心：数据先进入协调节点 CN，再由玩家配置策略，沿运输轨道进入三个数据节点 DN。

玩家无需阅读 SQL 或代码。游戏遵循“看到现象 → 做出操作 → 看到结果 → NPC 解释原因 → 给出专业名称”的顺序，让数据倾斜、查询路径、复制表和 GTM 事务协调成为可见的系统行为。

## 完整体验

- 场内新手引导：认识 CN 与 DN，并启动第一条基础调度链路
- 数据分片：通过三种分配依据观察均衡分布或数据倾斜，并允许重新配置
- 查询调度：比较单节点命中与多节点查询的路径和搬运成本
- Replication：先处理小型高频公共数据，再观察复制海量日志的资源代价
- GTM 事件：用一次同步波纹认识全局事务协调
- FINAL DISPATCH：在峰值负载下组合已有机制，生成 STABLE / HIGH LOAD / OVERLOAD 结果
- 调度报告：按五个维度计算 100 分制得分、称号和动态评价
- 本地排行榜：按总分、提示次数、完成时间排序

所有过程事件和成绩均通过 Repository 保存。当前默认实现为 `LocalRepository`（浏览器 `localStorage`），`ApiRepository` 只保留未来 HTTP API 接入边界，静态版本不依赖后端。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`。Vite 使用相对 base path，可直接部署到 GitHub Pages 的仓库子路径。

## 项目结构

```text
src/
├── game/          # GameState、GameEngine、ScoreEngine、EventTracker
├── scenarios/     # 可配置场景说明（后续内容扩展入口）
├── components/    # CN、DN、GTM、轨道、NPC 与状态组件
├── pages/         # 首页、游戏、报告、排行榜
├── services/      # Repository 接口、本地实现、API 预留实现
└── config/        # 场景结果、评分、NPC 文案
```

## 替换社团头像

当前 NPC 使用 `image/科成-开放原子开源社团.png` 正式资源，并通过 `src/config/npcConfig.ts` 配置。头像以 `object-fit: contain` 完整显示，不裁切原图。

## 制作方

电子科技大学成都学院开放原子开源社团 · OpenTenBase 活动互动项目

OpenTenBase 资料：[官方网站](https://www.opentenbase.org/) · [文档](https://docs.opentenbase.org/) · [GitHub](https://github.com/OpenTenBase/OpenTenBase)
