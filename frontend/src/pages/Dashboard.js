import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { classroomApi } from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { IoAddOutline, IoPeopleOutline, IoDocumentTextOutline, IoEnterOutline, IoSchoolOutline } from 'react-icons/io5';
import { FaChalkboardTeacher, FaCube } from 'react-icons/fa';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const data = await classroomApi.getAll();
      setClassrooms(data);
    } catch (error) {
      toast.error('Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject) {
      toast.error('Nama dan mata pelajaran wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const newClassroom = await classroomApi.create(formData);
      setClassrooms([...classrooms, newClassroom]);
      setShowCreateModal(false);
      setFormData({ name: '', subject: '', description: '' });
      toast.success(`Kelas berhasil dibuat! Kode: ${newClassroom.code}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membuat kelas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Masukkan kode kelas');
      return;
    }

    setSubmitting(true);
    try {
      const { classroom } = await classroomApi.join(joinCode);
      setClassrooms([...classrooms, classroom]);
      setShowJoinModal(false);
      setJoinCode('');
      toast.success(`Berhasil bergabung ke ${classroom.name}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal bergabung ke kelas');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const isTeacher = user?.role === 'TEACHER';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar
        title="Dashboard"
        subtitle={`Selamat datang, ${user?.name}`}
        rightActions={
          isTeacher ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="create-classroom-btn"
            >
              <IoAddOutline className="w-5 h-5" />
              <span className="hidden sm:inline">Buat Kelas</span>
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="join-classroom-btn"
            >
              <IoEnterOutline className="w-5 h-5" />
              <span className="hidden sm:inline">Gabung Kelas</span>
            </button>
          )
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              {isTeacher ? <FaChalkboardTeacher className="w-8 h-8" /> : <IoSchoolOutline className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{isTeacher ? 'Mode Guru' : 'Mode Siswa'}</h2>
              <p className="text-blue-100">
                {isTeacher
                  ? 'Buat kelas dan tambahkan materi pembelajaran 3D & AR'
                  : 'Gabung kelas dan akses materi pembelajaran interaktif'}
              </p>
            </div>
          </div>
        </div>

        {/* Classrooms Grid */}
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
          {isTeacher ? 'Kelas Saya' : 'Kelas yang Diikuti'}
        </h3>

        {classrooms.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IoSchoolOutline className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              {isTeacher ? 'Belum Ada Kelas' : 'Belum Mengikuti Kelas'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {isTeacher
                ? 'Buat kelas pertama Anda untuk mulai mengajar'
                : 'Masukkan kode kelas untuk bergabung'}
            </p>
            <button
              onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isTeacher ? 'Buat Kelas Baru' : 'Gabung Kelas'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                onClick={() => navigate(`/classroom/${classroom.id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                data-testid={`classroom-card-${classroom.id}`}
              >
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-500 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  {isTeacher && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 rounded text-xs font-mono font-bold text-slate-700">
                      {classroom.code}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                    {classroom.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{classroom.subject}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <IoPeopleOutline className="w-4 h-4" />
                      {classroom._count?.enrollments || 0} siswa
                    </span>
                    <span className="flex items-center gap-1">
                      <IoDocumentTextOutline className="w-4 h-4" />
                      {classroom._count?.materials || 0} materi
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Classroom Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Buat Kelas Baru"
      >
        <form onSubmit={handleCreateClassroom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Kelas *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="contoh: Matematika Kelas 8A"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="classroom-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mata Pelajaran *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="contoh: Matematika"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="classroom-subject-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi kelas (opsional)"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              data-testid="create-classroom-submit"
            >
              {submitting ? 'Membuat...' : 'Buat Kelas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Classroom Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Gabung Kelas"
      >
        <form onSubmit={handleJoinClassroom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Kode Kelas
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode kelas"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              data-testid="join-code-input"
            />
            <p className="text-sm text-slate-500 mt-2">Minta kode kelas dari guru Anda</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              data-testid="join-classroom-submit"
            >
              {submitting ? 'Bergabung...' : 'Gabung'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
