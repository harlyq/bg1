/// <reference path= "game.ts" />
let Game = require('./game.js')
let Util = require('./util.js')
let Chain = require('./chain.js')

let g = new Game()
var playerChain = new Chain(['a', 'b'])

let playerPits = {
  a: ['a1','a2','a3','a4','a5','a6'],
  b: ['b1','b2','b3','b4','b5','b6']}
let playerBase = {a: 'ah', b: 'bh'}

let allPlayerPits = [...playerPits.a, ...playerPits.b]
let pitNames = [...playerPits.a, playerBase.a, ...playerPits.b, playerBase.b]
let pitCounts = [4,4,4,4,4,4,0,4,4,4,4,4,4,0]

let pitChain = {
  a: new Chain([...playerPits.a, playerBase.a, ...playerPits.b]),
  b: new Chain([...playerPits.b, playerBase.b, ...playerPits.a])
}

function setup() {
  let places = pitNames.map(name => { return {name}})
  places.map(p => g.addPlace(p))

  var stone = 0
  for (var pit = 0; pit < pitCounts.length; ++pit) {
    var count = pitCounts[pit]
    for (var i = 0; i < count; ++i, ++stone) {
      g.addCard({name: `s${stone}`}, places[pit])
    }
  }

  console.log(g.toString())
}

function* rules() {
  let player = 'a'
  var winResult

  while (!winResult) {
    player = yield* turn(player) // TODO must be yield* fn, not yield fn, not fn
    winResult = findWinner()
  }

  console.log(winResult)
  Util.quit()
}

function* turn(player: string) {
  let validPlaces = g.filterPlaces(p => p.cards.length > 0 && playerPits[player].indexOf(p.name) >= 0)
  let result = yield g.pickPlaces(player, validPlaces)
  console.log(result)

  player = moveStones(player, result[1].name)
  console.log(g.toString())

  return player
}

function moveStones(player: string, pitName: string): string {
  var stones = g.getCards(pitName).map(c => c.name) // TODO awkard syntax
  var nextPit = pitName

  while (stones.length > 0) {
    nextPit = pitChain[player].next(nextPit)
    g.moveCards(stones.pop(), nextPit)
  }

  let opponent = playerChain.next(player)

  // if last stone is the only stone in that pit, and the pit is on my
  // side, then claim the opponents stones in the opposite pit
  if (g.getCards(nextPit).length === 1) {
    var i = playerPits[player].indexOf(nextPit)
    if (i >= 0) {
      let n = playerPits[player].length
      let oppositePit = playerPits[opponent][n - 1 - i]
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

// TODO handle a draw
function findWinner(): string {
  if (allPlayerPits.every(name => g.getCards(name).length === 0)) {
    let scoreA = g.getCards('ah').length
    let scoreB = g.getCards('bh').length
    if (scoreA === scoreB) {
      return "Draw"
    } else if (scoreA > scoreB) {
      return "A Wins"
    } else {
      return "B Wins"
    }
  }
}

setup()

var rulesItr = rules()
onResult([])

function onResult(result: any[]) {
  let itr = rulesItr.next(result)
  if (!itr.done) {
    onCommand(itr.value)
  }
}

function onCommand(command) {
  setTimeout(() => onResult([command, Util.randomValue(command.options)]), 0)
}

Util.quitOnCtrlBreak()
