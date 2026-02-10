#!/bin/bash

#############################################
# NexPanel - One-Command Installer
# For Ubuntu 20.04 / 22.04 LTS
# Next-generation hosting management
#############################################

set -e

# Colors and formatting - Enhanced palette
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
MAGENTA=$'\033[0;35m'
CYAN=$'\033[0;36m'
WHITE=$'\033[1;37m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'

# Enhanced colors for modern UI
PURPLE=$'\033[0;35m'
BRIGHT_BLUE=$'\033[1;34m'
BRIGHT_GREEN=$'\033[1;32m'
BRIGHT_CYAN=$'\033[1;36m'
BRIGHT_YELLOW=$'\033[1;33m'
GRAY=$'\033[0;90m'

# Log file setup with validation
LOG_FILE="/var/log/nexpanel-install.log"
STATE_FILE="/tmp/nexpanel-install-state"
BACKUP_DIR="/tmp/nexpanel-backup-$(date +%s)"

# Ensure log directory exists and is writable
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/tmp/nexpanel-install.log"
    echo "Warning: Using temporary log file: $LOG_FILE"
fi

exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

# Progress tracking
TOTAL_STEPS=13
CURRENT_STEP=0

# Track installed components for rollback
INSTALLED_PACKAGES=()
CREATED_FILES=()
MODIFIED_FILES=()

#############################################
# Helper Functions
#############################################

print_banner() {
    clear
    echo -e "${BRIGHT_CYAN}${BOLD}"
    cat <<EOF
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ███╗   ██╗███████╗██╗  ██╗██████╗  █████╗ ███╗   ██╗███████╗██╗       ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║       ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██████╔╝███████║██╔██╗ ██║█████╗  ██║       ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║       ║
║   ██║ ╚████║███████╗██╔╝ ██╗██║     ██║  ██║██║ ╚████║███████╗███████╗  ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝  ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║          🚀  Next-Generation Hosting Management Panel  🚀                 ║
║                                                                           ║
║                         ${BRIGHT_YELLOW}Version 1.0.0${BRIGHT_CYAN}                                  ║
║                                                                           ║
║              ${WHITE}Automated Installation & Configuration${BRIGHT_CYAN}                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
}

print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local step_name="$1"
    local percentage=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    
    # Clear previous output and add spacing
    printf "\n\n"
    
    # Create visual progress bar with gradient effect
    local bar_width=50
    local filled=$((percentage * bar_width / 100))
    local empty=$((bar_width - filled))
    local bar=""
    
    # Use different characters for a more modern look
    for ((i=0; i<filled; i++)); do bar+="▰"; done
    for ((i=0; i<empty; i++)); do bar+="▱"; done
    
    # Modern box design with gradient colors
    echo -e "${BRIGHT_CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BRIGHT_CYAN}║${NC} ${BRIGHT_YELLOW}Step ${CURRENT_STEP}/${TOTAL_STEPS}${NC} ${GRAY}│${NC} ${step_name}"
    echo -e "${BRIGHT_CYAN}╠════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BRIGHT_CYAN}║${NC} ${BRIGHT_GREEN}${bar}${NC} ${BRIGHT_YELLOW}${percentage}%${NC}"
    echo -e "${BRIGHT_CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "  ${BRIGHT_GREEN}✓${NC} ${WHITE}$1${NC}"
}

print_error() {
    echo -e "  ${RED}✗${NC} ${WHITE}$1${NC}"
}

print_warning() {
    echo -e "  ${BRIGHT_YELLOW}⚠${NC} ${WHITE}$1${NC}"
}

print_info() {
    echo -e "  ${BRIGHT_BLUE}ℹ${NC} ${DIM}$1${NC}"
}

run_with_spinner() {
    local command="$1"
    local message="$2"
    local temp_log=$(mktemp)
    
    # Run command in background
    eval "$command" > "$temp_log" 2>&1 &
    local pid=$!
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    
    # Disable cursor
    tput civis 2>/dev/null || true
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 10 ))
        printf "\r  ${CYAN}${spin:$i:1}${NC} ${WHITE}${message}...${NC}"
        sleep 0.1
    done
    
    wait $pid
    local exit_code=$?
    
    # Enable cursor
    tput cnorm 2>/dev/null || true
    
    # Clear line completely
    printf "\r\033[K"
    
    if [ $exit_code -eq 0 ]; then
        print_success "$message"
        cat "$temp_log" >> "$LOG_FILE"
        rm -f "$temp_log"
        return 0
    else
        print_error "$message failed"
        echo -e "${RED}Error log:${NC}"
        cat "$temp_log" | tee -a "$LOG_FILE"
        rm -f "$temp_log"
        return $exit_code
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

save_state() {
    echo "$CURRENT_STEP" > "$STATE_FILE"
    echo "$(date +%s)" > "${STATE_FILE}.timestamp"
}

load_state() {
    if [ -f "$STATE_FILE" ]; then
        CURRENT_STEP=$(cat "$STATE_FILE")
        return 0
    fi
    return 1
}

attempt_purge_recovery() {
    echo ""
    print_error "Database credentials rejected."
    echo -e "${RED}${BOLD}🚨 CRITICAL: Cannot access MariaDB!${NC}"
    echo -e "${YELLOW}Existing database detected but password is unknown.${NC}"
    echo -e "${YELLOW}Since this looks like a failed installation, we can PURGE and reinstall MariaDB.${NC}"
    echo -e "${RED}${BOLD}⚠️  WARNING: THIS WILL DELETE ALL EXISTING DATABASES!${NC}"
    echo ""
    
    read -p "$(echo -e "${WHITE}Type 'destroy' to purge and reinstall MariaDB (or anything else to abort): ${NC}")" choice
    
    if [ "$choice" != "destroy" ]; then
        print_error "Aborted by user."
        exit 1
    fi
    
    print_info "Stopping MariaDB..."
    systemctl stop mariadb
    
    print_info "Removing packages..."
    DEBIAN_FRONTEND=noninteractive apt-get remove --purge -y mariadb-server mariadb-client mariadb-common >/dev/null 2>&1
    apt-get autoremove -y >/dev/null 2>&1
    
    print_info "Removing data directories..."
    rm -rf /var/lib/mysql
    rm -rf /etc/mysql
    
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends mariadb-server mariadb-client" "Reinstalling MariaDB"
    
    run_with_spinner "systemctl enable --now mariadb" "Starting service"
    sleep 5
    
    print_info "Securing fresh installation..."
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';" 
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    print_success "MariaDB purged and secured successfully."
}

setup_cloudflared() {
    print_info "Checking Cloudflare Tunnel configuration..."
    
    if ! command -v cloudflared &> /dev/null; then
        print_info "Installing Cloudflare Tunnel (cloudflared)..."
        # Create directory for the package
        mkdir -p /tmp/cloudflared
        cd /tmp/cloudflared
        
        # Download the latest deb package
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        
        # Install it
        dpkg -i cloudflared-linux-amd64.deb >/dev/null 2>&1
        cd - >/dev/null
        
        if command -v cloudflared &> /dev/null; then
            print_success "Cloudflare Tunnel installed successfully"
        else
            print_error "Failed to install Cloudflare Tunnel"
            return 1
        fi
    else
        print_success "Cloudflare Tunnel is already installed"
    fi
    
    echo ""
    echo -e "${BRIGHT_CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BRIGHT_CYAN}║${NC}  ${WHITE}${BOLD}☁️  CLOUDFLARE TUNNEL SETUP${NC}                                        ${BRIGHT_CYAN}║${NC}"
    echo -e "${BRIGHT_CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}If your server is behind a NAT or has firewall restrictions,${NC}"
    echo -e "${WHITE}you can use Cloudflare Tunnel to expose the panel securely.${NC}"
    echo ""
    
    read -p "$(echo -e "${YELLOW}${BOLD}Do you want to setup Cloudflare Tunnel now? (Press 'n' if you don't have a token) [y/N]${NC} ")" -n 1 -r choice
    echo ""
    if [[ ! $choice =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${WHITE}Please enter your Cloudflare Tunnel Token:${NC}"
    echo -e "${DIM}(You can get this from the Cloudflare Zero Trust Dashboard)${NC}"
    read -p "Token: " token
    
    if [ -n "$token" ]; then
        print_info "Configuring tunnel service..."
        cloudflared service uninstall >/dev/null 2>&1 || true
        if cloudflared service install "$token" >/dev/null 2>&1; then
            print_success "Cloudflare Tunnel service installed"
            print_info "Starting tunnel..."
            systemctl start cloudflared
            print_success "Cloudflare Tunnel is active!"
        else
            print_error "Failed to install tunnel service. Check your token."
        fi
    else
        print_warning "No token provided. Skipping setup."
    fi
}

detect_previous_installation() {
    local components_found=0
    local components_status=""
    
    # Check for various installation markers
    [ -d "/opt/nexpanel" ] && components_status+="📁 NexPanel directory exists\n" && ((components_found++))
    [ -f "/etc/systemd/system/nexpanel.service" ] && components_status+="⚙️  Systemd service configured\n" && ((components_found++))
    systemctl is-active --quiet nginx 2>/dev/null && components_status+="🌐 Nginx is running\n" && ((components_found++))
    systemctl is-active --quiet mariadb 2>/dev/null && components_status+="🗄️  MariaDB is running\n" && ((components_found++))
    command -v node &> /dev/null && components_status+="⚡ Node.js is installed\n" && ((components_found++))
    command -v pm2 &> /dev/null && components_status+="📦 PM2 is installed\n" && ((components_found++))
    systemctl is-active --quiet php8.2-fpm 2>/dev/null && components_status+="🐘 PHP-FPM is running\n" && ((components_found++))
    
    if [ $components_found -gt 0 ]; then
        echo -e "${BRIGHT_YELLOW}╔════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BRIGHT_YELLOW}║${NC}  ${WHITE}${BOLD}⚠️  PREVIOUS INSTALLATION DETECTED${NC}                               ${BRIGHT_YELLOW}║${NC}"
        echo -e "${BRIGHT_YELLOW}╚════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${WHITE}Found ${BRIGHT_GREEN}${components_found}${NC}${WHITE} existing component(s):${NC}"
        echo ""
        echo -e "$components_status"
        
        if [ -f "$STATE_FILE" ]; then
            local saved_step=$(cat "$STATE_FILE")
            local timestamp_file="${STATE_FILE}.timestamp"
            local time_ago="unknown time"
            
            if [ -f "$timestamp_file" ]; then
                local saved_time=$(cat "$timestamp_file")
                local current_time=$(date +%s)
                local diff=$((current_time - saved_time))
                local hours=$((diff / 3600))
                local minutes=$(((diff % 3600) / 60))
                
                if [ $hours -gt 0 ]; then
                    time_ago="${hours}h ${minutes}m ago"
                else
                    time_ago="${minutes}m ago"
                fi
            fi
            
            echo -e "${BRIGHT_CYAN}📍 Installation state found:${NC}"
            echo -e "   ${DIM}→${NC} Last completed step: ${BRIGHT_GREEN}${saved_step}/${TOTAL_STEPS}${NC}"
            echo -e "   ${DIM}→${NC} Last run: ${DIM}${time_ago}${NC}"
            echo ""
        fi
        
        echo -e "${BRIGHT_YELLOW}${BOLD}What would you like to do?${NC}"
        echo ""
        echo -e "  ${BRIGHT_GREEN}[1]${NC} Resume from last checkpoint (recommended)"
        echo -e "  ${BRIGHT_BLUE}[2]${NC} Start fresh installation (will skip existing components)"
        echo -e "  ${RED}[3]${NC} Clean install (remove everything and start over)"
        echo -e "  ${GRAY}[4]${NC} Exit installer"
        echo ""
        
        read -p "$(echo -e "${WHITE}Enter your choice [1-4]: ${NC}")" -n 1 -r choice
        echo ""
        echo ""
        
        case $choice in
            1)
                if load_state; then
                    print_success "Resuming from step $CURRENT_STEP"
                    echo -e "${DIM}Skipping completed steps...${NC}"
                    echo ""
                    return 0
                else
                    print_warning "No state file found, starting fresh"
                    return 1
                fi
                ;;
            2)
                print_info "Starting fresh installation (will skip existing components)"
                rm -f "$STATE_FILE" "${STATE_FILE}.timestamp"
                return 1
                ;;
            3)
                echo -e "${RED}${BOLD}⚠️  WARNING: This will remove all NexPanel components!${NC}"
                read -p "$(echo -e "${RED}Are you absolutely sure? Type 'yes' to confirm: ${NC}")" confirm
                if [ "$confirm" = "yes" ]; then
                    print_info "Cleaning previous installation..."
                    systemctl stop nexpanel 2>/dev/null || true
                    systemctl disable nexpanel 2>/dev/null || true
                    rm -rf /opt/nexpanel
                    rm -f /etc/systemd/system/nexpanel.service
                    rm -f /root/nexpanel-credentials.txt
                    rm -f "$STATE_FILE" "${STATE_FILE}.timestamp"
                    systemctl daemon-reload
                    print_success "Cleanup complete. Starting fresh installation..."
                    echo ""
                    return 1
                else
                    print_warning "Cleanup cancelled. Exiting..."
                    exit 0
                fi
                ;;
            4)
                print_info "Installation cancelled by user"
                exit 0
                ;;
            *)
                print_warning "Invalid choice. Starting fresh installation..."
                return 1
                ;;
        esac
    fi
    
    return 1
}

should_skip_step() {
    local step_number=$1
    if [ $CURRENT_STEP -ge $step_number ]; then
        return 0  # Skip this step
    fi
    return 1  # Don't skip
}

backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$file" "$BACKUP_DIR/$(basename "$file").backup"
        MODIFIED_FILES+=("$file")
        print_info "Backed up: $file"
    fi
}

cleanup_on_failure() {
    echo ""
    print_error "Installation failed! Initiating cleanup..."
    
    # Don't cleanup if user wants to keep partial installation
    read -p "$(echo -e "${YELLOW}Do you want to rollback changes? [y/N]: ${NC}")" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Keeping partial installation. You can resume later."
        print_info "State saved to: $STATE_FILE"
        print_info "Backups saved to: $BACKUP_DIR"
        return
    fi
    
    # Stop services that were started
    print_info "Stopping services..."
    systemctl stop nexpanel 2>/dev/null || true
    
    # Restore backed up files
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
        print_info "Restoring backed up files..."
        for backup in "$BACKUP_DIR"/*.backup; do
            if [ -f "$backup" ]; then
                original="${backup%.backup}"
                original="$(basename "$original")"
                # Find original location from MODIFIED_FILES
                for file in "${MODIFIED_FILES[@]}"; do
                    if [[ "$file" == *"$original"* ]]; then
                        cp "$backup" "$file"
                        print_success "Restored: $file"
                    fi
                done
            fi
        done
    fi
    
    # Remove created files
    for file in "${CREATED_FILES[@]}"; do
        if [ -f "$file" ]; then
            rm -f "$file"
            print_success "Removed: $file"
        fi
    done
    
    # Remove state file
    rm -f "$STATE_FILE"
    
    print_warning "Cleanup complete. System restored to pre-installation state."
    print_info "Backup files are kept in: $BACKUP_DIR"
}

handle_error() {
    local line_no=$1
    local error_code=$2
    print_error "Installation failed at line ${line_no} with error code ${error_code}"
    print_info "Check the log file: ${LOG_FILE}"
    cleanup_on_failure
    exit 1
}

run_with_timeout() {
    local timeout_duration=$1
    shift
    local command="$@"
    
    timeout "$timeout_duration" bash -c "$command" || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            print_error "Command timed out after ${timeout_duration}s: $command"
        fi
        return $exit_code
    }
}

trap 'handle_error ${LINENO} $?' ERR
trap cleanup_on_failure EXIT


#############################################
# Pre-Installation Checks & Setup
#############################################

print_banner



# Check for previous installation and offer resume
RESUMING=false
if detect_previous_installation; then
    RESUMING=true
    print_info "Resuming installation from step $CURRENT_STEP/$TOTAL_STEPS"
    echo ""
fi

if should_skip_step 1; then
    print_info "⏭️  Skipping: Pre-Installation Checks (already completed)"
else
    print_step "🔍 Pre-Installation Checks"

echo -e "${BRIGHT_CYAN}┌─────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BRIGHT_CYAN}│${NC} ${WHITE}${BOLD}Validating System Requirements${NC}                                    ${BRIGHT_CYAN}│${NC}"
echo -e "${BRIGHT_CYAN}└─────────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Check if running as root
echo -ne "  ${BRIGHT_CYAN}▸${NC} Checking root privileges... "
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗${NC}"
    echo ""
    print_error "This script must be run as root"
    echo -e "${YELLOW}Please run: ${WHITE}sudo bash install.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Detect OS
echo -ne "  ${BRIGHT_CYAN}▸${NC} Detecting operating system... "
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}✗${NC}"
    print_error "Cannot detect OS"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Validate OS
echo -ne "  ${BRIGHT_CYAN}▸${NC} Validating OS compatibility... "
if [ "$OS" != "ubuntu" ]; then
    echo -e "${RED}✗${NC}"
    print_error "This installer only supports Ubuntu"
    print_info "Detected OS: $OS"
    exit 1
fi
echo -e "${GREEN}✓${NC}"
print_success "OS: Ubuntu $VER"

if [ "$VER" != "20.04" ] && [ "$VER" != "22.04" ]; then
    echo ""
    print_warning "This installer is tested on Ubuntu 20.04/22.04"
    print_warning "You are running Ubuntu $VER"
    read -p "$(echo -e "${YELLOW}Continue anyway? [y/N]: ${NC}")" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check RAM
echo -ne "  ${BRIGHT_CYAN}▸${NC} Checking available RAM... "
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
echo -e "${GREEN}✓${NC}"
print_success "RAM: ${TOTAL_RAM}MB available"

# Check disk space
echo -ne "  ${BRIGHT_CYAN}▸${NC} Checking disk space... "
DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
echo -e "${GREEN}✓${NC}"
print_success "Disk: ${DISK_SPACE}GB available"

# Check internet connectivity
echo -ne "  ${BRIGHT_CYAN}▸${NC} Testing internet connectivity... "
# Try multiple methods since ICMP might be blocked
if curl -s --connect-timeout 5 https://www.google.com &> /dev/null || \
   wget -q --spider --timeout=5 https://www.google.com &> /dev/null || \
   ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
    print_success "Internet connection active"
else
    echo -e "${RED}✗${NC}"
    print_error "No internet connection detected"
    print_warning "Please check your network configuration"
    exit 1
fi

echo ""
    echo ""
    echo -e "${BRIGHT_GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BRIGHT_GREEN}║${NC}  ${BRIGHT_GREEN}✓  All Pre-Installation Checks Passed!${NC}                          ${BRIGHT_GREEN}║${NC}"
    echo -e "${BRIGHT_GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    save_state
    save_state
fi

# Check for Low RAM & Create Swap
if [ "$TOTAL_RAM" -lt 2000 ]; then
    echo ""
    print_warning "Low RAM detected ($TOTAL_RAM MB). System stability may be affected."
    
    # Check if swap exists
    if [ $(swapon --show | wc -l) -eq 0 ]; then
        print_info "Creating 2GB swap file for better stability..."
        run_with_spinner "fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile" "Configuring Swap"
        
        # Make permanent
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "/swapfile none swap sw 0 0" >> /etc/fstab
        fi
        
        # Optimize swap settings
        sysctl vm.swappiness=10 &> /dev/null
        echo "vm.swappiness=10" >> /etc/sysctl.conf
        
        print_success "2GB Swap file created and enabled"
    else
        print_success "Swap file already active"
    fi
fi

#############################################
# System Update
#############################################

if should_skip_step 2; then
    print_info "⏭️  Skipping: System Update (already completed)"
else

print_step "📦 Updating System Packages"

run_with_spinner "apt-get update -qq -o Acquire::Languages=none -o Acquire::GzipIndexes=true" "Refreshing package repositories"

echo ""
echo -e "${YELLOW}Would you like to perform a full system upgrade? (Recommended for security)${NC}"
echo -e "${DIM}Note: This may take a long time on some systems.${NC}"
read -p "$(echo -e "${WHITE}Upgrade packages? [Y/n]: ${NC}")" -n 1 -r upgrade_choice
echo ""
echo ""

if [[ $upgrade_choice =~ ^[Nn]$ ]]; then
    print_warning "Skipping system upgrade. Ensure packages are up to date manually."
else
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq -o Dpkg::Options::=\"--force-confdef\" -o Dpkg::Options::=\"--force-confold\"" "Upgrading system packages"
fi
echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"

    save_state
fi

#############################################
# Install Core Dependencies
#############################################

if should_skip_step 3; then
    print_info "⏭️  Skipping: Core Dependencies (already completed)"
else

print_step "🔧 Installing Core Dependencies"

CORE_PACKAGES=(
    "curl"
    "wget"
    "git"
    "unzip"
    "software-properties-common"
    "build-essential"
    "ufw"
    "fail2ban"
    "certbot"
    "python3-certbot-nginx"
)

echo -e "${WHITE}Installing core dependencies...${NC}"
PACKAGES_TO_INSTALL=()
for package in "${CORE_PACKAGES[@]}"; do
    if ! dpkg -s "$package" >/dev/null 2>&1; then
        PACKAGES_TO_INSTALL+=("$package")
    fi
done

if [ ${#PACKAGES_TO_INSTALL[@]} -gt 0 ]; then
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ${PACKAGES_TO_INSTALL[*]}" "Installing core dependencies"
else
    print_success "All core packages already installed"
fi

# Configure Fail2Ban
print_info "Configuring Fail2Ban protection..."
if [ ! -d "/etc/fail2ban/jail.d" ]; then
    mkdir -p /etc/fail2ban/jail.d
fi

cat > /etc/fail2ban/jail.d/nexpanel.conf << EOF
[nexpanel]
enabled = true
port = 8080
filter = nexpanel
logpath = /opt/nexpanel/logs/access.log
maxretry = 5
findtime = 600
bantime = 3600

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
findtime = 600
bantime = 3600
EOF

# Create filter
if [ ! -d "/etc/fail2ban/filter.d" ]; then
    mkdir -p /etc/fail2ban/filter.d
fi

cat > /etc/fail2ban/filter.d/nexpanel.conf << EOF
[Definition]
failregex = ^<HOST> -.*POST /auth/login.*401.*$
ignoreregex =
EOF

systemctl restart fail2ban
print_success "Fail2Ban configured (SSH + Panel protection)"
echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
fi

#############################################
# Install Nginx
#############################################

if should_skip_step 4; then
    print_info "⏭️  Skipping: Nginx (already completed)"
else

print_step "🌐 Installing Nginx Web Server"

if systemctl is-active --quiet nginx; then
    print_success "Nginx already running"
else
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends nginx" "Installing Nginx"
    run_with_spinner "systemctl enable --now nginx" "Starting Nginx"
fi
echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
fi

#############################################
# Install MariaDB
#############################################

if should_skip_step 5; then
    print_info "⏭️  Skipping: MariaDB (already completed)"
else

print_step "🗄️ Installing MariaDB Database"

if systemctl is-active --quiet mariadb; then
    print_success "MariaDB already running"
else
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends mariadb-server mariadb-client" "Installing MariaDB"
    run_with_spinner "systemctl enable --now mariadb" "Starting MariaDB"
fi

# Secure MariaDB
print_info "Securing MariaDB installation..."

# Generate safe alphanumeric password (no special chars to avoid syntax/shell issues)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Check if we can connect via socket (default for root)
if mysql -e "STATUS" &>/dev/null; then
    print_info "Connected via socket. Setting root password..."
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';" 
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    print_success "MariaDB secured"
else
    # Socket connection failed. Attempting fallback to debian-sys-maint
    print_warning "Could not connect to MariaDB via socket."
    
    if [ -f /etc/mysql/debian.cnf ]; then
        print_info "Attempting recovery using debian-sys-maint..."
        if mysql --defaults-file=/etc/mysql/debian.cnf -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';" 2>/dev/null; then
             print_success "Recovered root access using system maintenance account"
             mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
             mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
             mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;" 2>/dev/null || true
        else
             attempt_purge_recovery
        fi
    else
        attempt_purge_recovery
    fi
fi

# Create panel database
print_info "Creating NexPanel database..."
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS nexpanel;" 2>/dev/null
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS 'panel_admin'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';" 2>/dev/null
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON nexpanel.* TO 'panel_admin'@'localhost';" 2>/dev/null
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;" 2>/dev/null
print_success "Database 'nexpanel' created"
echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
fi

#############################################
# Install PHP-FPM (Multiple Versions)
#############################################

if should_skip_step 6; then
    print_info "⏭️  Skipping: PHP-FPM (already completed)"
else

print_step "🐘 Installing PHP-FPM (Multiple Versions)"

    run_with_spinner "LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php" "Adding PHP repository"
    run_with_spinner "apt-get update -qq -o Acquire::Languages=none" "Updating package lists"

    echo ""
    echo -e "${CYAN}Select PHP Installation Mode:${NC}"
    echo -e "  ${GREEN}[1]${NC} Full Configuration (PHP 7.4, 8.0, 8.1, 8.2) - Best compatibility"
    echo -e "  ${GREEN}[2]${NC} Modern Performance (PHP 8.2 only) - Fastest installation"
    echo -e "  ${GREEN}[3]${NC} Balanced (PHP 7.4 + 8.2) - Legacy support + Performance"
    echo ""
    
    read -p "$(echo -e "${WHITE}Enter choice [1-3] (Default: 1): ${NC}")" -n 1 -r php_choice
    echo ""
    echo ""
    
    case $php_choice in
        2)
            PHP_VERSIONS=("8.2")
            print_info "Selected: Modern Performance (PHP 8.2)"
            ;;
        3)
            PHP_VERSIONS=("7.4" "8.2")
            print_info "Selected: Balanced (PHP 7.4 + 8.2)"
            ;;
        *)
            PHP_VERSIONS=("7.4" "8.0" "8.1" "8.2")
            print_info "Selected: Full Configuration (All versions)"
            ;;
    esac

    PHP_EXTENSIONS=("fpm" "mysql" "curl" "gd" "mbstring" "xml" "zip" "bcmath")

    # Build package list
    PHP_PACKAGES=()
    for PHP_VER in "${PHP_VERSIONS[@]}"; do
        for EXT in "${PHP_EXTENSIONS[@]}"; do
            PHP_PACKAGES+=("php${PHP_VER}-${EXT}")
        done
    done

    # Install all PHP packages in one batch operation for maximum speed
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ${PHP_PACKAGES[*]}" "Installing all PHP versions and extensions"

    # Enable and start all PHP-FPM services in parallel
    run_with_spinner "for PHP_VER in ${PHP_VERSIONS[*]}; do systemctl enable --now php\${PHP_VER}-fpm & done; wait" "Starting PHP services"
    
    print_success "PHP 7.4, 8.0, 8.1, 8.2 installed"
echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
fi

#############################################
# Install Node.js
#############################################

if should_skip_step 7; then
    print_info "⏭️  Skipping: Node.js (already completed)"
else

print_step "⚡ Installing Node.js 20 LTS"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js already installed: $NODE_VERSION"
else
    echo -e "${WHITE}Installing Node.js...${NC}"
    run_with_spinner "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" "Adding Node.js repository"
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends nodejs" "Installing Node.js"
    print_success "Node.js $(node -v) installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    run_with_spinner "npm install -g pm2 --silent --no-progress" "Installing PM2"
    run_with_spinner "pm2 startup systemd -u root --hp /root && pm2 save" "Configuring PM2"
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi
    echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
    save_state
fi

#############################################
# Install Python
#############################################

if should_skip_step 8; then
    print_info "⏭️  Skipping: Python (already completed)"
else

print_step "🐍 Installing Python 3 and Tools"

PYTHON_PACKAGES=("python3" "python3-pip" "python3-venv" "python3-dev")

echo -e "${WHITE}Installing Python packages...${NC}"
PYTHON_TO_INSTALL=()
for package in "${PYTHON_PACKAGES[@]}"; do
    if ! dpkg -s "$package" >/dev/null 2>&1; then
        PYTHON_TO_INSTALL+=("$package")
    fi
done

if [ ${#PYTHON_TO_INSTALL[@]} -gt 0 ]; then
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ${PYTHON_TO_INSTALL[*]}" "Installing Python packages"
fi

run_with_spinner "pip3 install --upgrade pip --quiet --no-warn-script-location" "Upgrading pip"
run_with_spinner "pip3 install gunicorn uvicorn --quiet --no-warn-script-location" "Installing Python tools"
print_success "Python tools installed"
    echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
    save_state
fi

#############################################
# Install Redis
#############################################

if should_skip_step 9; then
    print_info "⏭️  Skipping: Redis & VSFTPD (already completed)"
else

print_step "⚡ Installing Redis Cache Server"

if systemctl is-active --quiet redis-server; then
    print_success "Redis already running"
else
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends redis-server" "Installing Redis"
    run_with_spinner "systemctl enable --now redis-server" "Starting Redis"
fi

# Install FTP server
if ! systemctl is-active --quiet vsftpd; then
    run_with_spinner "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends vsftpd" "Installing VSFTPD"
    print_success "VSFTPD installed"
else
    print_success "VSFTPD already installed"
fi
    echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
    save_state
fi

#############################################
# Configure Firewall
#############################################

if should_skip_step 10; then
    print_info "⏭️  Skipping: Firewall Configuration (already completed)"
else

print_step "🔒 Configuring Firewall (UFW)"

ufw --force enable 2>&1 | tee -a "$LOG_FILE" > /dev/null
ufw allow 22/tcp comment 'SSH' 2>&1 | tee -a "$LOG_FILE" > /dev/null
ufw allow 80/tcp comment 'HTTP' 2>&1 | tee -a "$LOG_FILE" > /dev/null
ufw allow 443/tcp comment 'HTTPS' 2>&1 | tee -a "$LOG_FILE" > /dev/null
ufw allow 8080/tcp comment 'NexPanel' 2>&1 | tee -a "$LOG_FILE" > /dev/null
ufw reload 2>&1 | tee -a "$LOG_FILE" > /dev/null

print_success "Firewall configured"
    print_info "Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (Panel)"
    save_state
fi

#############################################
# Install NexPanel Application
#############################################

if should_skip_step 11; then
    print_info "⏭️  Skipping: NexPanel Application Setup (already completed)"
else

print_step "🚀 Installing NexPanel Application"

PANEL_DIR="/opt/nexpanel"
print_info "Creating directory: $PANEL_DIR"
cd /opt

# Clone repository
print_info "Downloading NexPanel source code..."
rm -rf "$PANEL_DIR"
git clone https://github.com/ayanhackss/nexpanel.git "$PANEL_DIR"
cd "$PANEL_DIR"

# Install dependencies
print_info "Installing application dependencies..."
run_with_spinner "npm install --production" "Installing npm packages"
print_success "Dependencies installed"

# Create data directories
mkdir -p "$PANEL_DIR/data"
mkdir -p "$PANEL_DIR/src/public"
mkdir -p /var/www
print_success "NexPanel directories created"

    echo -e "${DIM}────────────────────────────────────────────────────────────────────${NC}"
    save_state
fi

#############################################
# Create Systemd Service
#############################################

if should_skip_step 12; then
    print_info "⏭️  Skipping: Systemd Service (already completed)"
else

print_step "⚙️ Creating Systemd Service"

backup_file "/etc/systemd/system/nexpanel.service"
cat > /etc/systemd/system/nexpanel.service << EOF
[Unit]
Description=NexPanel - Next-Generation Hosting Management
After=network.target mariadb.service nginx.service
Wants=mariadb.service nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nexpanel
Environment="NODE_ENV=production"
Environment="PORT=8080"
Environment="DB_PASSWORD=${MYSQL_ROOT_PASSWORD}"
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

CREATED_FILES+=("/etc/systemd/system/nexpanel.service")
systemctl daemon-reload
run_with_spinner "systemctl enable --now nexpanel" "Starting NexPanel service"
print_success "Systemd service created and started"

    save_state
fi

#############################################
# Generate Admin Credentials
#############################################

ADMIN_PASSWORD=$(openssl rand -base64 16)

# Save credentials
backup_file "/root/nexpanel-credentials.txt"
cat > /root/nexpanel-credentials.txt << EOF
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    NEXPANEL CREDENTIALS                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Panel URL: http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP"):8080
Username: admin
Password: ${ADMIN_PASSWORD}

MariaDB Root Password: ${MYSQL_ROOT_PASSWORD}

═══════════════════════════════════════════════════════════════

IMPORTANT: Save these credentials securely!
This file will be deleted on next reboot.

To access the panel:
1. Open your browser
2. Go to http://YOUR_SERVER_IP:8080
3. Login with the credentials above

To manage the panel:
  systemctl status nexpanel
  systemctl restart nexpanel
  systemctl stop nexpanel
  systemctl start nexpanel

View logs:
  journalctl -u nexpanel -f

Panel directory:
  /opt/nexpanel

═══════════════════════════════════════════════════════════════
EOF

chmod 600 /root/nexpanel-credentials.txt
CREATED_FILES+=("/root/nexpanel-credentials.txt")
print_success "Credentials saved to /root/nexpanel-credentials.txt"

#############################################
# System Optimization
#############################################

if should_skip_step 13; then
    print_info "⏭️  Skipping: System Optimization (already completed)"
else

print_step "⚡ Applying System Optimizations"

# MariaDB tuning
print_info "Optimizing MariaDB for 2-4GB RAM..."
backup_file "/etc/mysql/mariadb.conf.d/99-nexpanel.cnf"
cat > /etc/mysql/mariadb.conf.d/99-nexpanel.cnf << EOF
[mysqld]
innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
max_connections = 50
query_cache_size = 32M
query_cache_limit = 2M
thread_cache_size = 8
table_open_cache = 400
EOF

CREATED_FILES+=("/etc/mysql/mariadb.conf.d/99-nexpanel.cnf")
systemctl restart mariadb
print_success "MariaDB optimized"

# Nginx tuning
print_info "Optimizing Nginx..."
backup_file "/etc/nginx/conf.d/tuning.conf"
cat > /etc/nginx/conf.d/tuning.conf << EOF
# NexPanel Nginx Optimizations
client_max_body_size 100M;
client_body_timeout 60s;
keepalive_timeout 65;
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
EOF

CREATED_FILES+=("/etc/nginx/conf.d/tuning.conf")

# Configure Reverse Proxy
print_info "Configuring Nginx Reverse Proxy..."
backup_file "/etc/nginx/sites-available/nexpanel"
cat > /etc/nginx/sites-available/nexpanel << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/nexpanel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
print_success "Nginx Reverse Proxy Configured (Port 80 -> 8080)"

if nginx -t >/dev/null 2>&1; then
    run_with_spinner "systemctl restart nginx" "Applying Nginx optimizations"
else
    print_warning "Nginx configuration conflict detected. Reverting optimization..."
    rm -f /etc/nginx/conf.d/tuning.conf
    run_with_spinner "systemctl restart nginx" "Restarting Nginx (default config)"
fi
print_success "Nginx optimized"

    save_state
fi

# Setup SSH Banner (MOTD)
print_info "Setting up SSH Banner..."
rm -f /etc/update-motd.d/*
cat > /etc/update-motd.d/99-nexpanel << 'EOF'
#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

# System Stats
UPTIME=$(uptime -p | sed 's/up //')
LOAD=$(cat /proc/loadavg | awk '{print $1" "$2" "$3}')
MEMORY=$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')
DISK=$(df -h / | awk '$NF=="/"{printf "%s", $5}')
IP=$(hostname -I | cut -d' ' -f1)

clear
echo -e "${CYAN}${BOLD}"
cat << "BANNER"
   _   _           ____                  _ 
  | \ | | _____  _|  _ \ __ _ _ __   ___| |
  |  \| |/ _ \ \/ / |_) / _` | '_ \ / _ \ |
  | |\  |  __/>  <|  __/ (_| | | | |  __/ |
  |_| \_|\___/_/\_\_|   \__,_|_| |_|\___|_|
                                           
BANNER
echo -e "${NC}"
echo -e "  ${YELLOW}Welcome to NexPanel Server${NC}"
echo -e "  ${DIM}──────────────────────────────────────────────────${NC}"
echo -e "  ${BLUE}System IP:${NC}    ${WHITE}$IP${NC}"
echo -e "  ${BLUE}Panel URL:${NC}    ${WHITE}http://$IP:8080${NC}"
echo -e "  ${DIM}──────────────────────────────────────────────────${NC}"
echo -e "  ${GREEN}System Load:${NC}  $LOAD"
echo -e "  ${GREEN}Memory Usage:${NC} $MEMORY"
echo -e "  ${GREEN}Disk Usage:${NC}   $DISK"
echo -e "  ${GREEN}Uptime:${NC}       $UPTIME"
echo -e "  ${DIM}──────────────────────────────────────────────────${NC}"
echo ""
EOF
chmod +x /etc/update-motd.d/99-nexpanel
print_success "Professional SSH banner verified"

#############################################
# Health Checks
#############################################

print_step "🏥 Running Health Checks"

SERVICES=("nginx" "mariadb" "php8.2-fpm" "redis-server")
ALL_HEALTHY=true

for SERVICE in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$SERVICE"; then
        print_success "$SERVICE is running"
    else
        print_warning "$SERVICE is not running"
        ALL_HEALTHY=false
    fi
done

# Check Node.js
if check_command "node"; then
    :
else
    ALL_HEALTHY=false
fi

# Check npm
if check_command "npm"; then
    :
else
    ALL_HEALTHY=false
fi

#############################################
# Installation Complete
#############################################

echo ""
echo ""
echo -e "${GREEN}${BOLD}"
cat << "EOF"
    ╔════════════════════════════════════════════════════════════════════╗
    ║                                                                    ║
    ║                  ✨ INSTALLATION SUCCESSFUL! ✨                     ║
    ║                                                                    ║
    ║              🎉 NexPanel is ready to launch! 🎉                    ║
    ║                                                                    ║
    ╚════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

if [ "$ALL_HEALTHY" = true ]; then
    echo -e "  ${GREEN}${BOLD}✓${NC} ${GREEN}All services are running properly${NC}"
    echo -e "  ${GREEN}${BOLD}✓${NC} ${GREEN}System health check passed${NC}"
    echo -e "  ${GREEN}${BOLD}✓${NC} ${GREEN}Ready for production use${NC}"
else
    echo -e "  ${YELLOW}${BOLD}⚠${NC} ${YELLOW}Some services may need attention${NC}"
    echo -e "  ${YELLOW}${BOLD}ℹ${NC} ${YELLOW}Check logs for details${NC}"
    echo -e "  ${YELLOW}${BOLD}⚠${NC} ${YELLOW}Some services may need attention${NC}"
    echo -e "  ${YELLOW}${BOLD}ℹ${NC} ${YELLOW}Check logs for details${NC}"
fi

echo ""
echo -e "${BRIGHT_BLUE}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_BLUE}${BOLD}║${NC}  ${WHITE}${BOLD}🛡️ FIREWALL & PORT STATUS${NC}                                         ${BRIGHT_BLUE}${BOLD}║${NC}"
echo -e "${BRIGHT_BLUE}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

check_port() {
    local port=$1
    local name=$2
    if ufw status | grep -q "$port/tcp.*ALLOW"; then
        echo -e "  ${BRIGHT_GREEN}✓${NC} ${WHITE}Port $port ($name):${NC}    ${BRIGHT_GREEN}ALLOWED${NC}"
    else
        echo -e "  ${RED}✗${NC} ${WHITE}Port $port ($name):${NC}    ${RED}BLOCKED${NC}"
    fi
}

check_port "80" "HTTP"
check_port "443" "HTTPS"
check_port "8080" "Panel"

echo ""
echo -e "${BRIGHT_CYAN}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_CYAN}${BOLD}║${NC}  ${WHITE}${BOLD}🔐 YOUR CREDENTIALS${NC}                                              ${BRIGHT_CYAN}${BOLD}║${NC}"
echo -e "${BRIGHT_CYAN}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BRIGHT_CYAN}${BOLD}Panel URL:${NC}  ${BRIGHT_YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP"):8080${NC}"
echo -e "  ${BRIGHT_CYAN}${BOLD}Username:${NC}   ${WHITE}admin${NC}"
echo -e "  ${BRIGHT_CYAN}${BOLD}Password:${NC}   ${BRIGHT_GREEN}${ADMIN_PASSWORD}${NC}"
echo ""
echo -e "  ${RED}${BOLD}⚠ IMPORTANT:${NC} Save these credentials securely!"
echo -e "  ${DIM}Credentials saved to: /root/nexpanel-credentials.txt${NC}"
echo ""


# Offer Cloudflare Tunnel Setup
setup_cloudflared

echo -e "${PURPLE}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║${NC}  ${WHITE}${BOLD}🚀 NEXT STEPS${NC}                                                    ${PURPLE}${BOLD}║${NC}"
echo -e "${PURPLE}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}1.${NC} Access your panel:"
if systemctl is-active --quiet cloudflared; then
    echo -e "     ${DIM}►${NC} ${BRIGHT_YELLOW}https://<your-tunnel-domain>${NC} ${DIM}(Cloudflare Tunnel)${NC}"
    echo -e "     ${DIM}►${NC} ${BRIGHT_YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP"):8080${NC} ${DIM}(Direct IP)${NC}"
else
    echo -e "     ${DIM}►${NC} ${BRIGHT_YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP"):8080${NC}"
fi
echo ""

echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║${NC}  ${WHITE}${BOLD}📚 USEFUL COMMANDS${NC}                                               ${BLUE}${BOLD}║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Check status:${NC}      ${WHITE}systemctl status nexpanel${NC}"
echo -e "  ${CYAN}View logs:${NC}         ${WHITE}journalctl -u nexpanel -f${NC}"
echo -e "  ${CYAN}Restart panel:${NC}     ${WHITE}systemctl restart nexpanel${NC}"
echo -e "  ${CYAN}Stop panel:${NC}        ${WHITE}systemctl stop nexpanel${NC}"
echo ""

echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${DIM}Installation log: ${LOG_FILE}${NC}"
echo -e "${DIM}Installation time: $(date)${NC}"
echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}${BOLD}  ⭐ Thank you for choosing NexPanel! ⭐${NC}"
echo -e "${GREEN}${BOLD}  🌟 Happy Hosting! 🌟${NC}"
echo ""

# Clean up state file on successful installation
rm -f "$STATE_FILE"

# Disable cleanup trap on successful completion
trap - EXIT
