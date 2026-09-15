import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GamePage } from '../src/pages/Game/GamePage.tsx'
import { HomePage } from '../src/pages/Home/HomePage.tsx'
import { createInitialState } from '../src/game/GameState.ts'
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
