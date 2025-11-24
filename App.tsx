import React, { useState } from 'react';
import { InfinityScene } from './components/InfinityScene';
import { TechniqueType } from './types';
import { Sun, Moon, Settings, Activity, Zap, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const App = () => {
  const [currentTechnique, setCurrentTechnique] = useState<TechniqueType>(TechniqueType.NEUTRAL);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Initialize collapsed state based on screen width (Mobile/Tablet default to collapsed)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  
  // Simulation Controls State
  const [spawnRate, setSpawnRate] = useState(3);
  const [speedMode, setSpeedMode] = useState<'slow' | 'normal' | 'fast'>('normal');

  // Speed mapping
  const speedSettings = {
    slow: { min: 2, max: 5 },
    normal: { min: 8, max: 15 },
    fast: { min: 25, max: 45 }
  };

  const { min: minSpeed, max: maxSpeed } = speedSettings[speedMode];

  const techniques = [
    { 
      type: TechniqueType.NEUTRAL, 
      label: 'Infinity', 
      subtitle: 'Neutral',
      colorClass: 'bg-white',
      borderClass: 'border-white',
      textClass: 'text-white',
      details: {
        concept: "Infinite Series",
        space: "Divides the space between Gojo and any approaching object infinitely. It brings the paradox of 'Achilles and the Tortoise' into reality.",
        speed: "As an object approaches, its relative speed drops exponentially, appearing to stop completely.",
        implication: "Untouchable. An infinite distance contained within a finite space."
      }
    },
    { 
      type: TechniqueType.BLUE, 
      label: 'Blue', 
      subtitle: 'Lapse',
      colorClass: 'bg-sky-500',
      borderClass: 'border-sky-500',
      textClass: 'text-sky-500',
      details: {
        concept: "Negative Distance",
        space: "Amplifies Limitless numbers to create 'negative distance'. The universe implodes to fill the vacuum.",
        speed: "Creates a powerful attractive force. Matter is pulled violently towards the center.",
        implication: "High-speed movement or crushing enemies by imploding space."
      }
    },
    { 
      type: TechniqueType.RED, 
      label: 'Red', 
      subtitle: 'Reversal',
      colorClass: 'bg-red-500',
      borderClass: 'border-red-500',
      textClass: 'text-red-500',
      details: {
        concept: "Positive Distance",
        space: "Flows positive energy into Limitless, inverting Blue to create a divergence of space.",
        speed: "Generates a violent repulsive force. Blasts everything away with immense power.",
        implication: "Destructive shockwave that repels all matter instantly."
      }
    },
    { 
      type: TechniqueType.PURPLE, 
      label: 'Purple', 
      subtitle: 'Hollow',
      colorClass: 'bg-purple-500',
      borderClass: 'border-purple-500',
      textClass: 'text-purple-500',
      details: {
        concept: "Imaginary Mass",
        space: "Combines Blue's attraction and Red's repulsion. Creates imaginary mass that defies physics.",
        speed: "Moves instantaneously, erasing everything in its path at the atomic level.",
        implication: "The ultimate technique. It removes existence from reality."
      }
    },
  ];

  const activeTech = techniques.find(t => t.type === currentTechnique) || techniques[0];

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex w-full h-screen overflow-hidden transition-colors duration-500 font-body ${isDark ? 'bg-gojo-dark text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR CONTAINER */}
      <div className={`
        relative z-20 shadow-2xl border-r transition-all duration-500 ease-in-out flex-shrink-0 h-full
        ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'}
        ${isSidebarCollapsed ? 'w-[80px]' : 'w-full md:w-1/2 lg:w-[450px]'}
      `}>
        
        {/* SIDEBAR CONTENT */}
        <div className="w-full h-full overflow-hidden flex flex-col relative">
          
          {/* --- COLLAPSED VIEW --- */}
          <div className={`absolute inset-0 flex flex-col items-center py-8 h-full transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            
            {/* Top Controls: Moved from bottom to top */}
            <div className="flex flex-col gap-4 mb-8 items-center">
              <button 
                  onClick={() => setIsSidebarCollapsed(false)}
                  className={`p-3 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  title="Expand Sidebar"
              >
                  <PanelLeftOpen size={24} />
              </button>
              <button onClick={toggleTheme} className={`p-3 rounded-full transition-transform hover:rotate-90 ${isDark ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                 {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <h1 className={`font-display font-bold text-2xl tracking-widest vertical-rl opacity-50 select-none ${isDark ? 'text-white' : 'text-slate-900'}`}>LIMITLESS</h1>
            
            <div className="flex flex-col gap-6 mt-8 w-full items-center">
               {techniques.map(tech => (
                 <button 
                   key={tech.type}
                   onClick={() => setCurrentTechnique(tech.type)}
                   className={`
                     w-12 h-12 rounded-full border-2 transition-all duration-300 relative group
                     ${tech.colorClass}
                     ${currentTechnique === tech.type ? 'scale-110 ring-4 ring-offset-4 ring-offset-slate-900 ring-white' : 'opacity-40 hover:opacity-100 hover:scale-110'}
                   `}
                   title={tech.label}
                 >
                 </button>
               ))}
            </div>
          </div>

          {/* --- EXPANDED VIEW --- */}
          <div className={`flex flex-col h-full w-full transition-opacity duration-300 ${!isSidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            
            {/* Header */}
            <div className={`p-8 pb-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
               <div>
                   <h1 className={`text-4xl font-display font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    LIMITLESS
                   </h1>
                   <div className={`h-1 w-full mt-2 rounded-full opacity-50 ${isDark ? 'bg-white' : 'bg-slate-900'}`}></div>
               </div>
               
               <div className="flex gap-2">
                   <button 
                     onClick={toggleTheme}
                     className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                   >
                     {isDark ? <Sun size={20} /> : <Moon size={20} />}
                   </button>
                   <button 
                     onClick={() => setIsSidebarCollapsed(true)}
                     className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                   >
                     <PanelLeftClose size={20} />
                   </button>
               </div>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
              
              {/* TECHNIQUE SELECTION */}
              <section>
                 <h2 className={`text-sm font-display font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                   <Activity size={16} /> Select Technique
                 </h2>
                 <div className="grid grid-cols-2 gap-3">
                   {techniques.map((tech) => (
                    <button
                      key={tech.label}
                      onClick={() => setCurrentTechnique(tech.type)}
                      className={`
                        group relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all duration-300 text-left h-28 overflow-hidden
                        ${currentTechnique === tech.type 
                          ? (isDark ? `bg-slate-700 ${tech.borderClass}` : `bg-white ${tech.borderClass} shadow-lg scale-[1.02]`)
                          : (isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300')}
                      `}
                    >
                      {/* Background Hover color */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${tech.colorClass}`}></div>

                      <h3 className={`font-display text-lg tracking-wide z-10 transition-colors ${currentTechnique === tech.type ? tech.textClass : (isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-700')}`}>
                        {tech.label}
                      </h3>
                      <div className="flex items-end justify-between w-full z-10">
                        <span className={`text-[10px] uppercase tracking-wider font-bold opacity-80 ${currentTechnique === tech.type ? (isDark ? 'text-white' : 'text-slate-800') : 'text-slate-600'}`}>
                          {tech.subtitle}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${tech.colorClass} ${currentTechnique === tech.type ? 'animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'opacity-40 group-hover:opacity-100'}`} />
                      </div>
                    </button>
                  ))}
                 </div>
              </section>

              {/* SIMULATION CONTROLS */}
              <section className="py-2">
                <h2 className={`text-sm font-display font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                   <Settings size={16} /> Controls
                 </h2>
                 
                 <div className={`p-5 rounded-2xl space-y-6 border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    {/* Spawn Rate */}
                    <div>
                      <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider">
                         <span>Attack Rate</span>
                         <span className={`font-display text-lg ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{spawnRate}</span>
                      </div>
                      <div className="relative flex items-center h-6">
                        <input 
                          type="range" min="1" max="8" step="1" 
                          value={spawnRate} 
                          onChange={(e) => setSpawnRate(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] opacity-40 font-mono mt-1">
                        <span>MIN</span>
                        <span>MAX</span>
                      </div>
                    </div>

                    {/* Speed Mode */}
                    <div>
                      <div className="flex justify-between text-xs mb-3 font-bold uppercase tracking-wider">
                         <span>Object Speed</span>
                      </div>
                      <div className={`grid grid-cols-3 gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                         {(['slow', 'normal', 'fast'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setSpeedMode(mode)}
                              className={`
                                py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300
                                ${speedMode === mode 
                                  ? (isDark ? 'bg-slate-700 text-white shadow-lg scale-105' : 'bg-white text-slate-900 shadow-lg scale-105') 
                                  : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}
                              `}
                            >
                              {mode}
                            </button>
                         ))}
                      </div>
                    </div>
                 </div>
              </section>

              {/* EXPLANATION / ANALYSIS SECTION */}
              <section className={`p-6 rounded-2xl border relative overflow-hidden ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className={`absolute top-0 right-0 p-4 opacity-10 font-display text-6xl pointer-events-none select-none ${activeTech.textClass}`}>
                    {activeTech.label[0]}
                 </div>

                 <h2 className={`text-sm font-display font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                   <Zap size={16} /> Analysis
                 </h2>
                 
                 <div className="space-y-6 relative z-10">
                    <div className="group">
                      <h3 className={`text-sm font-display tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Concept
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {activeTech.details.concept}
                      </p>
                    </div>

                    <div className="group">
                      <h3 className={`text-sm font-display tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Spatial Effect
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {activeTech.details.space}
                      </p>
                    </div>

                    <div className="group">
                      <h3 className={`text-sm font-display tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Implication
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {activeTech.details.implication}
                      </p>
                    </div>
                 </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Simulation */}
      <div className="flex-1 relative min-w-0 min-h-0 h-full bg-black/5">
        <InfinityScene 
          technique={currentTechnique} 
          spawnRate={spawnRate}
          minSpeed={minSpeed}
          maxSpeed={maxSpeed}
          theme={theme}
        />
        
        <div className={`absolute bottom-8 right-8 pointer-events-none text-sm font-display uppercase tracking-[0.2em] opacity-40 ${isDark ? 'text-white' : 'text-slate-900'}`}>
           Jujutsu Archive // V.2.1
        </div>
      </div>
    </div>
  );
};

export default App;