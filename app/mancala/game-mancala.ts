import {IPickCommand, Game} from '../system/game'
import {GameSystem} from '../system/gamesystem'
import Util from '../system/util'
import {Chain} from '../system/chain'
import * as m from 'mithril'
import {BGGame} from '../ui/game-ui'

declare function require(name: string): string;
require('../../app/mancala/game-mancala.css') // TODO fix this crazy path

const playerPits = {
  a: ['a1','a2','a3','a4','a5','a6'],
  b: ['b1','b2','b3','b4','b5','b6']}
const playerBase = {a: 'ah', b: 'bh'}

const allPlayerPits = [...playerPits.a, ...playerPits.b]
const pitNames = [...playerPits.a, playerBase.a, ...playerPits.b, playerBase.b]
const pitCounts = [4,4,4,4,4,4,0,4,4,4,4,4,4,0]

const pitChain = {
  a: new Chain([...playerPits.a, playerBase.a, ...playerPits.b]),
  b: new Chain([...playerPits.b, playerBase.b, ...playerPits.a])
}

function setup(g: Game) {
  pitNames.map(name => g.addLocation(name))

  let stone = 0
  for (let pit = 0; pit < pitCounts.length; ++pit) {
    const count = pitCounts[pit]
    for (let i = 0; i < count; ++i, ++stone) {
      g.addCard(pitNames[pit], `s${stone}`)
    }
  }

  //console.log(g.toString())
}

async function rules(g: Game) {
  let player: string = 'a'
  let winResult

  while (!winResult) {
    player = await turn(g, player) // TODO is there a way for typescript to enforce yield*
    winResult = findWinner(g)
  }

  if (g.options.debug) {
    console.log(g.toString())
    console.log(winResult)
    // Util.quit()
  }
}

async function turn(g: Game, player: string): Promise<string> {
  const validLocations: string[] = g.filterLocations(loc => g.getCardCount(loc) > 0 && playerPits[player].indexOf(loc) >= 0)
  const result: string[] = await g.pickLocations(player, validLocations)

  if (g.options.debug) {
    console.log(`*** ${player} plays ${result[0]} ***`)
  }
  //g.validateResult(result)

  player = moveStones(g, player, result[0])

  if (g.options.debug) {
    console.log(g.toString())
  }

  return player
}

function moveStones(g: Game, player: string, pitName: string): string {
  const stones: string[] = g.getCards(pitName)
  let nextPit = pitName

  while (stones.length > 0) {
    nextPit = pitChain[player].next(nextPit)
    g.moveCards(stones.pop(), nextPit)
  }

  const opponent = g.playerChain.next(player)

  // if last stone is the only stone in that pit, and the pit is on my
  // side, then claim the opponents stones in the opposite pit
  if (g.getCardCount(nextPit) === 1) {
    const i = playerPits[player].indexOf(nextPit)
    if (i >= 0) {
      const n = playerPits[player].length
      const oppositePit = playerPits[opponent][n - 1 - i]

      if (g.getCardCount(oppositePit) > 0) {
        if (g.options.debug) {
          console.log(`*** claim opponent ${oppositePit} ***`)
        }

        g.move(oppositePit, playerBase[player], -1)
      }
    }
  }

  // if all pits are empty for a player, then move all the opponent's stones
  // to their home base
  if (playerPits[player].every(p => g.getCardCount(p) === 0)) {
    g.move(playerPits[opponent], playerBase[opponent], -1) // TODO functions need to complain when the parameters are incorrect

    if (g.options.debug) {
      console.log(`*** ${opponent} gains remaining ***`)
    }
  } else if (playerPits[opponent].every(p => g.getCardCount(p) === 0)) {
    g.move(playerPits[player], playerBase[player], -1)

    if (g.options.debug) {
      console.log(`*** ${player} gains remaining ***`)
    }
  }

  // if the final stone did not go into a player home pit, then next players turn
  else if (['ah','bh'].indexOf(nextPit) === -1) {
    player = g.playerChain.next(player)
  } else {
    if (g.options.debug) {
      console.log(`*** ${player} gets another turn ***`)
    }
  }

  return player
}

// higher is better
function getScore(g: Game, player): number {
  return g.getCardCount(playerBase[player])
}

// TODO handle a draw
function findWinner(g: Game): string {
  if (allPlayerPits.every(name => g.getCardCount(name) === 0)) {
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

let playerClients = {
  'a': GameSystem.monteCarloClient(1, 1), // Game.consoleClient(), GameSystem.randomClient(),
  'b': GameSystem.randomClient() // Game.consoleClient()
}

let gs = new GameSystem(setup, rules, getScore, playerClients, {debug: true, saveHistory: true})
const content = document.getElementById('content')

function render() {
  m.render(content, m(BGGame, {gamesystem: gs}))
}

gs.run(() => requestAnimationFrame(render))

// // TODO move the play logic some
// const playerClients = {
//   'a': Game.randomClient(), //Game.monteCarloClient(5, 100),
//   'b': uiClient, //Game.randomClient(), //Game.monteCarloClient(10, 1000), // Game.consoleClient(),
// }
// // Game.play(setup, rules, getScore, playerClient)
//
// // Util.quitOnCtrlBreak()
//
// let gs = new GameSystem(setup, rules, getScore, playerClients, {debug: true, saveHistory: true})
// let pickCommand
// let pickCallback
// const content = document.getElementById('content')
//
// function update() {
//    gs.update()
//    m.render(content, m(BGGame, {gamesystem: gs, command: pickCommand, callback: pickCallback}))
//    requestAnimationFrame(update) // TODO we only need to do this when something changes
// }
// update()
//
// // TODO wip
// async function uiClient(g: Game, command: IPickCommand, scoreFn: (g: Game, options: string[]) => boolean) {
//   pickCommand = command
//   return new Promise(resolve => {
//     pickCallback = resolve
//   })
//   //requestAnimationFrame(update)
// }
