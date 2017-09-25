import * as Tape from 'Tape'
import {Game, IPickCommand} from '../game'
import {Util} from '../util'

Tape.test('add player', (test) => {
  let g = new Game('Test')
  g.addPlayer('Player1')
  g.addPlayer('Player2')

  test.deepEqual(g.filterPlayers('DoesNotExist'), [], 'invalid player')
  test.deepEqual(g.filterPlayers(['DoesNotExist','NorMe']), [], 'invalid players')
  test.deepEqual(g.filterPlayers(p => false), [], 'no players')
  test.deepEqual(g.filterPlayers(p => true), ['Player1', 'Player2'], 'all players')
  test.end()
})

Tape.test('test addLocation', (test) => {
  let g = new Game('Test')
  g.addLocation('Location1')
  g.addLocation('Location2')

  test.deepEqual(g.filterLocations('DoesNotExist'), [], 'invalid place')
  test.deepEqual(g.filterLocations(['DoesNotExist','NorMe']), [], 'invalid places')
  test.deepEqual(g.filterLocations(p => false), [], 'no places')
  test.deepEqual(g.filterLocations('Location1'), ['Location1'], 'place by name')
  test.deepEqual(g.filterLocations(['Location2', 'Location1']), ['Location2', 'Location1'], 'place by list')
  test.deepEqual(g.filterLocations((name) => name === 'Location2'), ['Location2'], 'place by function')
  test.end()
})

Tape.test('test addCard', (test) => {
  let g = new Game('Test')

  g.addLocation('Location1').addLocation('Loation2')
  g.addCard('Location1', 'Card1').addCard('Location1', 'Card2')

  test.deepEqual(g.filterCards('DoesNotExist'), [], 'invalid card')
  test.deepEqual(g.filterCards(['DoesNotExist','NorMe']), [], 'invalid cards')
  test.deepEqual(g.filterCards(p => false), [], 'no cards')
  test.deepEqual(g.getCards('Location1'), ['Card1', 'Card2'], 'all cards in place1')
  test.deepEqual(g.getCards('Location2'), [], 'no cards in place2')
  test.deepEqual(g.filterCards('Card1'), ['Card1'], 'cards by name')
  test.deepEqual(g.filterCards(['Card2', 'Card1']), ['Card2', 'Card1'], 'cards by list')
  test.deepEqual(g.filterCards((name) => name === 'Card2'), ['Card2'], 'cards by function')
  test.end()
})

Tape.test('test moveCard', (test) => {
  let g = new Game('Test')

  g.addLocation('Location1').addLocation('Location2').addLocation('Location3')
  g.addCard('Location1', 'Card1').addCard('Location1', 'Card2').addCard('Location1', 'Card3')

  test.deepEqual(g.getCards('Location1'), ['Card1', 'Card2', 'Card3'], 'all cards in place1')

  test.comment('moveCards by function, Card1 to Location2')
  g.moveCards((name) => name === 'Card1', 'Location2')

  test.deepEqual(g.getCards('Location1'), ['Card2', 'Card3'], 'Card1 removed from Location1')
  test.deepEqual(g.getCards('Location2'), ['Card1'], 'Card1 in Location2')

  test.comment('moveCards by name, Card3 to Location3')
  g.moveCards('Card3', 'Location3')
  test.deepEqual(g.getCards('Location1'), ['Card2'], 'Card2 left in Location1')
  test.deepEqual(g.getCards('Location2'), ['Card1'], 'Card1 in Location2')
  test.deepEqual(g.getCards('Location3'), ['Card3'], 'Card3 in Location3')

  test.comment('moveCards by array, all cards to Location2')
  g.moveCards(['Card1', 'Card2', 'Card3'], 'Location1')
  test.deepEqual(g.getCards('Location1'), ['Card1', 'Card2', 'Card3'], 'Location1 all cards')
  test.deepEqual(g.getCards('Location2'), [], 'no cards in Location2')
  test.deepEqual(g.getCards('Location3'), [], 'Location3 empty')

  test.end()
})

Tape.test('test move', (test) => {
  let g = new Game('Test')
  g.addLocation('Location1').addLocation('Location2').addLocation('Location3')
  g.addCard('Location1', 'Card1').addCard('Location1', 'Card2').addCard('Location1', 'Card3')

  test.comment('move bottom card of Location1 into top of Location2')
  g.move('Location1', 'Location2', 1, 0, -1)
  test.deepEqual(g.getCards('Location1'), ['Card2', 'Card3'], 'bottom card removed')
  test.deepEqual(g.getCards('Location2'), ['Card1'], 'and placed in Location2')

  test.comment('move top card of Location1 into bottom of Location2')
  g.move('Location1', 'Location2', 1, -1, 0)
  test.deepEqual(g.getCards('Location1'), ['Card2'], 'top card removed')
  test.deepEqual(g.getCards('Location2'), ['Card3', 'Card1'], 'and placed in the bottom of Location2')

  test.comment('move all cards from Location2 into Location3, swap order')
  g.move('Location2', 'Location3', -1)
  test.deepEqual(g.getCards('Location1'), ['Card2'], 'untouched')
  test.deepEqual(g.getCards('Location2'), [], 'empty')
  test.deepEqual(g.getCards('Location3'), ['Card1', 'Card3'], 'reverse order of Location2 cards')

  test.comment('move in place')
  g.move('Location1', 'Location3', -1)
  test.deepEqual(g.getCards('Location3'), ['Card1', 'Card3', 'Card2'], 'all cards in place3')
  g.move('Location3', 'Location3', -1)
  test.deepEqual(g.getCards('Location3'), ['Card1', 'Card3', 'Card2'], 'keep the same order')
  g.move('Location3', 'Location3', 1, -1, 0)
  test.deepEqual(g.getCards('Location3'), ['Card2', 'Card1', 'Card3'], 'top card moved to bottom')

  test.comment('move cards, starting from empty places')
  g.move(['Location1', 'Location3'], 'Location2', -1, 0, -1)
  test.deepEqual(g.getCards('Location1'), [], 'place1 now empty')
  test.deepEqual(g.getCards('Location2'), ['Card2', 'Card1', 'Card3'], 'all cards in place2')
  test.deepEqual(g.getCards('Location3'), [], 'place3 now empty')

  test.end()
})

Tape.test('test reverse', (test) => {
  let g = new Game('Test')
  g.addLocation('Location1')
  g.addCard('Location1', 'Card1').addCard('Location1', 'Card2').addCard('Location1', 'Card3')

  g.reverse('Location1')
  test.deepEqual(g.getCards('Location1'), ['Card3', 'Card2', 'Card1'], 'reversed')

  test.end()
})

Tape.test('test shuffle', (test) => {
  let g = new Game('Test')
  const NUM_CARDS = 20
  let listOfCards = []

  g.addLocation('Location1')
  for (let i = 0; i < NUM_CARDS; ++i) {
    const cardName = `Card${i}`
    g.addCard('Location1', cardName)
    listOfCards.push(cardName)
  }

  test.equal(g.getCards('Location1').length, NUM_CARDS, 'all cards added')
  test.ok(Util.isListUnique(g.getCards('Location1')), 'all cards unique')
  test.deepEqual(g.getCards('Location1'), listOfCards, 'cards are in order')

  test.comment('shuffle')
  g.shuffle('Location1')
  test.equal(g.getCards('Location1').length, NUM_CARDS, 'all cards present')
  test.ok(Util.isListUnique(g.getCards('Location1')), 'all cards unique')
  test.notDeepEqual(g.getCards('Location1'), listOfCards, 'cards are shuffled')

  test.end()
})

Tape.test('test roll', (test) => {
  let g = new Game('Test')
  let [dice1, dice2] = [{faces: [1,2,3,4,5,6]}, {faces: ['A','B','C','D','E','F']}]

  g.addLocation('Location1')
  g.addCard('Location1', 'Dice1', dice1).addCard('Location1', 'Dice2', dice2)
  test.deepEqual(g.getCards('Location1'), ['Dice1', 'Dice2'], 'all dice added')

  g.roll('Location1')
  var lastX, lastY
  [lastX, lastY] = g.getCards('Location1').map(c => (c as any).value)

  var i = 0
  for ( ; i < 10; ++i) {
    g.roll('Location1')
    let [x,y] = g.getCards('Location1').map(c => (c as any).value)
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
  let g = new Game('Test')

  test.end()
})
