import {Game, IGameOptions, IPickCommand} from './game'

enum Playback {
  PLAY,
  PAUSE,
  RECORD
}

export class GameSystem {
  playback: Playback = Playback.PAUSE
  oldPlayback: Playback = Playback.PAUSE
  g: Game
  itr: any
  result: any
  writeHistoryFile: boolean = false
  historyFile: string = ''
  history: any[] = []
  historyIndex: number // curent seek position, or history.length if at the end
  setup: any
  rules: any
  scoreFn: (g: Game, playerName: string) => number
  seed: any
  options: IGameOptions = {}
  playerClients: any = {}

  constructor(setup, rules, scoreFn, playerClients, options: IGameOptions = {}, seed = Date.now(), history: any[] = []) {
    this.setup = setup
    this.rules = rules
    this.scoreFn = scoreFn
    this.seed = seed
    this.options = {...options}
    this.playerClients = {...playerClients}
    this.initGame(setup, rules, scoreFn, playerClients, options, seed)
    this.history = history
    this.playback = Playback.RECORD
  }

  private initGame(setup, rules, scoreFn, playerClients, options, seed) {
    this.g = new Game(setup, rules, Object.keys(playerClients), options, seed)
    this.scoreFn = scoreFn
    this.itr = rules()
    this.itr.next()
    this.result = this.itr.next(this.g)
    console.assert(this.result.value && this.result.value.type, 'rules did not return a query, are you missing a "*" on a yield?')
    // this.historyFile = `history${seed}.json`
    this.historyIndex = 0
  }

  public seek(replayTo: number) {
    // restart the game, and seek to the desired position
    // always need to start from the beginning for the iterator to work correctly
    if (!this.historyIndex || replayTo < this.historyIndex) {
      this.initGame(this.setup, this.rules, this.scoreFn, this.playerClients, this.options, this.seed)
    }

    this.playback = Playback.PLAY
    replayTo = Math.min(replayTo, this.history.length)
    while (!this.result.done && this.historyIndex < replayTo) {
      this.update()
    }

    this.pause()
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

  public async update() {
    if (this.playback === Playback.PAUSE) {
      return
    } else if (this.playback === Playback.PLAY && this.historyIndex >= this.history.length) {
      return
    }

    if (!this.result.done) {
      const command: IPickCommand = this.result.value

      let choice
      if (this.historyIndex < this.history.length) {
        choice = this.history[this.historyIndex++]
      } else {
        choice = await this.playerClients[command.who](this.g, command, this.scoreFn)
        this.history.push(choice)
        this.historyIndex = this.history.length

        if (this.historyFile) {
          // fs.writeFileSync(this.historyFile, JSON.stringify(this.history))
        }
      }

      this.validateChoice(command, choice)
      try {
        this.result = this.itr.next(choice)
        console.assert(this.result.value && this.result.value.type, 'rules did not return a query, are you missing a "*" on a yield?')
      } catch (e) {
        console.error(e)
      }
    } else {
      this.playback = Playback.PAUSE
    }
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
