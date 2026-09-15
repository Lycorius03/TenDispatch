import { useMemo, useState } from 'react'
import { HomePage } from './pages/Home/HomePage'
import { GamePage } from './pages/Game/GamePage'
import { ResultPage } from './pages/Result/ResultPage'
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage'
import { createInitialState, type DispatchStrategy, type FinalChoices, type ReplicationStrategy } from './game/GameState'
import { EventTracker } from './game/EventTracker'
import { GameEngine } from './game/GameEngine'
import { ScoreEngine } from './game/ScoreEngine'
import { LocalRepository } from './services/LocalRepository'
import type { GameRecord } from './services/GameRepository'

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [latestRecord, setLatestRecord] = useState<GameRecord | null>(null)
  const tracker = useMemo(() => new EventTracker(), [])
  const engine = useMemo(() => new GameEngine(tracker), [tracker])
  const scoreEngine = useMemo(() => new ScoreEngine(), [])
  const repository = useMemo(() => new LocalRepository(), [])

  const start = (nickname: string) => setState(engine.start(createInitialState(), nickname))
  const startAnonymous = () => start(repository.nextAnonymousName())
  const restart = () => {
    setLatestRecord(null)
    setState(createInitialState())
  }
  const showRanking = () => setState((current) => ({ ...current, screen: 'ranking' }))

  const completeFinal = () => {
    setState(engine.completeFinal(state))
  }

  const showReport = () => {
    const completed = engine.showReport(state)
    const breakdown = scoreEngine.calculate(completed)
    const duration = Math.max(1, Math.round((Date.now() - completed.gameStartedAt) / 1000))
    const record: GameRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nickname: completed.nickname,
      score: breakdown.total,
      title: breakdown.title,
      hintCount: completed.hintCount,
      duration,
      completedAt: new Date().toISOString(),
      breakdown,
      behavior: {
        initialSharding: completed.initialSharding,
        finalSharding: completed.finalSharding,
        shardingAdjustments: completed.shardingAdjustments,
        skewTriggered: completed.skewTriggered,
        averageQueryNodes: completed.queryNodes,
        initialReplication: completed.initialReplication,
        finalReplication: completed.finalReplication,
        largeReplication: completed.largeReplication,
        hintCount: completed.hintCount,
        stageTimes: completed.stageTimes,
          totalDuration: duration,
          systemStatus: completed.systemStatus,
      },
      events: tracker.getEvents(),
    }
    repository.save(record)
    setLatestRecord(record)
    setState(completed)
  }

  if (state.screen === 'home') return <HomePage previewState={{ ...state, cargoMode: 'write', dnLoads: [33, 34, 33] }} onStart={start} onAnonymous={startAnonymous} onRanking={showRanking} />
  if (state.screen === 'ranking') return <LeaderboardPage records={repository.getRankings()} onHome={restart} onRestart={restart} />
  if (state.screen === 'result' && latestRecord) return <ResultPage record={latestRecord} onRanking={showRanking} onRestart={restart} />

  return <GamePage
    state={state}
    onTutorial={() => setState((current) => engine.completeTutorial(current))}
    onSharding={(strategy: DispatchStrategy) => setState((current) => engine.selectSharding(current, strategy))}
    onShardingContinue={() => setState((current) => engine.continueFromSharding(current))}
    onQuery={() => setState((current) => engine.runQuery(current))}
    onQueryContinue={() => setState((current) => engine.continueToReplication(current))}
    onSmallReplication={(strategy: ReplicationStrategy) => setState((current) => engine.selectSmallReplication(current, strategy))}
    onSmallContinue={() => setState((current) => engine.continueToLargeReplication(current))}
    onLargeReplication={(strategy: ReplicationStrategy) => setState((current) => engine.selectLargeReplication(current, strategy))}
    onLargeContinue={() => setState((current) => engine.continueToGtm(current))}
    onGtm={() => setState((current) => engine.runGtm(current))}
    onFinalChoice={(key: keyof FinalChoices, value) => setState((current) => engine.setFinalChoice(current, key, value))}
    onFinal={completeFinal}
    onReport={showReport}
    onHint={() => setState((current) => engine.useHint(current))}
  />
}
