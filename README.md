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

## 📋 Requirements

- **OS**: Ubuntu 20.04 or 22.04 LTS
- **Root Access**: Required for installation

## 🔧 Installation

### ⚡ One-Command Install (2-3 minutes)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ayanhackss/nexpanel/main/install.sh)
```

### 📸 Installation Preview

The installer features a beautiful, modern interface:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║   NEXPANEL                                                                ║
║   🚀  Next-Generation Hosting Management Panel  🚀                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════════════════╗
║ Step 1/12 │ 🔍 Pre-Installation Checks                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║ ▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ 8%                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

  ✓ Checking root privileges... ✓
  ✓ Detecting operating system... ✓
  ✓ OS: Ubuntu 22.04
  ✓ RAM: 2048MB available
  ✓ Disk: 50GB available
  ✓ Internet connection active

╔════════════════════════════════════════════════════════════════════════════╗
║  ✓  All Pre-Installation Checks Passed!                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Manual Installation

```bash
# Clone repository
git clone https://github.com/ayanhackss/nexpanel.git
cd nexpanel

# Install dependencies
npm install

# Setup admin user (creates database and admin account)
npm run setup:admin

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
   - Password: (provided after installation/setup)

3. **Create Your First Website**
   - Go to "Websites" → "Create New"
   - Choose runtime (PHP/Node.js/Python)
   - Enter domain name
   - Click "Create"

4. **Issue SSL Certificate**
   - Go to "SSL Certificates"
   - Select your domain
   - Click "Issue Certificate"

## 🗑️ Uninstallation

### ⚡ One-Command Uninstall

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ayanhackss/nexpanel/main/uninstall.sh)
```

### Manual Uninstall

```bash
chmod +x uninstall.sh
sudo ./uninstall.sh
```

**What the uninstaller removes:**
- NexPanel service (systemd)
- Nginx configurations
- PHP-FPM pools
- PM2 processes
- Website directories
- Backup directories
- Database files
- Log files
- User accounts
- Cron jobs
- Firewall rules

**Note:** This does not remove Node.js, MariaDB, or other system packages.

## 📚 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Ubuntu Tuning Guide](docs/UBUNTU_TUNING.md)

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

### Panel Service Commands

```bash
# Check status
systemctl status nexpanel

# Restart
systemctl restart nexpanel

# Stop
systemctl stop nexpanel

# View logs
journalctl -u nexpanel -f
```

### Reset Admin Password

```bash
cd /path/to/nexpanel
npm run setup:admin -- --username admin --password YourNewPassword
```

Or generate a random password:

```bash
npm run setup:admin
```

## 🏗️ Technology Stack

- **Backend**: Node.js 18 LTS with Fastify
- **Frontend**: Server-rendered EJS templates
- **Database**: MariaDB + SQLite
- **Web Server**: Nginx (optimized configuration)
- **PHP**: Multi-version support (7.4, 8.0, 8.1, 8.2)
- **Process Manager**: PM2 with auto-restart
- **Cache**: Redis for session and application caching
- **Security**: Helmet, Rate Limiting, CSRF Protection, Fail2ban
- **SSL**: Let's Encrypt with auto-renewal

## 📊 Performance

- **Fast Installation**: 2-3 minutes on fresh Ubuntu system
- **Lightweight**: No heavy monitoring agents
- **Efficient**: Connection pooling and optimized queries
- **Resource-aware**: Panel RAM usage ≤500-600MB

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ayanhackss/nexpanel/issues)
- **Documentation**: [Wiki](https://github.com/ayanhackss/nexpanel/wiki)

---

**NexPanel** - Next-generation hosting management made simple.
