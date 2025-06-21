'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { BillCategory } from '@/types/bill-database';

interface CategoryManagerProps {
  categories: BillCategory[];
  onClose: () => void;
}

export function CategoryManager({ categories, onClose }: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');

  const handleAddCategory = () => {
    // Implementation for adding category
    console.log('Add category:', { name: newCategoryName, color: newCategoryColor });
    setNewCategoryName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h3>
        
        {/* Add New Category */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Add New Category</h4>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded-md"
            />
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add
            </Button>
          </div>
        </div>

        {/* Existing Categories */}
        <div className="space-y-2">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium">{category.name}</span>
                {category.is_system && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    AI Generated
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}