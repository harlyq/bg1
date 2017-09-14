import {BGGame, BGHistory} from '../ui/game-ui'
import {Game, IGameState} from '../system/game'
import {GameSystem} from '../system/gamesystem'
import {Chain} from '../system/chain'
import Util from '../system/util'
import * as m from "mithril"

declare function require(name: string): string;
require('../../app/for-sale/game-for-sale.css') // TODO fix this path

const NUM_CARDS = 30
const NUM_COINS = 84
const MIN_CHEQUE_VALUE = 0
const MAX_CHEQUE_VALUE = 15

function getNumCheques(value: number): number {
  return value === 1 ? 0 : 2
}

const chequeValueReg = /c\$(\d+)_.*/
function getChequeValue(name: string): number {
  const result = name.match(chequeValueReg)
  return parseInt(result[1])
}

const houseValueReg = /h(\d+)/
function getHouseValue(name: string): number {
  const result = name.match(houseValueReg)
  return parseInt(result[1])
}

function setup(g: Game) {
  g.addLocation('draw_house')
  g.addLocation('draw_cheque')
  g.addLocation('bank')
  g.addLocation('discard')
  g.addLocation('market')

  for (let player of g.getAllPlayers()) {
    g.addLocation(`${player}_money`)
    g.addLocation(`${player}_bid`)
    g.addLocation(`${player}_houses`)
    g.addLocation(`${player}_cheques`)
  }

  for (let i = 1; i <= NUM_CARDS; ++i) {
    g.addCard('draw_house', `h${i}`)
  }

  for (let value = MIN_CHEQUE_VALUE; value <= MAX_CHEQUE_VALUE; ++value) {
    const count = getNumCheques(value)
    for (let i = 0; i < count; ++i) {
      g.addCard('draw_cheque', `c$${value}_${i}`)
    }
  }

  for (let i = 0; i < NUM_COINS; ++i) {
    g.addCard('bank', `m${i}`)
  }
}

async function rules(g: Game) {
  const allPlayers = g.getAllPlayers()
  let player = allPlayers[0]
  let numPlayers = allPlayers.length

  let capital = 18
  let remove = 0
  switch (numPlayers) {
    case 2:
      break
    case 3:
      remove = 6
      break
    case 4:
      capital = 14
      remove = 2
      break
    case 5:
      capital = 14
      break
  }

  g.shuffle('draw_house')
  g.shuffle('draw_cheque')

  g.move('draw_house', 'discard', remove)
  g.move('draw_cheque', 'discard', remove)

  for (let player of allPlayers) {
    g.move('bank', `${player}_money`, capital)
  }

  await buyHouses(g, allPlayers)
  await sellHouses(g, allPlayers)

  let allScores = allPlayers.map(player => getScore(g, player))
  let winner = allPlayers[Util.maxIndex(allScores)]

  g.debugLog(`Winner is '${winner}'`)
}

async function buyHouses(g: Game, allPlayers: string[]) {
  const numPlayers = allPlayers.length
  let lastWinner

  while (g.getCardCount('draw_house') > 0) {
    g.move('draw_house', 'market', numPlayers)
    g.sort('market', (a: string, b: string) => getHouseValue(a) - getHouseValue(b)) // lowest to highest

    let bidders = new Chain(allPlayers)
    let bidder = lastWinner || allPlayers[0]
    let lastBid = 0

    while (g.getCardCount('market') > 1) {
      const bidderMoney$ = `${bidder}_money`
      const bidderBid$ = `${bidder}_bid`
      const passChoice = g.pick(bidder, ['pass'])
      const existingBid = g.getCardCount(bidderBid$)
      const minMoney = lastBid - existingBid + 1
      const maxMoney = g.getCardCount(bidderMoney$)

      let buyResults
      if (maxMoney + existingBid > lastBid) {
        const bidChoice = g.pickCards(bidder, g.getCards(bidderMoney$), [minMoney, maxMoney])
        buyResults = await g.pickGroup([passChoice, bidChoice])
      } else {
        buyResults = await g.pickGroup([passChoice])
      }

      if (buyResults[0] && buyResults[0][0] === 'pass') {
        let existingBidRoundedDown = Math.floor(existingBid/2)
        g.move(bidderBid$, 'bank', existingBid - existingBidRoundedDown)
        g.move(bidderBid$, bidderMoney$, existingBidRoundedDown)
        console.assert(g.getCardCount(bidderBid$) === 0)
        g.move('market', `${bidder}_houses`, 1, 0) // take the lowest value house
        bidders.remove(bidder)
      } else {
        console.assert(buyResults[1])
        g.moveCards(buyResults[1], bidderBid$, -1)
        lastBid = g.getCardCount(bidderBid$)
      }
      bidder = bidders.next(bidder)
    }

    console.assert(bidders.getLength() === 1, 'should only be one bidder remaining')
    lastWinner = bidders.first()
    g.move('market', `${lastWinner}_houses`)
    g.move(`${lastWinner}_bid`, 'bank', -1)
  }
}

async function sellHouses(g: Game, allPlayers: string[]) {
  const numPlayers = allPlayers.length

  while (g.getCardCount('draw_cheque') > 0) {
    g.move('draw_cheque', 'market', numPlayers)
    g.sort('market', (a: string, b: string) => getChequeValue(a) - getChequeValue(b)) // lowest to highest

    let sellChoices = []
    for (let player of allPlayers) {
      sellChoices.push(g.pick(player, g.getCards(`${player}_houses`), 1))
    }

    let sellResults = await g.pickGroup(sellChoices)
    console.assert(sellResults.length === sellChoices.length)
    let offers = sellResults.map((result, i) => { return {player: allPlayers[i], house: result[0]} })
    offers.sort((a,b) => getHouseValue(a.house) - getHouseValue(b.house)) // lowest to highest

    // move the lowest value cheques to the lowest offers
    for (let offer of offers) {
      g.moveCards(offer.house, 'draw_house', -1)
      g.move('market', `${offer.player}_cheques`, 1, 0)
    }
  }
}

function getScore(g: Game, player: string): number {
  const cheques = g.getCards(`${player}_cheques`)
  const totalMonies = g.getCardCount(`${player}_money`)
  const totalCheques = cheques.reduce((t,c) => t += getChequeValue(c), 0)
  return totalMonies + totalCheques
}

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
