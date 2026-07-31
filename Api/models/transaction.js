const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = Schema(
  {
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 512,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

schema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', schema);
