import * as m from 'mithril'
import * as SVG from 'svg.js'
import {Util} from '../system/util'

// enum LocationFacing {
//   UP,
//   DOWN,
//   DONT_CARE
// }

enum LocationStyle {
  FAN,
}

enum LocationAlign {
  START,
  END,
  CENTER,
  JUSTIFY, // start and end and evenly between
  SPACE_EVENLY,
  FROM_START,
  FROM_END,
  FROM_CENTER,
}

interface ICard {
  faceUp?: boolean
  w?: number
  h?: number
}

interface ILocation {
  cards?: string[]
  // facing: LocationFacing // manage facing on the server
  x: number
  y: number
  w: number
  h: number
  style: LocationStyle
  xAlign: LocationAlign
  yAlign: LocationAlign
}

interface IPlayer {

}

const ViewCard = {
  view: (vnode) => {
    const isFaceUp = vnode.attrs.faceUp
    return (
      m('div.card', vnode.attrs, vnode.attrs.name) // TODO need to ensure id is unique
    )
  }
}

const ViewLocation = {
  view: (vnode) => {
    return (
      m('div.location#' + vnode.attrs.name, vnode.attrs, '')
    )
  }
}

const ViewPlayer = {
  view: (vnode) => {
    return (
      m('div.player#' + vnode.attrs.name, vnode.attrs, '')
    )
  }
}

const ViewGame = {
  view: (vnode) => {
    const game: GameStruct = vnode.attrs.game

    // build up the card list from all of the cards that have been placed on locations
    let cards = []
    Object.keys(game.allLocations).forEach(location => {
      const iLocation = game.allLocations[location]
      const n = iLocation.cards.length
      iLocation.cards.forEach((card, i) => {
        cards.push( m( ViewCard, {name: card, ...game.getCardAttrs(card, location, i, n)} ) )
      })
    })

    // use absolute positioning and z-index for everything, no nesting means faster rendering
    return (
      m('div.game', {},
        Object.keys(game.allPlayers).map(player => m( ViewPlayer, {name: player} )),
        Object.keys(game.allLocations).map(location => m( ViewLocation, {name: location, ...game.getLocationAttrs(location)} )),
        cards,
      )
    )
  }
}

function calcFanOffset(align: LocationAlign, x, w, dx, i, n): number {
  const evenx = (w - dx)/(n - 1)
  const minx = Math.min(evenx, dx)

  switch (align) {
    case LocationAlign.START:
      return x// + i*minx
    case LocationAlign.END:
      return x + w - dx// - i*minx
    case LocationAlign.CENTER:
      return x + (w - dx)/2// + (i - n/2)*minx
    case LocationAlign.JUSTIFY:
      let justifyx = (w - dx*n)/(n - 1) + dx
      return x + i*justifyx
    case LocationAlign.SPACE_EVENLY:
      return x + (3*i + 1)*w/(3*n + 1)
    case LocationAlign.FROM_START:
      return x + i*minx
    case LocationAlign.FROM_END:
      return x + w - dx - i*minx
    case LocationAlign.FROM_CENTER:
      return x + (w - dx)/2 + (i - (n - 1)/2)*minx
  }
}

function calcCardAttrs(cardParams: ICard, locationParams: ILocation, i: number, n: number): {[key: string]: any} {
  let x = 0, y = 0
  const cx = locationParams.x + locationParams.w/2
  const cy = locationParams.y + locationParams.h/2

  switch (locationParams.style) {
    case LocationStyle.FAN:
      x = calcFanOffset(locationParams.xAlign, locationParams.x, locationParams.w, cardParams.w, i, n)
      y = calcFanOffset(locationParams.yAlign, locationParams.y, locationParams.h, cardParams.h, i, n)
      break
  }

  // TODO when we build up the card list from low i to high i, zIndex is not needed
  return {style: {left: x + 'px', top: y + 'px', width: cardParams.w + 'px', height: cardParams.h + 'px', zIndex: i}, faceUp: cardParams.faceUp}
}

function calcLocationAttrs(params: ILocation): {[key: string]: any} {
  return {style: {left: params.x + 'px', top: params.y + 'px', width: params.w + 'px', height: params.h + 'px'}}
}


class GameStruct {
  allCards: {[name: string]: ICard} = {}
  allLocations: {[name: string]: ILocation} = {}
  allPlayers: {[name: string]: IPlayer} = {}

  // one card can be added to multiple locations (e.g. card backs), but this
  // data will affect all cards with that name
  public addCard(location: string, card: string, data?: ICard) {
    console.assert(typeof this.allLocations[location] !== 'undefined')
    console.assert(typeof this.allCards[card] !== 'undefined')

    let iLocation = this.allLocations[location]
    this.allCards[card] = Util.mergeJSON(this.allCards[card], data)
    iLocation.cards.push(card)
  }

  public createCard(card: string, data: ICard) {
    console.assert(typeof this.allCards[card] === 'undefined')
    console.assert(typeof this.allLocations[card] === 'undefined')
    console.assert(typeof this.allPlayers[card] === 'undefined')
    this.allCards[card] = Util.mergeJSON(this.allCards[card], data)
  }

  public createLocation(location: string, data: ILocation) {
    console.assert(typeof this.allCards[location] === 'undefined')
    console.assert(typeof this.allLocations[location] === 'undefined')
    console.assert(typeof this.allPlayers[location] === 'undefined')
    this.allLocations[location] = Util.mergeJSON(this.allLocations[location], data)
    this.allLocations[location].cards = []
  }

  public createPlayer(player: string, data: IPlayer) {
    console.assert(typeof this.allCards[player] === 'undefined')
    console.assert(typeof this.allLocations[player] === 'undefined')
    console.assert(typeof this.allPlayers[player] === 'undefined')
    this.allPlayers[player] = Util.mergeJSON(this.allPlayers[player], data)
  }

  // This removes the card from the 'from' location and adds a card to the
  // 'to' location, potentially changing the card name.
  public moveCard(from: string, fromIndex: number, to: string, toIndex: number, newCard?: string, newData?: ICard) {
    let iFrom = this.allLocations[from]
    let iTo = this.allLocations[to]
    console.assert(typeof iFrom !== 'undefined')
    console.assert(typeof iTo !== 'undefined')
    console.assert(fromIndex >= 0 && fromIndex <= iFrom.cards.length)
    console.assert(toIndex >= 0 && toIndex <= iTo.cards.length)

    let oldCard = iFrom.cards.splice(fromIndex, 1)
    if (typeof newCard === 'undefined') {
      newCard = oldCard[0]
    }

    iTo.cards.splice(toIndex, 0, newCard)

    this.allCards[newCard] = Util.mergeJSON(this.allCards[newCard], newData)
  }

  public getCardAttrs(card: string, location: string, i: number, n: number): {[key: string]: any} {
    const iCard = this.allCards[card]
    console.assert(typeof iCard !== 'undefined')
    const iLocation = this.allLocations[location]
    console.assert(typeof iLocation !== 'undefined')

    let attrs = calcCardAttrs(iCard, iLocation, i, n)
    return attrs
  }

  public getLocationAttrs(location: string): {[key: string]: any} {
    const iLocation = this.allLocations[location]
    console.assert(typeof iLocation !== 'undefined')

    let attrs = calcLocationAttrs(iLocation)
    return attrs
  }

  public getPlayerAttrs(player: string): {[key: string]: any} {
    return {}
  }

  public getCards(location: string): string[] {
    const iLocation = this.allLocations[location]
    console.assert(typeof iLocation !== 'undefined')

    return iLocation.cards
  }

  public render(elem) {
    m.render(elem, m(ViewGame, {game: gs}))
  }
}

let gs = new GameStruct()
gs.createLocation('deck', {x: 10, y: 10, w: 200, h: 100, style: LocationStyle.FAN, xAlign: LocationAlign.FROM_START, yAlign: LocationAlign.CENTER})
gs.createLocation('discard', {x: 10, y: 120, w: 200, h: 100, style: LocationStyle.FAN, xAlign: LocationAlign.FROM_START, yAlign: LocationAlign.CENTER})
gs.createLocation('hand', {x: 10, y: 230, w: 200, h: 100, style: LocationStyle.FAN, xAlign: LocationAlign.FROM_START, yAlign: LocationAlign.CENTER})

gs.createCard('c?', {w: 60, h: 80}) // card back
gs.createCard('c1', {w: 60, h: 80})
gs.createCard('c2', {w: 60, h: 80})
gs.createCard('c3', {w: 60, h: 80})
gs.createCard('c4', {w: 60, h: 80})

gs.addCard('deck', 'c?')
gs.addCard('deck', 'c?')
gs.addCard('deck', 'c?')
gs.addCard('deck', 'c?')

const content = document.getElementById('content')
gs.render(content)

let moveList = ['c4', 'c3', 'c1']
let moveIndex = 0
let move2List = ['c1', 'c3']
let move2Index = 0

function moveCard() {
  if (moveIndex < moveList.length) {
    gs.moveCard('deck', moveList.length - moveIndex - 1, 'discard', moveIndex, moveList[moveIndex])
    moveIndex++
    gs.render(content)
    setTimeout(moveCard, 2000)
  } else if (move2Index < move2List.length) {
    const card = move2List[move2Index]
    const index = gs.getCards('discard').indexOf(card)
    gs.moveCard('discard', index, 'hand', 0, 'c?')
    move2Index++
    gs.render(content)
    setTimeout(moveCard, 2000)
  }
}

setTimeout(moveCard, 2000)


let data = {value: 'hi', name: 'blah'}
const r = /}}|{{|{(\w+)}/g
function parse(str) {
  return str.replace(r, (_, attr) => {
    switch(_) {
      case '{{': return '{'
      case '}}': return '}'
      default: return attr.split('.').reduce((v, x) => v[x], data)
    }
  })
}

function makeCard(data) {
  // could be an svg or an img
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
}


{
  let draw = SVG('content').size(500,500)//.rotate(10, 0, 0)
  let rect = draw.rect(100, 100).stroke('#006').fill('#ffc')
  let text = draw.text(parse('{value} {name}')).center(100, 100).font({size: 80})
  draw.rotate(10, 0, 0)

  let svgObject = document.querySelector("#svgObject") as any
  let svgDoc = svgObject.contentDocument
  let linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
  linkElm.setAttribute("href", "svg-style.css");
  linkElm.setAttribute("type", "text/css");
  linkElm.setAttribute("rel", "stylesheet");
  svgDoc.querySelector("svg").appendChild(linkElm);

  let cardFront = svgDoc.querySelector('#card-front')
  let cardFront2 = cardFront.cloneNode(true)
  let svgCardFront2 = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svgCardFront2.setAttribute("width", "300px")
  svgCardFront2.setAttribute("height", "300px")
  svgCardFront2.appendChild(cardFront2)
  document.body.appendChild(svgCardFront2)

  svgDoc.querySelector("#tspan4562").textContent = 'new content'

  let cardElem = makeCard({})
}
