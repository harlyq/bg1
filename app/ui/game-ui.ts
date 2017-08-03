import {GameSystem} from "../system/game.js"
import * as m from "mithril"


const BGCard = {
  view: (vnode) => {
    return (
      m('.bg-card', vnode.attrs.name)
    )
  }
}

const BGPlace = {
  view: (vnode) => {
    return (
      m('.bg-place',
        m('div', vnode.attrs.name),
        vnode.attrs.cards.slice().reverse().map(cardName =>
          m(BGCard, {name: cardName, key: cardName})
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
    return (
      m('.bg-game',
        m(BGHistory, {gamesystem: gamesystem}),
        Object.keys(gamesystem.g.data.allPlaces).map(placeName => {
          const place = gamesystem.g.data.allPlaces[placeName]
          return m(BGPlace, {name: place.name, cards: place.cards, key: place.name})
        }),
      )
    )
  }
}
