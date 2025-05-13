const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/social_network', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model('User', new mongoose.Schema({
  user_str_id: { type: String, unique: true },
  display_name: String,
}));

const Connection = mongoose.model('Connection', new mongoose.Schema({
  user1: String,
  user2: String,
}));

function getOrderedPair(u1, u2) {
  return [u1, u2].sort();
}

// Create User
app.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ internal_db_id: user._id, user_str_id: user.user_str_id, status: 'created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create Connection
app.post('/connections', async (req, res) => {
  const [user1, user2] = getOrderedPair(req.body.user1_str_id, req.body.user2_str_id);
  const u1 = await User.findOne({ user_str_id: user1 });
  const u2 = await User.findOne({ user_str_id: user2 });
  if (!u1 || !u2) return res.status(404).json({ error: 'user not found' });

  const exists = await Connection.findOne({ user1, user2 });
  if (exists) return res.status(409).json({ error: 'connection exists' });

  await new Connection({ user1, user2 }).save();
  res.json({ status: 'connection_added' });
});

// Delete Connection
app.delete('/connections', async (req, res) => {
  const [user1, user2] = getOrderedPair(req.body.user1_str_id, req.body.user2_str_id);
  const result = await Connection.findOneAndDelete({ user1, user2 });

  if (!result) {
    return res.status(404).json({ error: 'not_connected' });
  }

  res.json({ status: 'connection_removed' });
});

// Get Friends
app.get('/users/:userId/friends', async (req, res) => {
  const userId = req.params.userId;
  const connections = await Connection.find({
    $or: [{ user1: userId }, { user2: userId }],
  });

  const friendIds = connections.map(c =>
    c.user1 === userId ? c.user2 : c.user1
  );

  const friends = await User.find({ user_str_id: { $in: friendIds } });
  res.json(friends.map(f => ({ user_str_id: f.user_str_id, display_name: f.display_name })));
});

// Get Friends of Friends
app.get('/users/:userId/friends-of-friends', async (req, res) => {
  const userId = req.params.userId;

  // 1. Get direct friends
  const directConnections = await Connection.find({
    $or: [{ user1: userId }, { user2: userId }],
  });
  const directFriends = new Set(directConnections.map(c =>
    c.user1 === userId ? c.user2 : c.user1
  ));

  // 2. Get friends of each friend
  const secondDegree = new Set();
  for (const friendId of directFriends) {
    const conns = await Connection.find({
      $or: [{ user1: friendId }, { user2: friendId }],
    });

    for (const c of conns) {
      const other = c.user1 === friendId ? c.user2 : c.user1;
      if (other !== userId && !directFriends.has(other)) {
        secondDegree.add(other);
      }
    }
  }

  const users = await User.find({ user_str_id: { $in: Array.from(secondDegree) } });
  res.json(users.map(u => ({ user_str_id: u.user_str_id, display_name: u.display_name })));
});

// Degree of Separation using BFS
app.get('/connections/degree', async (req, res) => {
  const { from_user_str_id, to_user_str_id } = req.query;

  if (from_user_str_id === to_user_str_id) {
    return res.json({ degree: 0 });
  }

  const visited = new Set();
  const queue = [[from_user_str_id, 0]];

  while (queue.length > 0) {
    const [current, depth] = queue.shift();
    visited.add(current);

    const conns = await Connection.find({
      $or: [{ user1: current }, { user2: current }],
    });

    for (const conn of conns) {
      const neighbor = conn.user1 === current ? conn.user2 : conn.user1;

      if (neighbor === to_user_str_id) {
        return res.json({ degree: depth + 1 });
      }

      if (!visited.has(neighbor)) {
        queue.push([neighbor, depth + 1]);
        visited.add(neighbor);
      }
    }
  }

  res.json({ degree: -1, message: 'not_connected' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

