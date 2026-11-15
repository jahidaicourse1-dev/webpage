import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: npm run hash-password -- "YourStrongPassword" (minimum 8 characters)');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
