import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  Bell, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

export const Welcome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: ClipboardCheck,
      title: "Smart Attendance",
      description: "Automated day-wise attendance tracking for teachers and real-time visibility for students.",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      icon: BookOpen,
      title: "LMS & Assignments",
      description: "Create, submit, and grade assignments with ease. Integrated quiz system for quick assessments.",
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      icon: Bell,
      title: "Instant Notices",
      description: "Keep everyone informed with role-based announcements and real-time notifications.",
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      icon: ShieldCheck,
      title: "Secure RBAC",
      description: "Role-Based Access Control ensures teachers and students only see what's relevant to them.",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Arambh</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link 
              to="/dashboard" 
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold mb-8">
            <Zap className="w-4 h-4" />
            The Future of School Management
          </span>
          <h1 className="text-6xl md:text-7xl font-bold text-slate-900 tracking-tight mb-8 leading-[1.1]">
            Experience the <br />
            <span className="text-indigo-600">Arambh of Learning.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-12 leading-relaxed">
            A comprehensive LMS and management system designed for modern educational institutions. 
            Streamline attendance, assignments, and communication in one secure platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all">
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-24 relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-b from-indigo-100/50 to-transparent rounded-[40px] blur-3xl -z-10" />
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden aspect-[16/9] max-w-5xl mx-auto">
            <img 
              src="https://picsum.photos/seed/edutrack/1600/900" 
              alt="Dashboard Preview" 
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything you need to succeed</h2>
            <p className="text-slate-500 text-lg">Powerful features built for admins, teachers, and students.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`${feature.bg} ${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Section */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-8 leading-tight">
              Tailored experiences for <br />
              <span className="text-indigo-600">every user role.</span>
            </h2>
            <div className="space-y-6">
              {[
                { role: "Admins", desc: "Full control over student and teacher data, class assignments, and school-wide settings." },
                { role: "Teachers", desc: "Manage assigned classes, mark attendance, grade assignments, and communicate with students." },
                { role: "Students", desc: "Access learning materials, track attendance, submit assignments, and view grades." }
              ].map((item) => (
                <div key={item.role} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="mt-1">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{item.role}</h4>
                    <p className="text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-indigo-600 rounded-[40px] p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-6">Ready to transform your school?</h3>
              <p className="text-indigo-100 text-lg mb-10">
                Join hundreds of institutions already using EduTrack to streamline their daily operations.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg"
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900">Arambh</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2026 Arambh LMS. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
