import Util from './util'
import {Chain} from './chain'
// import * as ReadlineSync from 'readline-sync'
//import * as MersenneTwister from 'mersenne-twister' // HACK not a module
import * as seedrandom from 'seedrandom'
//let fs = require('fs');

export interface IPlayer {
  name: string
}

export interface ICard {
  name: string
  value?: any
  [others: string]: any
}

export interface IDice extends ICard {
  faces: any[]
}

export interface ILocation {
  name: string
  value?: any
  cards?: string[]
  [others: string]: any
}

type CardLocation = [ILocation, number]

type PickCount = number | number[]

type PickCondition = (g: Game, player: string, list: string[], conditionArg?: any) => boolean

export interface IPickCommand {
  id: number // starts from 0
  type: string
  who: string
  options: string[]
  count: PickCount
  condition?: number
  conditionArg?: any
}

type CardFilterFn = (ICard) => boolean
type LocationFilterFn = (ILocation) => boolean
type PlayerFilterFn = (IPlayer) => boolean
type CardName = string | string[] | CardFilterFn
type LocationName = string | string[] | LocationFilterFn
type PlayerName = string | string[] | PlayerFilterFn
type Index = number | number[]

interface INamed {
  name: string
}

export interface IGameOptions {
  debug?: boolean
  saveHistory?: boolean
}

// must not contain references or classes
export interface IGameState {
  allCards: {[name: string]: ICard}
  allLocations: {[name: string]: ILocation}
  allPlayers: {[name: string]: IPlayer}
  allValues: {[key: string]: any}
}

export class Game {
  data: IGameState = {
    allCards: {},
    allLocations: {},
    allPlayers: {},
    allValues: {}
  }

  registeredConditions: PickCondition[] = []
  history: any[] = []
  uniqueId: number = 0
  options: {debug: boolean} = {debug: false}
  setupFn: (Game) => void
  rules: any
  playerChain = new Chain()
  seed: number
  private random: seedrandom
  cacheFindLocationName: string
  pickFn: (command: IPickCommand) => Promise<string[]>
  render: any
  [others: string]: any

  constructor(pickFn: (command: IPickCommand) => Promise<string[]>, setupFn?: (Game) => void, rules?, playerNames?: string[], options?: IGameOptions, seed: number = Date.now()) {
    this.pickFn = pickFn
    this.setupFn = setupFn
    this.rules = rules
    this.seed = seed
    this.random = seedrandom(seed, {state: true})

    //this.history.push(seed)

    // TODO where is the best place to do this?
    if (Array.isArray(playerNames)) {
      playerNames.forEach(x => this.addPlayer({name: x}))
    }

    if (options) {
      this.options = Util.copyJSON(options)
    }

    if (setupFn) {
      setupFn(this)
    }

    if (this.render) {
      this.render()
    }
  }

  public getStateRef(): IGameState {
    return this.data
  }

  // take a snapshot of the cards, locations and values
  public takeSnapshot(): IGameState {
    return Util.copyJSON(this.data)
  }

  // rollback the cards, locations and values to the last checkpoint
  public rollbackSnapshot(snapshot: IGameState) {
    this.data = Util.copyJSON(snapshot)
  }

  public debugLog(msg) {
    if (this.options.debug) {
      console.log(msg)
    }
  }

  // returns integer in the range (min, max]
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random()*(max - min) + min)
  }

  private fisherYates<T>(list: T[]): T[] {
    let n = list.length
    for (var i = 0; i < n - 1; ++i) {
      var j = this.randomInt(i, n)
      Util.swapElements(list, i, j)
    }
    return list
  }

  public getHistory(): any[] {
    return this.history
  }

  static filterThings<T>(name: string | string[] | ((INamed) => boolean), things: {[name: string]: T & INamed}): (T & INamed)[] {
    if (typeof name === 'function') {
      let results = []
      for (let key in things) {
        if (things[key] && name(things[key])) {
          results.push(things[key])
        }
      }
      return results
    } else if (typeof name === 'string') {
      if (things[name]) {
        return [things[name]]
      }
    } else if (Array.isArray(name)) {
      return name.map(r => things[r]).filter(x => x) // the output is the same order as the input
    }
    return []
  }

  public setValue(name: string, value: any) {
    this.data.allValues[name] = value
  }

  public getValue(name: string): any {
    return this.data.allValues[name]
  }

  public addValue(name: string, delta: number): any {
    this.data.allValues[name] = (this.data.allValues[name] || 0) + delta
    return this.data.allValues[name]
  }

  public toggleValue(name: string, delta: number): any {
    this.data.allValues[name] = !this.data.allValues[name]
    return this.data.allValues[name]
  }

  public registerCondition(condition: PickCondition): number {
    this.registeredConditions.push(condition)
    return this.registeredConditions.length - 1
  }

  public filterCards(cardName: CardName): ICard[] {
    return Game.filterThings(cardName, this.data.allCards)
  }

  public filterCardNames(cardName: CardName): string[] {
    return Game.filterThings(cardName, this.data.allCards).map(p => p.name)
  }

  public getCardByName(cardName: string): ICard {
    return this.data.allCards[cardName]
  }

  public getLocationByName(locationName: string): ILocation {
    return this.data.allLocations[locationName]
  }

  public getPlayerByName(playerName: string): IPlayer {
    return this.data.allPlayers[playerName]
  }

  public getCards(locationName: LocationName): ICard[] {
    const locations: ILocation[] = Game.filterThings(locationName, this.data.allLocations)
    let cards: ICard[] = []
    for (let place of locations) {
      for (let cardName of place.cards) {
        cards.push(this.getCardByName(cardName))
      }
    }
    return cards
  }

  public getCardNames(locationName: LocationName): string[] {
    return this.getCards(locationName).map(x => x.name)
  }

  public getCardCount(locationName: LocationName): number {
    const locations: ILocation[] = Game.filterThings(locationName, this.data.allLocations)
    let length = 0
    for (let place of locations) {
      length += place.cards.length
    }
    return length
  }

  public filterLocations(locationName: LocationName): ILocation[] {
    return Game.filterThings(locationName, this.data.allLocations)
  }

  public filterLocationNames(locationName: LocationName): string[] {
    return Game.filterThings(locationName, this.data.allLocations).map(p => p.name)
  }

  public filterPlayers(playerName: PlayerName): IPlayer[] {
    return Game.filterThings(playerName, this.data.allPlayers)
  }

  public filterPlayerNames(playerName: PlayerName): string[] {
    return Game.filterThings(playerName, this.data.allPlayers).map(p => p.name)
  }

  public getAllPlayerNames(): string[] {
    return Object.keys(this.data.allPlayers)
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

  private findLocation(card: ICard): CardLocation {
    const cardName = card.name

    // Find can be slow because it searches through every place, but we usually
    // look for cards in groups, so check the last place we looked for a card.
    // We could put a place index on each card, but this needs to be maintained
    // and we can't stop users from arbitrarily changing it, so better to
    // always search through all locations
    if (this.cacheFindLocationName) {
      const cacheFindLocation = this.data.allLocations[this.cacheFindLocationName]
      const i = cacheFindLocation.cards.indexOf(cardName)
      if (i !== -1) {
        return [cacheFindLocation, i]
      }
    }

    for (let name in this.data.allLocations) {
      const place = this.data.allLocations[name]
      const i = place.cards.indexOf(cardName)
      if (i !== -1) {
        this.cacheFindLocationName = place.name
        return [place, i]
      }
    }
    return [,-1]
  }

  // NOTE assumes card has already been removed from all locations
  private insertCard(card: ICard, to: ILocation, index: number) {
    if (index === -1 || index >= to.cards.length) {
      to.cards.push(card.name)
    } else {
      to.cards.splice(index, 0, card.name)
    }
  }

  private removeCard(from: ILocation, index: number): ICard {
    if (from.cards.length === 0) {
      return
    }

    let cardName: string
    if (index === -1 || index >= from.cards.length) {
      cardName = from.cards.splice(-1, 1)[0]
    } else {
      cardName = from.cards.splice(index, 1)[0]
    }
    console.assert(cardName.length > 0)
    let card = this.getCardByName(cardName)
    return card
  }

  public addPlayer(player: IPlayer): Game {
    console.assert(!this.data.allPlayers[player.name], `ICard (${player.name}) already exists`)
    this.data.allPlayers[player.name] = player
    this.playerChain.add(player.name)
    return this
  }

  public getPlayerCount(): number {
    return this.playerChain.getLength()
  }

  private addLocationInternal(place: ILocation) {
    console.assert(!this.data.allLocations[place.name], `ILocation (${place.name}) already exists`)
    this.data.allLocations[place.name] = place
    if (!Array.isArray(place.cards)) {
      place.cards = []
    }
  }

  public addLocation(place: ILocation | ILocation[]): Game {
    // TODO assert that place.name is unique??
    if (Array.isArray(place)) {
      for (let p of place) {
        this.addLocationInternal(p)
      }
    } else {
      this.addLocationInternal(place)
    }
    return this
  }

  private addCardInternal(card: ICard, to: ILocation, index: number) {
    console.assert(!this.data.allCards[card.name], `ICard (${card.name}) already exists`)
    this.insertCard(card, to, index)
    this.data.allCards[card.name] = card
  }

  public addCard(card: ICard | ICard[], to: ILocation, index: number = -1): Game {
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

  // public addDice(dice: IDice | IDice[], to: ILocation, index: number = -1): Game {
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
  public moveCards(cardName: CardName, toName: LocationName, count: number = -1, toIndex: Index = -1): ICard[] {
    const cards: ICard[] = this.filterCards(cardName)
    const tos: ILocation[] = this.filterLocations(toName)
    const toIndices: number[] = Array.isArray(toIndex) ? toIndex : [toIndex]

    console.assert(cards.length > 0, `unable to find cards "${cardName}"`)
    console.assert(tos.length > 0, `unable to find tos "${toName}"`)

    if (count === -1) {
      count = cards.length
    } else {
      count = Math.min(cards.length, count)
    }

    // TODO what if there is a limit on the number of cards at the destination
    let iTo = 0, iToIndex = 0
    for (let card of cards) {
      const [fromLocation, fromIndex] = this.findLocation(card)
      const cardRemoved = this.removeCard(fromLocation, fromIndex)
      console.assert(card === cardRemoved)

      this.insertCard(card, tos[iTo], toIndices[iToIndex])

      // iterate over the 'tos' first, then the 'toIndices'
      if (++iTo >= tos.length) {
        iTo = 0
        iToIndex = (iToIndex + 1) % toIndices.length
      }
    }

    if (this.render) {
      this.render()
    }

    return cards
  }

  // we iterate over 'from' then 'fromIndex' and at the same time iterate over
  // 'to' and 'toIndex'
  public move(fromName: LocationName, toName: LocationName, count: number = 1, fromIndex: Index = -1, toIndex: Index = -1): ICard[] {
    const froms: ILocation[] = this.filterLocations(fromName)
    const tos: ILocation[] = this.filterLocations(toName)
    const fromIndices: number[] = Array.isArray(fromIndex) ? fromIndex : [fromIndex]
    const toIndices: number[] = Array.isArray(toIndex) ? toIndex : [toIndex]

    console.assert(froms.length > 0, `unable to find froms "${fromName}"`)
    console.assert(tos.length > 0, `unable to find tos "${toName}"`)

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
    let cardsMoved = []

    do {
      // if we try to remove and insert from within a place, then the
      // indices will not be correct (because we are changing the cards)
      console.assert(froms[iFrom] !== tos[iTo] ||
         ((fromIndices[iFromIndex] === 0 || fromIndices[iFromIndex] === -1) &&
         (toIndices[iToIndex] === 0 || toIndices[iToIndex] === -1)))

      // not all locations have cards
      card = this.removeCard(froms[iFrom], fromIndices[iFromIndex])
      if (card) {
        this.insertCard(card, tos[iTo], toIndices[iToIndex])
        --count
        cardsMoved.push(card)
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

    if (this.render) {
      this.render()
    }

    return cardsMoved
  }

  public shuffle(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = this.filterLocations(name) // should only have 0 or 1 entries
      console.assert(locations.length > 0, `unable to find place - ${name}`)
      this.fisherYates(locations[0].cards)
    }
    return this
  }

  public reverse(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = this.filterLocations(name) // should have 0 or 1 entries
      if (locations.length > 0) {
        locations[0].cards.reverse()
      }
    }
    return this
  }

  public roll(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = this.filterLocations(name)
      if (locations.length > 0) {
        for (let card of locations[0].cards) {
          let dice = this.data.allCards[card] as IDice
          if (dice.faces && Array.isArray(dice.faces)) { // NOTE may match some things which are not dice
            dice.value = dice.faces[this.randomInt(0, dice.faces.length)]
          }
        }
      }
    }

    return this
  }

  public toString(): string {
    const allCards = Object.keys(this.data.allCards).map(key => this.data.allCards[key]) // Object.values(this.allCards)
    let str = `CARDS (${allCards.length}) = ${allCards.map(c => c.name).join(',')}\n`
    for (let locationName in this.data.allLocations) {
      const place = this.data.allLocations[locationName]
      str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => {
        const card = this.getCardByName(c)
        return c + (card.value ? `[${card.value.toString()}]` : '')
      }).join(',')}\n`
    }
    return str
  }

  public getCardPlacements(): string {
    let str = ''
    for (let locationName in this.data.allLocations) {
      const place = this.data.allLocations[locationName]
      if (place.cards.length > 0) {
        str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => {
          const card = this.getCardByName(c)
          return c + (card.value ? `[${card.value.toString()}]` : '')
        }).join(',')}\n`
      }
    }
    return str
  }

  // TODO provide an enum for the type
  public pick(who: string, options: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any) {
    return this.pickFn({id: this.uniqueId++, type: 'pick', who, options: options, count, condition: this.registeredConditions.indexOf(condition), conditionArg})
  }

  public pickCards(who: string, cards: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any) {
    return this.pickFn({id: this.uniqueId++, type: 'pickCards', who, options: cards, count, condition: this.registeredConditions.indexOf(condition), conditionArg})
  }

  public pickLocations(who: string, locations: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any) {
    return this.pickFn({id: this.uniqueId++, type: 'pickLocations', who, options: locations, count, condition: this.registeredConditions.indexOf(condition), conditionArg})
  }

  public pickPlayers(who: string, players: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any) {
    return this.pickFn({id: this.uniqueId++, type: 'pickPlayers', who, options: players, count, condition: this.registeredConditions.indexOf(condition), conditionArg})
  }

  // // could we just use pick instead?
  // public pickButton(who, buttons, count: PickCount = 1, condition?: PickCondition) {
  //   return {id: this.uniqueId++, type: 'pickButtons', who, options: buttons, count, condition: this.registeredConditions.indexOf(condition)}
  // }

  public validateResult(command: IPickCommand, result: any[]) {
    console.assert(!(result instanceof Promise), 'missing "await" before pick command')

    console.assert(Array.isArray(result), 'result is not an array')

    for (let i = 0; i < result.length; ++i) {
      // this may be due to global variables for not using the Game.random() functions
      console.assert(command.options.indexOf(result[i]) !== -1, `the result contains options (${result}) which were not in the original command (${command.options})`)
    }

    if (result.length > 0 && command.condition >= 0) {
      const conditionFn = this.registeredConditions[command.condition]
      console.assert(conditionFn(this, command.who, result, command.conditionArg), `result (${result}) does not meet the command conditions`)
    }

    // TODO validate the number of results against the count
    // TODO recursively validate the options (as they may be further commands)
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

  // public static consoleClient() {
  //   return function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number): string[][] {
  //     const count = Game.parseCount(command.count, command.options.length)
  //     const conditionFn = command.condition >= 0 ? g.registeredConditions[command.condition] : null
  //
  //     console.log(g.toString())
  //     if (count[0] === count[1]) {
  //       console.log(`Select ${count[0]} choice`)
  //     } else {
  //       console.log(`Select between ${count[0]} and ${count[1]} choices`)
  //     }
  //
  //     let choices = []
  //     let hasValidChoice = false
  //
  //     while (!hasValidChoice) {
  //       let options = command.options.slice()
  //       choices = []
  //
  //       while (choices.length < count[1]) {
  //         let selected = ReadlineSync.keyInSelect(options, 'Which option? ', {cancel: (count[0] === 0) ? 'CANCEL' : false})
  //         if (selected !== -1) {
  //           choices.push(options[selected])
  //           options.splice(selected, 1)
  //         } else if (choices.length >= count[0]) {
  //           break
  //         }
  //       }
  //
  //       // cancelled
  //       if (choices.length === 0) {
  //         return []
  //       }
  //
  //       hasValidChoice = !conditionFn || conditionFn(g, command.who, choices, command.conditionArg)
  //       if (!hasValidChoice) {
  //         console.log(`choice ${choices} is invalid`)
  //       }
  //     }
  //
  //     return choices
  //   }
  // }

  private static getValidCombinations(g: Game, command: IPickCommand): string[][] {
    const n = command.options.length
    const count = Game.parseCount(command.count, n)

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

  // TODO separate this random from the games random (maybe have a random in game)
  public static randomClient() {

    return function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number) {
      let combinations = Game.getValidCombinations(g, command)
      if (combinations.length === 0) {
        return [] // no options, exit
      } else {
        const j = Util.randomInt(0, combinations.length)
        return combinations[j]
      }
    }
  }

  // If there are multiple commands sent in the same frame, then process them
  // as parallel commands
  // TODO ensure we return one command pre owner
  public static testClient() {
    let parallelCommands = []
    let processedCommands = []
    let chosenCommand

    return async function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number) {
      parallelCommands.push(command)

      return new Promise((resolve) => {

        // this timeout will run once all the parallel commands have been
        // received for this frame
        setTimeout(() => {
          if (!chosenCommand) {
            const i = Util.randomInt(0, parallelCommands.length)
            chosenCommand = parallelCommands[i]
            processedCommands = []
          }

          let choice = [] // TODO should we differentiate between the chose nothing option, and an unchosen parallel?
          if (command === chosenCommand) {
            let combinations = Game.getValidCombinations(g, command)
            if (combinations.length > 0) {
              const j = Util.randomInt(0, combinations.length)
              choice = combinations[j]
            }
          }

          // if we've processed all commands, then reset the parallelCommands list
          processedCommands.push(command)
          if (processedCommands.length === parallelCommands.length) {
            chosenCommand = undefined
            parallelCommands = []
            processedCommands = []
          }

          resolve(choice)
        }, 0)
      })
    }
  }

  // public static bruteForceClient(depth: number): any {
  //
  //   return function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number): string[] {
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

    return function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number): string[] {
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

  public static historyClient(history: string[][]): any {
    return function(g: Game, command: IPickCommand, scoreFn: (Game, string) => number): string[] {
      console.log(g.toString())
      if (history.length === 0) {
        console.log('history completed')
        Util.quit()
      }
      return history.shift()
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
  private static createTrial(g, replayTo = -1): {trial: any, trialItr: any, trialResult: any} {
    // TODO should place and card be internal constructs of the game, and all
    // custom data must be managed through allValues?
    // TODO ugly
    // TODO replace pickFn with our trial function
    let trial = new Game(g.pickFn, g.setupFn, g.rules, g.playerChain.toArray(), {}, g.seed) // TODO to save space, should we share the cards?

    let trialItr = g.rules()
    let trialResult = trialItr.next()
    trialResult = trialItr.next(trial)

    // run through the playback results
    let replayIndex = 0
    while (!trialResult.done && g.history[replayIndex] && (replayTo === -1 || replayIndex < replayTo)) {
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

  public validateData() {
    for (let cardName in this.data.allCards) {
      let found = ''
      for (let locationName in this.data.allLocations) {
        const place = this.data.allLocations[locationName]
        const i = place.cards.indexOf(cardName)
        if (i !== -1) {
          console.assert(found === '')
          found = locationName
        }
      }
    }
  }

}
