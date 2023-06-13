export const SECRET_KEY = process.env.SECRET_KEY ?? '';
if (!SECRET_KEY) {
  throw new Error('Environment variable SECRET_KEY not found');
}
