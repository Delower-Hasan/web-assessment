const mongoose = require('mongoose');
const Transaction = require('../models/transaction');
const { Transaction: MockTransaction } = require('../db/mockDatabase');
const { SendData, ServerError, NotFound } = require('../helpers/response');

const SORT_FIELDS = new Set(['amount', 'category', 'createdAt', 'date', 'description', 'type', 'updatedAt']);

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeString = value => (typeof value === 'string' ? value.trim() : '');

const normalizeSort = sorter => {
  if (typeof sorter !== 'string' || !sorter) return { date: -1, createdAt: -1 };

  const direction = sorter.startsWith('-') ? -1 : 1;
  const field = sorter.replace(/^-/, '');

  if (!SORT_FIELDS.has(field)) return { date: -1, createdAt: -1 };

  return { [field]: direction, _id: direction };
};

const buildQuery = ({ category, filter, type }) => {
  const query = {};
  const categoryFilter = safeString(category);
  const textSearch = safeString(filter);

  if (type === 'expense' || type === 'income') query.type = type;
  if (categoryFilter) query.category = new RegExp(escapeRegex(categoryFilter), 'i');
  if (textSearch) {
    const textFilter = new RegExp(escapeRegex(textSearch), 'i');
    query.$or = [{ category: textFilter }, { description: textFilter }];
  }

  return query;
};

const useMongo = () => mongoose.connection.readyState === 1;

const getFallbackTransactions = async query => {
  const data = await MockTransaction.find();
  const sort = normalizeSort(query.sorter);
  const [sortField, sortDirection] = Object.entries(sort)[0];
  const filters = buildQuery(query);

  return data
    .filter(transaction => {
      const matchesType = !filters.type || transaction.type === filters.type;
      const matchesCategory = !filters.category || filters.category.test(transaction.category);
      const matchesText =
        !filters.$or ||
        filters.$or.some(filter => {
          const [field, regex] = Object.entries(filter)[0];
          return regex.test(transaction[field] || '');
        });

      return matchesType && matchesCategory && matchesText;
    })
    .sort((a, b) => {
      const first = sortField === 'date' ? new Date(a[sortField]).valueOf() : a[sortField];
      const second = sortField === 'date' ? new Date(b[sortField]).valueOf() : b[sortField];

      if (first < second) return -1 * sortDirection;
      if (first > second) return sortDirection;
      return 0;
    });
};

const createFallbackTransaction = body =>
  MockTransaction.create({
    _id: new mongoose.Types.ObjectId().toString(),
    ...body
  });

module.exports.get = async (req, res, next) => {
  try {
    if (!useMongo()) return next(SendData(await getFallbackTransactions(req.query)));

    const data = await Transaction.find(buildQuery(req.query)).sort(normalizeSort(req.query.sorter));

    return next(SendData(data));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.create = async ({ body }, res, next) => {
  try {
    if (!useMongo()) return next(SendData(await createFallbackTransaction(body), 201));

    const data = await Transaction.create(body);

    return next(SendData(data, 201));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.getById = async ({ params: { id } }, res, next) => {
  try {
    if (!useMongo()) {
      const fallbackData = await MockTransaction.findById(id);
      if (!fallbackData) return next(NotFound());

      return next(SendData(fallbackData));
    }

    const data = await Transaction.findById(id);
    if (!data) return next(NotFound());

    return next(SendData(data));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.update = async ({ params: { id }, body }, res, next) => {
  try {
    if (!useMongo()) {
      const fallbackData = await MockTransaction.findByIdAndUpdate(id, body);
      if (!fallbackData) return next(NotFound());

      return next(SendData(fallbackData));
    }

    const data = await Transaction.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!data) return next(NotFound());

    return next(SendData(data));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.delete = async ({ params: { id } }, res, next) => {
  try {
    if (!useMongo()) {
      const deleted = await MockTransaction.findByIdAndDelete(id);
      if (!deleted) return next(NotFound());

      return next(SendData({ message: 'Transaction deleted successfully' }));
    }

    const data = await Transaction.findByIdAndDelete(id);
    if (!data) return next(NotFound());

    return next(SendData({ message: 'Transaction deleted successfully' }));
  } catch (err) {
    return next(ServerError(err));
  }
};
