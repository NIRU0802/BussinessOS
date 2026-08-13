import { PrismaClient } from '@prisma/client';

/**
 * Seeds the feature_widgets catalog with the 12 confirmed in-scope widgets.
 * Call this from your main seed entrypoint (the same one blocked on the
 * ts-node linking issue) once that's resolved — e.g.:
 *
 *   import { seedFeatureWidgets } from '../src/modules/widgets/widgets.seed';
 *   await seedFeatureWidgets(prisma);
 */
export async function seedFeatureWidgets(prisma: PrismaClient) {
  const widgets: {
    widgetKey: string;
    name: string;
    description: string;
  }[] = [
    {
      widgetKey: 'pos',
      name: 'POS / Orders',
      description: 'Point of sale and order taking.',
    },
    {
      widgetKey: 'menu',
      name: 'Menu & Catalog',
      description:
        'Menu items, categories, per-branch pricing and availability.',
    },
    {
      widgetKey: 'tables',
      name: 'Tables & Dine-in',
      description: 'Table layout and dine-in management.',
    },
    {
      widgetKey: 'reservations',
      name: 'Reservations',
      description: 'Table reservation management.',
    },
    {
      widgetKey: 'qr_ordering',
      name: 'QR Ordering',
      description: 'Signed QR-code based customer self-ordering.',
    },
    {
      widgetKey: 'kds',
      name: 'Kitchen Display System',
      description: 'Real-time kitchen order display.',
    },
    {
      widgetKey: 'inventory',
      name: 'Inventory & Stock',
      description: 'Stock tracking and low-stock alerts.',
    },
    {
      widgetKey: 'crm',
      name: 'CRM',
      description: 'Customer 360 profile and birthday automation.',
    },
    {
      widgetKey: 'reports',
      name: 'Reports & Analytics',
      description: 'Multi-branch reporting and analytics rollup.',
    },
    {
      widgetKey: 'expenses',
      name: 'Expenses & Accounting',
      description: 'Expense tracking and basic accounting.',
    },
    {
      widgetKey: 'payments',
      name: 'Payments',
      description: 'Cash, Card, and UPI payment recording.',
    },
    {
      widgetKey: 'delivery_aggregator',
      name: 'Delivery Aggregator',
      description: 'Zomato / Swiggy / UberEats integration via adapters.',
    },
  ];

  for (const widget of widgets) {
    await prisma.featureWidget.upsert({
      where: { widgetKey: widget.widgetKey },
      create: { ...widget, status: 'active' },
      update: { name: widget.name, description: widget.description },
    });
  }
}
