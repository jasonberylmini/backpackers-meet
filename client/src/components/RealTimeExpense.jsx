import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const RealTimeExpense = ({ tripId, currentUser }) => {
  const { socket, isConnected, notifyExpenseAdded, notifyExpenseSettled } = useSocket();
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'other',
    currency: 'USD'
  });

  // Fetch existing expenses when component mounts
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch(`/api/expenses/trip/${tripId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setExpenses(data.expenses || []);
        } else {
          console.error('Failed to fetch expenses');
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };

    if (tripId) {
      fetchExpenses();
    }
  }, [tripId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewExpense = (data) => {
      setExpenses(prev => [...prev, data.expense]);
      toast(`${data.addedBy.username || data.addedBy.name || 'Unknown'} added expense: ${data.expense.description}`, {
        duration: 4000,
        position: 'top-right',
        icon: '💰',
      });
    };

    const handleExpenseSettled = (data) => {
      setExpenses(prev => prev.map(exp => 
        exp._id === data.expenseId 
          ? { ...exp, status: 'settled' }
          : exp
      ));
      toast(`${data.settledBy.username || data.settledBy.name || 'Unknown'} settled an expense`, {
        duration: 3000,
        position: 'top-right',
        icon: '✅',
      });
    };

    socket.on('newExpense', handleNewExpense);
    socket.on('expenseSettled', handleExpenseSettled);

    return () => {
      socket.off('newExpense', handleNewExpense);
      socket.off('expenseSettled', handleExpenseSettled);
    };
  }, [socket]);

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          groupId: tripId,
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        })
      });

      if (response.ok) {
        const expense = await response.json();
        setExpenses(prev => [...prev, expense.expense]);
        
        // Notify other users via Socket.IO
        notifyExpenseAdded(tripId, expense.expense);
        
        // Reset form
        setNewExpense({
          amount: '',
          description: '',
          category: 'other',
          currency: 'USD'
        });
        
        toast.success('Expense added successfully!');
      } else {
        toast.error('Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error adding expense');
    }
  };

  const handleSettleExpense = async (expenseId) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}/share-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.userId
        })
      });

      if (response.ok) {
        // Notify other users via Socket.IO
        notifyExpenseSettled(tripId, expenseId);
        toast.success('Expense marked as settled!');
      } else {
        toast.error('Failed to settle expense');
      }
    } catch (error) {
      console.error('Error settling expense:', error);
      toast.error('Error settling expense');
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div style={{
      border: '1px solid #e1e5e9',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>
        💰 Trip Expenses
        {isConnected && <span style={{ color: '#28a745', fontSize: '14px', marginLeft: '10px' }}>🟢 Live</span>}
      </h2>

      {/* Add Expense Form */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Add New Expense</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <select
              value={newExpense.currency}
              onChange={(e) => setNewExpense(prev => ({ ...prev, currency: e.target.value }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Description"
            value={newExpense.description}
            onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <select
            value={newExpense.category}
            onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="transport">Transport</option>
            <option value="accommodation">Accommodation</option>
            <option value="food">Food</option>
            <option value="activities">Activities</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={handleAddExpense}
            disabled={!isConnected || !newExpense.amount || !newExpense.description}
            style={{
              padding: '10px 16px',
              backgroundColor: isConnected && newExpense.amount && newExpense.description ? '#28a745' : '#6c757d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: isConnected && newExpense.amount && newExpense.description ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Expense
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
          Expenses ({expenses.length}) - Total: {newExpense.currency} {totalAmount.toFixed(2)}
        </h3>
        {expenses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6c757d',
            padding: '40px 20px'
          }}>
            No expenses yet. Add the first one!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {expenses.map((expense, index) => (
              <div key={index} style={{
                border: '1px solid #e1e5e9',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: expense.status === 'settled' ? '#f8f9fa' : '#ffffff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                      {expense.description}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {expense.category} • {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                      {expense.currency} {expense.amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      by {expense.contributorId?.username || expense.contributorId?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
                {expense.status !== 'settled' && (
                  <button
                    onClick={() => handleSettleExpense(expense._id)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#007bff',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Mark as Settled
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeExpense; 