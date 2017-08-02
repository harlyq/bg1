import Game from './game.js'
import Chain from './chain.js'
import Util from './util.js'

// for rendering need a shape for a die, with sides in a particular format
// e.g. [1,2,3,4,5,6] 1 is opposite 6, 2 opposite 5 and 3 opposite 4
const GREED_DICE_FACES = ['gold', 'silver', 'ruby', 'ebony', 'emerald', 'diamond']
const NUM_DICE = 6
const END_TURN = 'end turn'
const ROLL = 'roll'

const MIN_SCORE = 500
const WINNING_SCORE = 5000

const N_OF_A_KIND = [
  {same: 6, bucket: 'silver', score: 5000},
  {same: 6, bucket: 'gold', score: 5000},
  {same: 6, bucket: 'ruby', score: 5000},
  {same: 6, bucket: 'ebony', score: 5000},
  {same: 6, bucket: 'emerald', score: 5000},
  {same: 6, bucket: 'diamond', score: 5000},
  {same: 4, bucket: 'diamond', score: 1000},
  {same: 3, bucket: 'silver', score: 600},
  {same: 3, bucket: 'gold', score: 500},
  {same: 3, bucket: 'ruby', score: 400},
  {same: 3, bucket: 'emerald', score: 300},
  {same: 3, bucket: 'ebony', score: 300},
  {same: 1, bucket: 'diamond', score: 100},
  {same: 1, bucket: 'gold', score: 50}
]


function setup(g: Game) {
  g.registerCondition(validScoreCondition)

  let hand = { name: 'hand' }
  g.addPlace(hand)
  g.addPlace( {name: 'score'} )

  for (let i = 0; i < NUM_DICE; ++i) {
    g.addCard({ name: `dice${i}`, type: 'greedDie', value: GREED_DICE_FACES[0], faces: GREED_DICE_FACES }, hand)
  }
}

function calculateScore(cards: any[]) {
  let buckets: {[key: string]: number} = Util.countBuckets(cards, c => c.value)
  let score = 0, lastScore = -1

  // TODO is there a simpler way to do this?
  let remainingBuckets = 0
  for (let key in buckets) {
    remainingBuckets += buckets[key]
  }

  while (score != lastScore && remainingBuckets > 0) {
    lastScore = score

    // matches $GREED
    if (Util.isEqual(buckets, { 'silver': 1, 'gold': 1, 'ruby': 1, 'ebony': 1, 'emerald': 1, 'diamond': 1 })) {
      score = 1000 // $GREED
      for (let key in buckets) {
        buckets[key] = 0
      }
    }

    for (let match of N_OF_A_KIND) {
      if (buckets[match.bucket] >= match.same) {
        score += match.score
        buckets[match.bucket] -= match.same
      }
    }

    remainingBuckets = 0
    for (let key in buckets) {
      remainingBuckets += buckets[key]
    }
  }

  // if there are any dice left, then the score is not valid
  if (remainingBuckets > 0) {
    score = 0
  }

  return score
}

function validScoreCondition(g: Game, player: string, cards: string[]) {
  return calculateScore(g.filterCards(cards)) > 0 // TODO is this syntax too complicated?
}

function* round(g: Game, player: string) {
  g.moveCards(card => card.type === 'greedDie', 'hand', 6)

  let endTurn = false
  let score = 0

  do {
    // once min score is reached player can end their turn
    if (score >= MIN_SCORE) {
      g.debugLog(`*** Player ${player} meets the minimum score with ${score} ***`)
      let result = yield g.pick(player, [END_TURN, ROLL])
      endTurn = (result[0] === END_TURN) // easier if we just get results back
    }

    if (!endTurn) {
      // if all cards were used for scoring, then move them all back
      // into the hand
      if (g.getCardCount('hand') === 0) {
        g.debugLog(`*** Player ${player} gets all dice back ***`)
        g.moveCards(card => card.type === 'greedDie', 'hand', 6)
      }

      g.roll('hand')
      g.debugLog(`*** Player ${player} rolls ***`)

      // need to be able to select 0 cards
      const n = g.getCardCount('hand')
      let scorePicks = yield g.pickCards(player, g.getCardNames('hand'), [1, n], validScoreCondition)
      if (scorePicks.length === 0) {
        g.debugLog(`*** Player ${player} failed to score ***`)
        score = 0 // score nothing this round
        endTurn = true
      } else {
        score += calculateScore(g.filterCards(scorePicks))
        Util.assert(score > 0, 'scorePicks are invalid')
        g.moveCards(scorePicks, 'score', -1)
      }
    }
  } while (!endTurn)

  if (score > 0) {
    const newScore = g.addValue(`${player}_score`, score)
    g.debugLog(`*** Player ${player} scored ${score}, now at ${newScore} ***`)
  }
}

function* rules() {
  let g = yield
  let winner
  let startingPlayer = 'a' // g.playerChain.random()

  while (!winner) {
    let player = startingPlayer
    do {
      yield* round(g, player)
      winner = findWinner(g)
      player = g.playerChain.next(player)
    } while (player !== startingPlayer) // everyone gets a turn
  }

  if (g.options.debug) {
    const winningScore = g.getValue(`${winner}_score`)
    g.debugLog(`*** Player ${winner} wins, with a score of ${winningScore}`)
    Util.quit()
  }
}

function findWinner(g: Game): string {
  for (let player of g.playerChain.toArray()) {
    if (getScore(g, player) >= WINNING_SCORE) {
      return player
    }
  }
}

function getScore(g: Game, player: string) {
  return g.getValue(`${player}_score`) || 0
}

let playerClients = {
  'a': Game.monteCarloClient(5,10),
  'b': Game.consoleClient() // Game.randomClient()
}

Game.play(setup, rules, getScore, playerClients)
