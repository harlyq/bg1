import {Game, IPickCommand, GameSystem} from "../system/game.js"
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

const BGPlace = {
  view: (vnode) => {
    const command: IPickCommand = vnode.attrs.command
    const placeName = vnode.attrs.name
    const canPick = command && command.type === 'pickPlaces' && command.options.indexOf(placeName) !== -1
    const isPicked = selection.indexOf(placeName) !== -1
    let className = '.bg-place'
    let attrs = {}
    if (isPicked) {
      className = '.bg-place.picked'
      attrs = {onclick: () => toggleSelection(placeName), tabindex: 1   }
    } else if (canPick) {
      className = '.bg-place.can-pick'
      attrs = {onclick: () => toggleSelection(placeName), tabindex: 1}
    }

    return (
      m(className, attrs,
        m('div', placeName),
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
          max: gamesystem.history.length,
          value: gamesystem.historyIndex,
          onchange: (e) => gamesystem.seek(parseInt(e.target.value)),
          oninput: (e) => gamesystem.seek(parseInt(e.target.value))
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
        Object.keys(gamesystem.g.data.allPlaces).map(placeName => {
          const place = gamesystem.g.data.allPlaces[placeName]
          return m(BGPlace, {name: place.name, cards: place.cards, command: command, key: place.name})
        }),
      )
    )
  }
}
