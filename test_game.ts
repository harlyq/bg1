import * as Tape from 'Tape'
import {Game} from './game.js'
import Util from './util.js'

Tape.test('add player', (test) => {
  let g = new Game()
  let [player1, player2] = [{name: 'Player1'}, {name: 'Player2'}]
  g.addPlayer(player1)
  g.addPlayer(player2)

  test.deepEqual(g.filterPlayers('DoesNotExist'), [], 'invalid player')
  test.deepEqual(g.filterPlayers(['DoesNotExist','NorMe']), [], 'invalid players')
  test.deepEqual(g.filterPlayers(p => false), [], 'no players')
  debugger
  test.deepEqual(g.filterPlayers(p => true), [player1, player2], 'all players')
  test.end()
})

Tape.test('test addPlace', (test) => {
  let g = new Game()
  let [place1, place2] = [{name: 'Place1'}, {name: 'Place2'}]
  g.addPlace(place1)
  g.addPlace(place2)

  test.deepEqual(g.filterPlaces('DoesNotExist'), [], 'invalid place')
  test.deepEqual(g.filterPlaces(['DoesNotExist','NorMe']), [], 'invalid places')
  test.deepEqual(g.filterPlaces(p => false), [], 'no places')
  test.deepEqual(g.filterPlaces('Place1'), [place1], 'place by name')
  test.deepEqual(g.filterPlaces(['Place2', 'Place1']), [place2, place1], 'place by list')
  test.deepEqual(g.filterPlaces((p) => p.name === 'Place2'), [place2], 'place by function')
  test.end()
})

Tape.test('test addCard', (test) => {
  let g = new Game()
  let [place1, place2] = [{name: 'Place1'}, {name: 'Place2'}]
  let [card1, card2] = [{name: 'Card1'}, {name: 'Card2'}]

  g.addPlace([place1, place2]).addCard([card1, card2], place1)

  test.deepEqual(g.filterCards('DoesNotExist'), [], 'invalid card')
  test.deepEqual(g.filterCards(['DoesNotExist','NorMe']), [], 'invalid cards')
  test.deepEqual(g.filterCards(p => false), [], 'no cards')
  test.deepEqual(g.getCards('Place1'), [card1, card2], 'all cards in place1')
  test.deepEqual(g.getCards('Place2'), [], 'no cards in place2')
  test.deepEqual(g.filterCards('Card1'), [card1], 'cards by name')
  test.deepEqual(g.filterCards(['Card2', 'Card1']), [card2, card1], 'cards by list')
  test.deepEqual(g.filterCards((c) => c.name === 'Card2'), [card2], 'cards by function')
  test.end()
})

Tape.test('test moveCard', (test) => {
  let g = new Game()
  let [place1, place2, place3] = [{name: 'Place1'}, {name: 'Place2'}, {name: 'Place3'}]
  let [card1,card2,card3] = [{name: 'Card1'}, {name: 'Card2'}, {name: 'Card3'}]

  g.addPlace([place1, place2, place3]).addCard([card1, card2, card3], place1)

  test.deepEqual(g.getCards('Place1'), [card1, card2, card3], 'all cards in place1')

  test.comment('moveCards by function, Card1 to Place2')
  g.moveCards((c) => c.name === 'Card1', 'Place2')

  test.deepEqual(g.getCards('Place1'), [card2, card3], 'Card1 removed from Place1')
  test.deepEqual(g.getCards('Place2'), [card1], 'Card1 in Place2')

  test.comment('moveCards by name, Card3 to Place3')
  g.moveCards('Card3', 'Place3')
  test.deepEqual(g.getCards('Place1'), [card2], 'Card2 left in Place1')
  test.deepEqual(g.getCards('Place2'), [card1], 'Card1 in Place2')
  test.deepEqual(g.getCards('Place3'), [card3], 'Card3 in Place3')

  test.comment('moveCards by array, all cards to Place2')
  g.moveCards(['Card1', 'Card2', 'Card3'], 'Place1')
  test.deepEqual(g.getCards('Place1'), [card1,card2,card3], 'Place1 all cards')
  test.deepEqual(g.getCards('Place2'), [], 'no cards in Place2')
  test.deepEqual(g.getCards('Place3'), [], 'Place3 empty')

  test.end()
})

Tape.test('test move', (test) => {
  let g = new Game()
  let [place1, place2, place3] = [{name: 'Place1'}, {name: 'Place2'}, {name: 'Place3'}]
  let [card1,card2,card3] = [{name: 'Card1'}, {name: 'Card2'}, {name: 'Card3'}]

  g.addPlace([place1, place2, place3]).addCard([card1, card2, card3], place1)
  test.deepEqual(g.getCards('Place1'), [card1, card2, card3], 'all cards in place1')

  test.comment('move bottom card of Place1 into top of Place2')
  g.move('Place1', 'Place2', 1, 0, -1)
  test.deepEqual(g.getCards('Place1'), [card2, card3], 'bottom card removed')
  test.deepEqual(g.getCards('Place2'), [card1], 'and placed in Place2')

  test.comment('move top card of Place1 into bottom of Place2')
  g.move('Place1', 'Place2', 1, -1, 0)
  test.deepEqual(g.getCards('Place1'), [card2], 'top card removed')
  test.deepEqual(g.getCards('Place2'), [card3, card1], 'and placed in the bottom of Place2')

  test.comment('move all cards from Place2 into Place3, swap order')
  g.move('Place2', 'Place3', -1)
  test.deepEqual(g.getCards('Place1'), [card2], 'untouched')
  test.deepEqual(g.getCards('Place2'), [], 'empty')
  test.deepEqual(g.getCards('Place3'), [card1, card3], 'reverse order of Place2 cards')

  test.comment('move in place')
  g.move('Place1', 'Place3', -1)
  test.deepEqual(g.getCards('Place3'), [card1, card3, card2], 'all cards in place3')
  g.move('Place3', 'Place3', -1)
  test.deepEqual(g.getCards('Place3'), [card1, card3, card2], 'keep the same order')
  g.move('Place3', 'Place3', 1, -1, 0)
  test.deepEqual(g.getCards('Place3'), [card2, card1, card3], 'top card moved to bottom')

  test.comment('move cards, starting from empty places')
  g.move(['Place1', 'Place3'], 'Place2', -1, 0, -1)
  test.deepEqual(g.getCards('Place1'), [], 'place1 now empty')
  test.deepEqual(g.getCards('Place2'), [card2, card1, card3], 'all cards in place2')
  test.deepEqual(g.getCards('Place3'), [], 'place3 now empty')

  test.end()
})

Tape.test('test reverse', (test) => {
  let g = new Game()
  let place1 = {name: 'Place1'}
  let [card1,card2,card3] = [{name: 'Card1'}, {name: 'Card2'}, {name: 'Card3'}]

  g.addPlace(place1).addCard([card1, card2, card3], place1)

  g.reverse('Place1')
  test.deepEqual(g.getCards('Place1'), [card3, card2, card1], 'reversed')

  test.end()
})

Tape.test('test shuffle', (test) => {
  let g = new Game()
  let place1 = {name: 'Place1'}
  let NUM_CARDS = 20
  let listOfCards = []

  g.addPlace(place1)
  for (var i = 0; i < NUM_CARDS; ++i) {
    const card = {name: `Card${i}`}
    g.addCard(card, place1)
    listOfCards.push(card)
  }

  test.equal(g.getCards('Place1').length, NUM_CARDS, 'all cards added')
  test.ok(Util.isListUnique(g.getCards('Place1')), 'all cards unique')
  test.deepEqual(g.getCards('Place1'), listOfCards, 'cards are in order')

  test.comment('shuffle')
  g.shuffle('Place1')
  test.equal(g.getCards('Place1').length, NUM_CARDS, 'all cards present')
  test.ok(Util.isListUnique(g.getCards('Place1')), 'all cards unique')
  test.notDeepEqual(g.getCards('Place1'), listOfCards, 'cards are shuffled')

  test.end()
})

Tape.test('test roll', (test) => {
  let g = new Game()
  let place1 = {name: 'Place1'}
  let [dice1, dice2] = [{name: 'Dice1', faces: [1,2,3,4,5,6]}, {name: 'Dice2', faces: ['A','B','C','D','E','F']}]

  g.addPlace(place1).addCard([dice1, dice2], place1)
  test.deepEqual(g.getCards('Place1'), [dice1, dice2], 'all dice added')

  g.roll('Place1')
  var lastX, lastY
  [lastX, lastY] = g.getCards('Place1').map(c => (c as any).value)

  var i = 0
  for ( ; i < 10; ++i) {
    g.roll('Place1')
    let [x,y] = g.getCards('Place1').map(c => (c as any).value)
    if (x != lastX && y != lastY) {
      break
    }
    lastX = x
    lastY = y
  }
  test.notEqual(i, 10, 'roll changed values')

  console.log(g.toString())

  test.end()
})

Tape.test('test values', (test) => {
  let g = new Game()

  test.end()
})
