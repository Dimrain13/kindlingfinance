import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Home, Plus, Edit, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [accounts, setAccounts] = useState([]);
  
  const [newProperty, setNewProperty] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    property_type: 'single_family',
    purchase_price: '',
    purchase_date: '',
    current_value: '',
    linked_mortgage_account_id: '',
    annual_property_tax: '',
    hoa_fee_monthly: '',
    is_rental: false,
    is_short_term_rental: false,
    rental_income_monthly: '',
    rental_expenses_monthly: '',
    depreciation_basis: '',
    placed_in_service_date: '',
    notes: ''
  });

  useEffect(() => {
    loadProperties();
    loadAccounts();
  }, []);

  const loadProperties = async () => {
    try {
      const response = await api.get('/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      // Filter for mortgage and loan accounts
      const mortgageAccounts = response.data.filter(acc => 
        acc.account_type === 'mortgage' || 
        acc.type?.toLowerCase().includes('loan') ||
        acc.type?.toLowerCase().includes('mortgage')
      );
      setAccounts(mortgageAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProperty) {
        await api.put(`/properties/${editingProperty.id}`, newProperty);
        alert('✅ Property updated successfully!');
      } else {
        await api.post('/properties', {
          ...newProperty,
          purchase_price: parseFloat(newProperty.purchase_price) || 0,
          current_value: parseFloat(newProperty.current_value) || 0,
          annual_property_tax: newProperty.annual_property_tax ? parseFloat(newProperty.annual_property_tax) : null,
          hoa_fee_monthly: newProperty.hoa_fee_monthly ? parseFloat(newProperty.hoa_fee_monthly) : null,
          rental_income_monthly: newProperty.rental_income_monthly ? parseFloat(newProperty.rental_income_monthly) : null,
          rental_expenses_monthly: newProperty.rental_expenses_monthly ? parseFloat(newProperty.rental_expenses_monthly) : null,
          depreciation_basis: newProperty.depreciation_basis ? parseFloat(newProperty.depreciation_basis) : null
        });
        alert('✅ Property added successfully!');
      }
      
      setShowAdd(false);
      setEditingProperty(null);
      setNewProperty({
        address: '',
        city: '',
        state: '',
        zip_code: '',
        property_type: 'single_family',
        purchase_price: '',
        purchase_date: '',
        current_value: '',
        linked_mortgage_account_id: '',
        notes: ''
      });
      loadProperties();
    } catch (error) {
      console.error('Failed to save property:', error);
      alert('Failed to save property. Please try again.');
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setNewProperty({
      address: property.address,
      city: property.city,
      state: property.state,
      zip_code: property.zip_code,
      property_type: property.property_type || 'single_family',
      purchase_price: property.purchase_price.toString(),
      purchase_date: property.purchase_date,
      current_value: property.current_value.toString(),
      linked_mortgage_account_id: property.linked_mortgage_account_id || '',
      annual_property_tax: property.annual_property_tax?.toString() || '',
      hoa_fee_monthly: property.hoa_fee_monthly?.toString() || '',
      is_rental: property.is_rental || false,
      is_short_term_rental: property.is_short_term_rental || false,
      rental_income_monthly: property.rental_income_monthly?.toString() || '',
      rental_expenses_monthly: property.rental_expenses_monthly?.toString() || '',
      depreciation_basis: property.depreciation_basis?.toString() || '',
      placed_in_service_date: property.placed_in_service_date || '',
      notes: property.notes || ''
    });
    setShowAdd(true);
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await api.delete(`/properties/${propertyId}`);
      alert('✅ Property deleted successfully!');
      loadProperties();
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to delete property. Please try again.');
    }
  };

  const totalPropertyValue = properties.reduce((sum, prop) => sum + prop.current_value, 0);
  const totalEquity = properties.reduce((sum, prop) => sum + (prop.equity || 0), 0);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-kindling-fire to-kindling-blaze bg-clip-text text-transparent">
              Properties
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your real estate and track property values
            </p>
            {properties.length > 0 && (
              <div className="mt-4 flex gap-6">
                <div>
                  <span className="text-sm text-gray-500">Total Value</span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalPropertyValue)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Total Equity</span>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalEquity)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <Button 
            onClick={() => {
              setShowAdd(true);
              setEditingProperty(null);
            }}
            className="bg-gradient-to-r from-kindling-fire to-kindling-blaze shadow-lg"
          >
            <Plus size={16} className="mr-2" />
            Add Property
          </Button>
        </div>

        {/* Properties Grid */}
        {properties.length === 0 && !showAdd ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center py-12">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add your first property to track its value and equity
              </p>
              <Button 
                onClick={() => setShowAdd(true)}
                className="bg-gradient-to-r from-kindling-fire to-kindling-blaze"
              >
                <Plus size={16} className="mr-2" />
                Add Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-kindling-fire rounded-lg">
                        <Home className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{property.address}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(property)}>
                        <Edit size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600"
                        onClick={() => handleDelete(property.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Current Value</span>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(property.current_value)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Purchase Price</span>
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(property.purchase_price)}
                        </p>
                      </div>
                    </div>

                    {property.mortgage_balance !== undefined && (
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Mortgage Balance</span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(property.mortgage_balance)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 font-medium">Equity</span>
                          <span className="font-bold text-green-600 text-lg">
                            {formatCurrency(property.equity)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Equity %</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {property.equity_percentage}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tax & Rental Information */}
                    {(property.annual_property_tax || property.hoa_fee_monthly || property.is_rental) && (
                      <div className="pt-4 border-t space-y-2">
                        {property.annual_property_tax && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Annual Property Tax</span>
                            <span className="font-semibold">{formatCurrency(property.annual_property_tax)}</span>
                          </div>
                        )}
                        {property.hoa_fee_monthly && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Monthly HOA</span>
                            <span className="font-semibold">{formatCurrency(property.hoa_fee_monthly)}/mo</span>
                          </div>
                        )}
                        {property.is_rental && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign size={14} className="text-blue-600" />
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {property.is_short_term_rental ? 'Short-Term Rental (STR)' : 'Long-Term Rental'}
                              </span>
                            </div>
                            {property.rental_income_monthly && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Monthly Income</span>
                                <span className="font-semibold text-green-600">{formatCurrency(property.rental_income_monthly)}</span>
                              </div>
                            )}
                            {property.rental_expenses_monthly && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Monthly Expenses</span>
                                <span className="font-semibold text-red-600">{formatCurrency(property.rental_expenses_monthly)}</span>
                              </div>
                            )}
                            {property.rental_income_monthly && property.rental_expenses_monthly && (
                              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t mt-1">
                                <span className="text-gray-900 dark:text-gray-100">Net Monthly</span>
                                <span className={property.rental_income_monthly - property.rental_expenses_monthly >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(property.rental_income_monthly - property.rental_expenses_monthly)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <TrendingUp size={14} />
                      <span>Purchased: {new Date(property.purchase_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Property Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
            <Card className="w-full max-w-2xl shadow-2xl bg-white dark:bg-gray-800 border-0 my-8">
              <CardHeader className="bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {editingProperty ? 'Edit Property' : 'Add Property'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <Input
                      required
                      value={newProperty.address}
                      onChange={(e) => setNewProperty({...newProperty, address: e.target.value})}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">City</label>
                      <Input
                        required
                        value={newProperty.city}
                        onChange={(e) => setNewProperty({...newProperty, city: e.target.value})}
                        placeholder="San Francisco"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">State</label>
                      <Input
                        required
                        value={newProperty.state}
                        onChange={(e) => setNewProperty({...newProperty, state: e.target.value})}
                        placeholder="CA"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">ZIP Code</label>
                      <Input
                        required
                        value={newProperty.zip_code}
                        onChange={(e) => setNewProperty({...newProperty, zip_code: e.target.value})}
                        placeholder="94102"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Purchase Date</label>
                      <Input
                        type="date"
                        required
                        value={newProperty.purchase_date}
                        onChange={(e) => setNewProperty({...newProperty, purchase_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Purchase Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <Input
                          type="number"
                          required
                          value={newProperty.purchase_price}
                          onChange={(e) => setNewProperty({...newProperty, purchase_price: e.target.value})}
                          placeholder="500000"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <Input
                          type="number"
                          required
                          value={newProperty.current_value}
                          onChange={(e) => setNewProperty({...newProperty, current_value: e.target.value})}
                          placeholder="550000"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Link to Mortgage (Optional)</label>
                    <select
                      value={newProperty.linked_mortgage_account_id}
                      onChange={(e) => setNewProperty({...newProperty, linked_mortgage_account_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kindling-fire dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- No Mortgage --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - {formatCurrency(acc.balance)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Link this property to a mortgage account to track equity
                    </p>
                  </div>

                  {/* Tax & Financial Information */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
                      Tax & Financial Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Annual Property Tax</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={newProperty.annual_property_tax}
                            onChange={(e) => setNewProperty({...newProperty, annual_property_tax: e.target.value})}
                            placeholder="2606"
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Monthly HOA Fee</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={newProperty.hoa_fee_monthly}
                            onChange={(e) => setNewProperty({...newProperty, hoa_fee_monthly: e.target.value})}
                            placeholder="0"
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProperty.is_rental}
                          onChange={(e) => setNewProperty({...newProperty, is_rental: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">This is a rental property</span>
                      </label>
                      
                      {newProperty.is_rental && (
                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={newProperty.is_short_term_rental}
                            onChange={(e) => setNewProperty({...newProperty, is_short_term_rental: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">Short-term rental (Airbnb, VRBO, etc.)</span>
                        </label>
                      )}
                    </div>

                    {newProperty.is_rental && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-4">
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          {newProperty.is_short_term_rental ? 'Short-Term Rental (STR) Details' : 'Long-Term Rental Details'}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Monthly Rental Income</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={newProperty.rental_income_monthly}
                                onChange={(e) => setNewProperty({...newProperty, rental_income_monthly: e.target.value})}
                                placeholder="2162"
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Monthly Expenses</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={newProperty.rental_expenses_monthly}
                                onChange={(e) => setNewProperty({...newProperty, rental_expenses_monthly: e.target.value})}
                                placeholder="500"
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Depreciation Basis</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={newProperty.depreciation_basis}
                                onChange={(e) => setNewProperty({...newProperty, depreciation_basis: e.target.value})}
                                placeholder="250000"
                                className="pl-8"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Purchase price + improvements</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Placed in Service</label>
                            <Input
                              type="date"
                              value={newProperty.placed_in_service_date}
                              onChange={(e) => setNewProperty({...newProperty, placed_in_service_date: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">When rental started</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                    <textarea
                      value={newProperty.notes}
                      onChange={(e) => setNewProperty({...newProperty, notes: e.target.value})}
                      placeholder="Additional property information..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kindling-fire dark:bg-gray-800 dark:border-gray-600"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-kindling-fire to-kindling-blaze">
                      {editingProperty ? 'Update Property' : 'Add Property'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setShowAdd(false);
                        setEditingProperty(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;
