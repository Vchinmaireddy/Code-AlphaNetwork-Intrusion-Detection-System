# Network Intrusion Detection System (NIDS)

A Network Intrusion Detection System (NIDS) designed to monitor network traffic, detect suspicious activities, and identify potential security threats in real time. This project helps improve network security by analyzing packets and generating alerts for malicious behavior.

> ⚠️ This project is intended for educational and authorized security monitoring purposes only.

---

## Features

- Real-time network traffic monitoring
- Detect suspicious and malicious activities
- Analyze incoming and outgoing packets
- Generate intrusion alerts
- Detect:
  - Port Scanning
  - Suspicious IP Activity
  - DoS/DDoS patterns
  - Unauthorized access attempts
  - Abnormal traffic behavior
- Lightweight and customizable
- Log detected threats for analysis

---

## Technologies Used

- Python 3
- Socket Programming
- Scapy
- Packet Analysis
- Network Security Concepts

---

## Project Structure

```bash
Network-Intrusion-Detection-System/
│
├── ids.py                 # Main IDS script
├── detector.py            # Intrusion detection logic
├── logs/                  # Alert and log files
├── rules/                 # Detection rules
├── requirements.txt
└── README.md
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Network-Intrusion-Detection-System.git
cd Network-Intrusion-Detection-System
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Usage

Run the intrusion detection system with administrator/root privileges.

### Linux / macOS

```bash
sudo python3 ids.py
```

### Windows

Run Command Prompt as Administrator:

```bash
python ids.py
```

---

## Example Output

```text
[ALERT] Suspicious Activity Detected

Type         : Port Scan
Source IP    : 192.168.1.15
Target Port  : 22
Severity     : Medium
Timestamp    : 2026-05-19 14:20:33

Action Taken : Logged for further analysis
--------------------------------------------------
```

---

## Detection Capabilities

- Port Scan Detection
- Suspicious Traffic Monitoring
- Repeated Failed Connection Attempts
- High Traffic Spike Detection
- Unauthorized Network Access
- Packet Anomaly Detection

---

## How It Works

The system captures live network packets and analyzes traffic patterns using predefined detection rules. If suspicious behavior matches known attack patterns, the system generates alerts and stores logs for investigation.

### Core Concepts

- Packet Sniffing
- Intrusion Detection
- Network Traffic Analysis
- Threat Detection
- Security Monitoring

---

## Requirements

- Python 3.x
- Root/Administrator privileges
- Linux, Windows, or macOS

---

## Educational Purpose

This project is useful for:

- Cybersecurity learning
- Network monitoring practice
- Intrusion detection research
- Ethical hacking education
- Security analysis demonstrations

Only use this tool on networks you own or have explicit permission to monitor.

---

## Future Enhancements

- Machine Learning-based threat detection
- Real-time dashboard
- Email/SMS alert integration
- Advanced packet filtering
- Web-based monitoring interface
- Integration with SIEM tools

---

## License

This project is licensed under the MIT License.

---

## Author
vempalla chinmai reddy
GitHub: https://github.com/your-username
