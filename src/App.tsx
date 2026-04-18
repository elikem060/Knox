import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  Activity, 
  Calendar, 
  Plus, 
  TrendingUp, 
  LogOut, 
  Brain, 
  Dumbbell, 
  ChevronRight,
  User as UserIcon,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";

type View = 'dashboard' | 'workouts' | 'ai-coach' | 'history';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as any)?.toDate?.() || new Date()
      }));
      setWorkouts(workoutData);
    });

    return unsubscribe;
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-400"
        >
          <Activity size={48} className="animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Activity className="text-red-500" size={32} />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">FitPulse AI</h1>
          <p className="text-gray-500 mb-8 lowercase tracking-tight">Your intelligent movement companion</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-black text-white rounded-full py-4 font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            Connect with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xl">
            <Activity className="text-red-500" size={24} />
            <span>FitPulse</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveView('dashboard')}
              className={`text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveView('workouts')}
              className={`text-sm font-medium transition-colors ${activeView === 'workouts' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Log
            </button>
            <button 
              onClick={() => setActiveView('ai-coach')}
              className={`text-sm font-medium transition-colors ${activeView === 'ai-coach' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              AI Coach
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
               {user.photoURL ? (
                 <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
               ) : (
                 <UserIcon size={16} />
               )}
             </div>
             <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
               <LogOut size={18} />
             </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-5xl px-6 pt-24 pb-20 flex-1">
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div key="dashboard">
              <Dashboard workouts={workouts} />
            </motion.div>
          )}
          {activeView === 'workouts' && (
            <motion.div key="workouts">
              <WorkoutLogger user={user} onComplete={() => setActiveView('dashboard')} />
            </motion.div>
          )}
          {activeView === 'ai-coach' && (
            <motion.div key="coach">
              <AICoach workouts={workouts} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile-ish Float Fab */}
      {activeView !== 'workouts' && (
        <button 
          onClick={() => setActiveView('workouts')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center hover:bg-red-600 transition-all z-40"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

function Dashboard({ workouts }: { workouts: any[] }) {
  const chartData = [...workouts].reverse().map(w => ({
    name: format(w.date, 'MMM d'),
    duration: w.duration || 0
  }));

  const totalMinutes = workouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgDuration = workouts.length ? Math.round(totalMinutes / workouts.length) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-4xl font-semibold text-gray-900 tracking-tight">Active Pulse</h2>
        <p className="text-gray-400 lowercase italic">Your metabolic journey at a glance</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              Volume Consistency
            </h3>
            <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Last 10 sessions</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF'}} 
                  dy={10}
                />
                <YAxis 
                  fontSize={11} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF'}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} min`, 'Duration']}
                />
                <Area 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorDur)" 
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Time</h4>
               <Activity size={16} className="text-red-500" />
            </div>
            <div className="text-4xl font-light">
              {totalMinutes}
              <span className="text-lg text-gray-400 ml-1 italic">min</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Avg Length</h4>
               <Zap size={16} className="text-amber-500" />
            </div>
            <div className="text-4xl font-light">
              {avgDuration}
              <span className="text-lg text-gray-400 ml-1 italic">min</span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" />
            Recent Logs
          </h3>
          <button className="text-xs text-gray-400 hover:text-black flex items-center gap-1 transition-colors">
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {workouts.map((w) => (
            <div key={w.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 font-mono text-xs border border-gray-100 group-hover:bg-white group-hover:border-red-100 group-hover:text-red-500 transition-all">
                  {format(w.date, 'dd')}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-red-500 transition-colors">{w.type}</h4>
                  <p className="text-sm text-gray-400">{format(w.date, 'MMMM yyyy')} • {w.duration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {w.notes && <div className="hidden md:block text-xs text-gray-300 italic truncate max-w-[200px]">{w.notes}</div>}
                <Dumbbell size={18} className="text-gray-200 group-hover:text-red-200 transition-colors" />
              </div>
            </div>
          ))}
          {workouts.length === 0 && (
            <div className="p-12 text-center text-gray-400 italic">No movement recorded yet. Time to start?</div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

function WorkoutLogger({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [type, setType] = useState('Strength');
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || parseInt(duration) <= 0) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: user.uid,
        type,
        duration: parseInt(duration),
        notes,
        date: serverTimestamp(),
        exercises: [] 
      });
      onComplete();
    } catch (err) {
      console.error('Error adding workout:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <header className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Log Session</h2>
          <p className="text-gray-400 mb-0">Record your latest victory</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Training Type</label>
            <div className="grid grid-cols-3 gap-3">
              {['Strength', 'Cardio', 'Yoga'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-4 rounded-2xl border transition-all text-sm font-medium ${type === t ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Duration (min)</label>
              <input 
                type="number" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-4 focus:bg-white focus:border-red-200 transition-all outline-none font-medium" 
                placeholder="45"
              />
            </div>
            <div className="flex flex-col justify-end">
               <p className="text-[10px] text-gray-400 leading-tight">Accurate time tracking helps the AI Coach predict your fatigue levels.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-4 focus:bg-white focus:border-red-200 transition-all outline-none h-32 resize-none" 
              placeholder="How did you feel? Any personal records or specific muscle groups focused?"
            />
          </div>

          <div className="pt-4 flex items-center gap-4">
            <button 
              type="button"
              onClick={onComplete}
              className="flex-1 border border-gray-200 text-gray-500 rounded-full py-4 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] bg-red-500 text-white rounded-full py-4 font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Activity className="animate-spin" size={20} />
              ) : (
                'Sync Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function AICoach({ workouts }: { workouts: any[] }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const history = workouts.map(w => `${format(w.date, 'yyyy-MM-dd')}: ${w.type} (${w.duration} min) - ${w.notes || 'No notes'}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an elite fitness coach. Analyze the following workout history and provide one concise, high-impact training insight (2-3 sentences max) to improve performance or recovery. 
        History:
        ${history || 'No workouts logged yet.'}
        
        Focus on:
        - Volume trends
        - Consistency
        - Suggesting the next best move`,
        config: {
          systemInstruction: "You are a direct, encouraging, and highly technical fitness expert. Your tone is like a high-end trainer who values precision and efficiency."
        }
      });

      setInsight(response.text || "You're doing great! Keep showing up and pushing your limits.");
    } catch (err) {
      console.error('AI error:', err);
      // Fallback
      setInsight("Your consistency is impressive. Focus on keeping your intensity high during shorter sessions to maximize growth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto space-y-8"
    >
       <div className="bg-black text-white p-10 rounded-[40px] overflow-hidden relative border border-zinc-800">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-500 shadow-lg shadow-red-500/20 rounded-2xl flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold leading-none mb-1">Neural Coach</h2>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Active Engine</span>
                </div>
              </div>
            </div>
            
            <p className="text-zinc-400 mb-10 max-w-sm leading-relaxed">I analyze your movement patterns, duration outliers, and training density to provide tactical adjustments.</p>
            
            {!insight && !loading && (
              <button 
                onClick={generateInsight}
                className="bg-white text-black px-10 py-4 rounded-full font-semibold hover:bg-zinc-200 transition-all flex items-center gap-2 group shadow-xl"
              >
                Synthesize Insights
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {loading && (
              <div className="flex items-center gap-4 text-zinc-400 italic">
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-red-500 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-red-500 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-red-500 rounded-full" />
                </div>
                Quantifying performance...
              </div>
            )}

            {insight && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Plus size={12} className="text-red-500" /> Strategic Adjustment</span>
                  <span className="font-mono">{format(new Date(), 'HH:mm')}</span>
                </div>
                <p className="text-zinc-100 text-lg leading-relaxed font-normal">{insight}</p>
                <div className="mt-8 flex items-center gap-4">
                  <button 
                    onClick={() => setInsight(null)}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Refresh Analysis
                  </button>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 blur-[120px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 blur-[120px] -ml-32 -mb-32" />
       </div>

       <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h4 className="text-xs font-semibold text-gray-400 border-b border-gray-50 pb-3 mb-4 uppercase tracking-wider">Metabolic Focus</h4>
             <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">Anaerobic</span>
                   <span className="font-medium">62%</span>
                </div>
                <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-red-500 h-full w-[62%]" />
                </div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h4 className="text-xs font-semibold text-gray-400 border-b border-gray-50 pb-3 mb-4 uppercase tracking-wider">Recovery Index</h4>
             <div className="flex items-end gap-2">
                <span className="text-3xl font-light">Optimum</span>
                <TrendingUp size={16} className="text-green-500 mb-2" />
             </div>
          </div>
       </div>
    </motion.div>
  );
}

