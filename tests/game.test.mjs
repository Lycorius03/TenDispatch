import assert from 'node:assert/strict'
import { GameEngine } from '../src/game/GameEngine.ts'
import { createInitialState } from '../src/game/GameState.ts'
import { ScoreEngine } from '../src/game/ScoreEngine.ts'
import { EventTracker } from '../src/game/EventTracker.ts'
import { difficulties } from '../src/config/difficulty.ts'
const engine = new GameEngine(new EventTracker())
const score = new ScoreEngine()
function run(first, final, small, large, query, pressure=0, guide=true, correction=false, difficulty='easy') {
 let s = engine.start({...createInitialState(),options:{difficulty,pressure,guide}},'测试调度员')
 s = engine.completeTutorial(s)
 s = engine.selectSharding(s,first)
 if(correction) s = engine.selectSharding(s,'id')
 s = engine.continueFromSharding(s)
 s = engine.runQuery(s)
 s = engine.continueToReplication(s)
 s = engine.selectSmallReplication(s,small)
 s = engine.continueToLargeReplication(s)
 s = engine.selectLargeReplication(s,large)
 s = engine.continueToGtm(s)
 s = engine.runGtm(s)
 s = {...s,finalChoices:{sharding:final,query,publicData:small}}
 return engine.completeFinal(s)
}
assert.equal(engine.start(createInitialState(),'  ').screen,'home')
const best=run('id','id','replicated','centralized','targeted')
const fixed=run('status','id','replicated','centralized','targeted',0,true,true)
const poor=run('status','status','centralized','replicated','broadcast')
assert.equal(score.calculate(best).total,100)
assert.ok(score.calculate(fixed).total < score.calculate(best).total)
assert.ok(score.calculate(poor).total < score.calculate(fixed).total)
assert.equal(engine.showReport(best).screen,'result')
assert.equal(score.calculate(engine.useHint(best)).total,score.calculate(best).total)
assert.ok(score.calculate({...best,options:{...best.options,guide:false},hintCount:1}).total < 100)
const scores = new Set()
for(const a of ['id','region','status']) for(const b of ['id','region','status']) for(const c of ['centralized','replicated']) for(const d of ['centralized','replicated']) for(const q of ['targeted','broadcast']) {
 const s=run(a,b,c,d,q)
 const v=score.calculate(s)
 assert.ok(v.total>=0&&v.total<=100)
 assert.equal(v.baseTotal,v.distribution+v.query+v.replication+v.architecture+v.independence)
 scores.add(v.total)
}
assert.ok(scores.size>15)
const challengeScores = Object.entries(difficulties).map(([id,d])=>({difficulty:id,total:score.calculate(run('id','id','replicated','centralized','targeted',d.pressure,d.guide,false,id)).total}))
assert.deepEqual(challengeScores.map(item=>item.total),[75,100,150,200])
const peaks=Object.entries(difficulties).map(([id,d])=>({difficulty:id,peak:Math.max(...run('id','id','replicated','centralized','targeted',d.pressure,d.guide,false,id).dnLoads)}))
assert.ok(peaks.every((p,i)=>i===0||p.peak>peaks[i-1].peak))
console.log(JSON.stringify({cases:72,distinctScores:scores.size,scoreRange:[Math.min(...scores),Math.max(...scores)],best:score.calculate(best).total,corrected:score.calculate(fixed).total,poor:score.calculate(poor).total,challengeScores,peaks},null,2))
