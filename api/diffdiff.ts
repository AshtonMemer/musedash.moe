import { characterSkip, elfinSkip } from './config.js'
import { MusicData, MusicCore, PlayerValue } from './type.js'
import { wait } from './common.js'

import { rank as rankDB, putDiffDiff, playerDiff, getDiffDiff } from './database.js'

const parseMusicc = (music: MusicData) => {
  const { uid, difficulty: difficulties } = music
  return difficulties.map((difficultyNum, difficulty) => {
    if (difficultyNum !== '0') {
      return { uid, difficulty, level: difficultyNum } as MusicCoreExtended
    }
  }).filter(Boolean)
}

export const diffdiff = async (musics: MusicData[]) => {
  const musicList = musics.map(parseMusicc).flat()
  const rankMap = new WeakMap<MusicCore, IdPercentagePairs>()
  const absoluteValueMap = new WeakMap<MusicCore, number>()

  for (const music of musicList) {
    const { uid, difficulty } = music

    const ranks = await rankDB.get({ uid, difficulty, platform: 'all' })
    const pairs = ranks
      .filter(({ play: { elfin_uid, character_uid } }) => !characterSkip.includes(character_uid) && !elfinSkip.includes(elfin_uid))
      .map(({ platform, user: { user_id }, play: { acc } }) => [`${user_id}${platform}`, acc])
    rankMap.set(music, Object.fromEntries(pairs))
    absoluteValueMap.set(music, 0)
  }

  for (let index = 0; index < musicList.length; index++) {
    const music = musicList[index];
    const rank = rankMap.get(music)
    await wait(5)

    for (let index2 = index + 1; index2 < musicList.length; index2++) {
      const music2 = musicList[index2];
      const rank2 = rankMap.get(music2)

      const keys = Object.keys(rank).filter(key => rank2[key] !== undefined)
      if (keys.length) {
        const sum = keys.map(key => [rank[key], rank2[key]]).map(([acc1, acc2]) => accJudge(acc1) - accJudge(acc2)).reduce((sumDiff, accDiff) => sumDiff + accDiff, 0)
        const averageDiff = sum / keys.length
        absoluteValueMap.set(music, absoluteValueMap.get(music) - averageDiff)
        absoluteValueMap.set(music2, absoluteValueMap.get(music2) + averageDiff)
      }
    }
  }

  const sortedMusicList = musicList
    .sort((a, b) => absoluteValueMap.get(b) - absoluteValueMap.get(a))
    .map(music => {
      const { uid, difficulty, level } = music
      return { uid, difficulty, level, absolute: absoluteValueMap.get(music) }
    })

  const levelAverage = {} as LevelAverage
  sortedMusicList.forEach(({ level }, index) => {
    if (!Number.isNaN(Number(level))) {
      levelAverage[level] = levelAverage[level] || { sum: 0, count: 0, level: Number(level) }
      levelAverage[level].sum += index
      levelAverage[level].count += 1
    }
  })

  const levels = Object.keys(levelAverage).map(Number).sort((a, b) => b - a)
  const indexes = Object.values(levelAverage).map(({ sum, count }) => sum / count).sort((a, b) => a - b)
  const maxLevel = Math.max(...levels)

  const levelsInclude = [maxLevel + 0.5, ...levels, 0]
  const indexesInclude = [0, ...indexes, sortedMusicList.length]

  const interpolate = (x: number) => {
    const i = indexesInclude.findIndex(index => x < index)
    const index1 = indexesInclude[i - 1]
    const index2 = indexesInclude[i]
    const level1 = levelsInclude[i - 1]
    const level2 = levelsInclude[i]
    return level1 + (level2 - level1) * (x - index1) / (index2 - index1)
  }

  const diffDiff = sortedMusicList.map((music, i) => ({ ...music, relative: interpolate(i) } as MusicDiffDiff))
  await putDiffDiff(diffDiff)
}

const accJudge = (acc: number) => {
  const factor = acc / 100
  return factor - Math.pow(factor, 2) + Math.pow(factor, 4)
}

export const diffPlayer = async (players: [string, PlayerValue][]) => {
  const diffDiff = await getDiffDiff()
  const diffDiffMap = {} as Record<string, number[]>
  diffDiff.forEach(({ uid, difficulty, relative }) => {
    if (!diffDiffMap[uid]) {
      diffDiffMap[uid] = []
    }
    diffDiffMap[uid][difficulty] = relative
  })

  const batch = playerDiff.batch()
  for (const [id, { plays }] of players) {
    const accMap = {} as Record<string, number[]>
    plays
      .filter(({ character_uid, elfin_uid }) => !characterSkip.includes(character_uid) && !elfinSkip.includes(elfin_uid))
      .forEach(({ uid, difficulty, acc }) => {
        if (!accMap[uid]) {
          accMap[uid] = []
        }
        if (accMap[uid][difficulty] === undefined) {
          accMap[uid][difficulty] = acc
        } else {
          accMap[uid][difficulty] = Math.max(accMap[uid][difficulty], acc)
        }
      })

    const rl = Object.entries(accMap)
      .flatMap(([uid, accs]) => accs.map((acc, difficulty) => ({ uid, difficulty, acc })))
      .filter(({ acc }) => acc !== undefined)
      .map(({ uid, difficulty, acc }) => accJudge(acc) * diffDiffMap[uid][difficulty])
      .sort((a, b) => a - b)
      .reduce((r, a) => a + r * 0.8, 0) / 5

    batch.put(id, rl)
  }
  await playerDiff.clear()
  await batch.write()
}

type IdPercentagePairs = Record<string, number>

type MusicCoreExtended = MusicCore & {
  level: string
}

export type MusicDiffDiff = MusicCoreExtended & {
  absolute: number
  relative: number
}

type LevelAverage = Record<string, { sum: number, count: number, level: number }>
