import {Game, IPickCommand} from "../system/game"
import {GameSystem} from '../system/gamesystem'
import * as m from "mithril"

let highlights = []
let gamesystem
let pickCallback
let selections: string[] = []
function toggleSelection(name: string) {
  const index = selections.indexOf(name)
  if (index !== -1) {
    const item = selections.splice(index, 1)
    console.assert(item.length === 1 && item[0] === name)
  } else {
    selections.push(name)
  }

  // if selecting a single thing is valid, then don't wait for a confirm
  // before sending back the choice
  if (selections.length === 1) {
    if (gamesystem.g.commands.some(command => gamesystem.g.isValidResult(command, selections))) {
      pickCallback(selections)
      selections = []
      highlights = []
    }
  }

  gamesystem.g.debugRender()
}

const BGCard = {
  view: (vnode) => {
    const cardName = vnode.attrs.name
    const gamesystem: GameSystem = vnode.attrs.gamesystem
    const canPick = gamesystem && highlights.indexOf(cardName) !== -1
    const isPicked = selections.indexOf(cardName) !== -1
    let className = '.bg-card'
    let attrs = {}
    if (isPicked) {
      className = '.bg-card.selected'
      attrs = {onclick: () => toggleSelection(cardName)}
    } else if (canPick) {
      className = '.bg-card.highlight'
      attrs = {onclick: () => toggleSelection(cardName)}
    }

    return (
      m(className, attrs, cardName)
    )
  }
}

const BGLocation = {
  view: (vnode) => {
    const locationName = vnode.attrs.name
    const gamesystem: GameSystem = vnode.attrs.gamesystem
    const canPick = gamesystem && highlights.indexOf(locationName) !== -1
    const isPicked = selections.indexOf(locationName) !== -1
    let className = '.bg-place'
    let attrs = {}
    if (isPicked) {
      className = '.bg-place.selected'
      attrs = {onclick: () => toggleSelection(locationName), tabindex: 1   }
    } else if (canPick) {
      className = '.bg-place.highlight'
      attrs = {onclick: () => toggleSelection(locationName), tabindex: 1}
    }

    return (
      m(className, attrs,
        m('div', `${locationName} (${vnode.attrs.cards.length})`),
        vnode.attrs.cards.slice().reverse().map((cardName, i) =>
          m(BGCard, {name: cardName, key: cardName, gamesystem: gamesystem})
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
          // oninput: (e) => gamesystem.seek(parseInt(e.target.value)) TODO need to manage overlapping requests
        })
      )
    )
  }
}

export const BGPlayer = {
  view: (vnode) => {
    const player = vnode.attrs.name
    const gamesystem: GameSystem = vnode.attrs.gamesystem
    const isSelected = gamesystem.getViewer() == player
    return [
      m('input[type="radio"]', {value: player, checked: isSelected, onclick: () => gamesystem.setViewer(player)}),
      player
    ]
  }
}

export const BGGame = {
  view: (vnode) => {
    gamesystem = vnode.attrs.gamesystem
    const command: IPickCommand = vnode.attrs.command
    pickCallback = gamesystem.g.onHumanPicked
    highlights = gamesystem.g.highlights || []
    const who = gamesystem.getViewer()
    const g = gamesystem.g
    return (
      m('.bg-game',
        m(BGHistory, {gamesystem: gamesystem}),
        pickCallback ? m('button', {onclick: () => { pickCallback(selections); selections = [], highlights =  [] }}, 'Commit') : m('div', 'AI playing'),
        m('', {},
          Object.keys(g.data.allPlayers).map(playerName => {
            return m(BGPlayer, {gamesystem: gamesystem, name: playerName})
          }),
          m(BGPlayer, {gamesystem: gamesystem, name: 'DEBUG'}),
        ),
        Object.keys(g.data.allLocations).map(locationName => {
          return m(BGLocation, {name: locationName, cards: g.getCardsByWho(locationName, who), gamesystem: gamesystem, key: locationName})
        }),
      )
    )
  }
}

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
