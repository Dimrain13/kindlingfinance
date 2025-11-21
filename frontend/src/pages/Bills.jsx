import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Calendar as Cal, Plus, Trash2, Check } from 'lucide-react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    due_date: '',
    frequency: 'monthly',
    icon: '📄',
    category: ''
  });

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const response = await api.get('/bills');
      setBills(response.data);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bills', {
        ...newBill,
        amount: parseFloat(newBill.amount),
        due_date: newBill.due_date
      });
      setShowAddModal(false);
      setNewBill({ name: '', amount: '', due_date: '', frequency: 'monthly', icon: '📄', category: '' });
      loadBills();
    } catch (error) {
      alert('Failed to add bill');
    }
  };

  const togglePaid = async (billId, currentStatus) => {
    try {
      await api.patch(`/bills/${billId}/pay?is_paid=${!currentStatus}`);
      loadBills();
    } catch (error) {
      alert('Failed to update bill');
    }
  };

  const deleteBill = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await api.delete(`/bills/${id}`);
      loadBills();
    } catch (error) {
      alert('Failed to delete bill');
    }
  };

  // Transform bills to calendar events
  const calendarEvents = bills.map(bill => ({
    id: bill.id,
    title: `${bill.icon} ${bill.name} - $${bill.amount}`,
    start: new Date(bill.due_date),
    end: new Date(bill.due_date),
    resource: bill
  }));

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bills Calendar</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} className="mr-2" />
          Add Bill
        </Button>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 600 }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource.is_paid ? '#10b981' : '#ef4444',
                  borderRadius: '5px',
                  opacity: 0.8,
                  color: 'white',
                  border: '0px',
                  display: 'block'
                }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{bill.icon}</span>
                  <div>
                    <p className="font-semibold">{bill.name}</p>
                    <p className="text-sm text-gray-600">
                      Due: {new Date(bill.due_date).toLocaleDateString()} • {bill.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-lg">${bill.amount.toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant={bill.is_paid ? "default" : "outline"}
                    onClick={() => togglePaid(bill.id, bill.is_paid)}
                  >
                    <Check size={16} className="mr-1" />
                    {bill.is_paid ? 'Paid' : 'Mark Paid'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBill(bill.id)}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
            {bills.length === 0 && (
              <div className="text-center py-12">
                <Cal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bills added yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBill} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Bill Name</label>
                  <Input
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBill.amount}
                    onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={newBill.due_date}
                    onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Icon (Emoji)</label>
                  <Input
                    value={newBill.icon}
                    onChange={(e) => setNewBill({ ...newBill, icon: e.target.value })}
                    placeholder="📄"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newBill.frequency}
                    onChange={(e) => setNewBill({ ...newBill, frequency: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">Add Bill</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Bills;
