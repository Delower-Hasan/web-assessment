const express = require('express');
const controller = require('../controllers/transactions');
const { validator } = require('../middlewares/validator');

const router = express.Router();

router.route('/').get(controller.get).post(validator('createTransaction'), controller.create);

router
  .route('/:id')
  .get(validator({ params: 'id' }), controller.getById)
  .patch(validator({ params: 'id', body: 'updateTransaction' }), controller.update)
  .delete(validator({ params: 'id' }), controller.delete);

module.exports = router;
