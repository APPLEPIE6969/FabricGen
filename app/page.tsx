'use client';

import { useState, useEffect, useRef } from 'react';
import { generateModZip } from '@/utils/generator';
import { FABRIC_TEMPLATES } from '@/utils/templates';
import { Download, Loader2, Hammer, Code, Zap, Settings, Book, Info, Plus, RotateCcw, Trash2, FileCode, ImageIcon, X, ChevronRight, Binary, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModFile {
  path: string;
  content: string;
  encoding?: 'base64' | 'utf-8';
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState<{ status: string; conclusion?: string | null; htmlUrl?: string; downloadUrl?: string } | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<ModFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ModFile | null>(null);
  const [formData, setFormData] = useState({
    modName: 'My Epic Mod',
    modId: 'my_epic_mod',
    modVersion: '1.0.0',
    mavenGroup: 'com.example',
    description: 'A mod that adds epic things.',
    prompt: 'Add a new item called "Epic Gem" that gives the player strength when held. Also generate a shiny purple texture for it.',
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated build progress (visual filler)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (building && (!buildStatus || buildStatus.status !== 'completed')) {
      interval = setInterval(() => {
        setBuildProgress(prev => {
          if (prev >= 98) return prev;
          return prev + (100 - prev) * 0.05;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [building, buildStatus]);

  // Real polling
  useEffect(() => {
    if (building) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/build/status?modId=${formData.modId}`);
          const data = await res.json();
          if (data.status) {
            setBuildStatus(data);
            if (data.status === 'completed') {
              setBuilding(false);
              setBuildProgress(100);
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            }
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 5000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [building, formData.modId]);

  const getBaseTemplates = () => {
    const { modId, modName, modVersion, mavenGroup, description } = formData;
    return [
      { path: 'build.gradle', content: FABRIC_TEMPLATES.buildGradle(modId, modVersion, mavenGroup) },
      { path: 'fabric.mod.json', content: FABRIC_TEMPLATES.fabricModJson(modId, modName, description, mavenGroup) },
      { path: 'gradle.properties', content: FABRIC_TEMPLATES.gradleProperties(modId) },
      { path: 'settings.gradle', content: FABRIC_TEMPLATES.settingsGradle }
    ];
  };

  const getAllFiles = () => {
     return [...getBaseTemplates(), ...generatedFiles];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentFiles: generatedFiles,
          baseTemplates: getBaseTemplates()
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedFiles(prev => {
        let nextFiles = [...prev];
        if (data.delete && Array.isArray(data.delete)) {
          nextFiles = nextFiles.filter(f => !data.delete.includes(f.path));
        }
        if (data.upsert && Array.isArray(data.upsert)) {
          data.upsert.forEach((file: ModFile) => {
            const index = nextFiles.findIndex(f => f.path === file.path);
            if (index !== -1) {
              nextFiles[index] = file;
            } else {
              nextFiles.push(file);
            }
          });
        }
        return nextFiles;
      });

    } catch (error: any) {
      alert('Error generating mod: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await generateModZip({
        ...formData,
        extraFiles: generatedFiles,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = formData.modId + "-" + formData.modVersion + ".zip";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setExporting(false);
      }, 100);
    } catch (error: any) {
      console.error("Download failed:", error);
      alert("Failed to generate ZIP: " + error.message);
      setExporting(false);
    }
  };

  const handleCloudBuild = async () => {
    if (building) return;
    setBuilding(true);
    setBuildStatus(null);
    setBuildProgress(0);
    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modFiles: getAllFiles(),
          modId: formData.modId
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

    } catch (error: any) {
      alert("Build failed to trigger: " + error.message);
      setBuilding(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all generated files?')) {
      setGeneratedFiles([]);
      setSelectedFile(null);
      setBuildStatus(null);
      setBuilding(false);
    }
  };

  const removeFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratedFiles(prev => prev.filter(f => f.path !== path));
    if (selectedFile?.path === path) setSelectedFile(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30">
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-2 rounded-xl shadow-lg shadow-orange-900/20">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase">FabricGen</span>
          </div>
          <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <a href="#" className="text-orange-500 border-b-2 border-orange-500 pb-1">Generator</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Docs</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Examples</a>
            <a href="https://github.com/diddy62626/Minecraft-Fabric-1.21.11-Mod-Generator" target="_blank" className="hover:text-zinc-200 transition-colors inline-flex items-center gap-1">GitHub <ExternalLink className="w-2.5 h-2.5" /></a>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={handleReset} className="p-2 text-zinc-600 hover:text-orange-500 transition-colors" title="Reset Project"><RotateCcw className="w-5 h-5" /></button>
             <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-bold text-xs">AI</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-12">
          <header>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3 fill-orange-500" /> Minecraft 1.21.11 Ready
            </div>
            <h1 className="text-6xl font-black mb-6 tracking-tight leading-[0.9]">
              Architect your <br />
              <span className="text-zinc-800">perfect mod.</span>
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="bg-zinc-900/20 border border-zinc-900 p-8 rounded-[2rem] space-y-8 shadow-inner shadow-black/20">
              <div className="flex items-center gap-2 text-zinc-600 uppercase text-[10px] font-black tracking-widest">
                <Settings className="w-4 h-4" /> Core Manifest
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="modName" value={formData.modName} onChange={handleChange} placeholder="Mod Name" className="col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-bold placeholder:text-zinc-800" />
                <input name="modId" value={formData.modId} onChange={handleChange} placeholder="mod_id" className="bg-zinc-950 border border-zinc-900 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-mono text-xs placeholder:text-zinc-800" />
                <input name="mavenGroup" value={formData.mavenGroup} onChange={handleChange} placeholder="com.example" className="bg-zinc-950 border border-zinc-900 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-mono text-xs placeholder:text-zinc-800" />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-500 uppercase text-[10px] font-black tracking-widest">
                  <Code className="w-4 h-4" /> Feature Architect
                </div>
              </div>
              
              <div className="relative group">
                <textarea
                  name="prompt"
                  value={formData.prompt}
                  onChange={handleChange}
                  rows={5}
                  className="w-full bg-zinc-900 border border-zinc-900 rounded-[2rem] px-8 py-8 focus:ring-2 focus:ring-orange-600/20 outline-none transition-all resize-none font-medium text-lg leading-relaxed placeholder:text-zinc-800 shadow-inner shadow-black/20"
                  placeholder="Ask to add items, blocks, logic, or textures..."
                  required
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] min-w-[200px] bg-zinc-100 hover:bg-white text-zinc-950 font-black py-5 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-white/5"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      BUILD ITERATION
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={exporting || generatedFiles.length === 0}
                  className="flex-1 min-w-[150px] bg-zinc-800 hover:bg-zinc-700 text-white font-black py-5 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50 shadow-xl"
                >
                  {exporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      EXPORT ZIP
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCloudBuild}
                  disabled={building || generatedFiles.length === 0}
                  className="flex-1 min-w-[150px] bg-orange-600 hover:bg-orange-500 text-white font-black py-5 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:bg-zinc-900 shadow-xl shadow-orange-900/10"
                >
                  {building ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Binary className="w-5 h-5" />
                      BUILD JAR
                    </>
                  )}
                </button>
              </div>

              {(building || buildStatus) && (
                <div className="space-y-4 p-6 bg-zinc-900/40 border border-zinc-900 rounded-[2rem] animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-zinc-500 flex items-center gap-2">
                      {buildStatus?.status === 'completed' ? (
                        buildStatus.conclusion === 'success' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                      )}
                      {buildStatus ? (
                         buildStatus.status === 'completed' ? (buildStatus.conclusion === 'success' ? 'Build Complete' : 'Build Failed') : 'GitHub Runner Building...'
                      ) : 'Triggering Build...'}
                    </span>
                    <span className="text-orange-500">{Math.round(buildProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(249,115,22,0.5)] ${buildStatus?.conclusion === 'failure' ? 'bg-red-500' : 'bg-orange-500'}`} 
                      style={{ width: `${buildProgress}%` }}
                    />
                  </div>
                  {buildStatus && (
                    <div className="flex items-center justify-between gap-4">
                       <a href={buildStatus.htmlUrl} target="_blank" className="text-[9px] font-black text-zinc-600 hover:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                         View Log <ExternalLink className="w-2.5 h-2.5" />
                       </a>
                       {buildStatus.conclusion === 'success' && (
                         <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">
                           Artifact Ready in GitHub
                         </span>
                       )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <div className="sticky top-32">
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-[2.5rem] p-10 space-y-8 shadow-inner shadow-black/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">File System</h3>
                    <div className="bg-zinc-950 border border-zinc-900 px-3 py-1 rounded-full text-[10px] font-black text-orange-500">{generatedFiles.length} ACTIVE</div>
                  </div>

                  {generatedFiles.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-950 border border-zinc-900 rounded-3xl mx-auto flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-zinc-800" />
                      </div>
                      <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">No files architected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {generatedFiles.map((file, i) => (
                        <div key={i} onClick={() => setSelectedFile(file)} className={`group flex items-center justify-between p-4 bg-zinc-950 border rounded-2xl transition-all cursor-pointer ${selectedFile?.path === file.path ? 'border-orange-500/50 shadow-lg shadow-orange-500/5' : 'border-zinc-900 hover:border-zinc-800'}`}>
                          <div className="flex items-center gap-4 truncate">
                            {file.encoding === 'base64' ? <ImageIcon className="w-4 h-4 text-orange-500/50" /> : <FileCode className="w-4 h-4 text-blue-500/50" />}
                            <div className="flex flex-col truncate">
                              <span className="text-[11px] font-bold text-zinc-300 truncate">{file.path.split('/').pop()}</span>
                              <span className="text-[9px] text-zinc-600 truncate uppercase tracking-tighter">{file.path.replace(/\/[^/]+$/, '')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <ChevronRight className={`w-3 h-3 text-zinc-800 transition-transform ${selectedFile?.path === file.path ? 'rotate-90 text-orange-500' : ''}`} />
                             <button onClick={(e) => removeFile(file.path, e)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-800 hover:text-red-500 transition-all">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-6 border-t border-zinc-900">
                    <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                      <Info className="w-4 h-4 text-orange-500" />
                      <p className="text-[9px] font-medium text-zinc-500 leading-normal">
                        Click <span className="text-orange-500">BUILD JAR</span> to compile your mod on GitHub and download the resulting JAR file.
                      </p>
                    </div>
                  </div>
              </div>
           </div>
        </div>
      </main>

      {/* File Inspector Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-5xl h-[80vh] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex flex-col shadow-2xl shadow-black">
            <header className="p-8 border-b border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    {selectedFile.encoding === 'base64' ? <ImageIcon className="w-5 h-5 text-orange-500" /> : <FileCode className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-black text-zinc-100 tracking-tight">{selectedFile.path.split('/').pop()}</h2>
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{selectedFile.path}</span>
                  </div>
               </div>
               <button onClick={() => setSelectedFile(null)} className="p-3 bg-zinc-950 hover:bg-zinc-800 rounded-2xl border border-zinc-800 transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </header>
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
              {selectedFile.encoding === 'base64' ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                   <div className="w-48 h-48 bg-zinc-950 border-4 border-zinc-800 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-inner shadow-black p-8">
                      <img 
                        src={`data:image/png;base64,${selectedFile.content}`} 
                        alt="Texture Preview" 
                        className="w-full h-full object-contain image-pixelated"
                      />
                   </div>
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Base64 Encoded PNG Texture</p>
                </div>
              ) : (
                <pre className="font-mono text-sm text-zinc-400 leading-relaxed">
                  <code>{selectedFile.content}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-32 border-t border-zinc-900 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-zinc-700 text-[10px] font-black uppercase tracking-widest">
           <div className="flex items-center gap-12">
             <a href="#" className="hover:text-zinc-200 transition-colors">Stability</a>
             <a href="#" className="hover:text-zinc-200 transition-colors">Security</a>
             <a href="#" className="hover:text-zinc-200 transition-colors">Privacy</a>
           </div>
           <p>© 2026 FabricGen. Java 21 Runtime Required.</p>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
        .image-pixelated {
          image-rendering: pixelated;
        }
      `}</style>
    </div>
  );
}
