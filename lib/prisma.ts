import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
if (Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hexadecimal characters) long');
}

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift()!, 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

const prisma = new PrismaClient().$extends({
  query: {
    trade: {
      async createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data.forEach(trade => {
            if (trade.accountNumber && typeof trade.accountNumber === 'string') {
              trade.accountNumber = encrypt(trade.accountNumber);
            }
            if (trade.entryPrice) {
              trade.entryPrice = encrypt(trade.entryPrice);
            }
            if (trade.closePrice) {
              trade.closePrice = encrypt(trade.closePrice);
            }
            // if (trade.userId) {
            //   trade.userId = encrypt(trade.userId);
            // }
          });
        }
        return query(args);
      },
      async findMany({ args, query }) {
        const trades = await query(args);
        console.log(trades)
        trades.forEach(trade => {
          if (trade.accountNumber && typeof trade.accountNumber === 'string') {
            trade.accountNumber = decrypt(trade.accountNumber);
          }
          if (trade.entryPrice) {
            trade.entryPrice = decrypt(trade.entryPrice);
          }
          if (trade.closePrice) {
            trade.closePrice = decrypt(trade.closePrice);
          }
          // if (trade.userId) {
          //   trade.userId = decrypt(trade.userId);
          // }
        });
        return trades;
      }
    }
  }
});

export default prisma;