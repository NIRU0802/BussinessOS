import { PrismaClient } from '@prisma/client';
import { seedFeatureWidgets } from '../../src/modules/widgets/widgets.seed';

const prisma = new PrismaClient();

const PERMISSIONS: { key: string; module: string; description: string }[] = [
  { key: 'orders.read', module: 'orders', description: 'View orders' },
  {
    key: 'orders.write',
    module: 'orders',
    description: 'Create/update orders',
  },
  {
    key: 'orders.void',
    module: 'orders',
    description: 'Void or refund orders',
  },
  {
    key: 'orders.read.own',
    module: 'orders',
    description: 'View own orders (customer)',
  },
  { key: 'menu.read', module: 'menu', description: 'View menu' },
  { key: 'menu.write', module: 'menu', description: 'Edit menu items' },
  { key: 'reports.read', module: 'reports', description: 'View reports' },
  { key: 'staff.read', module: 'staff', description: 'View staff/roles' },
  { key: 'staff.write', module: 'staff', description: 'Manage staff/roles' },
  { key: 'branches.read', module: 'branches', description: 'View branches' },
  { key: 'branches.write', module: 'branches', description: 'Manage branches' },
  { key: 'crm.read', module: 'crm', description: 'View customers' },
  { key: 'crm.write', module: 'crm', description: 'Manage customers' },
  { key: 'kds.read', module: 'kds', description: 'View kitchen display' },
  {
    key: 'kds.write',
    module: 'kds',
    description: 'Update kitchen order status',
  },
  { key: 'inventory.read', module: 'inventory', description: 'View inventory' },
  {
    key: 'inventory.write',
    module: 'inventory',
    description: 'Manage inventory',
  },
  {
    key: 'inventory.adjust',
    module: 'inventory',
    description: 'Manually adjust stock levels (purchase/waste/correction)',
  },
  {
    key: 'payments.read',
    module: 'payments',
    description: 'View payment records',
  },
  {
    key: 'delivery.read',
    module: 'delivery',
    description: 'View delivery orders',
  },
  {
    key: 'delivery.write',
    module: 'delivery',
    description: 'Update delivery status',
  },
  {
    key: 'qr.order',
    module: 'qr',
    description: 'Place order via QR/table flow',
  },
  { key: 'tables.read', module: 'tables', description: 'View tables' },
  {
    key: 'tables.write',
    module: 'tables',
    description: 'Create/update/delete tables',
  },
  {
    key: 'tables.manage',
    module: 'tables',
    description: 'Merge/split tables and manage QR codes',
  },
  {
    key: 'reservations.read',
    module: 'reservations',
    description: 'View reservations',
  },
  {
    key: 'reservations.write',
    module: 'reservations',
    description: 'Create/update reservations',
  },
];

async function main() {
  console.log('Seeding permission catalog...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions.`);

  console.log('Seeding feature widget catalog...');
  await seedFeatureWidgets(prisma);
  console.log('Seeded feature widget catalog.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
