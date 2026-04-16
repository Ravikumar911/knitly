export const LOCAL_MODE = process.env.LOCAL_MODE !== 'false';

export const LOCAL_USER_ID = process.env.LOCAL_USER_ID ?? '11111111-1111-1111-1111-111111111111';

export const LOCAL_USER = {
  id: LOCAL_USER_ID,
  email: process.env.LOCAL_USER_EMAIL ?? 'local@slash.cash',
  name: process.env.LOCAL_USER_NAME ?? 'Local User',
  avatar: process.env.LOCAL_USER_AVATAR ?? '',
};
