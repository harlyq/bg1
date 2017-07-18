/// <reference path= "./game.ts" />
let game = require('./game.js')
let util = require('./util.js')
let chain = require('./chain.js')

let g = new game(onCommand) // TODO fix unused
const playerChain = new chain(['a', 'b'])

const playerPits = {
  a: ['a1','a2','a3','a4','a5','a6'],
  b: ['b1','b2','b3','b4','b5','b6']}
const playerBase = {a: 'ah', b: 'bh'}

const allPlayerPits = [...playerPits.a, ...playerPits.b]
const pitNames = [...playerPits.a, playerBase.a, ...playerPits.b, playerBase.b]
const pitCounts = [4,4,4,4,4,4,0,4,4,4,4,4,4,0]

const pitChain = {
  a: new chain([...playerPits.a, playerBase.a, ...playerPits.b]),
  b: new chain([...playerPits.b, playerBase.b, ...playerPits.a])
}

function setup(g: Game) {
  const places = pitNames.map(name => { return {name}})
  places.map(p => g.addPlace(p))

  let stone = 0
  for (let pit = 0; pit < pitCounts.length; ++pit) {
    const count = pitCounts[pit]
    for (let i = 0; i < count; ++i, ++stone) {
      g.addCard({name: `s${stone}`}, places[pit])
    }
  }

  //console.log(g.toString())
}

function* rules(outputWinner = false) {
  let g = yield // get the reference to the Game structure
  let player = 'a'
  let winResult

  while (!winResult) {
    player = yield* turn(g, player) // TODO is there a way for typescript to enforce yield*
    winResult = findWinner(g)
  }

  if (outputWinner) {
    console.log(g.toString())
    console.log(winResult)
    util.quit()
  }
}

function* turn(g: Game, player: string) {
  const validPlaces = g.filterPlaces(p => p.cards.length > 0 && playerPits[player].indexOf(p.name) >= 0)
  const result = yield g.pickPlaces(player, validPlaces)
  g.history.push(result) // TODO do this automatically within the pick
  //g.validateResult(result)

  player = moveStones(g, player, validPlaces[result[1]].name)
  //console.log(g.toString())

  return player
}

function moveStones(g: Game, player: string, pitName: string): string {
  const stones = g.getCards(pitName).map(c => c.name) // TODO awkard syntax
  let nextPit = pitName

  while (stones.length > 0) {
    nextPit = pitChain[player].next(nextPit)
    g.moveCards(stones.pop(), nextPit)
  }

  const opponent = playerChain.next(player)

  // if last stone is the only stone in that pit, and the pit is on my
  // side, then claim the opponents stones in the opposite pit
  if (g.getCards(nextPit).length === 1) {
    const i = playerPits[player].indexOf(nextPit)
    if (i >= 0) {
      const n = playerPits[player].length
      const oppositePit = playerPits[opponent][n - 1 - i]
      g.move(oppositePit, playerBase[player], -1)
    }
  }

  // if all pits are empty for a player, then move all the opponent's stones
  // to their home base
  if (playerPits[player].every(p => g.getCards(p).length === 0)) {
    g.move(playerPits[opponent], playerBase[opponent], -1) // TODO functions need to complain when the parameters are incorrect
  }

  if (playerPits[opponent].every(p => g.getCards(p).length === 0)) {
    g.move(playerPits[player], playerBase[player], -1)
  }

  // if the final stone did not go into a player home pit, then next players turn
  if (['ah','bh'].indexOf(nextPit) === -1) {
    player = playerChain.next(player)
  }

  return player
}

// higher is better
function getScore(g: Game, player): number {
  return g.getCards(playerBase[player]).length
}

// TODO handle a draw
function findWinner(g: Game): string {
  if (allPlayerPits.every(name => g.getCards(name).length === 0)) {
    const scoreA = getScore(g, 'a')
    const scoreB = getScore(g, 'b')
    if (scoreA === scoreB) {
      return "Draw"
    } else if (scoreA > scoreB) {
      return "A Wins"
    } else {
      return "B Wins"
    }
  }
}

setup(g)

let itr = rules(true)
itr.next()

function aiPlayback() {
  let result = itr.next(g)
  let scores = []

  while (!result.done) {

    let bestOption

    if (result.value.who === 'a') {
//      bestOption = findBestOption(g, result.value.id, result.value.options, result.value.who, 3)
      bestOption = findMonteCarloOption(g, result.value.id, result.value.options, result.value.who, 3, 5)
    } else {
      bestOption = findRandomOption(result.value.options)
    }

    result = itr.next([result.value.id, bestOption])
  }
}
aiPlayback()

// TODO separate this random from the games random (maybe have a random in game)
function findRandomOption(options): number {
  return util.randomInt(0, options.length)
}

function findBestOption(g: Game, id: number, options: any[], player: string, depth: number): number {
  let scores = exhaustiveScoreOptions(g, id, options, player, depth)

  // once all of the options have been tried pick the best
  util.fisherYates(scores) // shuffle so we don't always pick the first option if the scores are the same
  scores.sort((a,b) => b.score - a.score) // sort by highest score
  return scores[0].optionIndex
}

function findAverageScore(scores: {optionIndex: number, score: number}[]): number {
  let scoreTotal = scores.reduce((t,x) => t + x.score, 0)
  return scoreTotal/scores.length
}

function findBestScore(scores: {optionIndex: number, score: number}[]): number {
  return scores.reduce((m, x) => Math.max(m, x.score), scores[0].score)
}

// we build a new game, and play the replay through that game
// once the replay is ended try a new option
function createTrial(g): {trial: any, trialItr: any, trialResult: any} {
  // TODO should place and card be internal constructs of the game, and all
  // custom data must be managed through allValues?
  let trial = new game() // TODO to save space, should we share the cards?
  setup(trial)

  let trialItr = rules()
  let trialResult = trialItr.next()
  trialResult = trialItr.next(trial)

  // run through the playback results
  let replayIndex = 0
  while (!trialResult.done && g.history[replayIndex]) {
    trialResult = trialItr.next(g.history[replayIndex++])
  }

  return {trial, trialItr, trialResult}
}

// TODO depth may be better as a number of rounds, rather than a number of questions
function findMonteCarloOption(g: Game, id: number, options: any[], player: string, depth: number, iterations: number): number {
  let n = options.length
  let opponent = playerChain.next(player) // TODO loop over all players
  let totals = Array(n).fill(0)

  for (let k = 0; k < n*iterations; ++k) { // multiply by n, so we also do each option at least once
    let {trial, trialItr, trialResult} = createTrial(g)
    let candidates = []

    // each loop we will reuse more (startDepth) old values from
    // the last best iteration
    for (let j = 0; j < depth && !trialResult.done; ++j) {
      const command = trialResult.value

      // TODO need to handle multiple return options
      // NOTE j === 0 is used to ensure we iterate over each choice in the options
      const choice = (j === 0) ? (k % n) : (findRandomOption(command.options))
      const reply = [command.id, choice]
      candidates.push(reply)
      trialResult = trialItr.next(reply)
    }

    const firstOption = candidates[0][1]
    const score = getScore(trial, player) - getScore(trial, opponent)
    totals[firstOption] += score
  }

  // each option has been trialled the same number of times, so take the
  // option with the best overall score
  let bestOption = 0
  let bestTotal = totals[0]
  for (var i = 1; i < n; ++i) {
    if (totals[i] > bestTotal) {
      bestOption = i
      bestTotal = totals[i]
    }
  }
  return bestOption
}

function exhaustiveScoreOptions(g: Game, id: number, options: any[], player: string, depth: number): {optionIndex: number, score: number}[] {
  let opponent = playerChain.next(player) // TODO loop over all players
  let scores = []

  options.forEach((option, i) => {
    let {trial, trialItr, trialResult} = createTrial(g)

    // try this option
    if (!trialResult.done) {
      trialResult = trialItr.next([id, i])
    }

    // either get scores by running further trials, or get the score from
    // this trial
    if (!trialResult.done && depth > 1) {
      let subScores = exhaustiveScoreOptions(trial, trialResult.value.id, trialResult.value.options, trialResult.value.who, depth - 1)
      // TODO is it better to use the median score? or the lowest score? or the higest score?
      // should we score the ai player differently from their opponent?
      scores.push({optionIndex: i, score: findBestScore(subScores)})

      // if (trialResult.value.who === player) {
      //   scores.push({optionIndex: i, score: findBestScore(subScores)})
      // } else {
      //   scores.push({optionIndex: i, score: findAverageScore(subScores)})
      // }
    } else {
      scores.push({optionIndex: i, score: getScore(trial, player) - getScore(trial, opponent)})
    }
  })

  return scores
}

// TODO simplify this for the user
function onCommand(g, command) {
  debugger
  // example showing a synchronous return value
  // return [command, util.randomValue(command.options)]

  // example showing an async return value
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([command, util.randomValue(command.options)])
    }, 0)
  })

  // setTimeout(() => callback([command, util.randomValue(command.options)]), 0)
}

util.quitOnCtrlBreak()
