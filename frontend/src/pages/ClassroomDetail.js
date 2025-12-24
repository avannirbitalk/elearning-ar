import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { classroomApi, materialApi } from '../services/api';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import LatexRenderer from '../components/LatexRenderer';
import {
  IoPeopleOutline,
  IoDocumentTextOutline,
  IoTrashOutline,
  IoCopyOutline,
  IoCreateOutline,
  IoVideocamOutline,
  IoDocumentOutline,
  IoTextOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';
import { HiOutlinePlus } from 'react-icons/hi';
import { FaCube, FaUpload } from 'react-icons/fa';
import { TbAugmentedReality } from 'react-icons/tb';

// Lazy load 3D viewer for performance
const Model3DViewer = lazy(() => import('../components/Model3DViewer'));

const MATERIAL_TYPES = {
  TEXT: 'TEXT',
  FILE: 'FILE',
  VIDEO: 'VIDEO',
  MODEL3D: 'MODEL3D',
};

export default function ClassroomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: MATERIAL_TYPES.TEXT,
    content: '',
    videoUrl: '',
    fileUrl: '',
    fileName: '',
    modelUrl: '',
    arEnabled: true,
    modelScale: 1.0,
    isPublished: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchClassroom();
      fetchMaterials();
    }
  }, [id]);

  const fetchClassroom = async () => {
    try {
      const data = await classroomApi.getById(id);
      setClassroom(data);
    } catch (error) {
      toast.error('Gagal memuat data kelas');
      navigate('/dashboard');
    }
  };

  const fetchMaterials = async () => {
    try {
      const data = await materialApi.getByClassroom(id);
      setMaterials(data);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Judul materi wajib diisi');
      return;
    }
    if (formData.type === MATERIAL_TYPES.VIDEO && !formData.videoUrl) {
      toast.error('URL video wajib diisi');
      return;
    }
    if (formData.type === MATERIAL_TYPES.TEXT && !formData.content) {
      toast.error('Konten materi wajib diisi');
      return;
    }
    if (formData.type === MATERIAL_TYPES.MODEL3D && !formData.modelUrl) {
      toast.error('File model 3D (.glb) wajib diupload');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMaterial) {
        const updated = await materialApi.update(editingMaterial.id, formData);
        setMaterials(materials.map((m) => (m.id === updated.id ? updated : m)));
        toast.success('Materi berhasil diperbarui!');
      } else {
        const newMaterial = await materialApi.create(id, formData);
        setMaterials([...materials, newMaterial]);
        toast.success('Materi berhasil ditambahkan!');
      }
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan materi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Yakin ingin menghapus materi ini?')) return;
    try {
      await materialApi.delete(materialId);
      setMaterials(materials.filter((m) => m.id !== materialId));
      toast.success('Materi berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus materi');
    }
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      content: material.content || '',
      videoUrl: material.videoUrl || '',
      fileUrl: material.fileUrl || '',
      fileName: material.fileName || '',
      modelUrl: material.modelUrl || '',
      arEnabled: material.arEnabled !== false,
      modelScale: material.modelScale || 1.0,
      isPublished: material.isPublished,
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: MATERIAL_TYPES.TEXT,
      content: '',
      videoUrl: '',
      fileUrl: '',
      fileName: '',
      modelUrl: '',
      arEnabled: true,
      modelScale: 1.0,
      isPublished: true,
    });
    setEditingMaterial(null);
  };

  const handleCopyCode = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.code);
      toast.success(`Kode ${classroom.code} berhasil disalin!`);
    }
  };

  const handleFileUpload = async (file, type) => {
    // Validate file
    const maxSize = type === 'model' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for 3D, 10MB for others
    if (file.size > maxSize) {
      toast.error(`Ukuran file maksimal ${maxSize / 1024 / 1024}MB`);
      return null;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(filePath);

      toast.success('File berhasil diupload!');
      return { url: publicUrl, name: file.name };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Gagal mengupload file: ' + error.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case MATERIAL_TYPES.VIDEO:
        return <IoVideocamOutline className="w-5 h-5" />;
      case MATERIAL_TYPES.FILE:
        return <IoDocumentOutline className="w-5 h-5" />;
      case MATERIAL_TYPES.MODEL3D:
        return <FaCube className="w-5 h-5" />;
      default:
        return <IoTextOutline className="w-5 h-5" />;
    }
  };

  const getMaterialTypeName = (type) => {
    switch (type) {
      case MATERIAL_TYPES.VIDEO:
        return 'Video';
      case MATERIAL_TYPES.FILE:
        return 'File';
      case MATERIAL_TYPES.MODEL3D:
        return 'Model 3D';
      default:
        return 'Teks';
    }
  };

  if (loading || !classroom) {
    return <LoadingSpinner />;
  }

  const isTeacher = user?.role === 'TEACHER' && classroom.teacherId === user.id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar
        title={classroom.name}
        subtitle={classroom.subject}
        backTo="/dashboard"
        rightActions={
          isTeacher && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <span className="font-mono font-bold hidden sm:inline">{classroom.code}</span>
              <IoCopyOutline className="w-4 h-4" />
            </button>
          )
        }
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{classroom.name}</h2>
              <p className="text-slate-600 dark:text-slate-400">{classroom.description || 'Tidak ada deskripsi'}</p>
              {classroom.teacher && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Pengajar: {classroom.teacher.name}</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <IoPeopleOutline className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700 dark:text-slate-300">{classroom._count?.enrollments || 0} Siswa</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <IoDocumentTextOutline className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700 dark:text-slate-300">{materials.length} Materi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Material Button (Teacher Only) */}
        {isTeacher && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Materi Pembelajaran</h3>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="add-material-btn"
            >
              <HiOutlinePlus className="w-5 h-5" />
              Tambah Materi
            </button>
          </div>
        )}

        {!isTeacher && (
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Materi Pembelajaran</h3>
        )}

        {/* Materials List - Displayed Directly (No Modal Click Required) */}
        {materials.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <IoDocumentTextOutline className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Belum Ada Materi</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {isTeacher ? 'Mulai tambahkan materi pembelajaran' : 'Belum ada materi yang ditambahkan oleh guru'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {materials.map((material, index) => (
              <div
                key={material.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
                data-testid={`material-${material.id}`}
              >
                {/* Material Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {getMaterialIcon(material.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-slate-500 dark:text-slate-400">#{index + 1}</span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {getMaterialTypeName(material.type)}
                          </span>
                          {material.type === MATERIAL_TYPES.MODEL3D && material.arEnabled && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center gap-1">
                              <TbAugmentedReality className="w-3 h-3" />
                              AR
                            </span>
                          )}
                          {!material.isPublished && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                              Draft
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-white">{material.title}</h4>
                        {material.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{material.description}</p>
                        )}
                      </div>
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(material)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <IoCreateOutline className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <IoTrashOutline className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Material Content - Displayed Directly */}
                <div className="p-4 sm:p-6">
                  {/* TEXT Material */}
                  {material.type === MATERIAL_TYPES.TEXT && material.content && (
                    <div className="prose dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <LatexRenderer content={material.content} />
                    </div>
                  )}

                  {/* VIDEO Material */}
                  {material.type === MATERIAL_TYPES.VIDEO && material.videoUrl && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(material.videoUrl)}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title={material.title}
                      />
                    </div>
                  )}

                  {/* FILE Material */}
                  {material.type === MATERIAL_TYPES.FILE && material.fileUrl && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 text-center">
                      <IoDocumentOutline className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 dark:text-slate-300 mb-4">{material.fileName || 'File Lampiran'}</p>
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <IoDocumentOutline className="w-4 h-4" />
                        Download File
                      </a>
                    </div>
                  )}

                  {/* MODEL3D Material - 3D Viewer with AR */}
                  {material.type === MATERIAL_TYPES.MODEL3D && material.modelUrl && (
                    <Suspense
                      fallback={
                        <div className="h-[450px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <div className="text-center">
                            <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat Model 3D...</p>
                          </div>
                        </div>
                      }
                    >
                      <Model3DViewer
                        modelUrl={material.modelUrl}
                        scale={material.modelScale || 1.0}
                        arEnabled={material.arEnabled !== false}
                        title={material.title}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Material Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul Materi *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Judul materi"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
              data-testid="material-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe Materi</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries({
                [MATERIAL_TYPES.TEXT]: { icon: IoTextOutline, label: 'Teks' },
                [MATERIAL_TYPES.VIDEO]: { icon: IoVideocamOutline, label: 'Video' },
                [MATERIAL_TYPES.FILE]: { icon: IoDocumentOutline, label: 'File' },
                [MATERIAL_TYPES.MODEL3D]: { icon: FaCube, label: '3D/AR' },
              }).map(([type, { icon: Icon, label }]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.type === type
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${formData.type === type ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-medium ${formData.type === type ? 'text-blue-600' : 'text-slate-600'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi singkat (opsional)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* TEXT Type */}
          {formData.type === MATERIAL_TYPES.TEXT && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Konten (Mendukung LaTeX) *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Tulis konten materi di sini... Gunakan $...$ untuk inline math dan $$...$$ untuk display math."
                rows={10}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono text-sm"
                data-testid="material-content-input"
              />
            </div>
          )}

          {/* VIDEO Type */}
          {formData.type === MATERIAL_TYPES.VIDEO && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                URL Video YouTube *
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
                data-testid="material-video-input"
              />
            </div>
          )}

          {/* FILE Type */}
          {formData.type === MATERIAL_TYPES.FILE && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload File</label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.pptx,.xlsx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const result = await handleFileUpload(file, 'file');
                    if (result) {
                      setFormData({ ...formData, fileUrl: result.url, fileName: result.name });
                    }
                  }}
                />
                <label htmlFor="file-upload" className={`cursor-pointer inline-flex flex-col items-center justify-center ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2"></div>
                  ) : (
                    <FaUpload className="w-8 h-8 text-slate-400 mb-2" />
                  )}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isUploading ? 'Mengupload...' : 'Klik untuk upload file'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">PDF, Word, Excel, PowerPoint, PNG, JPG (Max 10MB)</span>
                </label>
              </div>
              {formData.fileUrl && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <IoDocumentOutline className="w-5 h-5 text-blue-600" />
                  <span className="flex-1 text-sm truncate">{formData.fileName}</span>
                  <button type="button" onClick={() => setFormData({ ...formData, fileUrl: '', fileName: '' })} className="text-red-500 hover:text-red-700">
                    <IoTrashOutline className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODEL3D Type */}
          {formData.type === MATERIAL_TYPES.MODEL3D && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Upload File Model 3D (.glb) *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="model-upload"
                    className="hidden"
                    accept=".glb,.gltf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const result = await handleFileUpload(file, 'model');
                      if (result) {
                        setFormData({ ...formData, modelUrl: result.url });
                      }
                    }}
                  />
                  <label htmlFor="model-upload" className={`cursor-pointer inline-flex flex-col items-center justify-center ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2"></div>
                    ) : (
                      <FaCube className="w-10 h-10 text-slate-400 mb-2" />
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {isUploading ? 'Mengupload...' : 'Klik untuk upload model 3D'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">Format: .glb atau .gltf (Max 50MB)</span>
                  </label>
                </div>
                {formData.modelUrl && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <FaCube className="w-5 h-5 text-green-600" />
                    <span className="flex-1 text-sm text-green-700 dark:text-green-400">Model 3D berhasil diupload</span>
                    <button type="button" onClick={() => setFormData({ ...formData, modelUrl: '' })} className="text-red-500 hover:text-red-700">
                      <IoTrashOutline className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Skala Model</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={formData.modelScale}
                    onChange={(e) => setFormData({ ...formData, modelScale: parseFloat(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    id="arEnabled"
                    checked={formData.arEnabled}
                    onChange={(e) => setFormData({ ...formData, arEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="arEnabled" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <TbAugmentedReality className="w-4 h-4" />
                    Aktifkan Mode AR
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPublished" className="text-sm text-slate-700 dark:text-slate-300">
              Publikasikan (tampilkan ke siswa)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              data-testid="material-submit-btn"
            >
              {submitting ? 'Menyimpan...' : editingMaterial ? 'Simpan Perubahan' : 'Tambah Materi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
