import Util from './util.js'
import Chain from './chain.js'
import * as ReadlineSync from 'readline-sync'
import * as MersenneTwister from 'mersenne-twister' // HACK not a module

interface Player {
  name: string
}

interface Card {
  name: string
  [others: string]: any
}

interface Dice extends Card {
  value?: any // is one of the faces[], if missing, will be set when added
  faces: any[]
}

interface Place {
  name: string
  cards?: Card[]
  [others: string]: any
}

type CardPlace = [Place, number]

type PickCount = number | number[]

type PickCondition = (g: Game, list: any[]) => boolean

interface PickCommand {
  id: number // starts from 0
  type: string
  who: string
  options: string[]
  count: PickCount
  condition?: number
}

type CardFilterFn = (Card) => boolean
type PlaceFilterFn = (Place) => boolean
type PlayerFilterFn = (Player) => boolean
type CardName = string | string[] | CardFilterFn
type PlaceName = string | string[] | PlaceFilterFn
type PlayerName = string | string[] | PlayerFilterFn
type Index = number | number[]

interface Named {
  name: string
}

interface GameOptions {
  debug?: boolean
}

export default class Game {
  allCards: {[name: string]: Card} = {}
  allPlaces: {[name: string]: Place} = {}
  allPlayers: {[name: string]: Player} = {}
  registeredConditions: PickCondition[] = []
  allValues: {[key: string]: any} = {}
  history: any[] = []
  uniqueId: number = 0
  options: {debug: boolean} = {debug: false}
  setupFn: (Game) => void
  rules: any
  playerChain = new Chain()
  seed: number
  random

  constructor(setupFn?: (Game) => void, rules?, playerNames?: string[], options?: GameOptions, seed: number = Date.now()) {
    this.setupFn = setupFn
    this.rules = rules
    this.seed = seed
    this.random = new MersenneTwister(seed)

    // TODO where is the best place to do this?
    if (Array.isArray(playerNames)) {
      playerNames.forEach(x => this.addPlayer({name: x}))
    }

    if (options) {
      this.options = JSON.parse(JSON.stringify(options))
    }

    if (setupFn) {
      setupFn(this)
    }
  }

  public debugLog(msg) {
    if (this.options.debug) {
      console.log(msg)
      debugger
    }
  }

  // returns integer in the range (min, max]
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random.random()*(max - min) + min)
  }

  public getHistory(): any[] {
    return this.history
  }

  static filterThings<T>(name: string | string[] | ((Named) => boolean), things: {[name: string]: T & Named}): (T & Named)[] {
    if (typeof name === 'function') {
      let results = []
      for (let key in things) {
        if (name(things[key])) {
          results.push(things[key])
        }
      }
      return results
    } else if (typeof name === 'string') {
      return [things[name]]
    } else if (Array.isArray(name)) {
      return name.map(r => things[r]) // the output is the same order as the input
    }
    return []
  }

  public setValue(name: string, value: any) {
    this.allValues[name] = value
  }

  public getValue(name: string): any {
    return this.allValues[name]
  }

  public addValue(name: string, delta: number): any {
    this.allValues[name] = (this.allValues[name] || 0) + delta
    return this.allValues[name]
  }

  public toggleValue(name: string, delta: number): any {
    this.allValues[name] = !this.allValues[name]
    return this.allValues[name]
  }

  public registerCondition(condition: PickCondition): number {
    this.registeredConditions.push(condition)
    return this.registeredConditions.length - 1
  }

  public filterCards(cardName: CardName): Card[] {
    return Game.filterThings(cardName, this.allCards)
  }

  public getCards(placeName: PlaceName): Card[] {
    const places: Place[] = Game.filterThings(placeName, this.allPlaces)
    let cards = []
    for (let place of places) {
      if (place.cards.length > 0) {
        cards.push(...place.cards)
      }
    }
    return cards
  }

  public getCardNames(placeName: PlaceName): string[] {
    return this.getCards(placeName).map(x => x.name)
  }

  public getCardCount(placeName: PlaceName): number {
    const places: Place[] = Game.filterThings(placeName, this.allPlaces)
    let length = 0
    for (let place of places) {
      length += place.cards.length
    }
    return length
  }

  public filterPlaces(placeName: PlaceName): Place[] {
    return Game.filterThings(placeName, this.allPlaces)
  }

  public filterPlayers(playerName: PlayerName): Player[] {
    return Game.filterThings(playerName, this.allPlayers)
  }

  // function insertCard(fromList: any[], from: number, toList: any[], to: number) {
  //   if (fromList === toList) {
  //     let toOffset = to > from ? 1 : 0 // 'to' position will move down when card removed, so add 1 to 'to'
  //     let fromOffset = from > to ? 1 : 0 // 'from' position will move up when card added, so remove 1 from 'from'
  //     toList.splice(to + toOffset, 0, fromList[from])
  //     fromList.splice(from + fromOffset, 1)
  //   } else {
  //     toList.splice(to, 0, fromList[from])
  //     fromList.splice(from, 1)
  //   }
  // }

  private findPlace(card: Card): CardPlace {
    for (let key in this.allPlaces) {
      const place = this.allPlaces[key]
      const i = place.cards.indexOf(card)
      if (i !== -1) {
        return [place, i]
      }
    }
    return [,-1]
  }

  private insertCard(card: Card, to: Place, index: number) {
    const [oldPlace, oldIndex] = this.findPlace(card)

    // if we insert into the same list and the insertion index is
    // after the old index, then need to decrease the insertion
    // index by 1 because when we remove the card, we will shift
    // all the subsequent cards down one place
    if (oldPlace === to) {
      if (index > oldIndex) {
        --index
      }
    }

    if (oldPlace && oldIndex !== -1) {
      oldPlace.cards.splice(oldIndex, 1)
    }

    if (index === -1 || index >= to.cards.length) {
      to.cards.push(card)
    } else {
      to.cards.splice(index, 0, card)
    }
  }

  private removeCard(from: Place, index: number): Card {
    if (from.cards.length === 0) {
      return
    }

    let card
    if (index === -1 || index >= from.cards.length) {
      card = from.cards.splice(-1, 1)[0]
    } else {
      card = from.cards.splice(index, 1)[0]
    }
    return card
  }

  public addPlayer(player: Player): Game {
    // TODO assert that player.name is unique??
    this.allPlayers[player.name] = player
    this.playerChain.add(player.name)
    return this
  }

  private addPlaceInternal(place: Place) {
    this.allPlaces[place.name] = place
    if (!Array.isArray(place.cards)) {
      place.cards = []
    }
  }

  public addPlace(place: Place | Place[]): Game {
    // TODO assert that place.name is unique??
    if (Array.isArray(place)) {
      for (let p of place) {
        this.addPlaceInternal(p)
      }
    } else {
      this.addPlaceInternal(place)
    }
    return this
  }

  private addCardInternal(card: Card, to: Place, index: number) {
    this.insertCard(card, to, index)
    this.allCards[card.name] = card
  }

  public addCard(card: Card | Card[], to: Place, index: number = -1): Game {
    // TODO assert that card.name is unique??
    if (Array.isArray(card)) {
      for (let c of card) {
        this.addCardInternal(c, to, index)
      }
    } else {
      this.addCardInternal(card, to, index)
    }
    return this
  }

  // public addDice(dice: Dice | Dice[], to: Place, index: number = -1): Game {
  //   dice = Array.isArray(dice) ? dice : [dice]
  //
  //   for (let d of dice) {
  //     if (Array.isArray(d.faces) && d.faces.length > 0 && d.faces.indexOf(d.value) === -1) {
  //       d.value = d.faces[0] // force value to be one of the faces
  //     }
  //   }
  //
  //   return this.addCard(dice, to, index)
  // }

  // index -1 represents the top, 0 is the bottom
  // we iterate over 'to' first then 'toIndex'
  // TODO handle grids
  public moveCards(cardName: CardName, toName: PlaceName, count: number = -1, toIndex: Index = -1): Game {
    const cards: Card[] = this.filterCards(cardName)
    const tos: Place[] = this.filterPlaces(toName)
    const toIndices: number[] = Array.isArray(toIndex) ? toIndex : [toIndex]

    if (count === -1) {
      count = cards.length
    } else {
      count = Math.min(cards.length, count)
    }

    // TODO what if there is a limit on the number of cards at the destination
    let iTo = 0, iToIndex = 0
    for (let card of cards) {
      this.insertCard(card, tos[iTo], toIndices[iToIndex])

      // iterate over the 'tos' first, then the 'toIndices'
      if (++iTo >= tos.length) {
        iTo = 0
        iToIndex = (iToIndex + 1) % toIndices.length
      }
    }

    return this
  }

  // we iterate over 'from' then 'fromIndex' and at the same time iterate over
  // 'to' and 'toIndex'
  public move(fromName: PlaceName, toName: PlaceName, count: number = 1, fromIndex: Index = -1, toIndex: Index = -1): Game {
    const froms: Place[] = this.filterPlaces(fromName)
    const tos: Place[] = this.filterPlaces(toName)
    const fromIndices: number[] = Array.isArray(fromIndex) ? fromIndex : [fromIndex]
    const toIndices: number[] = Array.isArray(toIndex) ? toIndex : [toIndex]

    let cardCount = 0
    for (let from of froms) {
      cardCount += from.cards.length
    }

    if (count === -1) {
      count = cardCount
    }

    // restrict the count to the number of available cards
    count = Math.min(count, cardCount)

    let iFrom = 0, iFromIndex = 0
    let iTo = 0, iToIndex = 0
    let card

    do {
      // if we try to remove and insert from within a place, then the
      // indices will not be correct (because we are changing the cards)
      Util.assert(froms[iFrom] !== tos[iTo] ||
         ((fromIndices[iFromIndex] === 0 || fromIndices[iFromIndex] === -1) &&
         (toIndices[iToIndex] === 0 || toIndices[iToIndex] === -1)))

      // not all locations have cards
      card = this.removeCard(froms[iFrom], fromIndices[iFromIndex])
      if (card) {
        this.insertCard(card, tos[iTo], toIndices[iToIndex])
        --count
      }

      if (count > 0) {
        // iterate over the 'tos' first, then the 'toIndices'
        // NOTE only go to the next to location if we moved a card
        if (card && ++iTo >= tos.length) {
          iTo = 0
          iToIndex = (iToIndex + 1) % toIndices.length
        }

        // iterate over the 'tos' first, then the 'toIndices'
        if (++iFrom >= froms.length) {
          iFrom = 0
          iFromIndex = (iFromIndex + 1) % fromIndices.length
        }
      }
    } while (count > 0)

    return this
  }

  public shuffle(place: PlaceName): Game {
    const placeNames = Array.isArray(place) ? place : [place]

    for (let name of placeNames) {
      const places = this.filterPlaces(name) // should only have 0 or 1 entries
      if (places.length > 0) {
        Util.fisherYates(places[0].cards)
      }
    }
    return this
  }

  public reverse(place: PlaceName): Game {
    const placeNames = Array.isArray(place) ? place : [place]

    for (let name of placeNames) {
      const places = this.filterPlaces(name) // should have 0 or 1 entries
      if (places.length > 0) {
        places[0].cards.reverse()
      }
    }
    return this
  }

  public roll(place: PlaceName): Game {
    const placeNames = Array.isArray(place) ? place : [place]

    for (let name of placeNames) {
      const places = this.filterPlaces(name)
      if (places.length > 0) {
        for (let card of places[0].cards) {
          let dice = card as Dice
          if (dice.faces && Array.isArray(dice.faces)) { // NOTE may match some things which are not dice
            dice.value = dice.faces[this.randomInt(0, dice.faces.length)]
          }
        }
      }
    }

    return this
  }

  public toString(): string {
    const allCards = Object.keys(this.allCards).map(c => this.allCards[c]) // Object.values(this.allCards)
    let str = `CARDS (${allCards.length}) = ${allCards.map(c => c.name).join(',')}\n`
    for (let placeName in this.allPlaces) {
      const place = this.allPlaces[placeName]
      str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => c.name + (c.value ? `[${c.value.toString()}]` : '')).join(',')}\n`
    }
    return str
  }

  public pick(who: string, options: string[], count: PickCount = 1, condition?: PickCondition) {
    return {id: this.uniqueId++, type: 'pick', who, options: options, count, condition: this.registeredConditions.indexOf(condition)}
  }

  public pickCards(who: string, cards: string[], count: PickCount = 1, condition?: PickCondition) {
    return {id: this.uniqueId++, type: 'pickCards', who, options: cards, count, condition: this.registeredConditions.indexOf(condition)}
  }

  public pickPlaces(who: string, locations: string[], count: PickCount = 1, condition?: PickCondition) {
    return {id: this.uniqueId++, type: 'pickPlaces', who, options: locations, count, condition: this.registeredConditions.indexOf(condition)}
  }

  public pickPlayers(who: string, players: string[], count: PickCount = 1, condition?: PickCondition) {
    return {id: this.uniqueId++, type: 'pickPlayers', who, options: players, count, condition: this.registeredConditions.indexOf(condition)}
  }

  // // could we just use pick instead?
  // public pickButton(who, buttons, count: PickCount = 1, condition?: PickCondition) {
  //   return {id: this.uniqueId++, type: 'pickButtons', who, options: buttons, count, condition: this.registeredConditions.indexOf(condition)}
  // }

  public validateResult(command: PickCommand, result: any[]) {
    Util.assert(!(result instanceof Promise), 'missing "await" before pick command')

    Util.assert(Array.isArray(result), 'result is not an array')

    for (let i = 0; i < result.length; ++i) {
      // this may be due to global variables for not using the Game.random() functions
      Util.assert(command.options.indexOf(result[i]) !== -1, 'the result contains options which were not in the original command')
    }

    if (result.length > 0 && command.condition >= 0) {
      const conditionFn = this.registeredConditions[command.condition]
      Util.assert(conditionFn(this, result), 'result does not meet the command conditions')
    }

    // TODO validate the number of results against the count
    // TODO recursively validate the options (as they may be further commands)
  }

  private static parseCount(count: PickCount, countMax?: number): [number, number] {
    let min = 1, max = 1
    let countMin = 0

    if (Array.isArray(count)) {
      if (count.length > 0) {
        min = Math.min(...count)
        max = Math.max(...count)
      }
    } else if (typeof count === 'number') {
      min = max = count
    }

    if (typeof countMax !== 'undefined') {
      return [Util.clamp(min, countMin, countMax), Util.clamp(max, countMin, countMax)]
    } else {
      return [Math.max(min, countMin), Math.max(max, countMin)]
    }
  }

  public static play(setup, rules, scoreFn, playerClients) {
    let g = new Game(setup, rules, Object.keys(playerClients), {debug: true})

    let itr = rules()
    itr.next()
    let result = itr.next(g)

    while (!result.done) {
      // TODO support multiple options
      const bestOptions = playerClients[result.value.who](g, result.value, scoreFn)
      g.validateResult(result.value, bestOptions)
      g.history.push(bestOptions)
      result = itr.next(bestOptions)
    }
  }

  public static consoleClient() {
    return function(g: Game, command: PickCommand, scoreFn: (Game, string) => number): string[][] {
      const count = Game.parseCount(command.count)
      const conditionFn = command.condition >= 0 ? g.registeredConditions[command.condition] : null

      console.log(g.toString())
      if (count[0] === count[1]) {
        console.log(`Choose ${count[0]}`)
      } else {
        console.log(`Choose between ${count[0]} and ${count[1]}`)
      }

      let choices = []
      let hasValidChoice = false

      while (!hasValidChoice) {
        let selected
        let options = command.options.slice()
        choices = []

        while (choices.length < count[1] && selected !== -1) {
          selected = ReadlineSync.keyInSelect(options, 'Which option? ')
          if (selected !== -1) {
            choices.push(options[selected])
            options.splice(selected, 1)
          }
        }

        // quitting whithout meeting the minimum
        if (choices.length < count[0]) {
          return []
        }

        hasValidChoice = !conditionFn || conditionFn(g, choices)
        if (!hasValidChoice) {
          console.log(`choice ${choices} is invalid`)
        }
      }

      return choices
    }
  }

  private static getValidCombinations(g: Game, command: PickCommand): string[][] {
    const n = command.options.length
    const count = Game.parseCount(command.count, n)

     // TODO think of a way to speed this up when there is no condition
    // if (command.condition < 0) {
    //   return Util.getRandomCombination(command.options, count[0], count[1])
    // }

    let combinations = Util.getCombinations(command.options, count[0], count[1])

    if (command.condition >= 0) {
      let conditionFn = g.registeredConditions[command.condition]
      combinations = combinations.filter(x => conditionFn(g, x))
    }

    return combinations
  }

  // TODO separate this random from the games random (maybe have a random in game)
  public static randomClient() {

    return function(g: Game, command: PickCommand, scoreFn: (Game, string) => number): string[] {
      let combinations = Game.getValidCombinations(g, command)
      if (combinations.length === 0) {
        return [] // no options, exit
      } else {
        const j = Util.randomInt(0, combinations.length)
        return combinations[j]
      }
    }
  }

  // public static bruteForceClient(depth: number): any {
  //
  //   return function(g: Game, command: PickCommand, scoreFn: (Game, string) => number): string[] {
  //     let scores = Game.exhaustiveScoreOptions(g, command.id, command.options, command.who, scoreFn, depth)
  //     let count = Game.parseCount(command.count)
  //
  //     // once all of the options have been tried pick the best
  //     Util.fisherYates(scores) // shuffle so we don't always pick the first option if the scores are the same
  //     scores.sort((a,b) => b.score - a.score) // sort by highest score
  //
  //     const choices = scores.slice(0, count[1]) // always take the max
  //     return scores[0].optionIndex
  //   }
  // }

  // TODO depth may be better as a number of rounds, rather than a number of questions
  public static monteCarloClient(depth: number, iterations: number): any {

    return function(g: Game, command: PickCommand, scoreFn: (Game, string) => number): string[] {
      // this pick combination list will be used at the beginning of all trials
      const pickCombinations = Game.getValidCombinations(g, command)
      const n = pickCombinations.length

      if (n === 0) {
        return [] // no options, exit
      }

      let totals = Array(n).fill(0)

      // multiply by n to ensure we try each pickCombination the same number
      // of times
      for (let k = 0; k < iterations*n; ++k) {
        let {trial, trialItr, trialResult} = Game.createTrial(g)
        let candidates = []

        // attempt 'depth' turns of the game
        let pickIndex = k % n
        let choice

        for (let j = 0; j < depth && !trialResult.done; ++j) {
          choice = []
          if (j === 0) {
            choice = pickCombinations[pickIndex]
          } else {
            const combinations = Game.getValidCombinations(trial, trialResult.value)
            if (combinations.length > 0) {
              const randomIndex = Util.randomInt(0, combinations.length)
              choice = combinations[randomIndex]
            }
          }
          candidates.push(choice)
          trial.validateResult(trialResult.value, choice)
          trialResult = trialItr.next(choice)
        }

        // find our score relative to the best opponent score at the end
        // of this trial
        let trialScore = Game.getRelativeScore(trial, command.who, scoreFn)

        totals[pickIndex] += trialScore
      }

      // take the option with the best overall score (all pickCombinations were
      // trialled the same number of times so we don't need to calculate an
      // average)
      const bestPickIndex = Util.maxIndex(totals)
      return pickCombinations[bestPickIndex]
    }
  }

  private static findAverageScore(scores: {optionIndex: number, score: number}[]): number {
    let scoreTotal = scores.reduce((t,x) => t + x.score, 0)
    return scoreTotal/scores.length
  }

  private static findBestScore(scores: {optionIndex: number, score: number}[]): number {
    return scores.reduce((m, x) => Math.max(m, x.score), scores[0].score)
  }

  // we build a new game, and play the replay through that game
  // once the replay is ended try a new option
  private static createTrial(g): {trial: any, trialItr: any, trialResult: any} {
    // TODO should place and card be internal constructs of the game, and all
    // custom data must be managed through allValues?
    // TODO ugly
    let trial = new Game(g.setupFn, g.rules, g.playerChain.toArray(), {}, g.seed) // TODO to save space, should we share the cards?

    let trialItr = g.rules()
    let trialResult = trialItr.next()
    trialResult = trialItr.next(trial)

    // run through the playback results
    let replayIndex = 0
    while (!trialResult.done && g.history[replayIndex]) {
      let choice = g.history[replayIndex++]
      trial.history.push(choice)
      trial.validateResult(trialResult.value, choice)
      trialResult = trialItr.next(choice)
    }

    return {trial, trialItr, trialResult}
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

  private static exhaustiveScoreOptions(g: Game, id: number, options: any[], player: string, scoreFn: (Game, string) => number, depth: number): {optionIndex: number, score: number}[] {
    let opponent = g.playerChain.next(player) // TODO loop over all players
    let scores = []

    options.forEach((option, i) => {
      let {trial, trialItr, trialResult} = Game.createTrial(g)

      // try this option
      if (!trialResult.done) {
        trialResult = trialItr.next([id, i])
      }

      // either get scores by running further trials, or get the score from
      // this trial
      if (!trialResult.done && depth > 1) {
        let subScores = Game.exhaustiveScoreOptions(trial, trialResult.value.id, trialResult.value.options, trialResult.value.who, scoreFn, depth - 1)
        // TODO is it better to use the median score? or the lowest score? or the higest score?
        // should we score the ai player differently from their opponent?
        scores.push({optionIndex: i, score: Game.findBestScore(subScores)})

        // if (trialResult.value.who === player) {
        //   scores.push({optionIndex: i, score: findBestScore(subScores)})
        // } else {
        //   scores.push({optionIndex: i, score: findAverageScore(subScores)})
        // }
      } else {
        scores.push({optionIndex: i, score: scoreFn(trial, player) - scoreFn(trial, opponent)})
      }
    })

    return scores
  }

}
