import { parse } from 'csv-parse/sync';
import { Trade } from '../models/Trade.js';
import { getConnection } from '../config/db.js';

function normalizeDateTime(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [, datePart, hours = '00', minutes = '00', seconds = '00'] = match;
      return `${datePart} ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }
  }

  return value;
}

export const getTrades = async (req, res) => {
  try {
    const trades = await Trade.findAllByUser(req.user.id);
    res.json(trades);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Failed to fetch trades.' });
  }
};

export const createTrade = async (req, res) => {
  try {
    const tradeData = {
      user_id: req.user.id,
      symbol: req.body.symbol,
      trade_type: req.body.trade_type,
      entry: req.body.entry,
      exit: req.body.exit,
      result: req.body.result,
      close_date: normalizeDateTime(req.body.close_date),
      open_date: normalizeDateTime(req.body.open_date),
      strategy: req.body.strategy,
      notes: req.body.notes
    };
    const trade = await Trade.create(tradeData);
    res.status(201).json(trade);
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ message: 'Failed to create trade.' });
  }
};

export const updateTrade = async (req, res) => {
  try {
    const tradeData = {
      symbol: req.body.symbol,
      trade_type: req.body.trade_type,
      entry: req.body.entry,
      exit: req.body.exit,
      result: req.body.result,
      close_date: normalizeDateTime(req.body.close_date),
      open_date: normalizeDateTime(req.body.open_date),
      strategy: req.body.strategy,
      notes: req.body.notes
    };
    const trade = await Trade.update(req.params.id, req.user.id, tradeData);
    res.json(trade);
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({ message: 'Failed to update trade.' });
  }
};

export const deleteTrade = async (req, res) => {
  try {
    await Trade.remove(req.params.id, req.user.id);
    res.json({ message: 'Trade deleted.' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ message: 'Failed to delete trade.' });
  }
};

export const importTrades = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required.' });
    }

    const csvContent = req.file.buffer.toString();
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    if (!records.length) {
      return res.status(400).json({ message: 'CSV file is empty.' });
    }

    const db = getConnection();
    const insertQuery = `
      INSERT INTO trades (user_id, symbol, trade_type, entry, exit, result, close_date, open_date, strategy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let imported = 0;

    for (const record of records) {
      await db.query(insertQuery, [
        req.user.id,
        record.symbol || record.Symbol,
        (record.trade_type || record.Type || '').toLowerCase() === 'sell' ? 'sell' : 'buy',
        record.entry || record.Entry || 0,
        record.exit || record.Exit || 0,
        record.result || record.Result || 0,
        normalizeDateTime(record.close_date || record.Date || new Date().toISOString().slice(0, 10)),
        normalizeDateTime(record.open_date || record.OpenDate || new Date().toISOString().slice(0, 10)),
        record.strategy || record.Strategy || 'Imported',
        record.notes || record.Notes || ''
      ]);
      imported += 1;
    }

    res.json({ message: 'Trades imported successfully.', imported });
  } catch (error) {
    console.error('Import trades error:', error);
    res.status(500).json({ message: 'Failed to import trades.' });
  }
};
