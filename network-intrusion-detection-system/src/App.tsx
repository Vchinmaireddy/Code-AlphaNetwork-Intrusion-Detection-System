import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Settings, 
  Database,
  Lock,
  Unlock,
  Terminal,
  Zap,
  Filter,
  Plus
} from 'lucide-react';
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
import { cn } from './lib/utils';

interface Packet {
  id: string;
  timestamp: number;
  sourceIp: string;
  destIp: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  port: number;
  size: number;
  payload: string;
}

interface Alert {
  id: string;
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  sourceIp: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  threshold?: number;
  timeWindow?: number;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [trafficData, setTrafficData] = useState<{ time: string, count: number }[]>([]);
  const [firewallStatus, setFirewallStatus] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'rules'>('dashboard');
  
  const packetCountRef = useRef(0);

  useEffect(() => {
    // Connect to the same host as the window
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('packet', (packet: Packet) => {
      setPackets(prev => [packet, ...prev.slice(0, 49)]);
      packetCountRef.current += 1;
    });

    newSocket.on('alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
    });

    newSocket.on('init_alerts', (initialAlerts: Alert[]) => {
      setAlerts(initialAlerts.reverse());
    });

    newSocket.on('init_rules', (initialRules: Rule[]) => {
      setRules(initialRules);
    });

    newSocket.on('rules_updated', (updatedRules: Rule[]) => {
      setRules(updatedRules);
    });

    const interval = setInterval(() => {
      setTrafficData(prev => {
        const newData = [...prev, { 
          time: format(new Date(), 'HH:mm:ss'), 
          count: packetCountRef.current 
        }].slice(-20);
        packetCountRef.current = 0;
        return newData;
      });
    }, 1000);

    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);

  const toggleRule = (id: string, enabled: boolean) => {
    socket?.emit('update_rule', { id, updates: { enabled: !enabled } });
  };

  const addRule = () => {
    const name = prompt('Rule Name?');
    if (name) {
        socket?.emit('add_rule', { 
            name, 
            description: 'Custom user-defined rule', 
            type: 'custom', 
            enabled: true,
            threshold: 10,
            timeWindow: 5000
        });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Sidebar navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 md:w-64 bg-[#161b22] border-r border-white/5 z-50 transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center border border-white/10 shadow-sm">
            <Shield className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:block text-slate-100">Sentinel <span className="text-indigo-400">NIDS</span></span>
        </div>

        <nav className="mt-8 space-y-2 px-3">
          {[
            { id: 'dashboard', icon: Activity, label: 'Dashboard' },
            { id: 'logs', icon: Database, label: 'Traffic Logs' },
            { id: 'rules', icon: Settings, label: 'Detection Rules' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                activeTab === item.id 
                  ? "bg-white/5 text-indigo-400" 
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <item.icon className="w-5 h-5 ml-1 md:ml-0" />
              <span className="font-medium hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 hidden md:block">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600 uppercase tracking-widest font-semibold text-[9px]">Engine Status</span>
              {firewallStatus ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-slate-600" />}
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", firewallStatus ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.3)]" : "bg-slate-600")} />
              <span className={cn("text-sm font-medium", firewallStatus ? "text-indigo-400" : "text-slate-600")}>
                {firewallStatus ? 'Protected' : 'Standby'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pl-16 md:pl-64 pt-6 p-8 min-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Network Intelligence</h1>
            <p className="text-slate-500 mt-1">Real-time threat detection and packet analysis.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#161b22] p-1 rounded-lg border border-white/5 flex shadow-sm">
              <button 
                onClick={() => setFirewallStatus(true)}
                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", firewallStatus ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >
                Enable
              </button>
              <button 
                onClick={() => setFirewallStatus(false)}
                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", !firewallStatus ? "bg-slate-700 text-slate-300" : "text-slate-500 hover:text-slate-300")}
              >
                Disable
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Metric Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Ingress Rate', value: `${packetCountRef.current || packets.length} p/s`, icon: Activity, color: 'text-blue-400' },
                { label: 'Security Events', value: alerts.length, icon: AlertTriangle, color: 'text-amber-500' },
                { label: 'Nodes Secured', value: '12', icon: Shield, color: 'text-indigo-400' },
                { label: 'System Uptime', value: '04:12:33', icon: Zap, color: 'text-slate-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#161b22] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-sm">
                  <div className="absolute right-[-10px] top-[-10px] opacity-[0.02] group-hover:opacity-[0.04] transition-opacity">
                    <stat.icon className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-slate-100">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Traffic Visualization */}
            <div className="lg:col-span-2 bg-[#161b22] p-6 rounded-2xl border border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Throughput Analysis
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Flow Rate (p/s)</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#161b22', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#818cf8' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#818cf8" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      animationDuration={400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-[#161b22] p-6 rounded-2xl border border-white/5 flex flex-col shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-100">
                <AlertTriangle className="w-5 h-5 text-indigo-500" />
                Detections
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm py-10 opacity-50">
                    <Shield className="w-10 h-10 mb-2 opacity-20" />
                    Clean Network State
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                          alert.severity === 'high' ? "bg-red-950/30 text-red-400 border border-red-500/20" :
                          alert.severity === 'medium' ? "bg-amber-950/30 text-amber-500 border border-amber-500/20" : "bg-slate-800 text-slate-400"
                        )}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {format(alert.timestamp, 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1 text-slate-200">{alert.type}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{alert.details}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Packet Table */}
            <div className="lg:col-span-3 bg-[#161b22] rounded-2xl border border-white/5 overflow-hidden shadow-sm">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                  <Terminal className="w-5 h-5 text-indigo-500" />
                  Packet Streams
                </h3>
                <div className="flex items-center gap-2">
                   <div className="bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-white/5">
                      <Filter className="w-3 h-3" /> Source: Inbound
                   </div>
                </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-white/[0.01] text-slate-600 font-bold uppercase text-[9px] tracking-[0.2em] border-b border-white/5">
                     <tr>
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4">Origin</th>
                       <th className="px-6 py-4">Endpoint</th>
                       <th className="px-6 py-4">Protocol</th>
                       <th className="px-6 py-4">Port</th>
                       <th className="px-6 py-4 text-right">Status</th>
                     </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {packets.map((packet) => (
                        <tr key={packet.id} className="hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                             {format(packet.timestamp, 'HH:mm:ss.SS')}
                           </td>
                           <td className="px-6 py-4 font-semibold text-slate-300">
                             <span className={cn(
                               "rounded px-1.5 py-0.5",
                               packet.sourceIp.startsWith('103') || packet.sourceIp.startsWith('45') ? "text-amber-500 font-bold" : ""
                             )}>
                               {packet.sourceIp}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-slate-500 text-xs">{packet.destIp}</td>
                           <td className="px-6 py-4">
                             <span className={cn(
                               "px-2 py-1 rounded text-[10px] font-bold border border-white/5",
                               packet.protocol === 'TCP' ? "bg-indigo-950/20 text-indigo-400" : "bg-slate-800 text-slate-400"
                             )}>
                               {packet.protocol}
                             </span>
                           </td>
                           <td className="px-6 py-4 font-mono text-xs text-indigo-400/80">{packet.port}</td>
                           <td className="px-6 py-4 text-right">
                              <span className="text-[9px] font-bold tracking-widest uppercase bg-slate-800 text-slate-500 px-2 py-1 rounded">VERIFIED</span>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
           <div className="bg-[#161b22] rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center text-center min-h-[400px] shadow-sm">
              <Database className="w-16 h-16 text-slate-800 mb-6" />
              <h2 className="text-2xl font-bold mb-2 text-slate-200">System Log Archive</h2>
              <p className="text-slate-600 max-w-md text-sm leading-relaxed">Network packet retention is currently focused on real-time forensics. Log streaming is limited to current session memory.</p>
           </div>
        )}

        {activeTab === 'rules' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-100">Detection Matrix</h2>
                <button 
                  onClick={addRule}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-900/10"
                >
                  <Plus className="w-4 h-4" /> Define Rule
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-[#161b22] p-6 rounded-2xl border border-white/5 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                               <Settings className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h4 className="font-bold text-slate-200">{rule.name}</h4>
                         </div>
                         <button 
                          onClick={() => toggleRule(rule.id, rule.enabled)}
                          className={cn(
                            "w-10 h-5 rounded-full p-1 transition-all duration-300",
                            rule.enabled ? "bg-indigo-600" : "bg-slate-800"
                          )}
                         >
                           <div className={cn(
                             "w-3 h-3 bg-white rounded-full transition-all duration-300",
                             rule.enabled ? "translate-x-5" : "translate-x-0"
                           )} />
                         </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">{rule.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-white/5 font-mono text-[9px] font-bold tracking-widest text-slate-600">
                      <div className="flex gap-6 uppercase">
                        <span>THRESHOLD: {rule.threshold}U</span>
                        <span>WINDOW: {rule.timeWindow}MS</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
