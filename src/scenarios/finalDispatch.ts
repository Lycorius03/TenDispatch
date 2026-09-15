export const finalDispatchScenario = {
  id: 'final-dispatch',
  reusedMechanics: ['sharding', 'query-routing', 'replication', 'gtm'],
  outcomes: ['STABLE', 'HIGH LOAD', 'OVERLOAD'],
  outcomeByCorrectChoices: {
    3: { status: 'STABLE', loads: [61, 64, 62] },
    2: { status: 'HIGH LOAD', loads: [72, 83, 69] },
    1: { status: 'OVERLOAD', loads: [94, 88, 76] },
    0: { status: 'OVERLOAD', loads: [94, 88, 76] },
  } as const,
} as const
