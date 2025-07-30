import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash('123456', 10);

  const user = await prisma.users.create({
    data: {
      email: 'user@teste.com',
      password: hashedPassword,
      name: 'Usuário Teste',
      role: 'user',
      permissions: ['manage_analysis'], // Permissão apenas para gerar análises
    },
  });

  console.log('Usuário criado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 