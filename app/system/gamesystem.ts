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
  viewer: string = ''

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
      this.g = new Game("Game", this.asyncUpdate, this.setup, this.rules, Object.keys(this.playerClients), this.options, this.seed)
      // this.historyFile = `replay${seed}.json`
      this.replayIndex = 0
      this.g.render = this.onGameUpdated
      this.g.isRunning = true

      // TODO this call is needed if we seek to the first state.  Hide it away in the Game c'tor
      this.onGameUpdated()

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
        // TODO this was copied from asyncUpdate - is there a better way?
        if (this.playback === Playback.SEEK && this.replayIndex >= this.seekIndex) {
          this.playback = Playback.PAUSE
        }
      }

      this.pendingCommands = []
      this.g.isRunning = false
    }
  }

  private onGameUpdated() {
    if ((this.playback !== Playback.SEEK || this.replayIndex >= this.seekIndex) && this.render) {
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
    } else if (this.seekIndex < this.replayIndex) {
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

  private asyncUpdate(pickCommands: IPickCommand[]): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      if (!this.g.isRunning) {
        return // game stopped running exit
      }

      this.pendingCommands.push(() => this.asyncTick(pickCommands).then((val) => resolve(val)))

      if (this.playback === Playback.PAUSE) {
        return
      } else if (this.playback === Playback.PLAY && this.replayIndex >= this.replay.length) {
        return
      } if (this.playback === Playback.SEEK && this.replayIndex >= this.seekIndex) {
        this.playback = Playback.PAUSE
        return
      }

      while (this.pendingCommands.length > 0) {
        this.pendingCommands.shift()()
      }
    })
  }

  private async asyncTick(pickCommands: IPickCommand[]): Promise<string[]> {
    if (!this.g.isRunning) {
      return // game stopped running exit
    }

    console.assert(pickCommands.length > 0)
    let choices: string[] = []

    if (this.replayIndex < this.replay.length) {
      // get the choice from the replay
      let replayResult = this.replay[this.replayIndex++]
      console.assert(replayResult.id === pickCommands[0].id)
      choices = replayResult.choices
    } else {
      // string[option][command]
      console.assert(pickCommands.every((c, i, cs) => c.who === cs[0].who))
      const who = pickCommands[0].who // all commands have the same 'who'
      choices = await this.playerClients[who](this.g, pickCommands, this.scoreFn)
      if (!this.g.isRunning) {
        return // game stopped running exit
      }

      this.replay.push({choices, id: pickCommands[0].id}) // reference the first command in the batch
      this.replayIndex = this.replay.length

      if (this.historyFile) {
        // fs.writeFileSync(this.historyFile, JSON.stringify(this.replay))
      }
    }

    console.assert(pickCommands.some(command => this.g.isValidResult(command, choices)))

    return choices
  }

  public static randomClient() {
    let chosenIndex: number

    return async (g: Game, commands: IPickCommand[], scoreFn: (Game, string) => number): Promise<string[]> => {
      const commandIndex = Util.randomInt(0, commands.length)
      let choices: string[]
      let combinations = GameSystem.getValidCombinationsForCommand(g, commands[commandIndex])
      if (combinations.length > 0) {
        const randomChoice = Util.randomInt(0, combinations.length)
        choices = combinations[randomChoice]
      }
      return choices
    }
  }

  // TODO depth may be better as a number of rounds, rather than a number of questions
  public static monteCarloClient(depth: number, iterations: number): any {

    return async (g: Game, commands: IPickCommand[], scoreFn: (Game, string) => number, parallelCommands: IPickCommand[]): Promise<string[]> => {
      // this pick combination list will be used at the beginning of all trials
      let pickCombinations = GameSystem.getValidCombinations(g, commands)
      const m = pickCombinations.length

      if (m === 0) {
        return [] // no options, exit
      } else if (m === 1) {
        return pickCombinations[0] // only one option
      }

      let totals = Array(m).fill(0)
      let who = commands[0].who
      console.assert(commands.every(command => command.who === commands[0].who))

      // multiply by m to ensure we try each pickCombination the same number
      // of times
      for (let k = 0; k < iterations*m; ++k) {
        let debugCandidates = []

        // attempt 'depth' turns of the game
        let pickIndex = k % m
        let choice
        let step = 0

        const trialName = `Trial${k}`
        let trialSystem = new TrialSystem(trialName, g.setupFn, g.rules, g.getAllPlayers(), g.seed, g.getHistory(who))

        await trialSystem.run((trial: Game, commands: IPickCommand[]): string[] => {
          if (step >= depth) {
            trialSystem.stop()
            //return []
          }

          choice = []
          if (step === 0) {
            choice = pickCombinations[pickIndex]
          } else {
            const combinations = GameSystem.getValidCombinations(trial, commands)
            if (combinations.length > 0) {
              const randomIndex = Util.randomInt(0, combinations.length)
              choice = combinations[randomIndex]
            }
          }
          console.assert(commands.some(command => trial.isValidResult(command, choice)))

          debugCandidates.push(choice)
          step++
          return choice
        })

        // find our score relative to the best opponent score at the end
        // of this trial
        let trialScore = GameSystem.getRelativeScore(trialSystem.trial, commands[0].who, scoreFn)

        totals[pickIndex] += trialScore
      }

      // take the option with the best overall score (all pickCombinations were
      // trialled the same number of times so we don't need to calculate an
      // average)
      const bestPickIndices = Util.maxIndices(totals)
      const j = Util.randomInt(0, bestPickIndices.length)
      return pickCombinations[bestPickIndices[j]]
    }
  }

  public static humanClient(): any {
    return async (g: Game, commands: IPickCommand[], scoreFn: (Game, string) => number, parallelCommands: IPickCommand[]): Promise<string[]> => {
      return new Promise<string[]>(resolve => {
        g.highlights = commands.reduce((list, command) => Util.arrayUnion(list, command.options), [])
        g.onHumanPicked = resolve
        g.debugRender()
      })
    }
  }

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

  private static getValidCombinations(g: Game, commands: IPickCommand[]): string[][] {
    let allCombinations = []

    for (let i = 0; i < commands.length; ++i) {
      const command = commands[i]
      const combinations = GameSystem.getValidCombinationsForCommand(g, command)
      // TODO should only push unique combinations
      for (let combo of combinations) {
        allCombinations.push(combo)
      }
    }

    return allCombinations
  }

  private static getValidCombinationsForCommand(g: Game, command: IPickCommand): string[][] {
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

  public getViewer(): string {
    return this.viewer
  }

  public setViewer(who: string) {
    this.viewer = who
    if (this.render) {
      this.render()
    }
  }
}

export class TrialSystem {
  trial: any
  rules: any
  replay: string[][] = []
  replayIndex: number = 0
  stopTrial: any
  trialFn: (g: Game, commands: IPickCommand[]) => string[]

  constructor(name: string, setup: SetupFn, rules: RulesFn, playerNames: string[], seed: number, replay: string[][]) {
    let trialOptions = {}
    this.trialUpdate = this.trialUpdate.bind(this)
    this.trial = new Game(name, this.trialUpdate, setup, rules, playerNames, trialOptions, seed)
    this.rules = rules
    this.replay = replay
  }

  public async run(trialFn: (g: Game, commands: IPickCommand[]) => string[]) {
    console.assert(!this.stopTrial, 'trial is already running')
    this.trialFn = trialFn
    let stopTrialPromise = new Promise(resolve => { this.stopTrial = resolve })
    let rulesPromise = this.rules(this.trial)
    let response = await Promise.race([rulesPromise, stopTrialPromise])
  }

  public stop() {
    if (typeof this.stopTrial === 'function') {
      this.stopTrial('trial ended')
      delete this.stopTrial
    }
  }

  private trialUpdate(pickCommands: IPickCommand[]): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      if (typeof this.stopTrial !== 'function') {
        return // trial has ended, do nothing
      } else if (this.replayIndex < this.replay.length) {
        resolve(this.replay[this.replayIndex++])
      } else {
        resolve(this.trialFn(this.trial, pickCommands))
      }
    })
  }

}
