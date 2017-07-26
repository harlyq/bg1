import Game from './game.js'
import Util from './util.js'

const SUITS = ['H','D','S','C']
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const TAKE_CARD = 'take card'
const TAKE_PACK = 'take pack'
const NUM_INITIAL_CARDS = 13
const MIN_MELD_SIZE = 3
const MIN_CANASTA_SIZE = 7

interface MeldOptions {
  rank?: string
  twoNaturals?: boolean
}

function getNumTeams(g: Game) {
  const n = g.getPlayerCount()
  switch (n) {
    case 2: return 2
    case 3: return 3
    default: return n/2
  }
}

function setup(g: Game) {
  let draw = {name: 'draw'}
  g.addPlace(draw)
  g.addPlace({name: 'discard'})

  for (let player of g.filterPlayerNames(p => true)) {
    g.addPlace({name: `${player}_hand`})
  }

  const numTeams = getNumTeams(g)
  for (let i = 1; i <= numTeams; ++i) {
    for (let rank of RANKS) {
      g.addPlace({name: `team${i}_meld_${rank}`})
    }
    g.addPlace({name: `team${i}_redThrees`})
  }

  for (let deck of [1,2]) {
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        g.addCard({name: `${rank}${suit}${deck}`}, draw)
      }
    }
    // add two jokers to each deck
    g.addCard({name: `WB${deck}`}, draw)
    g.addCard({name: `WR${deck}`}, draw)
  }

  g.registerCondition(meldCondition)
}

// teams are numbered from 1 to n
function getTeam(g: Game, player: string): string {
  const allPlayers: string[] = g.filterPlayerNames(p => true)
  const numPlayers = allPlayers.length
  const numTeams = getNumTeams(g)
  const team = (allPlayers.indexOf(player) % numTeams) + 1
  return team.toString()
}

function* rules() {
  let g = yield
  let player = g.playerChain.first()

  yield* deal(g)

  let gameOver = false
  while (!gameOver) {
    g.debugLog(`Player ${player}'s turn`)
    gameOver = yield* turn(g, player)
    if (!gameOver) {
      player = g.playerChain.next(player)
    }
  }

  // TODO calculate team scores

  if (g.options.debug) {
    g.debugLog(`${player} went out`)
    Util.quit()
  }
}

function getInitialScore(g: Game, player: string): number {
  const team = getTeam(g, player)
  const score = g.getValue(`team${team}_score`) || 0
  if (score < 0) {
    return 15
  } else if (score < 1500) {
    return 50
  } else if (score < 3000) {
    return 90
  } else {
    return 120
  }
}

function getCardValue(cardName: string): number {
  const suit = getCardSuit(cardName)
  const rank = getCardRank(cardName)
  switch (rank) {
    case 'W': return 50
    case 'A':
    case '2': return 20
    case '3': return isBlackThree(cardName) ? 5 : 100 // red 3s are 200 if you have them all
    case '4':
    case '5':
    case '6':
    case '7': return 5
    default: return 10
  }
}

function getCardRank(cardName: string): string {
  return cardName.charAt(0)
}

function getCardSuit(cardName: string): string {
  return cardName.charAt(1)
}

function isWildCard(cardName: string): boolean {
  const rank = getCardRank(cardName)
  return rank === 'W' || rank === '2'
}

function isRedThree(cardName: string): boolean {
  return ['3H1','3H2','3D1','3D2'].indexOf(cardName) !== -1
}

function isBlackThree(cardName: string): boolean {
  return ['3C1','3C2','3S1','3S2'].indexOf(cardName) !== -1
}

function isPackFrozen(discards: string[]): boolean {
  return discards.filter(c => isWildCard(c) || isRedThree(c)).length > 0
}

function hasWildCards(discards: string[]): boolean {
  return discards.filter(c => isWildCard(c)).length > 0
}

function hasAllRedThrees(cards: string[]): boolean {
  return Util.arrayIntersection(cards, ['3H1','3H2','3D1','3D2']).length === 4
}

function* deal(g: Game) {
  g.shuffle('draw')

  debugger
  for (let player in g.allPlayers) {
    const team = getTeam(g, player)

    let numDraw = NUM_INITIAL_CARDS
    while (numDraw > 0) {
      const cards = g.move('draw', `${player}_hand`, numDraw)
      let redThrees = g.getCardNames(`${player}_hand`).filter(c => isRedThree(c))
      numDraw = redThrees.length // replace all of the red threes drawn

      if (numDraw > 0) {
        g.moveCards(redThrees, `team${team}_redThrees`, -1)
        g.debugLog(`player ${player} has ${redThrees.length} red three(s)`)
      }
    }
  }

  let drawCard = true
  while (drawCard) {
    let lastDrawn = g.move('draw', 'discard', 1) // do we want to return Cards or CardNames?
    drawCard = isWildCard(lastDrawn[0].name) || isRedThree(lastDrawn[0].name)
  }
}

function* turn(g:Game, player: string) {
  const team = getTeam(g, player)

  // TODO add option to ask about going out
  let gameOver = yield* draw(g, player, team)
  gameOver = gameOver || (yield* meld(g, player, team, {}))
  gameOver = gameOver || (yield* discard(g, player, team))

  return gameOver
}

function* draw(g: Game, player: string, team: string) {
  const discards = g.getCardNames('discard')
  Util.assert(discards.length > 0)

  const playerHand = g.getCardNames(`${player}_hand`)
  const playerHandBuckets = Util.countBuckets(playerHand, c => getCardRank(c))

  const wasPackFrozen = isPackFrozen(discards)
  const topDiscard = discards[discards.length - 1] // must always be a discard
  const topDiscardRank = getCardRank(topDiscard)

  // TODO need to consider the initial score
  let canTakePack = !isBlackThree(topDiscard) && !isRedThree(topDiscard) && !isWildCard(topDiscard)
  if (canTakePack) {
    canTakePack = (playerHandBuckets[topDiscardRank] >= 2) ||
          (!wasPackFrozen && playerHandBuckets[topDiscardRank] >= 1 && hasWildCards(playerHand)) ||
          (!wasPackFrozen && g.getCardCount(`team${team}_meld_${topDiscardRank}`) > 0)
  }

  const drawCount = g.getCardCount('draw')
  const canDraw = drawCount > 0

  let possibleActions = []
  if (canDraw) {
    possibleActions.push(TAKE_CARD)
  }
  if (canTakePack) {
    possibleActions.push(TAKE_PACK)
  }
  if (possibleActions.length === 0) {
    return true // game over
  }

  if (canDraw && canTakePack) {
    g.debugLog(`Player ${player} choose draw cards or take the pack`)
  }

  let actions = yield g.pick(player, possibleActions)
  if (actions.length > 0 && actions[0] === TAKE_PACK) {
    g.debugLog(`${player} takes the top discard "${topDiscard}"`)
    const snapshot = g.takeSnapshot()

    const discardMeldPlace = `team${team}_meld_${topDiscardRank}`
    const discardCard = g.move('discard', discardMeldPlace, 1)
    Util.assert(discardCard[0].name === topDiscard)

    if (g.getCardCount(discardMeldPlace) < MIN_MELD_SIZE) {
      const oldMeldScore = getMeldScore(g, player)
      const playerHandEmpty = yield* meld(g, player, team, {rank: topDiscardRank, twoNaturals: wasPackFrozen})
      debugger
      const newMeldScore = getMeldScore(g, player)

      // if we cancelled the meld then rollback taking the card
      if (oldMeldScore === newMeldScore) {
        // TODO do we want to stop computer players from cancelling the take?
        g.debugLog(`${player} abandons taking the top discard`)
        g.rollbackSnapshot(snapshot)
        actions = [] // player cancelled meld pick
      } else if (wasPackFrozen) {
        g.debugLog('PACK UNFROZEN')
      }
    } else {
      g.debugLog(`places top discard onto existing meld ${discardMeldPlace} (${g.getCardCount(discardMeldPlace)}) - meld score ${getMeldScore(g, player)}`)
    }
  }

  if (actions.length === 0 || actions[0] === TAKE_CARD) {
    let drawCard = 1
    while (drawCard > 0) {
      let cards = g.move('draw', `${player}_hand`, drawCard)
      g.debugLog(`${player} draws a card "${cards[0].name}" (${g.getCardCount('draw')})`)
      drawCard = cards.filter(c => isRedThree(c.name)).length

      if (drawCard > 0) {
        if (g.getCardCount('draw') === 0) {
          return true // end immediately if the last card of the draw was a red three
        }

        g.moveCards(cards[0].name, `team${team}_redThrees`, 1)
        g.debugLog(`player ${player} has a red three, draw again`)
      }
    }
  } else {
    g.move('discard', `${player}_hand`, -1)
    g.debugLog(`${player} TAKES THE PACK`)
  }

  return false
}

// TODO maybe there should be some helper function for setting up and
// analysing lists of playing cards
function isValidMeld(cards: string[]): boolean {
  if (cards.length === 0) {
    return false
  }

  let [numNatural, numWild, cardRank] = analyseCards(cards)

  return cardRank && (numWild === 0 || numWild < Math.floor((cards.length + 1)/2))
}

function analyseCards(cards: string[]) {
  let numNatural = 0
  let numWild = 0
  let cardRank
  for (let c of cards) {
    if (!isWildCard(c)) {
      ++numNatural
      cardRank = cardRank || getCardRank(c)
      if (cardRank != getCardRank(c)) {
        return [] // illegal meld, mixed rank cards
      }
    } else {
      numWild++
    }
  }

  return [numNatural, numWild, cardRank]
}

// returns the places where these cards can be melded.  If the cards only
// contain wild cards then they can be melded in multiple locations
// the meld can be restricted to a specific rank
function getMeldPlaces(g: Game, player: string, cards: string[], options: MeldOptions = {}): string[] {
  if (cards.length === 0) {
    return [] // can't meld and empty list of cards
  }

  let [numNatural, numWild, cardRank] = analyseCards(cards)

  if (options.rank && cardRank !== options.rank) {
    return [] // card rank does not match the requested meld rank
  }

  if (options.twoNaturals && numNatural < 2) {
    return [] // insufficient naturals
  }

  let validMelds = []
  const team = getTeam(g, player)

  if (!cardRank) {
    // only wild cards
    for (let rank of RANKS) {
      const meldPlace = `team${team}_meld_${rank}`
      const meldCards = Util.arrayUnion(g.getCardNames(meldPlace), cards)
      if (isValidMeld(meldCards)) {
        validMelds.push(meldPlace)
      }
    }
  } else {
    const meldPlace = `team${team}_meld_${cardRank}`
    const meldCards = Util.arrayUnion(g.getCardNames(meldPlace), cards)
    if (meldCards.length >= MIN_MELD_SIZE && isValidMeld(meldCards)) {
      validMelds.push(meldPlace)
    }
  }

  return validMelds
}

function meldCondition(g: Game, player: string, cards: string[], options: MeldOptions): boolean {
  const meldPlaces = getMeldPlaces(g, player, cards, options)
  return meldPlaces.length > 0
}

function* meld(g: Game, player: string, team: string, initialMeldOptions: MeldOptions) {
  let cards = []
  let meldOptions: MeldOptions = Util.deepJSONCopy(initialMeldOptions)
  let meldCount = 0
  const playerHand = `${player}_hand`
  const snapshot = g.takeSnapshot()
  const canGoOut = getCanastaScore(g, player) > 0

  let doMeld = true
  while (doMeld) {
    debugger
    const n = g.getCardCount(playerHand)
    const maxPickCount = Math.min(8, canGoOut ? n : n - 1)

    g.debugLog(`Player ${player} choose cards to meld:`) // TODO how do we localize this?
    cards = yield g.pick(player, g.getCardNames(playerHand), [0,maxPickCount], meldCondition, meldOptions)
    doMeld = cards.length > 0

    if (doMeld) {
      const meldPlaces = getMeldPlaces(g, player, cards)
      Util.assert(meldPlaces)

      g.debugLog(`Player ${player} choose places to meld:`)
      const places = yield g.pick(player, meldPlaces, 1)

      g.moveCards(cards, places[0], -1)
      g.debugLog(`${player} moves "${cards.join(',')}" cards to ${places[0]} (${g.getCardCount(places[0])}) - meld score ${getMeldScore(g, player)}`)
      ++meldCount
    }

    // reset rank and naturals restrictions after the first set of options
    meldOptions = {}
  }

  // if we haven't reached the initial meld score then rollback
  if (meldCount > 0) {
    const meldScore = getMeldScore(g, player)
    const initialMeldScore = getInitialScore(g, player)
    if (meldScore < initialMeldScore) {
      g.debugLog(`player ${player} did not reach the initial meld score ${initialMeldScore} with ${meldScore}`)
      g.rollbackSnapshot(snapshot)
    }
  }

  const n = g.getCardCount(playerHand)
  g.debugLog(`player ${player} has ${n} cards`)
  return n === 0
}

function* discard(g: Game, player: string, team: string) {
  // TODO prohibit cancel on this pick
  g.debugLog(`Player ${player} choose a card to discard:`)
  const cards = yield g.pick(player, g.getCardNames(`${player}_hand`), 1)
  Util.assert(cards.length === 1)

  // TODO handle rotation of wild cards - this is a UI problem, not a rules problem
  const discards = g.getCardNames('discard')
  const wasPackFrozen = isPackFrozen(discards)
  g.moveCards(cards, 'discard', 1)
  g.debugLog(`${player} discards "${cards[0]}" (${g.getCardCount('discard')})`)
  if (isPackFrozen(g.getCardNames('discard')) && !wasPackFrozen) {
    g.debugLog(`PACK FROZEN`)
  }
}

function getMeldScore(g: Game, player: string): number {
  const team = getTeam(g, player)

  let score = 0
  for (let rank of RANKS) {
    const cards = g.getCardNames(`team${team}_meld_${rank}`)
    for (let c of cards) {
      score += getCardValue(c)
    }
  }
  return score
}

// will be negative
function getHandScore(g: Game, player: string): number {
  let score = 0
  const cards = g.getCardNames(`${player}_hand`)
  for (let c of cards) {
    score -= getCardValue(c)
  }
  return score
}

function getCanastaScore(g: Game, player: string): number {
  const team = getTeam(g, player)

  let score = 0
  for (let rank of RANKS) {
    const cards = g.getCardNames(`team${team}_meld_${rank}`)
    if (cards.length >= MIN_CANASTA_SIZE) {
      score += hasWildCards(cards) ? 300 : 500
    }
  }

  return score
}

function getScore(g: Game, player: string): number {
  const meldScore = getMeldScore(g, player)
  const handScore = getHandScore(g, player)
  const canastaScore = getCanastaScore(g, player)
  return meldScore + handScore
}

let playerClients = {
  'a': Game.randomClient(), // Game.consoleClient(),
  'b': Game.randomClient() // Game.consoleClient()
}

Game.play(setup, rules, getScore, playerClients)
