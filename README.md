# TenDispatch · OpenTenBase 数据调度中心

TenDispatch 是一个 90 秒快节奏数据调度竞技小游戏。玩家在 OpenTenBase 数据物流中心中连续处理 14 波数据，让三个 DN 的负载、查询效率和跨节点资源成本保持在可控区间，并通过 Combo 冲击本机排行榜。

## 当前玩法

- 新手教学：约 45～60 秒，拆成 7 个短教学节点，依次认识 CN / DN、Shard / Replication、查询路径、如何阅读“查询 / 搬运 / 成本”、训练波次、结果反馈和 Ranked 冲榜规则；允许无限重试，不参与排行榜。
- Ranked 极速调度：固定 90 秒、14 波、同一 Daily Seed；波次之间保留 DN 负载、复制状态、资源占用和部分查询压力。
- Ranked 背后维护一组可扩展波次库，每局按 Daily Seed 无放回抽取 3 个入门波、8 个中段波和 3 个 Final Rush 波；所有玩家面对相同种子时抽到相同顺序，不同种子会遇到不同任务组合。
- 每波有 4 秒基础决策窗口。超时不会 Game Over，系统会使用该波默认策略维持模拟线路，但玩家未确认决策，因此该波总分为 0。
- 每波基础满分 100：节点负载均衡 40、查询效率 30、资源/复制成本 20、决策速度 10。
- PERFECT / GOOD 会建立 Combo；倍率按连续优秀波次提升至 ×1.50，POOR 会清零。
- 每局有预测 ×2 和撤回 ×1：预测会把该波最高评级封顶为 GOOD；撤回扣 50 分并清零 Combo。
- Wave 12～14 是 Final Rush，只提高决策密度，不增加新规则；GTM 在场景中自动完成事务协调动画。
- 结算页展示本局分、个人最佳、本机排名、距 TOP 10、PERFECT 数量、最大 Combo 和最多失分波次。

当前仓库使用 `LocalRepository` 保存本机记录；没有伪造线上玩家或全球榜数据。`ApiRepository` 保留为未来接入真实排行榜的边界。

## 开发与验证

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm test
```

引擎入口：

- `src/config/rankedWaves.ts`：波次库、难度配额、Daily Seed 抽取器、候选策略和 Final Rush 标记。
- `src/game/GameState.ts`：Ranked 持续状态、Combo、辅助次数和波次结果模型。
- `src/game/GameEngine.ts`：4 秒窗口、状态继承、预测、撤回、波次评分和结算流。
- `src/game/ScoreEngine.ts`：四项波次得分、基础总分和可解释的下一局提升建议。
- `src/pages/Game/GamePage.tsx`：教学与 Ranked 调度界面、实时指标和预测面板。
- `src/services/`：本机记录、Daily Seed 榜单和未来 API 接入边界。

## 视觉与交互约束

游戏主场景以 1920×1080 逻辑画布等比缩放，CN、三个 DN 和 GTM 保持 OpenTenBase 架构语义。所有关键状态同时通过文字和数值表达，支持键盘焦点与 `prefers-reduced-motion`。

## 内容依据与参与开源

- [OpenTenBase 官方快速入门：CN、DN、GTM 架构](https://www.opentenbase.org/blog/01-quickstart/)
- [OpenTenBase 官方基本使用：分片表与复制表](https://docs.opentenbase.org/guide/03-basic-use/)
- [OpenTenBase 开源仓库](https://github.com/OpenTenBase/OpenTenBase)

制作方：电子科技大学成都学院开放原子开源社团。
