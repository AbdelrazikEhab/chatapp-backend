// Minimal helper functions for socket users (keeps in-memory list for presence)
const users = [];

const addUserSocket = ({ id, username, room }) => {
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();
  if (!username || !room) {
    return { error: 'Username and room are required.' };
  }
  const existing = users.find(u => u.room === room && u.username === username);
  if (existing) {
    return { error: 'Username in use.' };
  }
  const user = { id, username, room };
  users.push(user);
  return { user };
};

const removeUserSocket = (id) => {
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) return users.splice(idx,1)[0];
};

const getUserSocket = (id) => users.find(u => u.id === id);
const getUsersInRoom = (room) => users.filter(u => u.room === room.trim().toLowerCase());

module.exports = { addUserSocket, removeUserSocket, getUserSocket, getUsersInRoom };
