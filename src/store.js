import Vue from 'vue'
import Vuex from 'vuex'
import { getAlbums, getRank, getPlayer } from './api'
import { set as cookieSet } from 'js-cookie'

Vue.use(Vuex)

export const createStore = ({ lang }) => new Vuex.Store({
  state: {
    fullAlbums: {},
    rankCache: {},
    userCache: {},
    lang
  },
  getters: {
    albumsArray: ({ fullAlbums }) => Object.values(fullAlbums),
    allMusics: ({ fullAlbums }) => {
      return Object.assign({}, ...Object.values(fullAlbums).map(({ music }) => music))
    }
  },
  mutations: {
    setAlbums(state, data) {
      state.fullAlbums = data
    },
    setRank(state, { uid, difficulty, platform, rank }) {
      state.rankCache = { ...state.rankCache, [`${uid}_${platform}_${difficulty}`]: rank }
    },
    setUser(state, { id, data }) {
      state.userCache = { ...state.userCache, [id]: data }
    },
    setLang(state, data) {
      cookieSet('lang', data)
      state.lang = data
    }
  },
  actions: {
    async loadAlbums({ commit }) {
      commit('setAlbums', await getAlbums())
    },
    async loadRank({ commit }, { uid, difficulty, platform }) {
      commit('setRank', { uid, difficulty, platform, rank: await getRank({ uid, difficulty, platform }) })
    },
    async loadUser({ commit }, id) {
      commit('setUser', { id, data: await getPlayer(id) })
    }
  }
})
