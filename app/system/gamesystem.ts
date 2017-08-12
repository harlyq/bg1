import {Game, IGameOptions, IPickCommand} from './game'

enum Playback {
  PLAY,
  PAUSE,
  RECORD,
  SEEK,
}

type SetupFn = (...args: any[]) => void

export class GameSystem {
  playback: Playback = Playback.PAUSE
  oldPlayback: Playback = Playback.PAUSE
  g: Game
  writeHistoryFile: boolean = false
  historyFile: string = ''
  history: any[] = []
  historyIndex: number // curent seek position, or history.length if at the end
  seekIndex: number
  setup: any
  rules: any
  scoreFn: (g: Game, playerName: string) => number
  seed: any
  options: IGameOptions = {}
  playerClients: any = {}
  pendingCommands = []
  render: any
  resolveSeek: any

  constructor(setup: SetupFn, rules, scoreFn, playerClients, options: IGameOptions = {}, seed = Date.now(), history: any[] = []) {
    this.setup = setup
    this.rules = rules
    this.scoreFn = scoreFn
    this.seed = seed
    this.options = {...options}
    this.playerClients = {...playerClients}
//    this.initGame(setup, rules, scoreFn, playerClients, options, seed)
    this.history = history
    this.playback = Playback.RECORD
    this.historyIndex = 0
    this.seekIndex = 0
  }

  public async run(render) {
    let restartGame = true
    this.render = render

    while (restartGame) {
      this.initGame(this.setup, this.rules, this.scoreFn, this.playerClients, this.options, this.seed)
      this.g.render = this.onGameUpdated.bind(this)
      restartGame = false

      let seekPromise = new Promise(resolve => { this.resolveSeek = resolve })
      let rulesPromise = this.rules(this.g)

      let response = await Promise.race([rulesPromise, seekPromise])
      if (response === 'seek') {
        restartGame = true
      }

      this.pendingCommands = []
    }
  }

  private onGameUpdated() {
    if (this.playback !== Playback.SEEK && this.render) {
      this.render()
    }
  }

  private initGame(setup: SetupFn, rules, scoreFn, playerClients, options, seed) {
    this.g = new Game(this.asyncUpdate.bind(this), setup, rules, Object.keys(playerClients), options, seed)
    this.scoreFn = scoreFn
    // this.historyFile = `history${seed}.json`
    this.historyIndex = 0
  }

  public seek(replayTo: number) {
    this.seekIndex = Math.min(replayTo, this.history.length)
    if (this.historyIndex === this.seekIndex) {
      return // at the correct point, nothing to do
    }

    this.playback = Playback.SEEK

    if (this.pendingCommands.length === 0) {
      this.run(this.render) // game finished, re-run to perform seek
    } else if (!this.historyIndex || this.seekIndex < this.historyIndex) {
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
      this.history.length = this.historyIndex
      this.options.saveHistory = true
    }
  }

  public canStepBack(): boolean {
    return this.playback === Playback.PAUSE && this.historyIndex > 0
  }

  public stepBack() {
    if (this.canStepBack()) {
      this.seek(this.historyIndex - 1)
    }
  }

  public canStepForward(): boolean {
    return this.playback === Playback.PAUSE && this.historyIndex < this.history.length
  }

  public stepForward() {
    if (this.canStepForward()) {
      this.seek(this.historyIndex + 1)
    }
  }

  private asyncUpdate(pickCommand: IPickCommand): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.pendingCommands.push(() => this.asyncTick(pickCommand).then((val) => resolve(val)))

      if (this.playback === Playback.PAUSE) {
        return
      } else if (this.playback === Playback.PLAY && this.historyIndex >= this.history.length) {
        return
      } if (this.playback === Playback.SEEK && this.historyIndex >= this.seekIndex) {
        // TODO fix history index for parallel requests, these should be treated as
        // a single history
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

  private async asyncTick(pickCommand: IPickCommand) {
    let choice
    if (this.historyIndex < this.history.length) {
      choice = this.history[this.historyIndex++]
    } else {
      // TODO support async client functions
      choice = await (this.playerClients[pickCommand.who](this.g, pickCommand, this.scoreFn))
      this.history.push(choice)
      this.historyIndex = this.history.length

      if (this.historyFile) {
        // fs.writeFileSync(this.historyFile, JSON.stringify(this.history))
      }
    }

    this.validateChoice(pickCommand, choice)

    return choice
  }

  private validateChoice(command: IPickCommand, result: any[]) {
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

}
