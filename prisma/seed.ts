import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const collections = [
 ['Scared Cats','scared-cats','#e9dca4','Wide-eyed icons with a little attitude.'],['Plush Pepe','plush-pepe','#7b9d68','Soft, swampy and unmistakably Pepe.'],['Swiss Watch','swiss-watch','#93a4b8','Precision-made collectibles.'],["Durov's Cap",'durovs-cap','#9c3c45','A stitched piece of Telegram history.'],['Loot Bag','loot-bag','#b68745','Rare finds worth keeping close.'],['Voodoo Doll','voodoo-doll','#735a91','Strange, charming and slightly haunted.'],['Nail Bracelet','nail-bracelet','#c88d91','A polished edge for your collection.']
]
async function main() { for (const [name,slug,accentColor,description] of collections) await prisma.collection.upsert({ where:{slug}, update:{}, create:{name,slug,accentColor,description,coverImage:`/collections/${slug}.jpg`} }); console.log(`Seeded ${collections.length} collections.`) }
main().finally(() => prisma.$disconnect())
