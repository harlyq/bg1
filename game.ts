let Util = require('./util.js')

interface Player {
  name: string
}

interface Card {
  name: string
}

interface Dice extends Card {
  value?: any // is one of the faces[], if missing, will be set when added
  faces: any[]
}

interface Place {
  name: string
  cards?: Card[]
}

type CardPlace = [Place, number]

type PickCount = number | number[]

type PickCondition = (any) => boolean

interface PickCommand {
  id: number // starts from 0
  type: string
  who: string
  options: any[]
  count: PickCount
  condition?: number
}

type CardFilterFn = (Card) => boolean
type PlaceFilterFn = (Place) => boolean
type PlayerFilterFn = (Player) => boolean
type CardName = string | [string] | CardFilterFn
type PlaceName = string | [string] | PlaceFilterFn
type PlayerName = string | [string] | PlayerFilterFn
type Index = number | [number]
type CommandFn = (Game, command: PickCommand) => Promise<{}>

interface Named {
  name: string
}

class Game {
  allCards: Card[] = []
  allPlaces: Place[] = []
  allPlayers: Player[] = []
  registeredConditions: PickCondition[] = []
  allValues: {[key: string]: any} = {}
  onCommand: CommandFn // commands or just use pick?
  history: any[] = []
  uniqueId: number = 0

  constructor(onCommandFn?: CommandFn) {
    this.onCommand = onCommandFn
  }

  public getHistory(): any[] {
    return this.history
  }

  static getThings<T>(name: string | string[] | ((Named) => boolean), things: (T & Named)[]): (T & Named)[] {
    if (typeof name === 'function') {
      return things.filter(name)
    } else if (typeof name === 'string') {
      return things.filter(x => x.name === name)
    } else if (Array.isArray(name)) {
      return name.map(r => things.filter(x => x.name === r)[0]) // matches the order in name
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
    this.allValues.name = (this.allValues[name] || 0) + delta
    return this.allValues.name
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
    return Game.getThings(cardName, this.allCards)
  }

  public getCards(placeName: PlaceName): Card[] {
    const places: Place[] = Game.getThings(placeName, this.allPlaces)
    var cards = []
    for (let place of places) {
      if (place.cards.length > 0) {
        cards.push(...place.cards)
      }
    }
    return cards
  }

  public filterPlaces(placeName: PlaceName): Place[] {
    return Game.getThings(placeName, this.allPlaces)
  }

  public filterPlayers(playerName: PlayerName): Player[] {
    return Game.getThings(playerName, this.allPlayers)
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
    for (let place of this.allPlaces) {
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
    this.allPlayers.push(player)
    return this
  }

  private addPlaceInternal(place: Place) {
    this.allPlaces.push(place)
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
    this.allCards.push(card)
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
  //   for (var d of dice) {
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
      const ps = this.filterPlaces(name)
      if (ps.length > 0) {
        Util.fisherYates(ps[0].cards)
      }
    }
    return this
  }

  public reverse(place: PlaceName): Game {
    const placeNames = Array.isArray(place) ? place : [place]

    for (let name of placeNames) {
      const ps = this.filterPlaces(name)
      if (ps.length > 0) {
        ps[0].cards.reverse()
      }
    }
    return this
  }

  public roll(place: PlaceName): Game {
    const placeNames = Array.isArray(place) ? place : [place]

    for (let name of placeNames) {
      const ps = this.filterPlaces(name)
      if (ps.length > 0) {
        for (let card of ps[0].cards) {
          let dice = card as Dice
          if (dice.faces && Array.isArray(dice.faces)) { // NOTE may match some things which are not dice
            dice.value = dice.faces[Util.randomInt(0, dice.faces.length)]
          }
        }
      }
    }

    return this
  }

  public toString(): string {
    let str = `CARDS (${this.allCards.length}) = ${this.allCards.map(c => c.name).join(',')}\n`
    for (let place of this.allPlaces) {
      str += `${place.name} (${place.cards.length}) = ${place.cards.map(c => c.name).join(',')}\n`
    }
    return str
  }

  public pick(who, options, count: PickCount = 1, condition?: PickCondition): Promise<{}> {
    return this.onCommand(this, {id: this.uniqueId++, type: 'pick', who, options: options, count, condition: this.registeredConditions.indexOf(condition)})
  }

  public pickCards(who, cards, count: PickCount = 1, condition?: PickCondition): Promise<{}> {
    return this.onCommand(this, {id: this.uniqueId++, type: 'pickCards', who, options: cards, count, condition: this.registeredConditions.indexOf(condition)})
  }

  public pickPlaces(who, locations, count: PickCount = 1, condition?: PickCondition) {
    // const result = this.onCommand(this, {id: this.uniqueId++, type: 'pickPlaces', who, options: locations, count, condition: this.registeredConditions.indexOf(condition)})
    // this.history.push(result)
    // return result
    return {id: this.uniqueId++, type: 'pickPlaces', who, options: locations, count, condition: this.registeredConditions.indexOf(condition)}
  }

  public pickPlayers(who, players, count: PickCount = 1, condition?: PickCondition): Promise<{}> {
    return this.onCommand(this, {id: this.uniqueId++, type: 'pickPlayers', who, options: players, count, condition: this.registeredConditions.indexOf(condition)})
  }

  // could we just use pick instead?
  public pickButton(who, buttons, count: PickCount = 1, condition?: PickCondition): Promise<{}> {
    return this.onCommand(this, {id: this.uniqueId++, type: 'pickButtons', who, options: buttons, count, condition: this.registeredConditions.indexOf(condition)})
  }

  public validateResult(result: any[]) {
    if (result instanceof Promise) {
      throw new Error('missing "await" before pick command')
    }

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('result is not an array')
    }

    let command = result[0] as PickCommand
    if (!command.options || !Array.isArray(command.options) || command.options.length === 0) {
      throw new Error('original command is not the first element of the result')
    }

    for (let i = 1; i < result.length; ++i) {
      if (command.options.indexOf(result[i]) === -1) {
        throw new Error('the result contains options which were not in the original command')
      }
    }

    // TODO validate the number of results against the count
    // TODO recursively validate the options (as they may be further commands)
  }
}

export = Game
