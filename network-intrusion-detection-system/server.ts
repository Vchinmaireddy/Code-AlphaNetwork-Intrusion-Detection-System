import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'port_scan' | 'failed_connection' | 'unusual_spike' | 'custom';
  enabled: boolean;
  threshold?: number;
  timeWindow?: number; // in milliseconds
}

interface Alert {
  id: string;
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  sourceIp: string;
}

class TrafficSimulator {
  private io: Server;
  private interval: NodeJS.Timeout | null = null;
  private suspiciousIps = new Set<string>();

  constructor(io: Server) {
    this.io = io;
  }

  start() {
    this.interval = setInterval(() => {
      const packet = this.generatePacket();
      this.io.emit('packet', packet);
      
      // Occasionally generate "malicious" clusters
      if (Math.random() > 0.95) {
        this.simulateAttack();
      }
    }, 500);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  private generatePacket(): Packet {
    const isSuspicious = Math.random() > 0.98;
    return {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      sourceIp: isSuspicious ? this.getSuspiciousIp() : this.getRandomIp(),
      destIp: '192.168.1.100',
      protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
      port: Math.floor(Math.random() * 65535),
      size: Math.floor(Math.random() * 1500),
      payload: '...',
    };
  }

  private getRandomIp() {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
  }

  private getSuspiciousIp() {
    const ips = ['45.1.2.3', '185.22.33.44', '103.11.22.33'];
    return ips[Math.floor(Math.random() * ips.length)];
  }

  private simulateAttack() {
    const attackerIp = this.getSuspiciousIp();
    // Simulate a port scan: many packets to different ports from same IP
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            this.io.emit('packet', {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                sourceIp: attackerIp,
                destIp: '192.168.1.100',
                protocol: 'TCP',
                port: 20 + i,
                size: 64,
                payload: 'SYN SCAN',
            });
        }, i * 50);
    }
  }
}

class DetectionEngine {
  private rules: Rule[] = [
    { id: '1', name: 'Port Scan Detection', description: 'Detects more than 5 distinct ports visited by one IP in 5s', type: 'port_scan', enabled: true, threshold: 5, timeWindow: 5000 },
    { id: '2', name: 'Traffic Spike', description: 'Detects sudden high volume of packets', type: 'unusual_spike', enabled: true, threshold: 20, timeWindow: 1000 },
  ];
  private history: Packet[] = [];
  private alerts: Alert[] = [];
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  process(packet: Packet) {
    this.history.push(packet);
    // Keep last 1000 packets for analysis
    if (this.history.length > 1000) this.history.shift();

    this.rules.forEach(rule => {
      if (!rule.enabled) return;

      if (rule.type === 'port_scan') {
        this.checkPortScan(rule, packet);
      } else if (rule.type === 'unusual_spike') {
        this.checkTrafficSpike(rule);
      }
    });
  }

  private checkPortScan(rule: Rule, currentPacket: Packet) {
    const window = rule.timeWindow || 5000;
    const now = Date.now();
    const relevant = this.history.filter(p => p.sourceIp === currentPacket.sourceIp && now - p.timestamp < window);
    const uniquePorts = new Set(relevant.map(p => p.port));

    if (uniquePorts.size > (rule.threshold || 5)) {
      this.createAlert({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type: 'Port Scan Detected',
        severity: 'high',
        details: `IP ${currentPacket.sourceIp} scanned ${uniquePorts.size} unique ports in ${window/1000}s`,
        sourceIp: currentPacket.sourceIp
      });
    }
  }

  private checkTrafficSpike(rule: Rule) {
    const window = rule.timeWindow || 1000;
    const now = Date.now();
    const count = this.history.filter(p => now - p.timestamp < window).length;

    if (count > (rule.threshold || 20)) {
        // Prevent spamming alerts for the same spike
        const lastAlert = this.alerts[this.alerts.length - 1];
        if (!lastAlert || (now - lastAlert.timestamp > 5000) || lastAlert.type !== 'Traffic Spike Detected') {
            this.createAlert({
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                type: 'Traffic Spike Detected',
                severity: 'medium',
                details: `Unexpected traffic volume: ${count} packets/sec`,
                sourceIp: 'Multiple'
            });
        }
    }
  }

  private createAlert(alert: Alert) {
    // Basic deduplication for same IP/Type in short time
    const isDuplicate = this.alerts.some(a => a.sourceIp === alert.sourceIp && a.type === alert.type && Date.now() - a.timestamp < 30000);
    if (isDuplicate) return;

    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
    this.io.emit('alert', alert);
  }

  getAlerts() { return this.alerts; }
  getRules() { return this.rules; }
  
  updateRule(id: string, updates: Partial<Rule>) {
    this.rules = this.rules.map(r => r.id === id ? { ...r, ...updates } : r);
  }

  addRule(rule: Omit<Rule, 'id'>) {
    const newRule = { ...rule, id: Math.random().toString(36).substr(2, 5) };
    this.rules.push(newRule);
    return newRule;
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  const detectionEngine = new DetectionEngine(io);
  const trafficSimulator = new TrafficSimulator(io);

  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('init_rules', detectionEngine.getRules());
    socket.emit('init_alerts', detectionEngine.getAlerts());

    socket.on('update_rule', (data) => {
      detectionEngine.updateRule(data.id, data.updates);
      io.emit('rules_updated', detectionEngine.getRules());
    });

    socket.on('add_rule', (rule) => {
        const nr = detectionEngine.addRule(rule);
        io.emit('rules_updated', detectionEngine.getRules());
    });
  });

  io.on('packet', (packet: Packet) => {
    detectionEngine.process(packet);
  });

  trafficSimulator.start();

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
