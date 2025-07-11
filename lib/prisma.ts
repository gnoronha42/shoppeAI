import { PrismaClient } from '../lib/generated/prisma';

// Adiciona interface para definir prisma no tipo global
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient()
  }
  prisma = global.prismaGlobal
}

export default prisma
