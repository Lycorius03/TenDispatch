import type { SessionOptions } from './config/difficulty'
import { getDailySeed } from './config/difficulty'
import { useMemo, useState } from 'react'
import { HomePage } from './pages/Home/HomePage'
import { GamePage } from './pages/Game/GamePage'
import { ResultPage } from './pages/Result/ResultPage'
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage'
import { createInitialState, createRankedState, createTutorialState, type DispatchStrategy, type FinalChoices, type GameState, type ReplicationStrategy, type RankedStrategy } from './game/GameState'
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
  const [playerNickname, setPlayerNickname] = useState(() => repository.getOrCreatePlayerNickname())

  const start = (nickname: string, options: SessionOptions) => {
    const mode = options.mode === 'tutorial' ? 'tutorial' : 'ranked'
    repository.savePlayerNickname(nickname)
    setPlayerNickname(nickname)
    const seed = options.dailySeed ?? getDailySeed()
    const base = mode === 'tutorial' ? createTutorialState() : createRankedState(seed)
    setState(engine.start({
      ...base,
      options: { ...base.options, ...options, mode, dailySeed: seed },
    }, nickname))
  }

  const restart = () => {
    setLatestRecord(null)
    setState(createInitialState())
  }

  const showRanking = () => setState((current) => ({ ...current, screen: 'ranking' }))

  const completeLegacyFinal = () => setState((current) => engine.completeFinal(current))

  const showReport = () => {
    const completed = state.mode === 'ranked' ? engine.finishRanked(state) : engine.showReport(state)
    if (completed.screen !== 'result') return
    const breakdown = scoreEngine.calculate(completed)
    const duration = Math.max(1, Math.min(90, Math.round((Date.now() - completed.gameStartedAt) / 1000)))
    const record: GameRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode: completed.mode,
      difficulty: completed.mode === 'ranked' ? undefined : completed.options.difficulty,
      sessionOptions: completed.options,
      dailySeed: completed.dailySeed || undefined,
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
        averageQueryNodes: completed.averageQueryNodes || completed.queryNodes,
        initialReplication: completed.initialReplication,
        finalReplication: completed.finalReplication,
        largeReplication: completed.largeReplication,
        hintCount: completed.hintCount,
        stageTimes: completed.stageTimes,
        totalDuration: duration,
        systemStatus: completed.systemStatus,
        waveCount: completed.waveResults.length,
        perfectCount: completed.perfectCount,
        maxCombo: completed.maxCombo,
        averageDecisionMs: breakdown.averageDecisionMs,
        crossNodeMovement: completed.crossNodeMovement,
        undoPenalty: completed.undoPenalty,
        worstWave: completed.worstWave,
      },
      events: tracker.getEvents(),
    }
    if (completed.mode === 'ranked') repository.save(record)
    const today = repository.getRankings('today')
    const overall = repository.getRankings('overall')
    const rankIndex = today.findIndex((item) => item.id === record.id)
    const personalBest = Math.max(record.score, ...overall.filter((item) => item.nickname === record.nickname).map((item) => item.score))
    const enriched: GameRecord = {
      ...record,
      rank: rankIndex >= 0 ? rankIndex + 1 : undefined,
      personalBest,
      distanceTop10: rankIndex < 0 ? undefined : Math.max(0, (today[9]?.score ?? record.score) - record.score),
    }
    setLatestRecord(enriched)
    setState(completed)
  }

  const updateState = (updater: (current: GameState) => GameState) => setState(updater)

  if (state.screen === 'home') {
    return <HomePage
      previewState={{ ...state, cargoMode: 'write', dnLoads: [33, 34, 33] }}
      playerNickname={playerNickname}
      onNicknameChange={(nickname) => { if (nickname.trim()) { repository.savePlayerNickname(nickname); setPlayerNickname(nickname.trim()) } }}
      onRandomNickname={() => { const nickname = repository.nextRandomPlayerNickname(); repository.savePlayerNickname(nickname); setPlayerNickname(nickname); return nickname }}
      onStart={start}
      onRanking={showRanking}
    />
  }

  if (state.screen === 'ranking') return <LeaderboardPage records={repository.getRankings('overall')} onHome={restart} onRestart={restart} />
  if (state.screen === 'result' && latestRecord) return <ResultPage record={latestRecord} onRanking={showRanking} onRestart={restart} />

  return <GamePage
    state={state}
    onTutorial={() => updateState((current) => engine.completeTutorial(current))}
    onTutorialStep={() => updateState((current) => engine.completeTutorialStep(current))}
    onTutorialRestart={() => updateState((current) => engine.resetTutorial(current))}
    onSharding={(strategy: DispatchStrategy) => updateState((current) => engine.selectSharding(current, strategy))}
    onShardingContinue={() => updateState((current) => engine.continueFromSharding(current))}
    onQuery={() => updateState((current) => engine.runQuery(current))}
    onQueryContinue={() => updateState((current) => engine.continueToReplication(current))}
    onSmallReplication={(strategy: ReplicationStrategy) => updateState((current) => engine.selectSmallReplication(current, strategy))}
    onSmallContinue={() => updateState((current) => engine.continueToLargeReplication(current))}
    onLargeReplication={(strategy: ReplicationStrategy) => updateState((current) => engine.selectLargeReplication(current, strategy))}
    onLargeContinue={() => updateState((current) => engine.continueToGtm(current))}
    onGtm={() => updateState((current) => engine.runGtm(current))}
    onFinalChoice={(key: keyof FinalChoices, value) => updateState((current) => engine.setFinalChoice(current, key, value))}
    onFinal={completeLegacyFinal}
    onReport={showReport}
    onHint={() => updateState((current) => engine.useHint(current))}
    onRankedSubmit={(strategy: RankedStrategy, decisionMs?: number) => updateState((current) => engine.submitRankedWave(current, strategy, decisionMs))}
    onRankedTimeout={() => updateState((current) => engine.submitRankedWave(current, 'status', 4001))}
    onRankedNext={() => updateState((current) => engine.advanceRankedWave(current))}
    onRankedPrediction={() => updateState((current) => engine.useRankedPrediction(current))}
    onRankedUndo={() => updateState((current) => engine.undoRankedDecision(current))}
    onRankedFinish={showReport}
  />
}
