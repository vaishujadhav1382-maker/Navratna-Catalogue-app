import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    FileText,
    Eye,
    Trash2,
    X,
    Upload,
    Download,
    Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ToastContainer } from '../components/Toast';

// const CatalogueCard = ({ catalog, onDelete, onView }) => {
//     return (
//         <motion.div
//             whileHover={{ scale: 1.02 }}
//             className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col"
//         >
//             {/* PDF Icon */}
//             <div className="mb-3">
//                 <div className="relative h-40 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg overflow-hidden flex items-center justify-center">
//                     <FileText className="w-20 h-20 text-red-600 dark:text-red-400" />
//                 </div>
//             </div>
//
//             {/* Catalogue Content */}
//             <div className="space-y-2 flex-1">
//                 <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={catalog.title}>
//                     {catalog.title}
//                 </h3>
//                 {catalog.description && (
//                     <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
//                         {catalog.description}
//                     </p>
//                 )}
//                 <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
//                     <Calendar className="w-3 h-3" />
//                     <span>{new Date(catalog.createdAt).toLocaleDateString()}</span>
//                 </div>
//             </div>
//
//             {/* Actions */}
//             <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
//                 <span className="text-xs text-gray-500 dark:text-gray-400">
//                     {catalog.fileName}
//                 </span>
//
//                 <div className="flex items-center gap-1">
//                     <button
//                         onClick={() => onView(catalog)}
//                         className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
//                         title="View PDF"
//                     >
//                         <Eye className="w-4 h-4" />
//                     </button>
//                     <a
//                         href={catalog.pdfUrl}
//                         download={catalog.fileName}
//                         className="p-1.5 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
//                         title="Download PDF"
//                     >
//                         <Download className="w-4 h-4" />
//                     </a>
//                     <button
//                         onClick={() => onDelete(catalog.id)}
//                         className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
//                         title="Delete"
//                     >
//                         <Trash2 className="w-4 h-4" />
//                     </button>
//                 </div>
//             </div>
//         </motion.div>
//     );
// };

const Catalogues = () => {
    const {
        catalogs,
        catalogsLoading,
        addCatalog,
        deleteCatalog,
        fetchCatalogs
    } = useApp();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        pdfFile: null
    });
    const [pdfPreview, setPdfPreview] = useState(null);

    // Search state
    const [search, setSearch] = useState("");

    // Toast notifications state
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'success', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Fetch catalogues on mount
    useEffect(() => {
        if (catalogs.length === 0) {
            fetchCatalogs();
        }
    }, [catalogs.length, fetchCatalogs]);

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setFormData({
            title: '',
            description: '',
            pdfFile: null
        });
        setPdfPreview(null);
    };

    // Handle PDF file upload
    const handlePdfUpload = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        // Check if it's a PDF
        if (file.type !== 'application/pdf') {
            showToast('Please select a PDF file', 'error');
            return;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('PDF file is too large. Maximum size is 10MB.', 'error');
            return;
        }

        setFormData(prev => ({
            ...prev,
            pdfFile: file
        }));

        setPdfPreview(file.name);
    };

    // Create catalogue
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }

        if (!formData.pdfFile) {
            showToast('Please select a PDF file', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            showToast('Uploading PDF...', 'info', 5000);
            await addCatalog({
                title: formData.title.trim(),
                description: formData.description.trim(),
                pdfFile: formData.pdfFile
            });
            showToast('Catalogue added successfully!', 'success');
            handleCloseModal();
        } catch (error) {
            console.error('Error adding catalogue:', error);
            showToast('Error adding catalogue. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete catalogue
    const handleDeleteCatalogue = async (catalogueId) => {
        if (window.confirm('Are you sure you want to delete this catalogue?')) {
            try {
                await deleteCatalog(catalogueId);
                showToast('Catalogue deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting catalogue:', error);
                showToast('Error deleting catalogue. Please try again.', 'error');
            }
        }
    };

    // View catalogue (open in new tab)
    const handleViewCatalogue = (catalog) => {
        window.open(catalog.pdfUrl, '_blank');
    };

    if (catalogsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading catalogues...</p>
                </div>
            </div>
        );
    }

    // Filtered catalogues by search
    const filteredCatalogs = catalogs.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-5 py-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-red-600" />
                        Catalogues
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Manage product catalogues and PDF documents
                    </p>
                </div>
                <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Catalogue </span>
                </motion.button>
            </div>

            {/* Search Bar */}
            <div className="flex justify-between items-center mb-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    style={{ maxWidth: '350px' }}
                />
                {/* Empty right side for spacing/alignment */}
                <div></div>
            </div>

            {/* Catalogues Table */}
            {filteredCatalogs.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No catalogues found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Upload your first catalogue to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Add First Catalogue
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">File Name</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredCatalogs.map((catalog) => (
                                <tr key={catalog.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate" title={catalog.title}>{catalog.title}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{catalog.description}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(catalog.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{catalog.fileName}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleViewCatalogue(catalog)}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="View PDF"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <a
                                                href={catalog.pdfUrl}
                                                download={catalog.fileName}
                                                className="p-1.5 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteCatalogue(catalog.id)}
                                                className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Catalogue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Add New Catalogue
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
                                    Catalogue Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Enter catalogue title"
                                />
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Enter catalogue description (optional)"
                                />
                            </div>
                            {/* PDF Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    PDF File *
                                </label>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={handlePdfUpload}
                                        className="hidden"
                                        id="pdf-upload"
                                    />
                                    <label
                                        htmlFor="pdf-upload"
                                        className="flex flex-col items-center justify-center cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {pdfPreview || 'Click to upload PDF (Max 10MB)'}
                                        </span>
                                    </label>
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
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    {isSubmitting ? 'Uploading...' : 'Add Catalogue'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Catalogues;
