import {Game, IPickCommand} from "../system/game"
import {GameSystem} from '../system/gamesystem'
import * as m from "mithril"

let selection: string[] = []
function toggleSelection(name: string) {
  const index = selection.indexOf(name)
  if (index !== -1) {
    const item = selection.splice(index, 1)
    console.assert(item.length === 1 && item[0] === name)
  } else {
    selection.push(name)
  }
}

const BGCard = {
  view: (vnode) => {
    const command: IPickCommand = vnode.attrs.command
    const cardName = vnode.attrs.name
    const canPick = command && command.type === 'pickCards' && command.options.indexOf(cardName) !== -1
    const isPicked = selection.indexOf(cardName) !== -1
    let className = '.bg-card'
    let attrs = {}
    if (isPicked) {
      className = '.bg-card.picked'
      attrs = {onclick: () => toggleSelection(cardName)}
    } else if (canPick) {
      className = '.bg-card.can-pick'
      attrs = {onclick: () => toggleSelection(cardName)}
    }

    return (
      m(className, attrs, cardName)
    )
  }
}

const BGLocation = {
  view: (vnode) => {
    const command: IPickCommand = vnode.attrs.command
    const locationName = vnode.attrs.name
    const canPick = command && command.type === 'pickLocations' && command.options.indexOf(locationName) !== -1
    const isPicked = selection.indexOf(locationName) !== -1
    let className = '.bg-place'
    let attrs = {}
    if (isPicked) {
      className = '.bg-place.picked'
      attrs = {onclick: () => toggleSelection(locationName), tabindex: 1   }
    } else if (canPick) {
      className = '.bg-place.can-pick'
      attrs = {onclick: () => toggleSelection(locationName), tabindex: 1}
    }

    return (
      m(className, attrs,
        m('div', locationName),
        vnode.attrs.cards.slice().reverse().map((cardName, i) =>
          m(BGCard, {name: cardName, key: cardName, command: command})
        )
      )
    )
  }
}

export const BGHistory = {
  view: (vnode) => {
    const gamesystem: GameSystem = vnode.attrs.gamesystem
    return (
      m('.bg-history',
        m('button', {onclick: () => gamesystem.togglePause()}, 'P'),
        m('button', {onclick: () => gamesystem.stepBack()}, '<'),
        m('button', {onclick: () => gamesystem.stepForward()}, '>'),
        m('input.bg-history-slider', {
          type: 'range',
          min: 0,
          max: gamesystem.replay.length,
          value: gamesystem.replayIndex,
          onchange: (e) => gamesystem.seek(parseInt(e.target.value)),
          //oninput: (e) => gamesystem.seek(parseInt(e.target.value))
        })
      )
    )
  }
}

export const BGGame = {
  view: (vnode) => {
    const gamesystem: GameSystem = vnode.attrs.gamesystem
    const command: IPickCommand = vnode.attrs.command
    const pickCallback = vnode.attrs.callback
    return (
      m('.bg-game',
        m(BGHistory, {gamesystem: gamesystem}),
        pickCallback ? m('button', {onclick: () => { pickCallback(selection); selection = [] }}, 'Commit') : m('div', 'AI playing'),
        Object.keys(gamesystem.g.data.allLocations).map(locationName => {
          const place = gamesystem.g.data.allLocations[locationName]
          return m(BGLocation, {name: place.name, cards: place.cards, command: command, key: place.name})
        }),
      )
    )
  }
}

enum LocationStyle {
  FAN,
}

enum LocationXAlign {
  LEFT,
  RIGHT,
  CENTER,
  JUSTIFY, // start and end and evenly between
  SPACE_EVENLY,
  FROM_START,
  FROM_END,
  FROM_CENTER,
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

interface LocationParams {
  x: number
  y: number
  w: number
  h: number
  locationStyle: LocationStyle
  xAlign: LocationAlign
  yAlign: LocationAlign
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

function calcCardAttrs(params: LocationParams, i: number, n: number, cardWidth: number, cardHeight: number): {[key: string]: any} {
  let x = 0, y = 0
  const cx = params.x + params.w/2
  const cy = params.y + params.h/2

  switch (params.locationStyle) {
    case LocationStyle.FAN:
      x = calcFanOffset(params.xAlign, params.x, params.w, cardWidth, i, n)
      y = calcFanOffset(params.yAlign, params.y, params.h, cardHeight, i, n)
      break
  }

  return {style: {left: x + 'px', top: y + 'px', width: cardWidth + 'px', height: cardHeight + 'px'}}
}

function calcLocationAttrs(params: LocationParams): {[key: string]: any} {
  return {style: {left: params.x + 'px', top: params.y + 'px', width: params.w + 'px', height: params.h + 'px'}}
}

function calcGridAttrs(params: LocationParams, r: number, c: number, cellWidth: number, cellHeight: number): {[key: string]: string} {
  return {}
}

export const BGFan = {
  view: (vnode) => {
    const locationName = vnode.attrs.name
    const params = {x: 10, y: 10, w: 200, h: 100, locationStyle: LocationStyle.FAN, xAlign: LocationAlign.CENTER, yAlign: LocationAlign.FROM_END}
    const cardWidth = 40
    const cardHeight = 50

    return (
      m("div",
        m('#fan1', calcLocationAttrs(params)),
        ["card1", "card2", "card3", "card4", "card5", "card6", "card7", "card8"].map((name, i, cards) =>
          m(`#{$name}.card`, calcCardAttrs(params, i, cards.length, cardWidth, cardHeight), name),
        )
      )
    )
  }
}
