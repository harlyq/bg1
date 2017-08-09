import {Game} from "../system/game"
import {GameSystem} from "../system/gamesystem"
import {Chain} from "../system/chain"
import {Graph} from "../system/graph"

//import {BGGame} from "../ui/game-ui"
//import * as m from "mithril"

const NUM_ARMIES_PER_PLAYER = 30
const NUM_NAVIES_PER_PLAYER = 12
const MAX_CARDS_PER_HAND = 3
const MIN_UNITS_TO_ATTACK = 2

const Action = {
  'ATTACK': 'ATTACK',
  'DISCARD': 'DISCARD',
  'MOVE_UNIT': 'MOVE_UNIT',
  'PLAY_CARD': 'PLAY_CARD',
  'TAKE_CARD': 'TAKE_CARD',
}

const COLORS = ['purple', 'red', 'orange', 'yellow', 'green']

const REGIONS = {
  'Britannia': ['Hibernia', 'Picts', 'Iceni', 'Britannia'],
  'Scandia': ['Scandia', 'Cimbria', 'Frisia', 'Longobardia', 'Vandalla', 'Chattia'],
  'Italia': ['Treveria', 'Alamannia', 'Rhaetia', 'Gallia Cisalpin', 'Noricum', 'Dalmatia', 'Italia', 'Cicilia'],
  'Gallia': ['Belgica', 'Lugudunensis', 'Aquitania', 'Narbonensis', 'Alpes'],
  'Germaia': ['Germania Magna', 'Sarmatia', 'Panonnia', 'Dacia'],
  'Hellas': ['Moesia', 'Macedonia', 'Achaia', 'Sarmatia Minor', 'Moesia Inf', 'Thracia'],
  'Iberia': ['Galacia', 'Lusitania', 'Baltica', 'Tarraconensis'],
  'Africa': ['Mauretania Tingitana', 'Mauretania Caesariensis', 'Numidia', 'Africa', 'Cyrenaica'],
}

const EUROPE_EDGES = [
  // land based
  'Picts.Iceni', 'Iceni.Britannia',
  'Sarmatia.Germania Magna', 'Germania Magna.Dacia', 'Dacia.Sarmatia',
  'Dacia.Panonnia', 'Germania Magna.Panonnia', 'Sarmatia.Sarmatia Minor',
  'Dacia.Sarmatia Minor', 'Dacia.Moesia Inf', 'Dacia.Moesia',
  'Panonnia.Dalmatia', 'Panonnia.Noricum', 'Germania Magna.Noricum',
  'Germania Magna.Rhaetia', 'Germania Magna.Chattia', 'Germania Magna.Vandalla',
  'Vandalla.Longobardia', 'Vandalla.Chattia', 'Longobardia.Cimbria',
  'Longobardia.Frisia', 'Longobardia.Chattia', 'Frisia.Chattia',
  'Frisia.Treveria', 'Frisia.Belgica', 'Chattia.Treveria', 'Chattia.Alamannia',
  'Chatia.Rhaetia', 'Treveria.Belgica', 'Treveria.Lugudunensis',
  'Treveria.Alpes', 'Treveria.Alamannia', 'Alamannia.Alpes', 'Alamannia.Gallia Cisalpin',
  'Alamannia.Rhaetia', 'Rhaetia.Gallia Cisalpin', 'Rhaetia.Noricum',
  'Noricum.Gallia Cisalpin', 'Noricum.Dalmatia', 'Dalmatia.Gallia Cisalpin',
  'Dalmatia.Moesia', 'Dalmatia.Macedonia', 'Gallia Cisalpin.Alpes',
  'Gallia Cisalpin.Italia', 'Moesia.Moesia Inf', 'Moesia.Macedonia',
  'Moesia.Thracia', 'Sarmatia Minor.Moesia Inf', 'Moesia Inf.Thracia',
  'Macedonia.Thracia', 'Macedonia.Achaia', 'Belgica.Lugudunensis',
  'Lugudunensis.Aquitania', 'Lugudunensis.Narbonensis', 'Lugudunensis.Alpes',
  'Aquitania.Tarraconensis', 'Aquitania.Narbonensis', 'Narbonensis.Alpes',
  'Narbonensis.Tarraconensis', 'Tarraconensis.Galacia', 'Tarraconensis.Lusitania',
  'Tarraconensis.Baltica', 'Galacia.Lusitania', 'Lusitania.Baltica',
  'Mauretania Tingitana.Mauretania Caesariensis', 'Mauretania Caesariensis.Numidia',
  'Numidia.Africa', 'Numidia.Cyrenaica',

  // Sea based
  'Irish Sea.Picts', 'Irish Sea.Celtic Sea', 'Irish Sea.Hibernia', 'Irish Sea.North Sea North',
  'Irish Sea.North Sea West', 'Irish Sea.Iceni', 'Irish Sea.Britannia', 'Celtic Sea.Hibernia',
  'Celtic Sea.Britannia', 'Celtic Sea.English Channel', 'Celtic Sea.Bay of Biscay',
  'Celtic Sea.Atlantic Ocean', 'Atlantic Ocena.Bay of Biscay', 'Atlantic Ocean.Alboran Sea',
  'Atlantic Ocean.Galacia', 'Atlantic Ocean.Lusitania', 'Bay of Biscay.Lugudunensis',
  'Bay of Biscay.Aquitania', 'Bay of Biscay.Tarraconensis', 'Bay of Biscay.Galacia',
  'Alboran Sea.Lusitania', 'Alboran Sea.Baltica', 'Alboran Sea.Mauretania Tingitana',
  'Alboran Sea.Tarraconensis', 'Alboran Sea.Mauretania Caesariensis', 'Alboran Sea.Balearic Sea West',
  'English Channel.Lugudunensis', 'English Channel.Belgica', 'English Channel.Britannia',
  'English Channel.Frisia', 'English Channel.North Sea West',
  'North Sea West.Britannia', 'North Sea West.Iceni', 'North Sea West.Picts',
  'North Sea West.Frisia', 'North Sea West.North Sea North', 'North Sea West.North Sea East',
  'North Sea North.Scandia', 'North Sea East.Frisia', 'North Sea East.Longobardia',
  'North Sea East.Cimbria', 'North Sea East.Scandia', 'North Sea East.Kattegat Sea',
  'Kattegat Sea.Scandia', 'Kattegat Sea.Cimbria', 'Kattegat Sea.Longobardia', 'Kattegat Sea.Vandalla',
  'Kattegat Sea.Germania Magna', 'Kattegat Sea.Baltic Sea', 'Baltic Sea.Scandia',
  'Baltic Sea.Sarmatia', 'Baltic Sea.Germania Magna', 'Balearic Sea West.Tarraconensis',
  'Balearic Sea West.Mauretania Caesariensis', 'Balearic Sea West.Balearic Sea North',
  'Balearic Sea West.Balearic Sea East', 'Balearic Sea North.Tarraconensis',
  'Balearic Sea North.Narbonensis', 'Balearic Sea North.Alpes',
  'Balearic Sea North.Gallia Cisalpin', 'Balearic Sea North.Tyrrhenian Sea North',
  'Balearic Sea East.Tyrrhenian Sea South', 'Balearic Sea East.Mauretania Caesariensis',
  'Balearic Sea East.Numidia', 'Tyrrhenian Sea North.Gallia Cisalpin',
  'Tyrrhenian Sea North.Italia', 'Tyrrhenian Sea North.Cicilia',
  'Tyrrhenian Sea North.Tyrrhenian Sea South', 'Tyrrhenian Sea North.Ionian Sea',
  'Tyrrhenian Sea South.Numidia', 'Tyrrhenian Sea South.Africa',
  'Tyrrhenian Sea South.Gulf of Gabes', 'Tyrrhenian Sea South.Cicilia',
  'Gulf of Gabes.Africa', 'Gulf of Gabes.Cicilia', 'Gulf of Gabes.Numidia',
  'Gulf of Gabes.Mediterranean Sea', 'Gulf of Gabes.Ionian Sea',
  'Ionian Sea.Italia', 'Ionian Sea.Cicilia', 'Ionian Sea.Mediterranean Sea',
  'Ionian Sea.Adriatic Sea', 'Ionian Sea.Achaia', 'Ionian Sea.Aegean Sea',
  'Adriatic Sea.Gallia Cisalpin', 'Adriatic Sea.Italia', 'Adriatic Sea.Dalmatia',
  'Adriatic Sea.Macedonia', 'Aegean Sea.Achaia', 'Aegean Sea.Macedonia',
  'Aegean Sea.Thracia', 'Mediterranean Sea.Numidia', 'Mediterranean Sea.Cyrenaica',
]

const ACTION_CARDS: {count: number, type: string}[] = [
  {count: 1, type: 'Britannia'},
  {count: 2, type: 'Scandia'},
  {count: 1, type: 'Gallia'},
  {count: 1, type: 'Germania'},
  {count: 2, type: 'Hellas'},
  {count: 1, type: 'Iberia'},
  {count: 3, type: 'Italia'},
  {count: 2, type: 'Africa'},
  {count: 3, type: 'Voyage'},
]

const ACTION_TABLE: {[action: string]: {cost: number, fn: (g: Game, player: string) => any}} = {
  'MOVE_UNIT': {cost: 1, fn: moveUnit},
  'TAKE_CARD': {cost: 1, fn: takeCard},
  'PLAY_CARD': {cost: 1, fn: playCard},
  'DISCARD': {cost: 1, fn: discardCard},
  'ATTACK': {cost: 2, fn: attackUnit}
}

let europe = new Graph()

const isWaterReg = /Sea|Gulf|Bay|Channel/
function isWater(sectorName: string): boolean {
  return isWaterReg.test(sectorName)
}

function getPlayerLocations(g: Game, player: string): string[] {
  const playerLocations = g.filterLocationNames(loc => {
    return loc.cards.length > 0 && loc.cards[0].owner === player
  })
  return playerLocations
}

function getEnemyLocations(g: Game, player: string): string[] {
  const enemyLocations = g.filterLocationNames(loc => {
    return loc.cards.length > 0 && loc.cards[0].owner !== player
  })
  return enemyLocations
}

function isPlayerLocation(g: Game, player: string, location: string): boolean {
  return g.getCards(location).filter(iCard => iCard.owner === player).length > 0
}

function isNavyLocation(g: Game, location: string): boolean {
  return g.getCards(location).filter(iCard => iCard.type === 'navy').length  > 0
}

function isArmyLocation(g: Game, location: string): boolean {
  return g.getCards(location).filter(iCard => iCard.type === 'army').length  > 0
}

function getLocationOwner(g: Game, location: string): string {
  let iCards = g.getCards(location)
  if (iCards.length > 0) {
    return iCards[0].owner
  }
}

function setup(g: Game) {
  // create map of europe
  for (let edge of EUROPE_EDGES) {
    europe.addEdge({name: edge, sectors: edge.split('.')})
  }
  europe.resolveSectors()
  console.log(europe.getSectors().sort())

  // validate land based section names
  for (let region in REGIONS) {
    for (let sector of REGIONS[region]) {
      console.assert(typeof europe.getSector(sector) === 'object', `could not find sector ${sector}`)
    }
  }

  g.addLocation(europe.getSectors().map(sector => { return {name: sector} }))


  let drawLocation = {name: 'draw'}
  g.addLocation(drawLocation)
  g.addLocation({name: 'discard'})

  // create action cards
  for (let cardSet of ACTION_CARDS) {
    for (let i = 0; i < cardSet.count; ++i) {
      g.addCard({name: `${cardSet.type}${i}`, type: `${cardSet.type}`}, drawLocation)
    }
  }
  g.shuffle('draw')

  let colorIndex = 0
  for (let player of g.getAllPlayerNames()) {
    let playerHand = {name: `${player}_hand`}
    let armyLocation = {name: `${player}_amries`}
    let navyLocation = {name: `${player}_navies`}

    g.addLocation([playerHand, armyLocation, navyLocation])

    for (let i = 0; i < NUM_ARMIES_PER_PLAYER; ++i) {
      g.addCard({name: `${player}_army_${i}`, kind: 'army', color: COLORS[colorIndex], owner: player}, armyLocation)
    }

    for (let i = 0; i < NUM_NAVIES_PER_PLAYER; ++i) {
      g.addCard({name: `${player}_navy_${i}`, kind: 'navy', color: COLORS[colorIndex], owner: player}, navyLocation)
    }

    ++colorIndex
  }

  console.log('setup')
}

function* rules() {
  let g = yield // TODO g should be passed as a parameter to the function, not through a yield
  let player = g.getAllPlayerNames()[0]

  let winner
  while (!winner) {
    yield* round(g, player)

    // a player can only win on their turn
    if (isWinner(g, player)) {
      winner = player
    }
    player = g.allPlayers.next(player)
  }

  g.debugLog(g.toString())
  g.debugLog(`Player ${player} won`)
}

function* round(g: Game, player: string) {
  let actionPoints = 3

  while (actionPoints > 0) {
    let possibleActions = []
    for (var action in ACTION_TABLE) {
      if (actionPoints >= ACTION_TABLE[action].cost) {
        possibleActions.push(action)
      }
    }

    let actions = yield g.pick(player, possibleActions, 1)
    yield* ACTION_TABLE[actions[0]].fn(g, player)
    actionPoints -= ACTION_TABLE[actions[0]].cost
  }
}

function* takeCard(g: Game, player: string) {
  // add a card from your hand (maximum of 3 cards in your hand)
  if (g.getCardNames('draw').length === 0) {
    g.move('discard', 'draw', -1)
    g.shuffle('draw')
  }
  const playerHand = `${player}_hand`
  console.assert(g.getCardNames(playerHand).length < MAX_CARDS_PER_HAND)
  g.move('draw', playerHand, 1)
}

function* discardCard(g: Game, player: string) {
  // discard a card from your hand
  const playerHand = `${player}_hand`
  console.assert(g.getCardNames(playerHand).length > 0)
  let card = yield g.pickCards(player, g.getCardNames(playerHand), 1)
  g.moveCards(card[0], 'discard')
}

function* moveUnit(g: Game, player: string) {
  let endLocations = []
  let startLocations = []

  while (endLocations.length === 0) {
    // pick a location with one of our units on
    let ownedLocations = getPlayerLocations(g, player)
    startLocations = yield g.pickLocations(player, ownedLocations, 1)
    let isNavyUnit = g.getCards(startLocations)[0].kind === 'Navy'

    // pick an adjacent sector (armies can only move onto land)
    let moveLocations = europe.getAdjacentSectors(startLocations[0])
    let validLocations = isNavyUnit ? moveLocations : moveLocations.filter(loc => !isWater(loc))

    if (validLocations.length > 0) {
      endLocations = yield g.pickLocations(player, validLocations, 1)
    }
  }

  g.move(startLocations[0], endLocations[0])
}

// TODO is there some way to automatically determine which of these options is valid?
// e.g. we can't play Voyage if we don't have any armies, and we can't play a region
// if there are no free land areas
function* playCard(g: Game, player: string) {
  const playerHand = `${player}_hand`
  console.assert(g.getCardNames(playerHand).length > 0)
  let cards = yield g.pickCards(player, g.getCardNames(playerHand), 1)

  let cardType = (g.filterCards(cards)[0] as any).type
  if (cardType === 'Voyage') {
    // turn one army into a navy
    let ownedLocations = getPlayerLocations(g, player)
    let ownedArmyLocations = ownedLocations.filter(loc => g.getCards(loc)[0].type === 'Army')
    console.assert(ownedArmyLocations.length > 0)

    let armyLocations = yield g.pickLocations(player, ownedArmyLocations, 1)
    let armyUnit = g.getCardNames(armyLocations[0])[0]

    g.moveCards(armyUnit, `${player}_armies`)
    console.assert(g.getCards(`${player}_navies`).length > 0)
    g.move(`${player}_navies`, armyLocations, 1)
  } else {
    // move one army to an empty sector in a region
    let regionLocations = REGIONS[cardType].filter(loc => g.getCards(loc).length === 0)
    console.assert(regionLocations.length > 0)
    let pickedLocations = yield g.pickCards(player, regionLocations, 1)

    console.assert(g.getCards(`${player}_armies`).length > 0)
    g.move(`${player}_armies`, pickedLocations, 1)
  }
}

function* attackUnit(g: Game, player: string) {
  // two units attack an adjacent enemy unit
  const enemyLocations = getEnemyLocations(g, player)
  const attackableEnemyLocations = enemyLocations.filter(locationName => {
    let adjacentLocations = europe.getAdjacentSectors(locationName)
    let playerAdjacent = adjacentLocations.reduce((count, loc) => count += isPlayerLocation(g, player, loc) ? 1 : 0, 0)
    return playerAdjacent >= MIN_UNITS_TO_ATTACK
  })

  console.assert(attackableEnemyLocations.length > 0)
  let targetLocations = yield g.pickLocations(player, attackableEnemyLocations, 1)
  let targetPlayer = getLocationOwner(g, targetLocations[0])

  let possibleAttackers = europe.getAdjacentSectors(targetLocations[0]).filter(loc => isPlayerLocation(g, player, loc))
  console.assert(possibleAttackers.length >= MIN_UNITS_TO_ATTACK)

  // enemy unit is returned to it's owner
  // player loses their first unit
  // the second unit is moved to the attacked location
  let attackLocations = yield g.pickLocations(player, possibleAttackers, 2)
  g.move(attackLocations[0], isNavyLocation(g, attackLocations[0]) ? `${player}_navies` : `${player}_armies`, 1)
  g.move(targetLocations[0], isNavyLocation(g, targetLocations[0]) ? `${targetPlayer}_navies` : `${targetPlayer}_armies`, 1)
  g.move(attackLocations[1], targetLocations[0], 1)
}

function isWinner(g: Game, player: string): boolean {
  for (var region in REGIONS) {
    let regionScore: number = 0
    if (REGIONS[region].every(sector => isPlayerLocation(g, player, sector))) {
      return true
    }
  }
  return false
}

// this score function is for the AI to rate their current position, higher is better
function getScore(g: Game, player: string): number {
  let score: number = 0
  for (var region in REGIONS) {
    let regionScore: number = 0
    for (var sector of REGIONS[region]) {
      if (isPlayerLocation(g, player, sector)) {
        regionScore += 1
      }
    }

    // favor regions that are almost complete, multiply by 10,
    // then cube the value. A completed Italia is (8/8*10)^3 = 1000,
    // a nearly complete Italia is (7/8*10)^3 = 670, Britannia with
    // one army is (1/4*10)^3 = 15
    let completionRatio = regionScore/REGIONS[region].length*10
    score += Math.pow(completionRatio, 3)
  }

  return score
}

let playerClients = {
  'a': Game.randomClient(), // Game.consoleClient(),
  'b': Game.randomClient() // Game.consoleClient()
}

let gs = new GameSystem(setup, rules, getScore, playerClients, {debug: true, saveHistory: true})
//const content = document.getElementById('content')

function update() {
   gs.update()
   //m.render(content, m(BGGame, {gamesystem: gs}))
   setTimeout(update, 0)
}
update()
