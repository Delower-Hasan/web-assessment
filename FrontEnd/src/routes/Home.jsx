import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus, faRotateRight, faTrash } from '@fortawesome/free-solid-svg-icons';

import Api from '../helpers/core/Api';

const { Text, Title } = Typography;

const categories = [
  'Groceries',
  'Salary',
  'Rent',
  'Transport',
  'Utilities',
  'Dining',
  'Health',
  'Shopping',
  'Travel',
  'Other'
];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const formatDate = value => (value ? dayjs(value).format('MMM D, YYYY') : '');

const formInitialValues = {
  type: 'expense'
};

const Home = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const loadTransactions = useCallback(() => {
    setLoading(true);
    return Api.get('/transactions?sorter=-date')
      .then(res => setTransactions(res.data))
      .catch(error => error.globalHandler && error.globalHandler())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter(transaction => {
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesSearch =
        !normalizedSearch ||
        transaction.category.toLowerCase().includes(normalizedSearch) ||
        (transaction.description || '').toLowerCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [transactions, typeFilter, search]);

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, transaction) => {
          acc[transaction.type] += transaction.amount;
          return acc;
        },
        { expense: 0, income: 0 }
      ),
    [transactions]
  );

  const balance = totals.income - totals.expense;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ ...formInitialValues, date: dayjs() });
    setModalOpen(true);
  };

  const openEdit = transaction => {
    setEditing(transaction);
    form.setFieldsValue({
      ...transaction,
      date: dayjs(transaction.date)
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const toPayload = values => ({
    ...values,
    amount: Number(values.amount),
    date: values.date.format('YYYY-MM-DD'),
    description: values.description || ''
  });

  const handleSubmit = values => {
    const payload = toPayload(values);
    const request = editing ? Api.patch(`/transactions/${editing._id}`, payload) : Api.post('/transactions', payload);

    setSaving(true);

    return request
      .then(() => {
        message.success(editing ? 'Transaction updated' : 'Transaction added');
        closeModal();
        return loadTransactions();
      })
      .catch(error => error.globalHandler && error.globalHandler())
      .finally(() => setSaving(false));
  };

  const handleDelete = transaction => {
    setLoading(true);

    return Api.delete(`/transactions/${transaction._id}`)
      .then(() => {
        message.success('Transaction deleted');
        return loadTransactions();
      })
      .catch(error => error.globalHandler && error.globalHandler())
      .finally(() => setLoading(false));
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 150,
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      render: formatDate
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      filters: [
        { text: 'Income', value: 'income' },
        { text: 'Expense', value: 'expense' }
      ],
      onFilter: (value, record) => record.type === value,
      render: value => <Tag color={value === 'income' ? 'green' : 'red'}>{value.toUpperCase()}</Tag>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 180,
      sorter: (a, b) => a.category.localeCompare(b.category)
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: value => value || <Text type="secondary">No description</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount, record) => (
        <Text strong type={record.type === 'income' ? 'success' : 'danger'}>
          {record.type === 'income' ? '+' : '-'}
          {currency.format(amount)}
        </Text>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            aria-label="Edit transaction"
            icon={<FontAwesomeIcon icon={faPen} />}
            type="text"
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Delete transaction"
            description="This entry will be permanently removed."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button aria-label="Delete transaction" danger icon={<FontAwesomeIcon icon={faTrash} />} type="text" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <main className="expense-page">
      <section className="expense-hero">
        <div>
          <Text className="expense-eyebrow">Personal finance</Text>
          <Title level={1}>Expense and Income Diary</Title>
        </div>
        <Button type="primary" size="large" icon={<FontAwesomeIcon icon={faPlus} />} onClick={openCreate}>
          Add entry
        </Button>
      </section>

      <Row gutter={[16, 16]} className="expense-stats">
        <Col xs={24} md={8}>
          <div className="expense-stat-card">
            <Statistic
              title="Income"
              value={totals.income}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#237804' }}
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="expense-stat-card">
            <Statistic
              title="Expenses"
              value={totals.expense}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#cf1322' }}
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="expense-stat-card">
            <Statistic
              title="Balance"
              value={balance}
              precision={2}
              prefix="$"
              valueStyle={{ color: balance >= 0 ? '#0958d9' : '#cf1322' }}
            />
          </div>
        </Col>
      </Row>

      <section className="expense-table-section">
        <div className="expense-toolbar">
          <Space wrap>
            <Segmented
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Income', value: 'income' },
                { label: 'Expenses', value: 'expense' }
              ]}
            />
            <Input.Search
              allowClear
              placeholder="Search category or description"
              onChange={event => setSearch(event.target.value)}
              style={{ width: 280 }}
              value={search}
            />
          </Space>
          <Button icon={<FontAwesomeIcon icon={faRotateRight} />} onClick={loadTransactions}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTransactions}
          loading={loading}
          locale={{ emptyText: <Empty description="No transactions yet" /> }}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          rowKey="_id"
          scroll={{ x: 880 }}
        />
      </section>

      <Modal
        destroyOnClose
        footer={null}
        onCancel={closeModal}
        open={modalOpen}
        title={editing ? 'Edit entry' : 'Add entry'}
      >
        <Form form={form} layout="vertical" initialValues={formInitialValues} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Choose a type' }]}>
                <Select
                  options={[
                    { label: 'Expense', value: 'expense' },
                    { label: 'Income', value: 'income' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Amount" name="amount" rules={[{ required: true, message: 'Enter an amount' }]}>
                <InputNumber min={0.01} precision={2} prefix="$" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Choose a category' }]}>
                <Select showSearch options={categories.map(category => ({ label: category, value: category }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Choose a date' }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} maxLength={512} showCount placeholder="Optional note" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={saving}>
            {editing ? 'Save changes' : 'Add entry'}
          </Button>
        </Form>
      </Modal>
    </main>
  );
};

export default Home;
