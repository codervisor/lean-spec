import { saveUser, findUserByEmail, getUsers } from './storage.js';

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @returns {Promise<Object>} Created user
 */
export async function createUser({ name, email }) {
  // Check for duplicate email
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }
  
  const user = {
    id: Date.now().toString(),
    name,
    email,
    createdAt: new Date().toISOString()
  };
  
  saveUser(user);
  
  // TODO: Send welcome email
  // This is where you'll add email notification logic!
  
  return user;
}

/**
 * Get all users
 * @returns {Array<Object>} List of users
 */
export function getAllUsers() {
  return getUsers();
}
