import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Tag, Trash2, Hash } from 'lucide-react';

const TagsManager = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6366F1', label: 'Indigo' },
    { value: '#14B8A6', label: 'Teal' }
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await api.get('/transactions/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTag.name.trim()) {
      alert('Please enter a tag name');
      return;
    }

    try {
      await api.post('/transactions/tags', null, {
        params: {
          name: newTag.name,
          color: newTag.color
        }
      });
      setShowAddModal(false);
      setNewTag({ name: '', color: '#3B82F6' });
      loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag');
    }
  };

  const deleteTag = async (tagId) => {
    if (!confirm('Delete this tag? It will be removed from all transactions.')) return;
    try {
      await api.delete(`/transactions/tags/${tagId}`);
      loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600 mt-1">Organize transactions with custom tags</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900">Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Tag Name</Label>
                <Input
                  placeholder="e.g., vacation, business, tax-deductible"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTag({ ...newTag, color: color.value })}
                      className={`h-10 rounded-md border-2 transition-all ${
                        newTag.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={createTag} className="w-full">Create Tag</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kindling-fire mx-auto"></div>
        </div>
      ) : tags.length === 0 ? (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No tags created yet</p>
              <p className="text-sm text-gray-500">Create tags to organize your transactions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <Card key={tag.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tag.color + '20' }}
                    >
                      <Hash className="h-5 w-5" style={{ color: tag.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tag.name}</p>
                      <p className="text-xs text-gray-500">Created {new Date(tag.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTag(tag.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Tag className="h-5 w-5 text-kindling-fire mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">How to use tags</p>
              <p className="text-sm text-blue-700">
                Tags can be added to transactions from the Transactions page. Click on any transaction to add or remove tags.
                Use tags for organizing expenses like #vacation, #business, #tax-deductible, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TagsManager;
