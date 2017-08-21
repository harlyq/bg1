import {Game, IGameOptions, IPickCommand, PickCount} from './game'
import Util from './util'

enum Playback {
  PLAY,
  PAUSE,
  RECORD,
  SEEK,
}

type SetupFn = (...args: any[]) => void
type RulesFn = (...args: any[]) => Promise<{}>
type UpdateFn = (pickCommand: IPickCommand) => Promise<string[]>

export class GameSystem {
  playback: Playback = Playback.PAUSE
  oldPlayback: Playback = Playback.PAUSE
  g: Game
  writeHistoryFile: boolean = false
  historyFile: string = ''
  replay: any[] = [] // TODO rename replay to seekHistory?
  replayIndex: number // curent seek position, or replay.length if at the end
  seekIndex: number
  setup: any
  rules: any
  scoreFn: (g: Game, playerName: string) => number
  seed: any
  options: IGameOptions = {}
  playerClients: any = {}
  pendingCommands: any[] = []
  render: any
  resolveSeek: any

  constructor(setup: SetupFn, rules, scoreFn, playerClients, options: IGameOptions = {}, seed = Date.now(), replay: any[] = []) {
    this.setup = setup
    this.rules = rules
    this.scoreFn = scoreFn
    this.seed = seed
    this.options = {...options}
    this.playerClients = {...playerClients}
//    this.initGame(setup, rules, scoreFn, playerClients, options, seed)
    this.replay = replay
    this.playback = Playback.RECORD
    this.replayIndex = 0
    this.seekIndex = 0

    this.asyncUpdate = this.asyncUpdate.bind(this)
    this.onGameUpdated = this.onGameUpdated.bind(this)
  }

  public async run(render) {
    let restartGame = true
    this.render = render

    while (restartGame) {
      this.g = new Game(this.asyncUpdate, this.setup, this.rules, Object.keys(this.playerClients), this.options, this.seed)
      // this.historyFile = `replay${seed}.json`
      this.replayIndex = 0
      this.g.render = this.onGameUpdated
      this.g.isRunning = true

      restartGame = false

      let seekPromise = new Promise(resolve => { this.resolveSeek = resolve })
      let rulesPromise = this.rules(this.g)

      // NOTE this race is super dodgy, because the seek will end, but
      // the rules are still going.  We get an inconsistency when the
      // game calls back to this gamesystem and finds everything
      // out of sync, because the game system has been setup for the
      // new game
      let response = await Promise.race([rulesPromise, seekPromise])
      if (response === 'seek') {
        restartGame = true
      } else {
        // needed, to render the last frame of a seek
        if (this.render) {
          this.render()
        }
      }

      this.pendingCommands = []
      this.g.isRunning = false
    }
  }

  private onGameUpdated() {
    if (this.playback !== Playback.SEEK && this.render) {
      this.render()
    }
  }

  public seek(replayTo: number) {
    this.seekIndex = Math.min(replayTo, this.replay.length)
    if (this.replayIndex === this.seekIndex) {
      return // at the correct point, nothing to do
    }

    this.playback = Playback.SEEK

    if (this.pendingCommands.length === 0) {
      this.run(this.render) // game finished, re-run to perform seek
    } else if (!this.replayIndex || this.seekIndex < this.replayIndex) {
      this.resolveSeek('seek')
    } else {
      // going forward in time, process the pending commands to continue running
      while (this.pendingCommands.length > 0) {
        this.pendingCommands.shift()()
      }
    }
  }

  public togglePause() {
    if (this.playback === Playback.PAUSE) {
      if (this.oldPlayback === Playback.PLAY) {
        this.play()
      } else if (this.oldPlayback === Playback.RECORD) {
        this.record()
      }
    } else {
      this.pause()
    }
  }

  public canPause(): boolean {
    return this.playback === Playback.PLAY || this.playback === Playback.RECORD
  }

  public pause() {
    if (this.canPause()) {
      this.oldPlayback = this.playback
      this.playback = Playback.PAUSE
    }
  }

  public canPlay(): boolean {
    return this.playback === Playback.PAUSE
  }

  public play() {
    if (this.canPlay()) {
      this.playback = Playback.PLAY
    }
  }

  public canRecord(): boolean {
    return true
  }

  public record() {
    if (this.canRecord()) {
      this.playback = Playback.RECORD
      this.replay.length = this.replayIndex
      this.options.saveHistory = true
    }
  }

  public canStepBack(): boolean {
    return this.playback === Playback.PAUSE && this.replayIndex > 0
  }

  public stepBack() {
    if (this.canStepBack()) {
      this.seek(this.replayIndex - 1)
    }
  }

  public canStepForward(): boolean {
    return this.playback === Playback.PAUSE && this.replayIndex < this.replay.length
  }

  public stepForward() {
    if (this.canStepForward()) {
      this.seek(this.replayIndex + 1)
    }
  }

  private asyncUpdate(pickCommands: IPickCommand[]): Promise<string[][]> {
    return new Promise<string[][]>((resolve) => {
      if (!this.g.isRunning) {
        return // game stopped running exit
      }

      this.pendingCommands.push(() => this.asyncTick(pickCommands).then((val) => resolve(val)))

      if (this.playback === Playback.PAUSE) {
        return
      } else if (this.playback === Playback.PLAY && this.replayIndex >= this.replay.length) {
        return
      } if (this.playback === Playback.SEEK && this.replayIndex >= this.seekIndex) {
        if (this.render) {
          this.render()
        }
        this.playback = Playback.PAUSE
        return
      }

      while (this.pendingCommands.length > 0) {
        this.pendingCommands.shift()()
      }
    })
  }

  private async asyncTick(pickCommands: IPickCommand[]) {
    if (!this.g.isRunning) {
      return // game stopped running exit
    }

    console.assert(pickCommands.length > 0)
    let choices: string[][] = []

    if (this.replayIndex < this.replay.length) {
      // get the choice from the replay
      let replayResult = this.replay[this.replayIndex++]
      console.assert(replayResult.id === pickCommands[0].id)
      console.assert(replayResult.choices.length === pickCommands.length)
      choices = replayResult.choices
    } else {
      // batch commands by 'who'
      const commandBuckets: {[who: string]: IPickCommand[]} = Util.makeBuckets(pickCommands, (command) => command.who)

      // wait for responses from everyone
      const clientPromises = []
      for (let who in commandBuckets) {
        // TODO should the scoreFn be on the Game object?
        clientPromises.push(this.playerClients[who](this.g, commandBuckets[who], this.scoreFn))
      }

      // string[option][command][who]
      let results: string[][][] = await Promise.all(clientPromises)
      if (!this.g.isRunning) {
        return // game stopped running exit
      }

      // unbatch responses into a list, matching the order of 'pickCommands'
      for (let who in commandBuckets) {
        const whoResults: string[][] = results.shift()
        console.assert(whoResults.length === commandBuckets[who].length)
        for (let i = 0; i < whoResults.length; ++i) {
          const j = pickCommands.indexOf(commandBuckets[who][i])
          choices[j] = whoResults[i]
        }
      }

      console.assert(choices.length === pickCommands.length)
      this.replay.push({choices, id: pickCommands[0].id})
      this.replayIndex = this.replay.length

      if (this.historyFile) {
        // fs.writeFileSync(this.historyFile, JSON.stringify(this.replay))
      }
    }

    console.assert(choices.length === pickCommands.length)
    for (let i = 0; i < pickCommands.length; ++i) {
      this.validateChoice(pickCommands[i], choices[i])
    }

    return choices
  }

  private validateChoice(command: IPickCommand, result: string[]) {
    //console.assert(!(result instanceof IterableIterator<{}>), 'missing "yield*" before a call to another function')

    console.assert(Array.isArray(result), 'result is not an array')

    for (let i = 0; i < result.length; ++i) {
      // this may be due to global variables for not using the Game.random() functions
      console.assert(command.options.indexOf(result[i]) !== -1, `the result contains options (${result}) which were not in the original command (${command.options})`)
    }

    if (result.length > 0 && command.condition >= 0) {
      const conditionFn = this.g.registeredConditions[command.condition]
      console.assert(conditionFn(this.g, command.who, result, command.conditionArg), `result (${result}) does not meet the command conditions`)
    }

    // TODO validate the number of results against the count
    // TODO recursively validate the options (as they may be further commands)
  }

  // If there are multiple commands sent in the same frame, then process them
  // as parallel commands
  // TODO ensure we return one command pre owner
  public static randomClient() {
    let chosenIndex: number

    return async (g: Game, commands: IPickCommand[], scoreFn: (Game, string) => number): Promise<string[][]> => {
      const randomIndex = Util.randomInt(0, commands.length)
      const choices: string[][] = commands.map((command, i) => {
        let choice: string[] = []
        if (i === randomIndex) {
          let combinations = GameSystem.getValidCombinations(g, command)
          if (combinations.length > 0) {
            const randomChoice = Util.randomInt(0, combinations.length)
            choice = combinations[randomChoice]
          }
        }
        return choice
      })
      return choices
    }
  }

  // // TODO depth may be better as a number of rounds, rather than a number of questions
  // public static monteCarloClient(depth: number, iterations: number): any {
  //
  //   // TODO parallel commands need to be considered as the the one layer of
  //   // the monte carlo choice.  But what if there are multiple players on these
  //   // randoms e.g. a secret vote by all players, maybe using the parallel as
  //   // additional combinations is better, but the response will need to be per player
  //   // Thus, if player 1 has 3 choices, then we have 3 combinations, but if 4
  //   // players each have 2 choices then we have 4^2 (= 16) combinations
  //   return GameSystem.processParallelCommands(async (g: Game, command: IPickCommand, scoreFn: (Game, string) => number, parallelCommands: IPickCommand[]): Promise<string[]> => {
  //     const i = parallelCommands.indexOf(command)
  //     const n = parallelCommands.length
  //
  //     // this pick combination list will be used at the beginning of all trials
  //     const pickCombinations = GameSystem.getValidCombinations(g, command)
  //     const m = pickCombinations.length
  //
  //     if (m === 0) {
  //       return [] // no options, exit
  //     } else if (m === 1) {
  //       return pickCombinations[0] // only one option
  //     }
  //
  //     let totals = Array(m).fill(0)
  //     let trialSystem = new TrialSystem(g.setupFn, g.rules, g.getAllPlayerNames(), g.seed, []) //, g.getHistory())
  //
  //     // multiply by m to ensure we try each pickCombination the same number
  //     // of times
  //     for (let k = 0; k < iterations*m; ++k) {
  //       let debugCandidates = []
  //
  //       // attempt 'depth' turns of the game
  //       let pickIndex = k % m
  //       let choice
  //       let step = 0
  //
  //       await trialSystem.run((trial: Game, command: IPickCommand): string[] => {
  //         if (step === depth) {
  //           trialSystem.stop()
  //           return []
  //         }
  //
  //         choice = []
  //         if (step === 0) {
  //           choice = pickCombinations[pickIndex]
  //         } else {
  //           const combinations = GameSystem.getValidCombinations(trial, command)
  //           if (combinations.length > 0) {
  //             const randomIndex = Util.randomInt(0, combinations.length)
  //             choice = combinations[randomIndex]
  //           }
  //         }
  //         debugCandidates.push(choice)
  //         trial.validateResult(command, choice)
  //         step++
  //         return choice
  //       })
  //
  //       // find our score relative to the best opponent score at the end
  //       // of this trial
  //       let trialScore = GameSystem.getRelativeScore(trialSystem.trial, command.who, scoreFn)
  //
  //       totals[pickIndex] += trialScore
  //     }
  //
  //     // take the option with the best overall score (all pickCombinations were
  //     // trialled the same number of times so we don't need to calculate an
  //     // average)
  //     const bestPickIndex = Util.maxIndex(totals)
  //     return pickCombinations[bestPickIndex]
  //   })
  // }

  // a -1 in the count is replaced with countMax1
  private static parseCount(count: PickCount, countMax: number): [number, number] {
    let min = 1, max = 1
    let countMin = 0

    if (Array.isArray(count)) {
      let countCopy = count.map(x => x < 0 ? countMax : x)
      if (countCopy.length > 0) {
        min = Math.min(...countCopy)
        max = Math.max(...countCopy)
      }
    } else if (typeof count === 'number') {
      if (count === -1) {
        min = max = countMax
      } else {
        min = max = count
      }
    }

    return [Util.clamp(min, countMin, countMax), Util.clamp(max, countMin, countMax)]
  }

  private static getValidCombinations(g: Game, command: IPickCommand): string[][] {
    const n = command.options.length
    const count = GameSystem.parseCount(command.count, n)

     // TODO think of a way to speed this up when there is no condition
    // if (command.condition < 0) {
    //   return Util.getRandomCombination(command.options, count[0], count[1])
    // }

    let conditionFn
    if (command.condition >= 0) {
      conditionFn = function(list: string[]) {
        return g.registeredConditions[command.condition](g, command.who, list, command.conditionArg)
      }
    }

    let combinations = Util.getCombinations(command.options, count[0], count[1], conditionFn)

    return combinations
  }

  private static getRelativeScore(g: Game, player: string, scoreFn: (Game, string) => number): number {
    // find our score relative to the best opponent score
    let relativeScore = scoreFn(g, player)

    const opponents = g.playerChain.toArray([player])
    if (opponents.length > 0) {
      let bestScore = scoreFn(g, opponents[0])
      for (let i = 1; i < opponents.length; ++i) {
        bestScore = Math.max(bestScore, scoreFn(g, opponents[i]))
      }
      relativeScore -= bestScore
    }

    return relativeScore
  }

}

export class TrialSystem {
  trial: any
  rules: any
  replay: string[][] = []
  replayIndex: number = 0
  stopTrial: any
  trialFn: (g: Game, command: IPickCommand) => string[]

  constructor(setup: SetupFn, rules: RulesFn, playerNames: string[], seed: number, replay: string[][]) {
    let trialOptions = {}
    this.trial = new Game(this.trialUpdate.bind(this), setup, rules, playerNames, trialOptions, seed)
    this.rules = rules
    this.replay = replay
  }

  public async run(trialFn: (g: Game, command: IPickCommand) => string[]) {
    console.assert(!this.stopTrial, 'trial is already running')
    this.trialFn = trialFn
    let stopTrialPromise = new Promise(resolve => { this.stopTrial = resolve })
    let rulesPromise = this.rules(this.trial)
    let response = await Promise.race([rulesPromise, stopTrialPromise])
  }

  public stop() {
    this.stopTrial('trial ended')
    delete this.stopTrial
  }

  private trialUpdate(pickCommand: IPickCommand): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      if (this.replayIndex < this.replay.length) {
        resolve(this.replay[this.replayIndex++])
      } else {
        resolve(this.trialFn(this.trial, pickCommand))
      }
    })
  }
}
