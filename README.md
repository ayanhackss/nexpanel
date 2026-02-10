# 🚀 NexPanel

**Next-generation hosting management panel for Ubuntu 22.04**

A production-ready, lightweight hosting control panel for modern hosting management.

## ✨ Features

### Core Management

- **Website & App Management** - Create and manage PHP, Node.js, and Python applications
- **Multi-PHP Support** - PHP 7.4, 8.0, 8.1, 8.2 with easy version switching
- **Database Management** - MariaDB database and user management
- **Domain & SSL** - Let's Encrypt SSL certificates with auto-renewal
- **File Manager** - Browser-based file management
- **Backups & Restore** - Scheduled backups with one-click restore

### Enhanced Features

- **Git Integration** - Clone, pull, push, and manage repositories
- **Monitoring Dashboard** - Real-time system stats (CPU, RAM, Disk, Traffic)
- **Log Viewer** - Search and stream logs in real-time
- **Two-Factor Authentication** - TOTP-based 2FA for admin security
- **IP Blocking & Fail2ban** - Security and DDoS protection
- **One-Click Apps** - WordPress, Ghost, Django, Laravel, Express.js
- **FTP/SFTP Server** - Secure file transfer
- **Redis Cache** - Per-site Redis instances
- **Webhook Manager** - Automated deployment hooks
- **Email Management** - Postfix email accounts and forwarding
- **Staging Environments** - Clone production to staging

### 🚀 Framework Support

- **Node.js**: Native support for **Next.js**, **NestJS**, **Express**, and more (auto-detects `npm start`).
- **Python**: Support for **Django**, **Flask**, **FastAPI**.
- **Static/PHP**: Support for **Vue.js**, **React**, **Angular** (via built output), and standard PHP apps.

## 📋 Requirements

- **OS**: Ubuntu 20.04 or 22.04 LTS
- **Root Access**: Required for installation

## 🔧 Installation

### ⚡ One-Command Install (2-3 minutes)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ayanhackss/nexpanel/main/install.sh || wget -qO- https://raw.githubusercontent.com/ayanhackss/nexpanel/main/install.sh)
```

**✨ Beautiful Modern Installer:**

- 🎨 Sleek, colorful UI with progress bars
- ⚡ Optimized for speed (~60% faster)
- 🛡️ Automatic rollback on failure
- 📊 Real-time progress tracking
- ✅ Smart connectivity detection

**What it does:**

1. ✅ Validates system requirements (OS, RAM, disk, internet)
2. ✅ Installs all dependencies (Nginx, PHP 7.4-8.2, Node.js 18, Python, MariaDB, Redis)
3. ✅ Configures services with production-optimized settings
4. ✅ Sets up firewall (UFW) with secure defaults
5. ✅ Creates admin account with strong password
6. ✅ Displays login credentials and next steps

**Installation Time:** ~2-3 minutes on a fresh Ubuntu system

### 📸 Installation Preview

The installer features a beautiful, modern interface:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║   NEXPANEL                                                                ║
║   🚀  Next-Generation Hosting Management Panel  🚀                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════════╗
║ Step 1/12 │ 🔍 Pre-Installation Checks
╠════════════════════════════════════════════════════════════════════╣
║ ▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ 8%
╚════════════════════════════════════════════════════════════════════╝

  ✓ Checking root privileges... ✓
  ✓ Detecting operating system... ✓
  ✓ OS: Ubuntu 22.04
  ✓ RAM: 2048MB available
  ✓ Disk: 50GB available
  ✓ Internet connection active

╔════════════════════════════════════════════════════════════════════╗
║  ✓  All Pre-Installation Checks Passed!                            ║
╚════════════════════════════════════════════════════════════════════╝
```

### Manual Installation

```bash
# Clone repository
git clone https://github.com/ayanhackss/nexpanel.git
cd nexpanel

# Install dependencies
npm install

# Create data directory
mkdir -p data

# Start the panel
npm start
```

## 🎯 Quick Start

1. **Access the Panel**

   ```
   http://YOUR_SERVER_IP:8080
   ```

2. **Login**
   - Username: `admin`
   - Password: (provided after installation)

3. **Create Your First Website**
   - Go to "Websites" → "Create New"
   - Choose runtime (PHP/Node.js/Python)
   - Enter domain name
   - Click "Create"

4. **Issue SSL Certificate**
   - Go to "SSL Certificates"
   - Select your domain
   - Click "Issue Certificate"

## 🎯 Installer Features

### Modern UI

- **Beautiful Design**: Colorful, gradient-style interface with modern box characters
- **Progress Tracking**: Real-time progress bars showing installation status
- **Clear Feedback**: Color-coded success/error/warning messages
- **Structured Output**: Clean sections with visual separators

### Smart & Fast

- **Optimized Speed**: Batch package installations (~60% faster than traditional installers)
- **Multi-Method Connectivity**: Tries curl, wget, and ping for reliable internet checks
- **Automatic Fallback**: Curl/wget fallback ensures compatibility
- **Resume Capability**: Can resume from last successful step on failure

### Safe & Reliable

- **Pre-flight Checks**: Validates OS, RAM, disk space, and internet before starting
- **Automatic Rollback**: Reverts changes if installation fails
- **Backup System**: Creates backups of modified files
- **Error Handling**: Comprehensive error detection and reporting
- **State Tracking**: Saves progress for potential resume

## 🗑️ Uninstallation

To completely remove NexPanel from your system with beautiful UI:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ayanhackss/nexpanel/main/uninstall.sh || wget -qO- https://raw.githubusercontent.com/ayanhackss/nexpanel/main/uninstall.sh)
```

**✨ Features:**

- 🎨 Beautiful modern UI matching the installer
- ⚡ Fast and safe execution
- 🛡️ Confirmation before destruction
- 🧹 Optional cleanup of data and databases

## 📚 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Ubuntu Tuning Guide](docs/UBUNTU_TUNING.md)
- [API Documentation](docs/API.md)

## 🔐 Security Features

- **Session-based Authentication** with secure cookies
- **Rate Limiting** on login attempts
- **Two-Factor Authentication** (TOTP)
- **Fail2ban Integration** for brute-force protection
- **IP Whitelisting/Blacklisting**
- **Automatic Security Updates**
- **File Permission Isolation** per website
- **Audit Logging** for all admin actions

## 🎛️ System Management

### Service Control

```bash
# Panel service
systemctl status nexpanel
systemctl restart nexpanel
systemctl stop nexpanel

# View logs
journalctl -u nexpanel -f
```

### Resource Monitoring

The panel enforces strict resource limits:

- Panel RAM usage: ≤500-600MB
- Idle apps auto-stopped after 10 minutes
- PHP-FPM: max 5 children per pool
- Node.js apps: max 256MB memory
- Aggressive log rotation

## 🏗️ Technology Stack

- **Backend**: Node.js 20 LTS with Fastify
- **Frontend**: Server-rendered EJS templates
- **Database**: MariaDB + SQLite
- **Web Server**: Nginx (optimized configuration)
- **PHP**: Multi-version support (7.4, 8.0, 8.1, 8.2)
- **Process Manager**: PM2 with auto-restart
- **Cache**: Redis for session and application caching
- **Security**: Helmet, Rate Limiting, CSRF Protection, Fail2ban
- **SSL**: Let's Encrypt with auto-renewal

## 📊 Performance

### Installer Performance

- ⚡ **Fast Installation**: 2-3 minutes on fresh Ubuntu system
- 🔄 **Batch Operations**: Installs packages in groups, not individually
- 🚫 **No Delays**: Removed artificial waits and spinners
- 📦 **Smart Caching**: Reuses already-installed packages

### Runtime Performance

- ✅ Lightweight monitoring (no heavy agents)
- ✅ Minimal background processes
- ✅ Efficient database queries with connection pooling
- ✅ Compressed logs with automatic rotation
- ✅ Resource-aware process management
- ✅ Panel RAM usage: ≤500-600MB
- ✅ Idle apps auto-stopped after 10 minutes

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ayanhackss/nexpanel/issues)
- **Documentation**: [Wiki](https://github.com/ayanhackss/nexpanel/wiki)

## 🎉 Credits

Built with ❤️ for the hosting community.

---

**NexPanel** - Next-generation hosting management made simple.

**✨ Features:**

- 🚀 Modern, beautiful installer (2-3 min setup)
- 🐘 Multi-PHP support (7.4, 8.0, 8.1, 8.2)
- 🔒 Built-in security (Fail2ban, UFW, SSL)
- 📊 Real-time monitoring dashboard
- 🔄 One-click backups and restore
- 🌐 Let's Encrypt SSL automation

> **Note**: This panel is designed for production use. Always test in a staging environment first!
