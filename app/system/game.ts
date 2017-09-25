import {Util} from './util'
import {Chain} from './chain'
// import * as ReadlineSync from 'readline-sync'
//import * as MersenneTwister from 'mersenne-twister' // HACK not a module
import * as seedrandom from 'seedrandom'
//let fs = require('fs');


export interface IPlayer {
  name: string
  data?: any
}

interface ICard {
  name: string
  value?: any
  data?: ICardData
}

interface IDice extends ICard {
  faces: any[]
}

export interface ILocationData {
  faceUp?: string[]
}

export interface ICardData {

}

interface ILocation {
  name: string
  value?: any
  cards?: string[]
  data?: ILocationData
}

type CardLocation = [ILocation, number]

export type PickCount = number | number[]

export type PickCondition = (g: Game, player: string, list: string[], conditionArg?: any) => boolean

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
  data?: any
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
  public static TOP = -1 // should be const
  public static BOTTOM = 0 // should be const
  public static ALL = -1 // should be const

  data: IGameState = {
    allCards: {},
    allLocations: {},
    allPlayers: {},
    allValues: {}
  }

  name: string = ''
  registeredConditions: PickCondition[] = []
  history: {[who: string]: string[][]} = {}
  uniqueId: number = 0
  lastPickId: number = -1
  options: {debug: boolean} = {debug: false}
  setupFn: (Game) => void
  rules: any
  playerChain = new Chain()
  seed: number
  private random: seedrandom
  cacheFindLocationName: string
  pickFn: (commands: IPickCommand[]) => Promise<string[]>
  render: any
  pickCommands: IPickCommand[] = []
  clientPromises: Promise<string[]>[] = []
  isRunning: boolean = false

  // TODO move this
  highlights: string[] = []
  onHumanPicked: (results: string[]) => void
  commands: IPickCommand[] = []

  // the pickFn takes a list of commands for a given 'who', and returns a list
  // of choices that completely satisfy at least one of the commands
  constructor(name: string, pickFn?: (commands: IPickCommand[]) => Promise<string[]>, setupFn?: (Game) => void, rules?, playerNames?: string[], options?: IGameOptions, seed: number = Date.now()) {
    this.name = name
    this.pickFn = pickFn
    this.setupFn = setupFn
    this.rules = rules
    this.seed = seed
    this.random = seedrandom(seed, {state: true})

    this.history = {}

    // TODO where is the best place to do this?
    if (Array.isArray(playerNames)) {
      playerNames.forEach(x => this.addPlayer(x))
    }

    if (options) {
      this.options = Util.mergeJSON({}, options)
    }

    if (setupFn) {
      setupFn(this)
    }

    if (this.render && this.options.debug) {
      this.render()
    }
  }

  public getStateRef(): IGameState {
    return this.data
  }

  // take a snapshot of the cards, locations and values
  public takeSnapshot(): IGameState {
    return Util.mergeJSON({}, this.data)
  }

  // rollback the cards, locations and values to the last checkpoint
  public rollbackSnapshot(snapshot: IGameState) {
    this.data = Util.mergeJSON({}, snapshot)
  }

  public debugLog(msg) {
    if (this.options.debug) {
      console.log(msg)
    }
  }

  public async debugRender(): Promise<void> {
    if (this.render && this.options.debug) {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          this.render()
          resolve()
        })
      })
    } else {
      return Promise.resolve()
    }
  }

  // returns integer in the range (min, max]
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random()*(max - min) + min)
  }

  public randomValue<T>(list: T[]): T {
    return list[this.randomInt(0, list.length)]
  }

  private fisherYates<T>(list: T[]): T[] {
    let n = list.length
    for (var i = 0; i < n - 1; ++i) {
      var j = this.randomInt(i, n)
      Util.swapElements(list, i, j)
    }
    return list
  }

  public getHistory(who: string): string[][] {
    return this.history[who]
  }

  static filterThingsInternal<T>(dbg: string, fn: string | string[] | ((string, any) => boolean), things: {[name: string]: T & INamed}): (T & INamed)[] {
    if (typeof fn === 'function') {
      let results: (T & INamed)[] = []
      for (let key in things) {
        console.assert(!!things[key], `unknown ${dbg} '${key}'`)
        if (things[key] && fn(key, things[key].data)) {
          results.push(things[key])
        }
      }
      return results
    } else if (typeof fn === 'string') {
      console.assert(!!things[fn], `unknown ${dbg} '${fn}'`)
      if (things[fn]) {
        return [things[fn]]
      }
    } else if (Array.isArray(fn)) {
      const list: string[] = fn
      return list.map(r => {
        console.assert(!!things[r], `unknown ${dbg} '${r}'`)
        return things[r]
      }).filter(x => x) // the output is the same order as the input
    }
    return []
  }

  static filterThings<T>(dbg: string, name: string | string[] | ((INamed) => boolean), things: {[name: string]: T & INamed}): string[] {
    const results = Game.filterThingsInternal<T>(dbg, name, things)
    return results.map(x => x.name)
  }

  // TODO is Value still needed, or do we just put the properties on the class directly?
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

  public filterCards(cardName: CardName): string[] {
    return Game.filterThings('card', cardName, this.data.allCards)
  }

  public getCards(locationName: LocationName): string[] {
    const locations: ILocation[] = Game.filterThingsInternal('location', locationName, this.data.allLocations)
    let cards: string[] = []
    for (let place of locations) {
      for (let cardName of place.cards) {
        cards.push(cardName)
      }
    }
    return cards
  }

  public getCardsByWho(locationName: LocationName, who: string): string[] {
    const locations: ILocation[] = Game.filterThingsInternal('location', locationName, this.data.allLocations)
    let cards: string[] = []
    for (let place of locations) {
      const faceUp = (who === 'DEBUG') || (place.data && Array.isArray(place.data.faceUp) && place.data.faceUp.indexOf(who) !== -1)
      for (let cardName of place.cards) {
        cards.push(faceUp ? cardName : '?')
      }
    }
    return cards
  }

  public getCardCount(locationName: LocationName): number {
    const locations: ILocation[] = Game.filterThingsInternal('location', locationName, this.data.allLocations)
    let length = 0
    for (let place of locations) {
      length += place.cards.length
    }
    return length
  }

  public getCardData(cardName: string): any {
    const card = this.data.allCards[cardName]
    console.assert(typeof card !== 'undefined', `unable to find card '${cardName}'`)
    return card.data
  }

  public mergeCardData(cardName: string, data: any): any {
    const card = this.data.allCards[cardName]
    console.assert(typeof card !== 'undefined', `unable to find card '${cardName}'`)
    card.data = card.data || {}
    for (let key in data) {
      card.data[key] = data[key]
    }
  }

  public getLocationData(locationName: string): any {
    const location = this.data.allLocations[locationName]
    console.assert(typeof location !== 'undefined', `unable to find location '${locationName}'`)
    return location.data
  }

  public mergeLocationData(locationName: string, data: any) {
    const location: ILocation = this.data.allLocations[locationName]
    console.assert(typeof location !== 'undefined', `unable to find location '${locationName}'`)
    location.data = location.data || {}
    for (let key in data) {
      location.data[key] = data[key]
    }
  }

  public getPlayerData(playerName: string): any {
    const player: IPlayer = this.data.allLocations[playerName]
    console.assert(typeof player !== 'undefined', `unable to find player '${playerName}'`)
    return player.data
  }

  public mergePlayerData(playerName: string, data: any) {
    const player: IPlayer = this.data.allLocations[playerName]
    console.assert(typeof player !== 'undefined', `unable to find player '${playerName}'`)
    player.data = player.data || {}
    for (let key in data) {
      player.data[key] = data[key]
    }
  }

  public filterLocations(locationName: LocationName): string[] {
    return Game.filterThings('location', locationName, this.data.allLocations)
  }

  public filterPlayers(playerName: PlayerName): string[] {
    return Game.filterThings('player', playerName, this.data.allPlayers)
  }

  public getAllPlayers(): string[] {
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
    let card = this.data.allCards[cardName]
    return card
  }

  private addPlayerInternal(player: IPlayer): Game {
    console.assert(!this.data.allPlayers[player.name], `Player (${player.name}) already exists`)
    console.assert(!this.data.allCards[player.name], `Player (${player.name}) conflicts with an existing Card`)
    console.assert(!this.data.allLocations[player.name], `Player (${player.name}) conflicts with an existing Location`)
    this.data.allPlayers[player.name] = player
    this.playerChain.add(player.name)
    return this
  }

  public addPlayer(name: string, data?: any): Game {
    this.addPlayerInternal({name, data})
    return this
  }

  public getPlayerCount(): number {
    return this.playerChain.getLength()
  }

  private addLocationInternal(place: ILocation) {
    console.assert(!this.data.allLocations[place.name], `Location (${place.name}) already exists`)
    console.assert(!this.data.allCards[place.name], `Location (${place.name}) conflicts with an existing Card`)
    console.assert(!this.data.allPlayers[place.name], `Location (${place.name}) conflicts with an existing Player`)
    this.data.allLocations[place.name] = place
    if (!Array.isArray(place.cards)) {
      place.cards = []
    }
  }

  public addLocation(locationName: string, locationData?: ILocationData): Game {
    // TODO assert that place.name is unique??
    const location = {name: locationName, data: locationData, cards: []}
    this.addLocationInternal(location)
    return this
  }

  private addCardInternal(card: ICard, to: ILocation, index: number) {
    console.assert(!this.data.allCards[card.name], `Card (${card.name}) already exists`)
    console.assert(!this.data.allLocations[card.name], `Card (${card.name}) conflicts with an existing Location`)
    console.assert(!this.data.allPlayers[card.name], `Card (${card.name}) conflicts with an existing Player`)
    this.insertCard(card, to, index)
    this.data.allCards[card.name] = card
    this.debugLog(`addCard ${card.name} to ${to.name}`)
  }

  public addCard(locationName: string, cardName: string, cardData?: ICardData, index: number = -1): Game {
    // TODO assert that card.name is unique??
    const card = {name: cardName, data: cardData}
    const location = this.data.allLocations[locationName]
    console.assert(typeof location !== 'undefined', `location '${locationName}' does not exist`)
    this.addCardInternal(card, location, index)
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
  public moveCards(cardName: CardName, toName: LocationName, count: number = -1, toIndex: Index = -1): string[] {
    if (count === 0) {
      return []
    }

    const cards: ICard[] = Game.filterThingsInternal('card', cardName, this.data.allCards)
    const tos: ILocation[] = Game.filterThingsInternal('location', toName, this.data.allLocations)
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
      this.debugLog(`moveCard ${card.name} to ${tos[iTo].name} at ${toIndices[iToIndex]}`)

      // iterate over the 'tos' first, then the 'toIndices'
      if (++iTo >= tos.length) {
        iTo = 0
        iToIndex = (iToIndex + 1) % toIndices.length
      }
    }

    if (this.render && this.options.debug) {
      this.render()
    }

    return cards.map(card => card.name)
  }

  // we iterate over 'from' then 'fromIndex' and at the same time iterate over
  // 'to' and 'toIndex'
  public move(fromName: LocationName, toName: LocationName, count: number = 1, fromIndex: Index = -1, toIndex: Index = -1): string[] {
    if (count === 0) {
      return []
    }

    const froms: ILocation[] = Game.filterThingsInternal('location', fromName, this.data.allLocations)
    const tos: ILocation[] = Game.filterThingsInternal('location', toName, this.data.allLocations)
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
      console.assert(froms[iFrom] !== tos[iTo] || ((fromIndices[iFromIndex] === 0 || fromIndices[iFromIndex] === -1) && (toIndices[iToIndex] === 0 || toIndices[iToIndex] === -1)))

      // not all locations have cards
      card = this.removeCard(froms[iFrom], fromIndices[iFromIndex])
      if (card) {
        this.insertCard(card, tos[iTo], toIndices[iToIndex])
        this.debugLog(`moveCard ${card.name} to ${tos[iTo].name} at ${toIndices[iToIndex]}`)

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

    if (this.render && this.options.debug) {
      this.render()
    }

    return cardsMoved.map(card => card.name)
  }

  public shuffle(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = Game.filterThingsInternal('location', name, this.data.allLocations) // should only have 0 or 1 entries
      console.assert(locations.length > 0, `unable to find place - ${name}`)
      this.fisherYates(locations[0].cards)

      this.debugLog(`shuffle ${name}`)
    }

    if (this.render && this.options.debug) {
      this.render()
    }

    return this
  }

  public swap(fromName: LocationName, toName: LocationName): Game {
    let fromCards = this.getCards(fromName)
    let toCards = this.getCards(toName)

    if (fromCards.length > 0) {
      this.moveCards(fromCards, toName, -1)
    }

    if (toCards.length > 0) {
      this.moveCards(toCards, fromName, -1)
    }

    return this
  }

  public reverse(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = Game.filterThingsInternal('location', name, this.data.allLocations) // should only have 0 or 1 entries
      console.assert(locations.length > 0, `reverse: unable to find place '${name}'`)
      locations[0].cards.reverse()

      this.debugLog(`reverse ${name}`)
    }

    if (this.render && this.options.debug) {
      this.render()
    }

    return this
  }

  public roll(place: LocationName): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = Game.filterThingsInternal('location', name, this.data.allLocations) // should only have 0 or 1 entries
      console.assert(locations.length > 0, `roll: unable to find place '${name}'`)
      for (let card of locations[0].cards) {
        let dice = this.data.allCards[card] as IDice
        if (dice.faces && Array.isArray(dice.faces)) { // NOTE may match some things which are not dice
          dice.value = dice.faces[this.randomInt(0, dice.faces.length)]
        }
      }
      this.debugLog(`roll ${name}`)
    }

    if (this.render && this.options.debug) {
      this.render()
    }

    return this
  }

  public sort(place: LocationName, sortFn: (a: string, b: string) => number): Game {
    const locationNames = Array.isArray(place) ? place : [place]

    for (let name of locationNames) {
      const locations = Game.filterThingsInternal('location', name, this.data.allLocations) // should only have 0 or 1 entries
      console.assert(locations.length > 0, `sort: unable to find place - ${name}`)
      locations[0].cards.sort(sortFn)
      this.debugLog(`sort ${name}`)
    }

    if (this.render && this.options.debug) {
      this.render()
    }

    return this
  }

  public toString(): string {
    const allCards = Object.keys(this.data.allCards).map(key => this.data.allCards[key]) // Object.values(this.allCards)
    let str = `CARDS (${allCards.length}) = ${allCards.map(c => c.name).join(',')}\n`
    for (let locationName in this.data.allLocations) {
      const place = this.data.allLocations[locationName]
      str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => {
        const card = this.data.allCards[c]
        return c + (card.value ? `[${card.value.toString()}]` : '')
      }).join(',')}\n`
    }
    return str
  }

  public toStringSimple(): string {
    let str = ''
    for (let locationName in this.data.allLocations) {
      const place = this.data.allLocations[locationName]
      if (place.cards.length > 0) {
        str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => {
          const card = this.data.allCards[c]
          return c + (card.value ? `[${card.value.toString()}]` : '')
        }).join(',')}\n`
      }
    }
    return str
  }

  public async pickGroup<TAll>(pickPromises: Iterable<TAll | PromiseLike<TAll>>): Promise<TAll[]> {
    return await Promise.all(pickPromises)
  }

  private async pickInternal(type: string, who: string, options: string[], count: PickCount, condition?: PickCondition, conditionArg?: any): Promise<string[]> {
    console.assert(typeof who !== 'undefined' && who !== '')
    console.assert(Array.isArray(options))

    const command = {id: this.uniqueId++, type, who, options, count, condition: this.registeredConditions.indexOf(condition), conditionArg}
    this.pickCommands.push(command)

    return new Promise<string[]>((resolve) => {

      // we may receive several pick requests in the same frame, these are
      // pushed onto 'pickCommands', the Promise.resolve() is used to process the
      // commands once all of them have been received.
      // We place the commands into buckets, sorted by 'who', so that each call
      // to the pickFn is for a single 'who'
      Promise.resolve().then(async () => {
        // batch commands by 'who'
        const commandBuckets: {[who: string]: IPickCommand[]} = Util.makeBuckets(this.pickCommands, (command) => command.who)
        console.assert(Object.keys(commandBuckets).length > 0)

        // build a set of promises for all 'who's that have been received
        // in the same frame
        const needPromise = this.lastPickId !== this.uniqueId
        if (needPromise) {
          // perform a separate pick request per 'who'
          this.clientPromises = []
          for (let who in commandBuckets) {
            this.clientPromises.push(this.pickFn(commandBuckets[who]))
          }
          this.lastPickId = this.uniqueId
        }

        // Each command waits on the same set of promises, all results will
        // be the same for a given set
        // results => string[chosen option][who]
        const results: string[][] = await Promise.all(this.clientPromises)
        console.assert(results.length === Object.keys(commandBuckets).length)

        if (needPromise) {
          for (let who in commandBuckets) {
            // TODO fix history
//            this.history[who].push(results[who])
          }
        }

        // there is one item in results per 'who'
        const who = command.who
        const whoIndex = Object.keys(commandBuckets).indexOf(who)
        console.assert(whoIndex !== -1)
        const whoResults: string[] = results[whoIndex]

        // if the results are compatible with the command, then use the results
        // (this means that multiple commands may return the same result)
        let choice
        if (this.isValidResult(command, whoResults)) {
          choice = whoResults
          this.debugLog(`player ${who} ${type} '${choice}' from [${options}]`)
        }

        // remove processed command from pickCommands
        const j = this.pickCommands.indexOf(command)
        console.assert(j !== -1)
        this.pickCommands.splice(j, 1)

        resolve(choice)
      })
    })
  }

  // TODO provide an enum for the type
  public async pick(who: string, options: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any): Promise<string[]> {
    return await this.pickInternal('pick', who, options, count, condition, conditionArg)
  }

  public async pickCards(who: string, cards: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any): Promise<string[]> {
    return await this.pickInternal('pickCards', who, cards, count, condition, conditionArg)
  }

  public async pickLocations(who: string, locations: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any): Promise<string[]> {
    return await this.pickInternal('pickLocations', who, locations, count, condition, conditionArg)
  }

  public async pickPlayers(who: string, players: string[], count: PickCount = 1, condition?: PickCondition, conditionArg?: any): Promise<string[]> {
    return await this.pickInternal('pickPlayers', who, players, count, condition, conditionArg)
  }

  // // could we just use pick instead?
  // public pickButton(who, buttons, count: PickCount = 1, condition?: PickCondition) {
  //   return {id: this.uniqueId++, type: 'pickButtons', who, options: buttons, count, condition: this.registeredConditions.indexOf(condition)}
  // }

  public isValidResult(command: IPickCommand, results: any[]): boolean {
    for (let val of results) {
      if (command.options.indexOf(val) === -1) {
        return false
      }
    }

    if (results.length > 0 && command.condition >= 0) {
      const conditionFn = this.registeredConditions[command.condition]
      if (!conditionFn(this, command.who, results, command.conditionArg)) {
        return false
      }
    }

    let [min, max] = Game.parseCount(command.count, command.options.length)
    if (results.length < min || results.length > max) {
      return false
    }

    return true
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

  // returns the players ranked from top to bottom. Note, some players may be
  // ranked equally
  public rankPlayers(scoreFn: (g: Game, player: string) => number | number[]): string[] {
    const allPlayers = this.getAllPlayers()
    const scores = allPlayers.map(player => scoreFn(this, player))
    let sortedScores = scores.slice().sort(Array.isArray(scores[0]) ? Game.compareScoreArray : Game.compareScore)
    return scores.map(score => allPlayers[sortedScores.indexOf(score)])
  }

  // sort an array of numbers, highest to lowest
  private static compareScoreArray(a: number[], b: number[]): number {
    console.assert(a.length === b.length)
    let compare = 0
    for (let i = 0; i < a.length && compare === 0; ++i) {
      compare = b[i] - a[i]
    }
    return compare
  }

  // sort numbers highest to lowest
  private static compareScore(a: number, b: number): number {
    return b - a
  }
}
