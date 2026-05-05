import CryptoJS from 'crypto-js';

// No ambiente client-side, usamos uma combinação do UID do usuário e um salt interno
// para dificultar a leitura direta no banco de dados.
const SECRET_SALT = 'financas-app-secure-salt-2024';

export const encryptApiKey = (apiKey: string, userId: string): string => {
  if (!apiKey) return '';
  const secret = userId + SECRET_SALT;
  return CryptoJS.AES.encrypt(apiKey, secret).toString();
};

export const decryptApiKey = (encryptedKey: string, userId: string): string => {
  if (!encryptedKey) return '';
  try {
    const secret = userId + SECRET_SALT;
    const bytes = CryptoJS.AES.decrypt(encryptedKey, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar chave API:', error);
    return '';
  }
};
