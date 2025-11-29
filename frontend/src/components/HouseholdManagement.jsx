import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Trash2, Check, X, Heart, Baby } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../utils/api';

const HouseholdManagement = () => {
  const [household, setHousehold] = useState({
    spouse: null,
    children: [],
    collaborators: []
  });
  const [loading, setLoading] = useState(true);
  const [addingSpouse, setAddingSpouse] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [spouseEmail, setSpouseEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      const response = await api.get('/household');
      setHousehold(response.data);
    } catch (error) {
      console.error('Error loading household:', error);
      // Initialize empty household if endpoint doesn't exist yet
      setHousehold({ spouse: null, children: [], collaborators: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpouse = async () => {
    try {
      await api.post('/household/spouse', { email: spouseEmail });
      setSpouseEmail('');
      setAddingSpouse(false);
      loadHousehold();
    } catch (error) {
      console.error('Error adding spouse:', error);
      alert('Failed to add spouse. Please try again.');
    }
  };

  const handleRemoveSpouse = async () => {
    if (!window.confirm('Remove spouse from household? They will lose access to your financial data.')) {
      return;
    }
    try {
      await api.delete('/household/spouse');
      loadHousehold();
    } catch (error) {
      console.error('Error removing spouse:', error);
    }
  };

  const handleAddChild = async () => {
    try {
      await api.post('/household/children', { 
        name: childName, 
        age: parseInt(childAge) 
      });
      setChildName('');
      setChildAge('');
      setAddingChild(false);
      loadHousehold();
    } catch (error) {
      console.error('Error adding child:', error);
      alert('Failed to add child. Please try again.');
    }
  };

  const handleRemoveChild = async (childId) => {
    try {
      await api.delete(`/household/children/${childId}`);
      loadHousehold();
    } catch (error) {
      console.error('Error removing child:', error);
    }
  };

  const handleAddCollaborator = async () => {
    try {
      await api.post('/household/collaborators', { email: collaboratorEmail });
      setCollaboratorEmail('');
      setAddingCollaborator(false);
      loadHousehold();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      alert('Failed to add collaborator. Please try again.');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!window.confirm('Remove this collaborator? They will lose access to your financial data.')) {
      return;
    }
    try {
      await api.delete(`/household/collaborators/${collaboratorId}`);
      loadHousehold();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            Household & Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading household...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          Household & Collaborators
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Invite unlimited collaborators to access your financial data at no extra cost
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Spouse/Partner Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Spouse / Partner
            </h3>
            {!household.spouse && !addingSpouse && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingSpouse(true)}
                className="text-xs"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Spouse
              </Button>
            )}
          </div>

          {household.spouse && (
            <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{household.spouse.name || household.spouse.email}</p>
                  <p className="text-sm text-gray-600">{household.spouse.email}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveSpouse}
                className="text-red-600 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {addingSpouse && !household.spouse && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Spouse Email Address
                </label>
                <Input
                  type="email"
                  placeholder="spouse@example.com"
                  value={spouseEmail}
                  onChange={(e) => setSpouseEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddSpouse}
                  disabled={!spouseEmail}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Send Invitation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingSpouse(false);
                    setSpouseEmail('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!household.spouse && !addingSpouse && (
            <p className="text-sm text-gray-500 italic">
              No spouse added. Add your spouse/partner to share financial insights.
            </p>
          )}
        </div>

        {/* Children Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Baby className="h-4 w-4 text-purple-500" />
              Children ({household.children?.length || 0})
            </h3>
            {!addingChild && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingChild(true)}
                className="text-xs"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Child
              </Button>
            )}
          </div>

          {addingChild && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Child's name"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Age
                  </label>
                  <Input
                    type="number"
                    placeholder="Age"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    min="0"
                    max="25"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddChild}
                  disabled={!childName || !childAge}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Add Child
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingChild(false);
                    setChildName('');
                    setChildAge('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {household.children && household.children.length > 0 ? (
            <div className="space-y-2">
              {household.children.map((child, index) => (
                <div key={index} className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Baby className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{child.name}</p>
                      <p className="text-sm text-gray-600">Age {child.age}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveChild(child.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            !addingChild && (
              <p className="text-sm text-gray-500 italic">
                No children added. Track children to get family-focused financial recommendations.
              </p>
            )
          )}
        </div>

        {/* Collaborators Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Collaborators ({household.collaborators?.length || 0})
            </h3>
            {!addingCollaborator && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingCollaborator(true)}
                className="text-xs"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            )}
          </div>

          {addingCollaborator && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 mb-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="collaborator@example.com"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Financial advisor, accountant, or family member
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddCollaborator}
                  disabled={!collaboratorEmail}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Send Invitation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingCollaborator(false);
                    setCollaboratorEmail('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {household.collaborators && household.collaborators.length > 0 ? (
            <div className="space-y-2">
              {household.collaborators.map((collaborator, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{collaborator.name || collaborator.email}</p>
                      <p className="text-sm text-gray-600">{collaborator.email}</p>
                      <p className="text-xs text-gray-500">
                        {collaborator.status === 'pending' ? 'Invitation pending' : 'Active'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            !addingCollaborator && (
              <p className="text-sm text-gray-500 italic">
                No collaborators. Invite your financial advisor or partner at no extra cost.
              </p>
            )
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Unlimited Collaborators:</strong> Invite as many people as you need. Perfect for sharing with your spouse, financial advisor, or accountant - all at no additional cost!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseholdManagement;
