import {Game} from '../system/game'
import Util from '../system/util' // TODO should we use {Util}?
import {Chain} from '../system/chain'

const MAX_GOLD = 100
const TAKE_GOLD_AMOUNT = 2
const DISTRICT_COLORS = ['yellow', 'blue', 'green', 'red', 'purple']

// TODO can be put the setup into the constructor? Would make initialization
// slightly easier
class Citadels extends Game {
  endDistrictSize: number // don't do initialization here, it must be in setup()
  characters: string[]
  assassinated: string // victim of Assassin
  crowned: string // current king. Should this be a card?
  robbed: string // victim of Thief
  thief: string
  tricked: string // victim of Magician
}

function buildCondition(g: Game, player: string, choices: string[]): boolean {
  const money = g.getCardCount('money_'+player)
  const totalCost = choices.reduce((sum, x) => sum + g.getCardData(x).cost, 0)
  return totalCost <= money
}

// TODO should we just use classes?  Saves a lot of 'g.' and 'g:Game' and easier to extend variables
// NO because g. becomes this., and we can extend the Game for the new variables
function setup(g: Citadels) {
  const allPlayers = g.getAllPlayers()
  g.addLocation('character')
  g.addLocation('discard')
  g.addLocation('district')
  g.addLocation('chooseDistrict') // temp place for pick x from n distrcts
  g.addLocation('bank')

  for (let player of allPlayers) {
    g.addLocation('money_'+player)
    g.addLocation('district_'+player)
    g.addLocation('hand_'+player)
    g.addLocation('character_'+player)
  }

  g.characters = ['Assassin', 'Thief', 'Magician', 'King', 'Bishop', 'Merchant', 'Architect', 'Warlord']
  for (let character of g.characters) {
    g.addCard('character', character)
  }

  for (let i = 0; i < MAX_GOLD; ++i) {
    g.addCard('bank', 'g'+i)
  }

  const districtCards = [
    [1, "Dragon Gate", "purple", 6],
    [1, "University", "purple", 6],
    [1, "School of Magic", "purple", 6],
    [1, "Library", "purple", 6],
    [1, "Great Wall", "purple", 6],
    [1, "Laboratory", "purple", 5],
    [1, "Graveyard", "purple", 5],
    [1, "Smithy", "purple", 5],
    [1, "Observatory", "purple", 5],
    [2, "Keep", "purple", 3],
    [1, "Haunted City", "purple", 2],
    [2, "Cathederal", "blue", 5],
    [3, "Monastery", "blue", 3],
    [3, "Church", "blue", 2],
    [3, "Temple", "blue", 1],
    [2, "Town Hall", "green", 5],
    [3, "Harbor", "green", 4],
    [3, "Docks", "green", 3],
    [3, "Trading Post", "green", 3],
    [4, "Market", "green", 2],
    [5, "Tavern", "green", 1],
    [3, "Palace", "yellow", 5],
    [4, "Castle", "yellow", 4],
    [5, "Manor", "yellow", 3],
    [2, "Fortress", "red", 5],
    [3, "Battlefield", "red", 3],
    [3, "Prison", "red", 2],
    [2, "watchtower", "red", 2],
  ]

  for (let districtCard of districtCards) {
    const count = districtCard[0] as number
    const name = districtCard[1]
    const color = districtCard[2]
    const cost = districtCard[3] as number
    let score = cost
    if (name === 'Dragon Gate' || name === 'University') {
      score = cost + 2
    }

    for (let i = 0; i < count; ++i) {
      g.addCard('district', '' + name + (i > 0 ? '.' + (i + 1) : ''), {color, cost, score})
    }
  }

  g.registerCondition(buildCondition)

  g.endDistrictSize = 8
  g.assassinated = ''
  g.robbed = ''
  g.crowned = ''
  g.thief = ''
  g.tricked = ''
}

async function rules(g: Citadels) {
  const allPlayers = g.getAllPlayers()
  const playerChain = new Chain(allPlayers)
  let lastRound = false
  g.crowned = Util.randomValue(allPlayers)

  g.shuffle('district')

  while (!lastRound) {
    await chooseCharacters(g)

    let player = g.crowned
    for (let i = 0; i < allPlayers.length; ++i) {
      await round(g, player)
      lastRound = isLastRound(g)
      player = playerChain.next(player)
    }
  }

  const ranks = g.rankPlayers(getScore)
  g.debugLog(`Winner is '${ranks[0]}'`)
}

async function chooseCharacters(g: Citadels) {
  const allPlayers = g.getAllPlayers()
  const playerChain = new Chain(allPlayers)
  const numPlayers = g.getAllPlayers().length

  g.moveCards(g.characters, 'character', Game.ALL)
  g.shuffle('character')
  g.moveCards(['King'], 'character', 1, Game.BOTTOM) // king must never be at the top of the character deck
  // TODO add faceup and 2-3 player rules g.move('character', 'discard', 1) // faceup
  g.move('character', 'discard', g.getCardCount('character') - numPlayers - 1) // facedown

  let player = g.crowned
  for (let i = 0; i < numPlayers; ++i) {
    const roles = await g.pickCards(player, g.getCards('character'), 1) // faceup during the pick
    g.moveCards(roles, 'character_'+player, 1)
    player = playerChain.next(player)
  }
  console.assert(g.getCardCount('character') === 1)
  g.move('character', 'discard', Game.ALL) // facedown

  g.robbed = ''
  g.thief = ''
  g.assassinated = ''
  g.tricked = ''
}

async function round(g: Citadels, player: string) {
  for (let character of g.characters) {
    if (character !== g.assassinated) {
      let player = getPlayerWithCharacter(g, character)
      if (player !== '') {
        await turn(g, character, player)

        await g.debugRender() // HACK
      }
    }
  }
}

async function turn(g: Citadels, character: string, player: string) {
  if (character === g.robbed) {
    console.assert(g.thief !== '')
    g.move('money_'+g.robbed, 'money_'+g.thief, Game.ALL)
  }

  if (character === 'King') {
    g.crowned = player
  }

  let income = calculateIncome(g, character, player)
  g.move('bank', 'money_'+player, income)

  // TODO is there a simpler way to handle retry, do we need to?
  let results = [false, false, false]
  while (!results[0] && !results[1]) {
    // pick action
    let goldAction: Promise<boolean> = takeGold(g, player)
    let drawAction: Promise<boolean> = drawCards(g, player)
    let magicianAction: Promise<boolean> = magicianSwap(g, character, player)

    results = await g.pickGroup([goldAction, drawAction, magicianAction])
  }

  if (character === 'Merchant') {
    g.move('bank', 'money_'+player, 1)
  }

  if (character === 'Architect') {
    g.move('district', 'district_'+player, 2)
  }

  // build
  results = [false, false]
  while (!results[0]) {
    let buildAction: Promise<boolean> = buildDistricts(g, character, player)
    let magicianAction: Promise<boolean> = magicianSwap(g, character, player)
    results = await g.pickGroup([buildAction, magicianAction])
  }

  // end turn
  results = [false, false, false]
  while (!results[0]) {
    let warlordAction: Promise<boolean> = warlordDestroy(g, character, player)
    let magicianAction: Promise<boolean> = magicianSwap(g, character, player)
    let endAction: Promise<boolean> = endTurn(g, player)
    results = await g.pickGroup([endAction, warlordAction, magicianAction])
  }
}

async function takeGold(g: Citadels, player: string): Promise<boolean> {
  let actionComplete = false
  let results = await g.pickLocations(player, ['bank'], 1)
  if (results) {
    g.move('bank', 'money_'+player, TAKE_GOLD_AMOUNT)
    actionComplete = true
  }
  return actionComplete
}

async function drawCards(g: Citadels, player: string): Promise<boolean> {
  let actionComplete = false
  let results = await g.pickLocations(player, ['district'], 1)
  if (results) {
    let topCards = g.move('district', 'chooseDistrict', 2)
    let pickedCards = await g.pickCards(player, topCards, 1) // faceUp
    if (pickedCards) {
      g.moveCards(pickedCards, 'hand_'+player, Game.ALL)
      g.move('chooseDistrict', 'district', Game.ALL, Game.BOTTOM, Game.BOTTOM) // place on the bottom of the district deck
      actionComplete = true
    }
  }
  return actionComplete
}

async function buildDistricts(g: Citadels, character: string, player: string): Promise<boolean> {
  let actionComplete = false
  let buildLimit = 1
  if (character === 'Architect') {
    buildLimit = 3
  }

  let buildOptions = []
  const money = g.getCardCount('money_'+player)
  const builtDistricts = g.getCards('district_'+player).map(district => getDistrictType(district))
  for (let card of g.getCards('hand_'+player)) {
    if (getDistrictCost(g, card) <= money) {
      if (builtDistricts.indexOf(getDistrictType(card)) === -1) {
        buildOptions.push(card)
      }
    }
  }

  if (buildOptions.length > 0) {
    let builds = await g.pickCards(player, buildOptions, [0, buildLimit], buildCondition)
    if (builds) {
      if (builds.length > 0) {
        g.moveCards(builds, 'district_'+player, Game.ALL)
      }
      actionComplete = true
    }
  } else {
    actionComplete = true
  }

  return actionComplete
}

// does nothing if not a magician or the magican's action has already been taken
async function magicianSwap(g: Citadels, character: string, player: string): Promise<boolean> {
  let actionComplete = false

  if (character === 'Magician' && !g.tricked) {
    let results = await g.pickLocations(player, ['character_'+player], 1)
    if (results) {
      let opponents = Util.removeValue(g.getAllPlayers(), player)
      let targets = await g.pickPlayers(player, opponents, 1)
      if (targets) {
        g.tricked = targets[0]
        g.swap('hand_'+player, 'hand_'+g.tricked)
        actionComplete = true
      }
    }
  }

  return actionComplete
}

function getWarlordTargetDistricts(g: Citadels, warlord: string): string[] {
  const warlordGold = g.getCardCount('money_'+warlord)
  let targetDistricts = []
  for (let player of g.getAllPlayers()) {
    if (getPlayerCharacter(g, player) !== 'Bishop' && !isDistrictComplete(g, player)) {
      for (let district of g.getCards('district_'+player)) {
        if (getDistrictCost(g, district) - 1 <= warlordGold) {
          targetDistricts.push(district)
        }
      }
    }
  }
  return targetDistricts
}

// does nothing if not a warlord
async function warlordDestroy(g: Citadels, character: string, player: string): Promise<boolean> {
  let actionComplete = false

  if (character === 'Warlord') {
    const warlordTargets = getWarlordTargetDistricts(g, player)
    if (warlordTargets.length > 0) {
      let results = await g.pickLocations(player, ['character_'+player], 1)
      if (results) {
        let destroys = await g.pickCards(player, warlordTargets, 1)
        if (destroys) {
          let cost = getDistrictCost(g, destroys[0])
          console.assert(cost > 0)
          g.move('money_'+player, 'bank', cost - 1)
          g.moveCards(destroys, 'district', -1, Game.BOTTOM) // facedown
          actionComplete = true
        }
      }
    }
  }

  return actionComplete
}

async function endTurn(g: Citadels, player: string): Promise<boolean> {
  let results = await g.pick(player, ['END_TURN'], 1)
  return typeof results !== 'undefined'
}

function calculateIncome(g: Citadels, character: string, player: string): number {
  let incomeColor = ''
  switch (character) {
    case 'King': incomeColor = 'yellow'; break
    case 'Bishop': incomeColor = 'blue'; break
    case 'Merchant': incomeColor = 'green'; break
    case 'Warlord': incomeColor = 'red'; break
  }

  let income = 0
  if (incomeColor) {
    const districts = g.getCards('district_'+player)
    for (let district of districts) {
      if (isColor(g, district, incomeColor)) {
        ++income
      }
      if (district === 'School of Magic') {
        ++income
      }
    }
  }

  return income
}

function isColor(g: Citadels, district: string, color: string) {
  let cardData = g.getCardData(district)
  if (cardData.color === color) {
    return true
  }
}

function isDistrictComplete(g: Citadels, player: string): boolean {
  return g.getCardCount('district_'+player) >= g.endDistrictSize
}

function getPlayerCharacter(g: Citadels, player: string): string {
  return g.getCards('character_'+player)[0]
}

function isLastRound(g: Citadels): boolean {
  for (let player of g.getAllPlayers()) {
    if (isDistrictComplete(g, player)) {
      return true
    }
  }
  return false
}

function getPlayerWithCharacter(g: Citadels, role: string): string {
  for (let player of g.getAllPlayers()) {
    if (g.getCards('character_'+player)[0] === role) {
      return player
    }
  }
  return ''
}

function getDistrictCost(g: Citadels, district: string): number {
  let card = g.getCardData(district)
  console.assert(card, `district '${district}' does not exist`)
  return card.cost
}

function getDistrictScore(g: Citadels, district: string): number {
  let card = g.getCardData(district)
  console.assert(card, `district '${district}' does not exist`)
  return card.score
}

function getDistrictType(district: string): string {
  return district.split('.')[0]
}

function hasAllColors(g: Citadels, districts: string[]): boolean {
  let allColors = true
  for (let color of DISTRICT_COLORS) {
    let hasColor = false
    for (let district of districts) {
      if (isColor(g, district, color)) {
        hasColor = true
        break
      }
    }
    if (!hasColor) {
      allColors = false
      break
    }
  }

  return allColors
}

function getScore(g: Citadels, player: string): number[] {
  const districts = g.getCards('district_'+player)
  const totalDistrictValue = districts.reduce((sum, x) => sum + getDistrictScore(g, x), 0)
  const eightDistrictBonus = districts.length >= g.endDistrictSize ? 2 : 0
  const firstEightDistrictBonus = 0 // TODO
  const allColorsBonus = hasAllColors(g, districts) ? 3 : 0
  const moneyValue = g.getCardCount('money_'+player)

  return [totalDistrictValue + eightDistrictBonus + firstEightDistrictBonus + allColorsBonus, totalDistrictValue, moneyValue]
}

import {GameSystem} from '../system/gamesystem'
import {BGGame} from '../ui/game-ui'
import * as m from 'mithril'

let playerClients = {
  'a': GameSystem.randomClient(), //GameSystem.monteCarloClient(1, 1), // Game.consoleClient(),
  'b': GameSystem.randomClient() // Game.consoleClient()
}

let gs = new GameSystem(setup, rules, getScore, playerClients, {debug: true, saveHistory: true})
const content = document.getElementById('content')

function render() {
  m.render(content, m(BGGame, {gamesystem: gs}))
}

gs.run(() => requestAnimationFrame(render))
