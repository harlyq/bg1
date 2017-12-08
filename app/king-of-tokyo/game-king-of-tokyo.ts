import {Game, ICardData, IPlayerData, ILocationData} from '../system/game'
import {Util} from '../system/util'

const PLAYERS = ['A', 'B', 'C', 'D', 'E', 'F']
const MONSTERS = ['The King', 'Meka Dragon', 'Giga Zaur', 'Alienoid', 'Cyber Bunny', 'Kraken']
const MAX_DICE = 8

class KoTPlayer implements IPlayerData {
  health: number = 10
  victoryPoints: number = 0
  poison: number = 0
  shrink: number = 0
}

class KoTDice implements ICardData {
  value: string = 'Heart'
  faces: string[] = ['Heal', 'Attack', '3', '1', 'Energy', '2'] // Format 1,2,3,4,5,6
}

class KoTCard implements ICardData {
  constructor(params: KoTCard) {
    Object.assign(this, params)
  }

  mimic?: number = 0
  smoke?: number = 0
  cost: number = 0
  keep: boolean = false
}

class KoTLocation implements ILocationData {
  constructor(params: KoTLocation) {
    Object.assign(this, params)
  }

  maxCount?: number = 0
  faceUp?: string[] // TODO remove this
}

class KingOfTokyo extends Game {
}

const LOCATIONS = [{
  name: 'tokyo',
  bounds: 'kot-game.svg#tokyo',
  layout: 'single',
},{
  name: 'tokyoBay',
  bounds: 'kot-game.svg#tokyoBay',
  layout: 'single',
},{
  name: 'board',
  bounds: 'kot-game.svg#board',
  image: 'kot-pieces.json#board'
},{
  name: 'energy',
  bounds: 'kot-game.svg#energy',
  layout: 'stack',
},{
  name: 'cards',
  bounds: 'kot-game.svg#cards',
  layout: 'stack',
},{
  name: 'discard',
  bounds: 'kot-game.svg#discard',
  layout: 'stack',
},{
  name: 'market',
  bounds: 'kot-game.svg#market',
  maxCount: 3,
  layout: 'lots',
},{
  name: 'dice',
  bounds: 'kot-game.svg#dice',
  layout: 'fan'
},{
  name: 'diceroll',
  bounds: 'kot-game.svg#diceroll',
  layout: 'fan',
},{
  name: 'dicekeep',
  bounds: 'kot-game.svg#dicekeep',
  layout: 'fan',
},{
  name: 'handA',
  bounds: 'kot-game.svg#handA',
  layout: 'fan',
},{
  name: 'energyA',
  bounds: 'kot-game.svg#energyA',
  layout: 'pile',
},{
  name: 'handB',
  bounds: 'kot-game.svg#handB',
  layout: 'fan',
},{
  name: 'energyB',
  bounds: 'kot-game.svg#energyB',
  layout: 'pile',
},{
  name: 'handC',
  bounds: 'kot-game.svg#handC',
  layout: 'fan',
},{
  name: 'energyC',
  bounds: 'kot-game.svg#energyC',
  layout: 'pile',
},{
  name: 'handD',
  bounds: 'kot-game.svg#handD',
  layout: 'fan',
},{
  name: 'energyD',
  bounds: 'kot-game.svg#energyD',
  layout: 'pile',
},{
  name: 'handE',
  bounds: 'kot-game.svg#handE',
  layout: 'fan',
},{
  name: 'energyE',
  bounds: 'kot-game.svg#energyE',
  layout: 'pile',
},{
  name: 'handF',
  bounds: 'kot-game.svg#handF',
  layout: 'fan',
},{
  name: 'energyF',
  bounds: 'kot-game.svg#energyF',
  layout: 'pile',
}]

const CARDS = [{
  name: 'shrinkRay',
  cost: 6,
  keep: true,
  front: 'kot-pieces.json#shrinkRay',
  back: 'kot-pieces.json#back',
},{
  name: 'telepath',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#telepath',
  back: 'kot-pieces.json#back',
},{
  name: 'gourmet',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#gourmet',
  back: 'kot-pieces.json#back',
},{
  name: 'opportunist',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#opportunist',
  back: 'kot-pieces.json#back',
},{
  name: 'heal',
  cost: 3,
  keep: false,
  front: 'kot-pieces.json#heal',
  back: 'kot-pieces.json#back',
},{
  name: 'rootingForTheUnderdog',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'mimic',
  cost: 8,
  keep: true,
  front: 'kot-pieces.json#mimic',
  back: 'kot-pieces.json#back',
},{
  name: 'commuterTrain',
  cost: 4,
  keep: false,
  front: 'kot-pieces.json#commuterTrain',
  back: 'kot-pieces.json#back',
},{
  name: 'energyHoarder',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#energyHoarder',
  back: 'kot-pieces.json#back',
},{
  name: 'freezeTime',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'omnivore',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'regeneration',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'wereOnlyMakingItStronger',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'apartmentBuilding',
  cost: 5,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'plotTwist',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'tanks',
  cost: 4,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'highAltitudeBombing',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'extraHead{i}',
  cost: 7,
  keep: true,
  front: 'kot-pieces.json#extraHead',
  back: 'kot-pieces.json#back',
  count: 2
},{
  name: 'nuclearPowerPlant',
  cost: 6,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'wings',
  cost: 6,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'giantBrain',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'rapidHealing',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'herbivore',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'poisonQuills',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'alphaMonster',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'friendOfChildren',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'jetFighters',
  cost: 5,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'monsterBatteries',
  cost: 2,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'nationalGuard',
  cost: 3,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'alien',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'fireBlast',
  cost: 3,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'urbavore',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'spikedTail',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'healingRay',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'frenzy',
  cost: 7,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'stretchy',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'metamorph',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'smokeCloud',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'herdCuller',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'fireBreathing',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'evenBigger',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'gasReginery',
  cost: 6,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'evacuationOrders{i}',
  cost: 7,
  keep: false,
  front: 'kot-pieces.json#evacuationOrders',
  back: 'kot-pieces.json#back',
  count: 2
},{
  name: 'vastStorm',
  cost: 6,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'dedicatedNewsTeam',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'acidAttack',
  cost: 6,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'jets',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'plasticTentacles',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'deathFromAbove',
  cost: 5,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'camouflage',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'itHasAChild',
  cost: 7,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'poisonSpit',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'backgroundDweller',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'armorPlating',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'cornerStore',
  cost: 3,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'novaBreath',
  cost: 7,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'madeInALab',
  cost: 2,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'psychicProbe',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'burrowing',
  cost: 5,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'eaterOfTheDead',
  cost: 4,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'skyscraper',
  cost: 6,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'solarPowered',
  cost: 2,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'energize',
  cost: 8,
  keep: false,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'completeDestruction',
  cost: 3,
  keep: true,
  front: 'kot-pieces.json#{name}',
  back: 'kot-pieces.json#back',
},{
  name: 'dice{i}',
  value: 'heart',
  faces: ['heart', 'claw', '3', '1', 'lightning', '2'],
  front: 'kot-pieces.json#diceBlack',
  count: 8,
}]

const SIMPLE_ACTIONS = {
  'energize': {energy: 9},
  'skyscraper': {victoryPoints: 4},
  'cornerStore': {victoryPoints: 1},
  'gasRefinery': {victoryPoints: 2, otherDamage: 3},
  'evenBigger': {heal: 2},
  'fireBlast': {otherDamage: 2},
  'nationalGuard': {victoryPoints: 2, selfDamage: 2},
  'jetFighters': {victoryPoints: 5, selfDamage: 4},
  'nuclearPowerPlant': {victoryPoints: 2, heal: 3},
  'highAltitudeBombing': {otherDamage: 3, selfDamage: 3},
  'tanks': {victoryPoints: 4, selfDamage: 3},
  'apartmentBuilding': {victoryPoints: 3},
  'commuterTrain': {victoryPoints: 2},
  'heal': {heal: 2},
}

function setup(g: KingOfTokyo, numberOfPlayers: number) {
  for (let i = 0; i < numberOfPlayers; ++i) {
    const player = PLAYERS[i]
    g.addPlayer(player, new KoTPlayer)
    g.addLocation('hand' + player)
    g.addLocation('energy' + player)
  }

  g.addLocation('tokyo')
  g.addLocation('tokyoBay')
  g.addLocation('energy')
  g.addLocation('cards')
  g.addLocation('discard')
  g.addLocation('market', new KoTLocation({maxCount: 3}))
  g.addLocation('dice')

  for (let i = 0; i < MAX_DICE; ++i) {
    g.addCard('dice', 'dice' + i, new KoTDice)
  }

  g.addCard('cards', 'mimic', new KoTCard({cost: 8, keep: true}))
  g.addCard('cards', 'rooting for the underdog', new KoTCard({cost: 3, keep: true}))
  g.addCard('cards', 'heal', new KoTCard({cost: 3, keep: false}))
  g.addCard('cards', 'opportunist', new KoTCard({cost: 3, keep: true}))
  g.addCard('cards', 'gourmet', new KoTCard({cost: 4, keep: true}))
  g.addCard('cards', 'telepath', new KoTCard({cost: 4, keep: true}))
  g.addCard('cards', 'shrink ray', new KoTCard({cost: 6, keep: true}))
  g.addCard('cards', 'commuter train', new KoTCard({cost: 4, keep: true}))
}

function rules() {
  let player = this.getRandomPlayer()
  let winner

  while (!winner) {
    this.roll(player)
    this.buy(player)

    player = this.getNextPlayer(player)
  }

}

function resolveMimic(cards: string[]) {
  let resolvedCards = cards.slice()
  let mimicIndex = resolvedCards.indexOf('mimic')
  if (mimicIndex !== -1) {
    resolvedCards[mimicIndex] = this.mimicCard
  }
  return resolvedCards
}

function roll(player: string) {
  let numDice = 6
  const playerCards = this.resolveMimic(this.getCards('hand' + player))

  numDice += playerCards.filter(card => card.subStr('extraHead') !== -1).length()

  this.moveCards(this.getCards(card => card.substr('dice') !== 0), 'diceroll', numDice)
  this.roll('diceroll')

  let options = []
  if (playerCards.indexOf('plotTwist')) {
    options.push(this.pickCards(player, 'plotTwist', 1)) // if this card was mimic'ed it may be in another player's hand
  }

  // there are some cards that can be activated at any time, need to
  options.push(this.pickCards(this.getCards('diceroll'), []))

  if (this.hasCard('hand'+player, 'plotTwist')) {

  }
  if (this.hasCard('hand'+player, 'minic') && this.mimic === 'plotTwist') {

  }
}

function holdsCard(player: string, card: string): boolean {
  const location = 'hand' + player
  return this.hasCard(location, card) || (this.mimic === card && this.hasCard(location, 'mimic'))
}

function getPlayerFromLocation(location: string): string {
  let player = location.substr(-1)
  console.assert(PLAYERS.indexOf(player) !== -1, `Unable to find player '${player}' from location '${location}'`)
  return player
}

async function test(player: string) {
  // determine the number of dice
  let numDice = 6
  let playerData = this.getPlayerData(player)
  numDice += this.countCards('hand'+player, 'extraHead*') // card => card.substr('extraHead')
  numDice += this.mimic === 'extraHead' && this.countCards('hand'+player, 'mimic') ? 1 : 0
  numDice -= playerData.shrink

  // standard 3 rerolls
  // returns the actual cards moved
  let playerDice = this.moveCards('dice*', 'diceroll', numDice)

  for (let roll = 3; roll > 0; roll--) {
    await this.rollDice(player, playerDice)
  }

  // special card rerolls or picks
  let rollModifierPicks = []
  let chosenModifiers = []

  do {
    let plotTwistLocation = this.findCardLocation('plotTwist')
    if (chosenModifiers.indexOf('plotTwist') === -1 && plotTwistLocation.substr('hand') === 0) {
      rollModifierPicks.push(this.pickCards(getPlayerFromLocation(plotTwistLocation), 'plotTwist', [0,1]))
    }
    if (playerData.smoke > 0) {
      rollModifierPicks.push(this.pick(player, 'smokeScreen', [0,1]))
    }
    if (chosenModifiers.indexOf('telepath') === -1 && playerData.energy >= 1 && this.countCards('hand'+player, 'telepath')) {
      rollModifierPicks.push(this.pickCards(player, 'telepath', [0,1]))
    }
    if (playerData.energy >= 2 && this.countCards('hand'+player, 'stretchy')) {
      rollModifierPicks.push(this.pickCards(player, 'stretchy', [0,1]))
    }

    if (rollModifierPicks.length > 0) {
      let rollResults = await this.pickAll(rollModifierPicks)

      if (deepFind(rollResults, 'plotTwist')) {
        await changeOneDice(getPlayerFromLocation(plotTwistLocation), 'dicekeep')
        chosenModifiers.push('plotTwist')
      }

      if (deepFind(rollResults, 'smokeScreen')) {
        await rollDice(player, playerDice)
        --playerData.smoke
        chosenModifiers.push('smokeScreen')
      }

      if (deepFind(rollResults, 'telepath')) {
        await rollDice(player, playerDice)
        playerData.energy -= 1
        chosenModifiers.push('telepath')
      }

      if (deepFind(rollResults, 'stretchy')) {
        await changeOneDice(player, 'dicekeep')
        chosenModifiers.push('stretchy')
        playerData.energy -= 2
      }
    }
  } while (rollModifierPicks.length > 0)

}

function playTelepath(player) {
  let playerData = this.getPlayerData(player)
  let cardData = this.getCardData('telepath')

  if (!cardData.used && playerData.energy >= 1 && this.countCards('hand'+player, 'telepath')) {
    return this.pickCards(player, 'telepath', [0,1]).then(async result => {
      if (result.length > 0) {
        playerData.energy -= 1
        cardData.used = true
        await rollDice(player, this.getCards('diceroll')) // do we want ot let the player move dice from dicekeep to diceroll before re-rolling?
      }
    })
  }
}

async function rollDice(player, playerDice) {
  this.roll('diceroll')

  // if second param is a location, then get the cards from that location
  let cards = await this.pickCards(player, playerDice, [0, -1])
  cards.forEach(card => this.moveCards(card, this.countCards('diceroll', card) ? 'dicekeep' : 'diceroll')) // swap dice between dicekeep and diceroll
}

async function changeOneDice(player, location) {

}

async function rollOneDice(player, dice) {

}

// loops will block forever
function deepFind(list, value): boolean {
  return list.any(x => value === x || (Array.isArray(value) && deepFind(value, x)))
}
