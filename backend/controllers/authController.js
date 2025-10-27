import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const { JWT_SECRET = 'supersecret' } = process.env;

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({ username, email, password: hashedPassword });

    res.status(201).json({ message: 'User registered successfully.', user: newUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to register user.' });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body;
    const loginIdentifier = identifier || username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Username or email and password are required.' });
    }

    let user = await User.findByUsername(loginIdentifier);
    if (!user) {
      user = await User.findByEmail(loginIdentifier);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login.' });
  }
};
