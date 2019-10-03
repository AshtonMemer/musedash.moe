import { join } from 'path'
import { promises as fs } from 'fs'

const availableLocales = ['ChineseS', 'ChineseT', 'English', 'Japanese', 'Korean']

// eslint-disable-next-line no-control-regex
const parseFile = async (file: string): Promise<any> => JSON.parse(String(await fs.readFile(join(__dirname, 'albums', `${file}.txt`))).replace(/\n/g, '').replace(/,( |\x09)*}/g, '}').replace(/,( |\x09)*]/g, ']'))

const readLocale = async (file: string) => {
  const content = await parseFile(file)
  const locales = await Promise.all(availableLocales
    .map(locale => parseFile(`${file}_${locale}`)))
  return content
    .map((object, index) => {
      availableLocales.forEach((locale, localeIndex) => {
        object[locale] = locales[localeIndex][index]
      })
      return object
    })
}

export default async () => {
  const albums = (await readLocale('albums'))
    .filter(album => album.jsonName)
    .map(({ title, jsonName, ChineseS, ChineseT, English, Japanese, Korean }) => ({ title, json: jsonName, ChineseS, ChineseT, English, Japanese, Korean }))
    .map(async object => {
      const music = (await readLocale(object.json))
        .map(({ uid, name, author, cover, difficulty1, difficulty2, difficulty3, ChineseS, ChineseT, English, Japanese, Korean, levelDesigner, levelDesigner1, levelDesigner2, levelDesigner3 }) => ({
          uid,
          name,
          author,
          cover,
          levelDesigner: levelDesigner ? [levelDesigner] : [levelDesigner1, levelDesigner2, levelDesigner3],
          difficulty: [Number(difficulty1), Number(difficulty2), Number(difficulty3)],
          ChineseS,
          ChineseT,
          English,
          Japanese,
          Korean
        }))
      return { ...object, music }
    })
  return Promise.all(albums)
}
