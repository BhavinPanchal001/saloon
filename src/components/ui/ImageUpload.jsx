import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

export function ImageUpload({ 
  label, 
  value, 
  onChange, 
  accept = "image/*", 
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = "",
  showPreview = true,
  multiple = false,
  maxImages = 5
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Handle both single image (string) and multiple images (array)
  const images = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);

  const validateFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return false;
    }
    
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    if (multiple && images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return false;
    }
    
    setError('');
    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImageUrl = e.target.result;
        if (multiple) {
          onChange([...images, newImageUrl]);
        } else {
          onChange(newImageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (multiple) {
      files.forEach(file => handleFile(file));
    } else {
      const file = files[0];
      if (file) {
        handleFile(file);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (multiple) {
      files.forEach(file => handleFile(file));
    } else {
      const file = files[0];
      if (file) {
        handleFile(file);
      }
    }
  };

  const removeImage = (index) => {
    if (multiple) {
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
    } else {
      onChange('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showUploadArea = multiple ? images.length < maxImages : !value;

  return (
    <div className={`form-field ${className}`}>
      {label && <label>{label}</label>}
      
      {/* Multiple images preview */}
      {multiple && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              {showPreview ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                  <img 
                    src={image} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">Image {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="ml-auto p-1 text-red-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single image preview */}
      {!multiple && value && (
        <div className="relative mb-4">
          {showPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-gray-100">
              <img 
                src={value} 
                alt="Preview" 
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600 truncate">Image uploaded</span>
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="ml-auto p-1 text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {showUploadArea && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {multiple ? (
                <Plus className={`w-6 h-6 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
              ) : (
                <Upload className={`w-6 h-6 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {dragActive 
                  ? 'Drop images here' 
                  : multiple 
                    ? `Click to add images or drag and drop (${images.length}/${maxImages})`
                    : 'Click to upload or drag and drop'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to {Math.round(maxSize / 1024 / 1024)}MB
                {multiple && ` • Max ${maxImages} images`}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
