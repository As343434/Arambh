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
  CheckCircle2,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

export const Welcome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] } }
  };

  const features = [
    {
      icon: ClipboardCheck,
      title: "Smart Attendance",
      description: "Automated day-wise attendance tracking for teachers and real-time visibility for students.",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "hover:border-blue-200"
    },
    {
      icon: BookOpen,
      title: "LMS & Assignments",
      description: "Create, submit, and grade assignments with ease. Integrated quiz system for quick assessments.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "hover:border-indigo-200"
    },
    {
      icon: Bell,
      title: "Instant Notices",
      description: "Keep everyone informed with role-based announcements and real-time notifications.",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "hover:border-amber-200"
    },
    {
      icon: ShieldCheck,
      title: "Secure RBAC",
      description: "Role-Based Access Control ensures teachers and students only see what's relevant to them.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "hover:border-emerald-200"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Mesh Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] pointer-events-none -z-10 overflow-hidden opacity-80">
        <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_transparent,70%)] blur-3xl" />
        <div className="absolute top-[15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.15)_0%,_transparent,70%)] blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
            Arambh
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          {user ? (
            <Link 
              to="/dashboard" 
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:opacity-95 transition-all shadow-md shadow-indigo-100 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 transform active:translate-y-0"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-950/10"
            >
              Sign In
            </Link>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.span 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-8 shadow-sm"
          >
            <Zap className="w-4 h-4 fill-indigo-600 animate-pulse" />
            The Future of School Management
          </motion.span>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7.5xl font-black text-slate-900 tracking-tight mb-8 leading-[1.05] max-w-4xl"
          >
            Experience the <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700">
              Arambh of Learning.
            </span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="max-w-2xl mx-auto text-xl text-slate-600/90 mb-12 leading-relaxed"
          >
            A comprehensive LMS and management platform designed for modern educational institutions. 
            Streamline attendance, assignments, and communication seamlessly.
          </motion.p>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-24"
          >
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-lg hover:opacity-95 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group hover:-translate-y-1 transform active:translate-y-0"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Dynamic UI Component Mockup (No Image!) */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/20 to-violet-500/10 rounded-[50px] blur-3xl -z-10" />
          
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.1)] p-6 text-left">
            {/* Top window ribbon bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                <span className="text-xs font-semibold text-slate-400 ml-2 bg-slate-50 px-3 py-1 rounded-md">arambh-core-dashboard // live-preview</span>
              </div>
              <div className="w-24 h-2 bg-slate-100 rounded-full" />
            </div>

            {/* Generated Mock Dashboard Elements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">Total Active Students</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">1,248</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Average Attendance</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">96.4%</h3>
                </div>
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Pending Assignments</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">12 <span className="text-xs font-medium text-purple-600/80">Active</span></h3>
                </div>
                <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Mock Graph Simulation Block */}
            <div className="mt-6 border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-slate-200 rounded-full" />
                <div className="h-4 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-3.5 pt-2">
                <div className="h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl w-[92%] flex items-center px-4 text-xs font-bold text-white shadow-sm">LMS Module Throughput</div>
                <div className="h-8 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl w-[78%] flex items-center px-4 text-xs font-bold text-white shadow-sm">Automated Grading Engine</div>
                <div className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl w-[85%] flex items-center px-4 text-xs font-bold text-white shadow-sm">RBAC Directory Synchronization</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="bg-white border-y border-slate-100 py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-widest font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Features</span>
            <h2 className="text-4xl font-black text-slate-900 mt-3 mb-4 tracking-tight">Everything you need to succeed</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Powerful automated features explicitly tailored for system admins, educators, and pupils.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`bg-white p-8 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.02)] transition-all duration-300 ${feature.border} hover:shadow-xl hover:shadow-slate-100`}
              >
                <div className={`${feature.bg} ${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Segment */}
      <section className="py-32 max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight leading-tight">
              Tailored experiences for <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">every single role.</span>
            </h2>
            <div className="space-y-4">
              {[
                { role: "Admins", desc: "Full granular control over student and teacher data structures, class assignments, and global configurations." },
                { role: "Teachers", desc: "Manage operational classes dynamic schedules, mark micro-attendance metrics, and distribute assignments." },
                { role: "Students", desc: "Access comprehensive learning repositories, self-track attendance patterns, and submit assignments." }
              ].map((item, index) => (
                <motion.div 
                  key={item.role}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4 p-5 rounded-2xl border border-transparent hover:border-slate-200/60 hover:bg-white transition-all duration-300 hover:shadow-sm"
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className="p-1 bg-indigo-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{item.role}</h4>
                    <p className="text-slate-500 mt-1 leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Banner Element */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20"
          >
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-indigo-200" />
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4">Ready to upgrade your school infrastructure?</h3>
                <p className="text-indigo-100/90 text-lg mb-10 leading-relaxed font-light">
                  Join hundreds of institutions already utilizing Arambh LMS to streamline daily operations and optimize administrative flows.
                </p>
              </div>
              <div>
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-indigo-700 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:scale-[1.02] active:scale-100 transform duration-200"
                >
                  Start Your Journey
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">Arambh</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} Arambh LMS. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-semibold text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Support Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
