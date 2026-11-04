import { seedFashionDemo } from '../src/services/fashionDemoSeedService.js';
import { pool } from '../src/models/database.js';

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--created-by' || !/^[1-9][0-9]*$/.test(args[1]) || !Number.isSafeInteger(Number(args[1])))) {
    throw new Error('Cách chạy: npm run db:seed:fashion -- [--created-by USER_ID]');
  }
  console.log(JSON.stringify(await seedFashionDemo(args.length ? Number(args[1]) : undefined), null, 2));
} catch (error: any) {
  console.error('Seed LUMINA FASHION thất bại:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
