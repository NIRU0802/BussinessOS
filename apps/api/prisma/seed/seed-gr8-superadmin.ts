/**
 * One-off provisioning script for the first GR8 Superadmin account.
 *
 * There is deliberately no API signup/register endpoint for Super Admins —
 * GR8 accounts must be created this way, directly against the database,
 * by someone with server/DB access. Team Superadmin accounts should later
 * be created BY a logged-in GR8 through the app (a future endpoint), not
 * via this script.
 *
 * Usage:
 *   pnpm ts-node prisma/seed/seed-gr8-superadmin.ts
 *
 * NOTE: Password input is NOT masked in this version — it will be visible
 * on screen as you type. This is acceptable for local dev provisioning only.
 * Do not run this over a screen-shared session or recorded terminal.
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as readline from 'readline';

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return 'Password must be at least 12 characters (GR8 is the highest-privilege account on the platform).';
  }
  if (!/[A-Z]/.test(password))
    return 'Password must contain an uppercase letter.';
  if (!/[a-z]/.test(password))
    return 'Password must contain a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a number.';
  if (!/[^A-Za-z0-9]/.test(password))
    return 'Password must contain a special character.';
  return null;
}

async function main() {
  console.log('==============================================');
  console.log(' GR8 SUPERADMIN PROVISIONING — Business OS');
  console.log(' This creates the single root-level platform identity.');
  console.log('==============================================\n');

  const existingGr8Count = await prisma.superAdminUser.count({
    where: { admin_type: 'GR8' },
  });

  if (existingGr8Count > 0) {
    console.log(
      `⚠ Warning: ${existingGr8Count} GR8 account(s) already exist. ` +
        `The spec allows "exactly one root-level identity type" but does not ` +
        `forbid multiple GR8 accounts for redundancy/succession purposes.`,
    );
    const proceed = await ask(
      'Continue creating another GR8 account? (yes/no): ',
    );
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const email = await ask('Email: ');
  if (!validateEmail(email)) {
    console.error('❌ Invalid email format.');
    process.exit(1);
  }

  const existing = await prisma.superAdminUser.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ A super admin with email "${email}" already exists.`);
    process.exit(1);
  }

  const fullName = await ask('Full name: ');
  if (!fullName) {
    console.error('❌ Full name is required.');
    process.exit(1);
  }

  const password = await ask('Password (will be visible — local dev only): ');
  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    console.error(`❌ ${passwordError}`);
    process.exit(1);
  }

  const confirmPassword = await ask('Confirm password: ');
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match.');
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.superAdminUser.create({
    data: {
      email,
      password_hash: passwordHash,
      full_name: fullName,
      admin_type: 'GR8',
      status: 'active',
    },
  });

  // This provisioning event itself is audit-worthy. The FK on super_admin_id
  // requires a valid actor, so the newly created GR8 is recorded as the actor
  // of its own creation event, with metadata noting it was provisioned via
  // CLI script, not through the app.
  await prisma.superAdminAuditLog.create({
    data: {
      super_admin_id: admin.id,
      admin_type_at_time: admin.admin_type,
      target_tenant_id: null,
      action: 'super_admin.provisioned_via_seed_script',
      resource_type: 'super_admin_user',
      resource_id: admin.id,
      metadata: {
        note: 'Created via seed-gr8-superadmin.ts CLI script, not via API',
        createdBy: 'manual-provisioning',
      },
    },
  });

  console.log('\n✅ GR8 Superadmin account created successfully.');
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log('\nYou can now log in at POST /super-admin/auth/login\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
