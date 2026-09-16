import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DecisionDataGuide, GamePage, getDecisionElapsedMs, shuffleOptions } from '../src/pages/Game/GamePage.tsx'
import { HomePage } from '../src/pages/Home/HomePage.tsx'
import { createInitialState, createRankedState, createTutorialState } from '../src/game/GameState.ts'
import { getRankedWave } from '../src/config/rankedWaves.ts'
globalThis.innerWidth=1920
globalThis.innerHeight=1080
globalThis.matchMedia=()=>({matches:false})
const initial=createInitialState()
const props={state:initial}
for(const name of ['onTutorial','onSharding','onShardingContinue','onQuery','onQueryContinue','onSmallReplication','onSmallContinue','onLargeReplication','onLargeContinue','onGtm','onFinalChoice','onFinal','onReport','onHint']) props[name]=()=>{}
const phases=['tutorial','sharding','sharding-result','query','query-result','replication-small','replication-small-result','replication-large','replication-large-result','gtm','final','final-result']
for(const phase of phases) {
 const html=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...initial,phase,screen:'game',dnLoads:[96,60,30]}}))
 assert.ok(html.includes('OpenTenBase'))
 assert.ok(html.includes('DATA SKEW DETECTED'))
 const controls=html.split('class="dispatch-controls"')[1].split('class="npc-dock"')[0]
 assert.ok((controls.match(/<button/g)||[]).length<=4,phase)
 assert.equal((html.match(/class="dn-title"/g)||[]).length,3)
}
for(const [width,height,scale] of [[1920,1080,1],[1440,810,.75]]) {
 globalThis.innerWidth=width; globalThis.innerHeight=height
 const html=renderToStaticMarkup(React.createElement(GamePage,props))
 assert.ok(html.includes(`--stage-scale:${scale}`))
}
const home=renderToStaticMarkup(React.createElement(HomePage,{previewState:initial,onStart:()=>{},onRanking:()=>{}}))
assert.ok(home.includes('required=""'))
assert.ok(home.includes('高级'))
assert.ok(!home.includes('死亡'))
assert.ok(!home.includes('自定义'))
assert.ok(home.includes('教程不计分'))
assert.ok(home.includes('随机呼号'))
const tutorial=renderToStaticMarkup(React.createElement(GamePage,{...props,state:createTutorialState()}))
assert.ok(tutorial.includes('欢迎来到 TenDispatch'))
assert.ok(tutorial.includes('开始第一步：认识工作台'))
assert.ok(tutorial.includes('教学关'))
assert.ok(tutorial.includes('数据物流中心的首席调度官'))
assert.ok(tutorial.includes('3 波不限时训练'))
assert.ok(!tutorial.includes('NPC 会先讲操作'))
const tutorialWave=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:5}}))
assert.ok(tutorialWave.includes('TRAINING WAVE 1 / 3'))
assert.ok(tutorialWave.includes('用户活动记录进入'))
assert.ok(tutorialWave.includes('① 高频访问'))
assert.ok(tutorialWave.includes('② 数据分布'))
assert.ok(tutorialWave.includes('③ 当前负载'))
assert.ok(!tutorialWave.includes('查询：1 / 2 / 3 DN'))
assert.ok(!tutorialWave.includes('死亡条件'))
const tutorialWave2=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:7,tutorialWaveIndex:1}}))
assert.ok(tutorialWave2.includes('公共院系目录上线'))
const tutorialWave3=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:9,tutorialWaveIndex:2}}))
assert.ok(tutorialWave3.includes('海量业务日志进入'))
const tutorialRouting=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:3}}))
assert.ok(tutorialRouting.includes('TRAINING WAVE 1 / 3'))
assert.ok(tutorialRouting.includes('高频访问：'))
assert.ok(tutorialRouting.includes('教学提示'))
assert.ok(tutorialRouting.includes('点击画面空白处继续'))
assert.ok(!tutorialRouting.includes('>下一步 →</button>'))
assert.ok(!tutorialRouting.includes('先看懂任务卡上的两条线索'))
assert.ok(!tutorialRouting.includes('先猜它最怕绕路'))
const tutorialIntro=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:1,cargoMode:'write'}}))
assert.ok(tutorialIntro.includes('数据沿固定轨道进入协调节点'))
assert.ok(tutorialIntro.includes('animateMotion'))
const tutorialReady=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep:11,tutorialWaveCompleted:true}}))
assert.ok(tutorialReady.includes('正式模式还会发生什么'))
assert.ok(tutorialReady.includes('未确认直接记 0 分'))
assert.ok(tutorialReady.includes('每波 20 秒'))
assert.ok(!tutorialReady.includes('死亡条件'))
for (let tutorialStep = 1; tutorialStep <= 11; tutorialStep += 1) {
 const tutorialWaveIndex = tutorialStep >= 9 ? 2 : tutorialStep >= 7 ? 1 : 0
 const html=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createTutorialState(),screen:'game',tutorialStep,tutorialWaveIndex,tutorialWaveCompleted:[6,8,10].includes(tutorialStep),tutorialStrategy:tutorialWaveIndex===1?'replicated':tutorialWaveIndex===2?'time':'id'}}))
 assert.ok(!html.includes('死亡条件'),`tutorial step ${tutorialStep}`)
}
const dead=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createRankedState('TD-SSR-DEATH'),screen:'game',phase:'ranked-dead',waveIndex:7,dnLoads:[100,88,86],deathReason:'DN-01 负载已满（100%）。极速模式规则：任一节点达到 100% 立即结束本局。'}}))
assert.ok(dead.includes('节点负载已满，调度中止'))
assert.ok(dead.includes('DEAD AT WAVE'))
assert.ok(dead.includes('返回模式选择'))
const rankedChoice=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createRankedState('TD-CARD-AUDIT'),screen:'game',dnLoads:[99,99,99]}}))
const rankedOptionCards=rankedChoice.split('class="ranked-options"')[1].split('class="modern-action-row"')[0]
assert.ok(!rankedOptionCards.includes('is-fatal'))
assert.ok(!rankedOptionCards.includes('死亡'))
assert.notEqual(rankedOptionCards.match(/<strong>([^<]+)<\/strong>/)?.[1],getRankedWave(0,'TD-CARD-AUDIT').options[0].label)
const decisionGuide=renderToStaticMarkup(React.createElement(DecisionDataGuide,{wave:getRankedWave(0,'TD-CARD-AUDIT'),loads:[41,63,52]}))
assert.ok(decisionGuide.includes('本题计时已暂停'))
assert.ok(decisionGuide.includes('① 高频访问'))
assert.ok(decisionGuide.includes('② 数据分布'))
assert.ok(decisionGuide.includes('③ 图上当前负载'))
assert.ok(decisionGuide.includes('DN-1 41% · DN-2 63% · DN-3 52%'))
assert.ok(!decisionGuide.includes('查询 1 DN'))
assert.ok(!decisionGuide.includes('搬运 10%'))
assert.ok(!decisionGuide.includes('成本 9'))
const visiblyShuffled = shuffleOptions(['best', 'second', 'third'], () => 0.999)
assert.notDeepEqual(visiblyShuffled, ['best', 'second', 'third'])
assert.notEqual(visiblyShuffled[0], 'best')
assert.equal(getDecisionElapsedMs(1000,11000,0,3500),2500)
assert.equal(getDecisionElapsedMs(1000,11000,7500,null),2500)
const rankedResult=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...createRankedState('TD-WAIT'),screen:'game',phase:'ranked-result',waveIndex:0}}))
assert.ok(rankedResult.includes('下一波将在 3s 到达'))
console.log('SSR: 12 phases render; each has <=4 primary controls, 3 DN; both desktop scale factors verified; nickname required.')
const sharding=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...initial,phase:'sharding',screen:'game'}}))
assert.ok(sharding.includes('记录按编号分到三个仓库'))
assert.ok(sharding.includes('相同状态的记录放在一起'))
assert.ok(sharding.includes('教程不计分'))
const challenge=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...initial,phase:'sharding',screen:'game',options:{difficulty:'medium',pressure:14,guide:false}}}))
assert.ok(challenge.includes('积分 ×1.5'))
assert.ok(!challenge.includes('class="npc-bubble"'))
assert.ok(!challenge.includes('获取调度提示'))
assert.ok(challenge.includes('记录按编号分到三个仓库'))
for (const previousNodes of [1,3]) {
 const html=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...initial,phase:'replication-small-result',cargoMode:'query',queryNodes:previousNodes,finalReplication:'centralized'}}))
 assert.ok(html.includes('访问节点：3/3'))
 assert.ok(html.includes('跨节点搬运：高'))
}
const logs=renderToStaticMarkup(React.createElement(GamePage,{...props,state:{...initial,phase:'replication-large-result',cargoMode:'replicate',largeReplication:'replicated'}}))
assert.ok(logs.includes('海量日志副本'))
assert.ok(!logs.includes('公共数据副本已就位'))
console.log('Regression: centralized public access is independent of previous query; large replicas identify business logs.')
