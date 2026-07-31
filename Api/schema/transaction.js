const transactionFields = {
  type: { type: 'string', enum: ['expense', 'income'] },
  amount: { type: 'number', exclusiveMinimum: 0 },
  category: { type: 'string', minLength: 1, maxLength: 80 },
  date: {
    type: 'string',
    anyOf: [{ format: 'date' }, { format: 'date-time' }]
  },
  description: { type: 'string', maxLength: 512 }
};

module.exports = {
  createTransaction: {
    $id: 'createTransaction',
    type: 'object',
    properties: transactionFields,
    required: ['type', 'amount', 'category', 'date'],
    additionalProperties: false
  },
  updateTransaction: {
    $id: 'updateTransaction',
    type: 'object',
    properties: transactionFields,
    minProperties: 1,
    additionalProperties: false
  }
};
