import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Gift,
    Calendar,
    Eye,
    EyeOff,
    Trash2,
    X,
    Save,
    Upload,
    Pencil,
    ChevronLeft,
    ChevronRight,
    ImageIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ToastContainer } from '../components/Toast';

// Image Carousel Component for the Offer Card
const OfferCard = ({ offer, monthId, onToggleStatus, onDelete, onEdit }) => {
    const [currentIncentiveIndex, setCurrentIncentiveIndex] = useState(0);
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);

    // Separate images for display
    const incentiveImages = offer.imageUrls || [];
    const focusProductImages = offer.img2Urls || [];

    const nextIncentiveImage = (e) => {
        e.stopPropagation();
        setCurrentIncentiveIndex((prev) => (prev + 1) % incentiveImages.length);
    };

    const prevIncentiveImage = (e) => {
        e.stopPropagation();
        setCurrentIncentiveIndex((prev) => (prev - 1 + incentiveImages.length) % incentiveImages.length);
    };

    const nextFocusImage = (e) => {
        e.stopPropagation();
        setCurrentFocusIndex((prev) => (prev + 1) % focusProductImages.length);
    };

    const prevFocusImage = (e) => {
        e.stopPropagation();
        setCurrentFocusIndex((prev) => (prev - 1 + focusProductImages.length) % focusProductImages.length);
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col"
        >
            {/* Incentive Images Carousel */}
            {incentiveImages.length > 0 && (
                <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Incentives</h4>
                    <div className="relative h-40 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group">
                        <AnimatePresence mode='wait'>
                            <motion.img
                                key={currentIncentiveIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                src={incentiveImages[currentIncentiveIndex]}
                                alt={`Incentive ${currentIncentiveIndex + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>

                        {/* Image Counter Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                            {currentIncentiveIndex + 1} / {incentiveImages.length}
                        </div>

                        {incentiveImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevIncentiveImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={nextIncentiveImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                                {/* Dots Indicators */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {incentiveImages.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIncentiveIndex ? 'bg-white' : 'bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Focus Product Images Carousel */}
            {focusProductImages.length > 0 && (
                <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Focus Product</h4>
                    <div className="relative h-40 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group">
                        <AnimatePresence mode='wait'>
                            <motion.img
                                key={currentFocusIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                src={focusProductImages[currentFocusIndex]}
                                alt={`Focus Product ${currentFocusIndex + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>

                        {/* Image Counter Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                            {currentFocusIndex + 1} / {focusProductImages.length}
                        </div>

                        {focusProductImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevFocusImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={nextFocusImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                                {/* Dots Indicators */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {focusProductImages.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentFocusIndex ? 'bg-white' : 'bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* No Images Placeholder */}
            {incentiveImages.length === 0 && focusProductImages.length === 0 && (
                <div className="mb-4 relative h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-sm">No images</span>
                </div>
            )}

            {/* Offer Content */}
            <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={offer.title}>
                        {offer.title}
                    </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {offer.description}
                </p>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${offer.isActive
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                    {offer.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onToggleStatus(monthId, offer.id, offer.isActive)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={offer.isActive ? 'Deactivate' : 'Activate'}
                    >
                        {offer.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onEdit(monthId, offer)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(monthId, offer.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const Offers = () => {
    const {
        offers,
        offersLoading,
        offersError,
        addOffer,
        updateOffer,
        deleteOffer,
        toggleOfferStatus,
        fetchOffers
    } = useApp();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null); // { monthId, offerData }
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        images: [],
        images2: []
    });

    // Toast notifications state
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'success', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Fetch offers from backend
    const handleRefreshOffers = async () => {
        await fetchOffers();
    };

    useEffect(() => {
        if (offers.length === 0) {
            fetchOffers();
        }
    }, []);

    // Handle Edit Click
    const handleEditClick = (monthId, offer) => {
        setEditingOffer({ monthId, ...offer });
        // The offer object already has month/year implied by structure, but for editing we might need to extract them from the monthData if not in offer
        // However, we passed monthId. We also need month and year for the form.
        // Let's find the month data to get the year/month values
        const monthData = offers.find(m => m.monthId === monthId);

        setFormData({
            title: offer.title,
            description: offer.description,
            month: monthData ? monthNames.indexOf(monthData.month) + 1 : new Date().getMonth() + 1,
            year: monthData ? monthData.year : new Date().getFullYear(),
            images: offer.imageUrls || [],
            images2: offer.img2Urls || []
        });
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingOffer(null);
        setFormData({
            title: '',
            description: '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            images: [],
            images2: []
        });
    };

    // Handle image upload and convert to base64
    const handleImageUpload = (e, field) => {
        const files = Array.from(e.target.files);

        if (files.length === 0) return;

        // Limit to 5 images max per field
        const currentImages = formData[field];
        if (currentImages.length + files.length > 5) {
            alert('Maximum 5 images allowed');
            return;
        }

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                // Check file size (max 2MB per image)
                if (file.size > 2 * 1024 * 1024) {
                    showToast(`Image ${file.name} is too large. Maximum size is 2MB.`, 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64String = event.target.result;
                    setFormData(prev => ({
                        ...prev,
                        [field]: [...prev[field], base64String]
                    }));
                };
                reader.readAsDataURL(file);
            } else {
                showToast(`${file.name} is not a valid image file.`, 'error');
            }
        });
    };

    // Remove image from form
    const removeImage = (index, field) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    // Create or Update offer
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.description.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingOffer) {
                // UPDATE EXISTING OFFER
                showToast('Uploading images...', 'info', 5000);
                await updateOffer(editingOffer.monthId, editingOffer.id, {
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    month: formData.month, // Assuming backend might move it if changed? Actually updateOffer just updates fields, won't move to new month folder easily.
                    // For now, if month/year changes, it's complex because of file structure (doc ID depends on year-month).
                    // We will simple update the content. If they want to change month, they should probably delete and recreate, or we just update the metadata and acceptable mismatch.
                    // The AppContext updateOffer logic just updates the fields in the DOC. Ideally we won't allow changing Month/Year in Edit Mode to avoid inconsistency.
                    // But let's pass them anyway.
                    // Actually, if we change month/year, the offer ID path 'offers/YYYY-MM/items/ID' becomes invalid semantically?
                    // No, the parent doc is the month. If we change month in the form, we'd need to MOVE the document. 
                    // Modifying AppContext to support moving is hard.
                    // NOTE: I will disable Month/Year editing in Edit Mode to avoid complexity.
                    imageUrls: formData.images,
                    img2Urls: formData.images2
                });
                showToast('Offer updated successfully!', 'success');
            } else {
                // CREATE NEW OFFER
                showToast('Uploading images...', 'info', 5000);
                await addOffer({
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    month: formData.month,
                    year: formData.year,
                    images: formData.images,
                    images2: formData.images2
                });
                showToast('Offer created successfully!', 'success');
            }

            handleCloseModal();
        } catch (error) {
            console.error('Error saving offer:', error);
            showToast(`Error ${editingOffer ? 'updating' : 'creating'} offer. Please try again.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle offer status
    const handleToggleOfferStatus = async (monthId, offerId, currentStatus) => {
        try {
            await toggleOfferStatus(monthId, offerId);
        } catch (error) {
            console.error('Error toggling offer status:', error);
        }
    };

    // Delete offer
    const handleDeleteOffer = async (monthId, offerId) => {
        if (window.confirm('Are you sure you want to delete this offer?')) {
            try {
                await deleteOffer(monthId, offerId);
            } catch (error) {
                console.error('Error deleting offer:', error);
            }
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (offersLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading offers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl px-5 py-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
                        <Gift className="w-8 h-8 text-purple-600" />
                        Offers and Insentives
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Create and manage promotional offers with images
                    </p>
                </div>
                <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Offer</span>
                </motion.button>
            </div>

            {/* Offers List */}
            {offers.length === 0 ? (
                <div className="text-center py-12">
                    <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No offers yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first promotional offer to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Create First Offer
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {offers.map((monthData) => (
                        <motion.div
                            key={monthData.monthId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                        >
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <Calendar className="w-6 h-6 text-purple-600" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {monthData.displayLabel}
                                </h2>
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium">
                                    {monthData.itemCount} offers
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {monthData.items.map((offer) => (
                                    <OfferCard
                                        key={offer.id}
                                        offer={offer}
                                        monthId={monthData.monthId}
                                        onToggleStatus={handleToggleOfferStatus}
                                        onDelete={handleDeleteOffer}
                                        onEdit={handleEditClick}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Offer Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Offer Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Enter offer title"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Enter offer description"
                                />
                            </div>

                            {/* Month and Year */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Month *
                                    </label>
                                    <select
                                        required
                                        disabled={!!editingOffer} // Disable editing month/year for now to simplify
                                        value={formData.month}
                                        onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                    >
                                        {monthNames.map((month, index) => (
                                            <option key={index} value={index + 1}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Year *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        disabled={!!editingOffer}
                                        min="2020"
                                        max="2030"
                                        value={formData.year}
                                        onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Images */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Insentives {formData.images.length > 0 && `(${formData.images.length}/5)`}
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'images')}
                                            className="hidden"
                                            id="image-upload"
                                            disabled={formData.images.length >= 5}
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className={`flex flex-col items-center justify-center cursor-pointer ${formData.images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {formData.images.length >= 5
                                                    ? 'Maximum 5 images reached'
                                                    : 'Click to upload images or drag and drop (Max 5 images, 2MB each)'
                                                }
                                            </span>
                                        </label>
                                    </div>

                                    {/* Image Preview */}
                                    {formData.images.length > 0 && (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {formData.images.map((image, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={image}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-20 object-cover rounded-lg"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index, 'images')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* IMG 2 Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Focus Product {formData.images2.length > 0 && `(${formData.images2.length}/5)`}
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'images2')}
                                            className="hidden"
                                            id="image-upload-2"
                                            disabled={formData.images2.length >= 5}
                                        />
                                        <label
                                            htmlFor="image-upload-2"
                                            className={`flex flex-col items-center justify-center cursor-pointer ${formData.images2.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {formData.images2.length >= 5
                                                    ? 'Maximum 5 images reached'
                                                    : 'Click to upload IMG 2 or drag and drop (Max 5 images, 2MB each)'
                                                }
                                            </span>
                                        </label>
                                    </div>

                                    {/* IMG 2 Preview */}
                                    {formData.images2.length > 0 && (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {formData.images2.map((image, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={image}
                                                        alt={`Preview 2 ${index + 1}`}
                                                        className="w-full h-20 object-cover rounded-lg"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index, 'images2')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Submit Button */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSubmitting ? 'Uploading...' : (editingOffer ? 'Update Offer' : 'Create Offer')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Offers;