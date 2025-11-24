/**
 * Simple in-memory storage for users
 * In a real app, this would be a database
 */

const users = [];

/**
 * Save a user to storage
 * @param {Object} user - User object to save
 */
export function saveUser(user) {
  users.push(user);
}

/**
 * Get all users
 * @returns {Array<Object>} List of all users
 */
export function getUsers() {
  return [...users]; // Return a copy
}

/**
 * Find user by email
 * @param {string} email - Email to search for
 * @returns {Object|undefined} User if found
 */
export function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

/**
 * Find user by ID
 * @param {string} id - User ID to search for
 * @returns {Object|undefined} User if found
 */
export function findUserById(id) {
  return users.find(u => u.id === id);
}
