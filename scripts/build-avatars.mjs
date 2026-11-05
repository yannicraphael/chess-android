// Generates public/avatars/*.svg from src/data/bots.json with DiceBear "Avataaars" (by Pablo Stanley, free for personal and commercial use).
// Usage (needs @dicebear/core@9 and @dicebear/collection@9 installed): node scripts/build-avatars.mjs src/data/bots.json public/avatars
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'
import { readFileSync, writeFileSync } from 'fs'
const bots = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const out = process.argv[3]
const happy = ['happy', 'default', 'wink', 'squint']
const mouths = ['smile', 'twinkle', 'default']
const brows = ['defaultNatural', 'raisedExcitedNatural', 'flatNatural']
let i = 0
for (const b of bots) {
  if (!b.look) continue
  const L = b.look
  const opts = {
    seed: b.id,
    top: [L.top], hairColor: [L.hairColor], hatColor: ['3c4f5c'], skinColor: [L.skin],
    facialHair: L.facialHair ? [L.facialHair] : [], facialHairProbability: L.facialHair ? 100 : 0, facialHairColor: [L.hairColor],
    accessories: L.acc ? [L.acc] : [], accessoriesProbability: L.acc ? 100 : 0, accessoriesColor: ['262e33'],
    clothing: [L.clothing], clothesColor: [L.clothesColor],
    eyes: [happy[i % happy.length]], mouth: [mouths[i % mouths.length]], eyebrows: [brows[i % brows.length]],
    style: ['default'], backgroundColor: ['transparent'],
  }
  writeFileSync(`${out}/${b.id}.svg`, createAvatar(avataaars, opts).toString())
  i++
}
console.log('done', i)
